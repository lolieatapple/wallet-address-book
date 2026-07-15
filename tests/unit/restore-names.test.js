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

const { setItems, getItems } = await import('../../main/services/item-index');
const { restoreWalletNames } = await import('../../main/services/restore-names');

function walletItem(address, name, id) {
  return {
    id,
    name,
    type: 'wallet',
    fields: { address },
    secretFields: ['pk'],
    keychain: { service: 'wallet-addr-book', account: address },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('restoreWalletNames', () => {
  beforeEach(() => {
    delete storeData.items;
    delete storeData.wallets;
    mockGetPassword.mockReset();
  });

  test('decrypts only placeholder entries and restores their names', async () => {
    setItems([
      walletItem('0xA', '0xA', 'i1'),       // placeholder → restore
      walletItem('0xB', 'My Wallet', 'i2'), // user-named → must not decrypt
      walletItem('0xC', '0xC', 'i3'),       // placeholder, item gone from keychain
    ]);
    mockGetPassword.mockImplementation(async (service, account) => {
      expect(service).toBe('wallet-addr-book');
      if (account === '0xA') return '{"name":"Alice","pk":"0x1"}';
      return null;
    });

    const result = await restoreWalletNames();

    expect(result).toEqual({ pending: 2, restored: 1 });
    const names = (await getItems()).map((it) => it.name);
    expect(names).toEqual(['Alice', 'My Wallet', '0xC']);
    // '0xB' must never be decrypted — its ACL prompt would be pointless.
    expect(mockGetPassword).toHaveBeenCalledTimes(2);
  });

  test('a denied prompt aborts but already-restored names survive', async () => {
    setItems([
      walletItem('0xA', '0xA', 'i1'),
      walletItem('0xB', '0xB', 'i2'),
    ]);
    mockGetPassword
      .mockResolvedValueOnce('{"name":"Alice","pk":"0x1"}')
      .mockRejectedValueOnce(new Error('The authorization was denied'));

    await expect(restoreWalletNames()).rejects.toThrow('denied');

    // Progress is persisted per wallet, so a re-run continues from 0xB.
    const names = (await getItems()).map((it) => it.name);
    expect(names).toEqual(['Alice', '0xB']);
  });

  test('does nothing when no placeholders exist', async () => {
    setItems([walletItem('0xA', 'Alice', 'i1')]);
    const result = await restoreWalletNames();
    expect(result).toEqual({ pending: 0, restored: 0 });
    expect(mockGetPassword).not.toHaveBeenCalled();
  });

  test('handles new-format keychain payloads', async () => {
    setItems([walletItem('0xA', '0xA', 'i1')]);
    mockGetPassword.mockResolvedValueOnce(
      JSON.stringify({ name: 'NewFormat', type: 'wallet', secrets: { pk: '0x1' } })
    );

    const result = await restoreWalletNames();
    expect(result).toEqual({ pending: 1, restored: 1 });
    expect((await getItems())[0].name).toBe('NewFormat');
  });
});
