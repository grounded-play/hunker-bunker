// Context bridge: the only surface the game sees. Presence of
// window.electronAPI is the renderer's "am I in the desktop shell" check;
// its absence (plain web) must change nothing.
const { contextBridge, ipcRenderer } = require('electron');

const STEAM_BACKEND_URL = process.env.HB_STEAM_BACKEND_URL ?? 'http://localhost:3001';
const STEAM_AUTH_IDENTITY = process.env.HB_STEAM_AUTH_IDENTITY ?? 'hunker-bunker-backend';

function steamBackendUrl(path) {
    return new URL(path, STEAM_BACKEND_URL.endsWith('/') ? STEAM_BACKEND_URL : `${STEAM_BACKEND_URL}/`).toString();
}

async function requestSteamBackend(path, { method = 'GET', body = null } = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, reason: 'fetch_unavailable' };
    }

    try {
        const response = await fetch(steamBackendUrl(path), {
            method,
            headers: body ? { 'content-type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await response.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { message: text };
        }
        return {
            ...data,
            ok: response.ok && data?.ok !== false,
            status: response.status
        };
    } catch (err) {
        return {
            ok: false,
            reason: 'steam_backend_unreachable',
            message: err?.message ?? String(err)
        };
    }
}

async function withSteamAuthTicket(path, payload = {}, { method = 'POST', identity = STEAM_AUTH_IDENTITY } = {}) {
    const ticket = await ipcRenderer.invoke('hb:getSteamAuthTicket', identity);
    if (!ticket?.ok) return ticket;

    try {
        return await requestSteamBackend(path, {
            method,
            body: {
                ...payload,
                ticketHex: ticket.ticketHex,
                identity: ticket.identity ?? identity,
                appId: ticket.appId
            }
        });
    } finally {
        if (ticket.handle) {
            await ipcRenderer.invoke('hb:cancelSteamAuthTicket', ticket.handle);
        }
    }
}

// Restore the save file into localStorage BEFORE any page script runs.
// localStorage values are shared across isolated worlds, so writing here is
// visible to the game; only method *patching* needs the main world (the
// inline script in index.html handles that half).
try {
    const saved = ipcRenderer.sendSync('hb:getSaveDataSync') ?? {};
    for (const [key, value] of Object.entries(saved)) {
        if (key.startsWith('hb_')) window.localStorage.setItem(key, value);
    }
} catch (err) {
    console.warn('[hb] save restore failed:', err);
}

contextBridge.exposeInMainWorld('electronAPI', {
    getSaveData: () => ipcRenderer.invoke('hb:getSaveData'),
    onSaveDataChanged: (key, value) => ipcRenderer.send('hb:saveDataChanged', key, value),
    onSaveDataRemoved: (key) => ipcRenderer.send('hb:saveDataRemoved', key),
    unlockAchievement: (key) => ipcRenderer.send('hb:unlockAchievement', key),
    setStat: (key, value) => ipcRenderer.send('hb:setStat', key, value),
    getSteamInfo: () => ipcRenderer.invoke('hb:steamInfo'),
    getSteamIdentity: () => ipcRenderer.invoke('hb:getSteamIdentity'),
    getSteamAuthTicket: (identity = STEAM_AUTH_IDENTITY) => ipcRenderer.invoke('hb:getSteamAuthTicket', identity),
    cancelSteamAuthTicket: (handle) => ipcRenderer.invoke('hb:cancelSteamAuthTicket', handle),
    getSteamBackendHealth: () => requestSteamBackend('/health'),
    createSteamSession: (identity = STEAM_AUTH_IDENTITY) => withSteamAuthTicket('/steam/session', {}, { identity }),
    submitSteamRunScore: (payload = {}) => withSteamAuthTicket('/steam/leaderboards/submit-run', { payload }),
    refreshSteamInventory: () => withSteamAuthTicket('/steam/inventory/refresh'),
    requestSteamItemGrant: (payload = {}) => withSteamAuthTicket('/steam/inventory/grant', { payload }),
    setSteamInputPhase: (phase) => ipcRenderer.send('hb:steamInputPhase', phase),
    showGamepadTextInput: (inputMode, lineMode, description, maxCharacters, existingText) => ipcRenderer.invoke(
        'hb:showGamepadTextInput',
        inputMode,
        lineMode,
        description,
        maxCharacters,
        existingText
    ),
    showFloatingGamepadTextInput: (keyboardMode, x, y, width, height) => ipcRenderer.invoke(
        'hb:showFloatingGamepadTextInput',
        keyboardMode,
        x,
        y,
        width,
        height
    ),
    onSteamInputState: (handler) => {
        const listener = (_event, snapshot) => handler(snapshot);
        ipcRenderer.on('hb:steamInputState', listener);
        return () => ipcRenderer.removeListener('hb:steamInputState', listener);
    }
});
