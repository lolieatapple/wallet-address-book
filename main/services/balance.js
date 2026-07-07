import axios from 'axios';

const API_URL = 'https://assets-manager-ui.vercel.app/api/assets/totalBalance';

// `store` is an optional electron-store (or compatible get/set) instance.
// Successful results are persisted so the last known balances survive app
// restarts; a failed fetch never overwrites them.
export function createBalanceCache(expirationMs = 10 * 60 * 1000, store = null) {
  const cache = { data: {}, timestamps: {} };

  if (store) {
    const persisted = store.get('cache');
    if (persisted) {
      for (const [key, entry] of Object.entries(persisted)) {
        cache.data[key] = entry.data;
        cache.timestamps[key] = entry.timestamp;
      }
    }
  }

  return async function fetchBalance(addresses) {
    const sortedAddresses = [...addresses].sort();
    const cacheKey = sortedAddresses.join(',');
    const now = Date.now();

    if (
      cache.data[cacheKey] &&
      cache.timestamps[cacheKey] &&
      now - cache.timestamps[cacheKey] < expirationMs
    ) {
      return cache.data[cacheKey];
    }

    try {
      const res = await axios.post(API_URL, { addresses });
      cache.data[cacheKey] = res.data;
      cache.timestamps[cacheKey] = now;
      if (store) {
        const persisted = store.get('cache') || {};
        persisted[cacheKey] = { data: res.data, timestamp: now };
        store.set('cache', persisted);
      }
      return res.data;
    } catch (error) {
      console.error('Error fetching balance:', error);
      // On failure, fall back to the last successful result (possibly
      // persisted from a previous run) instead of blanking the UI.
      if (cache.data[cacheKey]) {
        return cache.data[cacheKey];
      }
      return {};
    }
  };
}
