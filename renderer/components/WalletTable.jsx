import React, { useMemo, useState } from 'react';
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
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WalletRow from './WalletRow';
import { formatToDollar } from '../utils/format';
import { groupItems } from '../utils/itemTypes';
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

export default function WalletTable({
  wallets,
  balances,
  isLoading,
  onRefresh,
  onMessage,
  defaultAddress,
  onSetDefault,
  onOpenDetail,
}) {
  const [sortBy, setSortBy] = useState('default');
  const [hideZero, setHideZero] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());

  // null balance (fetch error / not loaded) must not be treated as zero —
  // hiding wallets on a failed fetch would look like data loss.
  const balanceOf = (address) => {
    const b = balances[address];
    if (!b || b.total_usd_value === undefined) return null;
    return Number(b.total_usd_value);
  };

  const { groups, total, hiddenCount } = useMemo(() => {
    let visible = wallets;
    let hidden = 0;
    if (hideZero) {
      visible = wallets.filter((w) => balanceOf(w.address) !== 0);
      hidden = wallets.length - visible.length;
    }
    const sorted = [...visible];
    if (sortBy === 'balance') {
      sorted.sort((a, b) => (balanceOf(b.address) ?? -1) - (balanceOf(a.address) ?? -1));
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    const sum = wallets.reduce((acc, w) => acc + (balanceOf(w.address) ?? 0), 0);
    return { groups: groupItems(sorted), total: sum, hiddenCount: hidden };
  }, [wallets, balances, sortBy, hideZero]);

  const toggleGroup = (group) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const groupSubtotal = (items) =>
    items.reduce((acc, w) => acc + (balanceOf(w.address) ?? 0), 0);

  let rowIndex = 0;

  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6">
          Wallets {wallets.length > 0 && `(${wallets.length})`}
        </Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.78rem', fontWeight: 700 }}>
          Total: {formatToDollar(total)}
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={sortBy}
            onChange={(e, v) => v && setSortBy(v)}
            sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1, fontSize: '0.62rem', letterSpacing: '0.08em' } }}
          >
            <ToggleButton value="default">Default</ToggleButton>
            <ToggleButton value="balance">Balance</ToggleButton>
            <ToggleButton value="name">Name</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={<Checkbox size="small" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />}
            label={
              <Typography sx={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                {`Hide zero${hiddenCount > 0 ? ` (${hiddenCount})` : ''}`}
              </Typography>
            }
          />
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
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
              groups.map(({ group, items }) => (
                <React.Fragment key={group ?? '__ungrouped__'}>
                  {group !== null && (
                    <TableRow
                      hover
                      onClick={() => toggleGroup(group)}
                      sx={{ cursor: 'pointer', '& td': { borderBottom: 1, borderColor: 'divider' } }}
                    >
                      <TableCell colSpan={3} sx={{ py: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {collapsed.has(group)
                            ? <ChevronRightIcon sx={{ fontSize: '1rem' }} />
                            : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                          <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                            {group}/ ({items.length})
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.72rem', color: 'text.secondary' }}>
                          {formatToDollar(groupSubtotal(items))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {(group === null || !collapsed.has(group)) &&
                    items.map((w) => (
                      <WalletRow
                        key={w.address}
                        wallet={w}
                        balance={balances[w.address]}
                        index={rowIndex++}
                        onRefresh={onRefresh}
                        onMessage={onMessage}
                        isDefault={w.address === defaultAddress}
                        onSetDefault={onSetDefault}
                        onOpenDetail={onOpenDetail}
                      />
                    ))}
                  {group !== null && collapsed.has(group) && (() => { rowIndex += items.length; return null; })()}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
