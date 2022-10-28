import { app, ipcMain, systemPreferences } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import keytar from 'keytar';

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
  });

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

ipcMain.handle('setpwd', async (event, message) => {
  try {
    let ret = await keytar.setPassword('wallet-addr-book', 'test1', message);
    console.log('setpwd', ret);
    return true;
  } catch (error) {
    console.log(error);
  }
  return false;
});

ipcMain.handle('getpwd', async (event, message) => {
  try {
    await systemPreferences.promptTouchID('Authenticate to get password')
    let ret = await keytar.getPassword('wallet-addr-book', 'test1');
    console.log('getpwd', ret);
    return ret;
  } catch (error) {
    console.log(error);
  }
  return false;
});

app.on('window-all-closed', () => {
  app.quit();
});
