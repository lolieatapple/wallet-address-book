import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import { Box, Container, GlobalStyles, useTheme, alpha } from '@mui/material';
import WalletToolbar from '../components/WalletToolbar';
import WalletTable from '../components/WalletTable';
import { MessageBox } from '../components/message';
import { useWallets } from '../hooks/useWallets';

export default function Home() {
  const theme = useTheme();
  const { wallets, balances, isLoading, refresh, defaultAddress, setDefault } = useWallets();
  const [successInfo, setSuccessInfo] = useState('');
  const [filter, setFilter] = useState('');

  const filteredWallets = useMemo(() => {
    if (!filter) return wallets;
    const q = filter.toLowerCase();
    return wallets.filter((w) => {
      const name = JSON.parse(w.password).name || '';
      return name.toLowerCase().includes(q) || w.account.toLowerCase().includes(q);
    });
  }, [wallets, filter]);

  const bgGradient =
    theme.palette.mode === 'dark'
      ? `linear-gradient(145deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(theme.palette.primary.dark, 0.2)} 100%)`
      : `linear-gradient(145deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(theme.palette.primary.light, 0.2)} 100%)`;

  return (
    <>
      <Head>
        <title>Wallet Address Book</title>
      </Head>

      <GlobalStyles styles={{ body: { overflow: 'hidden' } }} />

      <Box sx={{ minHeight: '100vh', background: bgGradient, pt: 3, pb: 6 }}>
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
