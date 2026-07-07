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
} from '@mui/material';
import WalletRow from './WalletRow';
import { MONO_FONT } from '../theme';

const headCellSx = {
  fontFamily: MONO_FONT,
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'text.secondary',
  borderBottom: 2,
  borderColor: 'text.primary',
  padding: '10px 16px',
  bgcolor: 'background.paper',
};

export default function WalletTable({ wallets, balances, isLoading, onRefresh, onMessage, defaultAddress, onSetDefault }) {
  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h6">
          Your Wallets {wallets.length > 0 && `(${wallets.length})`}
        </Typography>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headCellSx, width: '5%' }}>#</TableCell>
              <TableCell sx={{ ...headCellSx, width: '18%' }}>Name</TableCell>
              <TableCell sx={{ ...headCellSx, width: '57%' }}>Address</TableCell>
              <TableCell sx={{ ...headCellSx, width: '20%' }}>Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.8rem', color: 'text.secondary' }}>
                    Loading wallets...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : wallets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.8rem', color: 'text.secondary' }}>
                    No wallets found. Create or import a wallet to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              wallets.map((w, i) => (
                <WalletRow
                  key={w.address}
                  wallet={w}
                  balance={balances[w.address]}
                  index={i}
                  onRefresh={onRefresh}
                  onMessage={onMessage}
                  isDefault={w.address === defaultAddress}
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
