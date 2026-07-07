import { test, expect, describe, mock, beforeEach } from 'bun:test';

const mockGetPassword = mock(() => Promise.resolve(null));

mock.module('keytar', () => ({
  __esModule: true,
  default: {
    getPassword: (...args) => mockGetPassword(...args),
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

const { setWalletList, getWalletList } = await import('../../main/services/wallet-index');
const { restoreWalletNames } = await import('../../main/services/restore-names');

describe('restoreWalletNames', () => {
  beforeEach(() => {
    delete storeData.wallets;
    mockGetPassword.mockReset();
  });

  test('decrypts only placeholder entries and restores their names', async () => {
    setWalletList([
      { address: '0xA', name: '0xA' },       // placeholder → restore
      { address: '0xB', name: 'My Wallet' }, // user-named → must not decrypt
      { address: '0xC', name: '0xC' },       // placeholder, item gone from keychain
    ]);
    mockGetPassword.mockImplementation(async (service, account) => {
      expect(service).toBe('wallet-addr-book');
      if (account === '0xA') return '{"name":"Alice","pk":"0x1"}';
      return null;
    });

    const result = await restoreWalletNames();

    expect(result).toEqual({ pending: 2, restored: 1 });
    expect(await getWalletList()).toEqual([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: 'My Wallet' },
      { address: '0xC', name: '0xC' },
    ]);
    // '0xB' must never be decrypted — its ACL prompt would be pointless.
    expect(mockGetPassword).toHaveBeenCalledTimes(2);
  });

  test('a denied prompt aborts but already-restored names survive', async () => {
    setWalletList([
      { address: '0xA', name: '0xA' },
      { address: '0xB', name: '0xB' },
    ]);
    mockGetPassword
      .mockResolvedValueOnce('{"name":"Alice","pk":"0x1"}')
      .mockRejectedValueOnce(new Error('The authorization was denied'));

    await expect(restoreWalletNames()).rejects.toThrow('denied');

    // Progress is persisted per wallet, so a re-run continues from 0xB.
    expect(await getWalletList()).toEqual([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: '0xB' },
    ]);
  });

  test('does nothing when no placeholders exist', async () => {
    setWalletList([{ address: '0xA', name: 'Alice' }]);
    const result = await restoreWalletNames();
    expect(result).toEqual({ pending: 0, restored: 0 });
    expect(mockGetPassword).not.toHaveBeenCalled();
  });
});
