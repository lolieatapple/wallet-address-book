import { test, expect, describe, mock, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import WalletTable from '../../renderer/components/WalletTable';

const noop = () => {};

function makeWallet(address, name) {
  return {
    account: address,
    password: JSON.stringify({ name, pk: '0xfake' }),
  };
}

describe('WalletTable', () => {
  afterEach(cleanup);

  test('shows loading state', () => {
    render(
      <WalletTable
        wallets={[]}
        balances={{}}
        isLoading={true}
        onRefresh={noop}
        onMessage={noop}
      />
    );
    expect(screen.getByText('Loading wallets...')).toBeTruthy();
  });

  test('shows empty state when no wallets and not loading', () => {
    render(
      <WalletTable
        wallets={[]}
        balances={{}}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );
    expect(
      screen.getByText('No wallets found. Create or import a wallet to get started.')
    ).toBeTruthy();
  });

  test('renders wallet count in header', () => {
    const wallets = [
      makeWallet('0xaaa', 'Wallet A'),
      makeWallet('0xbbb', 'Wallet B'),
    ];
    render(
      <WalletTable
        wallets={wallets}
        balances={{}}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );
    expect(screen.getByText('Your Wallets (2)')).toBeTruthy();
  });

  test('renders table headers', () => {
    render(
      <WalletTable
        wallets={[]}
        balances={{}}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );
    expect(screen.getByText('#')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Address')).toBeTruthy();
    expect(screen.getByText('Balance')).toBeTruthy();
  });

  test('renders wallet rows with correct data', () => {
    const wallets = [makeWallet('0xabc123', 'MyWallet')];
    const balances = { '0xabc123': { total_usd_value: 1234.56 } };

    render(
      <WalletTable
        wallets={wallets}
        balances={balances}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );

    expect(screen.getByText('MyWallet')).toBeTruthy();
    expect(screen.getByText('0xabc123')).toBeTruthy();
    expect(screen.getByText('$1,234.56')).toBeTruthy();
  });

  test('shows error chip when balance is missing', () => {
    const wallets = [makeWallet('0xnobalance', 'NoBal')];

    render(
      <WalletTable
        wallets={wallets}
        balances={{}}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );

    expect(screen.getByText('error')).toBeTruthy();
  });
});
