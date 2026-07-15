// Generic secret-item access. Like services/wallet.js, everything goes
// through window.walletApi (the preload whitelist) — the renderer never
// touches Node/Electron directly.

export async function listItems() {
  const items = await window.walletApi.listItems();
  return items || [];
}

export async function createItem({ name, type, fields, secretFields, secrets }) {
  return window.walletApi.createItem({ name, type, fields, secretFields, secrets });
}

// Index-level update; pass `secrets` (the FULL secrets object) only when
// secret values actually changed — that is the only part that touches the
// keychain.
export async function updateItem({ id, name, fields, secretFields, secrets }) {
  return window.walletApi.updateItem({ id, name, fields, secretFields, secrets });
}

export async function deleteItem(id) {
  return window.walletApi.deleteItem(id);
}

// Decrypts all secret fields of one item — triggers TouchID in the main
// process. Returns { fieldKey: value }.
export async function getItemSecrets(id) {
  return window.walletApi.getItemSecrets(id);
}

export async function getSettings() {
  return window.walletApi.getSettings();
}

export async function updateSettings(patch) {
  return window.walletApi.updateSettings(patch);
}

// Sensitive copy: main-process clipboard write that participates in the
// opt-in auto-clear timer.
export async function copySecretText(text) {
  return window.walletApi.copyText(text, { sensitive: true });
}
