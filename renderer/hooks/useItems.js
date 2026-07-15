import { useEffect, useState, useCallback, useMemo } from 'react';
import { listItems } from '../services/items';
import { fetchBalances, getDefaultWallet, setDefaultWallet as setDefaultWalletIpc } from '../services/wallet';
import { CATEGORY_ORDER } from '../utils/itemTypes';

export function useItems() {
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [defaultAddress, setDefaultAddress] = useState(null);

  const refresh = useCallback(() => setRefreshKey(Date.now()), []);

  const setDefault = useCallback(async (address) => {
    // Toggle: if already default, unset it
    const newDefault = address === defaultAddress ? null : address;
    await setDefaultWalletIpc(newDefault);
    setDefaultAddress(newDefault);
  }, [defaultAddress]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [allItems, currentDefault] = await Promise.all([
          listItems(),
          getDefaultWallet(),
        ]);
        if (cancelled) return;

        const addresses = allItems
          .filter((it) => it.type === 'wallet')
          .map((it) => it.fields.address);
        const balanceData = addresses.length > 0 ? await fetchBalances(addresses) : {};
        if (cancelled) return;

        setItems(allItems);
        setBalances(balanceData || {});
        setDefaultAddress(currentDefault);
      } catch (err) {
        console.error('Failed to load items:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    for (const type of CATEGORY_ORDER) c[type] = 0;
    for (const it of items) c[it.type] = (c[it.type] || 0) + 1;
    return c;
  }, [items]);

  return { items, counts, balances, isLoading, refresh, defaultAddress, setDefault };
}
