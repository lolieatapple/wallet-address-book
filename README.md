# Secret Holder

A small, local-only secret manager for macOS (Electron + Next.js). Formerly **Wallet Address Book**.

It holds four kinds of items:

- **Wallets** — Ethereum address + private key, with live USD balances
- **API Keys** — API key / secret key / URL
- **SSH** — host + password
- **Custom** — any user-defined key/value fields, each field individually markable as secret

Secret values are stored in the **macOS keychain** and unlocked with **TouchID**, one item at a time, on demand only. Non-secret metadata (names, addresses, hosts, notes) lives in a local index so listing and searching never trigger keychain prompts. No cloud, no sync, no telemetry.

Item names support `/` as a group separator — `openai/prod`, `openai/dev`, `airdrop/001` fold into collapsible groups in the UI.

![screen](./resources/screen.png)

## Develop / Build

```bash
# development mode
$ bun run dev

# production build (DMG + ZIP)
$ bun run build

# run tests
$ bun test
```

## CLI

Three scripts in `scripts/` talk to the running app through its local API (the app must be running):

### `secret` — generic secret access

```bash
# List all items: names, types, plaintext fields (never prompts)
$ ./scripts/secret list

# Full item as JSON — decrypts all its secret fields (one TouchID)
$ ./scripts/secret get openai/prod

# Single field as plain text — TouchID only if the field is a secret;
# plaintext fields (url, host, notes, ...) return without any prompt
$ ./scripts/secret get openai/prod -f apikey

# Typical usage
$ export OPENAI_API_KEY=$(./scripts/secret get openai/prod -f apikey)
$ sshpass -p "$(./scripts/secret get deploy-server -f password)" ssh root@10.0.0.1
```

### `address` / `pk` — default-wallet shortcuts

```bash
# Print the default wallet address (no prompt)
$ ./scripts/address

# Print the default wallet private key (triggers TouchID)
$ ./scripts/pk
```

Tip: symlink them onto your PATH, e.g. `ln -s "$PWD/scripts/secret" /usr/local/bin/secret`.

## Local HTTP API

The app serves a local HTTP API over a **Unix domain socket** at `~/.wallet-address-book/api.sock` (file mode `0600`). Browsers cannot reach a unix socket, so there is no CSRF/DNS-rebinding surface, and the file permission restricts access to your own user account. All endpoints are **GET** only.

### Generic items

| Endpoint | Response | Description |
|---|---|---|
| `/items` | JSON | List all items: name, type, plaintext fields, secret field **names** (never values, never prompts) |
| `/item?name=<name>` | JSON | Full item including decrypted secrets (one TouchID) |
| `/item?name=<name>&field=<key>` | Plain text | Single field value — TouchID only for secret fields |

The item name travels as a query parameter because names may contain `/`. URL-encode it (`curl -G --data-urlencode` does this for you, and so does the `secret` CLI).

### Wallets (kept for backwards compatibility)

| Endpoint | Response | Description |
|---|---|---|
| `/wallets` | JSON | List all wallets (index, name, address, isDefault) |
| `/default/address` | Plain text | Get the default wallet address |
| `/default/pk` | Plain text | Get the default wallet private key (requires TouchID) |
| `/wallet/:address/pk` | JSON | Get private key by address (requires TouchID) |
| `/wallet/:index/address` | JSON | Get address of wallet by index (1-based) |
| `/wallet/:index/pk` | JSON | Get private key of wallet by index (requires TouchID) |

Examples:

```bash
# List all items
curl -s --unix-socket ~/.wallet-address-book/api.sock http://localhost/items

# Single secret field, plain text (TouchID)
curl -sG --unix-socket ~/.wallet-address-book/api.sock http://localhost/item \
  --data-urlencode "name=openai/prod" --data-urlencode "field=apikey"

# Get default wallet address
curl -s --unix-socket ~/.wallet-address-book/api.sock http://localhost/default/address
```

Prefer name/address-based endpoints in scripts — index positions shift when items are added or removed.

## Security notes

- Every TouchID prompt names the item (and field) being read, so you can verify what a script is asking for before approving.
- Secret values never enter the search index, the item listing, or the `/items` endpoint.
- Copying a secret can optionally auto-clear the clipboard after a delay (Settings → Clipboard, off by default).
- Keychain items live in the login keychain: they never sync to iCloud and migrate with Time Machine.
