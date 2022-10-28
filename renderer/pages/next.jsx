import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

function Next() {
  return (
    <React.Fragment>
      <Head>
        <title>Next - Nextron (with-javascript)</title>
      </Head>
      <div>
        <p>
          ⚡ Electron + Next.js ⚡ -
          <Link href="/home">
            <a>Go to home page</a>
          </Link>
          <button onClick={async ()=>{
            const {ipcRenderer} = require('electron')
            const result = await ipcRenderer.invoke('setpwd', '123')
            console.log(result)
          }}>Set Pwd</button>
          <button onClick={async ()=>{
            const {ipcRenderer} = require('electron')
            const result = await ipcRenderer.invoke('getpwd', ':)')
            console.log(result)
          }}>Get Pwd</button>
        </p>
      </div>
    </React.Fragment>
  );
};

export default Next;
