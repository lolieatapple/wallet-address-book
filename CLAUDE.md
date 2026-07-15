# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Secret Holder (formerly Wallet Address Book) is an **Electron + Next.js** desktop app for managing secrets: Ethereum wallets (address + private key), API keys, SSH passwords, and custom key/value items. Secret values are stored in the OS keychain (via `keytar`) behind macOS TouchID; non-secret metadata lives in a local electron-store index. Includes a local HTTP API served over a unix domain socket (`~/.wallet-address-book/api.sock`, mode 0600) for external tools.

## Commands

```bash
bun run dev       # Start development (Electron + Next.js with HMR)
bun run build     # Production build via electron-builder (DMG + ZIP)
bun test          # Run all tests
bun test tests/unit/format.test.js  # Run a single test file
```

## Data Model

An **item** is `{ id, name, type, fields, secretFields, keychain: { service, account }, createdAt, updatedAt }`:
- `type`: `wallet` | `apikey` | `ssh` | `custom` (templates in `renderer/utils/itemTypes.js`)
- `fields`: plaintext key/values (address, host, url, ...) — safe to list/search, stored in the index only
- `secretFields`: names of TouchID-protected fields; their values live in the keychain as JSON `{ name, type, secrets: { key: value } }`
- Names are unique; `/` in a name is a display-level group separator (`openai/prod` folds under group `openai`)
- **Lazy keychain migration**: legacy wallet items keep service `wallet-addr-book` keyed by address with payload `{ name, pk }`; new items use service `secret-holder` keyed by item id. `parseSecretPayload` normalizes both. Never bulk-rewrite keychain items (one ACL dialog per item).

## Architecture

### Main Process (`main/`)
- **`background.js`** — Electron main. Legacy wallet IPC channels (`setPk`/`getPk`/`delPk`/`getWallets`/`renameWallet`) now route through the item index; generic channels `items:list/create/update/delete/getSecrets`, `settings:get/update`. `copyText(text, { sensitive })` participates in the opt-in clipboard auto-clear timer. IPC handlers let errors propagate to the renderer. Hides to tray on close (Cmd+Q to quit).
- **`services/migrate-userdata.js`** — MUST be imported before any module that constructs an electron-store: applies the dev-mode userData suffix and one-time copies store files from the old "Wallet Address Book" userData dir (the productName rename moved the directory).
- **`preload.js`** — contextBridge whitelist exposed as `window.walletApi`; the only renderer→main path (contextIsolation on, nodeIntegration off).
- **`services/item-index.js`** — single source of truth for the non-secret item listing (electron-store `item-index`). Listing/searching/renaming must NEVER read keychain secrets (one macOS ACL prompt per item); secrets are read one item at a time, on demand. One-time migration from the old `wallet-index` store; that store in turn migrated from keychain ATTRIBUTES only (`services/keychain-list.js`, zero prompts). `healItemName` adopts the real name whenever a wallet secret is decrypted on demand; `services/restore-names.js` (app menu "Restore Names") bulk-restores placeholders.
- **`services/secrets.js`** — keychain payload read/write/delete + old/new format normalization. TouchID prompting is the CALLER's job (IPC / HTTP layer) so this stays unit-testable.
- **`services/settings.js`** — app settings (clipboard auto-clear switch + delay; default OFF).
- **`services/balance.js`** — `createBalanceCache(expirationMs, store?)` with 10-min cache; failed fetches fall back to the last persisted success.
- **`services/http-api.js`** — HTTP server over unix socket. Wallet endpoints (`/wallets`, `/default/address|pk`, `/wallet/:address/pk`, `/wallet/:index/address|pk`) kept for backwards compatibility. Generic endpoints: `GET /items` (metadata only, zero prompts) and `GET /item?name=<n>[&field=<k>]` (name is a query param because names may contain `/`; plaintext fields need no auth, secret fields prompt TouchID with item+field in the message).

### CLI (`scripts/`)
- `pk`, `address` — legacy one-liners against the default wallet (unchanged).
- `secret` — generic CLI: `secret list`, `secret get <name> [-f field]`. Single-field reads print plain text for `$(...)` use.

### Renderer (`renderer/`)
- **`pages/home.jsx`** — layout: `Sidebar` (categories + counts + New/Settings) + search bar + per-category view + `ItemDrawer` + dialogs. Uses `hooks/useItems.js`.
- **`components/`** — `Sidebar`, `WalletTable` (balance column, sort default/balance/name, hide-zero toggle, total + per-group subtotals, collapsible `/` groups, one-click copy address/PK per row), `WalletRow`, `ItemList` (grouped list for other types, one-click primary-secret copy), `ItemDrawer` (detail: plaintext fields, masked TouchID fields with reveal/copy, rename/edit/delete, wallet default star), `NewItemDialog` (type templates; custom type = user-defined field names + per-field TouchID switch; wallet create/import), `SettingsDialog`, `MessageBox`.
- **`services/wallet.js`, `services/items.js`** — service layers wrapping `window.walletApi` (no direct electron imports in the renderer).
- **`utils/itemTypes.js`** — type templates, `/` grouping helpers.

### Key Patterns
- **IPC**: Renderer calls `window.walletApi.*` (from `main/preload.js`) → main handles via `ipcMain.handle(channel)`.
- **Renderer is a plain web build**: no Node access; anything needing main-process capabilities goes through the preload whitelist.
- Revealed secrets live only in component state and are dropped on drawer close/item switch; search never indexes secret values.

## Testing

Uses `bun test` with `happy-dom` for DOM and `@testing-library/react` for components.

- **Mock pattern**: All `mock.module` calls centralized in `tests/setup.js` (preloaded via `bunfig.toml`). Mocks shared across test files via `globalThis.__testMocks` bridge in `tests/mocks.js` (also exports `makeItem`/`makeWalletItem` builders).
- **mock.module leaks across test files** in one bun run — the electron-store instance a service binds to may belong to another file's mock. Reset state through module APIs (`setItems`, `clearItems`, `setWalletList`), never by mutating your own mock's closure.
- **Cleanup**: Every component test must call `afterEach(cleanup)`.
- **HTTP API tests**: Use Node.js `http.get` instead of `fetch` to bypass happy-dom's CORS enforcement.

Test structure:
- `tests/unit/` — format, balance-cache, http-api, item-index, secrets, keychain-list, restore-names
- `tests/services/` — wallet service interface
- `tests/components/` — WalletRow, WalletTable, ItemList, MessageBox
- `tests/hooks/` — useItems
- `tests/integration/` — home page
