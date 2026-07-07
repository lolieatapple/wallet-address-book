import Store from 'electron-store';
import keytar from 'keytar';

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
  // One-time migration for installs that predate the index: enumerate the
  // keychain once (this prompts once per item) and persist the result.
  const creds = (await keytar.findCredentials(SERVICE_NAME)) || [];
  const migrated = creds.map((c) => ({
    address: c.account,
    name: JSON.parse(c.password).name,
  }));
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

export function removeWallet(address) {
  const list = store.get('wallets') || [];
  store.set('wallets', list.filter((w) => w.address !== address));
}
