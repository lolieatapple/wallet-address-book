// Shared mock registry using globalThis to bridge between preload and test files.
// bun's preload and test files run in separate module contexts,
// so we use globalThis as the shared state.

import { mock } from 'bun:test';

if (!globalThis.__testMocks) {
  globalThis.__testMocks = {
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
      openExternal: mock(() => Promise.resolve()),
      renameWallet: mock(() => Promise.resolve(true)),
      copyText: mock(() => Promise.resolve(true)),
      restoreNames: mock(() => Promise.resolve({ pending: 0, restored: 0 })),
      onRestoreNamesRequested: mock(() => () => {}),
    },
    itemsService: {
      listItems: mock(() => Promise.resolve([])),
      createItem: mock(() => Promise.resolve({})),
      updateItem: mock(() => Promise.resolve({})),
      deleteItem: mock(() => Promise.resolve(true)),
      getItemSecrets: mock(() => Promise.resolve({})),
      getSettings: mock(() => Promise.resolve({ clipboardAutoClear: false, clipboardClearDelaySec: 30 })),
      updateSettings: mock(() => Promise.resolve({})),
      copySecretText: mock(() => Promise.resolve(true)),
    },
    clipboard: {
      copy: mock(() => true),
    },
  };
}

export const walletServiceMocks = globalThis.__testMocks.walletService;
export const itemsServiceMocks = globalThis.__testMocks.itemsService;
export const clipboardMock = globalThis.__testMocks.clipboard;

export function resetAllMocks() {
  Object.values(walletServiceMocks).forEach((m) => m.mockReset());
  Object.values(itemsServiceMocks).forEach((m) => m.mockReset());
  itemsServiceMocks.getSettings.mockResolvedValue({ clipboardAutoClear: false, clipboardClearDelaySec: 30 });
  clipboardMock.copy.mockReset();
  clipboardMock.copy.mockReturnValue(true);
}

// Convenience builders for item-index entries in component tests.
let __itemSeq = 0;
export function makeItem({ name, type = 'custom', fields = {}, secretFields = [], id }) {
  const itemId = id || `item-${++__itemSeq}`;
  return {
    id: itemId,
    name,
    type,
    fields,
    secretFields,
    keychain: { service: 'secret-holder', account: itemId },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

export function makeWalletItem(address, name, id) {
  return makeItem({ name, type: 'wallet', fields: { address }, secretFields: ['pk'], id });
}
