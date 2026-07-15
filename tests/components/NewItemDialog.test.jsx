import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { walletServiceMocks, itemsServiceMocks, resetAllMocks, makeItem, makeWalletItem } from '../mocks';
import NewItemDialog from '../../renderer/components/NewItemDialog';

const noop = () => {};

function renderDialog(props = {}) {
  return render(
    <NewItemDialog
      open
      onClose={noop}
      onRefresh={noop}
      onMessage={props.onMessage || noop}
      initialType={props.initialType || 'all'}
      editItem={props.editItem}
      editSecrets={props.editSecrets}
    />
  );
}

async function setField(label, value) {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });
}

describe('NewItemDialog', () => {
  afterEach(cleanup);
  beforeEach(() => {
    resetAllMocks();
    walletServiceMocks.saveWallet.mockResolvedValue(true);
    itemsServiceMocks.createItem.mockResolvedValue({});
    itemsServiceMocks.updateItem.mockResolvedValue({});
  });

  test('creates an API key with notes stored as a plaintext field', async () => {
    renderDialog({ initialType: 'apikey' });

    await setField('Name', 'openai/prod');
    await setField('API Key', 'sk-123');
    await setField('Notes (optional)', '生产环境专用');
    await save();

    expect(itemsServiceMocks.createItem).toHaveBeenCalledWith({
      name: 'openai/prod',
      type: 'apikey',
      fields: { notes: '生产环境专用' },
      secretFields: ['apikey'],
      secrets: { apikey: 'sk-123' },
    });
  });

  test('creating a wallet with notes attaches them via a follow-up index update', async () => {
    renderDialog({ initialType: 'wallet' });

    await setField('Notes (optional)', 'mainnet 部署专用');

    let savedAddress;
    walletServiceMocks.saveWallet.mockImplementation(async (address) => {
      savedAddress = address;
      itemsServiceMocks.listItems.mockResolvedValue([
        makeWalletItem(address, 'W1', 'wid-1'),
      ]);
      return true;
    });

    await save();

    expect(walletServiceMocks.saveWallet).toHaveBeenCalledTimes(1);
    expect(itemsServiceMocks.updateItem).toHaveBeenCalledWith({
      id: 'wid-1',
      fields: { address: savedAddress, notes: 'mainnet 部署专用' },
    });
  });

  test('creating a wallet without notes skips the extra index update', async () => {
    renderDialog({ initialType: 'wallet' });
    await save();

    expect(walletServiceMocks.saveWallet).toHaveBeenCalledTimes(1);
    expect(itemsServiceMocks.updateItem).not.toHaveBeenCalled();
  });

  test('editing a wallet updates name/notes in the index only — never the keychain', async () => {
    const editItem = makeWalletItem('0xAbc', 'OldName', 'wid-9');
    editItem.fields.notes = 'old note';
    renderDialog({ editItem, editSecrets: {} });

    await setField('Name', 'NewName');
    await setField('Notes (optional)', 'new note');
    await save();

    const call = itemsServiceMocks.updateItem.mock.calls[0][0];
    expect(call).toEqual({
      id: 'wid-9',
      name: 'NewName',
      fields: { address: '0xAbc', notes: 'new note' },
    });
    // No secrets in the payload → main process never touches the keychain.
    expect('secrets' in call).toBe(false);
    expect(itemsServiceMocks.getItemSecrets).not.toHaveBeenCalled();
  });

  test('editing a custom item keeps notes out of the dynamic field rows', async () => {
    const editItem = makeItem({
      name: 'cf/main',
      type: 'custom',
      fields: { email: 'a@b.c', notes: 'remember me' },
      secretFields: ['token'],
    });
    renderDialog({ editItem, editSecrets: { token: 't-1' } });

    // The notes value lives in the Notes box, not in a key/value row.
    expect(screen.getByLabelText('Notes (optional)').value).toBe('remember me');
    const keyInputs = screen.getAllByLabelText('Field name').map((el) => el.value);
    expect(keyInputs).toEqual(['email', 'token']);

    await save();

    expect(itemsServiceMocks.updateItem).toHaveBeenCalledWith({
      id: editItem.id,
      name: 'cf/main',
      fields: { email: 'a@b.c', notes: 'remember me' },
      secretFields: ['token'],
      secrets: { token: 't-1' },
    });
  });
});
