// ── Hunker Bunker desktop shell ───────────────────────────────
// Electron main process (CommonJS — the repo itself is ESM). Owns:
//   1. Steam init via steamworks.js — strictly optional: no Steam client,
//      no module, or no appid means silent no-op; the game never knows.
//   2. The save bridge: hb_* localStorage writes mirror to save.json in
//      userData (Steam Auto-Cloud syncs that file; see docs/steam-build-pipeline.md).
//   3. Achievement forwarding from the renderer's `achievement-unlocked`.
// Dev mode (ELECTRON_DEV=1) loads the Vite dev server; production loads dist/.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DEV = process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:5173';
// Spacewar test appid until the real one is set (docs/steam-build-pipeline.md
// human checklist step 1). Override without a rebuild via HB_STEAM_APPID.
const STEAM_APPID = Number(process.env.HB_STEAM_APPID ?? 1247290);
const DEFAULT_STEAM_AUTH_IDENTITY = process.env.HB_STEAM_AUTH_IDENTITY ?? 'hunker-bunker-backend';
const STEAM_AUTH_TICKET_TTL_MS = 60 * 1000;

let steam = null;
let steamClient = null;
let mainWindow = null;
let steamInputPhase = 'loading';
let steamInputReady = false;
let steamInputHandles = null;
let steamInputPollTimer = null;
const activeSteamAuthTickets = new Map();

function isValidActionHandle(handle) {
    return typeof handle === 'bigint' && handle !== 0n;
}

function normalizeSteamInputPhase(phase) {
    return phase === 'gameplay' ? 'gameplay' : 'menu';
}

function normalizeSteamAuthIdentity(identity) {
    const normalized = String(identity ?? DEFAULT_STEAM_AUTH_IDENTITY).trim();
    return (normalized || DEFAULT_STEAM_AUTH_IDENTITY).slice(0, 128);
}

function serializeSteamId(steamId) {
    if (!steamId || typeof steamId !== 'object') return null;
    return {
        steamId64: steamId.steamId64 != null ? String(steamId.steamId64) : null,
        steamId32: steamId.steamId32 != null ? String(steamId.steamId32) : null,
        accountId: Number.isFinite(Number(steamId.accountId)) ? Number(steamId.accountId) : null
    };
}

function getSteamIdentitySnapshot() {
    const base = {
        ok: Boolean(steamClient),
        active: Boolean(steamClient),
        appId: STEAM_APPID,
        steamInputAvailable: steamInputReady,
        steamInputPhase,
        isSteamDeck: Boolean(steamClient?.utils?.isSteamRunningOnSteamDeck?.())
    };

    if (!steamClient) {
        return { ...base, reason: 'steam_unavailable' };
    }

    try {
        const playerSteamId = serializeSteamId(steamClient.localplayer.getSteamId?.());
        const ownerSteamId = serializeSteamId(steamClient.apps?.appOwner?.());
        return {
            ...base,
            persona: steamClient.localplayer.getName(),
            ipCountry: steamClient.localplayer.getIpCountry?.() ?? null,
            steamId64: playerSteamId?.steamId64 ?? null,
            steamId32: playerSteamId?.steamId32 ?? null,
            accountId: playerSteamId?.accountId ?? null,
            ownerSteamId64: ownerSteamId?.steamId64 ?? null,
            subscribed: steamClient.apps?.isSubscribed?.() ?? null
        };
    } catch (err) {
        return {
            ...base,
            ok: false,
            reason: 'steam_identity_failed',
            message: err?.message ?? String(err)
        };
    }
}

function rememberSteamAuthTicket(ticket) {
    const handle = crypto.randomUUID();
    const timeout = setTimeout(() => {
        cancelSteamAuthTicket(handle);
    }, STEAM_AUTH_TICKET_TTL_MS);
    timeout.unref?.();
    activeSteamAuthTickets.set(handle, { ticket, timeout });
    return handle;
}

function cancelSteamAuthTicket(handle) {
    const active = activeSteamAuthTickets.get(handle);
    if (!active) return false;
    activeSteamAuthTickets.delete(handle);
    clearTimeout(active.timeout);
    try {
        active.ticket?.cancel?.();
    } catch { /* best effort */ }
    return true;
}

function cancelAllSteamAuthTickets() {
    for (const handle of activeSteamAuthTickets.keys()) {
        cancelSteamAuthTicket(handle);
    }
}

function initSteam() {
    try {
        // In dev, steamworks.js needs steam_appid.txt beside the executable's
        // cwd. Never ship this file in a depot — retail launches through Steam.
        if (DEV) {
            try { fs.writeFileSync(path.join(process.cwd(), 'steam_appid.txt'), String(STEAM_APPID)); } catch { /* best effort */ }
        }
        steam = require('steamworks.js');
        steamClient = steam.init(STEAM_APPID);
        console.log(`[steam] initialized (appid ${STEAM_APPID}) as ${steamClient.localplayer.getName()}`);
        try {
            steamClient.input?.init?.();
            steamInputHandles = {
                menu: steamClient.input.getActionSet('menu'),
                gameplay: steamClient.input.getActionSet('gameplay'),
                menuUp: steamClient.input.getDigitalAction('menu_up'),
                menuDown: steamClient.input.getDigitalAction('menu_down'),
                menuLeft: steamClient.input.getDigitalAction('menu_left'),
                menuRight: steamClient.input.getDigitalAction('menu_right'),
                menuConfirm: steamClient.input.getDigitalAction('menu_confirm'),
                menuBack: steamClient.input.getDigitalAction('menu_back'),
                move: steamClient.input.getAnalogAction('move'),
                camera: steamClient.input.getAnalogAction('camera'),
                fire: steamClient.input.getDigitalAction('fire'),
                interact: steamClient.input.getDigitalAction('interact'),
                reload: steamClient.input.getDigitalAction('reload'),
                ability: steamClient.input.getDigitalAction('ability'),
                scan: steamClient.input.getDigitalAction('scan'),
                pause: steamClient.input.getDigitalAction('pause')
            };

            const handlesAreValid = Object.values(steamInputHandles).every(isValidActionHandle);
            steamInputReady = handlesAreValid;
            if (!handlesAreValid) {
                console.log('[steam] input initialized, but one or more action handles were missing. Check the bundled action manifest and Steamworks Steam Input settings.');
            } else {
                steamInputPhase = 'loading';
                console.log('[steam] input initialized');
            }
        } catch (err) {
            steamInputReady = false;
            steamInputHandles = null;
            console.log(`[steam] input not available (${DEV ? 'dev' : 'no client'}): ${err?.message ?? err}`);
        }
        return true;
    } catch (err) {
        steam = null;
        steamClient = null;
        console.log(`[steam] not available (${DEV ? 'dev' : 'no client'}): ${err?.message ?? err}`);
        return false;
    }
}

// The Steam overlay needs specific Chromium switches; steamworks.js wraps
// them so we don't cargo-cult flags. Must run before app is ready.
function enableOverlay() {
    try {
        if (steam?.electronEnableSteamOverlay) steam.electronEnableSteamOverlay();
    } catch (err) {
        console.log(`[steam] overlay hook failed: ${err?.message ?? err}`);
    }
}

function setSteamInputPhase(phase) {
    steamInputPhase = normalizeSteamInputPhase(phase);
}

function getPrimaryControllerSnapshot(controller, phase, actionHandles) {
    if (!controller || !actionHandles) return null;

    const controllerType = controller.getType();
    const controllerHandle = controller.getHandle?.();
    const handle = typeof controllerHandle === 'bigint' ? controllerHandle.toString() : String(controllerHandle ?? '');

    const moveVector = phase === 'gameplay' && isValidActionHandle(actionHandles.move)
        ? controller.getAnalogActionVector(actionHandles.move)
        : { x: 0, y: 0 };
    const cameraVector = phase === 'gameplay' && isValidActionHandle(actionHandles.camera)
        ? controller.getAnalogActionVector(actionHandles.camera)
        : { x: 0, y: 0 };

    const buttonState = phase === 'gameplay'
        ? {
            fire: isValidActionHandle(actionHandles.fire) ? controller.isDigitalActionPressed(actionHandles.fire) : false,
            interact: isValidActionHandle(actionHandles.interact) ? controller.isDigitalActionPressed(actionHandles.interact) : false,
            reload: isValidActionHandle(actionHandles.reload) ? controller.isDigitalActionPressed(actionHandles.reload) : false,
            ability: isValidActionHandle(actionHandles.ability) ? controller.isDigitalActionPressed(actionHandles.ability) : false,
            scan: isValidActionHandle(actionHandles.scan) ? controller.isDigitalActionPressed(actionHandles.scan) : false,
            pause: isValidActionHandle(actionHandles.pause) ? controller.isDigitalActionPressed(actionHandles.pause) : false
        }
        : {
            menuUp: isValidActionHandle(actionHandles.menuUp) ? controller.isDigitalActionPressed(actionHandles.menuUp) : false,
            menuDown: isValidActionHandle(actionHandles.menuDown) ? controller.isDigitalActionPressed(actionHandles.menuDown) : false,
            menuLeft: isValidActionHandle(actionHandles.menuLeft) ? controller.isDigitalActionPressed(actionHandles.menuLeft) : false,
            menuRight: isValidActionHandle(actionHandles.menuRight) ? controller.isDigitalActionPressed(actionHandles.menuRight) : false,
            menuConfirm: isValidActionHandle(actionHandles.menuConfirm) ? controller.isDigitalActionPressed(actionHandles.menuConfirm) : false,
            menuBack: isValidActionHandle(actionHandles.menuBack) ? controller.isDigitalActionPressed(actionHandles.menuBack) : false
        };

    const moveMagnitude = Math.hypot(Number(moveVector?.x) || 0, Number(moveVector?.y) || 0);
    const cameraMagnitude = Math.hypot(Number(cameraVector?.x) || 0, Number(cameraVector?.y) || 0);
    const anyButtonPressed = Object.values(buttonState).some(Boolean);
    const active = anyButtonPressed || moveMagnitude > 0.18 || cameraMagnitude > 0.18;

    return {
        handle,
        type: controllerType,
        active,
        move: {
            x: Math.max(-1, Math.min(1, Number(moveVector?.x) || 0)),
            y: Math.max(-1, Math.min(1, Number(moveVector?.y) || 0))
        },
        camera: {
            x: Math.max(-1, Math.min(1, Number(cameraVector?.x) || 0)),
            y: Math.max(-1, Math.min(1, Number(cameraVector?.y) || 0))
        },
        ...buttonState
    };
}

function buildSteamInputSnapshot() {
    if (!steamInputReady || !steamClient?.input || !steamInputHandles) {
        return {
            available: false,
            phase: steamInputPhase,
            controllerCount: 0,
            anyInput: false,
            isSteamDeck: Boolean(steamClient?.utils?.isSteamRunningOnSteamDeck?.()),
            primaryControllerHandle: null,
            primaryControllerType: null,
            controllers: []
        };
    }

    const phase = normalizeSteamInputPhase(steamInputPhase);
    const actionSet = phase === 'gameplay' ? steamInputHandles.gameplay : steamInputHandles.menu;
    const controllers = [];

    try {
        for (const controller of steamClient.input.getControllers()) {
            if (isValidActionHandle(actionSet)) {
                controller.activateActionSet(actionSet);
            }
            const snapshot = getPrimaryControllerSnapshot(controller, phase, steamInputHandles);
            if (snapshot) controllers.push(snapshot);
        }
    } catch (err) {
        console.log(`[steam] input snapshot failed: ${err?.message ?? err}`);
    }

    const activeController = controllers.find((controller) => controller.active) ?? controllers[0] ?? null;
    return {
        available: true,
        phase: steamInputPhase,
        controllerCount: controllers.length,
        anyInput: controllers.some((controller) => controller.active),
        isSteamDeck: Boolean(steamClient?.utils?.isSteamRunningOnSteamDeck?.()),
        primaryControllerHandle: activeController?.handle ?? null,
        primaryControllerType: activeController?.type ?? null,
        controllers
    };
}

function startSteamInputPolling() {
    if (!steamInputReady || steamInputPollTimer) return;

    steamInputPollTimer = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        try {
            mainWindow.webContents.send('hb:steamInputState', buildSteamInputSnapshot());
        } catch (err) {
            console.log(`[steam] input dispatch failed: ${err?.message ?? err}`);
        }
    }, 1000 / 30);
}

// ── Save bridge ───────────────────────────────────────────────
// One JSON file of hb_* keys. Writes are debounced; the renderer patch in
// index.html mirrors every localStorage change here via IPC.
const saveFilePath = () => path.join(app.getPath('userData'), 'save.json');
let saveState = {};
let saveTimer = null;

function loadSaveFile() {
    try {
        saveState = JSON.parse(fs.readFileSync(saveFilePath(), 'utf8')) ?? {};
    } catch {
        saveState = {};
    }
    return saveState;
}

function flushSaveFile() {
    try {
        fs.mkdirSync(path.dirname(saveFilePath()), { recursive: true });
        fs.writeFileSync(saveFilePath(), JSON.stringify(saveState));
    } catch (err) {
        console.log(`[save] write failed: ${err?.message ?? err}`);
    }
}

function scheduleFlush() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSaveFile, 400);
}

ipcMain.handle('hb:getSaveData', () => loadSaveFile());
// Synchronous variant for the preload: the save MUST be in localStorage
// before the first game module executes, and module scripts won't wait for
// a promise. One small sync read at boot is the honest trade.
ipcMain.on('hb:getSaveDataSync', (event) => {
    event.returnValue = loadSaveFile();
});
ipcMain.on('hb:saveDataChanged', (_e, key, value) => {
    if (typeof key !== 'string') return;
    saveState[key] = String(value);
    scheduleFlush();
});
ipcMain.on('hb:saveDataRemoved', (_e, key) => {
    if (typeof key !== 'string') return;
    delete saveState[key];
    scheduleFlush();
});
ipcMain.on('hb:unlockAchievement', (_e, key) => {
    if (!steamClient || typeof key !== 'string') return;
    try {
        // Steam API names must match ACHIEVEMENT_DEFS keys (mapping table in
        // the Antigravity Electron plan / pipeline doc).
        steamClient.achievement.activate(key);
    } catch (err) {
        console.log(`[steam] achievement '${key}' failed: ${err?.message ?? err}`);
    }
});
ipcMain.on('hb:setStat', (_e, key, value) => {
    if (!steamClient || typeof key !== 'string') return;
    try {
        steamClient.stats.setInt(key, Number(value));
        steamClient.stats.store();
    } catch (err) {
        console.log(`[steam] setStat '${key}' failed: ${err?.message ?? err}`);
    }
});
ipcMain.on('hb:steamInputPhase', (_e, phase) => {
    setSteamInputPhase(phase);
});
ipcMain.handle('hb:getSteamIdentity', () => getSteamIdentitySnapshot());
ipcMain.handle('hb:getSteamAuthTicket', async (_e, identity, timeoutSeconds = 10) => {
    if (!steamClient?.auth?.getAuthTicketForWebApi) {
        return {
            ok: false,
            active: Boolean(steamClient),
            appId: STEAM_APPID,
            reason: 'steam_auth_unavailable'
        };
    }

    const normalizedIdentity = normalizeSteamAuthIdentity(identity);
    const timeout = Math.max(1, Math.min(30, Number(timeoutSeconds) || 10));
    try {
        const ticket = await steamClient.auth.getAuthTicketForWebApi(normalizedIdentity, timeout);
        const bytes = ticket?.getBytes?.();
        const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes ?? []);
        if (buffer.length === 0) {
            ticket?.cancel?.();
            return {
                ok: false,
                appId: STEAM_APPID,
                identity: normalizedIdentity,
                reason: 'steam_auth_empty_ticket'
            };
        }

        return {
            ok: true,
            appId: STEAM_APPID,
            identity: normalizedIdentity,
            ticketHex: buffer.toString('hex'),
            handle: rememberSteamAuthTicket(ticket),
            expiresAt: Date.now() + STEAM_AUTH_TICKET_TTL_MS
        };
    } catch (err) {
        return {
            ok: false,
            appId: STEAM_APPID,
            identity: normalizedIdentity,
            reason: 'steam_auth_ticket_failed',
            message: err?.message ?? String(err)
        };
    }
});
ipcMain.handle('hb:cancelSteamAuthTicket', (_e, handle) => ({
    ok: true,
    cancelled: typeof handle === 'string' ? cancelSteamAuthTicket(handle) : false
}));
ipcMain.handle('hb:openSteamOverlayToUrl', async (_e, url) => {
    if (steamClient?.overlay?.activateToWebPage) {
        try {
            steamClient.overlay.activateToWebPage(url);
            return { ok: true, overlay: true };
        } catch (err) {
            console.warn('[steam] overlay navigate failed, falling back to shell:', err);
        }
    }
    try {
        const { shell } = require('electron');
        await shell.openExternal(url);
        return { ok: true, overlay: false };
    } catch (err) {
        return { ok: false, reason: 'open_external_failed', message: err.message };
    }
});
ipcMain.handle('hb:showGamepadTextInput', async (_e, inputMode, lineMode, description, maxCharacters, existingText) => {
    if (!steamClient?.utils?.showGamepadTextInput) return null;
    try {
        return await steamClient.utils.showGamepadTextInput(inputMode, lineMode, description, maxCharacters, existingText);
    } catch (err) {
        console.log(`[steam] gamepad text input failed: ${err?.message ?? err}`);
        return null;
    }
});
ipcMain.handle('hb:showFloatingGamepadTextInput', async (_e, keyboardMode, x, y, width, height) => {
    if (!steamClient?.utils?.showFloatingGamepadTextInput) return false;
    try {
        return await steamClient.utils.showFloatingGamepadTextInput(keyboardMode, x, y, width, height);
    } catch (err) {
        console.log(`[steam] floating gamepad text input failed: ${err?.message ?? err}`);
        return false;
    }
});
ipcMain.handle('hb:steamInfo', () => getSteamIdentitySnapshot());

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: '#0a0c0e',
        autoHideMenuBar: true,
        fullscreen: !DEV,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false // preload uses contextBridge only; sandbox off for steamworks compat
        }
    });

    if (DEV) {
        win.loadURL(DEV_URL);
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
    mainWindow = win;
    return win;
}

initSteam();
enableOverlay();

app.whenReady().then(() => {
    loadSaveFile();
    createWindow();
    startSteamInputPolling();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    flushSaveFile();
    if (steamInputPollTimer) {
        clearInterval(steamInputPollTimer);
        steamInputPollTimer = null;
    }
    try {
        steamClient?.input?.shutdown?.();
    } catch { /* ignore */ }
    cancelAllSteamAuthTickets();
    app.quit();
});
