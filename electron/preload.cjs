// Context bridge: the only surface the game sees. Presence of
// window.electronAPI is the renderer's "am I in the desktop shell" check;
// its absence (plain web) must change nothing.
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_STEAM_CONFIG = Object.freeze({
    backendUrl: 'http://localhost:3001',
    appId: 4957040,
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
const STEAM_SESSION_REFRESH_SKEW_MS = 30 * 1000;
const STEAM_BACKEND_TIMEOUT_MS = 5000;
let cachedSteamSession = null;
let pendingSteamSession = null;
let pendingSteamSessionIdentity = null;

function steamBackendUrl(path) {
    return new URL(path, STEAM_BACKEND_URL.endsWith('/') ? STEAM_BACKEND_URL : `${STEAM_BACKEND_URL}/`).toString();
}

async function requestSteamBackend(path, { method = 'GET', body = null, headers = {} } = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, reason: 'fetch_unavailable' };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), STEAM_BACKEND_TIMEOUT_MS);
        const requestHeaders = { ...headers };
        if (body) requestHeaders['content-type'] = 'application/json';

        let response;
        try {
            response = await fetch(steamBackendUrl(path), {
                method,
                headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }
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
            reason: err?.name === 'AbortError' ? 'steam_backend_timeout' : 'steam_backend_unreachable',
            timeoutMs: err?.name === 'AbortError' ? STEAM_BACKEND_TIMEOUT_MS : undefined,
            message: err?.message ?? String(err)
        };
    }
}

function isSteamSessionFresh(session) {
    return Boolean(
        session?.ok
        && session?.token
        && Number(session.expiresAt) - Date.now() > STEAM_SESSION_REFRESH_SKEW_MS
    );
}

function clearSteamSession() {
    cachedSteamSession = null;
}

async function mintSteamSession(identity = STEAM_AUTH_IDENTITY) {
    const ticket = await ipcRenderer.invoke('hb:getSteamAuthTicket', identity);
    if (!ticket?.ok) {
        return {
            ...(ticket ?? {}),
            ok: false,
            reason: ticket?.reason ?? 'steam_auth_unavailable',
            authTicketUnavailable: true
        };
    }

    try {
        const session = await requestSteamBackend('/steam/session', {
            method: 'POST',
            body: {
                ticketHex: ticket.ticketHex,
                identity: ticket.identity ?? identity,
                appId: ticket.appId ?? STEAM_APP_ID
            }
        });
        if (session?.ok && session?.token) {
            cachedSteamSession = {
                ...session,
                identity: session.identity ?? ticket.identity ?? identity
            };
            return cachedSteamSession;
        }
        return session;
    } finally {
        if (ticket.handle) {
            await ipcRenderer.invoke('hb:cancelSteamAuthTicket', ticket.handle);
        }
    }
}

async function getSteamSession(identity = STEAM_AUTH_IDENTITY, { forceRefresh = false } = {}) {
    const normalizedIdentity = cleanConfigString(identity, STEAM_AUTH_IDENTITY);
    if (
        !forceRefresh
        && cachedSteamSession?.identity === normalizedIdentity
        && isSteamSessionFresh(cachedSteamSession)
    ) {
        return cachedSteamSession;
    }

    if (!forceRefresh && pendingSteamSession && pendingSteamSessionIdentity === normalizedIdentity) {
        return pendingSteamSession;
    }

    pendingSteamSessionIdentity = normalizedIdentity;
    pendingSteamSession = mintSteamSession(normalizedIdentity).finally(() => {
        pendingSteamSession = null;
        pendingSteamSessionIdentity = null;
    });
    return pendingSteamSession;
}

async function requestSteamBackendWithSession(
    path,
    { method = 'POST', body = null, identity = STEAM_AUTH_IDENTITY, retry = true } = {}
) {
    const session = await getSteamSession(identity);
    if (!session?.ok) {
        return session ?? { ok: false, reason: 'steam_session_unavailable' };
    }

    const result = await requestSteamBackend(path, {
        method,
        body,
        headers: {
            authorization: `Bearer ${session.token}`
        }
    });

    if (retry && result?.status === 401 && String(result.reason ?? '').startsWith('session_')) {
        clearSteamSession();
        return requestSteamBackendWithSession(path, { method, body, identity, retry: false });
    }

    return result;
}

function withSteamSession(path, payload = {}, { method = 'POST', identity = STEAM_AUTH_IDENTITY } = {}) {
    return requestSteamBackendWithSession(path, {
        method,
        body: payload,
        identity
    });
}

function withSteamSessionGet(path, queryParams = {}, { identity = STEAM_AUTH_IDENTITY } = {}) {
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
        urlParams.append(key, String(value));
    }
    const suffix = urlParams.toString() ? `?${urlParams.toString()}` : '';
    return requestSteamBackendWithSession(`${path}${suffix}`, {
        method: 'GET',
        identity
    });
}

async function submitSteamRunScore(payload = {}) {
    const result = await requestSteamBackendWithSession('/steam/leaderboards/submit-run', {
        method: 'POST',
        body: { payload },
        identity: STEAM_AUTH_IDENTITY
    });
    if (result?.ok || !result?.authTicketUnavailable) {
        return result;
    }

    return requestSteamBackend('/steam/leaderboards/submit-run', {
        method: 'POST',
        body: {
            payload,
            mockMode: true,
            authFallbackReason: result?.reason ?? 'steam_auth_unavailable'
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
    const requestType = String(options.dataRequest ?? options.type ?? '').toLowerCase();
    const needsSession = ['friends', 'requestfriends', 'arounduser', 'requestarounduser'].includes(requestType);
    const pathWithQuery = `/steam/leaderboards/${encodeURIComponent(board)}${suffix}`;
    return needsSession
        ? requestSteamBackendWithSession(pathWithQuery, { method: 'GET' })
        : requestSteamBackend(pathWithQuery);
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
    quitApp: () => ipcRenderer.send('hb:quitApp'),
    getSaveData: () => ipcRenderer.invoke('hb:getSaveData'),
    onSaveDataChanged: (key, value) => ipcRenderer.send('hb:saveDataChanged', key, value),
    onSaveDataRemoved: (key) => ipcRenderer.send('hb:saveDataRemoved', key),
    unlockAchievement: (key) => ipcRenderer.send('hb:unlockAchievement', key),
    setStat: (key, value) => ipcRenderer.send('hb:setStat', key, value),
    getSteamInfo: () => ipcRenderer.invoke('hb:steamInfo'),
    getSteamIdentity: () => ipcRenderer.invoke('hb:getSteamIdentity'),
    getSteamCloudStatus: () => ipcRenderer.invoke('hb:getSteamCloudStatus'),
    getQaToolsEnabled: () => ipcRenderer.invoke('hb:qaToolsEnabled'),
    resetAchievements: () => ipcRenderer.invoke('hb:resetAchievements'),
    getSteamDiagnostics: () => ipcRenderer.invoke('hb:getSteamDiagnostics'),
    getSteamAuthTicket: (identity = STEAM_AUTH_IDENTITY) => ipcRenderer.invoke('hb:getSteamAuthTicket', identity),
    cancelSteamAuthTicket: (handle) => ipcRenderer.invoke('hb:cancelSteamAuthTicket', handle),
    getSteamBackendHealth: () => requestSteamBackend('/health'),
    createSteamSession: (identity = STEAM_AUTH_IDENTITY) => getSteamSession(identity, { forceRefresh: true }),
    submitSteamRunScore,
    refreshSteamInventory: () => withSteamSessionGet('/steam/inventory'),
    triggerSteamPlaytimeDrop: () => withSteamSession('/steam/inventory/trigger-drop'),
    requestSteamMilestoneGrant: (milestone, runKey) => withSteamSession('/steam/inventory/grant-milestone', { milestone, runKey }),
    exchangeSteamInventory: (recipeId, materials) => withSteamSession('/steam/inventory/exchange', { recipeId, materials }),
    getSteamMarketEligibility: () => withSteamSessionGet('/steam/market/eligibility'),
    getSteamStoreCatalog: () => requestSteamBackend('/steam/store/catalog'),
    purchaseSteamKeys: (sku, requestId = `store-${Date.now()}-${Math.random().toString(36).slice(2)}`) => (
        withSteamSession('/steam/store/purchase/init', { sku, requestId })
    ),
    finalizeSteamPurchase: (transId) => withSteamSession('/steam/store/purchase/finalize', { transId }),
    openSteamCache: (cacheItemId, keyItemId, requestId = `cache-${Date.now()}-${Math.random().toString(36).slice(2)}`) => (
        withSteamSession('/steam/inventory/exchange', { recipeId: 4100, materials: [cacheItemId, keyItemId], requestId })
    ),
    getSteamLeaderboard,
    openSteamOverlayToUrl: (url) => ipcRenderer.invoke('hb:openSteamOverlayToUrl', url),
    addSteamTimelineEvent: (event) => ipcRenderer.invoke('hb:addSteamTimelineEvent', event),
    setSteamTimelineGameMode: (mode) => ipcRenderer.invoke('hb:setSteamTimelineGameMode', mode),
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
