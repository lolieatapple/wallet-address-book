# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Wallet Address Book is an **Electron + Next.js** desktop app for managing Ethereum wallet addresses and private keys. It stores credentials securely in the OS keychain (via `keytar`) and uses macOS TouchID for authentication when accessing private keys. Includes a local HTTP API served over a unix domain socket (`~/.wallet-address-book/api.sock`, mode 0600) for external tools to query wallets.

## Commands

```bash
bun run dev       # Start development (Electron + Next.js with HMR)
bun run build     # Production build via electron-builder (DMG + ZIP)
bun test          # Run all 75 tests
bun test tests/unit/format.test.js  # Run a single test file
```

## Architecture

**Nextron v9** (Electron + Next.js 14 integration):

### Main Process (`main/`)
- **`background.js`** — Electron main process. IPC handlers for keychain ops, balance fetching, dark mode, prompt dialogs, default wallet management, `openExternal` (https only). IPC handlers let errors propagate to the renderer (no swallowing); the UI event handlers catch and display them. Hides to tray on close (Cmd+Q to actually quit). Starts HTTP API server.
- **`preload.js`** — contextBridge whitelist exposed as `window.walletApi`; the only path from renderer to main (contextIsolation is on, nodeIntegration off).
- **`services/wallet-index.js`** — non-secret wallet listing `[{ address, name }]` in electron-store. Listing/renaming must NEVER enumerate keychain secrets (each secret read triggers one macOS ACL prompt per item); secrets are read one item at a time, on demand only. One-time migration from keychain on first run.
- **`services/balance.js`** — `createBalanceCache(expirationMs, store?)` factory with 10-min cache; successful results are persisted to the injected electron-store and a failed fetch falls back to the last success (never overwrites it).
- **`services/http-api.js`** — HTTP server over unix socket `~/.wallet-address-book/api.sock` (0600). Endpoints: `/wallets`, `/default/address`, `/default/pk`, `/wallet/:address/pk`, `/wallet/:index/address`, `/wallet/:index/pk`. Private key endpoints require TouchID and show the wallet address in the prompt.

### Renderer (`renderer/`)
- **`pages/home.jsx`** — Main page, orchestrates components with `useWallets` hook.
- **`components/`** — `WalletTable`, `WalletRow`, `WalletToolbar`, `MessageBox` (MUI v5).
- **`services/wallet.js`** — service layer wrapping all `window.walletApi` calls (no direct electron imports in the renderer).
- **`hooks/useWallets.js`** — State management for wallets, balances, loading, default address.
- **`utils/format.js`** — `formatToDollar()` currency formatter.

### Key Patterns
- **IPC**: Renderer calls `window.walletApi.*` (from `main/preload.js`) → main handles via `ipcMain.handle(channel)`.
- **Data format**: Private keys stored in keytar as `{ name, pk }` JSON, keyed by address under service `'wallet-addr-book'` (login keychain: no iCloud sync, migrates with Time Machine). The wallet list shown in UI/API comes from `wallet-index` (electron-store), not the keychain.
- **Renderer is a plain web build**: no `electron-renderer` webpack target, no Node access; anything needing main-process capabilities must go through the preload whitelist.

## Testing

Uses `bun test` with `happy-dom` for DOM and `@testing-library/react` for components.

- **Mock pattern**: All `mock.module` calls centralized in `tests/setup.js` (preloaded via `bunfig.toml`). Mocks shared across test files via `globalThis.__testMocks` bridge in `tests/mocks.js`.
- **Cleanup**: Every component test must call `afterEach(cleanup)` to prevent DOM state leakage.
- **HTTP API tests**: Use Node.js `http.get` instead of `fetch` to bypass happy-dom's CORS enforcement.

Test structure:
- `tests/unit/` — format, balance-cache, http-api
- `tests/services/` — wallet service interface
- `tests/components/` — WalletRow, WalletTable, WalletToolbar, MessageBox
- `tests/hooks/` — useWallets
- `tests/integration/` — home page
