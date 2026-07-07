// All main-process access goes through window.walletApi, the whitelist
// exposed by main/preload.js via contextBridge (contextIsolation is on,
// so the renderer has no direct Node/Electron access).

// Returns non-secret wallet entries: [{ address, name }]
export async function getAllWallets() {
  const wallets = await window.walletApi.getWallets();
  return wallets || [];
}

export async function saveWallet(address, data) {
  return window.walletApi.setPk(address, JSON.stringify(data));
}

export async function renameWallet(address, name) {
  return window.walletApi.renameWallet(address, name);
}

export async function deleteWallet(address) {
  return window.walletApi.delPk(address);
}

export async function getPrivateKey(address) {
  const raw = await window.walletApi.getPk(address);
  if (!raw) return null;
  return JSON.parse(raw).pk;
}

export async function fetchBalances(addresses) {
  return window.walletApi.getBalance(addresses);
}

export async function promptInput(title, label, value = '') {
  return window.walletApi.prompt({ title, label, value, type: 'input' });
}

export async function toggleDarkMode() {
  return window.walletApi.toggleDarkMode();
}

export async function getDefaultWallet() {
  return window.walletApi.getDefaultWallet();
}

export async function setDefaultWallet(address) {
  return window.walletApi.setDefaultWallet(address);
}

export async function openExternal(url) {
  return window.walletApi.openExternal(url);
}

// Main-process clipboard write. document.execCommand('copy') requires a live
// user-activation, which expires during the TouchID/keychain wait of a
// private-key read; the IPC clipboard has no such constraint.
export async function copyText(text) {
  return window.walletApi.copyText(text);
}

// Bulk-restores migrated placeholder names from the keychain.
// Returns { pending, restored }.
export async function restoreNames() {
  return window.walletApi.restoreNames();
}

// Subscribes to the app-menu "Restore Names from Keychain" command.
// Returns an unsubscribe function.
export function onRestoreNamesRequested(handler) {
  return window.walletApi.onRestoreNamesRequested(handler);
}
