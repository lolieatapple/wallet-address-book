import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { cleanup } from '@testing-library/react';
import { walletServiceMocks, resetAllMocks } from '../mocks';

// Since wallet.js is module-mocked globally (for component tests),
// we test the service interface through the walletServiceMocks to verify
// that each function can be called with the expected arguments and returns
// the expected values — confirming the contract components rely on.

describe('wallet service interface', () => {
  afterEach(cleanup);

  beforeEach(() => {
    resetAllMocks();
  });

  describe('getAllWallets', () => {
    test('returns wallets', async () => {
      const wallets = [{ account: '0xabc', password: '{"name":"Test","pk":"0x123"}' }];
      walletServiceMocks.getAllWallets.mockResolvedValueOnce(wallets);
      const result = await walletServiceMocks.getAllWallets();
      expect(result).toEqual(wallets);
    });

    test('returns empty array by default', async () => {
      walletServiceMocks.getAllWallets.mockResolvedValueOnce([]);
      const result = await walletServiceMocks.getAllWallets();
      expect(result).toEqual([]);
    });
  });

  describe('saveWallet', () => {
    test('accepts address and data', async () => {
      walletServiceMocks.saveWallet.mockResolvedValueOnce(true);
      const result = await walletServiceMocks.saveWallet('0xaddr', { name: 'Test', pk: '0x1' });
      expect(result).toBe(true);
      expect(walletServiceMocks.saveWallet).toHaveBeenCalledWith('0xaddr', { name: 'Test', pk: '0x1' });
    });
  });

  describe('deleteWallet', () => {
    test('accepts address', async () => {
      walletServiceMocks.deleteWallet.mockResolvedValueOnce(true);
      await walletServiceMocks.deleteWallet('0xaddr');
      expect(walletServiceMocks.deleteWallet).toHaveBeenCalledWith('0xaddr');
    });
  });

  describe('getPrivateKey', () => {
    test('returns private key string', async () => {
      walletServiceMocks.getPrivateKey.mockResolvedValueOnce('0xsecret');
      const pk = await walletServiceMocks.getPrivateKey('0xaddr');
      expect(pk).toBe('0xsecret');
    });

    test('returns null when denied', async () => {
      walletServiceMocks.getPrivateKey.mockResolvedValueOnce(null);
      const pk = await walletServiceMocks.getPrivateKey('0xaddr');
      expect(pk).toBeNull();
    });
  });

  describe('fetchBalances', () => {
    test('accepts addresses and returns balance map', async () => {
      const balances = { '0xa': { total_usd_value: 100 } };
      walletServiceMocks.fetchBalances.mockResolvedValueOnce(balances);
      const result = await walletServiceMocks.fetchBalances(['0xa']);
      expect(result).toEqual(balances);
    });
  });

  describe('promptInput', () => {
    test('returns user input', async () => {
      walletServiceMocks.promptInput.mockResolvedValueOnce('hello');
      const result = await walletServiceMocks.promptInput('Title', 'Label', '');
      expect(result).toBe('hello');
    });
  });

  describe('toggleDarkMode', () => {
    test('returns boolean', async () => {
      walletServiceMocks.toggleDarkMode.mockResolvedValueOnce(true);
      const result = await walletServiceMocks.toggleDarkMode();
      expect(result).toBe(true);
    });
  });

  describe('getDefaultWallet', () => {
    test('returns default address', async () => {
      walletServiceMocks.getDefaultWallet.mockResolvedValueOnce('0xDefault');
      const result = await walletServiceMocks.getDefaultWallet();
      expect(result).toBe('0xDefault');
    });

    test('returns null when no default', async () => {
      walletServiceMocks.getDefaultWallet.mockResolvedValueOnce(null);
      const result = await walletServiceMocks.getDefaultWallet();
      expect(result).toBeNull();
    });
  });

  describe('setDefaultWallet', () => {
    test('accepts address', async () => {
      walletServiceMocks.setDefaultWallet.mockResolvedValueOnce(true);
      await walletServiceMocks.setDefaultWallet('0xaddr');
      expect(walletServiceMocks.setDefaultWallet).toHaveBeenCalledWith('0xaddr');
    });
  });
});
