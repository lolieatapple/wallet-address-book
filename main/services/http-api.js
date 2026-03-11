import http from 'http';
import { systemPreferences } from 'electron';
import keytar from 'keytar';
import Store from 'electron-store';

const store = new Store({ name: 'default-wallet' });
const SERVICE_NAME = 'wallet-addr-book';
const PORT = 63333;

let server = null;

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function getAllCredentials() {
  return (await keytar.findCredentials(SERVICE_NAME)) || [];
}

async function getPrivateKeyWithAuth(address, purpose) {
  await systemPreferences.promptTouchID(purpose);
  const raw = await keytar.getPassword(SERVICE_NAME, address);
  if (!raw) return null;
  return JSON.parse(raw).pk;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
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
      return jsonResponse(res, 200, { address: addr });
    }

    // GET /default/pk
    if (path === '/default/pk') {
      const addr = store.get('defaultAddress');
      if (!addr) {
        return jsonResponse(res, 404, { error: 'No default wallet set' });
      }
      const pk = await getPrivateKeyWithAuth(addr, 'API: Read default private key');
      return jsonResponse(res, 200, { address: addr, privateKey: pk });
    }

    // GET /wallet/:index/address
    const addrMatch = path.match(/^\/wallet\/(\d+)\/address$/);
    if (addrMatch) {
      const idx = parseInt(addrMatch[1], 10);
      const creds = await getAllCredentials();
      if (idx < 1 || idx > creds.length) {
        return jsonResponse(res, 404, { error: `Wallet #${idx} not found. Total: ${creds.length}` });
      }
      return jsonResponse(res, 200, { index: idx, address: creds[idx - 1].account });
    }

    // GET /wallet/:index/pk
    const pkMatch = path.match(/^\/wallet\/(\d+)\/pk$/);
    if (pkMatch) {
      const idx = parseInt(pkMatch[1], 10);
      const creds = await getAllCredentials();
      if (idx < 1 || idx > creds.length) {
        return jsonResponse(res, 404, { error: `Wallet #${idx} not found. Total: ${creds.length}` });
      }
      const address = creds[idx - 1].account;
      const pk = await getPrivateKeyWithAuth(address, `API: Read private key for wallet #${idx}`);
      return jsonResponse(res, 200, { index: idx, address, privateKey: pk });
    }

    // GET /wallets — list all addresses
    if (path === '/wallets') {
      const creds = await getAllCredentials();
      const defaultAddr = store.get('defaultAddress');
      const list = creds.map((c, i) => {
        const data = JSON.parse(c.password);
        return {
          index: i + 1,
          name: data.name,
          address: c.account,
          isDefault: c.account === defaultAddr,
        };
      });
      return jsonResponse(res, 200, { wallets: list });
    }

    return jsonResponse(res, 404, { error: 'Unknown endpoint' });
  } catch (err) {
    // TouchID denied or other errors
    return jsonResponse(res, 403, { error: 'Authentication failed or denied' });
  }
}

export function startHttpApi() {
  server = http.createServer(handleRequest);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`HTTP API listening on http://127.0.0.1:${PORT}`);
  });
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
