import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import PublicIcon from '@mui/icons-material/Public';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import copy2Clipboard from 'copy-to-clipboard';
import { TYPE_META } from '../utils/itemTypes';
import { getItemSecrets, deleteItem, updateItem, copySecretText } from '../services/items';
import { promptInput, openExternal } from '../services/wallet';
import { formatToDollar } from '../utils/format';
import { MONO_FONT, ACCENT } from '../theme';

const labelSx = {
  fontFamily: MONO_FONT,
  fontSize: '0.62rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'text.secondary',
  mb: 0.5,
};

const valueSx = {
  fontFamily: MONO_FONT,
  fontSize: '0.78rem',
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap', // multiline notes keep their line breaks
};

export default function ItemDrawer({
  item,
  balance,
  isDefault,
  onSetDefault,
  onClose,
  onRefresh,
  onMessage,
  onEdit,
}) {
  // Revealed secret values live only in this component's state and are
  // dropped as soon as the drawer closes or the item changes.
  const [secrets, setSecrets] = useState(null);

  useEffect(() => {
    setSecrets(null);
  }, [item?.id]);

  if (!item) return null;

  const isWallet = item.type === 'wallet';
  const address = isWallet ? item.fields.address : null;

  const loadSecrets = async () => {
    const values = await getItemSecrets(item.id);
    if (!values) {
      throw new Error('Secrets not found in keychain');
    }
    return values;
  };

  const handleReveal = async () => {
    if (secrets) {
      setSecrets(null);
      return;
    }
    try {
      setSecrets(await loadSecrets());
    } catch (error) {
      onMessage('Error reading secrets: ' + error.message);
    }
  };

  const handleCopySecret = async (fieldKey) => {
    try {
      const values = secrets || await loadSecrets();
      if (values[fieldKey] === undefined) {
        onMessage(`Secret "${fieldKey}" not found in keychain`);
        return;
      }
      await copySecretText(String(values[fieldKey]));
      onMessage(`"${fieldKey}" copied`);
    } catch (error) {
      onMessage('Error reading secret: ' + error.message);
    }
  };

  const handleCopyPlain = (value) => {
    if (copy2Clipboard(String(value))) {
      onMessage('Copied');
    }
  };

  const handleRename = async () => {
    try {
      const name = await promptInput('Rename Item', 'Name', item.name);
      if (name && name !== item.name) {
        await updateItem({ id: item.id, name });
        onRefresh();
        onMessage('Renamed');
      }
    } catch (error) {
      onMessage('Error renaming: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await deleteItem(item.id);
      onClose();
      onRefresh();
      onMessage('Deleted');
    } catch (error) {
      onMessage('Error deleting: ' + error.message);
    }
  };

  // Editing secret values needs the current ones first (one TouchID), so
  // the edit dialog can show a complete, re-saveable picture. Wallet edits
  // only touch name/notes in the index — no secrets load, no TouchID.
  const handleEdit = async () => {
    try {
      const values = !isWallet && item.secretFields.length > 0 ? await loadSecrets() : {};
      onEdit(item, values);
    } catch (error) {
      onMessage('Error loading secrets for edit: ' + error.message);
    }
  };

  return (
    <Drawer anchor="right" open onClose={onClose}>
      <Box sx={{ width: 420, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isWallet && (
            <Tooltip title={isDefault ? 'Unset Default' : 'Set as Default'}>
              <IconButton size="small" onClick={() => onSetDefault(address)}>
                {isDefault
                  ? <StarIcon sx={{ fontSize: '1.1rem', color: ACCENT }} />
                  : <StarBorderIcon sx={{ fontSize: '1.1rem', color: 'text.disabled' }} />}
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" sx={{ textTransform: 'none', letterSpacing: '0.02em', fontSize: '1rem', wordBreak: 'break-all' }}>
            {item.name}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={TYPE_META[item.type]?.singular || item.type}
            sx={{ borderRadius: 0, height: 20, fontSize: '0.62rem', fontFamily: MONO_FONT }}
          />
          <IconButton size="small" onClick={onClose} sx={{ ml: 'auto' }} aria-label="close detail">
            <CloseIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Plaintext fields */}
          {Object.entries(item.fields || {}).map(([key, value]) => (
            <Box key={key}>
              <Typography sx={labelSx}>{key}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={valueSx}>{String(value)}</Typography>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => handleCopyPlain(value)}>
                    <ContentCopyIcon sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}

          {/* Wallet balance */}
          {isWallet && (
            <Box>
              <Typography sx={labelSx}>Balance</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ ...valueSx, fontWeight: 700 }}>
                  {balance ? formatToDollar(balance.total_usd_value) : '—'}
                </Typography>
                <Tooltip title="Show In Debank">
                  <IconButton size="small" onClick={() => openExternal('https://debank.com/profile/' + address)}>
                    <PublicIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          {/* Secret fields */}
          {item.secretFields.map((fieldKey) => (
            <Box key={fieldKey}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ ...labelSx, mb: 0 }}>{fieldKey}</Typography>
                <LockOutlinedIcon sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.58rem', color: 'text.secondary', letterSpacing: '0.08em' }}>
                  TOUCHID
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Typography sx={valueSx}>
                  {secrets && secrets[fieldKey] !== undefined ? String(secrets[fieldKey]) : '••••••••••••'}
                </Typography>
                <Tooltip title={`Copy "${fieldKey}"`}>
                  <IconButton size="small" onClick={() => handleCopySecret(fieldKey)} aria-label={`copy ${fieldKey}`}>
                    <ContentCopyIcon sx={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}

          {item.secretFields.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={secrets ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
              onClick={handleReveal}
              sx={{ alignSelf: 'flex-start' }}
            >
              {secrets ? 'Hide Secrets' : 'Reveal Secrets'}
            </Button>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.62rem', color: 'text.secondary', mb: 1.5 }}>
          {item.createdAt ? `Created ${new Date(item.createdAt).toLocaleDateString()}` : ''}
          {item.updatedAt ? ` · Updated ${new Date(item.updatedAt).toLocaleDateString()}` : ''}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={handleRename}>
            Rename
          </Button>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleDelete}
            sx={{ ml: 'auto', borderColor: 'error.main' }}
          >
            Delete
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
