import { app, ipcMain, systemPreferences, nativeTheme, shell, clipboard, Menu } from 'electron';
// Adjusts userData (dev suffix + old-app-name migration) — must precede
// every import that constructs an electron-store.
import './services/migrate-userdata';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import Store from 'electron-store';
import { createBalanceCache } from './services/balance';
import { startHttpApi, stopHttpApi, getDefaultAddress, setDefaultAddress } from './services/http-api';
import {
  getItems,
  createItem,
  updateItem,
  removeItem,
  findById,
  findWalletByAddress,
  healItemName,
  getWalletEntries,
} from './services/item-index';
import { readSecrets, writeSecrets, deleteSecrets } from './services/secrets';
import { restoreWalletNames } from './services/restore-names';
import { getSettings, updateSettings } from './services/settings';
const prompt = require('electron-prompt');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
}

const fetchBalance = createBalanceCache(undefined, new Store({ name: 'balance-cache' }));
let mainWindow;

(async () => {
  await app.whenReady();

  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
  });

  // Standard menus plus an app-specific menu for rarely-used commands that
  // don't deserve toolbar space. The menu item only signals the renderer —
  // the restore flow itself runs through the same 'restoreNames' IPC as
  // before, so the result lands in the UI's message box.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'Secrets',
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

  // ---------------------------------------------------------------------
  // Legacy wallet channels — kept verbatim for the wallet UI and to avoid
  // breaking anything scripted against them. They now route through the
  // generalized item-index.
  // ---------------------------------------------------------------------

  ipcMain.handle('setPk', async (event, message) => {
    const { name, pk } = JSON.parse(message.json);
    let item = findWalletByAddress(message.address);
    if (!item) {
      item = createItem({
        name,
        type: 'wallet',
        fields: { address: message.address },
        secretFields: ['pk'],
      });
    }
    await writeSecrets(item.keychain, { name, type: 'wallet', secrets: { pk } });
    return true;
  });

  ipcMain.handle('delPk', async (event, message) => {
    const item = findWalletByAddress(message);
    if (!item) throw new Error(`Wallet ${message} not found`);
    await systemPreferences.promptTouchID('Remove account: ' + item.name);
    await deleteSecrets(item.keychain);
    removeItem(item.id);
    // A stale default pointing at a deleted wallet would make the CLI/API
    // hand out a dead address, so clear it in the same operation.
    if (getDefaultAddress() === message) {
      setDefaultAddress(null);
    }
    return true;
  });

  ipcMain.handle('getPk', async (event, message) => {
    const item = findWalletByAddress(message);
    if (!item) return null;
    await systemPreferences.promptTouchID('Authenticate to read private key of ' + message);
    const payload = await readSecrets(item.keychain);
    if (!payload) return null;
    // The secret is decrypted anyway — use its name to replace a migration
    // placeholder in the index (no extra keychain access, no extra prompt).
    healItemName(item.id, payload.name);
    // Renderer expects the legacy { name, pk } JSON shape.
    return JSON.stringify({ name: payload.name, pk: payload.secrets.pk });
  });

  // Wallet listing is served from the non-secret index — enumerating
  // keychain secrets would trigger one macOS ACL prompt per wallet.
  ipcMain.handle('getWallets', async () => {
    return getWalletEntries();
  });

  // Renaming only touches the index; the keychain item (and its ACL
  // prompt) stays untouched.
  ipcMain.handle('renameWallet', (event, { address, name }) => {
    const item = findWalletByAddress(address);
    if (!item) throw new Error(`Wallet ${address} not found`);
    updateItem(item.id, { name });
    return true;
  });

  // ---------------------------------------------------------------------
  // Generic item channels (Secret Holder)
  // ---------------------------------------------------------------------

  ipcMain.handle('items:list', async () => {
    return getItems();
  });

  ipcMain.handle('items:create', async (event, { name, type, fields, secretFields, secrets }) => {
    const item = createItem({ name, type, fields, secretFields });
    if (secretFields && secretFields.length > 0) {
      await writeSecrets(item.keychain, { name, type, secrets });
    }
    return item;
  });

  // Index-level update (name / plaintext fields / secret-field list). If new
  // secret values are provided, the FULL secrets object must be passed — the
  // edit flow decrypts existing values first (one TouchID) so nothing is lost.
  ipcMain.handle('items:update', async (event, { id, name, fields, secretFields, secrets }) => {
    const item = updateItem(id, { name, fields, secretFields });
    if (secrets !== undefined) {
      await writeSecrets(item.keychain, { name: item.name, type: item.type, secrets });
    }
    return item;
  });

  ipcMain.handle('items:delete', async (event, id) => {
    const item = findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await systemPreferences.promptTouchID('Delete item: ' + item.name);
    if (item.secretFields.length > 0) {
      await deleteSecrets(item.keychain);
    }
    removeItem(id);
    if (item.type === 'wallet' && getDefaultAddress() === item.fields.address) {
      setDefaultAddress(null);
    }
    return true;
  });

  // Decrypts and returns ALL secret fields of one item (one TouchID, one
  // keychain ACL check). Secrets are read one item at a time, on demand only.
  ipcMain.handle('items:getSecrets', async (event, id) => {
    const item = findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await systemPreferences.promptTouchID('Read secrets of: ' + item.name);
    const payload = await readSecrets(item.keychain);
    if (!payload) return null;
    healItemName(item.id, payload.name);
    return payload.secrets;
  });

  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:update', (event, patch) => updateSettings(patch));

  // ---------------------------------------------------------------------

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
  // Sensitive copies are auto-cleared after a delay when the (opt-in)
  // setting is enabled — but only if the clipboard still holds our text.
  let clipboardClearTimer = null;
  ipcMain.handle('copyText', (event, text, opts) => {
    clipboard.writeText(text);
    if (clipboardClearTimer) {
      clearTimeout(clipboardClearTimer);
      clipboardClearTimer = null;
    }
    const settings = getSettings();
    if (opts && opts.sensitive && settings.clipboardAutoClear) {
      clipboardClearTimer = setTimeout(() => {
        if (clipboard.readText() === text) {
          clipboard.clear();
        }
        clipboardClearTimer = null;
      }, settings.clipboardClearDelaySec * 1000);
    }
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
