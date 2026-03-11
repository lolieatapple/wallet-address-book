import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublicIcon from '@mui/icons-material/Public';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import copy2Clipboard from 'copy-to-clipboard';
import { formatToDollar } from '../utils/format';
import { getPrivateKey, saveWallet, deleteWallet, promptInput } from '../services/wallet';

const { shell } = require('electron');

export default function WalletRow({ wallet, balance, index, onRefresh, onMessage, isDefault, onSetDefault }) {
  const theme = useTheme();
  const data = JSON.parse(wallet.password);
  const address = wallet.account;
  const displayBalance = balance ? formatToDollar(balance.total_usd_value) : 'error';

  const handleEditName = async () => {
    const name = await promptInput('Modify Name', 'Name', data.name);
    if (name) {
      await saveWallet(address, { ...data, name });
      onRefresh();
    }
  };

  const handleCopyAddress = () => {
    if (copy2Clipboard(address)) {
      onMessage('Address Copied');
    }
  };

  const handleCopyPrivateKey = async () => {
    const pk = await getPrivateKey(address);
    if (pk && copy2Clipboard(pk)) {
      onMessage('Private Key Copied');
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${data.name}?`)) {
      await deleteWallet(address);
      onRefresh();
    }
  };

  const handleOpenDebank = () => {
    shell.openExternal('https://debank.com/profile/' + address);
  };

  const rowBg = index % 2 === 0 ? alpha(theme.palette.primary.main, 0.05) : 'transparent';

  return (
    <TableRow
      sx={{
        backgroundColor: rowBg,
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        },
      }}
    >
      <TableCell sx={{ padding: '4px 8px 4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {index + 1}
          </Typography>
          <Tooltip title={isDefault ? 'Unset Default' : 'Set as Default'}>
            <IconButton
              size="small"
              onClick={() => onSetDefault(address)}
              sx={{ p: 0.25 }}
            >
              {isDefault ? (
                <StarIcon sx={{ fontSize: '1rem', color: 'warning.main' }} />
              ) : (
                <StarBorderIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>

      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight="medium">
            {data.name}
          </Typography>
          <IconButton size="small" onClick={handleEditName} sx={{ ml: 1 }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      </TableCell>

      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="body2"
            fontFamily="monospace"
            sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              whiteSpace: 'nowrap',
              fontSize: '0.75rem',
            }}
          >
            {address}
          </Typography>
          <Box sx={{ display: 'flex', ml: 1 }}>
            <Tooltip title="Copy Address">
              <IconButton size="small" onClick={handleCopyAddress}>
                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy Private Key">
              <IconButton size="small" onClick={handleCopyPrivateKey}>
                <VpnKeyIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Account">
              <IconButton size="small" onClick={handleDelete}>
                <DeleteOutlineIcon sx={{ fontSize: '0.875rem' }} color="error" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </TableCell>

      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={displayBalance}
            color={displayBalance === 'error' ? 'error' : 'success'}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
          <Tooltip title="Show In Debank">
            <IconButton size="small" onClick={handleOpenDebank} sx={{ ml: 1 }}>
              <PublicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
