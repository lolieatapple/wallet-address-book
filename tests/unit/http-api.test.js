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
const { setWalletList } = await import('../../main/services/wallet-index');

const TEST_SOCKET = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wab-api-test-')), 'api.sock');

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
    setWalletList([]);
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
      setDefaultAddress('0xAddr');
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xSecret', name: 'Test' }));

      const { status, body } = await get('/default/pk');
      expect(status).toBe(200);
      expect(body).toBe('0xSecret');
      expect(mockPromptTouchID).toHaveBeenCalled();
    });

    test('returns 404 when default wallet is missing from keychain', async () => {
      setDefaultAddress('0xDeleted');
      mockGetPassword.mockResolvedValueOnce(null);

      const { status, body } = await get('/default/pk');
      expect(status).toBe(404);
      expect(body.error).toMatch(/not found/);
    });

    test('returns 403 when TouchID denied', async () => {
      setDefaultAddress('0xAddr');
      mockPromptTouchID.mockRejectedValueOnce(new Error('User denied'));

      const { status, body } = await get('/default/pk');
      expect(status).toBe(403);
      expect(body.error).toMatch(/Authentication failed/);
    });
  });

  describe('GET /wallet/:address/pk', () => {
    test('returns private key by address after TouchID', async () => {
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xPK9', name: 'X' }));

      const { status, body } = await get(`/wallet/${VALID_ADDR}/pk`);
      expect(status).toBe(200);
      expect(body.address).toBe(VALID_ADDR);
      expect(body.privateKey).toBe('0xPK9');
      expect(mockPromptTouchID).toHaveBeenCalledWith(expect.stringContaining(VALID_ADDR));
    });

    test('returns 404 for unknown address', async () => {
      mockGetPassword.mockResolvedValueOnce(null);
      const { status } = await get(`/wallet/${VALID_ADDR}/pk`);
      expect(status).toBe(404);
    });
  });

  describe('GET /wallet/:index/address', () => {
    test('returns address by index', async () => {
      setWalletList([
        { address: '0xFirst', name: 'A' },
        { address: '0xSecond', name: 'B' },
      ]);

      const { status, body } = await get('/wallet/2/address');
      expect(status).toBe(200);
      expect(body.index).toBe(2);
      expect(body.address).toBe('0xSecond');
    });

    test('returns 404 for out-of-range index', async () => {
      const { status } = await get('/wallet/1/address');
      expect(status).toBe(404);
    });

    test('returns 404 for index 0', async () => {
      setWalletList([{ address: '0xFirst', name: 'A' }]);
      const { status } = await get('/wallet/0/address');
      expect(status).toBe(404);
    });
  });

  describe('GET /wallet/:index/pk', () => {
    test('returns private key by index after TouchID, prompt includes address', async () => {
      setWalletList([{ address: '0xAddr1', name: 'A' }]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xPK1', name: 'A' }));

      const { status, body } = await get('/wallet/1/pk');
      expect(status).toBe(200);
      expect(body.address).toBe('0xAddr1');
      expect(body.privateKey).toBe('0xPK1');
      expect(mockPromptTouchID).toHaveBeenCalledWith(expect.stringContaining('0xAddr1'));
    });

    test('returns 403 when TouchID denied', async () => {
      setWalletList([{ address: '0xAddr1', name: 'A' }]);
      mockPromptTouchID.mockRejectedValueOnce(new Error('denied'));

      const { status } = await get('/wallet/1/pk');
      expect(status).toBe(403);
    });
  });

  describe('GET /wallets', () => {
    test('lists all wallets with default flag', async () => {
      setWalletList([
        { address: '0xA', name: 'Alice' },
        { address: '0xB', name: 'Bob' },
      ]);
      setDefaultAddress('0xB');

      const { status, body } = await get('/wallets');
      expect(status).toBe(200);
      expect(body.wallets).toHaveLength(2);
      expect(body.wallets[0]).toEqual({ index: 1, name: 'Alice', address: '0xA', isDefault: false });
      expect(body.wallets[1]).toEqual({ index: 2, name: 'Bob', address: '0xB', isDefault: true });
    });

    test('never enumerates keychain secrets when the index exists', async () => {
      setWalletList([{ address: '0xA', name: 'Alice' }]);

      await get('/wallets');
      await get('/wallet/1/address');

      // findCredentials reads every item's secret and triggers one macOS
      // ACL prompt per wallet — listing must be served from the index.
      expect(mockFindCredentials).not.toHaveBeenCalled();
      expect(mockGetPassword).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('returns 404 for unknown endpoints', async () => {
      const { status } = await get('/unknown');
      expect(status).toBe(404);
    });
  });
});
