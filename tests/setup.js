import { GlobalRegistrator } from '@happy-dom/global-registrator';

if (!globalThis.document) {
  GlobalRegistrator.register();
}

import { mock } from 'bun:test';

// Initialize global mocks — this creates them on globalThis so both
// preload and test files reference the same mock functions.
await import('./mocks.js');
const m = globalThis.__testMocks;

// Register all module mocks once
mock.module('electron', () => ({
  ipcRenderer: { invoke: (...args) => m.electron.invoke(...args) },
  shell: { openExternal: (...args) => m.electron.openExternal(...args) },
}));

mock.module('darkreader', () => ({
  isEnabled: () => false,
  enable: () => {},
  disable: () => {},
}));

mock.module('next/head', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});

mock.module('copy-to-clipboard', () => ({
  __esModule: true,
  default: (...args) => m.clipboard.copy(...args),
}));

// Mock the wallet service so component/hook tests can control it directly
// without going through electron IPC.
const walletServicePath = require.resolve('../renderer/services/wallet');
mock.module(walletServicePath, () => ({
  getAllWallets: (...args) => m.walletService.getAllWallets(...args),
  saveWallet: (...args) => m.walletService.saveWallet(...args),
  deleteWallet: (...args) => m.walletService.deleteWallet(...args),
  getPrivateKey: (...args) => m.walletService.getPrivateKey(...args),
  fetchBalances: (...args) => m.walletService.fetchBalances(...args),
  promptInput: (...args) => m.walletService.promptInput(...args),
  toggleDarkMode: (...args) => m.walletService.toggleDarkMode(...args),
  getDefaultWallet: (...args) => m.walletService.getDefaultWallet(...args),
  setDefaultWallet: (...args) => m.walletService.setDefaultWallet(...args),
}));
