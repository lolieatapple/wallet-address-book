import { app } from 'electron';
import { migrateUserData } from './userdata-migration';

// MUST be imported before any module that constructs an electron-store:
// electron-store reads its file in the constructor, so both the dev-mode
// userData suffix and the one-time directory migration below have to run
// at import time, ahead of those constructors.

const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

// The app was renamed wallet-address-book → secret-holder, which moves the
// userData directory. Copy the old store files into the new location once —
// and heal the placeholder-name state left behind by the buggy v2.0.0
// migration (it looked for the wrong old directory name).
migrateUserData(
  app.getPath('appData'),
  app.getPath('userData'),
  isProd ? '' : ' (development)'
);
