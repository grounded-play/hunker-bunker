// ── Hunker Bunker desktop shell ───────────────────────────────
// Electron main process (CommonJS — the repo itself is ESM). Owns:
//   1. Steam init via steamworks.js — strictly optional: no Steam client,
//      no module, or no appid means silent no-op; the game never knows.
//   2. The save bridge: hb_* localStorage writes mirror to save.json in
//      userData (Steam Auto-Cloud syncs that file; see docs/steam-build-pipeline.md).
//   3. Achievement forwarding from the renderer's `achievement-unlocked`.
// Dev mode (ELECTRON_DEV=1) loads the Vite dev server; production loads dist/.

const { app, BrowserWindow, ipcMain } = require('electron');

// Force full GPU hardware acceleration and WebGL rasterization in packaged builds
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DEV = process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:5173';
// Spacewar test appid until the real one is set (docs/steam-build-pipeline.md
// human checklist step 1). Override without a rebuild via HB_STEAM_APPID.
const STEAM_APPID = Number(process.env.HB_STEAM_APPID ?? 4957040);
const DEFAULT_STEAM_AUTH_IDENTITY = process.env.HB_STEAM_AUTH_IDENTITY ?? 'hunker-bunker-backend';
const STEAM_AUTH_TICKET_TTL_MS = 60 * 1000;
const STEAM_DIAGNOSTIC_LIMIT = 200;

let steam = null;
let steamClient = null;
let steamInitError = null;
let mainWindow = null;
let steamInputPhase = 'loading';
let steamInputReady = false;
let steamInputHandles = null;
let steamInputPollTimer = null;
const activeSteamAuthTickets = new Map();
const steamDiagnostics = [];
const steamInitState = {
    phase: 'not_started',
    startedAt: null,
    completedAt: null,
    durationMs: null,
    ok: false
};

function serializeError(err) {
    return {
        name: err?.name ?? 'Error',
        message: err?.message ?? String(err),
        code: err?.code ?? null,
        stack: err?.stack ?? null
    };
}

function recordSteamDiagnostic(level, phase, message, details = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        elapsedMs: steamInitState.startedAt ? Date.now() - steamInitState.startedAt : null,
        level,
        phase,
        message,
        details
    };
    steamDiagnostics.push(entry);
    if (steamDiagnostics.length > STEAM_DIAGNOSTIC_LIMIT) steamDiagnostics.shift();

    const line = `[steam:${phase}] ${message}`;
    (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line, details ?? '');
    try {
        const logPath = path.join(app.getPath('userData'), 'steam-debug.log');
        fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (err) {
        console.warn('[steam:diagnostics] unable to append steam-debug.log:', err?.message ?? err);
    }
}

function getSteamDiagnosticsSnapshot() {
    return {
        appId: STEAM_APPID,
        dev: DEV,
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        node: process.versions.node,
        init: { ...steamInitState },
        identity: getSteamIdentitySnapshot(),
        logPath: path.join(app.getPath('userData'), 'steam-debug.log'),
        entries: steamDiagnostics.slice()
    };
}

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
        isSteamDeck: Boolean(steamClient?.utils?.isSteamRunningOnSteamDeck?.()),
        cloud: getSteamCloudStatusSnapshot(),
        timelineAvailable: Boolean(getSteamTimelineApi())
    };

    if (!steamClient) {
        return {
            ...base,
            reason: 'steam_unavailable',
            message: steamInitError ?? 'steamworks.js unavailable or Steam client not running'
        };
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

function getSteamCloudStatusSnapshot() {
    if (!steamClient?.cloud) {
        return {
            available: false,
            enabledForAccount: null,
            enabledForApp: null,
            reason: steamClient ? 'steam_cloud_unavailable' : 'steam_unavailable'
        };
    }

    try {
        const files = steamClient.cloud.listFiles?.();
        return {
            available: true,
            enabledForAccount: steamClient.cloud.isEnabledForAccount?.() ?? null,
            enabledForApp: steamClient.cloud.isEnabledForApp?.() ?? null,
            files: Array.isArray(files) ? files.map((file) => ({
                name: file.name,
                size: file.size != null ? Number(file.size) : null
            })) : []
        };
    } catch (err) {
        return {
            available: false,
            enabledForAccount: null,
            enabledForApp: null,
            reason: 'steam_cloud_status_failed',
            message: err?.message ?? String(err)
        };
    }
}

function getSteamTimelineApi() {
    return steamClient?.timeline ?? steamClient?.timelineApi ?? steamClient?.gameTimeline ?? null;
}

function normalizeTimelineEvent(input = {}) {
    const title = String(input.title ?? input.type ?? 'Hunker Bunker Event').trim().slice(0, 128);
    const description = String(input.description ?? '').trim().slice(0, 512);
    const icon = String(input.icon ?? input.type ?? 'event').trim().slice(0, 64);
    const priority = Math.max(0, Math.min(5, Number(input.priority) || 0));
    const durationSeconds = Math.max(0, Math.min(120, Number(input.durationSeconds) || 5));
    const clipPriority = Math.max(0, Math.min(5, Number(input.clipPriority) || 0));
    return { title, description, icon, priority, durationSeconds, clipPriority };
}

function addSteamTimelineEvent(input = {}) {
    const timeline = getSteamTimelineApi();
    if (!timeline) {
        return {
            ok: false,
            active: Boolean(steamClient),
            reason: 'steam_timeline_unavailable'
        };
    }

    const event = normalizeTimelineEvent(input);
    const fn = timeline.addTimelineEvent
        ?? timeline.AddTimelineEvent
        ?? timeline.addEvent
        ?? timeline.addTimelineEntry;
    if (typeof fn !== 'function') {
        return {
            ok: false,
            active: true,
            reason: 'steam_timeline_method_missing'
        };
    }

    try {
        if (fn.length <= 1) {
            fn.call(timeline, event);
        } else {
            fn.call(
                timeline,
                event.icon,
                event.title,
                event.description,
                event.priority,
                0,
                event.durationSeconds,
                event.clipPriority
            );
        }
        return { ok: true, active: true };
    } catch (err) {
        return {
            ok: false,
            active: true,
            reason: 'steam_timeline_event_failed',
            message: err?.message ?? String(err)
        };
    }
}

function setSteamTimelineGameMode(mode = 'menus') {
    const timeline = getSteamTimelineApi();
    if (!timeline) {
        return {
            ok: false,
            active: Boolean(steamClient),
            reason: 'steam_timeline_unavailable'
        };
    }

    const normalized = ['playing', 'menus', 'loading'].includes(mode) ? mode : 'menus';
    const fn = timeline.setTimelineGameMode
        ?? timeline.SetTimelineGameMode
        ?? timeline.setGameMode;
    if (typeof fn !== 'function') {
        return {
            ok: false,
            active: true,
            reason: 'steam_timeline_method_missing'
        };
    }

    try {
        fn.call(timeline, normalized);
        return { ok: true, active: true, mode: normalized };
    } catch (err) {
        return {
            ok: false,
            active: true,
            mode: normalized,
            reason: 'steam_timeline_mode_failed',
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
    steamInitError = null;
    steamInitState.phase = 'starting';
    steamInitState.startedAt = Date.now();
    recordSteamDiagnostic('info', 'starting', `Beginning Steamworks initialization for app ${STEAM_APPID}`, {
        dev: DEV,
        cwd: process.cwd(),
        executable: process.execPath,
        resourcesPath: process.resourcesPath,
        packaged: app.isPackaged,
        launchedWithSteamAppId: process.env.SteamAppId ?? null,
        launchedWithSteamGameId: process.env.SteamGameId ?? null,
        steamClientLaunch: Boolean(process.env.SteamAppId || process.env.SteamGameId)
    });
    try {
        // In dev, steamworks.js needs steam_appid.txt beside the executable's
        // cwd. Never ship this file in a depot — retail launches through Steam.
        if (DEV) {
            try {
                fs.writeFileSync(path.join(process.cwd(), 'steam_appid.txt'), String(STEAM_APPID));
                recordSteamDiagnostic('info', 'appid_file', 'Wrote development steam_appid.txt');
            } catch (err) {
                recordSteamDiagnostic('warn', 'appid_file', 'Could not write development steam_appid.txt', serializeError(err));
            }
        }
        steamInitState.phase = 'loading_module';
        recordSteamDiagnostic('info', 'loading_module', 'Loading steamworks.js native module');
        steam = require('steamworks.js');
        recordSteamDiagnostic('info', 'module_loaded', 'steamworks.js native module loaded');
        steamInitState.phase = 'initializing_client';
        recordSteamDiagnostic('info', 'initializing_client', 'Calling steam.init()', { appId: STEAM_APPID });
        steamClient = steam.init(STEAM_APPID);
        recordSteamDiagnostic('info', 'client_initialized', 'Steam client initialized');
        try {
            steamInitState.phase = 'reading_identity';
            const persona = steamClient.localplayer.getName();
            recordSteamDiagnostic('info', 'identity_ready', `Steam identity loaded as ${persona}`);
            steamInitState.phase = 'initializing_input';
            recordSteamDiagnostic('info', 'initializing_input', 'Initializing Steam Input');
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
                const invalidHandles = Object.entries(steamInputHandles)
                    .filter(([, handle]) => !isValidActionHandle(handle))
                    .map(([name]) => name);
                recordSteamDiagnostic('warn', 'input_handles', 'Steam Input action handles are missing', { invalidHandles });
            } else {
                steamInputPhase = 'loading';
                recordSteamDiagnostic('info', 'input_ready', 'Steam Input initialized with all action handles');
            }
        } catch (err) {
            steamInputReady = false;
            steamInputHandles = null;
            recordSteamDiagnostic('warn', 'input_failed', 'Steam Input initialization failed; game will continue', serializeError(err));
        }
        steamInitState.phase = 'complete';
        steamInitState.ok = true;
        steamInitState.completedAt = Date.now();
        steamInitState.durationMs = steamInitState.completedAt - steamInitState.startedAt;
        recordSteamDiagnostic('info', 'complete', `Steamworks initialization completed in ${steamInitState.durationMs}ms`);
        return true;
    } catch (err) {
        steam = null;
        steamClient = null;
        steamInitError = err?.message ?? String(err);
        steamInitState.phase = 'failed';
        steamInitState.ok = false;
        steamInitState.completedAt = Date.now();
        steamInitState.durationMs = steamInitState.completedAt - steamInitState.startedAt;
        recordSteamDiagnostic('error', 'failed', `Steamworks initialization failed after ${steamInitState.durationMs}ms; game will continue`, serializeError(err));
        return false;
    }
}

// The Steam overlay needs specific Chromium switches; steamworks.js wraps
// them so we don't cargo-cult flags. Must run before app is ready.
function enableOverlay() {
    try {
        // Three.js already presents frames continuously. Passing true disables
        // steamworks.js's extra 60 Hz webContents.invalidate() timer, which
        // otherwise duplicates our render loop and wastes renderer/GPU time.
        if (steam?.electronEnableSteamOverlay) {
            steam.electronEnableSteamOverlay(true);
            recordSteamDiagnostic('info', 'overlay_ready', 'Steam overlay hook enabled without redundant frame invalidation');
        } else {
            recordSteamDiagnostic('warn', 'overlay_unavailable', 'Steam overlay hook is unavailable because Steamworks did not initialize');
        }
    } catch (err) {
        recordSteamDiagnostic('warn', 'overlay_failed', 'Steam overlay hook failed', serializeError(err));
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
ipcMain.on('hb:quitApp', () => {
    flushSaveFile();
    app.quit();
});
ipcMain.on('hb:steamInputPhase', (_e, phase) => {
    setSteamInputPhase(phase);
});
ipcMain.handle('hb:getSteamIdentity', () => getSteamIdentitySnapshot());
ipcMain.handle('hb:getSteamCloudStatus', () => getSteamCloudStatusSnapshot());
ipcMain.handle('hb:getSteamDiagnostics', () => getSteamDiagnosticsSnapshot());
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
ipcMain.handle('hb:addSteamTimelineEvent', (_e, event) => addSteamTimelineEvent(event));
ipcMain.handle('hb:setSteamTimelineGameMode', (_e, mode) => setSteamTimelineGameMode(mode));
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
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        fullscreen: !DEV,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // preload uses contextBridge only; sandbox off for steamworks compat
            webgl: true
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
