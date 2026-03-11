import { app, ipcMain, systemPreferences, nativeTheme } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import keytar from 'keytar';
import { createBalanceCache } from './services/balance';
import { startHttpApi, getDefaultAddress, setDefaultAddress } from './services/http-api';
const prompt = require('electron-prompt');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

const fetchBalance = createBalanceCache();
let mainWindow;

(async () => {
  await app.whenReady();

  mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
  });

  // Hide to tray instead of quitting on close
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  ipcMain.handle('setPk', async (event, message) => {
    try {
      await keytar.setPassword('wallet-addr-book', message.address, message.json);
      return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  });

  ipcMain.handle('delPk', async (event, message) => {
    try {
      await systemPreferences.promptTouchID('Remove account: ' + message);
      await keytar.deletePassword('wallet-addr-book', message);
      return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  });

  ipcMain.handle('getPk', async (event, message) => {
    try {
      await systemPreferences.promptTouchID('Authenticate to read private key');
      const ret = await keytar.getPassword('wallet-addr-book', message);
      return ret;
    } catch (error) {
      console.log(error);
      return false;
    }
  });

  ipcMain.handle('getAllPks', async () => {
    try {
      const ret = await keytar.findCredentials('wallet-addr-book');
      return ret;
    } catch (error) {
      console.log(error);
    }
    return false;
  });

  ipcMain.handle('getBalance', async (event, message) => {
    try {
      return await fetchBalance(message);
    } catch (error) {
      console.log(error);
    }
    return false;
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
});
