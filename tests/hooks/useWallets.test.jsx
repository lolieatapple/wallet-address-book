import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { walletServiceMocks, resetAllMocks } from '../mocks';
import { useWallets } from '../../renderer/hooks/useWallets';

function TestHarness() {
  const { wallets, balances, isLoading, refresh } = useWallets();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="count">{wallets.length}</span>
      <span data-testid="balances">{JSON.stringify(balances)}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('useWallets', () => {
  afterEach(cleanup);

  beforeEach(() => {
    resetAllMocks();
  });

  test('starts in loading state and loads wallets', async () => {
    const wallets = [{ account: '0xabc', password: '{"name":"A","pk":"0x1"}' }];
    const balances = { '0xabc': { total_usd_value: 100 } };

    walletServiceMocks.getAllWallets.mockResolvedValueOnce(wallets);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce(balances);

    await act(async () => {
      render(<TestHarness />);
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('balances').textContent).toBe(JSON.stringify(balances));
  });

  test('passes wallet addresses to fetchBalances', async () => {
    const wallets = [
      { account: '0xa', password: '{}' },
      { account: '0xb', password: '{}' },
    ];
    walletServiceMocks.getAllWallets.mockResolvedValueOnce(wallets);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce({});

    await act(async () => {
      render(<TestHarness />);
    });

    expect(walletServiceMocks.fetchBalances).toHaveBeenCalledWith(['0xa', '0xb']);
  });

  test('refresh reloads data', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce([]);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce({});

    await act(async () => {
      render(<TestHarness />);
    });

    const newWallets = [{ account: '0xnew', password: '{}' }];
    walletServiceMocks.getAllWallets.mockResolvedValueOnce(newWallets);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce({});

    await act(async () => {
      screen.getByText('Refresh').click();
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(walletServiceMocks.getAllWallets).toHaveBeenCalledTimes(2);
  });

  test('handles fetchBalances returning null gracefully', async () => {
    walletServiceMocks.getAllWallets.mockResolvedValueOnce([{ account: '0xa', password: '{}' }]);
    walletServiceMocks.fetchBalances.mockResolvedValueOnce(null);

    await act(async () => {
      render(<TestHarness />);
    });

    expect(screen.getByTestId('balances').textContent).toBe('{}');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  test('handles error without crashing', async () => {
    walletServiceMocks.getAllWallets.mockRejectedValueOnce(new Error('fail'));

    await act(async () => {
      render(<TestHarness />);
    });

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
