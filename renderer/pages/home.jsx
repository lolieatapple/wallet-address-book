import React from 'react';
import Head from 'next/head';
import { Paper, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Tooltip } from '@mui/material';
import DarkModeButton from '../components/DarkModeButton';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useEffect } from 'react';
import { ethers } from 'ethers';
import copy2Clipboard from 'copy-to-clipboard';
import { MessageBox } from '../components/message';
import { useState } from 'react';
const { ipcRenderer } = require('electron');


function Home() {
  const [update, setUpdate] = React.useState(0);
  const [addrs, setAddrs] = React.useState([]);
  const [successInfo, setSuccessInfo] = useState('');
  const [filter, setFilter] = useState('');
  useEffect(()=>{
    const func = async () => {
      let ret = await ipcRenderer.invoke('getAllPks');
      setAddrs(ret);
    }

    func();
  }, [update]);
  return (
    <React.Fragment>
      <Head>
        <title>Wallet Address Book</title>
      </Head>
      <Stack spacing={1} style={{padding: 10}}>
        <Paper style={{ padding: 15, borderRadius: 15 }} elevation={4} >
          <Stack spacing={2} direction="row">
            <TextField fullWidth size="small" label='Search / Filter' value={filter} onChange={e=>setFilter(e.target.value)} />
            <Button size="small" variant='contained' sx={{textTransform:'none'}} onClick={async ()=>{
              let wallet = ethers.Wallet.createRandom();
              let pk = wallet.privateKey;
              let addr = wallet.address;
              let name = 'Account_' + (new Date()).toISOString().split('.')[0];
              let json = {name, pk};
              await ipcRenderer.invoke('setPk', {address: addr, json: JSON.stringify(json)});
              setUpdate(Date.now());
            }} >Create</Button>
            <Button size="small" variant='contained' sx={{textTransform:'none'}} onClick={async ()=>{
              let pk = await ipcRenderer.invoke('prompt', {title: 'Import Private Key', label: 'Private Key', value: '', type: 'input'});
              let wallet = new ethers.Wallet(pk);
              let addr = wallet.address;
              let name = 'Import_' + (new Date()).toISOString().split('.')[0];
              let json = {name, pk};
              await ipcRenderer.invoke('setPk', {address: addr, json: JSON.stringify(json)});
              setUpdate(Date.now());
            }} >Import</Button>
            <DarkModeButton style={{fontSize: '36px'}} />
          </Stack>
        </Paper>
        <Paper style={{ padding: 15, borderRadius: 15 }} elevation={4} >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                addrs.filter(v=>JSON.parse(v.password).name.toLowerCase().includes(filter.toLowerCase()) || v.account.toLowerCase().includes(filter.toLowerCase())).map(v=>{
                  return <TableRow key={v.account} >
                  <TableCell>{JSON.parse(v.password).name} <Tooltip title="Modify" ><EditIcon sx={{fontSize: '14px', position: 'relative', top: '1px', left: '2px', cursor: 'pointer'}} onClick={async ()=>{
                    let name = await ipcRenderer.invoke('prompt', {title: 'Modify Name', label: 'Name', value: JSON.parse(v.password).name, type: 'input'});
                    let json = JSON.parse(v.password);
                    json.name = name;
                    await ipcRenderer.invoke('setPk', {address: v.account, json: JSON.stringify(json)});
                    setUpdate(Date.now());
                  }} /></Tooltip></TableCell>
                  <TableCell>
                    <Stack spacing={1} direction="row" >
                      <div style={{fontFamily:"Andale Mono"}}>{v.account}</div>
                      <Tooltip title="Copy Address" ><ContentCopyIcon sx={{fontSize: '14px', position: 'relative', top: '2px', left: '4px', cursor: 'pointer'}}  onClick={async ()=>{
                        if (copy2Clipboard(v.account)) {
                          setSuccessInfo("Address Copyed");
                        }
                      }} /></Tooltip>
                      <Tooltip title="Copy Private Key" ><VpnKeyIcon sx={{fontSize: '14px', position: 'relative', top: '2px', left: '4px', cursor: 'pointer'}}  onClick={async ()=>{
                        let pk = await ipcRenderer.invoke('getPk', v.account);
                        if (pk && copy2Clipboard(JSON.parse(pk).pk)) {
                          setSuccessInfo("Private Key Copyed");
                        }
                      }} /></Tooltip>
                      <Tooltip title="Delete Account" ><DeleteOutlineIcon sx={{fontSize: '14px', position: 'relative', top: '2px', left: '4px', cursor: 'pointer'}} onClick={async ()=>{
                        await ipcRenderer.invoke('delPk', v.account);
                        setUpdate(Date.now());
                      }} /></Tooltip>
                    </Stack>
                    
                  </TableCell>
                </TableRow>
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
