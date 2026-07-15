import { test, expect, describe, mock, beforeEach, afterAll } from 'bun:test';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock electron and keytar before importing http-api
const mockPromptTouchID = mock(() => Promise.resolve());
const mockGetPassword = mock(() => Promise.resolve(null));
const mockFindCredentials = mock(() => Promise.resolve([]));

mock.module('electron', () => ({
  systemPreferences: { promptTouchID: (...args) => mockPromptTouchID(...args) },
}));

mock.module('keytar', () => ({
  __esModule: true,
  default: {
    getPassword: (...args) => mockGetPassword(...args),
    findCredentials: (...args) => mockFindCredentials(...args),
  },
}));

mock.module('electron-store', () => {
  const data = {};
  return {
    __esModule: true,
    default: class {
      get(key) { return data[key]; }
      set(key, val) { data[key] = val; }
      delete(key) { delete data[key]; }
    },
  };
});

const { startHttpApi, stopHttpApi, getDefaultAddress, setDefaultAddress } = await import(
  '../../main/services/http-api'
);
const { setItems } = await import('../../main/services/item-index');

const TEST_SOCKET = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sh-api-test-')), 'api.sock');

// Use Node http.get over the unix socket to bypass happy-dom's CORS-enforcing fetch
function get(reqPath) {
  return new Promise((resolve, reject) => {
    http.get({ socketPath: TEST_SOCKET, path: reqPath }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const isJson = (res.headers['content-type'] || '').includes('application/json');
        resolve({ status: res.statusCode, body: isJson ? JSON.parse(data) : data });
      });
    }).on('error', reject);
  });
}

const VALID_ADDR = '0x' + 'a1'.repeat(20);

function walletItem(address, name, id) {
  return {
    id: id || `wid-${address}`,
    name,
    type: 'wallet',
    fields: { address },
    secretFields: ['pk'],
    // Legacy wallets stay under the old keychain service, keyed by address.
    keychain: { service: 'wallet-addr-book', account: address },
    createdAt: 1,
    updatedAt: 2,
  };
}

function apikeyItem(name, id) {
  return {
    id,
    name,
    type: 'apikey',
    fields: { url: 'https://api.example.com' },
    secretFields: ['apikey', 'seckey'],
    keychain: { service: 'secret-holder', account: id },
    createdAt: 1,
    updatedAt: 2,
  };
}

describe('HTTP API', () => {
  const server = startHttpApi(TEST_SOCKET);
  const ready = new Promise((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });

  afterAll(() => {
    stopHttpApi();
    fs.rmSync(path.dirname(TEST_SOCKET), { recursive: true, force: true });
  });

  beforeEach(() => {
    mockPromptTouchID.mockReset();
    mockGetPassword.mockReset();
    mockFindCredentials.mockReset();
    mockPromptTouchID.mockResolvedValue();
    setDefaultAddress(null);
    setItems([]);
  });

  test('socket file is created with 0600 permissions', async () => {
    await ready;
    const mode = fs.statSync(TEST_SOCKET).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  describe('GET /default/address', () => {
    test('returns 404 when no default set', async () => {
      const { status, body } = await get('/default/address');
      expect(status).toBe(404);
      expect(body.error).toMatch(/No default/);
    });

    test('returns address as plain text when default is set', async () => {
      setDefaultAddress('0xDefaultAddr');
      const { status, body } = await get('/default/address');
      expect(status).toBe(200);
      expect(body).toBe('0xDefaultAddr');
    });
  });

  describe('GET /default/pk', () => {
    test('returns 404 when no default set', async () => {
      const { status } = await get('/default/pk');
      expect(status).toBe(404);
    });

    test('returns private key as plain text after TouchID', async () => {
      setItems([walletItem('0xAddr', 'Test')]);
      setDefaultAddress('0xAddr');
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xSecret', name: 'Test' }));

      const { status, body } = await get('/default/pk');
      expect(status).toBe(200);
      expect(body).toBe('0xSecret');
      expect(mockPromptTouchID).toHaveBeenCalled();
      // Legacy wallets are read from their original keychain location.
      expect(mockGetPassword).toHaveBeenCalledWith('wallet-addr-book', '0xAddr');
    });

    test('returns 404 when default wallet is missing from the index', async () => {
      setDefaultAddress('0xDeleted');

      const { status, body } = await get('/default/pk');
      expect(status).toBe(404);
      expect(body.error).toMatch(/not found/);
      // No index entry → no TouchID, no keychain read.
      expect(mockGetPassword).not.toHaveBeenCalled();
    });

    test('returns 403 when TouchID denied', async () => {
      setItems([walletItem('0xAddr', 'Test')]);
      setDefaultAddress('0xAddr');
      mockPromptTouchID.mockRejectedValueOnce(new Error('User denied'));

      const { status, body } = await get('/default/pk');
      expect(status).toBe(403);
      expect(body.error).toMatch(/Authentication failed/);
    });
  });

  describe('GET /wallet/:address/pk', () => {
    test('returns private key by address after TouchID', async () => {
      setItems([walletItem(VALID_ADDR, 'X')]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xPK9', name: 'X' }));

      const { status, body } = await get(`/wallet/${VALID_ADDR}/pk`);
      expect(status).toBe(200);
      expect(body.address).toBe(VALID_ADDR);
      expect(body.privateKey).toBe('0xPK9');
      expect(mockPromptTouchID).toHaveBeenCalledWith(expect.stringContaining(VALID_ADDR));
    });

    test('returns 404 for unknown address', async () => {
      const { status } = await get(`/wallet/${VALID_ADDR}/pk`);
      expect(status).toBe(404);
    });
  });

  describe('GET /wallet/:index/address', () => {
    test('returns address by index', async () => {
      setItems([
        walletItem('0xFirst', 'A'),
        walletItem('0xSecond', 'B'),
      ]);

      const { status, body } = await get('/wallet/2/address');
      expect(status).toBe(200);
      expect(body.index).toBe(2);
      expect(body.address).toBe('0xSecond');
    });

    test('non-wallet items are invisible to wallet indexing', async () => {
      setItems([
        apikeyItem('openai/prod', 'k1'),
        walletItem('0xOnly', 'A'),
      ]);

      const { status, body } = await get('/wallet/1/address');
      expect(status).toBe(200);
      expect(body.address).toBe('0xOnly');
    });

    test('returns 404 for out-of-range index', async () => {
      const { status } = await get('/wallet/1/address');
      expect(status).toBe(404);
    });

    test('returns 404 for index 0', async () => {
      setItems([walletItem('0xFirst', 'A')]);
      const { status } = await get('/wallet/0/address');
      expect(status).toBe(404);
    });
  });

  describe('GET /wallet/:index/pk', () => {
    test('returns private key by index after TouchID, prompt includes address', async () => {
      setItems([walletItem('0xAddr1', 'A')]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xPK1', name: 'A' }));

      const { status, body } = await get('/wallet/1/pk');
      expect(status).toBe(200);
      expect(body.address).toBe('0xAddr1');
      expect(body.privateKey).toBe('0xPK1');
      expect(mockPromptTouchID).toHaveBeenCalledWith(expect.stringContaining('0xAddr1'));
    });

    test('returns 403 when TouchID denied', async () => {
      setItems([walletItem('0xAddr1', 'A')]);
      mockPromptTouchID.mockRejectedValueOnce(new Error('denied'));

      const { status } = await get('/wallet/1/pk');
      expect(status).toBe(403);
    });
  });

  describe('GET /wallets', () => {
    test('lists all wallets with default flag', async () => {
      setItems([
        walletItem('0xA', 'Alice'),
        walletItem('0xB', 'Bob'),
      ]);
      setDefaultAddress('0xB');

      const { status, body } = await get('/wallets');
      expect(status).toBe(200);
      expect(body.wallets).toHaveLength(2);
      expect(body.wallets[0]).toEqual({ index: 1, name: 'Alice', address: '0xA', isDefault: false });
      expect(body.wallets[1]).toEqual({ index: 2, name: 'Bob', address: '0xB', isDefault: true });
    });

    test('never enumerates keychain secrets when the index exists', async () => {
      setItems([walletItem('0xA', 'Alice')]);

      await get('/wallets');
      await get('/wallet/1/address');

      // findCredentials reads every item's secret and triggers one macOS
      // ACL prompt per wallet — listing must be served from the index.
      expect(mockFindCredentials).not.toHaveBeenCalled();
      expect(mockGetPassword).not.toHaveBeenCalled();
    });
  });

  describe('GET /items', () => {
    test('lists items with plaintext fields and secret field NAMES only', async () => {
      setItems([
        walletItem('0xA', 'Alice'),
        apikeyItem('openai/prod', 'k1'),
      ]);

      const { status, body } = await get('/items');
      expect(status).toBe(200);
      expect(body.items).toHaveLength(2);
      expect(body.items[1]).toEqual({
        name: 'openai/prod',
        type: 'apikey',
        fields: { url: 'https://api.example.com' },
        secretFields: ['apikey', 'seckey'],
        updatedAt: 2,
      });
      // Listing must never decrypt anything.
      expect(mockGetPassword).not.toHaveBeenCalled();
      expect(mockPromptTouchID).not.toHaveBeenCalled();
    });
  });

  describe('GET /item', () => {
    test('returns 400 without name', async () => {
      const { status, body } = await get('/item');
      expect(status).toBe(400);
      expect(body.error).toMatch(/name/);
    });

    test('returns 404 for unknown item', async () => {
      const { status } = await get('/item?name=ghost');
      expect(status).toBe(404);
    });

    test('plaintext field is returned without TouchID', async () => {
      setItems([apikeyItem('openai/prod', 'k1')]);

      const { status, body } = await get('/item?name=' + encodeURIComponent('openai/prod') + '&field=url');
      expect(status).toBe(200);
      expect(body).toBe('https://api.example.com');
      expect(mockPromptTouchID).not.toHaveBeenCalled();
      expect(mockGetPassword).not.toHaveBeenCalled();
    });

    test('secret field prompts TouchID and returns plain text', async () => {
      setItems([apikeyItem('openai/prod', 'k1')]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({
        name: 'openai/prod',
        type: 'apikey',
        secrets: { apikey: 'sk-test-123', seckey: 'sec-456' },
      }));

      const { status, body } = await get('/item?name=' + encodeURIComponent('openai/prod') + '&field=apikey');
      expect(status).toBe(200);
      expect(body).toBe('sk-test-123');
      expect(mockPromptTouchID).toHaveBeenCalledWith(expect.stringContaining('openai/prod'));
      // New items live under the new keychain service, keyed by item id.
      expect(mockGetPassword).toHaveBeenCalledWith('secret-holder', 'k1');
    });

    test('unknown field returns 404', async () => {
      setItems([apikeyItem('openai/prod', 'k1')]);
      const { status } = await get('/item?name=' + encodeURIComponent('openai/prod') + '&field=nope');
      expect(status).toBe(404);
      expect(mockPromptTouchID).not.toHaveBeenCalled();
    });

    test('full item returns fields plus decrypted secrets after one TouchID', async () => {
      setItems([apikeyItem('openai/prod', 'k1')]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({
        name: 'openai/prod',
        type: 'apikey',
        secrets: { apikey: 'sk-test-123', seckey: 'sec-456' },
      }));

      const { status, body } = await get('/item?name=' + encodeURIComponent('openai/prod'));
      expect(status).toBe(200);
      expect(body).toEqual({
        name: 'openai/prod',
        type: 'apikey',
        fields: { url: 'https://api.example.com' },
        secrets: { apikey: 'sk-test-123', seckey: 'sec-456' },
      });
      expect(mockPromptTouchID).toHaveBeenCalledTimes(1);
    });

    test('legacy wallet secret is normalized to the new secrets shape', async () => {
      setItems([walletItem('0xA', 'Alice')]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ name: 'Alice', pk: '0xPK' }));

      const { status, body } = await get('/item?name=Alice&field=pk');
      expect(status).toBe(200);
      expect(body).toBe('0xPK');
    });

    test('TouchID denial returns 403', async () => {
      setItems([apikeyItem('openai/prod', 'k1')]);
      mockPromptTouchID.mockRejectedValueOnce(new Error('denied'));

      const { status } = await get('/item?name=' + encodeURIComponent('openai/prod') + '&field=apikey');
      expect(status).toBe(403);
    });
  });

  describe('error handling', () => {
    test('returns 404 for unknown endpoints', async () => {
      const { status } = await get('/unknown');
      expect(status).toBe(404);
    });
  });
});
