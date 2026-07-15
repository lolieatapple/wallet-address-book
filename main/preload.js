import { contextBridge, ipcRenderer } from 'electron';

// The only bridge between the isolated renderer and the main process.
// Exposes a fixed whitelist of operations — the renderer never gets
// direct access to ipcRenderer, Node, or Electron APIs.
contextBridge.exposeInMainWorld('walletApi', {
  // Legacy wallet channels (wallet UI + backwards compatibility)
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
  copyText: (text, opts) => ipcRenderer.invoke('copyText', text, opts),
  restoreNames: () => ipcRenderer.invoke('restoreNames'),

  // Generic secret items (Secret Holder)
  listItems: () => ipcRenderer.invoke('items:list'),
  createItem: (item) => ipcRenderer.invoke('items:create', item),
  updateItem: (item) => ipcRenderer.invoke('items:update', item),
  deleteItem: (id) => ipcRenderer.invoke('items:delete', id),
  getItemSecrets: (id) => ipcRenderer.invoke('items:getSecrets', id),

  // App settings (clipboard auto-clear, ...)
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),

  // Menu-bar "Restore Names" command; returns an unsubscribe function.
  onRestoreNamesRequested: (handler) => {
    const listener = () => handler();
    ipcRenderer.on('menu:restore-names', listener);
    return () => ipcRenderer.removeListener('menu:restore-names', listener);
  },
});
