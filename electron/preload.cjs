// Context bridge: the only surface the game sees. Presence of
// window.electronAPI is the renderer's "am I in the desktop shell" check;
// its absence (plain web) must change nothing.
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_STEAM_CONFIG = Object.freeze({
    backendUrl: 'http://localhost:3001',
    appId: 1247290,
    authIdentity: 'hunker-bunker-backend'
});

function readBundledSteamConfig() {
    const candidates = [
        path.join(__dirname, 'steam-config.json')
    ];

    if (process.resourcesPath) {
        candidates.push(
            path.join(process.resourcesPath, 'app', 'electron', 'steam-config.json'),
            path.join(process.resourcesPath, 'app.asar', 'electron', 'steam-config.json')
        );
    }

    for (const candidate of candidates) {
        try {
            if (!fs.existsSync(candidate)) continue;
            return JSON.parse(fs.readFileSync(candidate, 'utf8'));
        } catch (err) {
            console.warn(`[steam] failed to read bundled config at ${candidate}:`, err);
        }
    }
    return {};
}

function cleanConfigString(value, fallback) {
    const cleaned = String(value ?? '').trim();
    return cleaned || fallback;
}

function cleanBackendUrl(value) {
    const raw = cleanConfigString(value, DEFAULT_STEAM_CONFIG.backendUrl);
    try {
        return new URL(raw).toString().replace(/\/$/, '');
    } catch {
        return DEFAULT_STEAM_CONFIG.backendUrl;
    }
}

function cleanAppId(value) {
    const appId = Number(value);
    return Number.isInteger(appId) && appId > 0 ? appId : DEFAULT_STEAM_CONFIG.appId;
}

const BUNDLED_STEAM_CONFIG = readBundledSteamConfig();
const STEAM_BACKEND_URL = cleanBackendUrl(
    BUNDLED_STEAM_CONFIG.backendUrl ?? process.env.HB_STEAM_BACKEND_URL
);
const STEAM_APP_ID = cleanAppId(
    BUNDLED_STEAM_CONFIG.appId ?? process.env.HB_STEAM_APPID
);
const STEAM_AUTH_IDENTITY = cleanConfigString(
    BUNDLED_STEAM_CONFIG.authIdentity ?? process.env.HB_STEAM_AUTH_IDENTITY,
    DEFAULT_STEAM_CONFIG.authIdentity
);

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
                appId: ticket.appId ?? STEAM_APP_ID
            }
        });
    } finally {
        if (ticket.handle) {
            await ipcRenderer.invoke('hb:cancelSteamAuthTicket', ticket.handle);
        }
    }
}

async function withSteamAuthTicketGet(path, queryParams = {}, { identity = STEAM_AUTH_IDENTITY } = {}) {
    const ticket = await ipcRenderer.invoke('hb:getSteamAuthTicket', identity);
    if (!ticket?.ok) return ticket;

    try {
        const urlParams = new URLSearchParams();
        urlParams.append('ticketHex', ticket.ticketHex);
        urlParams.append('identity', ticket.identity ?? identity);
        urlParams.append('appId', String(ticket.appId ?? STEAM_APP_ID));

        for (const [key, value] of Object.entries(queryParams)) {
            urlParams.append(key, String(value));
        }

        return await requestSteamBackend(`${path}?${urlParams.toString()}`, {
            method: 'GET'
        });
    } finally {
        if (ticket.handle) {
            await ipcRenderer.invoke('hb:cancelSteamAuthTicket', ticket.handle);
        }
    }
}

async function submitSteamRunScore(payload = {}) {
    const ticket = await ipcRenderer.invoke('hb:getSteamAuthTicket', STEAM_AUTH_IDENTITY);
    if (ticket?.ok) {
        try {
            return await requestSteamBackend('/steam/leaderboards/submit-run', {
                method: 'POST',
                body: {
                    payload,
                    ticketHex: ticket.ticketHex,
                    identity: ticket.identity ?? STEAM_AUTH_IDENTITY,
                    appId: ticket.appId ?? STEAM_APP_ID
                }
            });
        } finally {
            if (ticket.handle) {
                await ipcRenderer.invoke('hb:cancelSteamAuthTicket', ticket.handle);
            }
        }
    }

    return requestSteamBackend('/steam/leaderboards/submit-run', {
        method: 'POST',
        body: {
            payload,
            mockMode: true,
            authFallbackReason: ticket?.reason ?? 'steam_auth_unavailable'
        }
    });
}

function getSteamLeaderboard(board, optionsOrType = {}, maybeCount = 10) {
    const options = typeof optionsOrType === 'string'
        ? { type: optionsOrType, count: maybeCount }
        : (optionsOrType ?? {});
    const urlParams = new URLSearchParams();
    if (options.type != null) urlParams.set('type', String(options.type));
    if (options.dataRequest != null) urlParams.set('dataRequest', String(options.dataRequest));
    if (options.count != null) urlParams.set('count', String(options.count));
    if (options.rangeStart != null) urlParams.set('rangeStart', String(options.rangeStart));
    if (options.rangeEnd != null) urlParams.set('rangeEnd', String(options.rangeEnd));
    const suffix = urlParams.toString() ? `?${urlParams.toString()}` : '';
    return requestSteamBackend(`/steam/leaderboards/${encodeURIComponent(board)}${suffix}`);
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
    submitSteamRunScore,
    refreshSteamInventory: () => withSteamAuthTicketGet('/steam/inventory'),
    triggerSteamPlaytimeDrop: () => withSteamAuthTicket('/steam/inventory/trigger-drop'),
    requestSteamMilestoneGrant: (milestone, runKey) => withSteamAuthTicket('/steam/inventory/grant-milestone', { milestone, runKey }),
    exchangeSteamInventory: (recipeId, materials) => withSteamAuthTicket('/steam/inventory/exchange', { recipeId, materials }),
    getSteamMarketEligibility: () => withSteamAuthTicketGet('/steam/market/eligibility'),
    getSteamStoreCatalog: () => requestSteamBackend('/steam/store/catalog'),
    purchaseSteamKeys: (sku, requestId = `store-${Date.now()}-${Math.random().toString(36).slice(2)}`) => (
        withSteamAuthTicket('/steam/store/purchase/init', { sku, requestId })
    ),
    finalizeSteamPurchase: (transId) => withSteamAuthTicket('/steam/store/purchase/finalize', { transId }),
    openSteamCache: (cacheItemId, keyItemId, requestId = `cache-${Date.now()}-${Math.random().toString(36).slice(2)}`) => (
        withSteamAuthTicket('/steam/inventory/exchange', { recipeId: 4100, materials: [cacheItemId, keyItemId], requestId })
    ),
    getSteamLeaderboard,
    openSteamOverlayToUrl: (url) => ipcRenderer.invoke('hb:openSteamOverlayToUrl', url),
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
