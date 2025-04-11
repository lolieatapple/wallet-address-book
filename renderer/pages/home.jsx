import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { 
  Paper, 
  Stack, 
  Button, 
  TextField, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Tooltip, 
  Typography, 
  Box, 
  Container, 
  IconButton, 
  Chip, 
  Divider,
  TableContainer,
  useTheme,
  alpha,
  GlobalStyles
} from '@mui/material';
import DarkModeButton from '../components/DarkModeButton';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublicIcon from '@mui/icons-material/Public';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ethers } from 'ethers';
import copy2Clipboard from 'copy-to-clipboard';
import { MessageBox } from '../components/message';
import sleep from 'ko-sleep';

const { ipcRenderer, shell } = require('electron');
// const balanceApi = 'https://api.rabby.io/v1/user/total_balance?id=';
const balanceApi = 'https://api.debank.com/user/total_balance?addr=';

export function formatToDollar(number) {
  if (Number(number) === 0) {
    return '$0';
  }

  if (Number(number) < 0.01) {
    return '< $0.01';
  }
  // 将数值转换为字符串
  let numStr = number ? number.toString() : '0';
  
  // 判断是否有小数部分
  let decimalIndex = numStr.indexOf('.');
  let integerPart = decimalIndex !== -1 ? numStr.slice(0, decimalIndex) : numStr;
  let decimalPart = decimalIndex !== -1 ? numStr.slice(decimalIndex) : '';
  
  // 将整数部分从右到左每三位添加一个逗号
  let formattedIntegerPart = '';
  for (let i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formattedIntegerPart = ',' + formattedIntegerPart;
    }
    formattedIntegerPart = integerPart[i] + formattedIntegerPart;
  }
  
  // 处理小数部分,保留两位小数
  let formattedDecimalPart = decimalPart.slice(0, 3);
  if (formattedDecimalPart.length < 3) {
    formattedDecimalPart += '0'.repeat(3 - formattedDecimalPart.length);
  }
  
  // 拼接整数部分和小数部分,添加美元符号
  let formattedNumber = '$' + formattedIntegerPart + formattedDecimalPart;
  
  return formattedNumber;
}


function TableLine(props) {
  const theme = useTheme();
  const { v, balances, update, setUpdate, i, setSuccessInfo } = props;
  const balance = balances[v.account] ? formatToDollar(balances[v.account].total_usd_value) : 'error';
  const accountData = JSON.parse(v.password);

  const handleEditName = async () => {
    let name = await ipcRenderer.invoke('prompt', { 
      title: 'Modify Name', 
      label: 'Name', 
      value: accountData.name, 
      type: 'input' 
    });
    if (name) {
      let json = JSON.parse(v.password);
      json.name = name;
      await ipcRenderer.invoke('setPk', { address: v.account, json: JSON.stringify(json) });
      setUpdate(Date.now());
    }
  };

  const handleCopyAddress = () => {
    if (copy2Clipboard(v.account)) {
      setSuccessInfo("Address Copied");
    }
  };

  const handleCopyPrivateKey = async () => {
    let pk = await ipcRenderer.invoke('getPk', v.account);
    if (pk && copy2Clipboard(JSON.parse(pk).pk)) {
      setSuccessInfo("Private Key Copied");
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm(`Are you sure you want to delete ${accountData.name}?`)) {
      await ipcRenderer.invoke('delPk', v.account);
      setUpdate(Date.now());
    }
  };

  const handleOpenDebank = () => {
    shell.openExternal('https://debank.com/profile/' + v.account);
  };

  // Alternate row colors for better readability
  const rowBackground = i % 2 === 0 
    ? alpha(theme.palette.primary.main, 0.05)
    : 'transparent';

  return (
    <TableRow sx={{ 
      backgroundColor: rowBackground,
      transition: 'all 0.2s ease',
      '&:hover': { 
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }
    }}>
      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight="medium">{accountData.name}</Typography>
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
              fontSize: '0.75rem'
            }}
          >
            {v.account}
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
              <IconButton size="small" onClick={handleDeleteAccount}>
                <DeleteOutlineIcon sx={{ fontSize: '0.875rem' }} color="error" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </TableCell>
      
      <TableCell sx={{ padding: '4px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip 
            label={balance} 
            color={balance === 'error' ? 'error' : 'success'} 
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

function Home() {
  const theme = useTheme();
  const [update, setUpdate] = useState(0);
  const [addrs, setAddrs] = useState([]);
  const [successInfo, setSuccessInfo] = useState('');
  const [filter, setFilter] = useState('');
  const [balances, setBalances] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const func = async () => {
      setIsLoading(true);
      let ret = await ipcRenderer.invoke('getAllPks');
      console.log('addrs', ret.length);

      let balances = await ipcRenderer.invoke('getBalance', ret.map(v => v.account));
      console.log('balances', balances);
      setBalances(balances);
      setAddrs(ret);
      setIsLoading(false);
    };

    func();
  }, [update]);

  const handleCreateWallet = async () => {
    let wallet = ethers.Wallet.createRandom();
    let pk = wallet.privateKey;
    let addr = wallet.address;
    let name = 'Account_' + (new Date()).toISOString().split('.')[0];
    let json = { name, pk };
    await ipcRenderer.invoke('setPk', { address: addr, json: JSON.stringify(json) });
    setUpdate(Date.now());
    setSuccessInfo("New wallet created successfully!");
  };

  const handleImportWallet = async () => {
    try {
      let pk = await ipcRenderer.invoke('prompt', { 
        title: 'Import Private Key', 
        label: 'Private Key', 
        value: '', 
        type: 'input' 
      });
      
      if (!pk) return;
      
      let wallet = new ethers.Wallet(pk);
      let addr = wallet.address;
      let name = 'Import_' + (new Date()).toISOString().split('.')[0];
      let json = { name, pk };
      await ipcRenderer.invoke('setPk', { address: addr, json: JSON.stringify(json) });
      setUpdate(Date.now());
      setSuccessInfo("Wallet imported successfully!");
    } catch (error) {
      setSuccessInfo("Error importing wallet: " + error.message);
    }
  };

  const filteredAddresses = addrs.filter(v => 
    JSON.parse(v.password).name?.toLowerCase().includes(filter.toLowerCase()) || 
    v.account.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <React.Fragment>
      <Head>
        <title>Wallet Address Book</title>
      </Head>
      
      <GlobalStyles
        styles={{
          body: {
            overflow: 'hidden'
          }
        }}
      />
      
      <Box
        sx={{
          minHeight: '100vh',
          background: theme.palette.mode === 'dark' 
            ? `linear-gradient(145deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(theme.palette.primary.dark, 0.2)} 100%)`
            : `linear-gradient(145deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(theme.palette.primary.light, 0.2)} 100%)`,
          pt: 3,
          pb: 6
        }}
      >
        <Container maxWidth="lg">          
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              mb: 3,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Search by name or address"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                sx={{ 
                  flexGrow: 1,
                  minWidth: '250px',
                  maxWidth: '500px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
              
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleCreateWallet}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    boxShadow: 2
                  }}
                >
                  Create New
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="primary"
                  startIcon={<FileUploadIcon />}
                  onClick={handleImportWallet}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Import
                </Button>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<RefreshIcon />}
                  onClick={() => setUpdate(Date.now())}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Refresh
                </Button>
                <DarkModeButton />
              </Box>
            </Box>
          </Paper>
          
          <Paper 
            elevation={3} 
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight="medium">
                Your Wallets {filteredAddresses.length > 0 && `(${filteredAddresses.length})`}
              </Typography>
            </Box>
            
            <TableContainer sx={{ maxHeight: 'calc(100vh - 240px)' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '20%', padding: '8px 16px' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '60%', padding: '8px 16px' }}>Address</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '20%', padding: '8px 16px' }}>Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <Typography>Loading wallets...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredAddresses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                        <Typography>No wallets found. Create or import a wallet to get started.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAddresses.map((v, i) => (
                      <TableLine 
                        key={v.account} 
                        v={v} 
                        update={update} 
                        setUpdate={setUpdate} 
                        i={i} 
                        balances={balances} 
                        setSuccessInfo={setSuccessInfo} 
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>
      </Box>
      
      <MessageBox successInfo={successInfo} setSuccessInfo={setSuccessInfo} />
    </React.Fragment>
  );
}

export default Home;
