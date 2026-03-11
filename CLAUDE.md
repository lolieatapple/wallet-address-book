# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Wallet Address Book is an **Electron + Next.js** desktop app for managing Ethereum wallet addresses and private keys. It stores credentials securely in the OS keychain (via `keytar`) and uses macOS TouchID for authentication when accessing private keys. Includes a local HTTP API server on port 63333 for external tools to query wallets.

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
- **`background.js`** — Electron main process. IPC handlers for keychain ops, balance fetching, dark mode, prompt dialogs, default wallet management. Hides to tray on close (Cmd+Q to actually quit). Starts HTTP API server.
- **`services/balance.js`** — `createBalanceCache(expirationMs)` factory with 10-min cache and stale fallback on error.
- **`services/http-api.js`** — HTTP server on `127.0.0.1:63333`. Endpoints: `/wallets`, `/default/address`, `/default/pk`, `/wallet/:index/address`, `/wallet/:index/pk`. Private key endpoints require TouchID.

### Renderer (`renderer/`)
- **`pages/home.jsx`** — Main page, orchestrates components with `useWallets` hook.
- **`components/`** — `WalletTable`, `WalletRow`, `WalletToolbar`, `MessageBox` (MUI v5).
- **`services/wallet.js`** — IPC service layer wrapping all `ipcRenderer.invoke` calls.
- **`hooks/useWallets.js`** — State management for wallets, balances, loading, default address.
- **`utils/format.js`** — `formatToDollar()` currency formatter.

### Key Patterns
- **IPC**: Renderer calls `ipcRenderer.invoke(channel)` → main handles via `ipcMain.handle(channel)`.
- **Data format**: Wallets stored in keytar as `{ name, pk }` JSON, keyed by address under service `'wallet-addr-book'`.
- **Webpack target**: `next.config.js` sets `config.target = 'electron-renderer'` so Node.js modules are left as runtime requires (not bundled/polyfilled). This is critical for production builds.

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
