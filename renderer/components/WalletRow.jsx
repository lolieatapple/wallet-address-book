import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  IconButton,
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
import { getPrivateKey, saveWallet, deleteWallet, promptInput, openExternal } from '../services/wallet';
import { MONO_FONT, ACCENT } from '../theme';

export default function WalletRow({ wallet, balance, index, onRefresh, onMessage, isDefault, onSetDefault }) {
  const theme = useTheme();
  const data = JSON.parse(wallet.password);
  const address = wallet.account;
  const displayBalance = balance ? formatToDollar(balance.total_usd_value) : 'error';

  const handleEditName = async () => {
    try {
      const name = await promptInput('Modify Name', 'Name', data.name);
      if (name) {
        await saveWallet(address, { ...data, name });
        onRefresh();
      }
    } catch (error) {
      onMessage('Error renaming wallet: ' + error.message);
    }
  };

  const handleCopyAddress = () => {
    if (copy2Clipboard(address)) {
      onMessage('Address Copied');
    }
  };

  const handleCopyPrivateKey = async () => {
    try {
      const pk = await getPrivateKey(address);
      if (pk && copy2Clipboard(pk)) {
        onMessage('Private Key Copied');
      }
    } catch (error) {
      onMessage('Error reading private key: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${data.name}?`)) {
      try {
        await deleteWallet(address);
        onRefresh();
      } catch (error) {
        onMessage('Error deleting wallet: ' + error.message);
      }
    }
  };

  const handleOpenDebank = () => {
    openExternal('https://debank.com/profile/' + address);
  };

  const iconSx = { fontSize: '0.9rem', color: 'text.secondary' };

  return (
    <TableRow
      sx={{
        '& td': { borderBottom: 1, borderColor: 'divider' },
        '&:hover': {
          backgroundColor: alpha(theme.palette.text.primary, 0.04),
        },
      }}
    >
      <TableCell sx={{ padding: '4px 8px 4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.72rem', color: 'text.secondary' }}>
            {String(index + 1).padStart(2, '0')}
          </Typography>
          <Tooltip title={isDefault ? 'Unset Default' : 'Set as Default'}>
            <IconButton
              size="small"
              onClick={() => onSetDefault(address)}
              sx={{ p: 0.25 }}
            >
              {isDefault ? (
                <StarIcon sx={{ fontSize: '1rem', color: ACCENT }} />
              ) : (
                <StarBorderIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>

      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight={600} sx={{ letterSpacing: '0.01em' }}>
            {data.name}
          </Typography>
          <IconButton size="small" onClick={handleEditName} sx={{ ml: 1 }}>
            <EditIcon sx={iconSx} />
          </IconButton>
        </Box>
      </TableCell>

      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              color: 'text.primary',
            }}
          >
            {address}
          </Typography>
          <Box sx={{ display: 'flex', ml: 1 }}>
            <Tooltip title="Copy Address">
              <IconButton size="small" onClick={handleCopyAddress}>
                <ContentCopyIcon sx={iconSx} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy Private Key">
              <IconButton size="small" onClick={handleCopyPrivateKey}>
                <VpnKeyIcon sx={iconSx} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Account">
              <IconButton size="small" onClick={handleDelete}>
                <DeleteOutlineIcon sx={{ fontSize: '0.9rem' }} color="error" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </TableCell>

      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: displayBalance === 'error' ? 'error.main' : 'text.primary',
            }}
          >
            {displayBalance}
          </Typography>
          <Tooltip title="Show In Debank">
            <IconButton size="small" onClick={handleOpenDebank} sx={{ ml: 1 }}>
              <PublicIcon sx={iconSx} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
