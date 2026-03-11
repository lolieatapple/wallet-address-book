import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { walletServiceMocks, resetAllMocks } from '../mocks';
import WalletToolbar from '../../renderer/components/WalletToolbar';

describe('WalletToolbar', () => {
  afterEach(cleanup);

  beforeEach(() => {
    resetAllMocks();
    walletServiceMocks.saveWallet.mockResolvedValue(true);
  });

  test('renders search input', () => {
    render(
      <WalletToolbar filter="" onFilterChange={() => {}} onRefresh={() => {}} onMessage={() => {}} />
    );
    expect(screen.getByLabelText('Search by name or address')).toBeTruthy();
  });

  test('renders Create, Import, Refresh buttons', () => {
    render(
      <WalletToolbar filter="" onFilterChange={() => {}} onRefresh={() => {}} onMessage={() => {}} />
    );
    expect(screen.getByText('Create New')).toBeTruthy();
    expect(screen.getByText('Import')).toBeTruthy();
    expect(screen.getByText('Refresh')).toBeTruthy();
  });

  test('search input calls onFilterChange', () => {
    const onFilterChange = mock(() => {});
    render(
      <WalletToolbar filter="" onFilterChange={onFilterChange} onRefresh={() => {}} onMessage={() => {}} />
    );

    const input = screen.getByLabelText('Search by name or address');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onFilterChange).toHaveBeenCalledWith('test');
  });

  test('refresh button calls onRefresh', () => {
    const onRefresh = mock(() => {});
    render(
      <WalletToolbar filter="" onFilterChange={() => {}} onRefresh={onRefresh} onMessage={() => {}} />
    );

    act(() => screen.getByText('Refresh').click());
    expect(onRefresh).toHaveBeenCalled();
  });

  test('create button creates wallet and calls callbacks', async () => {
    const onRefresh = mock(() => {});
    const onMessage = mock(() => {});

    render(
      <WalletToolbar filter="" onFilterChange={() => {}} onRefresh={onRefresh} onMessage={onMessage} />
    );

    await act(async () => screen.getByText('Create New').click());

    expect(walletServiceMocks.saveWallet).toHaveBeenCalledTimes(1);
    const [address, data] = walletServiceMocks.saveWallet.mock.calls[0];
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(data.name).toMatch(/^Account_/);
    expect(data.pk).toMatch(/^0x/);

    expect(onRefresh).toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith('New wallet created successfully!');
  });

  test('import does nothing when user cancels prompt', async () => {
    const onRefresh = mock(() => {});
    walletServiceMocks.promptInput.mockResolvedValueOnce(null);

    render(
      <WalletToolbar filter="" onFilterChange={() => {}} onRefresh={onRefresh} onMessage={() => {}} />
    );

    await act(async () => screen.getByText('Import').click());

    expect(walletServiceMocks.saveWallet).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  test('import shows error message for invalid private key', async () => {
    const onMessage = mock(() => {});
    walletServiceMocks.promptInput.mockResolvedValueOnce('not-a-valid-key');

    render(
      <WalletToolbar filter="" onFilterChange={() => {}} onRefresh={() => {}} onMessage={onMessage} />
    );

    await act(async () => screen.getByText('Import').click());

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0]).toMatch(/^Error importing wallet:/);
  });
});
