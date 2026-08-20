// Steam Cloud save bridge (docs/steamstorestatus.log Steam Cloud section +
// electron/save-contract.cjs / electron/main.cjs's hb:saveDataChanged
// handler). electron/main.cjs already mirrors hb_*-prefixed localStorage
// writes into save.json -- the exact file Steam Cloud's configured
// Auto-Cloud path (WinAppDataRoaming/Hunker Bunker/save.json,
// LinuxXdgDataHome override for Linux+SteamOS) watches. That bridge was
// fully built (electron/preload.cjs's onSaveDataChanged/onSaveDataRemoved,
// electron/save-contract.cjs's sanitizeSaveData/KNOWN_SAVE_KEYS registry)
// but nothing in the actual game ever called it -- every hb_*-prefixed
// write (achievements, bank, profile, act2, arc, loadout, codex,
// fabricator, black box, world memory, RGB minigame, settings, etc.) went
// straight to plain browser localStorage and never reached Electron, so
// Steam Cloud would sync an empty/stale file. Local play was unaffected
// (Chromium's own localStorage persists fine on one machine) -- only
// cross-device Steam Cloud restore was silently broken.
//
// Fixed generically here instead of hunting down every individual
// localStorage.setItem call site across achievements.js/bank.js/profile.js/
// etc: wraps the storage object's setItem/removeItem once, matching the
// hb_* prefix electron/save-contract.cjs's sanitizeSaveData already
// enforces, so every current AND future hb_* key is covered automatically.

const HB_SAVE_KEY_PATTERN = /^hb_[a-zA-Z0-9_]+$/;

// Installs the bridge on `storage` (real signature: window.localStorage),
// forwarding matching writes/removals to `electronAPI` (real signature:
// window.electronAPI). No-ops (returns false) outside Electron -- a plain
// browser tab has no onSaveDataChanged to forward to, and shouldn't try.
// Also does a one-time bootstrap sync of every hb_* key already present in
// storage at install time, so existing players' progress reaches
// save.json on their first launch after this ships, not only future
// writes.
export function installSteamCloudSaveBridge({ storage, electronAPI } = {}) {
    if (!storage || typeof storage.setItem !== 'function' || !electronAPI?.onSaveDataChanged) {
        return false;
    }

    const originalSetItem = storage.setItem.bind(storage);
    const originalRemoveItem = typeof storage.removeItem === 'function' ? storage.removeItem.bind(storage) : null;

    for (let i = 0; i < (storage.length ?? 0); i++) {
        const key = storage.key(i);
        if (key && HB_SAVE_KEY_PATTERN.test(key)) {
            try {
                electronAPI.onSaveDataChanged(key, storage.getItem(key));
            } catch {
                // best effort -- a bootstrap-sync failure shouldn't block startup
            }
        }
    }

    storage.setItem = (key, value) => {
        originalSetItem(key, value);
        if (HB_SAVE_KEY_PATTERN.test(key)) {
            try {
                electronAPI.onSaveDataChanged(key, value);
            } catch {
                // best effort -- local save already succeeded above
            }
        }
    };

    if (originalRemoveItem && electronAPI.onSaveDataRemoved) {
        storage.removeItem = (key) => {
            originalRemoveItem(key);
            if (HB_SAVE_KEY_PATTERN.test(key)) {
                try {
                    electronAPI.onSaveDataRemoved(key);
                } catch {
                    // best effort
                }
            }
        };
    }

    return true;
}
