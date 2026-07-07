import { test, expect, describe, mock, beforeEach } from 'bun:test';

const mockFindCredentials = mock(() => Promise.resolve([]));

mock.module('keytar', () => ({
  __esModule: true,
  default: {
    findCredentials: (...args) => mockFindCredentials(...args),
  },
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

const { getWalletList, setWalletList, upsertWallet, removeWallet } = await import(
  '../../main/services/wallet-index'
);

describe('wallet-index', () => {
  beforeEach(() => {
    delete storeData.wallets;
    mockFindCredentials.mockReset();
    mockFindCredentials.mockResolvedValue([]);
  });

  test('migrates from keychain exactly once when no index exists', async () => {
    mockFindCredentials.mockResolvedValueOnce([
      { account: '0xA', password: '{"name":"Alice","pk":"0x1"}' },
      { account: '0xB', password: '{"name":"Bob","pk":"0x2"}' },
    ]);

    const first = await getWalletList();
    expect(first).toEqual([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: 'Bob' },
    ]);

    // Second call must be served from the index — enumerating keychain
    // secrets triggers one macOS ACL prompt per wallet.
    const second = await getWalletList();
    expect(second).toEqual(first);
    expect(mockFindCredentials).toHaveBeenCalledTimes(1);
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

  test('remove deletes the wallet from the index', async () => {
    setWalletList([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: 'Bob' },
    ]);

    removeWallet('0xA');
    expect(await getWalletList()).toEqual([{ address: '0xB', name: 'Bob' }]);
  });
});
