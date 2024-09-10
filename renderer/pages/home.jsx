import React from 'react';
import Head from 'next/head';
import { Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Tooltip } from '@mui/material';
import DarkModeButton from '../components/DarkModeButton';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublicIcon from '@mui/icons-material/Public';
import { useEffect } from 'react';
import { ethers } from 'ethers';
import copy2Clipboard from 'copy-to-clipboard';
import { MessageBox } from '../components/message';
import { useState } from 'react';
import sleep from 'ko-sleep';
import RefreshIcon from '@mui/icons-material/Refresh';

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
  let numStr = number.toString();
  
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
  let v = props.v;
  let balances = props.balances;
  let balance = balances[v.account] ? formatToDollar(balances[v.account].total_usd_value) : 'error';
  let update = props.update;
  let setUpdate = props.setUpdate;
  let i= props.i;

  return (
    <TableRow >
      <TableCell>{JSON.parse(v.password).name} <Tooltip title="Modify" ><EditIcon sx={{ fontSize: '14px', position: 'relative', top: '1px', left: '2px', cursor: 'pointer' }} onClick={async () => {
        let name = await ipcRenderer.invoke('prompt', { title: 'Modify Name', label: 'Name', value: JSON.parse(v.password).name, type: 'input' });
        let json = JSON.parse(v.password);
        json.name = name;
        await ipcRenderer.invoke('setPk', { address: v.account, json: JSON.stringify(json) });
      }} /></Tooltip></TableCell>
      <TableCell>
        <Stack spacing={1} direction="row" >
          <div style={{ fontFamily: "Andale Mono" }}>{v.account}</div>
          <Tooltip title="Copy Address" ><ContentCopyIcon sx={{ fontSize: '14px', position: 'relative', top: '2px', left: '4px', cursor: 'pointer' }} onClick={async () => {
            if (copy2Clipboard(v.account)) {
              props.setSuccessInfo("Address Copyed");
            }
          }} /></Tooltip>
          <Tooltip title="Copy Private Key" ><VpnKeyIcon sx={{ fontSize: '14px', position: 'relative', top: '2px', left: '4px', cursor: 'pointer' }} onClick={async () => {
            let pk = await ipcRenderer.invoke('getPk', v.account);
            if (pk && copy2Clipboard(JSON.parse(pk).pk)) {
              props.setSuccessInfo("Private Key Copyed");
            }
          }} /></Tooltip>
          <Tooltip title="Delete Account" ><DeleteOutlineIcon sx={{ fontSize: '14px', position: 'relative', top: '2px', left: '4px', cursor: 'pointer' }} onClick={async () => {
            await ipcRenderer.invoke('delPk', v.account);
          }} /></Tooltip>
        </Stack>

      </TableCell>
      <TableCell>{balance} <Tooltip title="Show In Debank" ><PublicIcon sx={{ fontSize: '14px', position: 'relative', top: '1px', left: '2px', cursor: 'pointer' }} onClick={async () => {
        shell.openExternal('https://debank.com/profile/' + v.account);
      }} /></Tooltip>
      {/* <Tooltip title="Refresh Balance" ><RefreshIcon sx={{ fontSize: '14px', position: 'relative', top: '1px', left: '2px', cursor: 'pointer' }} onClick={async () => {
        setUpdate(Date.now());
      }} /></Tooltip> */}
      </TableCell>
    </TableRow>
  )
}

function Home() {
  const [update, setUpdate] = React.useState(0);
  const [addrs, setAddrs] = React.useState([]);
  const [successInfo, setSuccessInfo] = useState('');
  const [filter, setFilter] = useState('');
  const [balances, setBalances] = useState({});
  useEffect(() => {
    const func = async () => {
      let ret = await ipcRenderer.invoke('getAllPks');
      console.log('addrs', ret.length);

      let balances = await ipcRenderer.invoke('getBalance', ret.map(v => v.account));
      console.log('balances', balances);
      setBalances(balances);
      setAddrs(ret);
    }

    func();
  }, [update]);


  return (
    <React.Fragment>
      <Head>
        <title>Wallet Address Book</title>
      </Head>
      <Stack spacing={1} style={{ padding: 10 }}>
        <Paper style={{ padding: 15, borderRadius: 15 }} elevation={4} >
          <Stack spacing={2} direction="row">
            <TextField fullWidth size="small" label='Search / Filter' value={filter} onChange={e => setFilter(e.target.value)} />
            <Button size="small" variant='contained' sx={{ textTransform: 'none' }} onClick={async () => {
              let wallet = ethers.Wallet.createRandom();
              let pk = wallet.privateKey;
              let addr = wallet.address;
              let name = 'Account_' + (new Date()).toISOString().split('.')[0];
              let json = { name, pk };
              await ipcRenderer.invoke('setPk', { address: addr, json: JSON.stringify(json) });
              setUpdate(Date.now());
            }} >Create</Button>
            <Button size="small" variant='contained' sx={{ textTransform: 'none' }} onClick={async () => {
              let pk = await ipcRenderer.invoke('prompt', { title: 'Import Private Key', label: 'Private Key', value: '', type: 'input' });
              let wallet = new ethers.Wallet(pk);
              let addr = wallet.address;
              let name = 'Import_' + (new Date()).toISOString().split('.')[0];
              let json = { name, pk };
              await ipcRenderer.invoke('setPk', { address: addr, json: JSON.stringify(json) });
              setUpdate(Date.now());
            }} >Import</Button>
            <DarkModeButton style={{ fontSize: '36px' }} />
          </Stack>
        </Paper>
        <Paper style={{ padding: 15, borderRadius: 15 }} elevation={4} >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                addrs.filter(v => JSON.parse(v.password).name?.toLowerCase().includes(filter.toLowerCase()) || v.account.toLowerCase().includes(filter.toLowerCase())).map((v, i) => {
                  return <TableLine key={v.account} v={v} update={update} setUpdate={setUpdate} i={i} balances={balances} setSuccessInfo={setSuccessInfo} />
                })
              }
            </TableBody>
          </Table>
        </Paper>
      </Stack>
      <MessageBox successInfo={successInfo} setSuccessInfo={setSuccessInfo} />
    </React.Fragment>
  );
};

export default Home;
