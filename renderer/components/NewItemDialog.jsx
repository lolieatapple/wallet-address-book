import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { ethers } from 'ethers';
import { TYPE_META, CATEGORY_ORDER } from '../utils/itemTypes';
import { createItem, updateItem } from '../services/items';
import { saveWallet } from '../services/wallet';
import { MONO_FONT } from '../theme';

const fieldInputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 0, fontFamily: MONO_FONT, fontSize: '0.82rem' },
};

function defaultWalletName() {
  return 'Account_' + new Date().toISOString().split('.')[0];
}

// editItem/editSecrets: when set, the dialog edits an existing (non-wallet)
// item — type is locked and secret values arrive pre-decrypted from the
// drawer's TouchID-gated load.
export default function NewItemDialog({ open, onClose, onRefresh, onMessage, initialType, editItem, editSecrets }) {
  const isEdit = !!editItem;
  const [type, setType] = useState('wallet');
  const [name, setName] = useState('');
  const [values, setValues] = useState({});       // template types: key -> value
  const [customRows, setCustomRows] = useState([]); // custom: [{key, value, secret}]
  const [walletPk, setWalletPk] = useState('');   // empty -> generate random
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setType(editItem.type);
      setName(editItem.name);
      if (editItem.type === 'custom') {
        setCustomRows([
          ...Object.entries(editItem.fields || {}).map(([key, value]) => ({ key, value: String(value), secret: false })),
          ...editItem.secretFields.map((key) => ({ key, value: String(editSecrets?.[key] ?? ''), secret: true })),
        ]);
      } else {
        setValues({ ...(editItem.fields || {}), ...(editSecrets || {}) });
      }
    } else {
      setType(initialType && initialType !== 'all' ? initialType : 'wallet');
      setName('');
      setValues({});
      setCustomRows([{ key: '', value: '', secret: true }]);
      setWalletPk('');
    }
  }, [open, isEdit, editItem, editSecrets, initialType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type === 'wallet') {
        const wallet = walletPk.trim()
          ? new ethers.Wallet(walletPk.trim())
          : ethers.Wallet.createRandom();
        const walletName = name.trim() || defaultWalletName();
        await saveWallet(wallet.address, { name: walletName, pk: wallet.privateKey });
        onMessage(walletPk.trim() ? 'Wallet imported successfully!' : 'New wallet created successfully!');
      } else {
        if (!name.trim()) throw new Error('Name is required');
        let fields = {};
        let secrets = {};
        let secretFields = [];
        if (type === 'custom') {
          for (const row of customRows) {
            const key = row.key.trim();
            if (!key) continue;
            if (row.secret) {
              secrets[key] = row.value;
              secretFields.push(key);
            } else {
              fields[key] = row.value;
            }
          }
          if (Object.keys(fields).length + secretFields.length === 0) {
            throw new Error('At least one field is required');
          }
        } else {
          for (const tpl of TYPE_META[type].fields) {
            const value = (values[tpl.key] || '').trim();
            if (!value) {
              if (tpl.required) throw new Error(`"${tpl.label}" is required`);
              continue;
            }
            if (tpl.secret) {
              secrets[tpl.key] = value;
              secretFields.push(tpl.key);
            } else {
              fields[tpl.key] = value;
            }
          }
        }
        if (isEdit) {
          await updateItem({
            id: editItem.id,
            name: name.trim(),
            fields,
            secretFields,
            // Full secrets object — existing values were pre-loaded, so an
            // untouched secret field is written back unchanged.
            secrets,
          });
          onMessage('Item updated');
        } else {
          await createItem({ name: name.trim(), type, fields, secretFields, secrets });
          onMessage('Item created');
        }
      }
      onClose();
      onRefresh();
    } catch (error) {
      onMessage('Error saving item: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const setCustomRow = (i, patch) => {
    setCustomRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle sx={{ fontFamily: MONO_FONT, fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {isEdit ? `Edit: ${editItem.name}` : 'New Item'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {!isEdit && (
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={type}
            onChange={(e, v) => v && setType(v)}
            sx={{ '& .MuiToggleButton-root': { fontSize: '0.68rem', letterSpacing: '0.06em' } }}
          >
            {CATEGORY_ORDER.map((key) => (
              <ToggleButton key={key} value={key}>{TYPE_META[key].singular}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        <TextField
          size="small"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText='Use "/" to group items, e.g. openai/prod'
          placeholder={type === 'wallet' ? defaultWalletName() : ''}
          sx={fieldInputSx}
        />

        {type === 'wallet' && !isEdit && (
          <TextField
            size="small"
            label="Private Key (leave empty to generate a new wallet)"
            value={walletPk}
            onChange={(e) => setWalletPk(e.target.value)}
            sx={fieldInputSx}
          />
        )}

        {type !== 'wallet' && type !== 'custom' && TYPE_META[type].fields.map((tpl) => (
          <Box key={tpl.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              label={tpl.label + (tpl.required ? '' : ' (optional)')}
              type={tpl.secret ? 'password' : 'text'}
              value={values[tpl.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [tpl.key]: e.target.value }))}
              sx={fieldInputSx}
            />
            {tpl.secret && (
              <Tooltip title="Stored in keychain, TouchID required to read">
                <LockOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
              </Tooltip>
            )}
          </Box>
        ))}

        {type === 'custom' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Fields
            </Typography>
            {customRows.map((row, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  size="small"
                  label="Field name"
                  value={row.key}
                  onChange={(e) => setCustomRow(i, { key: e.target.value })}
                  sx={{ ...fieldInputSx, width: 160 }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Value"
                  type={row.secret ? 'password' : 'text'}
                  value={row.value}
                  onChange={(e) => setCustomRow(i, { value: e.target.value })}
                  sx={fieldInputSx}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={row.secret}
                      onChange={(e) => setCustomRow(i, { secret: e.target.checked })}
                      inputProps={{ 'aria-label': `touchid protection for field ${i + 1}` }}
                    />
                  }
                  label={<LockOutlinedIcon sx={{ fontSize: '0.9rem', color: row.secret ? 'text.primary' : 'text.disabled' }} />}
                  sx={{ mr: 0 }}
                />
                <IconButton size="small" onClick={() => setCustomRows((rows) => rows.filter((_, idx) => idx !== i))}>
                  <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCustomRows((rows) => [...rows, { key: '', value: '', secret: true }])}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add Field
            </Button>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.62rem', color: 'text.secondary' }}>
              🔒 = stored in macOS keychain, TouchID required to read. Plain fields are listed without auth.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" onClick={onClose}>Cancel</Button>
        <Button size="small" variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
