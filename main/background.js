import { app, ipcMain, systemPreferences, nativeTheme } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import keytar from 'keytar';
import axios from 'axios';
const prompt = require('electron-prompt');

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: 960,
    height: 600,
  });

  ipcMain.handle('setPk', async (event, message) => {
    try {
      let ret = await keytar.setPassword('wallet-addr-book', message.address, message.json);
      return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  });
  
  ipcMain.handle('delPk', async (event, message) => {
    try {
      await systemPreferences.promptTouchID('Remove account: ' + message)
      let ret = await keytar.deletePassword('wallet-addr-book', message);
      return true;
    } catch (error) {
      console.log(error);
    }
    return false;
  });
  
  ipcMain.handle('getPk', async (event, message) => {
    try {
      await systemPreferences.promptTouchID('Authenticate to read private key')
      let ret = await keytar.getPassword('wallet-addr-book', message);
      return ret;
    } catch (error) {
      console.log(error);
      return false;
    }
  });

  ipcMain.handle('getAllPks', async (event, message) => {
    try {
      console.log('getAllPks');
      // await systemPreferences.promptTouchID('Unlock to access all accounts');
      let ret = await keytar.findCredentials('wallet-addr-book');
      // ret.map(v=>{
      //   keytar.deletePassword('wallet-addr-book', v.account);
      // })
      return ret;
    } catch (error) {
      console.log(error);
    }
    return false;
  });

  ipcMain.handle('getBalance', async (event, message) => {
    try {
      let ret = await fetchBalance(message);
      return ret;
    } catch (error) {
      console.log(error);
    }
    return false;
  });

  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('prompt', async (e, v) => {
    return await prompt(v);
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

async function fetchBalance(addresses) {
  console.log('fetching balances for', addresses);
  let debankAssets = await axios.post('https://assets-manager-ui.vercel.app/api/assets/totalBalance', { addresses });
  return debankAssets.data;
}


app.on('window-all-closed', () => {
  app.quit();
});
