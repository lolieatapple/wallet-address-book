import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { getSettings, updateSettings } from '../services/items';
import { MONO_FONT } from '../theme';

export default function SettingsDialog({ open, onClose, onMessage }) {
  const [autoClear, setAutoClear] = useState(false);
  const [delaySec, setDelaySec] = useState(30);

  useEffect(() => {
    if (!open) return;
    getSettings().then((s) => {
      setAutoClear(s.clipboardAutoClear);
      setDelaySec(s.clipboardClearDelaySec);
    }).catch((err) => onMessage('Error loading settings: ' + err.message));
  }, [open]);

  const handleSave = async () => {
    try {
      const delay = parseInt(delaySec, 10);
      if (!Number.isInteger(delay) || delay < 5 || delay > 600) {
        throw new Error('Delay must be between 5 and 600 seconds');
      }
      await updateSettings({ clipboardAutoClear: autoClear, clipboardClearDelaySec: delay });
      onMessage('Settings saved');
      onClose();
    } catch (error) {
      onMessage('Error saving settings: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
      <DialogTitle sx={{ fontFamily: MONO_FONT, fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Settings
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Clipboard
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={autoClear}
              onChange={(e) => setAutoClear(e.target.checked)}
              inputProps={{ 'aria-label': 'auto clear clipboard' }}
            />
          }
          label={
            <Typography sx={{ fontSize: '0.8rem' }}>
              Auto-clear clipboard after copying a secret
            </Typography>
          }
        />
        <TextField
          size="small"
          label="Clear delay (seconds)"
          type="number"
          disabled={!autoClear}
          value={delaySec}
          onChange={(e) => setDelaySec(e.target.value)}
          sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 0, fontFamily: MONO_FONT } }}
        />
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: '0.62rem', color: 'text.secondary' }}>
          Only clears if the clipboard still holds the copied secret. Clipboard
          history managers keep their own copy regardless.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" onClick={onClose}>Cancel</Button>
        <Button size="small" variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
