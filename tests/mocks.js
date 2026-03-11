// Shared mock registry using globalThis to bridge between preload and test files.
// bun's preload and test files run in separate module contexts,
// so we use globalThis as the shared state.

import { mock } from 'bun:test';

if (!globalThis.__testMocks) {
  globalThis.__testMocks = {
    electron: {
      invoke: mock(() => Promise.resolve(null)),
      openExternal: mock(() => {}),
    },
    walletService: {
      getAllWallets: mock(() => Promise.resolve([])),
      saveWallet: mock(() => Promise.resolve(true)),
      deleteWallet: mock(() => Promise.resolve(true)),
      getPrivateKey: mock(() => Promise.resolve(null)),
      fetchBalances: mock(() => Promise.resolve({})),
      promptInput: mock(() => Promise.resolve(null)),
      toggleDarkMode: mock(() => Promise.resolve()),
      getDefaultWallet: mock(() => Promise.resolve(null)),
      setDefaultWallet: mock(() => Promise.resolve(true)),
    },
    clipboard: {
      copy: mock(() => true),
    },
  };
}

export const electronMocks = globalThis.__testMocks.electron;
export const walletServiceMocks = globalThis.__testMocks.walletService;
export const clipboardMock = globalThis.__testMocks.clipboard;

export function resetAllMocks() {
  Object.values(electronMocks).forEach((m) => m.mockReset());
  Object.values(walletServiceMocks).forEach((m) => m.mockReset());
  clipboardMock.copy.mockReset();
  clipboardMock.copy.mockReturnValue(true);
}
