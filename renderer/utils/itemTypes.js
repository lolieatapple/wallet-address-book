// Item type templates shared by the sidebar, list views, and the new-item
// dialog. Field order here is the display order.
//
// A field template: { key, label, secret } — secret fields live in the OS
// keychain behind TouchID, plaintext fields live in the local index.

export const TYPE_META = {
  wallet: {
    label: 'Wallets',
    singular: 'Wallet',
  },
  apikey: {
    label: 'API Keys',
    singular: 'API Key',
    fields: [
      { key: 'apikey', label: 'API Key', secret: true, required: true },
      { key: 'seckey', label: 'Secret Key', secret: true },
      { key: 'url', label: 'URL', secret: false },
    ],
  },
  ssh: {
    label: 'SSH',
    singular: 'SSH',
    fields: [
      { key: 'host', label: 'Host (user@host:port)', secret: false, required: true },
      { key: 'password', label: 'Password', secret: true, required: true },
    ],
  },
  custom: {
    label: 'Custom',
    singular: 'Custom',
  },
};

export const CATEGORY_ORDER = ['wallet', 'apikey', 'ssh', 'custom'];

// '/' in an item name is a display-level group separator: "openai/prod"
// lists under the collapsible group "openai". Only the first segment groups;
// storage always keeps the full name.
export function splitGroup(name) {
  const idx = name.indexOf('/');
  if (idx <= 0) return { group: null, rest: name };
  return { group: name.slice(0, idx), rest: name.slice(idx + 1) };
}

// Returns [{ group: string|null, items }] — ungrouped first, then groups in
// first-appearance order.
export function groupItems(items) {
  const ungrouped = [];
  const groups = new Map();
  for (const item of items) {
    const { group } = splitGroup(item.name);
    if (group === null) {
      ungrouped.push(item);
    } else {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    }
  }
  const result = [];
  if (ungrouped.length > 0) result.push({ group: null, items: ungrouped });
  for (const [group, groupedItems] of groups) {
    result.push({ group, items: groupedItems });
  }
  return result;
}

// The field offered for one-click copy in list rows (first secret field).
export function primarySecretField(item) {
  return item.secretFields && item.secretFields.length > 0 ? item.secretFields[0] : null;
}

// A short plaintext summary for list rows (address, host, url, ...).
export function itemSummary(item) {
  const values = Object.values(item.fields || {});
  return values.length > 0 ? String(values[0]) : '';
}
