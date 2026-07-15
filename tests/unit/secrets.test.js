import { test, expect, describe, mock, beforeEach } from 'bun:test';

const mockGetPassword = mock(() => Promise.resolve(null));
const mockSetPassword = mock(() => Promise.resolve());
const mockDeletePassword = mock(() => Promise.resolve(true));

mock.module('keytar', () => ({
  __esModule: true,
  default: {
    getPassword: (...args) => mockGetPassword(...args),
    setPassword: (...args) => mockSetPassword(...args),
    deletePassword: (...args) => mockDeletePassword(...args),
  },
}));

const { parseSecretPayload, serializeSecretPayload, readSecrets, writeSecrets } = await import(
  '../../main/services/secrets'
);

describe('secret payload formats', () => {
  beforeEach(() => {
    mockGetPassword.mockReset();
    mockSetPassword.mockReset();
  });

  test('legacy wallet format {name, pk} is normalized to secrets.pk', () => {
    const payload = parseSecretPayload('{"name":"Alice","pk":"0xDEAD"}');
    expect(payload).toEqual({ name: 'Alice', secrets: { pk: '0xDEAD' } });
  });

  test('new format {name, type, secrets} passes through', () => {
    const payload = parseSecretPayload(JSON.stringify({
      name: 'openai/prod',
      type: 'apikey',
      secrets: { apikey: 'sk-1', seckey: 'sec-2' },
    }));
    expect(payload).toEqual({ name: 'openai/prod', secrets: { apikey: 'sk-1', seckey: 'sec-2' } });
  });

  test('serialize → parse round-trip preserves all secret fields', () => {
    const raw = serializeSecretPayload({
      name: 'cf/main',
      type: 'custom',
      secrets: { token: 't-1', extra: 'e-2' },
    });
    expect(parseSecretPayload(raw)).toEqual({
      name: 'cf/main',
      secrets: { token: 't-1', extra: 'e-2' },
    });
  });

  test('readSecrets uses the item locator and returns null for missing items', async () => {
    mockGetPassword.mockResolvedValueOnce(null);
    const missing = await readSecrets({ service: 'secret-holder', account: 'id-1' });
    expect(missing).toBeNull();
    expect(mockGetPassword).toHaveBeenCalledWith('secret-holder', 'id-1');

    mockGetPassword.mockResolvedValueOnce('{"name":"A","pk":"0x1"}');
    const legacy = await readSecrets({ service: 'wallet-addr-book', account: '0xA' });
    expect(legacy.secrets.pk).toBe('0x1');
  });

  test('writeSecrets serializes to the new format at the locator', async () => {
    await writeSecrets(
      { service: 'secret-holder', account: 'id-9' },
      { name: 'n', type: 'ssh', secrets: { password: 'p' } }
    );
    expect(mockSetPassword).toHaveBeenCalledWith(
      'secret-holder',
      'id-9',
      JSON.stringify({ name: 'n', type: 'ssh', secrets: { password: 'p' } })
    );
  });
});
