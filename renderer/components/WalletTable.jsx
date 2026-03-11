import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  useTheme,
  alpha,
} from '@mui/material';
import WalletRow from './WalletRow';

export default function WalletTable({ wallets, balances, isLoading, onRefresh, onMessage, defaultAddress, onSetDefault }) {
  const theme = useTheme();

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        background: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(10px)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" fontWeight="medium">
          Your Wallets {wallets.length > 0 && `(${wallets.length})`}
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '5%', padding: '8px 16px' }}>
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '18%', padding: '8px 16px' }}>
                Name
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '57%', padding: '8px 16px' }}>
                Address
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '20%', padding: '8px 16px' }}>
                Balance
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography>Loading wallets...</Typography>
                </TableCell>
              </TableRow>
            ) : wallets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography>No wallets found. Create or import a wallet to get started.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              wallets.map((w, i) => (
                <WalletRow
                  key={w.account}
                  wallet={w}
                  balance={balances[w.account]}
                  index={i}
                  onRefresh={onRefresh}
                  onMessage={onMessage}
                  isDefault={w.account === defaultAddress}
                  onSetDefault={onSetDefault}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
