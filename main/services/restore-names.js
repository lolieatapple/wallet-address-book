import keytar from 'keytar';
import { getWalletList, healWalletName } from './wallet-index';

const SERVICE_NAME = 'wallet-addr-book';

// Bulk-heals migrated placeholder names (name === address) by decrypting each
// wallet's secret once. Each decryption raises the per-item macOS ACL dialog;
// answering "Always Allow" there permanently whitelists this app binary for
// that item, so future reads (copy pk, HTTP API) stop prompting. Names are
// persisted per wallet as they are restored, so a denied prompt aborts the
// run but keeps the progress — a re-run continues with the remainder.
export async function restoreWalletNames() {
  const placeholders = (await getWalletList()).filter((w) => w.name === w.address);
  let restored = 0;
  for (const w of placeholders) {
    const raw = await keytar.getPassword(SERVICE_NAME, w.address);
    if (!raw) continue; // index entry whose keychain item is gone
    healWalletName(w.address, JSON.parse(raw).name);
    restored++;
  }
  return { pending: placeholders.length, restored };
}
