import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { systemPreferences } from 'electron';
import Store from 'electron-store';
import { getItems, getWalletEntries, findWalletByAddress, findByName, healItemName } from './item-index';
import { readSecrets } from './secrets';

const store = new Store({ name: 'default-wallet' });
const SOCKET_DIR = path.join(os.homedir(), '.wallet-address-book');
const SOCKET_PATH = path.join(SOCKET_DIR, 'api.sock');

let server = null;

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function textResponse(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(text);
}

async function getPrivateKeyWithAuth(address, purpose) {
  const item = findWalletByAddress(address);
  if (!item) return null;
  await systemPreferences.promptTouchID(purpose);
  const payload = await readSecrets(item.keychain);
  if (!payload) return null;
  // The secret is decrypted anyway — use its name to replace a migration
  // placeholder in the index (no extra keychain access, no extra prompt).
  healItemName(item.id, payload.name);
  return payload.secrets.pk;
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
      return textResponse(res, 200, addr);
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
      return textResponse(res, 200, pk);
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
      const wallets = await getWalletEntries();
      if (idx < 1 || idx > wallets.length) {
        return jsonResponse(res, 404, { error: `Wallet #${idx} not found. Total: ${wallets.length}` });
      }
      return jsonResponse(res, 200, { index: idx, address: wallets[idx - 1].address });
    }

    // GET /wallet/:index/pk
    const pkMatch = path.match(/^\/wallet\/(\d+)\/pk$/);
    if (pkMatch) {
      const idx = parseInt(pkMatch[1], 10);
      const wallets = await getWalletEntries();
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
      const wallets = await getWalletEntries();
      const defaultAddr = store.get('defaultAddress');
      const list = wallets.map((w, i) => ({
        index: i + 1,
        name: w.name,
        address: w.address,
        isDefault: w.address === defaultAddr,
      }));
      return jsonResponse(res, 200, { wallets: list });
    }

    // GET /items — list all items: names, types, plaintext fields and the
    // NAMES of secret fields (never their values; zero prompts)
    if (path === '/items') {
      const items = await getItems();
      const list = items.map((it) => ({
        name: it.name,
        type: it.type,
        fields: it.fields,
        secretFields: it.secretFields,
        updatedAt: it.updatedAt,
      }));
      return jsonResponse(res, 200, { items: list });
    }

    // GET /item?name=<name>[&field=<key>] — item names may contain '/'
    // (group separator), so the name travels as a query param, not a path.
    // Without `field`: returns the full item incl. decrypted secrets (one
    // TouchID). With `field`: returns that single value as text/plain —
    // plaintext fields need no auth, secret fields prompt TouchID.
    if (path === '/item') {
      const name = url.searchParams.get('name');
      if (!name) {
        return jsonResponse(res, 400, { error: 'Missing required query param: name' });
      }
      const item = findByName(name);
      if (!item) {
        return jsonResponse(res, 404, { error: `Item "${name}" not found` });
      }

      const field = url.searchParams.get('field');
      if (field) {
        if (field in item.fields) {
          return textResponse(res, 200, String(item.fields[field]));
        }
        if (item.secretFields.includes(field)) {
          await systemPreferences.promptTouchID(`API: Read secret "${field}" of ${item.name}`);
          const payload = await readSecrets(item.keychain);
          if (!payload || !(field in payload.secrets)) {
            return jsonResponse(res, 404, { error: `Secret field "${field}" of "${name}" not found in keychain` });
          }
          healItemName(item.id, payload.name);
          return textResponse(res, 200, String(payload.secrets[field]));
        }
        return jsonResponse(res, 404, { error: `Item "${name}" has no field "${field}"` });
      }

      let secrets = {};
      if (item.secretFields.length > 0) {
        await systemPreferences.promptTouchID(`API: Read all secrets of ${item.name}`);
        const payload = await readSecrets(item.keychain);
        if (payload) {
          healItemName(item.id, payload.name);
          secrets = payload.secrets;
        }
      }
      return jsonResponse(res, 200, {
        name: item.name,
        type: item.type,
        fields: item.fields,
        secrets,
      });
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
