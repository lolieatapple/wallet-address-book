import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { walletServiceMocks, itemsServiceMocks, resetAllMocks, makeItem, makeWalletItem } from '../mocks';
import Home from '../../renderer/pages/home';

const ITEMS = [
  makeWalletItem('0xAliceAddr0001', 'Alice'),
  makeWalletItem('0xBobAddress002', 'Bob'),
  makeItem({
    name: 'openai/prod',
    type: 'apikey',
    fields: { url: 'https://api.openai.com' },
    secretFields: ['apikey'],
  }),
  makeItem({
    name: 'deploy-server',
    type: 'ssh',
    fields: { host: 'root@10.0.0.1:22' },
    secretFields: ['password'],
  }),
];

const BALANCES = {
  '0xAliceAddr0001': { total_usd_value: 10000 },
  '0xBobAddress002': { total_usd_value: 500.5 },
};

async function renderHome(items = ITEMS, balances = BALANCES) {
  itemsServiceMocks.listItems.mockResolvedValue(items);
  walletServiceMocks.fetchBalances.mockResolvedValue(balances);
  await act(async () => {
    render(<Home />);
  });
}

describe('Home page integration', () => {
  afterEach(cleanup);

  beforeEach(() => {
    resetAllMocks();
    walletServiceMocks.saveWallet.mockResolvedValue(true);
    walletServiceMocks.onRestoreNamesRequested.mockReturnValue(() => {});
  });

  test('app-menu restore-names command runs restore and shows the result', async () => {
    walletServiceMocks.restoreNames.mockResolvedValueOnce({ pending: 3, restored: 2 });

    let menuHandler;
    walletServiceMocks.onRestoreNamesRequested.mockImplementation((handler) => {
      menuHandler = handler;
      return () => {};
    });

    await renderHome();

    // Simulate the app-menu click event arriving from the main process.
    await act(async () => menuHandler());

    expect(walletServiceMocks.restoreNames).toHaveBeenCalled();
    expect(screen.getByText('Restored 2 of 3 wallet names')).toBeTruthy();
  });

  test('renders all items in the All view', async () => {
    await renderHome();

    // Default category is All Items → generic list with every item
    expect(screen.getByText('All Items (4)')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('openai/prod')).toBeTruthy();
    expect(screen.getByText('deploy-server')).toBeTruthy();
  });

  test('wallet category shows the balance table with balances visible at a glance', async () => {
    await renderHome();

    await act(async () => {
      fireEvent.click(screen.getByText('Wallets'));
    });

    expect(screen.getByText('Wallets (2)')).toBeTruthy();
    expect(screen.getByText('$10,000.00')).toBeTruthy();
    expect(screen.getByText('$500.50')).toBeTruthy();
    expect(screen.getByText('0xAliceAddr0001')).toBeTruthy();
  });

  test('search filters items by name across types', async () => {
    await renderHome();

    const searchInput = screen.getByLabelText('Search by name or field');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'openai' } });
    });

    expect(screen.getByText('openai/prod')).toBeTruthy();
    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.queryByText('deploy-server')).toBeNull();
  });

  test('search matches plaintext field values (address)', async () => {
    await renderHome();

    const searchInput = screen.getByLabelText('Search by name or field');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '0xBob' } });
    });

    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.queryByText('Alice')).toBeNull();
  });

  test('clicking an item opens the detail drawer with TouchID-marked secrets', async () => {
    await renderHome();

    await act(async () => {
      fireEvent.click(screen.getByText('openai/prod'));
    });

    // Drawer shows the plaintext field a second time (list row + drawer)
    // plus the masked, TouchID-marked secret field.
    expect(screen.getAllByText('https://api.openai.com')).toHaveLength(2);
    expect(screen.getByText('••••••••••••')).toBeTruthy();
    expect(screen.getByText('TOUCHID')).toBeTruthy();
  });

  test('create wallet via New dialog calls saveWallet with a valid eth address', async () => {
    await renderHome([], {});

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /New/ }));
    });

    // Wallet is the default type; leaving PK empty generates a new wallet
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(walletServiceMocks.saveWallet).toHaveBeenCalledTimes(1);
    const [address, data] = walletServiceMocks.saveWallet.mock.calls[0];
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(data.pk).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  test('shows empty state with no items', async () => {
    await renderHome([], {});

    expect(screen.getByText('No items yet. Click New to add one.')).toBeTruthy();
  });
});
