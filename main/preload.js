import { contextBridge, ipcRenderer } from 'electron';

// The only bridge between the isolated renderer and the main process.
// Exposes a fixed whitelist of operations — the renderer never gets
// direct access to ipcRenderer, Node, or Electron APIs.
contextBridge.exposeInMainWorld('walletApi', {
  setPk: (address, json) => ipcRenderer.invoke('setPk', { address, json }),
  delPk: (address) => ipcRenderer.invoke('delPk', address),
  getPk: (address) => ipcRenderer.invoke('getPk', address),
  getWallets: () => ipcRenderer.invoke('getWallets'),
  renameWallet: (address, name) => ipcRenderer.invoke('renameWallet', { address, name }),
  getBalance: (addresses) => ipcRenderer.invoke('getBalance', addresses),
  prompt: (options) => ipcRenderer.invoke('prompt', options),
  toggleDarkMode: () => ipcRenderer.invoke('dark-mode:toggle'),
  getDefaultWallet: () => ipcRenderer.invoke('getDefaultWallet'),
  setDefaultWallet: (address) => ipcRenderer.invoke('setDefaultWallet', address),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});
