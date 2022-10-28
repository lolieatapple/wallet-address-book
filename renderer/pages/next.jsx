import React from 'react';
import Head from 'next/head';
import { Paper } from '@mui/material';

function Next() {
  return (
    <React.Fragment>
      <Head>
        <title>Wallet Address Book</title>
      </Head>
      <div>
        <Paper style={{ padding: 20 }} elevation={10} >
          Hello
        </Paper>
      </div>
    </React.Fragment>
  );
};

export default Next;
