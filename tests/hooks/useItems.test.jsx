import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { walletServiceMocks, itemsServiceMocks, resetAllMocks, makeItem, makeWalletItem } from '../mocks';
import { useItems } from '../../renderer/hooks/useItems';

function TestHarness() {
  const { items, counts, balances, isLoading, refresh } = useItems();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="count">{items.length}</span>
      <span data-testid="counts">{JSON.stringify(counts)}</span>
      <span data-testid="balances">{JSON.stringify(balances)}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('useItems', () => {
  afterEach(cleanup);
  beforeEach(resetAllMocks);

  test('loads items and computes per-type counts', async () => {
    itemsServiceMocks.listItems.mockResolvedValue([
      makeWalletItem('0xa', 'W1'),
      makeWalletItem('0xb', 'W2'),
      makeItem({ name: 'k', type: 'apikey', secretFields: ['apikey'] }),
    ]);
    walletServiceMocks.fetchBalances.mockResolvedValue({ '0xa': { total_usd_value: 5 } });

    await act(async () => {
      render(<TestHarness />);
    });

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('count').textContent).toBe('3');
    expect(JSON.parse(screen.getByTestId('counts').textContent)).toEqual({
      all: 3, wallet: 2, apikey: 1, ssh: 0, custom: 0,
    });
    expect(JSON.parse(screen.getByTestId('balances').textContent)).toEqual({
      '0xa': { total_usd_value: 5 },
    });
  });

  test('fetches balances only for wallet addresses', async () => {
    itemsServiceMocks.listItems.mockResolvedValue([
      makeWalletItem('0xa', 'W1'),
      makeItem({ name: 'k', type: 'apikey', fields: { url: 'https://x' }, secretFields: ['apikey'] }),
    ]);
    walletServiceMocks.fetchBalances.mockResolvedValue({});

    await act(async () => {
      render(<TestHarness />);
    });

    expect(walletServiceMocks.fetchBalances).toHaveBeenCalledWith(['0xa']);
  });

  test('skips the balance fetch entirely when there are no wallets', async () => {
    itemsServiceMocks.listItems.mockResolvedValue([
      makeItem({ name: 'k', type: 'apikey', secretFields: ['apikey'] }),
    ]);

    await act(async () => {
      render(<TestHarness />);
    });

    expect(walletServiceMocks.fetchBalances).not.toHaveBeenCalled();
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  test('handles a listing error without crashing', async () => {
    itemsServiceMocks.listItems.mockRejectedValueOnce(new Error('fail'));

    await act(async () => {
      render(<TestHarness />);
    });

    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  test('refresh reloads the list', async () => {
    itemsServiceMocks.listItems.mockResolvedValueOnce([]);

    await act(async () => {
      render(<TestHarness />);
    });
    expect(screen.getByTestId('count').textContent).toBe('0');

    itemsServiceMocks.listItems.mockResolvedValueOnce([
      makeItem({ name: 'k', type: 'custom' }),
    ]);
    await act(async () => {
      screen.getByText('Refresh').click();
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
