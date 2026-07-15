import { test, expect, describe, mock, beforeEach } from 'bun:test';

const storeData = {};
mock.module('electron-store', () => ({
  __esModule: true,
  default: class {
    get(key) { return storeData[key]; }
    set(key, val) { storeData[key] = val; }
    delete(key) { delete storeData[key]; }
  },
}));

const {
  getItems,
  setItems,
  clearItems,
  createItem,
  updateItem,
  removeItem,
  findByName,
  findWalletByAddress,
  healItemName,
  getWalletEntries,
} = await import('../../main/services/item-index');
const { setWalletList } = await import('../../main/services/wallet-index');

describe('item-index', () => {
  beforeEach(() => {
    // Drive resets through the module API — the electron-store mock bound at
    // first import may belong to another test file in a full run.
    clearItems();
    setWalletList([]);
  });

  test('migrates the wallet-index into items exactly once, keeping legacy keychain locators', async () => {
    // Pre-existing wallet-index (already migrated from keychain attributes)
    setWalletList([
      { address: '0xA', name: 'Alice' },
      { address: '0xB', name: '0xB' },
    ]);

    const items = await getItems();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: 'Alice',
      type: 'wallet',
      fields: { address: '0xA' },
      secretFields: ['pk'],
      // Legacy wallets stay under the old service — bulk rewriting them
      // would raise one keychain ACL dialog per item.
      keychain: { service: 'wallet-addr-book', account: '0xA' },
    });
    expect(items[0].id).toBeTruthy();
    expect(items[0].id).not.toBe(items[1].id);

    // Second call served from the persisted item index.
    setWalletList([]);
    const second = await getItems();
    expect(second.map((it) => it.name)).toEqual(['Alice', '0xB']);
  });

  test('createItem enforces unique names and uses the new keychain service keyed by id', () => {
    setItems([]);
    const item = createItem({
      name: 'openai/prod',
      type: 'apikey',
      fields: { url: 'https://api.openai.com' },
      secretFields: ['apikey'],
    });

    expect(item.keychain).toEqual({ service: 'secret-holder', account: item.id });
    expect(findByName('openai/prod').id).toBe(item.id);

    expect(() => createItem({ name: 'openai/prod', type: 'apikey' }))
      .toThrow(/already exists/);
    expect(() => createItem({ name: 'x', type: 'nonsense' }))
      .toThrow(/Unknown item type/);
  });

  test('updateItem renames and rejects duplicate names', () => {
    setItems([]);
    const a = createItem({ name: 'a', type: 'custom', fields: { k: 'v' } });
    createItem({ name: 'b', type: 'custom' });

    updateItem(a.id, { name: 'a2', fields: { k: 'v2' } });
    expect(findByName('a2').fields).toEqual({ k: 'v2' });
    expect(findByName('a')).toBeNull();

    expect(() => updateItem(a.id, { name: 'b' })).toThrow(/already exists/);
    expect(() => updateItem('ghost', { name: 'z' })).toThrow(/not found/);
  });

  test('healItemName only replaces wallet placeholder names', () => {
    setItems([]);
    const placeholder = createItem({ name: '0xA', type: 'wallet', fields: { address: '0xA' }, secretFields: ['pk'] });
    const named = createItem({ name: 'My Wallet', type: 'wallet', fields: { address: '0xB' }, secretFields: ['pk'] });

    healItemName(placeholder.id, 'Alice');
    healItemName(named.id, 'Bob');

    expect(findByName('Alice')).toBeTruthy();
    expect(findByName('My Wallet')).toBeTruthy();
    expect(findByName('Bob')).toBeNull();
  });

  test('healItemName refuses a name that would collide', () => {
    setItems([]);
    createItem({ name: 'Alice', type: 'custom' });
    const placeholder = createItem({ name: '0xA', type: 'wallet', fields: { address: '0xA' }, secretFields: ['pk'] });

    healItemName(placeholder.id, 'Alice');
    expect(findByName('0xA')).toBeTruthy(); // unchanged
  });

  test('getWalletEntries returns only wallets, in index order', async () => {
    setItems([]);
    createItem({ name: 'k', type: 'apikey', secretFields: ['apikey'] });
    createItem({ name: 'w1', type: 'wallet', fields: { address: '0x1' }, secretFields: ['pk'] });
    createItem({ name: 'w2', type: 'wallet', fields: { address: '0x2' }, secretFields: ['pk'] });

    expect(await getWalletEntries()).toEqual([
      { address: '0x1', name: 'w1' },
      { address: '0x2', name: 'w2' },
    ]);
    expect(findWalletByAddress('0x2').name).toBe('w2');
    expect(findWalletByAddress('0xNope')).toBeNull();
  });

  test('removeItem deletes from the index', () => {
    setItems([]);
    const a = createItem({ name: 'a', type: 'custom' });
    createItem({ name: 'b', type: 'custom' });

    removeItem(a.id);
    expect(findByName('a')).toBeNull();
    expect(findByName('b')).toBeTruthy();
  });
});
