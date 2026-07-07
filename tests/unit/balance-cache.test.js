import { test, expect, describe, mock, beforeEach } from 'bun:test';

// Mock axios before importing balance module
const mockPost = mock(() => Promise.resolve({ data: {} }));

mock.module('axios', () => ({
  __esModule: true,
  default: { post: (...args) => mockPost(...args) },
}));

const { createBalanceCache } = await import('../../main/services/balance');

describe('createBalanceCache', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: {} });
  });

  test('fetches from API on first call', async () => {
    const balanceData = { '0xabc': { total_usd_value: 100 } };
    mockPost.mockResolvedValueOnce({ data: balanceData });

    const fetchBalance = createBalanceCache();
    const result = await fetchBalance(['0xabc']);

    expect(result).toEqual(balanceData);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('returns cached data on second call within expiration', async () => {
    const balanceData = { '0xabc': { total_usd_value: 100 } };
    mockPost.mockResolvedValueOnce({ data: balanceData });

    const fetchBalance = createBalanceCache(60000);
    await fetchBalance(['0xabc']);
    const result = await fetchBalance(['0xabc']);

    expect(result).toEqual(balanceData);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('same addresses in different order hit same cache', async () => {
    const balanceData = { '0xa': { total_usd_value: 50 }, '0xb': { total_usd_value: 200 } };
    mockPost.mockResolvedValueOnce({ data: balanceData });

    const fetchBalance = createBalanceCache(60000);
    await fetchBalance(['0xb', '0xa']);
    const result = await fetchBalance(['0xa', '0xb']);

    expect(result).toEqual(balanceData);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  test('re-fetches after cache expiration', async () => {
    const data1 = { '0xa': { total_usd_value: 100 } };
    const data2 = { '0xa': { total_usd_value: 200 } };
    mockPost.mockResolvedValueOnce({ data: data1 });
    mockPost.mockResolvedValueOnce({ data: data2 });

    const fetchBalance = createBalanceCache(1); // 1ms cache
    await fetchBalance(['0xa']);
    await new Promise((r) => setTimeout(r, 5));

    const result = await fetchBalance(['0xa']);
    expect(result).toEqual(data2);
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  test('returns stale cache on API error', async () => {
    const data = { '0xa': { total_usd_value: 100 } };
    mockPost.mockResolvedValueOnce({ data });
    mockPost.mockRejectedValueOnce(new Error('network error'));

    const fetchBalance = createBalanceCache(1); // 1ms
    await fetchBalance(['0xa']);
    await new Promise((r) => setTimeout(r, 5));

    const result = await fetchBalance(['0xa']);
    expect(result).toEqual(data);
  });

  test('returns empty object on API error with no cache', async () => {
    mockPost.mockRejectedValueOnce(new Error('network error'));

    const fetchBalance = createBalanceCache();
    const result = await fetchBalance(['0xnew']);
    expect(result).toEqual({});
  });

  describe('persistence via injected store', () => {
    function makeFakeStore(initial = {}) {
      const data = { ...initial };
      return {
        get: (key) => data[key],
        set: (key, val) => { data[key] = val; },
        _data: data,
      };
    }

    test('persists successful results to the store', async () => {
      const balanceData = { '0xa': { total_usd_value: 100 } };
      mockPost.mockResolvedValueOnce({ data: balanceData });
      const store = makeFakeStore();

      const fetchBalance = createBalanceCache(60000, store);
      await fetchBalance(['0xa']);

      expect(store._data.cache['0xa'].data).toEqual(balanceData);
      expect(store._data.cache['0xa'].timestamp).toBeGreaterThan(0);
    });

    test('serves persisted data from a previous run when API fails', async () => {
      const previousRun = { '0xa': { total_usd_value: 123 } };
      const store = makeFakeStore({
        cache: { '0xa': { data: previousRun, timestamp: 1 } }, // long expired
      });
      mockPost.mockRejectedValueOnce(new Error('network error'));

      const fetchBalance = createBalanceCache(60000, store);
      const result = await fetchBalance(['0xa']);

      expect(result).toEqual(previousRun);
      expect(mockPost).toHaveBeenCalledTimes(1); // it did try to refresh first
    });

    test('failed fetch does not overwrite persisted data', async () => {
      const previousRun = { '0xa': { total_usd_value: 123 } };
      const store = makeFakeStore({
        cache: { '0xa': { data: previousRun, timestamp: 1 } },
      });
      mockPost.mockRejectedValueOnce(new Error('network error'));

      const fetchBalance = createBalanceCache(60000, store);
      await fetchBalance(['0xa']);

      expect(store._data.cache['0xa'].data).toEqual(previousRun);
    });

    test('fresh persisted data is served without hitting the API', async () => {
      const previousRun = { '0xa': { total_usd_value: 55 } };
      const store = makeFakeStore({
        cache: { '0xa': { data: previousRun, timestamp: Date.now() } },
      });

      const fetchBalance = createBalanceCache(60000, store);
      const result = await fetchBalance(['0xa']);

      expect(result).toEqual(previousRun);
      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});
