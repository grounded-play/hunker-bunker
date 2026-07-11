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

const DEV = process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:5173';
// Spacewar test appid until the real one is set (docs/steam-build-pipeline.md
// human checklist step 1). Override without a rebuild via HB_STEAM_APPID.
const STEAM_APPID = Number(process.env.HB_STEAM_APPID ?? 480);

let steam = null;
let steamClient = null;

function initSteam() {
    try {
        // In dev, steamworks.js needs steam_appid.txt beside the executable's
        // cwd. Never ship this file in a depot — retail launches through Steam.
        if (DEV) {
            try { fs.writeFileSync(path.join(process.cwd(), 'steam_appid.txt'), String(STEAM_APPID)); } catch { /* best effort */ }
        }
        // eslint-disable-next-line global-require
        steam = require('steamworks.js');
        steamClient = steam.init(STEAM_APPID);
        console.log(`[steam] initialized (appid ${STEAM_APPID}) as ${steamClient.localplayer.getName()}`);
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
ipcMain.handle('hb:steamInfo', () => ({
    active: Boolean(steamClient),
    persona: steamClient ? steamClient.localplayer.getName() : null,
    appId: STEAM_APPID
}));

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
    return win;
}

initSteam();
enableOverlay();

app.whenReady().then(() => {
    loadSaveFile();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    flushSaveFile();
    app.quit();
});
