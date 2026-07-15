import { test, expect, describe, mock, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import WalletTable from '../../renderer/components/WalletTable';

const noop = () => {};

function makeWallet(address, name) {
  return { address, name };
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
    expect(screen.getByText('Wallets (2)')).toBeTruthy();
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
    expect(screen.getByRole('columnheader', { name: '#' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Address' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Balance' })).toBeTruthy();
  });

  test('shows total balance across all wallets', () => {
    const wallets = [makeWallet('0xa', 'A'), makeWallet('0xb', 'B')];
    const balances = {
      '0xa': { total_usd_value: 100 },
      '0xb': { total_usd_value: 23.5 },
    };
    render(
      <WalletTable
        wallets={wallets}
        balances={balances}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );
    expect(screen.getByText('Total: $123.50')).toBeTruthy();
  });

  test('hide zero filters out zero-balance wallets but keeps unknown balances', () => {
    const wallets = [
      makeWallet('0xrich', 'Rich'),
      makeWallet('0xzero', 'Zero'),
      makeWallet('0xunknown', 'Unknown'),
    ];
    const balances = {
      '0xrich': { total_usd_value: 42 },
      '0xzero': { total_usd_value: 0 },
      // 0xunknown: fetch failed — must NOT be hidden as if it were zero
    };
    render(
      <WalletTable
        wallets={wallets}
        balances={balances}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('Rich')).toBeTruthy();
    expect(screen.queryByText('Zero')).toBeNull();
    expect(screen.getByText('Unknown')).toBeTruthy();
  });

  test('sort by balance orders wallets richest first', () => {
    const wallets = [
      makeWallet('0xpoor', 'Poor'),
      makeWallet('0xrich', 'Rich'),
      makeWallet('0xmid', 'Mid'),
    ];
    const balances = {
      '0xpoor': { total_usd_value: 1 },
      '0xrich': { total_usd_value: 1000 },
      '0xmid': { total_usd_value: 50 },
    };
    render(
      <WalletTable
        wallets={wallets}
        balances={balances}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Balance' }));

    const rows = screen.getAllByRole('row').slice(1); // skip header
    const names = rows.map((r) => within(r).getAllByRole('cell')[1].textContent);
    expect(names).toEqual(['Rich', 'Mid', 'Poor']);
  });

  test('slash-named wallets fold into a collapsible group with subtotal', () => {
    const wallets = [
      makeWallet('0xsolo', 'Solo'),
      makeWallet('0xa1', 'airdrop/001'),
      makeWallet('0xa2', 'airdrop/002'),
    ];
    const balances = {
      '0xsolo': { total_usd_value: 5 },
      '0xa1': { total_usd_value: 10 },
      '0xa2': { total_usd_value: 20 },
    };
    render(
      <WalletTable
        wallets={wallets}
        balances={balances}
        isLoading={false}
        onRefresh={noop}
        onMessage={noop}
      />
    );

    // Group header with count and subtotal
    const header = screen.getByText('airdrop/ (2)');
    expect(header).toBeTruthy();
    expect(screen.getByText('$30.00')).toBeTruthy();
    expect(screen.getByText('airdrop/001')).toBeTruthy();

    // Collapsing hides the grouped rows but keeps ungrouped ones
    fireEvent.click(header);
    expect(screen.queryByText('airdrop/001')).toBeNull();
    expect(screen.queryByText('airdrop/002')).toBeNull();
    expect(screen.getByText('Solo')).toBeTruthy();

    // Expand again
    fireEvent.click(screen.getByText('airdrop/ (2)'));
    expect(screen.getByText('airdrop/001')).toBeTruthy();
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
