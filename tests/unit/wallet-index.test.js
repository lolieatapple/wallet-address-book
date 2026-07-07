import { test, expect, describe, mock, beforeEach } from 'bun:test';

const mockFindCredentials = mock(() => Promise.resolve([]));

mock.module('keytar', () => ({
  __esModule: true,
  default: {
    findCredentials: (...args) => mockFindCredentials(...args),
  },
}));

const mockListKeychainAccounts = mock(() => Promise.resolve([]));

// mock.module leaks across test files in the same bun run, so keep the real
// module's other exports (parseDumpKeychain is unit-tested elsewhere).
const realKeychainList = await import('../../main/services/keychain-list');
mock.module(require.resolve('../../main/services/keychain-list'), () => ({
  ...realKeychainList,
  listKeychainAccounts: (...args) => mockListKeychainAccounts(...args),
}));

const storeData = {};
mock.module('electron-store', () => ({
  __esModule: true,
  default: class {
    get(key) { return storeData[key]; }
    set(key, val) { storeData[key] = val; }
    delete(key) { delete storeData[key]; }
  },
}));

const { getWalletList, setWalletList, upsertWallet, removeWallet, healWalletName } = await import(
  '../../main/services/wallet-index'
);

describe('wallet-index', () => {
  beforeEach(() => {
    delete storeData.wallets;
    mockFindCredentials.mockReset();
    mockFindCredentials.mockResolvedValue([]);
    mockListKeychainAccounts.mockReset();
    mockListKeychainAccounts.mockResolvedValue([]);
  });

  test('migrates from keychain attributes exactly once, never decrypting secrets', async () => {
    mockListKeychainAccounts.mockResolvedValueOnce(['0xA', '0xB']);

    const first = await getWalletList();
    // Names live inside the encrypted secret, so migrated entries default
    // to the address; the user renames them in the UI (index-only write).
    expect(first).toEqual([
      { address: '0xA', name: '0xA' },
      { address: '0xB', name: '0xB' },
    ]);

    // Decrypting keychain secrets triggers one macOS password prompt per
    // item — the startup prompt storm. Migration must never do it.
    expect(mockFindCredentials).not.toHaveBeenCalled();

    // Second call must be served from the persisted index.
    const second = await getWalletList();
    expect(second).toEqual(first);
    expect(mockListKeychainAccounts).toHaveBeenCalledTimes(1);
  });

  test('never touches the keychain when the index exists (even empty)', async () => {
    setWalletList([]);
    const list = await getWalletList();
    expect(list).toEqual([]);
    expect(mockFindCredentials).not.toHaveBeenCalled();
  });

  test('upsert adds new wallets and renames existing ones', async () => {
    setWalletList([{ address: '0xA', name: 'Alice' }]);

    upsertWallet('0xB', 'Bob');
    expect(await getWalletList()).toEqual([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: 'Bob' },
    ]);

    upsertWallet('0xA', 'Alice Renamed');
    expect(await getWalletList()).toEqual([
      { address: '0xA', name: 'Alice Renamed' },
      { address: '0xB', name: 'Bob' },
    ]);
    expect(mockFindCredentials).not.toHaveBeenCalled();
  });

  test('healWalletName replaces migration placeholder but never a user rename', async () => {
    setWalletList([
      { address: '0xA', name: '0xA' },        // migration placeholder
      { address: '0xB', name: 'My Wallet' },  // user-chosen name
    ]);

    healWalletName('0xA', 'Alice');
    healWalletName('0xB', 'Bob');
    healWalletName('0xC', 'Ghost'); // not in index — must not be added

    expect(await getWalletList()).toEqual([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: 'My Wallet' },
    ]);
  });

  test('remove deletes the wallet from the index', async () => {
    setWalletList([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: 'Bob' },
    ]);

    removeWallet('0xA');
    expect(await getWalletList()).toEqual([{ address: '0xB', name: 'Bob' }]);
  });
});
