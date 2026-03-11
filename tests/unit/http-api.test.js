import { test, expect, describe, mock, beforeEach, afterAll } from 'bun:test';
import http from 'http';

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

const { startHttpApi, getDefaultAddress, setDefaultAddress } = await import(
  '../../main/services/http-api'
);

const BASE = 'http://127.0.0.1:63333';

// Use Node http.get to bypass happy-dom's CORS-enforcing fetch
function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    }).on('error', reject);
  });
}

describe('HTTP API', () => {
  startHttpApi();

  beforeEach(() => {
    mockPromptTouchID.mockReset();
    mockGetPassword.mockReset();
    mockFindCredentials.mockReset();
    mockPromptTouchID.mockResolvedValue();
    setDefaultAddress(null);
  });

  describe('GET /default/address', () => {
    test('returns 404 when no default set', async () => {
      const { status, body } = await get('/default/address');
      expect(status).toBe(404);
      expect(body.error).toMatch(/No default/);
    });

    test('returns address when default is set', async () => {
      setDefaultAddress('0xDefaultAddr');
      const { status, body } = await get('/default/address');
      expect(status).toBe(200);
      expect(body.address).toBe('0xDefaultAddr');
    });
  });

  describe('GET /default/pk', () => {
    test('returns 404 when no default set', async () => {
      const { status } = await get('/default/pk');
      expect(status).toBe(404);
    });

    test('returns private key after TouchID', async () => {
      setDefaultAddress('0xAddr');
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xSecret', name: 'Test' }));

      const { status, body } = await get('/default/pk');
      expect(status).toBe(200);
      expect(body.address).toBe('0xAddr');
      expect(body.privateKey).toBe('0xSecret');
      expect(mockPromptTouchID).toHaveBeenCalled();
    });

    test('returns 403 when TouchID denied', async () => {
      setDefaultAddress('0xAddr');
      mockPromptTouchID.mockRejectedValueOnce(new Error('User denied'));

      const { status, body } = await get('/default/pk');
      expect(status).toBe(403);
      expect(body.error).toMatch(/Authentication failed/);
    });
  });

  describe('GET /wallet/:index/address', () => {
    test('returns address by index', async () => {
      mockFindCredentials.mockResolvedValueOnce([
        { account: '0xFirst', password: '{"name":"A","pk":"0x1"}' },
        { account: '0xSecond', password: '{"name":"B","pk":"0x2"}' },
      ]);

      const { status, body } = await get('/wallet/2/address');
      expect(status).toBe(200);
      expect(body.index).toBe(2);
      expect(body.address).toBe('0xSecond');
    });

    test('returns 404 for out-of-range index', async () => {
      mockFindCredentials.mockResolvedValueOnce([]);
      const { status } = await get('/wallet/1/address');
      expect(status).toBe(404);
    });

    test('returns 404 for index 0', async () => {
      mockFindCredentials.mockResolvedValueOnce([
        { account: '0xFirst', password: '{}' },
      ]);
      const { status } = await get('/wallet/0/address');
      expect(status).toBe(404);
    });
  });

  describe('GET /wallet/:index/pk', () => {
    test('returns private key by index after TouchID', async () => {
      mockFindCredentials.mockResolvedValueOnce([
        { account: '0xAddr1', password: '{"name":"A","pk":"0x1"}' },
      ]);
      mockGetPassword.mockResolvedValueOnce(JSON.stringify({ pk: '0xPK1', name: 'A' }));

      const { status, body } = await get('/wallet/1/pk');
      expect(status).toBe(200);
      expect(body.address).toBe('0xAddr1');
      expect(body.privateKey).toBe('0xPK1');
      expect(mockPromptTouchID).toHaveBeenCalled();
    });

    test('returns 403 when TouchID denied', async () => {
      mockFindCredentials.mockResolvedValueOnce([
        { account: '0xAddr1', password: '{}' },
      ]);
      mockPromptTouchID.mockRejectedValueOnce(new Error('denied'));

      const { status } = await get('/wallet/1/pk');
      expect(status).toBe(403);
    });
  });

  describe('GET /wallets', () => {
    test('lists all wallets with default flag', async () => {
      mockFindCredentials.mockResolvedValueOnce([
        { account: '0xA', password: '{"name":"Alice","pk":"0x1"}' },
        { account: '0xB', password: '{"name":"Bob","pk":"0x2"}' },
      ]);
      setDefaultAddress('0xB');

      const { status, body } = await get('/wallets');
      expect(status).toBe(200);
      expect(body.wallets).toHaveLength(2);
      expect(body.wallets[0]).toEqual({ index: 1, name: 'Alice', address: '0xA', isDefault: false });
      expect(body.wallets[1]).toEqual({ index: 2, name: 'Bob', address: '0xB', isDefault: true });
    });
  });

  describe('error handling', () => {
    test('returns 404 for unknown endpoints', async () => {
      const { status } = await get('/unknown');
      expect(status).toBe(404);
    });
  });
});
