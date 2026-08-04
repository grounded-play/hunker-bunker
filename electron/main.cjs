// ── Hunker Bunker desktop shell ───────────────────────────────
// Electron main process (CommonJS — the repo itself is ESM). Owns:
//   1. Steam init via steamworks.js — strictly optional: no Steam client,
//      no module, or no appid means silent no-op; the game never knows.
//   2. The save bridge: hb_* localStorage writes mirror to save.json in
//      userData (Steam Auto-Cloud syncs that file; see docs/steam-build-pipeline.md).
//   3. Achievement forwarding from the renderer's `achievement-unlocked`.
// Dev mode (ELECTRON_DEV=1) loads the Vite dev server; production loads dist/.

const { app, BrowserWindow, ipcMain } = require('electron');

// Give Gamescope a stable native identity before Chromium creates its first
// surface. Steam's launch overlay tracks the game window by its Linux desktop
// identity; Electron's generic fallback can otherwise leave that overlay up
// even though the renderer and audio are already running.
app.setName('Hunker Bunker');
if (process.platform === 'linux') {
    app.setDesktopName('hunker-bunker.desktop');
    app.commandLine.appendSwitch('class', 'hunker-bunker');
}

// Force full GPU hardware acceleration and WebGL rasterization in packaged builds
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');

if (process.platform === 'linux') {
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    // Gamescope must be able to focus the native game surface and dismiss
    // Steam's launch overlay. Native Wayland intentionally restricts focus,
    // move, and post-creation fullscreen requests, while Steam Deck Gaming
    // Mode provides XWayland specifically for game windows.
    app.commandLine.appendSwitch(
        'ozone-platform',
        process.env.HB_ELECTRON_OZONE_PLATFORM || 'x11'
    );
}

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {
    sanitizeSaveData,
    loadSaveWithBackup,
    writeSaveAtomic
} = require('./save-contract.cjs');
const { isQaToolsEnabled, normalizeBetaName } = require('./qa-tools.cjs');

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
    if (phase === 'gameplay') return 'gameplay';
    if (phase === 'archive') return 'archive';
    return 'menu';
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
    const betaName = getCurrentSteamBetaName();
    const base = {
        ok: Boolean(steamClient),
        active: Boolean(steamClient),
        appId: STEAM_APPID,
        steamInputAvailable: steamInputReady,
        steamInputPhase,
        isSteamDeck: Boolean(steamClient?.utils?.isSteamRunningOnSteamDeck?.()),
        betaName,
        qaToolsEnabled: qaToolsEnabled(betaName),
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
                archive: steamClient.input.getActionSet('archive'),
                menuUp: steamClient.input.getDigitalAction('menu_up'),
                menuDown: steamClient.input.getDigitalAction('menu_down'),
                menuLeft: steamClient.input.getDigitalAction('menu_left'),
                menuRight: steamClient.input.getDigitalAction('menu_right'),
                menuConfirm: steamClient.input.getDigitalAction('menu_confirm'),
                menuBack: steamClient.input.getDigitalAction('menu_back'),
                menuTabLeft: steamClient.input.getDigitalAction('menu_tab_left'),
                menuTabRight: steamClient.input.getDigitalAction('menu_tab_right'),
                menuPointer: steamClient.input.getAnalogAction('menu_pointer'),
                move: steamClient.input.getAnalogAction('move'),
                camera: steamClient.input.getAnalogAction('camera'),
                cameraMouse: steamClient.input.getAnalogAction('camera_mouse'),
                fire: steamClient.input.getDigitalAction('fire'),
                interact: steamClient.input.getDigitalAction('interact'),
                reload: steamClient.input.getDigitalAction('reload'),
                ability: steamClient.input.getDigitalAction('ability'),
                dash: steamClient.input.getDigitalAction('dash'),
                scan: steamClient.input.getDigitalAction('scan'),
                sprint: steamClient.input.getDigitalAction('sprint'),
                toggleMap: steamClient.input.getDigitalAction('toggle_map'),
                archiveFocus: steamClient.input.getAnalogAction('archive_focus'),
                archiveConfirm: steamClient.input.getDigitalAction('archive_confirm'),
                archiveInventory: steamClient.input.getDigitalAction('archive_inventory'),
                archiveBack: steamClient.input.getDigitalAction('archive_back'),
                archiveReveal: steamClient.input.getDigitalAction('archive_reveal'),
                pause: steamClient.input.getDigitalAction('pause')
            };

            // Degrade per action rather than all-or-nothing. Without an action set
            // nothing can be activated, so those are genuinely fatal — but a single
            // unresolved action (an older user config, a partially loaded binding)
            // must not take every other control down with it. Every read site below
            // already guards on isValidActionHandle, so a missing action is inert.
            const ACTION_SET_HANDLES = ['menu', 'gameplay', 'archive'];
            const missingActionSets = ACTION_SET_HANDLES
                .filter((name) => !isValidActionHandle(steamInputHandles[name]));
            const invalidHandles = Object.entries(steamInputHandles)
                .filter(([name, handle]) => !ACTION_SET_HANDLES.includes(name) && !isValidActionHandle(handle))
                .map(([name]) => name);

            steamInputReady = missingActionSets.length === 0;
            if (!steamInputReady) {
                recordSteamDiagnostic('warn', 'input_handles', 'Steam Input action sets are missing', { missingActionSets, invalidHandles });
            } else {
                steamInputPhase = 'loading';
                if (invalidHandles.length > 0) {
                    recordSteamDiagnostic('warn', 'input_degraded', 'Steam Input running with some actions unbound', { invalidHandles });
                } else {
                    recordSteamDiagnostic('info', 'input_ready', 'Steam Input initialized with all action handles');
                }
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
// Note: electronEnableSteamOverlay appends 'in-process-gpu', which breaks
// Mesa/Wayland GPU rendering on Linux/SteamOS. On Linux, Steam's LD_PRELOAD
// overlay hook handles rendering without in-process-gpu.
function enableOverlay() {
    try {
        if (steam?.electronEnableSteamOverlay && process.platform === 'win32') {
            steam.electronEnableSteamOverlay(true);
            recordSteamDiagnostic('info', 'overlay_ready', 'Steam overlay hook enabled without redundant frame invalidation');
        } else if (process.platform === 'linux') {
            recordSteamDiagnostic('info', 'overlay_ready', 'Steam overlay active via Linux LD_PRELOAD hook');
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

    const moveAction = phase === 'archive' ? actionHandles.archiveFocus : actionHandles.move;
    const moveVector = (phase === 'gameplay' || phase === 'archive') && isValidActionHandle(moveAction)
        ? controller.getAnalogActionVector(moveAction)
        : { x: 0, y: 0 };
    const cameraAction = phase === 'menu' ? actionHandles.menuPointer : actionHandles.camera;
    const cameraVector = (phase === 'gameplay' || phase === 'menu') && isValidActionHandle(cameraAction)
        ? controller.getAnalogActionVector(cameraAction)
        : { x: 0, y: 0 };
    // absolute_mouse reports frame deltas in mouse "pixels", not a normalized stick
    // position, so this deliberately skips the [-1, 1] clamp applied to the stick
    // vectors below — clamping would crush a fast flick into a single unit.
    const cameraDeltaVector = phase === 'gameplay' && isValidActionHandle(actionHandles.cameraMouse)
        ? controller.getAnalogActionVector(actionHandles.cameraMouse)
        : { x: 0, y: 0 };

    const buttonState = phase === 'gameplay'
        ? {
            fire: isValidActionHandle(actionHandles.fire) ? controller.isDigitalActionPressed(actionHandles.fire) : false,
            interact: isValidActionHandle(actionHandles.interact) ? controller.isDigitalActionPressed(actionHandles.interact) : false,
            reload: isValidActionHandle(actionHandles.reload) ? controller.isDigitalActionPressed(actionHandles.reload) : false,
            ability: isValidActionHandle(actionHandles.ability) ? controller.isDigitalActionPressed(actionHandles.ability) : false,
            dash: isValidActionHandle(actionHandles.dash) ? controller.isDigitalActionPressed(actionHandles.dash) : false,
            scan: isValidActionHandle(actionHandles.scan) ? controller.isDigitalActionPressed(actionHandles.scan) : false,
            sprint: isValidActionHandle(actionHandles.sprint) ? controller.isDigitalActionPressed(actionHandles.sprint) : false,
            toggleMap: isValidActionHandle(actionHandles.toggleMap) ? controller.isDigitalActionPressed(actionHandles.toggleMap) : false,
            pause: isValidActionHandle(actionHandles.pause) ? controller.isDigitalActionPressed(actionHandles.pause) : false
        }
        : phase === 'archive'
            ? {
                interact: isValidActionHandle(actionHandles.archiveConfirm) ? controller.isDigitalActionPressed(actionHandles.archiveConfirm) : false,
                ability: isValidActionHandle(actionHandles.archiveInventory) ? controller.isDigitalActionPressed(actionHandles.archiveInventory) : false,
                menuBack: isValidActionHandle(actionHandles.archiveBack) ? controller.isDigitalActionPressed(actionHandles.archiveBack) : false,
                reload: isValidActionHandle(actionHandles.archiveReveal) ? controller.isDigitalActionPressed(actionHandles.archiveReveal) : false,
                pause: isValidActionHandle(actionHandles.pause) ? controller.isDigitalActionPressed(actionHandles.pause) : false
            }
        : {
            menuUp: isValidActionHandle(actionHandles.menuUp) ? controller.isDigitalActionPressed(actionHandles.menuUp) : false,
            menuDown: isValidActionHandle(actionHandles.menuDown) ? controller.isDigitalActionPressed(actionHandles.menuDown) : false,
            menuLeft: isValidActionHandle(actionHandles.menuLeft) ? controller.isDigitalActionPressed(actionHandles.menuLeft) : false,
            menuRight: isValidActionHandle(actionHandles.menuRight) ? controller.isDigitalActionPressed(actionHandles.menuRight) : false,
            menuConfirm: isValidActionHandle(actionHandles.menuConfirm) ? controller.isDigitalActionPressed(actionHandles.menuConfirm) : false,
            menuBack: isValidActionHandle(actionHandles.menuBack) ? controller.isDigitalActionPressed(actionHandles.menuBack) : false,
            menuTabLeft: isValidActionHandle(actionHandles.menuTabLeft) ? controller.isDigitalActionPressed(actionHandles.menuTabLeft) : false,
            menuTabRight: isValidActionHandle(actionHandles.menuTabRight) ? controller.isDigitalActionPressed(actionHandles.menuTabRight) : false,
            pause: isValidActionHandle(actionHandles.pause) ? controller.isDigitalActionPressed(actionHandles.pause) : false
        };

    const moveMagnitude = Math.hypot(Number(moveVector?.x) || 0, Number(moveVector?.y) || 0);
    const cameraMagnitude = Math.hypot(Number(cameraVector?.x) || 0, Number(cameraVector?.y) || 0);
    // Mouse-style deltas are unbounded, so the 0.18 stick deadzone is the wrong test:
    // it would treat sub-pixel gyro noise as deliberate input. A whole pixel of
    // travel in a frame is a real gesture.
    const cameraDeltaMagnitude = Math.hypot(Number(cameraDeltaVector?.x) || 0, Number(cameraDeltaVector?.y) || 0);
    const anyButtonPressed = Object.values(buttonState).some(Boolean);
    const active = anyButtonPressed || moveMagnitude > 0.18 || cameraMagnitude > 0.18
        || cameraDeltaMagnitude >= 1;

    return {
        handle,
        type: controllerType,
        active,
        // Movement is consumed as a world axis, while the native right stick
        // drives screen coordinates and therefore needs its vertical axis flipped.
        move: {
            x: Math.max(-1, Math.min(1, Number(moveVector?.x) || 0)),
            y: Math.max(-1, Math.min(1, Number(moveVector?.y) || 0))
        },
        camera: {
            x: Math.max(-1, Math.min(1, Number(cameraVector?.x) || 0)),
            y: Math.max(-1, Math.min(1, -(Number(cameraVector?.y) || 0)))
        },
        cameraDelta: {
            x: Number(cameraDeltaVector?.x) || 0,
            y: Number(cameraDeltaVector?.y) || 0
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
    const actionSet = phase === 'gameplay'
        ? steamInputHandles.gameplay
        : phase === 'archive'
            ? steamInputHandles.archive
            : steamInputHandles.menu;
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
    const loaded = loadSaveWithBackup(fs, saveFilePath());
    saveState = loaded.data;
    if (loaded.source === 'backup') {
        console.warn('[save] primary save was invalid; restored last-known-good backup.');
        try {
            writeSaveAtomic(fs, saveFilePath(), saveState);
        } catch (err) {
            console.log(`[save] backup recovery write failed: ${err?.message ?? err}`);
        }
    }
    return saveState;
}

function flushSaveFile() {
    try {
        writeSaveAtomic(fs, saveFilePath(), saveState);
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
    const next = sanitizeSaveData({ [key]: String(value) });
    if (!(key in next)) return;
    saveState[key] = next[key];
    scheduleFlush();
});
ipcMain.on('hb:saveDataRemoved', (_e, key) => {
    if (typeof key !== 'string' || !key.startsWith('hb_')) return;
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

// QA/beta-only achievement reset. Off by default on the public Steam branch.
// A named Steam beta branch or HB_QA_TOOLS_ENABLED=1 authorizes it, so
// the capability doesn't exist for a normal player even if they find the ~
// console. ISteamUserStats::ResetAllStats only ever affects the Steam
// account currently logged into the running game — there is no remote way
// to reset a different account's achievements; the QA tester (or someone on
// their machine, logged in as them) has to trigger this themselves.
function getCurrentSteamBetaName() {
    try {
        return normalizeBetaName(steamClient?.apps?.currentBetaName?.());
    } catch (err) {
        console.warn('[steam:beta] unable to read current beta branch:', err?.message ?? err);
        return null;
    }
}

function qaToolsEnabled(betaName = getCurrentSteamBetaName()) {
    return isQaToolsEnabled({
        override: process.env.HB_QA_TOOLS_ENABLED,
        betaName
    });
}
ipcMain.handle('hb:qaToolsEnabled', () => qaToolsEnabled());
ipcMain.handle('hb:resetAchievements', () => {
    if (!qaToolsEnabled()) return { ok: false, reason: 'qa_tools_disabled' };
    if (!steamClient) return { ok: false, reason: 'steam_not_active' };
    try {
        const ok = steamClient.stats.resetAll(true);
        steamClient.stats.store();
        return { ok: Boolean(ok) };
    } catch (err) {
        return { ok: false, reason: 'exception', message: err?.message ?? String(err) };
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
    let presentationAttempts = 0;
    const win = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: '#0a0c0e',
        title: 'Hunker Bunker',
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        focusable: true,
        frame: false,
        skipTaskbar: false,
        fullscreen: !DEV,
        // Map a black native surface immediately. Waiting for ready-to-show
        // lets the renderer (and audio) start behind Steam's loading overlay
        // on Gamescope, which can leave that overlay holding focus forever.
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // preload uses contextBridge only; sandbox off for steamworks compat
            webgl: true,
            backgroundThrottling: false
        }
    });

    const presentGameWindow = (phase = 'unknown') => {
        if (DEV || win.isDestroyed()) return;
        presentationAttempts += 1;
        win.show();
        if (!win.isFullScreen()) win.setFullScreen(true);
        win.moveTop();
        win.focus();
        win.webContents.focus();
        recordSteamDiagnostic('info', 'window_focus', 'Presented and focused the fullscreen game window', {
            phase,
            attempt: presentationAttempts,
            focused: win.isFocused(),
            visible: win.isVisible(),
            fullscreen: win.isFullScreen()
        });
    };

    const raiseAboveSteamLaunchOverlay = () => {
        if (DEV || win.isDestroyed()) return;
        // This is deliberately a short pulse. It makes Gamescope acknowledge
        // the newly mapped game surface, then releases the topmost hint so the
        // Steam/QAM overlays continue to work normally.
        win.setAlwaysOnTop(true, 'screen-saver');
        presentGameWindow('gamescope-handoff');
        setTimeout(() => {
            if (win.isDestroyed()) return;
            win.setAlwaysOnTop(false);
            presentGameWindow('gamescope-handoff-complete');
        }, 750);
    };
    win.once('ready-to-show', () => presentGameWindow('ready-to-show'));
    win.webContents.once('dom-ready', raiseAboveSteamLaunchOverlay);
    win.webContents.once('did-finish-load', () => {
        setTimeout(() => presentGameWindow('did-finish-load'), 0);
    });
    // Claim the Gamescope slot as soon as the native surface exists, then
    // retry once after Chromium has submitted its first frames. Retrying is
    // intentional: focus requests made before mapping can be ignored by X11.
    setTimeout(() => presentGameWindow('window-created'), 0);
    setTimeout(() => presentGameWindow('first-frame-fallback'), 1000);
    win.on('focus', () => {
        win.webContents.focus();
        recordSteamDiagnostic('info', 'window_focus', 'Game window received focus');
    });
    win.on('blur', () => recordSteamDiagnostic('info', 'window_blur', 'Game window lost focus'));

    if (DEV) {
        win.loadURL(DEV_URL);
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
    mainWindow = win;
    return win;
}

app.whenReady().then(() => {
    loadSaveFile();
    createWindow();

    // Defer Steam initialization so it doesn't block the initial native window
    // creation or Gamescope's surface handoff on the Steam Deck.
    setTimeout(() => {
        initSteam();
        enableOverlay();
        startSteamInputPolling();
    }, 50);

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
