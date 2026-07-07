import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Box, Container, GlobalStyles } from '@mui/material';
import WalletToolbar from '../components/WalletToolbar';
import WalletTable from '../components/WalletTable';
import { MessageBox } from '../components/message';
import { useWallets } from '../hooks/useWallets';
import { restoreNames, onRestoreNamesRequested } from '../services/wallet';
import { ACCENT } from '../theme';

export default function Home() {
  const { wallets, balances, isLoading, refresh, defaultAddress, setDefault } = useWallets();
  const [successInfo, setSuccessInfo] = useState('');
  const [filter, setFilter] = useState('');

  // App-menu command (Wallet → Restore Names from Keychain): bulk-restores
  // migrated placeholder names. One keychain ACL dialog per un-restored
  // wallet; answering "Always Allow" permanently silences that wallet.
  useEffect(() => {
    return onRestoreNamesRequested(async () => {
      try {
        const { pending, restored } = await restoreNames();
        refresh();
        setSuccessInfo(pending === 0
          ? 'No wallet names need restoring'
          : `Restored ${restored} of ${pending} wallet names`);
      } catch (error) {
        // A denied prompt aborts the run but already-restored names are kept.
        refresh();
        setSuccessInfo('Error restoring names: ' + error.message);
      }
    });
  }, [refresh]);

  const filteredWallets = useMemo(() => {
    if (!filter) return wallets;
    const q = filter.toLowerCase();
    return wallets.filter((w) => {
      const name = w.name || '';
      return name.toLowerCase().includes(q) || w.address.toLowerCase().includes(q);
    });
  }, [wallets, filter]);

  return (
    <>
      <Head>
        <title>Wallet Address Book</title>
      </Head>

      <GlobalStyles styles={{ body: { overflow: 'hidden' } }} />

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          // The single colored element of the chrome: a thin amber signal
          // line across the top of the window.
          borderTop: `3px solid ${ACCENT}`,
          pt: 3,
          pb: 6,
        }}
      >
        <Container maxWidth="lg">
          <WalletToolbar
            filter={filter}
            onFilterChange={setFilter}
            onRefresh={refresh}
            onMessage={setSuccessInfo}
          />
          <WalletTable
            wallets={filteredWallets}
            balances={balances}
            isLoading={isLoading}
            onRefresh={refresh}
            onMessage={setSuccessInfo}
            defaultAddress={defaultAddress}
            onSetDefault={setDefault}
          />
        </Container>
      </Box>

      <MessageBox successInfo={successInfo} setSuccessInfo={setSuccessInfo} />
    </>
  );
}
