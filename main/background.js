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
    width: 1200,
    height: 800,
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

// Cache for balance data
const balanceCache = {
  data: {},
  timestamps: {}
};

async function fetchBalance(addresses) {
  console.log('fetching balances for', addresses);
  
  // Sort addresses to ensure consistent cache key regardless of order
  const sortedAddresses = [...addresses].sort();
  const cacheKey = sortedAddresses.join(',');
  const currentTime = Date.now();
  const cacheExpiration = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  // Check if we have a valid cache entry
  if (
    balanceCache.data[cacheKey] && 
    balanceCache.timestamps[cacheKey] && 
    (currentTime - balanceCache.timestamps[cacheKey]) < cacheExpiration
  ) {
    console.log('Using cached balance data');
    return balanceCache.data[cacheKey];
  }
  
  // If no valid cache, fetch from API
  try {
    let debankAssets = await axios.post('https://assets-manager-ui.vercel.app/api/assets/totalBalance', { addresses });
    
    // Update cache
    balanceCache.data[cacheKey] = debankAssets.data;
    balanceCache.timestamps[cacheKey] = currentTime;
    
    return debankAssets.data;
  } catch (error) {
    console.error('Error fetching balance:', error);
    
    // If we have stale cache data, return it as fallback
    if (balanceCache.data[cacheKey]) {
      console.log('Using stale cached data as fallback');
      return balanceCache.data[cacheKey];
    }
    
    // Otherwise return empty object
    return {};
  }
}

app.on('window-all-closed', () => {
  app.quit();
});
