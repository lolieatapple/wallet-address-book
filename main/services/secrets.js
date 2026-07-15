import keytar from 'keytar';

// Keychain payload handling for Secret Holder items.
//
// Two formats coexist:
//  - legacy wallet items (service 'wallet-addr-book', account = address):
//      { name, pk }
//  - new items (service 'secret-holder', account = item id):
//      { name, type, secrets: { fieldKey: value } }
//
// Legacy items are migrated lazily: they stay under the old service until the
// item itself is rewritten (edit), so no bulk keychain writes ever happen.
// TouchID prompting is the CALLER's job (IPC / HTTP layer) — this module only
// moves bytes so it stays unit-testable without Electron.

export const LEGACY_SERVICE = 'wallet-addr-book';
export const SERVICE_NAME = 'secret-holder';

// Normalizes either payload format to { name, secrets: {k:v} }.
export function parseSecretPayload(raw) {
  const parsed = JSON.parse(raw);
  if (parsed.secrets) {
    return { name: parsed.name, secrets: parsed.secrets };
  }
  // Legacy wallet format { name, pk }
  return { name: parsed.name, secrets: { pk: parsed.pk } };
}

export function serializeSecretPayload({ name, type, secrets }) {
  return JSON.stringify({ name, type, secrets });
}

export async function readSecrets(locator) {
  const raw = await keytar.getPassword(locator.service, locator.account);
  if (!raw) return null;
  return parseSecretPayload(raw);
}

export async function writeSecrets(locator, payload) {
  await keytar.setPassword(locator.service, locator.account, serializeSecretPayload(payload));
}

export async function deleteSecrets(locator) {
  return keytar.deletePassword(locator.service, locator.account);
}
