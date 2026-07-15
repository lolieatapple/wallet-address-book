import Store from 'electron-store';
import { randomUUID } from 'crypto';
import { getWalletList } from './wallet-index';
import { LEGACY_SERVICE, SERVICE_NAME } from './secrets';

const store = new Store({ name: 'item-index' });

// Single source of truth for the non-secret item listing. Same rule as the
// old wallet-index: reading a keychain SECRET triggers one macOS ACL prompt
// per item, so listing/searching/renaming must only ever touch this index.
//
// Item shape:
//   {
//     id,                       // stable uuid, keychain account for new items
//     name,                     // unique; '/' segments group items in the UI
//     type,                     // 'wallet' | 'apikey' | 'ssh' | 'custom'
//     fields: { key: value },   // plaintext fields, safe to list
//     secretFields: ['pk'],     // keys protected by keychain + TouchID
//     keychain: { service, account },
//     createdAt, updatedAt,
//   }

export const ITEM_TYPES = ['wallet', 'apikey', 'ssh', 'custom'];

// One-time migration from the wallet-index era. getWalletList() itself
// handles the even older keychain-attribute migration (zero prompts).
export async function getItems() {
  const items = store.get('items');
  if (items !== undefined) {
    return items;
  }
  const wallets = await getWalletList();
  const now = Date.now();
  const migrated = wallets.map((w) => ({
    id: randomUUID(),
    name: w.name,
    type: 'wallet',
    fields: { address: w.address },
    secretFields: ['pk'],
    // Legacy wallets keep their old keychain location — rewriting them in
    // bulk would raise one ACL dialog per item.
    keychain: { service: LEGACY_SERVICE, account: w.address },
    createdAt: now,
    updatedAt: now,
  }));
  store.set('items', migrated);
  return migrated;
}

// Direct seeding for tests and migrations.
export function setItems(items) {
  saveItems(items);
}

// Test-only: forgets the persisted index so the one-time wallet-index
// migration path can be exercised again.
export function clearItems() {
  store.delete('items');
}

function getItemsSync() {
  return store.get('items') || [];
}

function saveItems(items) {
  store.set('items', items);
}

export function findById(id) {
  return getItemsSync().find((it) => it.id === id) || null;
}

export function findByName(name) {
  return getItemsSync().find((it) => it.name === name) || null;
}

export function findWalletByAddress(address) {
  return getItemsSync().find(
    (it) => it.type === 'wallet' && it.fields.address === address
  ) || null;
}

// Creates the index entry for a new item and returns it. The caller is
// responsible for writing the secret payload to the keychain.
export function createItem({ name, type, fields = {}, secretFields = [] }) {
  if (!ITEM_TYPES.includes(type)) {
    throw new Error(`Unknown item type: ${type}`);
  }
  const items = getItemsSync();
  if (items.some((it) => it.name === name)) {
    throw new Error(`An item named "${name}" already exists`);
  }
  const id = randomUUID();
  const now = Date.now();
  const item = {
    id,
    name,
    type,
    fields,
    secretFields,
    keychain: { service: SERVICE_NAME, account: id },
    createdAt: now,
    updatedAt: now,
  };
  items.push(item);
  saveItems(items);
  return item;
}

// Updates index-level data (name / plaintext fields / secret field list).
// Never touches the keychain.
export function updateItem(id, { name, fields, secretFields }) {
  const items = getItemsSync();
  const item = items.find((it) => it.id === id);
  if (!item) {
    throw new Error(`Item ${id} not found`);
  }
  if (name !== undefined && name !== item.name) {
    if (items.some((it) => it.name === name && it.id !== id)) {
      throw new Error(`An item named "${name}" already exists`);
    }
    item.name = name;
  }
  if (fields !== undefined) item.fields = fields;
  if (secretFields !== undefined) item.secretFields = secretFields;
  item.updatedAt = Date.now();
  saveItems(items);
  return item;
}

export function removeItem(id) {
  saveItems(getItemsSync().filter((it) => it.id !== id));
}

// Migrated wallet entries carry the address as a placeholder name (the real
// name lives inside the encrypted secret). Whenever a secret is decrypted on
// demand anyway, adopt its name — but never overwrite a user-chosen name.
export function healItemName(id, name) {
  const items = getItemsSync();
  const item = items.find((it) => it.id === id);
  if (!item || !name || name === item.name) return;
  const isPlaceholder = item.type === 'wallet' && item.name === item.fields.address;
  if (isPlaceholder && !items.some((it) => it.name === name && it.id !== id)) {
    item.name = name;
    saveItems(items);
  }
}

// Wallet view over the index, ordered as stored — the old /wallets HTTP
// endpoints and the wallet UI address items by this list.
export async function getWalletEntries() {
  const items = await getItems();
  return items
    .filter((it) => it.type === 'wallet')
    .map((it) => ({ address: it.fields.address, name: it.name }));
}
