import Store from 'electron-store';
import { listKeychainAccounts } from './keychain-list';

const SERVICE_NAME = 'wallet-addr-book';
const store = new Store({ name: 'wallet-index' });

// Non-secret wallet listing: [{ address, name }], persisted outside the
// keychain. Reading a keychain item's secret triggers one macOS ACL prompt
// PER ITEM, so the app must never enumerate keychain secrets just to render
// the list — secrets are only read one item at a time, on explicit demand.

export async function getWalletList() {
  const list = store.get('wallets');
  if (list !== undefined) {
    return list;
  }
  // One-time migration for installs that predate the index. Reads keychain
  // item ATTRIBUTES only — decrypting secrets (keytar.findCredentials) pops
  // one macOS password prompt per item, and a single denied prompt aborted
  // the migration so it re-ran (and re-prompted) on every launch. Attribute
  // reads never prompt. The wallet name lives inside the encrypted secret,
  // so migrated entries default to the address; renaming in the UI only
  // touches this index.
  const accounts = await listKeychainAccounts(SERVICE_NAME);
  const migrated = accounts.map((address) => ({ address, name: address }));
  store.set('wallets', migrated);
  return migrated;
}

export function setWalletList(list) {
  store.set('wallets', list);
}

export function upsertWallet(address, name) {
  const list = store.get('wallets') || [];
  const existing = list.find((w) => w.address === address);
  if (existing) {
    existing.name = name;
  } else {
    list.push({ address, name });
  }
  store.set('wallets', list);
}

// After migration the index holds the address as a placeholder name (the
// real name lives inside the encrypted keychain secret). Whenever a secret
// is decrypted on demand anyway, adopt its name — but never overwrite a
// name the user chose themselves.
export function healWalletName(address, name) {
  const list = store.get('wallets') || [];
  const entry = list.find((w) => w.address === address);
  if (entry && entry.name === address && name && name !== address) {
    entry.name = name;
    store.set('wallets', list);
  }
}

export function removeWallet(address) {
  const list = store.get('wallets') || [];
  store.set('wallets', list.filter((w) => w.address !== address));
}
