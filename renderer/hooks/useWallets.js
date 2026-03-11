import { useEffect, useState, useCallback } from 'react';
import { getAllWallets, fetchBalances, getDefaultWallet, setDefaultWallet as setDefaultWalletIpc } from '../services/wallet';

export function useWallets() {
  const [wallets, setWallets] = useState([]);
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
        const [allWallets, currentDefault] = await Promise.all([
          getAllWallets(),
          getDefaultWallet(),
        ]);
        if (cancelled) return;

        const addresses = allWallets.map((w) => w.account);
        const balanceData = await fetchBalances(addresses);
        if (cancelled) return;

        setWallets(allWallets);
        setBalances(balanceData || {});
        setDefaultAddress(currentDefault);
      } catch (err) {
        console.error('Failed to load wallets:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { wallets, balances, isLoading, refresh, defaultAddress, setDefault };
}
