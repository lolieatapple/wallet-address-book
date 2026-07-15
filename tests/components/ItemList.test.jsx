import { test, expect, describe, beforeEach, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { itemsServiceMocks, resetAllMocks, makeItem } from '../mocks';
import ItemList from '../../renderer/components/ItemList';

const noop = () => {};

describe('ItemList', () => {
  afterEach(cleanup);
  beforeEach(resetAllMocks);

  test('shows empty state', () => {
    render(<ItemList items={[]} title="API Keys" onMessage={noop} onOpenDetail={noop} />);
    expect(screen.getByText('No items yet. Click New to add one.')).toBeTruthy();
  });

  test('groups slash-named items under a collapsible header', () => {
    const items = [
      makeItem({ name: 'solo', type: 'apikey', secretFields: ['apikey'] }),
      makeItem({ name: 'openai/prod', type: 'apikey', secretFields: ['apikey'] }),
      makeItem({ name: 'openai/dev', type: 'apikey', secretFields: ['apikey'] }),
    ];
    render(<ItemList items={items} title="API Keys" onMessage={noop} onOpenDetail={noop} />);

    const header = screen.getByText('openai/ (2)');
    expect(screen.getByText('openai/prod')).toBeTruthy();

    fireEvent.click(header);
    expect(screen.queryByText('openai/prod')).toBeNull();
    expect(screen.queryByText('openai/dev')).toBeNull();
    expect(screen.getByText('solo')).toBeTruthy();
  });

  test('one-click secret copy decrypts via getItemSecrets and uses sensitive copy', async () => {
    const item = makeItem({
      name: 'openai/prod',
      type: 'apikey',
      fields: { url: 'https://api.openai.com' },
      secretFields: ['apikey', 'seckey'],
    });
    itemsServiceMocks.getItemSecrets.mockResolvedValueOnce({ apikey: 'sk-123', seckey: 's-9' });
    const messages = [];

    render(<ItemList items={[item]} title="API Keys" onMessage={(m) => messages.push(m)} onOpenDetail={noop} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText('copy secret of openai/prod'));
    });

    expect(itemsServiceMocks.getItemSecrets).toHaveBeenCalledWith(item.id);
    // The PRIMARY secret field (first in the list) is copied, sensitively.
    expect(itemsServiceMocks.copySecretText).toHaveBeenCalledWith('sk-123');
    expect(messages[0]).toContain('copied');
  });

  test('a denied TouchID surfaces as a message, not a crash', async () => {
    const item = makeItem({ name: 'k', type: 'apikey', secretFields: ['apikey'] });
    itemsServiceMocks.getItemSecrets.mockRejectedValueOnce(new Error('User denied'));
    const messages = [];

    render(<ItemList items={[item]} title="API Keys" onMessage={(m) => messages.push(m)} onOpenDetail={noop} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText('copy secret of k'));
    });

    expect(itemsServiceMocks.copySecretText).not.toHaveBeenCalled();
    expect(messages[0]).toContain('User denied');
  });

  test('clicking the name opens the detail drawer callback', () => {
    const item = makeItem({ name: 'deploy', type: 'ssh', fields: { host: 'root@h' }, secretFields: ['password'] });
    const opened = [];
    render(<ItemList items={[item]} title="SSH" onMessage={noop} onOpenDetail={(it) => opened.push(it)} />);

    fireEvent.click(screen.getByText('deploy'));
    expect(opened[0].id).toBe(item.id);
  });
});
