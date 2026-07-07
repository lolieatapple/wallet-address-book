## Wallet Address Book

Wallet address book save many addresses into system key chain app. 

It default use encrypted store. Use touchID to unlock and copy private key.

It could create and hold wallet address quickly and safely.

![screen](./resources/screen.png)



### Use it

```bash
# development mode
$ bun run dev

# production build
$ bun run build
```

### Local HTTP API

The app serves a local HTTP API over a **Unix domain socket** at `~/.wallet-address-book/api.sock` (file mode `0600`). Browsers cannot reach a unix socket, so there is no CSRF/DNS-rebinding surface, and the file permission restricts access to your own user account. All endpoints are **GET** only.

| Endpoint | Response | Description |
|---|---|---|
| `/wallets` | JSON | List all wallets (index, name, address, isDefault) |
| `/default/address` | Plain text | Get the default wallet address |
| `/default/pk` | Plain text | Get the default wallet private key (requires TouchID) |
| `/wallet/:address/pk` | JSON | Get private key by address (requires TouchID) |
| `/wallet/:index/address` | JSON | Get address of wallet by index (1-based) |
| `/wallet/:index/pk` | JSON | Get private key of wallet by index (requires TouchID) |

Example:

```bash
# List all wallets
curl -s --unix-socket ~/.wallet-address-book/api.sock http://localhost/wallets

# Get default wallet address
curl -s --unix-socket ~/.wallet-address-book/api.sock http://localhost/default/address

# Get wallet #2 address
curl -s --unix-socket ~/.wallet-address-book/api.sock http://localhost/wallet/2/address
```

Prefer the `/wallet/:address/pk` form in scripts — index positions can shift when wallets are added or removed.

### CLI Scripts

Two shortcut scripts are provided in `scripts/` for quick access to the default wallet:

```bash
# Print the default wallet address
./scripts/address

# Print the default wallet private key (triggers TouchID)
./scripts/pk
```

These scripts call the local HTTP API, so the app must be running.
