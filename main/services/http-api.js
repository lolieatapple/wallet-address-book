import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { systemPreferences } from 'electron';
import keytar from 'keytar';
import Store from 'electron-store';
import { getWalletList, healWalletName } from './wallet-index';

const store = new Store({ name: 'default-wallet' });
const SERVICE_NAME = 'wallet-addr-book';
const SOCKET_DIR = path.join(os.homedir(), '.wallet-address-book');
const SOCKET_PATH = path.join(SOCKET_DIR, 'api.sock');

let server = null;

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function getPrivateKeyWithAuth(address, purpose) {
  await systemPreferences.promptTouchID(purpose);
  const raw = await keytar.getPassword(SERVICE_NAME, address);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  // The secret is decrypted anyway — use its name to replace a migration
  // placeholder in the index (no extra keychain access, no extra prompt).
  healWalletName(address, parsed.name);
  return parsed.pk;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (req.method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  try {
    // GET /default/address
    if (path === '/default/address') {
      const addr = store.get('defaultAddress');
      if (!addr) {
        return jsonResponse(res, 404, { error: 'No default wallet set' });
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(addr);
    }

    // GET /default/pk
    if (path === '/default/pk') {
      const addr = store.get('defaultAddress');
      if (!addr) {
        return jsonResponse(res, 404, { error: 'No default wallet set' });
      }
      const pk = await getPrivateKeyWithAuth(addr, `API: Read private key of default wallet ${addr}`);
      if (!pk) {
        return jsonResponse(res, 404, { error: `Default wallet ${addr} not found in keychain` });
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(pk);
    }

    // GET /wallet/:address/pk — address-based, immune to index shifts
    const addrPkMatch = path.match(/^\/wallet\/(0x[0-9a-fA-F]{40})\/pk$/);
    if (addrPkMatch) {
      const address = addrPkMatch[1];
      const pk = await getPrivateKeyWithAuth(address, `API: Read private key of ${address}`);
      if (!pk) {
        return jsonResponse(res, 404, { error: `Wallet ${address} not found` });
      }
      return jsonResponse(res, 200, { address, privateKey: pk });
    }

    // GET /wallet/:index/address
    const addrMatch = path.match(/^\/wallet\/(\d+)\/address$/);
    if (addrMatch) {
      const idx = parseInt(addrMatch[1], 10);
      const wallets = await getWalletList();
      if (idx < 1 || idx > wallets.length) {
        return jsonResponse(res, 404, { error: `Wallet #${idx} not found. Total: ${wallets.length}` });
      }
      return jsonResponse(res, 200, { index: idx, address: wallets[idx - 1].address });
    }

    // GET /wallet/:index/pk
    const pkMatch = path.match(/^\/wallet\/(\d+)\/pk$/);
    if (pkMatch) {
      const idx = parseInt(pkMatch[1], 10);
      const wallets = await getWalletList();
      if (idx < 1 || idx > wallets.length) {
        return jsonResponse(res, 404, { error: `Wallet #${idx} not found. Total: ${wallets.length}` });
      }
      const address = wallets[idx - 1].address;
      // Show the full address in the TouchID prompt so the user can verify
      // which key is being read — the index alone can shift between calls.
      const pk = await getPrivateKeyWithAuth(address, `API: Read private key for wallet #${idx} (${address})`);
      if (!pk) {
        return jsonResponse(res, 404, { error: `Wallet ${address} not found` });
      }
      return jsonResponse(res, 200, { index: idx, address, privateKey: pk });
    }

    // GET /wallets — list all addresses (from the non-secret index; must
    // never enumerate keychain secrets, which prompts once per item)
    if (path === '/wallets') {
      const wallets = await getWalletList();
      const defaultAddr = store.get('defaultAddress');
      const list = wallets.map((w, i) => ({
        index: i + 1,
        name: w.name,
        address: w.address,
        isDefault: w.address === defaultAddr,
      }));
      return jsonResponse(res, 200, { wallets: list });
    }

    return jsonResponse(res, 404, { error: 'Unknown endpoint' });
  } catch (err) {
    // TouchID denied or other errors
    return jsonResponse(res, 403, { error: 'Authentication failed or denied' });
  }
}

export function startHttpApi(socketPath = SOCKET_PATH) {
  // Unix domain socket instead of a TCP port: browsers cannot reach it
  // (no DNS-rebinding/CSRF surface) and the 0600 file mode restricts
  // access to the current user.
  fs.mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }

  server = http.createServer(handleRequest);
  server.on('error', (err) => {
    console.error('HTTP API server error:', err);
  });
  server.listen(socketPath, () => {
    fs.chmodSync(socketPath, 0o600);
    console.log(`HTTP API listening on unix socket ${socketPath}`);
  });
  return server;
}

export function stopHttpApi() {
  if (server) {
    server.close();
    server = null;
  }
}

export function getDefaultAddress() {
  return store.get('defaultAddress') || null;
}

export function setDefaultAddress(address) {
  if (address) {
    store.set('defaultAddress', address);
  } else {
    store.delete('defaultAddress');
  }
}
