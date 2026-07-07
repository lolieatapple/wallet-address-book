import { app, ipcMain, systemPreferences, nativeTheme, shell, clipboard, Menu } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import keytar from 'keytar';
import Store from 'electron-store';
import { createBalanceCache } from './services/balance';
import { startHttpApi, stopHttpApi, getDefaultAddress, setDefaultAddress } from './services/http-api';
import { getWalletList, upsertWallet, removeWallet, healWalletName } from './services/wallet-index';
import { restoreWalletNames } from './services/restore-names';
const prompt = require('electron-prompt');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

const fetchBalance = createBalanceCache(undefined, new Store({ name: 'balance-cache' }));
let mainWindow;

(async () => {
  await app.whenReady();

  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
  });

  // Standard menus plus a Wallet menu for rarely-used commands that don't
  // deserve toolbar space. The menu item only signals the renderer — the
  // restore flow itself runs through the same 'restoreNames' IPC as before,
  // so the result lands in the UI's message box.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'Wallet',
      submenu: [
        {
          label: 'Restore Names from Keychain',
          click: () => {
            mainWindow.show();
            mainWindow.webContents.send('menu:restore-names');
          },
        },
      ],
    },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]));

  // Hide to tray instead of quitting on close
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Errors are NOT swallowed here: a rejected handler propagates to the
  // renderer's ipcRenderer.invoke, where the UI layer catches and displays it.

  ipcMain.handle('setPk', async (event, message) => {
    await keytar.setPassword('wallet-addr-book', message.address, message.json);
    upsertWallet(message.address, JSON.parse(message.json).name);
    return true;
  });

  ipcMain.handle('delPk', async (event, message) => {
    await systemPreferences.promptTouchID('Remove account: ' + message);
    await keytar.deletePassword('wallet-addr-book', message);
    removeWallet(message);
    // A stale default pointing at a deleted wallet would make the CLI/API
    // hand out a dead address, so clear it in the same operation.
    if (getDefaultAddress() === message) {
      setDefaultAddress(null);
    }
    return true;
  });

  ipcMain.handle('getPk', async (event, message) => {
    await systemPreferences.promptTouchID('Authenticate to read private key of ' + message);
    const raw = await keytar.getPassword('wallet-addr-book', message);
    // The secret is decrypted anyway — use its name to replace a migration
    // placeholder in the index (no extra keychain access, no extra prompt).
    if (raw) healWalletName(message, JSON.parse(raw).name);
    return raw;
  });

  // Wallet listing is served from the non-secret index — enumerating
  // keychain secrets would trigger one macOS ACL prompt per wallet.
  ipcMain.handle('getWallets', async () => {
    return getWalletList();
  });

  // Renaming only touches the index; the keychain item (and its ACL
  // prompt) stays untouched.
  ipcMain.handle('renameWallet', (event, { address, name }) => {
    upsertWallet(address, name);
    return true;
  });

  ipcMain.handle('getBalance', async (event, message) => {
    // fetchBalance handles network errors internally (stale cache fallback)
    return fetchBalance(message);
  });

  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light';
    } else {
      nativeTheme.themeSource = 'dark';
    }
    return nativeTheme.shouldUseDarkColors;
  });

  ipcMain.handle('prompt', async (e, v) => {
    return await prompt(v);
  });

  // Bulk-restore migrated placeholder names. One TouchID gate up front, then
  // one keychain ACL dialog per un-restored wallet — answering "Always
  // Allow" there permanently silences future prompts for that wallet.
  ipcMain.handle('restoreNames', async () => {
    await systemPreferences.promptTouchID('Restore wallet names from keychain');
    return restoreWalletNames();
  });

  // Main-process clipboard write: unlike document.execCommand('copy') it
  // needs no user-activation, which has expired by the time the TouchID /
  // keychain-password wait of a private-key read finishes.
  ipcMain.handle('copyText', (event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('openExternal', (event, url) => {
    if (!/^https:\/\//.test(url)) {
      throw new Error('Only https URLs are allowed: ' + url);
    }
    return shell.openExternal(url);
  });

  ipcMain.handle('getDefaultWallet', () => {
    return getDefaultAddress();
  });

  ipcMain.handle('setDefaultWallet', (event, address) => {
    setDefaultAddress(address);
    return true;
  });

  startHttpApi();

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

// On macOS, re-show window when dock icon is clicked
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  // Do nothing — app stays in background
});

// Allow actual quit from dock menu / Cmd+Q
app.on('before-quit', () => {
  app.isQuitting = true;
  stopHttpApi();
});
