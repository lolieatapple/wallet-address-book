import axios from 'axios';

const API_URL = 'https://assets-manager-ui.vercel.app/api/assets/totalBalance';

export function createBalanceCache(expirationMs = 10 * 60 * 1000) {
  const cache = { data: {}, timestamps: {} };

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
      return res.data;
    } catch (error) {
      console.error('Error fetching balance:', error);
      if (cache.data[cacheKey]) {
        return cache.data[cacheKey];
      }
      return {};
    }
  };
}
