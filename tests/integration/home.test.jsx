import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { walletServiceMocks, resetAllMocks } from '../mocks';
import Home from '../../renderer/pages/home';

const WALLETS = [
  { account: '0xAliceAddr0001', password: JSON.stringify({ name: 'Alice', pk: '0x1' }) },
  { account: '0xBobAddress002', password: JSON.stringify({ name: 'Bob', pk: '0x2' }) },
  { account: '0xCharlie00003', password: JSON.stringify({ name: 'Charlie', pk: '0x3' }) },
];

const BALANCES = {
  '0xAliceAddr0001': { total_usd_value: 10000 },
  '0xBobAddress002': { total_usd_value: 500.5 },
  '0xCharlie00003': { total_usd_value: 0 },
};

describe('Home page integration', () => {
  afterEach(cleanup);

  beforeEach(() => {
    resetAllMocks();
    walletServiceMocks.saveWallet.mockResolvedValue(true);
  });

  test('renders full page with wallets', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce(WALLETS);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce(BALANCES);

    await act(async () => {
      render(<Home />);
    });

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Charlie')).toBeTruthy();

    expect(screen.getByText('$10,000.00')).toBeTruthy();
    expect(screen.getByText('$500.50')).toBeTruthy();
    expect(screen.getByText('$0')).toBeTruthy();

    expect(screen.getByText('Your Wallets (3)')).toBeTruthy();
  });

  test('search filters wallets by name', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce(WALLETS);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce(BALANCES);

    await act(async () => {
      render(<Home />);
    });

    const searchInput = screen.getByLabelText('Search by name or address');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'alice' } });
    });

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();
    expect(screen.queryByText('Charlie')).toBeNull();
    expect(screen.getByText('Your Wallets (1)')).toBeTruthy();
  });

  test('search filters wallets by address', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce(WALLETS);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce(BALANCES);

    await act(async () => {
      render(<Home />);
    });

    const searchInput = screen.getByLabelText('Search by name or address');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '0xBob' } });
    });

    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.queryByText('Alice')).toBeNull();
  });

  test('search with no matches shows empty state', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce(WALLETS);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce(BALANCES);

    await act(async () => {
      render(<Home />);
    });

    const searchInput = screen.getByLabelText('Search by name or address');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    expect(
      screen.getByText('No wallets found. Create or import a wallet to get started.')
    ).toBeTruthy();
  });

  test('create wallet calls saveWallet with valid eth address', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce([]);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce({});

    await act(async () => {
      render(<Home />);
    });

    // Prepare refresh after create
    walletServiceMocks.getAllWallets.mockResolvedValueOnce([]);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce({});

    await act(async () => screen.getByText('Create New').click());

    expect(walletServiceMocks.saveWallet).toHaveBeenCalledTimes(1);
    const [address] = walletServiceMocks.saveWallet.mock.calls[0];
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  test('shows empty state initially with no wallets', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce([]);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce({});

    await act(async () => {
      render(<Home />);
    });

    expect(
      screen.getByText('No wallets found. Create or import a wallet to get started.')
    ).toBeTruthy();
  });
});
