const { ipcRenderer } = require('electron');

export async function getAllWallets() {
  const credentials = await ipcRenderer.invoke('getAllPks');
  return credentials || [];
}

export async function saveWallet(address, data) {
  return ipcRenderer.invoke('setPk', {
    address,
    json: JSON.stringify(data),
  });
}

export async function deleteWallet(address) {
  return ipcRenderer.invoke('delPk', address);
}

export async function getPrivateKey(address) {
  const raw = await ipcRenderer.invoke('getPk', address);
  if (!raw) return null;
  return JSON.parse(raw).pk;
}

export async function fetchBalances(addresses) {
  return ipcRenderer.invoke('getBalance', addresses);
}

export async function promptInput(title, label, value = '') {
  return ipcRenderer.invoke('prompt', { title, label, value, type: 'input' });
}

export async function toggleDarkMode() {
  return ipcRenderer.invoke('dark-mode:toggle');
}

export async function getDefaultWallet() {
  return ipcRenderer.invoke('getDefaultWallet');
}

export async function setDefaultWallet(address) {
  return ipcRenderer.invoke('setDefaultWallet', address);
}
