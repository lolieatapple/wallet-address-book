import React from 'react';
import { Paper, Box, Button, TextField } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestoreIcon from '@mui/icons-material/Restore';
import DarkModeButton from './DarkModeButton';
import { ethers } from 'ethers';
import { saveWallet, promptInput, restoreNames } from '../services/wallet';
import { MONO_FONT } from '../theme';

export default function WalletToolbar({ filter, onFilterChange, onRefresh, onMessage }) {
  const handleCreate = async () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      const name = 'Account_' + new Date().toISOString().split('.')[0];
      await saveWallet(wallet.address, { name, pk: wallet.privateKey });
      onRefresh();
      onMessage('New wallet created successfully!');
    } catch (error) {
      onMessage('Error creating wallet: ' + error.message);
    }
  };

  const handleImport = async () => {
    try {
      const pk = await promptInput('Import Private Key', 'Private Key');
      if (!pk) return;

      const wallet = new ethers.Wallet(pk);
      const name = 'Import_' + new Date().toISOString().split('.')[0];
      await saveWallet(wallet.address, { name, pk });
      onRefresh();
      onMessage('Wallet imported successfully!');
    } catch (error) {
      onMessage('Error importing wallet: ' + error.message);
    }
  };

  const handleRestoreNames = async () => {
    try {
      // One keychain ACL dialog per un-restored wallet; "Always Allow"
      // permanently silences future prompts for that wallet.
      const { pending, restored } = await restoreNames();
      onRefresh();
      onMessage(pending === 0
        ? 'No wallet names need restoring'
        : `Restored ${restored} of ${pending} wallet names`);
    } catch (error) {
      // A denied prompt aborts the run but already-restored names are kept.
      onRefresh();
      onMessage('Error restoring names: ' + error.message);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Search by name or address"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          sx={{
            flexGrow: 1,
            minWidth: '250px',
            maxWidth: '500px',
            '& .MuiOutlinedInput-root': { borderRadius: 0, fontFamily: MONO_FONT, fontSize: '0.85rem' },
            '& .MuiInputLabel-root': { letterSpacing: '0.04em' },
          }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} />,
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleCreate}
          >
            Create New
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileUploadIcon />}
            onClick={handleImport}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RestoreIcon />}
            onClick={handleRestoreNames}
          >
            Restore Names
          </Button>
          <DarkModeButton />
        </Box>
      </Box>
    </Paper>
  );
}
