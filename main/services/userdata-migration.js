import fs from 'fs';
import path from 'path';

// Pure userData migration logic (no Electron imports) so it can be
// unit-tested. See migrate-userdata.js for the import-time shim.
//
// Electron derives the userData directory from package.json "name"
// (lowercase "wallet-address-book"), NOT from electron-builder's
// productName — but a differently-provisioned install could have used the
// cased name, so both are candidates. The one that actually contains a
// wallet-index.json wins.
const OLD_DIR_NAMES = ['wallet-address-book', 'Wallet Address Book'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, '\t'));
}

function findOldDir(appDataDir, suffix) {
  for (const name of OLD_DIR_NAMES) {
    const dir = path.join(appDataDir, name + suffix);
    if (fs.existsSync(path.join(dir, 'wallet-index.json'))) {
      return dir;
    }
  }
  return null;
}

// Copies every electron-store file from the old app-name directory into the
// fresh new one (wallet index, default wallet, balance cache, window state).
function copyStoreFiles(oldDir, newDir) {
  fs.mkdirSync(newDir, { recursive: true });
  for (const file of fs.readdirSync(oldDir)) {
    if (file.endsWith('.json')) {
      fs.copyFileSync(path.join(oldDir, file), path.join(newDir, file));
    }
  }
}

// Repairs the state left behind by the v2.0.0 migration bug: the new dir
// already holds an item-index that was re-migrated from keychain attributes
// (every wallet name a placeholder == its address) while the old dir still
// has the real names. Placeholders adopt the old name; names the user chose
// in the new app — or that would collide — are never touched.
function healFromOldIndex(oldDir, newDir) {
  const oldWallets = readJson(path.join(oldDir, 'wallet-index.json')).wallets || [];
  const oldNames = new Map(
    oldWallets.filter((w) => w.name && w.name !== w.address).map((w) => [w.address, w.name])
  );

  const itemIndexPath = path.join(newDir, 'item-index.json');
  if (oldNames.size > 0 && fs.existsSync(itemIndexPath)) {
    const data = readJson(itemIndexPath);
    const items = data.items || [];
    const taken = new Set(items.map((it) => it.name));
    let changed = false;
    for (const item of items) {
      if (item.type !== 'wallet' || item.name !== item.fields.address) continue;
      const realName = oldNames.get(item.fields.address);
      if (!realName || taken.has(realName)) continue;
      taken.delete(item.name);
      item.name = realName;
      taken.add(realName);
      changed = true;
    }
    if (changed) writeJson(itemIndexPath, data);
  }

  // Same healing for a copied-over wallet-index (kept as migration source).
  const walletIndexPath = path.join(newDir, 'wallet-index.json');
  if (oldNames.size > 0 && fs.existsSync(walletIndexPath)) {
    const data = readJson(walletIndexPath);
    let changed = false;
    for (const wallet of data.wallets || []) {
      const realName = oldNames.get(wallet.address);
      if (wallet.name === wallet.address && realName) {
        wallet.name = realName;
        changed = true;
      }
    }
    if (changed) writeJson(walletIndexPath, data);
  }

  // Recover a default wallet lost by the botched migration — but never
  // overwrite one the user has set since.
  const oldDefault = path.join(oldDir, 'default-wallet.json');
  const newDefault = path.join(newDir, 'default-wallet.json');
  if (fs.existsSync(oldDefault) && !fs.existsSync(newDefault)) {
    fs.copyFileSync(oldDefault, newDefault);
  }
}

export function migrateUserData(appDataDir, newDir, suffix) {
  const oldDir = findOldDir(appDataDir, suffix);
  if (!oldDir || oldDir === newDir) return;

  const alreadyMigrated =
    fs.existsSync(path.join(newDir, 'item-index.json')) ||
    fs.existsSync(path.join(newDir, 'wallet-index.json'));

  if (!alreadyMigrated) {
    copyStoreFiles(oldDir, newDir);
  } else {
    healFromOldIndex(oldDir, newDir);
  }
}
