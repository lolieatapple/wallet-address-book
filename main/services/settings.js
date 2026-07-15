import Store from 'electron-store';

const store = new Store({ name: 'settings' });

// Clipboard auto-clear is OFF by default: users with clipboard history
// managers gain nothing from it, so it's strictly opt-in.
const DEFAULTS = {
  clipboardAutoClear: false,
  clipboardClearDelaySec: 30,
};

export function getSettings() {
  return { ...DEFAULTS, ...(store.get('settings') || {}) };
}

export function updateSettings(patch) {
  const next = { ...getSettings(), ...patch };
  store.set('settings', next);
  return next;
}
