import { test, expect, describe, beforeEach, afterAll } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { migrateUserData } = await import('../../main/services/userdata-migration');

// Simulates ~/Library/Application Support with old/new app dirs.
const APPDATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-migrate-test-'));

afterAll(() => {
  fs.rmSync(APPDATA, { recursive: true, force: true });
});

function writeJson(dir, file, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data));
}

function readJson(dir, file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
}

const WALLETS = [
  { address: '0xA', name: 'TestAccount' },
  { address: '0xB', name: 'circle1' },
];

describe('migrateUserData', () => {
  let seq = 0;
  let newDir;

  beforeEach(() => {
    // Fresh old/new dirs per test
    for (const d of fs.readdirSync(APPDATA)) {
      fs.rmSync(path.join(APPDATA, d), { recursive: true, force: true });
    }
    newDir = path.join(APPDATA, 'secret-holder');
  });

  test('copies store files from the lowercase package-name dir (the real Electron userData name)', () => {
    // Electron derives userData from package.json "name", NOT from
    // electron-builder's productName — the old dir is lowercase.
    const oldDir = path.join(APPDATA, 'wallet-address-book');
    writeJson(oldDir, 'wallet-index.json', { wallets: WALLETS });
    writeJson(oldDir, 'default-wallet.json', { defaultAddress: '0xB' });

    migrateUserData(APPDATA, newDir, '');

    expect(readJson(newDir, 'wallet-index.json').wallets).toEqual(WALLETS);
    expect(readJson(newDir, 'default-wallet.json').defaultAddress).toBe('0xB');
  });

  test('falls back to the productName-cased dir when only that exists', () => {
    const oldDir = path.join(APPDATA, 'Wallet Address Book');
    writeJson(oldDir, 'wallet-index.json', { wallets: WALLETS });

    migrateUserData(APPDATA, newDir, '');

    expect(readJson(newDir, 'wallet-index.json').wallets).toEqual(WALLETS);
  });

  test('respects the dev-mode suffix', () => {
    const oldDir = path.join(APPDATA, 'wallet-address-book (development)');
    writeJson(oldDir, 'wallet-index.json', { wallets: WALLETS });
    newDir = path.join(APPDATA, 'secret-holder (development)');

    migrateUserData(APPDATA, newDir, ' (development)');

    expect(readJson(newDir, 'wallet-index.json').wallets).toEqual(WALLETS);
  });

  test('heals a botched earlier migration: placeholder names adopt the old real names', () => {
    // State left behind by the v2.0.0 bug: the new dir already has an
    // item-index migrated from keychain attributes (names == addresses),
    // while the old dir still has the real names.
    const oldDir = path.join(APPDATA, 'wallet-address-book');
    writeJson(oldDir, 'wallet-index.json', { wallets: WALLETS });
    writeJson(oldDir, 'default-wallet.json', { defaultAddress: '0xB' });

    writeJson(newDir, 'wallet-index.json', {
      wallets: [
        { address: '0xA', name: '0xA' },
        { address: '0xB', name: '0xB' },
      ],
    });
    writeJson(newDir, 'item-index.json', {
      items: [
        { id: 'i1', name: '0xA', type: 'wallet', fields: { address: '0xA' }, secretFields: ['pk'] },
        { id: 'i2', name: 'UserRenamed', type: 'wallet', fields: { address: '0xB' }, secretFields: ['pk'] },
        { id: 'i3', name: 'openai/prod', type: 'apikey', fields: {}, secretFields: ['apikey'] },
      ],
    });

    migrateUserData(APPDATA, newDir, '');

    const items = readJson(newDir, 'item-index.json').items;
    // Placeholder healed from the old index…
    expect(items[0].name).toBe('TestAccount');
    // …but a name the user already chose in the new app is never touched,
    expect(items[1].name).toBe('UserRenamed');
    // and non-wallet items are untouched.
    expect(items[2].name).toBe('openai/prod');

    // The vestigial wallet-index placeholders heal from the old index too
    // (it is only a migration source; the item-index above stays authoritative).
    const wallets = readJson(newDir, 'wallet-index.json').wallets;
    expect(wallets.map((w) => w.name)).toEqual(['TestAccount', 'circle1']);

    // A missing default-wallet.json is recovered as well.
    expect(readJson(newDir, 'default-wallet.json').defaultAddress).toBe('0xB');
  });

  test('healing never overwrites an existing default wallet or duplicates names', () => {
    const oldDir = path.join(APPDATA, 'wallet-address-book');
    writeJson(oldDir, 'wallet-index.json', {
      wallets: [
        { address: '0xA', name: 'Taken' },
        { address: '0xB', name: 'circle1' },
      ],
    });
    writeJson(oldDir, 'default-wallet.json', { defaultAddress: '0xA' });

    writeJson(newDir, 'default-wallet.json', { defaultAddress: '0xB' });
    writeJson(newDir, 'item-index.json', {
      items: [
        // Healing '0xA' → 'Taken' would collide with the existing item name.
        { id: 'i0', name: 'Taken', type: 'custom', fields: {}, secretFields: [] },
        { id: 'i1', name: '0xA', type: 'wallet', fields: { address: '0xA' }, secretFields: ['pk'] },
        { id: 'i2', name: '0xB', type: 'wallet', fields: { address: '0xB' }, secretFields: ['pk'] },
      ],
    });

    migrateUserData(APPDATA, newDir, '');

    const items = readJson(newDir, 'item-index.json').items;
    expect(items[1].name).toBe('0xA'); // collision → left as placeholder
    expect(items[2].name).toBe('circle1');
    expect(readJson(newDir, 'default-wallet.json').defaultAddress).toBe('0xB');
  });

  test('no old dir → no-op', () => {
    migrateUserData(APPDATA, newDir, '');
    expect(fs.existsSync(newDir)).toBe(false);
  });
});
