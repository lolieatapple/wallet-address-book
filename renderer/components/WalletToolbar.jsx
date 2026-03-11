import React from 'react';
import {
  Paper,
  Box,
  Button,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DarkModeButton from './DarkModeButton';
import { ethers } from 'ethers';
import { saveWallet, promptInput } from '../services/wallet';

export default function WalletToolbar({ filter, onFilterChange, onRefresh, onMessage }) {
  const theme = useTheme();

  const handleCreate = async () => {
    const wallet = ethers.Wallet.createRandom();
    const name = 'Account_' + new Date().toISOString().split('.')[0];
    await saveWallet(wallet.address, { name, pk: wallet.privateKey });
    onRefresh();
    onMessage('New wallet created successfully!');
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

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
        mb: 3,
        background: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(10px)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
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
            '& .MuiOutlinedInput-root': { borderRadius: 2 },
          }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleCreate}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', boxShadow: 2 }}
          >
            Create New
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileUploadIcon />}
            onClick={handleImport}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            Refresh
          </Button>
          <DarkModeButton />
        </Box>
      </Box>
    </Paper>
  );
}
