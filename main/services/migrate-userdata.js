import { app } from 'electron';
import fs from 'fs';
import path from 'path';

// MUST be imported before any module that constructs an electron-store:
// electron-store reads its file in the constructor, so both the dev-mode
// userData suffix and the one-time directory migration below have to run
// at import time, ahead of those constructors.

const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

// The app was renamed Wallet Address Book → Secret Holder, which moves the
// userData directory. Copy the old store files (wallet index, default
// wallet, balance cache, window state) into the new location once —
// otherwise the rename would silently orphan the entire non-secret index.
const newDir = app.getPath('userData');
const suffix = isProd ? '' : ' (development)';
const oldDir = path.join(app.getPath('appData'), 'Wallet Address Book' + suffix);

const alreadyMigrated =
  fs.existsSync(path.join(newDir, 'item-index.json')) ||
  fs.existsSync(path.join(newDir, 'wallet-index.json'));

if (oldDir !== newDir && !alreadyMigrated && fs.existsSync(oldDir)) {
  fs.mkdirSync(newDir, { recursive: true });
  for (const file of fs.readdirSync(oldDir)) {
    if (file.endsWith('.json')) {
      fs.copyFileSync(path.join(oldDir, file), path.join(newDir, file));
    }
  }
}
