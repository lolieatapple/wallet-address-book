import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { Table, TableBody } from '@mui/material';
import { walletServiceMocks, clipboardMock, resetAllMocks } from '../mocks';
import WalletRow from '../../renderer/components/WalletRow';

function renderRow(props = {}) {
  const defaultWallet = {
    address: '0xTestAddress123',
    name: 'TestWallet',
  };
  const defaultBalance = { total_usd_value: 500 };

  return render(
    <Table>
      <TableBody>
        <WalletRow
          wallet={props.wallet || defaultWallet}
          balance={props.balance !== undefined ? props.balance : defaultBalance}
          index={props.index || 0}
          onRefresh={props.onRefresh || (() => {})}
          onMessage={props.onMessage || (() => {})}
          isDefault={props.isDefault || false}
          onSetDefault={props.onSetDefault || (() => {})}
        />
      </TableBody>
    </Table>
  );
}

describe('WalletRow', () => {
  afterEach(cleanup);

  beforeEach(() => {
    resetAllMocks();
    walletServiceMocks.getPrivateKey.mockResolvedValue('0xpk123');
    walletServiceMocks.saveWallet.mockResolvedValue(true);
    walletServiceMocks.deleteWallet.mockResolvedValue(true);
  });

  test('renders wallet name and address', () => {
    renderRow();
    expect(screen.getByText('TestWallet')).toBeTruthy();
    expect(screen.getByText('0xTestAddress123')).toBeTruthy();
  });

  test('renders formatted balance', () => {
    renderRow({ balance: { total_usd_value: 1234.56 } });
    expect(screen.getByText('$1,234.56')).toBeTruthy();
  });

  test('shows error when balance is null', () => {
    renderRow({ balance: null });
    expect(screen.getByText('error')).toBeTruthy();
  });

  test('copy address button calls clipboard and onMessage', async () => {
    const onMessage = mock(() => {});
    renderRow({ onMessage });

    const copyBtn = screen.getByLabelText('Copy Address');
    await act(() => copyBtn.click());

    expect(clipboardMock.copy).toHaveBeenCalledWith('0xTestAddress123');
    expect(onMessage).toHaveBeenCalledWith('Address Copied');
  });

  test('copy private key copies via main-process clipboard, not execCommand', async () => {
    const onMessage = mock(() => {});
    const onRefresh = mock(() => {});
    renderRow({ onMessage, onRefresh });

    const pkBtn = screen.getByLabelText('Copy Private Key');
    await act(async () => pkBtn.click());

    expect(walletServiceMocks.getPrivateKey).toHaveBeenCalledWith('0xTestAddress123');
    // Must go through the IPC clipboard: document.execCommand('copy') needs a
    // live user-activation, which expires during the TouchID/keychain wait,
    // and copy-to-clipboard's fallback calls window.prompt (unsupported in
    // Electron renderers).
    expect(walletServiceMocks.copyText).toHaveBeenCalledWith('0xpk123', { sensitive: true });
    expect(clipboardMock.copy).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledWith('Private Key Copied');
    // Reading the pk heals a migrated placeholder name in the index, so the
    // row refreshes to pick it up.
    expect(onRefresh).toHaveBeenCalled();
  });

  test('edit name prompts and renames via index (no keychain write)', async () => {
    const onRefresh = mock(() => {});
    walletServiceMocks.promptInput.mockResolvedValueOnce('NewName');

    renderRow({ onRefresh });

    // buttons[0] is the star (set default), buttons[1] is the edit
    const buttons = screen.getAllByRole('button');
    const editBtn = buttons[1];
    await act(async () => editBtn.click());

    expect(walletServiceMocks.promptInput).toHaveBeenCalledWith('Modify Name', 'Name', 'TestWallet');
    expect(walletServiceMocks.renameWallet).toHaveBeenCalledWith('0xTestAddress123', 'NewName');
    expect(walletServiceMocks.saveWallet).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalled();
  });

  test('edit name does nothing when user cancels prompt', async () => {
    const onRefresh = mock(() => {});
    walletServiceMocks.promptInput.mockResolvedValueOnce(null);

    renderRow({ onRefresh });

    const buttons = screen.getAllByRole('button');
    await act(async () => buttons[1].click());

    expect(walletServiceMocks.renameWallet).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  test('shows filled star when isDefault is true', () => {
    renderRow({ isDefault: true });
    expect(screen.getByLabelText('Unset Default')).toBeTruthy();
  });

  test('shows empty star when isDefault is false', () => {
    renderRow({ isDefault: false });
    expect(screen.getByLabelText('Set as Default')).toBeTruthy();
  });

  test('clicking star calls onSetDefault with address', async () => {
    const onSetDefault = mock(() => {});
    renderRow({ onSetDefault });

    const starBtn = screen.getByLabelText('Set as Default');
    await act(() => starBtn.click());

    expect(onSetDefault).toHaveBeenCalledWith('0xTestAddress123');
  });
});
