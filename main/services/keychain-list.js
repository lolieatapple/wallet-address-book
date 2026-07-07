import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Parses `security dump-keychain` output (attributes only) and returns the
// account names of all generic-password items belonging to `service`.
// Exported separately so the parser can be unit-tested against real output.
export function parseDumpKeychain(dump, service) {
  const accounts = [];
  for (const block of dump.split(/^keychain: /m)) {
    if (!block.includes(`"svce"<blob>="${service}"`)) continue;
    const m = block.match(/"acct"<blob>="([^"]+)"/);
    if (m) accounts.push(m[1]);
  }
  return accounts;
}

// Lists keychain account names for a service by reading item ATTRIBUTES only.
// `security dump-keychain` without -d never decrypts secrets, so unlike
// keytar.findCredentials (which decrypts every item, triggering one macOS
// ACL password prompt per item) this can never pop a dialog.
export async function listKeychainAccounts(service) {
  const { stdout } = await execFileAsync('security', ['dump-keychain'], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return parseDumpKeychain(stdout, service);
}
