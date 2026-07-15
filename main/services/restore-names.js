import { getItems, healItemName } from './item-index';
import { readSecrets } from './secrets';

// Bulk-heals migrated placeholder names (name === address) by decrypting each
// wallet's secret once. Each decryption raises the per-item macOS ACL dialog;
// answering "Always Allow" there permanently whitelists this app binary for
// that item, so future reads (copy pk, HTTP API) stop prompting. Names are
// persisted per item as they are restored, so a denied prompt aborts the
// run but keeps the progress — a re-run continues with the remainder.
export async function restoreWalletNames() {
  const items = await getItems();
  const placeholders = items.filter(
    (it) => it.type === 'wallet' && it.name === it.fields.address
  );
  let restored = 0;
  for (const item of placeholders) {
    const payload = await readSecrets(item.keychain);
    if (!payload) continue; // index entry whose keychain item is gone
    healItemName(item.id, payload.name);
    restored++;
  }
  return { pending: placeholders.length, restored };
}
