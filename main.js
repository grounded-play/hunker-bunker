import { AudioManager } from './src/audio.js';
import { BankManager, FOUNDRY_ACTIVATION_COST } from './src/bank.js';
import { FabricatorManager, FAB_RECIPES, FAB_SPIN_COST, FABRICATOR_SITE_MAX_USES } from './src/fabricator.js';
import { ProfileManager, clearSaveData, exportSaveCode, importSaveCode } from './src/profile.js';
import { LoadoutManager } from './src/loadout.js';
import { CutsceneManager } from './src/cutscene.js';
import { DialogueManager } from './src/dialogue.js';
import { VitalsHUD } from './src/vitals.js';
import { blackBoxStore } from './src/blackBox.js';
import { codexStore } from './src/codex.js';
import { CODEX_ENTRIES, CODEX_CATEGORIES, getCodexEntry, CODEX_TOTAL } from './src/data/codex.js';
import { pickRunModifier } from './src/data/runModifiers.js';
import { pickMissionBriefing } from './src/data/missions.js';
import { DIALOGUE_LINES, getDialogueLine } from './src/data/dialogueLines.js';
import { ArcStateManager } from './src/arcState.js';
import { CaveRevealController } from './src/caveReveal.js';
import { Act2Manager, ACT2_ENDING_CUTSCENES, ACT2_LINES, getAct2EndingLines } from './src/act2.js';
import { ARC_PRELUDE_ENABLED } from './src/featureFlags.js';
import { getGifDurationMs } from './src/gifDuration.js';
const startBtn = document.getElementById('start-game'); // INITIALIZE button
const playBtn = document.getElementById('enter-fullscreen'); // PLAY GAME button
const splash = document.getElementById('splash');
const menu = document.getElementById('menu');
const loadingScreen = document.getElementById('loading-screen');
const transitionOverlay = document.getElementById('transition-overlay');
const loaderTitle = document.querySelector('.loader-title');
const loaderBar = document.querySelector('.loader-bar');
const loaderStatus = document.querySelector('.loader-status');
const loaderBriefingAvatar = document.getElementById('loader-briefing-avatar');
const loaderBriefingAvatarImg = document.getElementById('loader-briefing-avatar-img');
const loaderBriefingSpeaker = document.getElementById('loader-briefing-speaker');

const splashDebugToggle = document.getElementById('splash-debug-toggle');
const splashFsToggle = document.getElementById('splash-fs-toggle');
const mainDebugToggle = document.getElementById('main-debug-toggle');
const splashNightVisionToggle = document.getElementById('splash-nightvision-toggle');
const mainNightVisionToggle = document.getElementById('main-nightvision-toggle');
const gameViewport = document.getElementById('game-viewport');
const gameStageContainer = document.getElementById('game-container');
const touchMoveControl = document.getElementById('touch-move-control');
const touchMoveRing = touchMoveControl?.querySelector('.touch-move-control__ring');
const touchMoveThumb = touchMoveControl?.querySelector('.touch-move-control__thumb');
const touchCompass = touchMoveControl?.querySelector('.touch-move-control__compass');
const touchCompassArrow = touchCompass?.querySelector('.touch-move-control__compass-arrow');
const touchCompassRadarArrow = touchCompass?.querySelector('#touch-compass-radar-arrow');
const touchCompassDistance = touchCompass?.querySelector('.touch-move-control__compass-distance');
const touchCompassRadarDistance = touchCompass?.querySelector('#touch-compass-radar-distance');
const touchControlsSetting = document.getElementById('touch-controls-setting');
const mainTouchToggle = document.getElementById('main-touch-toggle');
const orientationLock = document.getElementById('orientation-lock');
const openAudioMixerBtn = document.getElementById('open-audio-mixer');
const audioMixerPopup = document.getElementById('audio-mixer-popup');
const closeAudioMixerBtn = document.getElementById('close-audio-mixer');
const saveAudioMixBtn = document.getElementById('save-audio-mix');
const openSaveDataBtn = document.getElementById('open-save-data');
const saveDataPopup = document.getElementById('save-data-popup');
const closeSaveDataBtn = document.getElementById('close-save-data');
const saveDataCode = document.getElementById('save-data-code');
const saveDataStatus = document.getElementById('save-data-status');
const openResetSaveBtn = document.getElementById('open-reset-save');
const resetSaveConfirmModal = document.getElementById('reset-save-confirm-modal');
const resetSaveConfirmBtn = document.getElementById('reset-save-confirm');
const resetSaveCancelBtn = document.getElementById('reset-save-cancel');
const campChoiceModal = document.getElementById('camp-choice-modal');
const campChoiceCloseBtn = document.getElementById('close-camp-choice');
const campChoiceKicker = document.getElementById('camp-choice-kicker');
const campChoiceTitle = document.getElementById('camp-choice-title');
const campChoiceStatus = document.getElementById('camp-choice-status');
const campChoiceCopy = document.getElementById('camp-choice-copy');
const campChoiceOptions = document.getElementById('camp-choice-options');
const audioMasterSlider = document.getElementById('audio-master-slider');
const audioMusicSlider = document.getElementById('audio-music-slider');
const audioVfxSlider = document.getElementById('audio-vfx-slider');
const audioMasterValue = document.getElementById('audio-master-value');
const audioMusicValue = document.getElementById('audio-music-value');
const audioVfxValue = document.getElementById('audio-vfx-value');
const pickupCountTotal = document.getElementById('pickup-count-total');
const bunkerLevelNum = document.getElementById('level-num');
const biomeLabelEl = document.getElementById('biome-label');
const weaponStatusPanel = document.getElementById('weapon-status-panel');
const weaponClipCurrent = document.getElementById('weapon-clip-current');
const weaponClipMax = document.getElementById('weapon-clip-max');
const weaponAmmoCache = document.getElementById('weapon-ammo-cache');
const weaponReloadBar = document.getElementById('weapon-reload-bar');
const shipHpBar = document.getElementById('ship-hp-bar');
const shipHpText = document.getElementById('ship-hp-text');
const pickupCountByType = {
    health: document.getElementById('pickup-count-health'),
    weapon: document.getElementById('pickup-count-weapon'),
    coin: document.getElementById('pickup-count-coin')
};

const DESIGN_STAGE = {
    width: 177,
    height: 100
};
const AUDIO_MIX_STORAGE_KEY = 'hunker_audio_mix_v1';
const LEGACY_AUDIO_TOGGLE_KEY = 'hunker_audio_enabled';
const DEFAULT_AUDIO_MIX = Object.freeze({
    master: 1,
    music: 1,
    vfx: 1
});
const KEY_BINDINGS_STORAGE_KEY = 'hunker_key_bindings';
// Each action has a [primary, secondary] slot. WASD + arrow keys are equivalent
// out of the box. threeGame.js reads window.state.settings.keyBindings.
const DEFAULT_KEY_BINDINGS = Object.freeze({
    moveUp: ['KeyW', 'ArrowUp'],
    moveDown: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    interact: ['KeyE', null],
    reload: ['KeyR', null],
    ability: ['KeyF', null],
    scan: ['KeyQ', null],
    sprint: ['ShiftLeft', 'ShiftRight']
});

let appPhase = 'loading';

function isGameplayPhase() {
    return appPhase === 'gameplay';
}

function isGameplayHudActive() {
    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const gameOverModal = document.getElementById('game-over-modal');
    const splash = document.getElementById('splash');
    return isGameplayPhase()
        && ui && !ui.classList.contains('hidden')
        && (!menu || menu.classList.contains('hidden'))
        && (!gameOverModal || gameOverModal.classList.contains('hidden'))
        && (!splash || splash.classList.contains('hidden'))
        && !document.body.classList.contains('mission-intro-active')
        && !document.body.classList.contains('hud-hidden');
}

function clearLoaderBriefingMode() {
    loadingScreen?.classList.remove('briefing-mode', 'tactical-mode');
    loaderBriefingAvatar?.classList.add('hidden');
    loaderBriefingSpeaker?.classList.add('hidden');
}

function hideAllGameplayPrompts() {
    const promptIds = [
        'tutorial-prompt',
        'biome-hud-prompt',
        'mission-progress-hud',
        'console-hud-prompt',
        'lore-hud-prompt',
        'foundry-hud-prompt',
        'o2-generator-hud-prompt',
        'black-box-hud-prompt',
        'radio-transmission-prompt'
    ];
    for (const id of promptIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.classList.add('hidden');
        el.classList.remove('visible', 'is-visible', 'is-exiting');
    }
}

function setAppPhase(phase) {
    appPhase = phase;
    if (!isGameplayPhase()) {
        if (tacticalOverlayTimer) {
            clearTimeout(tacticalOverlayTimer);
            tacticalOverlayTimer = null;
        }
        hideAllGameplayPrompts();
        hideMissionProgressHUD();
        hideBiomePrompt();
        clearLoaderBriefingMode();
        window.game?.setInputEnabled?.(false);
    }
}
const CONTROL_ACTIONS = Object.freeze([
    { id: 'moveUp', label: 'MOVE UP' },
    { id: 'moveDown', label: 'MOVE DOWN' },
    { id: 'moveLeft', label: 'MOVE LEFT' },
    { id: 'moveRight', label: 'MOVE RIGHT' },
    { id: 'interact', label: 'INTERACT' },
    { id: 'reload', label: 'RELOAD' },
    { id: 'ability', label: 'EXOSUIT ACTION' },
    { id: 'scan', label: 'RADAR SCAN' },
    { id: 'sprint', label: 'SPRINT BURST' }
]);
const BUNKER_TIER_NAMES = Object.freeze(['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS']);
const DEFAULT_BIOME_LABEL = 'ACTIVE SECTOR';
const STARTING_RUN_AMMO = 18;
const CLASS_AMMO_CAPACITY = Object.freeze({
    SCOUT: 24,
    TANK: 30,
    ENGINEER: 21
});

const state = {
    settings: {
        debug: false,
        audioMix: { ...DEFAULT_AUDIO_MIX },
        fullscreen: false,
        touchControls: false,
        nightVision: false,
        keyBindings: cloneKeyBindings(DEFAULT_KEY_BINDINGS)
    },
    onlineCount: 1,
    gameInitialized: false
};
// Exposed so threeGame.js can read live key bindings without a circular import.
window.state = state;

const gearSpinState = {
    rotation: 0,
    velocity: 0,
    targetVelocity: 0,
    lastTime: performance.now()
};

let stageResizeObserver = null;
let activeTouchPointerId = null;
let draftAudioMix = { ...DEFAULT_AUDIO_MIX };
let cutsceneManager = null;
let dialogueManager = null;
const arcManager = ARC_PRELUDE_ENABLED ? new ArcStateManager() : null;
const act2Manager = ARC_PRELUDE_ENABLED ? new Act2Manager() : null;
let missionFlowRunning = false;
let isResettingRun = false;

function isPortraitOrientationLocked() {
    const visualWidth = window.visualViewport?.width ?? window.innerWidth;
    const visualHeight = window.visualViewport?.height ?? window.innerHeight;
    return window.matchMedia('(orientation: portrait)').matches
        || visualHeight > visualWidth;
}

function clearTouchInputState() {
    activeTouchPointerId = null;
    touchMoveControl?.classList.remove('active');
    touchMoveThumb?.style.setProperty('transform', 'translate(-50%, -50%)');
    window.game?.setVirtualInput?.(0, 0);
    window.game?.setVirtualInputSprint?.(false);
    const touchSprintBtn = document.getElementById('touch-sprint-btn');
    if (touchSprintBtn) {
        touchSprintBtn.classList.remove('sprint-active');
        const label = touchSprintBtn.querySelector('#touch-sprint-cooldown');
        if (label) label.textContent = 'READY';
    }
}

function clearTouchMoveInputState() {
    activeTouchPointerId = null;
    touchMoveControl?.classList.remove('active');
    touchMoveThumb?.style.setProperty('transform', 'translate(-50%, -50%)');
    window.game?.setVirtualInput?.(0, 0);
}

function syncOrientationLockState() {
    const locked = isPortraitOrientationLocked();
    document.body.classList.toggle('orientation-locked', locked);
    orientationLock?.setAttribute('aria-hidden', locked ? 'false' : 'true');

    if (locked) {
        clearTouchInputState();
        window.game?.setVirtualInput?.(0, 0);
        window.game?.clearGameplayInputState?.();
    }
}

function installOrientationInputLock() {
    if (!orientationLock) return;

    window.HunkerOrientationLock = {
        isLocked: isPortraitOrientationLocked
    };

    const blockInteraction = (event) => {
        if (!isPortraitOrientationLocked()) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
    };

    [
        'pointerdown',
        'pointermove',
        'pointerup',
        'pointercancel',
        'mousedown',
        'mouseup',
        'click',
        'dblclick',
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel'
    ].forEach((eventName) => {
        document.addEventListener(eventName, blockInteraction, true);
    });

    syncOrientationLockState();
    window.addEventListener('resize', syncOrientationLockState);
    window.addEventListener('orientationchange', syncOrientationLockState);
    window.visualViewport?.addEventListener('resize', syncOrientationLockState);
}
let deathSequenceTimer = null;
let damageFlashTimer = null;
let weaponErrorTimer = null;
let biomePromptTimer = null;
let missionProgressHUDTimer = null;
let o2AlarmTimer = null;
let o2AlarmActive = false;
let pickupComboCount = 0;
let pickupComboTimer = null;
const PICKUP_COMBO_WINDOW_MS = 1400;
const PICKUP_COMBO_THRESHOLD = 3;
let runStartTime = Date.now();
let currentMission = null;
let currentRunModifier = null;
const _mothershipFiredTriggers = new Set();
let _lastMothershipBroadcastAt = 0;
const MOTHERSHIP_REACTIVE_COOLDOWN_MS = 45000;
const MOTHERSHIP_REACTIVE_CRITICAL = new Set(['hp_critical', 'objective_found', 'first_boss']);
const pickupCounterState = {
    total: 0,
    health: 0,
    ammo: 0,
    weapon: 0,
    coin: 0
};
let activeAmmoCapacity = CLASS_AMMO_CAPACITY.SCOUT;
const bankManager = new BankManager();

window.bankManager = bankManager;

const fabricator = new FabricatorManager();
window.fabricator = fabricator;

const profile = new ProfileManager();
window.profile = profile;

const loadout = new LoadoutManager();
window.loadout = loadout;

// ── Daily Ops System ──────────────────────────────────────────
const DAILY_OPS_KEY_PREFIX = 'hb_daily_v1_';

function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDailySeedInt() {
    const str = getTodayDateString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(hash * 31 + str.charCodeAt(i), 1);
        hash ^= hash >>> 16;
    }
    return Math.abs(hash) || 12345;
}

function getDailyOpsRecord() {
    const key = DAILY_OPS_KEY_PREFIX + getTodayDateString();
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? null; } catch { return null; }
}

function saveDailyOpsRecord(record) {
    const key = DAILY_OPS_KEY_PREFIX + getTodayDateString();
    try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* ignore */ }
}

function updateDailyOpsUI() {
    const btn = document.getElementById('daily-ops-btn');
    const statusEl = document.getElementById('daily-ops-status');
    const record = getDailyOpsRecord();
    if (btn) btn.disabled = Boolean(record?.completed);
    if (statusEl) {
        if (record?.completed) {
            const g = record.grade ?? 'D';
            statusEl.textContent = `${record.score} PTS // ${g}`;
        } else if (record?.attempted) {
            statusEl.textContent = 'IN PROGRESS';
        } else {
            statusEl.textContent = 'READY';
        }
    }
}

let _isDailyOpsRun = false;

function refreshCharBestScores() {
    for (const cls of ['SCOUT', 'TANK', 'ENGINEER']) {
        const el = document.getElementById(`char-best-${cls}`);
        if (!el) continue;
        const best = Number(localStorage.getItem(`hb_best_score_${cls}`) ?? 0);
        const formattedScore = String(best).padStart(4, '0');
        el.textContent = `◈ BEST: ${formattedScore} PTS`;
    }
}

function recomputePickupTotal() {
    pickupCounterState.total = Math.max(
        0,
        (pickupCounterState.health ?? 0)
        + (pickupCounterState.weapon ?? 0)
        + (pickupCounterState.coin ?? 0)
    );
}

// Shells live in the bank (they never ride the extraction loop), so the HUD
// row tracks the banked total directly.
const pickupCountShells = document.getElementById('pickup-count-shells');

function renderShellCounter(total = bankManager.getShells?.() ?? 0) {
    if (pickupCountShells) pickupCountShells.textContent = String(total);
}

window.addEventListener('shells-changed', (event) => {
    renderShellCounter(event?.detail?.shells);
});

window.addEventListener('shell-collected', (event) => {
    renderShellCounter(event?.detail?.total);
    const row = pickupCountShells?.closest('.pickup-counter-panel__row');
    if (row) {
        row.classList.remove('pickup-counter-panel__row--shell-flash');
        void row.offsetWidth; // restart the animation
        row.classList.add('pickup-counter-panel__row--shell-flash');
    }
});

function renderPickupCounter() {
    renderShellCounter();
    if (pickupCountTotal) {
        pickupCountTotal.textContent = String(pickupCounterState.total);
    }

    for (const [type, el] of Object.entries(pickupCountByType)) {
        if (!el) continue;
        el.textContent = String(pickupCounterState[type] ?? 0);
    }

    if (weaponAmmoCache) {
        weaponAmmoCache.textContent = `CACHE ${pickupCounterState.ammo}/${activeAmmoCapacity}`;
    }
}

function getAmmoCapacityForClass(type = 'SCOUT') {
    return CLASS_AMMO_CAPACITY[type] ?? CLASS_AMMO_CAPACITY.SCOUT;
}

function setActiveAmmoCapacity(type = 'SCOUT', { clampExisting = false } = {}) {
    activeAmmoCapacity = getAmmoCapacityForClass(type);
    if (clampExisting) {
        pickupCounterState.ammo = Math.min(pickupCounterState.ammo, activeAmmoCapacity);
        recomputePickupTotal();
    }
    renderPickupCounter();
}

function clampAudioMixValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    return Math.min(1, Math.max(0, numeric));
}

function parseStoredAudioMix(rawValue) {
    if (!rawValue) return null;
    try {
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            master: clampAudioMixValue(parsed.master !== undefined ? parsed.master : parsed.world),
            music: clampAudioMixValue(parsed.music),
            vfx: clampAudioMixValue(parsed.vfx !== undefined ? parsed.vfx : parsed.sfx)
        };
    } catch {
        return null;
    }
}

function cloneAudioMix(mix) {
    return {
        master: clampAudioMixValue(mix?.master),
        music: clampAudioMixValue(mix?.music),
        vfx: clampAudioMixValue(mix?.vfx)
    };
}

function setAudioMixerOpen(isOpen) {
    if (!audioMixerPopup) return;
    audioMixerPopup.classList.toggle('hidden', !isOpen);
}

function syncAudioMixerUI(mix = state.settings.audioMix) {
    const controls = [
        { channel: 'master', slider: audioMasterSlider, valueEl: audioMasterValue },
        { channel: 'music', slider: audioMusicSlider, valueEl: audioMusicValue },
        { channel: 'vfx', slider: audioVfxSlider, valueEl: audioVfxValue }
    ];

    controls.forEach(({ channel, slider, valueEl }) => {
        const pct = Math.round(clampAudioMixValue(mix[channel]) * 100);
        if (slider) slider.value = String(pct);
        if (valueEl) valueEl.textContent = `${pct}%`;
    });
}

function applyAudioMixSettings(nextMix, { persist = true } = {}) {
    state.settings.audioMix = cloneAudioMix(nextMix);
    draftAudioMix = cloneAudioMix(state.settings.audioMix);

    AudioManager.setMix(state.settings.audioMix);
    syncAudioMixerUI(state.settings.audioMix);

    if (persist) {
        localStorage.setItem(AUDIO_MIX_STORAGE_KEY, JSON.stringify(state.settings.audioMix));
    }
}

function loadAudioMixSettings() {
    const storedMix = parseStoredAudioMix(localStorage.getItem(AUDIO_MIX_STORAGE_KEY));
    if (storedMix) {
        // Self-heal a fully-zeroed mix: the old audio-off toggle migrated to
        // {0,0,0} and then every boot started silent. Nobody wants a mixer
        // that persists at absolute zero across sessions — restore defaults.
        const allZero = storedMix.master === 0 && storedMix.music === 0 && storedMix.vfx === 0;
        if (!allZero) {
            applyAudioMixSettings(storedMix, { persist: false });
            return;
        }
        applyAudioMixSettings({ ...DEFAULT_AUDIO_MIX }, { persist: true });
        return;
    }

    // Legacy toggle migrates to defaults either way — a muted mix that
    // silently persists forever reads as a bug, not a preference.
    applyAudioMixSettings({ ...DEFAULT_AUDIO_MIX }, { persist: true });
    localStorage.removeItem(LEGACY_AUDIO_TOGGLE_KEY);
}

function installAudioMixerControls() {
    if (openAudioMixerBtn) {
        openAudioMixerBtn.addEventListener('click', () => {
            draftAudioMix = cloneAudioMix(state.settings.audioMix);
            syncAudioMixerUI(draftAudioMix);
            setAudioMixerOpen(true);
        });
    }

    if (closeAudioMixerBtn) {
        closeAudioMixerBtn.addEventListener('click', () => {
            draftAudioMix = cloneAudioMix(state.settings.audioMix);
            AudioManager.setMix(state.settings.audioMix);
            syncAudioMixerUI(draftAudioMix);
            setAudioMixerOpen(false);
        });
    }

    if (saveAudioMixBtn) {
        saveAudioMixBtn.addEventListener('click', () => {
            applyAudioMixSettings(draftAudioMix, { persist: true });
            setAudioMixerOpen(false);
            AudioManager.play('ui_click', { volume: 0.5 });
        });
    }

    if (audioMixerPopup) {
        audioMixerPopup.addEventListener('click', (event) => {
            if (event.target !== audioMixerPopup) return;
            draftAudioMix = cloneAudioMix(state.settings.audioMix);
            AudioManager.setMix(state.settings.audioMix);
            syncAudioMixerUI(draftAudioMix);
            setAudioMixerOpen(false);
        });
    }

    const sliderDefs = [
        { channel: 'master', slider: audioMasterSlider },
        { channel: 'music', slider: audioMusicSlider },
        { channel: 'vfx', slider: audioVfxSlider }
    ];

    sliderDefs.forEach(({ channel, slider }) => {
        if (!slider) return;
        const updateChannel = (event) => {
            const percent = clampAudioMixValue(Number(event.target.value) / 100);
            draftAudioMix = {
                ...draftAudioMix,
                [channel]: percent
            };
            AudioManager.setMix(draftAudioMix);
            syncAudioMixerUI(draftAudioMix);
        };
        slider.addEventListener('input', updateChannel);
        slider.addEventListener('change', updateChannel);
    });
}

// ── Desktop control remapping ────────────────────────────────────────────────
function cloneKeyBindings(bindings) {
    const out = {};
    for (const action of Object.keys(DEFAULT_KEY_BINDINGS)) {
        const slots = bindings?.[action] ?? DEFAULT_KEY_BINDINGS[action];
        out[action] = [slots?.[0] ?? null, slots?.[1] ?? null];
    }
    return out;
}

function keyCodeLabel(code) {
    if (!code) return '—';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
    const named = {
        Space: 'SPACE', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', Backquote: '`',
        ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL',
        ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT'
    };
    return named[code] ?? code.toUpperCase();
}

function loadKeyBindings() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY_BINDINGS_STORAGE_KEY) ?? 'null'); } catch { /* ignore */ }
    state.settings.keyBindings = cloneKeyBindings(stored ?? DEFAULT_KEY_BINDINGS);
}

function saveKeyBindings(bindings) {
    state.settings.keyBindings = cloneKeyBindings(bindings);
    try {
        localStorage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(state.settings.keyBindings));
    } catch { /* ignore */ }
}

function setupControlsModal() {
    const popup = document.getElementById('controls-popup');
    const list = document.getElementById('controls-list');
    const openBtn = document.getElementById('open-controls');
    const closeBtn = document.getElementById('close-controls');
    const saveBtn = document.getElementById('save-controls');
    const resetBtn = document.getElementById('reset-controls');
    if (!popup || !list) return;

    let draft = cloneKeyBindings(state.settings.keyBindings);
    let listening = null; // { action, slot, btn }

    const stopListening = () => {
        if (listening?.btn) listening.btn.classList.remove('listening');
        listening = null;
    };

    const renderRows = () => {
        list.innerHTML = '';
        for (const action of CONTROL_ACTIONS) {
            const row = document.createElement('div');
            row.className = 'control-row';
            const label = document.createElement('span');
            label.className = 'control-row__label';
            label.textContent = action.label;
            row.appendChild(label);
            for (let slot = 0; slot < 2; slot++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'control-key-btn';
                btn.textContent = keyCodeLabel(draft[action.id]?.[slot]);
                btn.addEventListener('click', () => {
                    stopListening();
                    listening = { action: action.id, slot, btn };
                    btn.classList.add('listening');
                    btn.textContent = '...';
                });
                row.appendChild(btn);
            }
            list.appendChild(row);
        }
    };

    // Capture-phase so the remap keystroke never reaches the game's handlers.
    const onKeyDown = (event) => {
        if (!listening) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.code !== 'Escape') {
            // Clear this code from every other slot so it isn't double-bound.
            for (const a of Object.keys(draft)) {
                draft[a] = draft[a].map((c) => (c === event.code ? null : c));
            }
            draft[listening.action][listening.slot] = event.code;
        }
        stopListening();
        renderRows();
    };

    const open = () => {
        draft = cloneKeyBindings(state.settings.keyBindings);
        renderRows();
        popup.classList.remove('hidden');
        window.addEventListener('keydown', onKeyDown, true);
    };
    const close = () => {
        stopListening();
        window.removeEventListener('keydown', onKeyDown, true);
        popup.classList.add('hidden');
    };

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    popup.addEventListener('click', (event) => { if (event.target === popup) close(); });
    resetBtn?.addEventListener('click', () => {
        draft = cloneKeyBindings(DEFAULT_KEY_BINDINGS);
        stopListening();
        renderRows();
    });
    saveBtn?.addEventListener('click', () => {
        saveKeyBindings(draft);
        AudioManager.play('ui_click', { volume: 0.5 });
        close();
    });
}

function resetPickupCounter(playerType = (window.game?.playerType || 'SCOUT')) {
    setActiveAmmoCapacity(playerType, { clampExisting: false });
    pickupCounterState.health = 0;
    pickupCounterState.ammo = Math.min(STARTING_RUN_AMMO, activeAmmoCapacity);
    pickupCounterState.weapon = 0;
    pickupCounterState.coin = 0;
    recomputePickupTotal();
    renderPickupCounter();
}

function getSessionInventorySnapshot() {
    return {
        health: pickupCounterState.health,
        ammo: pickupCounterState.ammo,
        weapon: pickupCounterState.weapon,
        coin: pickupCounterState.coin,
        total: (pickupCounterState.health ?? 0)
            + (pickupCounterState.weapon ?? 0)
            + (pickupCounterState.coin ?? 0)
    };
}

function consumeSessionInventoryForDeposit(inventory = {}) {
    const health = Number.isFinite(inventory.health) ? Math.max(0, Math.floor(inventory.health)) : 0;
    const weapon = Number.isFinite(inventory.weapon) ? Math.max(0, Math.floor(inventory.weapon)) : 0;
    const coin = Number.isFinite(inventory.coin) ? Math.max(0, Math.floor(inventory.coin)) : 0;

    pickupCounterState.health = Math.max(0, pickupCounterState.health - health);
    pickupCounterState.weapon = Math.max(0, pickupCounterState.weapon - weapon);
    pickupCounterState.coin = Math.max(0, pickupCounterState.coin - coin);
    recomputePickupTotal();
    renderPickupCounter();
}

function trackPickupCollected(event) {
    const type = event?.detail?.type;
    if (!type || !(type in pickupCounterState)) return;

    const previousValue = pickupCounterState[type] ?? 0;
    if (type === 'ammo') {
        pickupCounterState.ammo = Math.min(activeAmmoCapacity, previousValue + 1);
    } else {
        pickupCounterState[type] = previousValue + 1;
    }

    const gainedValue = pickupCounterState[type] > previousValue;
    recomputePickupTotal();
    renderPickupCounter();
    if (!gainedValue) {
        if (type === 'ammo') {
            flashWeaponError();
        }
        return;
    }

    // Play dynamic procedurally synthesized loot sound
    const rarity = event?.detail?.rarity;
    AudioManager.playProceduralLoot(type, rarity);

    // Rare+ loot flash
    if (rarity === 'legendary') {
        AudioManager.play('ui_boot', { volume: 0.32, playbackRate: 1.22, bus: 'sfx' });
        const viewport = document.getElementById('game-viewport');
        if (viewport) {
            viewport.classList.add('pickup-legendary-flash');
            setTimeout(() => viewport.classList.remove('pickup-legendary-flash'), 500);
        }
    } else if (rarity === 'rare') {
        AudioManager.play('ui_scan_ping', { volume: 0.22, playbackRate: 1.35, bus: 'sfx' });
    }

    // Pickup combo tracking
    pickupComboCount += 1;
    if (pickupComboTimer) clearTimeout(pickupComboTimer);
    if (pickupComboCount >= PICKUP_COMBO_THRESHOLD) {
        AudioManager.play('ui_scan_ping', { volume: 0.28, playbackRate: 1.65 + Math.min(pickupComboCount - PICKUP_COMBO_THRESHOLD, 4) * 0.08, bus: 'sfx' });
        const lootPanel = document.getElementById('pickup-counter-panel');
        if (lootPanel) {
            lootPanel.classList.add('pickup-counter-panel--combo');
            setTimeout(() => lootPanel.classList.remove('pickup-counter-panel--combo'), 380);
        }
    }
    pickupComboTimer = setTimeout(() => {
        pickupComboCount = 0;
        pickupComboTimer = null;
    }, PICKUP_COMBO_WINDOW_MS);
}

function consumeSessionAmmoCache(amount = 1) {
    const spend = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (spend <= 0) return;
    pickupCounterState.ammo = Math.max(0, pickupCounterState.ammo - spend);
    recomputePickupTotal();
    renderPickupCounter();
}

function renderWeaponClipState(detail = {}) {
    const clip = Number.isFinite(detail.clip) ? Math.max(0, Math.floor(detail.clip)) : 0;
    const maxClip = Number.isFinite(detail.maxClip) ? Math.max(1, Math.floor(detail.maxClip)) : 6;
    const cache = Number.isFinite(detail.cache) ? Math.max(0, Math.floor(detail.cache)) : pickupCounterState.ammo;
    const reloading = Boolean(detail.reloading);
    const reloadProgress = Number.isFinite(detail.reloadProgress)
        ? Math.max(0, Math.min(1, detail.reloadProgress))
        : 0;
    const autoRefillProgress = Number.isFinite(detail.autoRefillProgress)
        ? Math.max(0, Math.min(1, detail.autoRefillProgress))
        : 0;
    const refilling = !reloading && autoRefillProgress > 0;

    if (weaponClipCurrent) {
        weaponClipCurrent.textContent = String(clip);
    }
    if (weaponClipMax) {
        weaponClipMax.textContent = String(maxClip);
    }
    if (weaponAmmoCache) {
        weaponAmmoCache.textContent = `CACHE ${cache}/${activeAmmoCapacity}`;
    }
    if (weaponReloadBar) {
        weaponReloadBar.style.transform = `scaleX(${reloading ? reloadProgress : refilling ? autoRefillProgress : 0})`;
    }
    if (weaponStatusPanel) {
        weaponStatusPanel.classList.toggle('is-reloading', reloading);
        weaponStatusPanel.classList.toggle('is-refilling', refilling);
        weaponStatusPanel.setAttribute('aria-busy', reloading ? 'true' : 'false');
    }
}

function flashWeaponError() {
    if (!weaponStatusPanel) return;
    weaponStatusPanel.classList.add('is-error');
    if (weaponErrorTimer) {
        clearTimeout(weaponErrorTimer);
        weaponErrorTimer = null;
    }
    weaponErrorTimer = window.setTimeout(() => {
        weaponStatusPanel.classList.remove('is-error');
        weaponErrorTimer = null;
    }, 740);
}

function requestWeaponReload() {
    window.game?.requestReload?.({ manual: true, fromUI: true });
}

function renderShipHealth(detail = {}) {
    const hp = Number.isFinite(detail.hp) ? Math.max(0, detail.hp) : 0;
    const maxHp = Number.isFinite(detail.maxHp) ? Math.max(1, detail.maxHp) : 1;
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

    if (shipHpBar) {
        shipHpBar.style.width = `${pct}%`;
        if (pct <= 25) {
            shipHpBar.style.background = 'linear-gradient(90deg, #a90f0f, #ff4d4d)';
        } else if (pct <= 55) {
            shipHpBar.style.background = 'linear-gradient(90deg, #c37d00, #ffb700)';
        } else {
            shipHpBar.style.background = 'linear-gradient(90deg, #00b4d8, #00e5ff)';
        }
    }
    if (shipHpText) {
        shipHpText.textContent = `${Math.round(pct)}%`;
    }
}

window.addEventListener('pickup-collected', trackPickupCollected);
window.addEventListener('player-consume-ammo-cache', (event) => {
    consumeSessionAmmoCache(event?.detail?.amount ?? 1);
});
window.addEventListener('combat-no-ammo', () => {
    flashWeaponError();
});
window.addEventListener('combat-no-fire-zone', () => {
    flashWeaponError();
});
window.addEventListener('enemy-killed', (event) => {
    const total = event?.detail?.totalKills ?? 0;
    const type = event?.detail?.type ?? '';
    const isBoss = Boolean(event?.detail?.isBoss);
    if (total === 1 && !isBoss) fireMothershipReactiveLine('first_kill');
    if (type === 'sentinel') fireMothershipReactiveLine('sentinel_spotted');
    if (type === 'crawler') fireMothershipReactiveLine('crawler_detected');
    if (isBoss || (typeof type === 'string' && type.startsWith('boss_'))) {
        void dialogueManager?.openBriefTransmission?.({
            playerType: window.game?.playerType || getSelectedHeroType(),
            lines: [
                'MOTHERSHIP: APEX BIO-ENTITY DOWN.',
                'MOTHERSHIP: SIGNAL ATTENUATION CONFIRMED. FIELD PATH IS CLEAR.'
            ],
            holdMs: 1100
        });
    }
    // Escalation beat: once the agent racks up kills, 0047 takes notice.
    if (total >= 25) fireMothershipReactiveLine('specimen_notices');
});

window.addEventListener('weapon-upgraded', () => {
    fireMothershipReactiveLine('weapon_calibrated');
});

window.addEventListener('skill-unlocked', () => {
    syncAbilityPanelLabel();
    syncTouchMoveControlVisibility();
});

window.addEventListener('bank-updated', () => {
    syncAbilityPanelLabel();
    syncTouchMoveControlVisibility();
});

window.addEventListener('enemy-hit', (event) => {
    const type = event?.detail?.type || 'cybersnail';
    const isBoss = type.startsWith('boss_');
    const enraged = Boolean(event?.detail?.enraged);
    if (isBoss) {
        window.game?.triggerCameraShake?.(0.12, 0.25);
        AudioManager.play('ui_error', { volume: 0.22, playbackRate: 0.58, bus: 'sfx' });
    } else if (enraged) {
        AudioManager.play('ui_scan_ping', { volume: 0.18, playbackRate: 1.85, bus: 'sfx' });
    }
});
window.addEventListener('weapon-clip-updated', (event) => {
    renderWeaponClipState(event?.detail ?? {});
});
let _lastShipHp = null;
window.addEventListener('ship-health-changed', (event) => {
    const detail = event?.detail ?? {};
    renderShipHealth(detail);

    const hp = Number.isFinite(detail.hp) ? detail.hp : null;
    const maxHp = Number.isFinite(detail.maxHp) ? Math.max(1, detail.maxHp) : 1;
    if (hp !== null && _lastShipHp !== null && hp < _lastShipHp) {
        // Hull breach — visual flash + audio
        const pct = (hp / maxHp) * 100;
        const severity = pct <= 25 ? 'critical' : pct <= 55 ? 'damaged' : 'hit';

        if (shipHpBar) {
            shipHpBar.classList.add('ship-hp-bar--hit');
            setTimeout(() => shipHpBar?.classList.remove('ship-hp-bar--hit'), 280);
        }

        window.AudioManager?.play('ui_error', {
            volume: severity === 'critical' ? 0.65 : 0.42,
            playbackRate: severity === 'critical' ? 0.58 : 0.72,
            bus: 'sfx'
        });
        window.AudioManager?.play('door_slam_vertical', { volume: 0.18, playbackRate: 0.48, bus: 'sfx' });

        const msg = severity === 'critical'
            ? '> SHIP: HULL INTEGRITY CRITICAL — IMMEDIATE EVAC REQUIRED'
            : severity === 'damaged'
            ? '> SHIP: HULL BREACH DETECTED — STRUCTURAL DAMAGE'
            : '> SHIP: HULL IMPACT REGISTERED';
        showBiomePrompt(msg);
    }
    _lastShipHp = hp;
});

function bindReloadTrigger(element, label) {
    if (!element) return;
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', label);
    element.addEventListener('click', (event) => {
        event.preventDefault();
        requestWeaponReload();
    });
    element.addEventListener('keydown', (event) => {
        if (event.code !== 'Enter' && event.code !== 'Space') return;
        event.preventDefault();
        requestWeaponReload();
    });
}

bindReloadTrigger(weaponStatusPanel, 'Reload sidearm');

renderPickupCounter();
renderWeaponClipState({ clip: 6, maxClip: 6, cache: pickupCounterState.ammo, reloading: false });
renderShipHealth({ hp: 1, maxHp: 1 });
window.pickupCounterState = pickupCounterState;
window.resetPickupCounter = resetPickupCounter;
window.getPickupCounterState = getSessionInventorySnapshot;
window.consumeSessionInventoryForDeposit = consumeSessionInventoryForDeposit;
window.getClassAmmoCapacity = () => activeAmmoCapacity;
window.vitalsHUD = new VitalsHUD();

function renderBunkerLevel(tier = 0) {
    const normalized = Number.isFinite(tier)
        ? Math.max(0, Math.min(BUNKER_TIER_NAMES.length - 1, Math.floor(tier)))
        : 0;
    if (!bunkerLevelNum) return;

    bunkerLevelNum.textContent = String(normalized);
    bunkerLevelNum.title = BUNKER_TIER_NAMES[normalized];
    const biomeLabel = biomeLabelEl?.textContent?.trim() || DEFAULT_BIOME_LABEL;
    bunkerLevelNum.setAttribute('aria-label', `BUNKER LEVEL ${normalized} (${BUNKER_TIER_NAMES[normalized]}) — ${biomeLabel}`);
}

function hideBiomePrompt() {
    const prompts = document.querySelectorAll('.radio-transmission-prompt:not(#radio-transmission-prompt)');
    for (const radioPrompt of prompts) dismissRadioPrompt(radioPrompt);
    if (window.radioTypewriterInterval) {
        clearInterval(window.radioTypewriterInterval);
        window.radioTypewriterInterval = null;
    }
    if (radioPumpTimer) {
        clearTimeout(radioPumpTimer);
        radioPumpTimer = null;
    }
    radioQueue = [];
    hudNotificationDeckHoldUntil = 0;
}

function parseRadioTransmission(rawText = '') {
    let sender;
    let text = String(rawText ?? '');
    let portrait;
    const activeClass = window.game?.playerType || 'SCOUT';

    if (text.startsWith('> MOTHERSHIP:')) {
        sender = "MOTHERSHIP COMMAND";
        text = text.replace('> MOTHERSHIP:', '').trim();
        portrait = "/lore_portraits/survivor_00.webp";
    } else if (text.startsWith('> BUNKER:')) {
        sender = "BUNKER AUTO-ANNOUNCER";
        text = text.replace('> BUNKER:', '').trim();
        portrait = "/lore_portraits/survivor_08.webp";
    } else if (text.startsWith('> SCOUT:')) {
        sender = "SCOUT OPERATOR";
        text = text.replace('> SCOUT:', '').trim();
        portrait = "/lore_portraits/survivor_01.webp";
    } else if (text.startsWith('> TANK:')) {
        sender = "TANK OPERATOR";
        text = text.replace('> TANK:', '').trim();
        portrait = "/lore_portraits/survivor_02.webp";
    } else if (text.startsWith('> ENGINEER:')) {
        sender = "ENGINEER OPERATOR";
        text = text.replace('> ENGINEER:', '').trim();
        portrait = "/lore_portraits/survivor_03.webp";
    } else if (text.startsWith('> SYSTEM:') || text.startsWith('SYSTEM:')) {
        sender = "EXOSUIT OS";
        text = text.replace('> SYSTEM:', '').replace('SYSTEM:', '').trim();
        portrait = "/lore_portraits/survivor_04.webp";
    } else if (activeClass === 'SCOUT') {
        sender = "SCOUT OPERATOR";
        portrait = "/lore_portraits/survivor_01.webp";
    } else if (activeClass === 'TANK') {
        sender = "TANK OPERATOR";
        portrait = "/lore_portraits/survivor_02.webp";
    } else if (activeClass === 'ENGINEER') {
        sender = "ENGINEER OPERATOR";
        portrait = "/lore_portraits/survivor_03.webp";
    } else {
        sender = "EXOSUIT OS";
        portrait = "/lore_portraits/survivor_04.webp";
    }

    return { sender, text, portrait };
}

let hudNotificationTopTimer = null;
let hudNotificationTopCard = null;
let hudNotificationDeckHoldUntil = 0;
let hudCardSeq = 0;

const RADIO_REPEAT_SUPPRESSION_MS = 6500;

function getHudNotificationCards() {
    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return [];
    return Array.from(stack.querySelectorAll('.hud-stack-card:not(.hidden)'))
        .filter((card) => card.dataset.dismissing !== 'true')
        .sort((a, b) => {
            const aPriority = Number(a.dataset.notificationPriority ?? 50);
            const bPriority = Number(b.dataset.notificationPriority ?? 50);
            if (aPriority !== bPriority) return aPriority - bPriority;
            return Number(a.dataset.seq ?? 0) - Number(b.dataset.seq ?? 0);
    });
}

function getNowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

function scheduleTopHudNotificationTimer() {
    if (getNowMs() < hudNotificationDeckHoldUntil) return;
    const [topCard] = getHudNotificationCards();
    if (hudNotificationTopCard === topCard && hudNotificationTopTimer) return;
    if (hudNotificationTopTimer) {
        window.clearTimeout(hudNotificationTopTimer);
        hudNotificationTopTimer = null;
    }
    hudNotificationTopCard = topCard ?? null;
    if (!topCard) return;

    const duration = Math.max(1200, Number(topCard.dataset.autoDismissMs) || 4200);
    hudNotificationTopTimer = window.setTimeout(() => {
        hudNotificationTopTimer = null;
        hudNotificationTopCard = null;
        dismissHudNotificationCard(topCard);
    }, duration);
}

function updateHudNotificationDeck() {
    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return;
    const cards = getHudNotificationCards();
    const hasCards = cards.length > 0;
    cards.forEach((card, index) => {
        stack.appendChild(card);
        card.style.setProperty('--deck-index', String(index));
        card.style.zIndex = String(12090 - index);
        card.classList.toggle('is-top-card', index === 0);
    });
    stack.classList.toggle('has-decked-cards', hasCards);
    document.querySelector('.hud-mission-stack')?.classList.toggle('is-below-notifications', hasCards);
    scheduleTopHudNotificationTimer();
}
window.updateHudNotificationDeck = updateHudNotificationDeck;

function dismissHudNotificationCard(card) {
    if (!card || card.dataset.dismissing === 'true') return;
    const wasTopCard = card === hudNotificationTopCard;
    if (card === hudNotificationTopCard && hudNotificationTopTimer) {
        window.clearTimeout(hudNotificationTopTimer);
        hudNotificationTopTimer = null;
        hudNotificationTopCard = null;
    }
    const removeDelay = Number(card.dataset.removeDelayMs) || 300;
    if (wasTopCard) {
        hudNotificationDeckHoldUntil = Math.max(hudNotificationDeckHoldUntil, getNowMs() + removeDelay);
    }
    card.dataset.dismissing = 'true';
    card.classList.remove('visible', 'is-visible', 'is-top-card');
    card.classList.add('is-exiting');
    if (!wasTopCard) {
        updateHudNotificationDeck();
    }
    window.setTimeout(() => {
        card.remove();
        if (wasTopCard) {
            hudNotificationDeckHoldUntil = 0;
        }
        updateHudNotificationDeck();
    }, removeDelay);
}
window.dismissHudNotificationCard = dismissHudNotificationCard;

function dismissRadioPrompt(radioPrompt) {
    dismissHudNotificationCard(radioPrompt);
}

function trimRadioCopy(text) {
    return String(text ?? '')
        .replace(/\s+/g, ' ')
        .replace(/^>+\s*/, '')
        .trim();
}

const RADIO_MIN_GAP_MS = 1400;
const RADIO_MAX_QUEUED = 4;
let radioQueue = [];
let radioPumpTimer = null;
let lastRadioRenderAt = 0;
const radioRecentMessages = new Map();

function normalizedRadioText(rawText) {
    return trimRadioCopy(parseRadioTransmission(rawText).text);
}

function radioTransmissionKey(rawText) {
    const parsed = parseRadioTransmission(rawText);
    return `${parsed.sender}::${trimRadioCopy(parsed.text).toLowerCase()}`;
}

function pruneRadioRecentMessages() {
    while (radioRecentMessages.size > 48) {
        const oldest = radioRecentMessages.keys().next().value;
        if (oldest == null) break;
        radioRecentMessages.delete(oldest);
    }
}

function pumpRadioQueue() {
    radioPumpTimer = null;
    if (!radioQueue.length) return;
    if (!isGameplayPhase() || !isGameplayHudActive() || isResettingRun) {
        radioQueue = [];
        return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const wait = Math.max(0, RADIO_MIN_GAP_MS - (now - lastRadioRenderAt));
    if (wait > 0) {
        radioPumpTimer = window.setTimeout(pumpRadioQueue, wait);
        return;
    }

    const rawText = radioQueue.shift();
    lastRadioRenderAt = now;
    renderRadioTransmission(rawText);
    if (radioQueue.length) {
        radioPumpTimer = window.setTimeout(pumpRadioQueue, RADIO_MIN_GAP_MS);
    }
}

function showRadioTransmission(rawText) {
    if (!isGameplayPhase() || !isGameplayHudActive() || isResettingRun) return;
    const text = normalizedRadioText(rawText);
    if (!text) return;
    const key = radioTransmissionKey(rawText);
    const recentlySeenAt = radioRecentMessages.get(key);
    if (recentlySeenAt != null && getNowMs() - recentlySeenAt < RADIO_REPEAT_SUPPRESSION_MS) return;
    if (radioQueue.some((queued) => radioTransmissionKey(queued) === key)) return;

    const stack = document.querySelector('.hud-notification-stack');
    const alreadyVisible = stack && Array.from(stack.querySelectorAll('.radio-transmission-prompt__message'))
        .some((element) => element.closest('.radio-transmission-prompt')?.dataset.radioKey === key);
    if (alreadyVisible) return;

    radioQueue.push(rawText);
    if (radioQueue.length > RADIO_MAX_QUEUED) {
        radioQueue.splice(0, radioQueue.length - RADIO_MAX_QUEUED);
    }
    if (!radioPumpTimer) pumpRadioQueue();
}

function renderRadioTransmission(rawText) {
    if (!isGameplayPhase()) return;
    if (!isGameplayHudActive() || isResettingRun) return;

    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return;
    const { sender, portrait, text: parsedText } = parseRadioTransmission(rawText);
    const text = trimRadioCopy(parsedText);
    if (!text) return;
    const radioKey = radioTransmissionKey(rawText);

    const radioPrompt = document.createElement('div');
    radioPrompt.className = 'radio-transmission-prompt hud-stack-card hidden';
    radioPrompt.setAttribute('aria-live', 'polite');
    radioPrompt.dataset.notificationPriority = '10';
    radioPrompt.dataset.seq = String(hudCardSeq++);
    radioPrompt.dataset.radioKey = radioKey;
    radioPrompt.dataset.autoDismissMs = String(Math.max(3600, Math.min(7600, text.length * 42)));
    radioPrompt.dataset.removeDelayMs = '300';
    radioPrompt.innerHTML = `
        <div class="radio-transmission-prompt__avatar">
          <img src="${portrait}" alt="Sender Portrait" />
          <div class="radio-transmission-prompt__scanline"></div>
        </div>
        <div class="radio-transmission-prompt__body">
          <div class="radio-transmission-prompt__header">
            <span class="radio-transmission-prompt__signal-icon">⚡</span>
            <span class="radio-transmission-prompt__sender"></span>
            <span class="radio-transmission-prompt__status">ONLINE</span>
          </div>
          <div class="radio-transmission-prompt__message"></div>
        </div>
    `;

    const senderName = radioPrompt.querySelector('.radio-transmission-prompt__sender');
    const messageText = radioPrompt.querySelector('.radio-transmission-prompt__message');
    senderName.textContent = sender;
    messageText.textContent = text;
    radioPrompt.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dismissRadioPrompt(radioPrompt);
    });

    const templatePrompt = document.getElementById('radio-transmission-prompt');
    templatePrompt?.classList.add('hidden');
    stack.append(radioPrompt);
    updateHudNotificationDeck();

    radioPrompt.classList.remove('hidden');
    requestAnimationFrame(() => {
        radioPrompt.classList.add('visible');
        updateHudNotificationDeck();
    });
    radioRecentMessages.set(radioKey, getNowMs());
    pruneRadioRecentMessages();

    const visibleCards = getHudNotificationCards();
    for (const oldCard of visibleCards.slice(3)) {
        dismissRadioPrompt(oldCard);
    }
    updateHudNotificationDeck();
}

function showBiomePrompt(message = '') {
    showRadioTransmission(message);
}

document.getElementById('radio-transmission-prompt')?.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    hideBiomePrompt();
});

function renderBiomeStatus(detail = {}, { showPrompt = false } = {}) {
    const label = typeof detail?.label === 'string' && detail.label.trim()
        ? detail.label.trim()
        : DEFAULT_BIOME_LABEL;
    if (biomeLabelEl) {
        biomeLabelEl.textContent = label;
        biomeLabelEl.title = label;
        biomeLabelEl.setAttribute('aria-label', `CURRENT BIOME ${label}`);
    }

    const hudVisible = isGameplayPhase() && !document.getElementById('ui')?.classList.contains('hidden');
    if (!hudVisible) {
        hideBiomePrompt();
    }
    if (showPrompt && hudVisible) {
        const message = typeof detail?.message === 'string' && detail.message.trim()
            ? detail.message.trim()
            : `ENTERING ${label}`;
        showBiomePrompt(message);
    }
}

function maybeShowCaveSignalTransmission() {
    if (!ARC_PRELUDE_ENABLED || !arcManager) return;
    arcManager.evaluate();
    const arc = arcManager.getState();
    if (arc.arcState !== 'cave_signal') return;
    const lines = DIALOGUE_LINES.caveSignal ?? [];
    if (!lines.length) return;
    const index = Math.min(arc.caveSignalIndex ?? 0, lines.length - 1);
    showRadioTransmission(lines[index]);
    arcManager.recordSignal({ heardCaveSignal: true });
    arcManager.setCaveSignalIndex(Math.min(index + 1, lines.length - 1));
    AudioManager.playProceduralBreathing?.({ volume: 0.035, duration: 1.8 });
}

let lastReportedDepthTier = 0;
window.addEventListener('depth-tier-changed', (event) => {
    const tier = event?.detail?.tier ?? 0;
    renderBunkerLevel(tier);
    if (tier > lastReportedDepthTier && tier > 0) {
        lastReportedDepthTier = tier;
        const label = event?.detail?.label ?? `DEPTH ${tier}`;
        AudioManager.play('ui_boot', { volume: 0.28, playbackRate: 0.78 + tier * 0.06, bus: 'sfx' });
        showBiomePrompt(`> DEPTH: ${label}`);
        maybeShowCaveSignalTransmission();
    }
});
window.addEventListener('black-box-recovered', () => {
    maybeShowCaveSignalTransmission();
});

window.addEventListener('extraction-blocked', () => {
    arcManager?.recordSignal?.({ blockedExtractions: 1 });
    arcManager?.evaluate?.();
});

const BIOME_HUD_COLORS = {
    active: { label: 'rgba(173, 225, 255, 0.98)', glow: 'rgba(94, 178, 255, 0.33)' },
    cryo:   { label: 'rgba(148, 204, 255, 0.98)', glow: 'rgba(68, 158, 240, 0.45)' },
    bio:    { label: 'rgba(144, 220, 140, 0.98)', glow: 'rgba(60, 160, 80, 0.40)'  }
};
window.addEventListener('biome-changed', (event) => {
    renderBiomeStatus(event?.detail ?? {}, { showPrompt: !isResettingRun });
    renderBunkerLevel(window.game?.maxDepthTierReached ?? Number(bunkerLevelNum?.textContent ?? 0));
    const biomeKey = event?.detail?.key ?? 'active';
    const biomeCols = BIOME_HUD_COLORS[biomeKey] ?? BIOME_HUD_COLORS.active;
    const hud = document.getElementById('ui');
    if (hud) {
        hud.style.setProperty('--biome-label-color', biomeCols.label);
        hud.style.setProperty('--biome-label-glow', biomeCols.glow);
    }
    if (!isResettingRun) {
        if (biomeKey === 'cryo') {
            AudioManager.play('ui_scan_ping', { volume: 0.22, playbackRate: 0.48, bus: 'sfx' });
            fireMothershipReactiveLine('first_cryo');
        } else if (biomeKey === 'bio') {
            AudioManager.play('amb_metal_stress', { volume: 0.3, playbackRate: 0.62, bus: 'sfx' });
            fireMothershipReactiveLine('first_bio');
        }
    }
    // Crossfade music to the new biome's exploration stem.
    updateMusicTension();
});
renderBunkerLevel(0);
renderBiomeStatus({ label: DEFAULT_BIOME_LABEL }, { showPrompt: false });

function clearTimedClass(timerRefName, className) {
    if (timerRefName === 'damage') {
        if (damageFlashTimer) {
            clearTimeout(damageFlashTimer);
            damageFlashTimer = null;
        }
    } else if (timerRefName === 'death') {
        if (deathSequenceTimer) {
            clearTimeout(deathSequenceTimer);
            deathSequenceTimer = null;
        }
    }

    document.body.classList.remove(className);
}

let playerDamageCueLastAt = 0;
function playPlayerDamageCue(detail = {}) {
    const now = performance.now();
    if (now - playerDamageCueLastAt < 260) return;
    playerDamageCueLastAt = now;
    const hp = Number.isFinite(detail.hp) ? detail.hp : window.game?.playerVitals?.hp;
    const critical = Number.isFinite(hp) && hp <= 1;
    const reason = detail.reason ?? '';
    const isEnvironmental = reason === 'o2-depletion' || reason === 'poison';
    AudioManager.play('player_hit', {
        volume: critical ? 0.65 : isEnvironmental ? 0.35 : 0.55,
        playbackRate: critical ? 0.82 : isEnvironmental ? 0.95 : 1.0,
        bus: 'sfx'
    });
}

function playPlayerDeathCue(_reason = 'hazard') {
    AudioManager.play('player_death', { volume: 0.75, bus: 'sfx' });
}

function triggerDamageFlash(event) {
    clearTimedClass('damage', 'player-damage-flash');
    document.body.classList.add('player-damage-flash');
    playPlayerDamageCue(event?.detail ?? {});
    damageFlashTimer = window.setTimeout(() => {
        document.body.classList.remove('player-damage-flash');
        damageFlashTimer = null;
    }, 240);
}

// ---- Hero select stat pips ----
const HERO_DISPLAY_STATS = {
    SCOUT:    { spdPips: 5, o2Pips: 2, lootPips: 5, color: '#7dff5a', spdLabel: 'FAST',   o2Label: 'LOW',    lootLabel: 'WIDE',  detail: 'SPRINT BURST // WIDE SALVAGE MAGNET', demoLabel: 'SCOUT DEMO // SPRINT' },
    TANK:     { spdPips: 2, o2Pips: 5, lootPips: 2, color: '#ffb700', spdLabel: 'SLOW',   o2Label: 'HIGH',   lootLabel: 'SHORT', detail: 'BRACE // LOW O₂ DRAIN', demoLabel: 'TANK DEMO // BRACE' },
    ENGINEER: { spdPips: 4, o2Pips: 4, lootPips: 4, color: '#00e5ff', spdLabel: 'NORMAL', o2Label: 'NORMAL', lootLabel: 'NORMAL', detail: 'REROUTE UTILITY // 20% CONSOLE DISCOUNT', demoLabel: 'ENGINEER DEMO // REROUTE' }
};
const HERO_STAT_TOTAL = 5;
const heroStatValueTimers = new WeakMap();

function renderPips(containerId, filled) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (el.children.length !== HERO_STAT_TOTAL) {
        el.replaceChildren();
        for (let i = 0; i < HERO_STAT_TOTAL; i++) {
            const pip = document.createElement('span');
            pip.className = 'pip pip--empty';
            pip.style.setProperty('--pip-index', i);
            el.appendChild(pip);
        }
    }

    for (let i = 0; i < HERO_STAT_TOTAL; i++) {
        const pip = el.children[i];
        pip.classList.toggle('pip--full', i < filled);
        pip.classList.toggle('pip--empty', i >= filled);
    }
}

function crossFadeStatValue(element, text) {
    if (!element) return;

    const pendingTimers = heroStatValueTimers.get(element);
    if (pendingTimers) {
        window.clearTimeout(pendingTimers.swap);
        window.clearTimeout(pendingTimers.end);
    }
    heroStatValueTimers.delete(element);

    if (element.textContent === text) {
        element.classList.remove('is-changing');
        return;
    }

    element.classList.remove('is-changing');
    void element.offsetWidth;
    element.classList.add('is-changing');
    const swap = window.setTimeout(() => {
        element.textContent = text;
    }, 140);
    const end = window.setTimeout(() => {
        element.classList.remove('is-changing');
        heroStatValueTimers.delete(element);
    }, 280);
    heroStatValueTimers.set(element, { swap, end });
}

function updateHeroStats(type) {
    const stats = HERO_DISPLAY_STATS[type];
    if (!stats) return;

    // Set class colour properties on the menu container so all children can inherit/use them
    const menuEl = document.getElementById('menu');
    if (menuEl) {
        menuEl.style.setProperty('--class-color', stats.color);
        const rgbMap = {
            '#7dff5a': '125, 255, 90',
            '#ffb700': '255, 183, 0',
            '#00e5ff': '0, 229, 255'
        };
        menuEl.style.setProperty('--class-color-rgb', rgbMap[stats.color] || '255, 159, 28');
    }

    // Set class colour on the row container so all pips + value text inherit it
    const row = document.getElementById('hero-stats-row');
    if (row) row.style.setProperty('--class-pip-color', stats.color);

    renderPips('hero-stat-spd', stats.spdPips);
    renderPips('hero-stat-o2', stats.o2Pips);
    renderPips('hero-stat-loot', stats.lootPips);

    const spdVal  = document.getElementById('hero-stat-spd-val');
    const o2Val   = document.getElementById('hero-stat-o2-val');
    const lootVal = document.getElementById('hero-stat-loot-val');
    crossFadeStatValue(spdVal, stats.spdLabel);
    crossFadeStatValue(o2Val, stats.o2Label);
    crossFadeStatValue(lootVal, stats.lootLabel);

    const activeEl = document.getElementById('hero-detail-active');
    const passiveEl = document.getElementById('hero-detail-passive');
    if (activeEl && passiveEl && stats.detail) {
        const parts = stats.detail.split('//');
        crossFadeStatValue(activeEl, parts[0] ? parts[0].trim() : '—');
        crossFadeStatValue(passiveEl, parts[1] ? parts[1].trim() : '—');
    }
}

// ---- Game Over Screen ----
function assignMission(bankState) {
    const unlocks = bankState?.unlocks ?? {};
    const totalUnlocks = Object.values(unlocks).filter(Boolean).length;
    // Labels vary per type from src/data/missions.js; types/targets stay fixed so
    // the run lifecycle is unchanged (doc 11 §2/§3.4).
    if (totalUnlocks === 0) {
        return { type: 'retrieval', label: pickMissionBriefing('retrieval'), targetKills: 0, targetDepth: 0 };
    } else if (totalUnlocks < 3) {
        return { type: 'survey', label: pickMissionBriefing('survey'), targetKills: 0, targetDepth: 65 };
    }
    const idx = (totalUnlocks + Math.floor(Date.now() / 86400000)) % 3;
    const missions = [
        { type: 'retrieval', label: pickMissionBriefing('retrieval'), targetKills: 0, targetDepth: 0 },
        { type: 'survey', label: pickMissionBriefing('survey'), targetKills: 0, targetDepth: 145 },
        { type: 'elimination', label: pickMissionBriefing('elimination'), targetKills: 6, targetDepth: 0 }
    ];
    return missions[idx];
}

// Surface a prior contractor's black box at the base/menu so failure is a
// visible thread between runs, not just an in-run marker (doc 11 §4.D).
const DEPTH_TIER_LABELS = ['SURFACE', 'SHALLOWS', 'MIDWORKS', 'DEEPWORKS', 'THE UNDERSTRUCTURE'];
function refreshLastContractor() {
    const el = document.getElementById('last-contractor');
    if (!el) return;
    const box = blackBoxStore.load();
    const archive = Array.isArray(box?.archive) ? box.archive.slice(-3) : [];
    if (!archive.length) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
    }

    const lines = [
        `BLACK BOX THREADS <span class="ui-separator">//</span> ${archive.length} RECENT`
    ];

    for (const [index, entry] of archive.slice().reverse().entries()) {
        const cls = (entry.classType ?? 'OPERATOR').toUpperCase();
        const tier = DEPTH_TIER_LABELS[Math.max(0, Math.min(DEPTH_TIER_LABELS.length - 1, entry.depth ?? 0))];
        const isCurrent = Boolean(box?.active) && index === 0;
        lines.push(`BLACK BOX <span class="ui-separator">//</span> ${cls} @ ${tier} <span class="ui-separator">//</span> ${isCurrent ? 'SIGNAL ACTIVE' : 'ARCHIVED'}`);
    }
    const marqueeContent = lines.join(' <span class="ui-separator">///</span> ');
    const marqueeLoop = [marqueeContent, marqueeContent].map((segment, index) => `
        <span class="last-contractor-marquee__segment" ${index === 1 ? 'aria-hidden="true"' : ''}>${segment}</span>
    `).join('');
    el.innerHTML = `
        <div class="last-contractor-marquee" aria-live="polite">
          <div class="last-contractor-marquee__track">${marqueeLoop}</div>
        </div>
    `;
    el.classList.remove('hidden');
}

function generateDeathReport(stats, reason) {
    const biome = stats.biomeLabel ?? 'ACTIVE SECTOR';
    const depth = stats.distanceTravelled ?? 0;
    const box = blackBoxStore.load();
    const salvage = box.active ? box.salvage : null;
    const recoverable = salvage
        ? ` // RECOVERABLE: ${salvage.tech ?? 0} TECH / ${salvage.coin ?? 0} COIN / ${salvage.med ?? 0} MED`
        : '';
    const causeMap = {
        'o2-depletion':       '> CAUSE: EXOSUIT ATMOSPHERIC FAILURE — O₂ RESERVES EXHAUSTED',
        'snail':              '> CAUSE: BIO-ENTITY CONTACT — CYBERSNAIL MELEE IMPACT',
        'cybersnail':         '> CAUSE: BIO-ENTITY CONTACT — CYBERSNAIL MELEE IMPACT',
        'cryosnail':          '> CAUSE: BIO-ENTITY CONTACT — CRYOSNAIL IMPACT',
        'sporesnail':         '> CAUSE: BIO-ENTITY CONTACT — SPORESNAIL IMPACT',
        'enemy-projectile':   '> CAUSE: HOSTILE PROJECTILE IMPACT',
        'sentinel':           '> CAUSE: HOSTILE PROJECTILE — SENTINEL FIRE',
        'ship-destroyed':     '> CAUSE: SHIP STRUCTURAL FAILURE — HULL INTEGRITY ZERO',
        'mission-abort':      '> CAUSE: CONTRACT TERMINATED BY OPERATOR — RECOVERY BAG FILED',
        'frost-shockwave':    '> CAUSE: CRYO HAZARD — THERMAL SHOCKWAVE IMPACT',
        'poison':             '> CAUSE: BIO-TOXIN EXPOSURE — SUIT INTEGRITY FAILURE',
        'abyss':              '> CAUSE: EXOSUIT GRAVITATIONAL FAILURE — PLUMMETED INTO PIT CHASM',
    };
    const cause = causeMap[reason] ?? '> CAUSE: EXOSUIT FAILURE — UNKNOWN EVENT';
    return [
        `> LAST POS: ${biome} // DIST: ${Math.round(depth)}u // BANKED: ${stats.totalPickups ?? 0}${recoverable} // THREATS: ${stats.snailsKilled ?? 0}`,
        cause
    ].join('\n');
}

function formatRunTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function clearAllTimers() {
    if (biomePromptTimer) { clearTimeout(biomePromptTimer); biomePromptTimer = null; }
    if (damageFlashTimer) { clearTimeout(damageFlashTimer); damageFlashTimer = null; }
    if (deathSequenceTimer) { clearTimeout(deathSequenceTimer); deathSequenceTimer = null; }
    if (missionProgressHUDTimer) { clearTimeout(missionProgressHUDTimer); missionProgressHUDTimer = null; }
    if (o2AlarmTimer) { clearTimeout(o2AlarmTimer); o2AlarmTimer = null; }
    if (pickupComboTimer) { clearTimeout(pickupComboTimer); pickupComboTimer = null; }
    if (weaponErrorTimer) { clearTimeout(weaponErrorTimer); weaponErrorTimer = null; }
}

function showGameOverScreen(stats, { isVictory = false, deathReason = 'hazard' } = {}) {
    // ── Resets & State Cleanups on Game Over ──
    setAppPhase('gameover');
    dialogueManager?.cancelDialogue();
    dialogueManager?.cancelTutorial();
    cutsceneManager?.finishActiveRun(true);
    clearAllTimers();

    document.getElementById('ui')?.classList.add('hidden');
    document.getElementById('console-terminal-modal')?.classList.add('hidden');
    document.getElementById('lore-modal')?.classList.add('hidden');
    document.getElementById('mothership-dialogue')?.classList.add('hidden');
    document.getElementById('settings-popup')?.classList.add('hidden');
    document.getElementById('audio-mixer-popup')?.classList.add('hidden');
    hideAllGameplayPrompts();

    document.body.classList.remove('mission-intro-active', 'player-damage-flash', 'player-dead-flash', 'vitals-critical', 'distress-mode', 'player-poisoned');
    _distressModeActive = false;
    missionFlowRunning = false;

    const elapsedMs    = Date.now() - runStartTime;
    const elapsedMin   = elapsedMs / 60000;
    const distancePct  = Math.min(100, (stats.distanceTravelled / 500) * 100);
    const itemsPct     = Math.min(100, (stats.totalPickups / 50) * 100);
    const genPct       = Math.min(100, (stats.generatorLevel / 3) * 100);
    const kills        = stats.snailsKilled ?? 0;
    const killsPct     = Math.min(100, (kills / 10) * 100);
    const timePct      = Math.min(100, (elapsedMin / 20) * 100);

    const distBar  = document.getElementById('go-bar-distance');
    const itemBar  = document.getElementById('go-bar-items');
    const genBar   = document.getElementById('go-bar-generator');
    const killsBar = document.getElementById('go-bar-kills');
    const timeBar  = document.getElementById('go-bar-time');

    if (distBar)  distBar.style.width  = '0%';
    if (itemBar)  itemBar.style.width  = '0%';
    if (genBar)   genBar.style.width   = '0%';
    if (killsBar) killsBar.style.width = '0%';
    if (timeBar)  timeBar.style.width  = '0%';

    const distVal  = document.getElementById('go-val-distance');
    const itemVal  = document.getElementById('go-val-items');
    const genVal   = document.getElementById('go-val-generator');
    const killsVal = document.getElementById('go-val-kills');
    const timeVal  = document.getElementById('go-val-time');

    if (distVal)  distVal.textContent  = `${stats.distanceTravelled}u`;
    if (itemVal)  itemVal.textContent  = String(stats.totalPickups);
    if (genVal)   genVal.textContent   = stats.generatorLevel > 0 ? `LVL ${stats.generatorLevel}` : 'OFFLINE';
    if (killsVal) killsVal.textContent = kills > 0 ? String(kills) : 'NONE';
    if (timeVal)  timeVal.textContent  = formatRunTime(elapsedMs);

    const bankNote = document.getElementById('go-bank-note');
    const recoverableNote = document.getElementById('go-recoverable-note');
    const box = blackBoxStore.load();
    const banked = stats.totalPickups ?? 0;
    if (bankNote) {
        bankNote.textContent = isVictory
            ? `BANKED THIS RUN: ${banked} TOTAL STORED`
            : `BANKED BEFORE FAILURE: ${banked} TOTAL STORED`;
    }
    if (recoverableNote) {
        const s = box.active ? box.salvage : null;
        recoverableNote.textContent = s
            ? `BLACK BOX RECOVERABLE: ${s.tech ?? 0} TECH / ${s.coin ?? 0} COIN / ${s.med ?? 0} MED`
            : 'BLACK BOX: NO RECOVERABLE SALVAGE';
    }
    // Update the base banner so the menu reflects this death when the player returns.
    refreshLastContractor();

    // Title / subtitle
    const title = document.querySelector('.game-over-title');
    const subtitle = document.querySelector('.game-over-subtitle');
    if (title) title.textContent = isVictory ? 'EXTRACTION COMPLETE' : 'EXOSUIT FAILURE';
    if (subtitle) {
        const report = isVictory
            ? `> MISSION: ${stats.missionLabel ?? 'COMPLETE'}. RETURNING TO MOTHERSHIP.`
            : generateDeathReport(stats, deathReason);
        subtitle.textContent = '';
        let charIdx = 0;
        const chars = report.split('');
        const typewriteReport = () => {
            if (charIdx < chars.length && subtitle) {
                subtitle.textContent += chars[charIdx++];
                setTimeout(typewriteReport, 12);
            }
        };
        setTimeout(typewriteReport, 300);
    }

    // Score + rating
    const score = window.game?.calculateRunScore?.(stats, { status: stats.missionStatus }, runStartTime) ?? 0;
    const rating = window.game?.getRunRating?.(score) ?? { grade: 'D', label: 'AGENT LOST — MINIMAL TELEMETRY' };

    const scoreVal = document.getElementById('go-score-val');
    const ratingBadge = document.getElementById('go-rating-badge');
    const ratingLabel = document.getElementById('go-rating-label');
    const newBest = document.getElementById('go-new-best');

    if (scoreVal) {
        // Animated score roll
        scoreVal.textContent = '0';
        const duration = 1200;
        const startTime = performance.now();
        const rollScore = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
            const current = Math.floor(eased * score);
            if (scoreVal) scoreVal.textContent = String(current);
            if (progress < 1) requestAnimationFrame(rollScore);
            else if (scoreVal) scoreVal.textContent = String(score);
        };
        setTimeout(() => requestAnimationFrame(rollScore), 800);
    }
    if (ratingBadge) {
        ratingBadge.textContent = rating.grade;
        ratingBadge.className = `go-rating-badge go-rating-badge--${rating.grade.toLowerCase()}`;
    }
    if (ratingLabel) ratingLabel.textContent = rating.label;

    // Personal best
    const bestKey = `hb_best_score_${window.game?.playerType ?? 'SCOUT'}`;
    const prevBest = Number(localStorage.getItem(bestKey) ?? 0);
    const isNewBest = score > prevBest;
    if (isNewBest) {
        localStorage.setItem(bestKey, String(score));
        refreshCharBestScores();
    }
    if (newBest) newBest.classList.toggle('hidden', !isNewBest);

    // World seed display
    const seedRow = document.getElementById('go-seed-row');
    const seedVal = document.getElementById('go-seed-val');
    if (seedRow) seedRow.classList.toggle('hidden', !_isDailyOpsRun);
    if (seedVal && _isDailyOpsRun) seedVal.textContent = `DAILY-${getTodayDateString()}`;

    // Daily Ops result save
    if (_isDailyOpsRun) {
        _isDailyOpsRun = false;
        if (window.game) {
            window.game.globalSeedOffset = 0;
            window.game.fixedRunEntropy = false;
        }
        saveDailyOpsRecord({
            attempted: true,
            completed: true,
            date: getTodayDateString(),
            score,
            grade: rating.grade,
            isVictory
        });
        updateDailyOpsUI();
    }

    // Archive progress
    const archiveRow = document.getElementById('go-archive-row');
    const archiveText = document.getElementById('go-archive-text');
    const mem = getWorldMemory();
    const logsFound = mem.logsFound?.length ?? 0;
    if (archiveRow) archiveRow.classList.toggle('hidden', logsFound === 0);
    if (archiveText) archiveText.textContent = `LOGS RECOVERED: ${logsFound}/27`;

    const modal = document.getElementById('game-over-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.toggle('game-over-modal--victory', isVictory);
    }
    AudioManager.stopAmbience();
    transitionToMenuMusic();

    // Stagger bar animations for a readout effect
    requestAnimationFrame(() => {
        setTimeout(() => { if (distBar)  distBar.style.width  = `${distancePct}%`; }, 120);
        setTimeout(() => { if (itemBar)  itemBar.style.width  = `${itemsPct}%`;    }, 340);
        setTimeout(() => { if (genBar)   genBar.style.width   = `${genPct}%`;      }, 560);
        setTimeout(() => { if (killsBar) killsBar.style.width = `${killsPct}%`;    }, 760);
        setTimeout(() => { if (timeBar)  timeBar.style.width  = `${timePct}%`;     }, 960);
    });
}

function hideGameOverScreen() {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.add('hidden');
}

function resetRunToStartingState({
    resetBank = false,
    skipEffects = true,
    snailSpawnEnabled = false,
    purgeSnails = true
} = {}) {
    isResettingRun = true;
    try {
        if (resetBank) {
            bankManager.reset();
            fabricator.reset();
            loadout.reset();
            stopFabTicker();
            refreshFabAccess();
            syncEquippedWeaponLabel();
            renderRosterModal();
        }

        runStartTime = Date.now();
        currentMission = assignMission(bankManager.getState());
        currentRunModifier = pickRunModifier();
        _mothershipFiredTriggers.clear();
        _lastMothershipBroadcastAt = 0;

        resetPickupCounter();
        window.game?.respawnPlayer?.({ resetRunState: true, skipEffects });
        window.game?.initMission?.(currentMission);
        if (window.game) window.game.currentRunModifier = currentRunModifier;
        setSnailSpawnState(snailSpawnEnabled, { purgeExisting: purgeSnails });
        window.game?.setInputEnabled?.(false);
        renderBunkerLevel(0);
        renderBiomeStatus({ label: DEFAULT_BIOME_LABEL }, { showPrompt: false });
        hideBiomePrompt();
        if (hudNotificationTopTimer) {
            window.clearTimeout(hudNotificationTopTimer);
            hudNotificationTopTimer = null;
        }
        hudNotificationTopCard = null;
        radioQueue = [];
        radioPumpTimer = null;
        lastRadioRenderAt = 0;
        radioRecentMessages.clear();
        hudNotificationDeckHoldUntil = 0;
        hideMissionProgressHUD();
    } finally {
        isResettingRun = false;
    }
}

function runDeathSequence(event) {
    if (deathSequenceTimer) return;

    const deathReason = event?.detail?.reason ?? 'hazard';
    window.game?.setInputEnabled?.(false);
    hideBiomePrompt();
    hideExtractionRing();
    if (biomePromptTimer) {
        clearTimeout(biomePromptTimer);
        biomePromptTimer = null;
    }
    document.body.classList.add('player-dead-flash');
    playPlayerDeathCue(deathReason);

    deathSequenceTimer = window.setTimeout(() => {
        document.body.classList.remove('player-dead-flash');
        deathSequenceTimer = null;

        const stats = window.game?.getRunStats?.() ?? {
            distanceTravelled: 0,
            totalPickups: 0,
            generatorLevel: 0
        };
        // Check achievements and show unlock notification if new
        const { newUnlocks } = checkAchievements(stats);
        triggerDoorTransition(
            () => {
                showGameOverScreen(stats, { isVictory: false, deathReason });
                if (newUnlocks.length > 0) {
                    setTimeout(() => {
                        showBiomePrompt(`> ACHIEVEMENT: ${newUnlocks[0]}`);
                    }, 2200);
                }
                resetRunToStartingState({
                    resetBank: false,
                    skipEffects: true,
                    snailSpawnEnabled: false,
                    purgeSnails: true
                });
                window.game?.setInputEnabled?.(false);
            },
            null,
            'lose'
        );
    }, 900);
}

window.addEventListener('player-damaged', triggerDamageFlash);
window.addEventListener('health-restored', () => {
    const viewport = document.getElementById('game-viewport');
    if (viewport) {
        viewport.classList.add('heal-flash');
        setTimeout(() => viewport.classList.remove('heal-flash'), 500);
    }
    AudioManager.play('ui_scan_ping', { volume: 0.35, playbackRate: 1.1, bus: 'sfx' });
});
window.addEventListener('player-death', runDeathSequence);
window.addEventListener('player-respawned', () => {
    clearTimedClass('death', 'player-dead-flash');
    stopO2Alarm();
    hideExtractionRing();
    lastReportedDepthTier = 0;
    syncAbilityPanelLabel();
    _distressModeActive = false;
    // Recompute music from live state instead of forcing 'exploring'.
    updateMusicTension();
    document.body.classList.remove('distress-mode', 'vitals-critical', 'player-poisoned', 'player-damage-flash', 'mission-intro-active');
    const bar = document.getElementById('ability-bar');
    if (bar) bar.style.transform = 'scaleX(1)';
    updateTouchAbilityButtonState({ remaining: 0, max: 1, active: false });
    updateTouchSprintButtonState({ remaining: 0, max: 1, active: false, activeProgress: 0, ability: 'sprint' });
    const scanBar = document.getElementById('scan-bar');
    if (scanBar) scanBar.style.transform = 'scaleX(1)';
    updateTouchScanButtonState({ remaining: 0, max: 1 });
    window.game?.setInputEnabled?.(true);
});

window.addEventListener('mission-objective-complete', (event) => {
    const type = event?.detail?.type ?? '';
    const uplinkReady = Boolean(event?.detail?.uplinkReady);
    const messages = {
        retrieval: 'OBJECTIVE SECURED — RETURN TO SHIP',
        survey:    'SURVEY COMPLETE — RETURN TO SHIP',
        elimination: 'TARGETS ELIMINATED — RETURN TO SHIP'
    };
    const msg = uplinkReady
        ? (messages[type] ?? 'OBJECTIVE COMPLETE — RETURN TO SHIP')
        : 'OBJECTIVE COMPLETE — UPLINK LOCKED // MAX ALL SYSTEMS TO EXTRACT';
    showBiomePrompt(msg);
    const line = getDialogueLine('extraction');
    if (line) window.setTimeout(() => showBiomePrompt(`> BUNKER: ${line}`), 900);
    AudioManager.play('ui_boot', { volume: 0.45, playbackRate: 0.88, bus: 'sfx' });
});

window.addEventListener('goal-unlocked', (event) => {
    const goalKey = event?.detail?.goalKey;
    if (['o2Bubble', 'hullExpansion', 'radarNode', 'reactorCompressor'].includes(goalKey)) return;
    const line = getDialogueLine('majorUpgrade');
    if (line) showBiomePrompt(`> BUNKER: ${line}`);
});

window.addEventListener('o2-generator-upgraded', (event) => {
    if (event?.detail?.level === 1) return;
    const line = getDialogueLine('majorUpgrade');
    if (line) showBiomePrompt(`> BUNKER: ${line}`);
});

window.addEventListener('extraction-progress', (event) => {
    const { progress = 0, active = false } = event?.detail ?? {};
    updateExtractionRing(progress, active);
});

window.addEventListener('elevator-sequence-started', () => {
    showTacticalOverlay({
        title: 'ELEVATOR DOWN',
        status: '> ARRIVAL TIMER: 90 SECONDS<br>> LIGHTING GRID FAILING<br>> DEFEND THE WRECK',
        progress: 100,
        duration: 2600
    });
});

window.addEventListener('elevator-progress', (event) => {
    const remaining = event?.detail?.secondsRemaining ?? 90;
    showMissionProgressHUD(`ELEVATOR ARRIVAL: ${remaining}s`);
});

window.addEventListener('elevator-choice-ready', () => {
    hideExtractionRing();
    hideMissionProgressHUD();
    showTacticalOverlay({
        title: 'ELEVATOR ARRIVED',
        status: '> DOORS OPEN<br>> SELECT EXTRACTION VECTOR',
        progress: 100,
        duration: 1800
    });
    const modal = document.getElementById('elevator-choice-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
    window.game?.setInputEnabled?.(false);
});

function closeElevatorChoiceModal() {
    const modal = document.getElementById('elevator-choice-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

document.getElementById('elevator-choice-extract')?.addEventListener('click', () => {
    closeElevatorChoiceModal();
    // Re-enable input before resolving: the extraction flow disables it again on
    // its own, but if extraction bails early the player must not stay locked.
    window.game?.setInputEnabled?.(true);
    window.game?.resolveElevatorChoice?.('extract');
});

document.getElementById('elevator-choice-descend')?.addEventListener('click', () => {
    closeElevatorChoiceModal();
    window.game?.setInputEnabled?.(true);
    window.game?.resolveElevatorChoice?.('descend');
    showBiomePrompt('> ELEVATOR: DESCENT COMPLETE — NEW SECTOR PRESSURE RISING');
});

window.addEventListener('player-extracted', (event) => {
    hideExtractionRing();
    window.game?.setInputEnabled?.(false);
    hideBiomePrompt();

    const stats = event?.detail?.runStats ?? window.game?.getRunStats?.() ?? {};
    AudioManager.play('ui_boot', { volume: 0.6, playbackRate: 0.72, bus: 'sfx' });

    window.setTimeout(() => {
        triggerDoorTransition(
            () => {
                showGameOverScreen(stats, { isVictory: true });
                resetRunToStartingState({
                    resetBank: false,
                    skipEffects: true,
                    snailSpawnEnabled: false,
                    purgeSnails: true
                });
                window.game?.setInputEnabled?.(false);
            },
            null,
            'win'
        );
    }, 600);
});

// ── Bunker Archive ────────────────────────────────────────────
const ALL_LORE_KEYS = [
    'A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12',
    'C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12',
    'B01','B02','B03'
];

function updateMenuCommandStatuses() {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    const foundLogs = new Set(getWorldMemory().logsFound ?? []).size;
    const printed = FAB_RECIPES.filter((recipe) => fabricator.isFabricated(recipe.id)).length;
    const weapons = FAB_RECIPES.filter((recipe) => recipe.klass === 'WEAPON');
    const armed = weapons.filter((recipe) => fabricator.isFabricated(recipe.id)).length;

    setText('archive-command-status', `${foundLogs} / ${ALL_LORE_KEYS.length} LOGS`);
    setText('codex-command-status', `${codexStore.getDiscoveredCount()} / ${CODEX_TOTAL} INTEL`);
    setText('fab-command-status', `${printed} / ${FAB_RECIPES.length} PRINTED`);
    setText('roster-command-status', `${armed}/${weapons.length} ARMED`);
}

// Recovered-survivor portraits for log authors. Reused from the mothership
// project's generated character art (resized to lean webp avatars). Mapped
// deterministically per log key so each fragment keeps a stable "author" face.
const LORE_PORTRAIT_COUNT = 12;
function lorePortraitIndex(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h % LORE_PORTRAIT_COUNT;
}
function lorePortraitSrc(key) {
    return `/lore_portraits/survivor_${String(lorePortraitIndex(key)).padStart(2, '0')}.webp`;
}

function closeArchiveLogDetail() {
    const modal = document.getElementById('archive-log-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function openArchiveLogDetail(key) {
    const modal = document.getElementById('archive-log-detail-modal');
    const keyEl = document.getElementById('archive-log-detail-key');
    const textEl = document.getElementById('archive-log-detail-text');
    const portraitEl = document.getElementById('archive-log-detail-portrait');
    if (!modal) return;

    if (keyEl) keyEl.textContent = `LOG-${key}`;
    if (textEl) textEl.textContent = window.game?.getLoreText?.(key) ?? '[LOG TEXT UNAVAILABLE — RETURN TO BUNKER]';
    if (portraitEl) portraitEl.src = lorePortraitSrc(key);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

function buildArchiveModal() {
    const listEl = document.getElementById('archive-log-list');
    const summaryEl = document.getElementById('archive-summary');
    if (!listEl) return;

    const mem = getWorldMemory();
    const found = new Set(mem.logsFound ?? []);
    updateMenuCommandStatuses();
    listEl.innerHTML = '';

    // Group by sector
    const sections = [
        { prefix: 'A', label: 'ACTIVE SECTOR LOGS', keys: ALL_LORE_KEYS.filter(k => k.startsWith('A')) },
        { prefix: 'C', label: 'CRYO SECTOR LOGS', keys: ALL_LORE_KEYS.filter(k => k.startsWith('C')) },
        { prefix: 'B', label: 'BIO SECTOR LOGS', keys: ALL_LORE_KEYS.filter(k => k.startsWith('B')) }
    ];

    for (const section of sections) {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'archive-section';

        const sectionLabel = document.createElement('div');
        sectionLabel.className = 'archive-section-label';
        sectionLabel.textContent = section.label;
        sectionEl.appendChild(sectionLabel);

        const grid = document.createElement('div');
        grid.className = 'archive-log-grid';

        for (const key of section.keys) {
            const isFound = found.has(key);
            const entry = document.createElement(isFound ? 'button' : 'div');
            entry.className = `archive-log-entry ${isFound ? '' : 'archive-log-entry--undiscovered'}`;
            if (isFound) {
                entry.type = 'button';
                entry.setAttribute('aria-label', `Open recovered log ${key}`);
                entry.addEventListener('click', () => openArchiveLogDetail(key));
            }

            const avatar = document.createElement('div');
            avatar.className = 'archive-log-avatar';
            if (isFound) {
                const img = document.createElement('img');
                img.className = 'archive-log-avatar__img';
                img.loading = 'lazy';
                img.decoding = 'async';
                img.alt = '';
                img.src = lorePortraitSrc(key);
                avatar.appendChild(img);
            } else {
                avatar.classList.add('archive-log-avatar--locked');
                const lock = document.createElement('span');
                lock.className = 'archive-lock-icon';
                lock.setAttribute('aria-hidden', 'true');
                avatar.appendChild(lock);
            }

            const body = document.createElement('div');
            body.className = 'archive-log-body';

            const keyEl = document.createElement('div');
            keyEl.className = 'archive-log-key';
            keyEl.textContent = `LOG-${key}`;

            const textEl = document.createElement('div');
            textEl.className = `archive-log-text ${isFound ? '' : 'archive-log-text--locked'}`;

            if (isFound) {
                textEl.textContent = 'RECOVERED // OPEN RECORD';
            } else {
                textEl.textContent = 'ENCRYPTED // LOCKED';
            }

            body.appendChild(keyEl);
            body.appendChild(textEl);
            entry.appendChild(avatar);
            entry.appendChild(body);
            grid.appendChild(entry);
        }

        sectionEl.appendChild(grid);
        listEl.appendChild(sectionEl);
    }

    if (summaryEl) {
        summaryEl.textContent = `LOGS RECOVERED: ${found.size} / ${ALL_LORE_KEYS.length}`;
    }
}

// ── Achievement / Unlock System ───────────────────────────────
const ACHIEVEMENT_KEY = 'hb_achievements_v1';

function getAchievements() {
    try {
        return JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) ?? 'null') ?? {
            totalDeaths: 0,
            totalKills: 0,
            maxKillsOneRun: 0,
            deepTierReachedAlive: false,
            unlockedHardened: false
        };
    } catch { return { totalDeaths: 0, totalKills: 0, maxKillsOneRun: 0, deepTierReachedAlive: false, unlockedHardened: false }; }
}

function saveAchievements(ach) {
    try { localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(ach)); } catch { /* ignore */ }
}

function checkAchievements(runStats) {
    const ach = getAchievements();
    const newUnlocks = [];

    // Track deaths
    ach.totalDeaths = (ach.totalDeaths ?? 0) + 1;
    if (ach.totalDeaths >= 5 && !ach.unlockedHardened) {
        ach.unlockedHardened = true;
        newUnlocks.push('HARDENED MODE UNLOCKED — Die 5 times to prove dedication.');
    }

    // Track kills
    const kills = runStats?.snailsKilled ?? 0;
    ach.totalKills = (ach.totalKills ?? 0) + kills;
    ach.maxKillsOneRun = Math.max(ach.maxKillsOneRun ?? 0, kills);

    // Track deep tier
    const depthTier = runStats?.depthTier ?? 0;
    if (depthTier >= 2 && !ach.deepTierReachedAlive) {
        ach.deepTierReachedAlive = true;
        newUnlocks.push('DEEP SECTOR MAPPED — Advanced sentinels now active in future runs.');
    }

    saveAchievements(ach);
    return { ach, newUnlocks };
}

// ── Lore Terminal System ──────────────────────────────────────
const WORLD_MEMORY_KEY = 'hb_world_memory_v1';

function getWorldMemory() {
    try {
        return JSON.parse(localStorage.getItem(WORLD_MEMORY_KEY) ?? 'null') ?? { logsFound: [], biomesMapped: [] };
    } catch { return { logsFound: [], biomesMapped: [] }; }
}

function saveWorldMemory(mem) {
    try { localStorage.setItem(WORLD_MEMORY_KEY, JSON.stringify(mem)); } catch { /* ignore */ }
}

function markLogFound(loreKey) {
    const mem = getWorldMemory();
    if (!mem.logsFound.includes(loreKey)) {
        mem.logsFound.push(loreKey);
        saveWorldMemory(mem);
        return true; // newly discovered
    }
    return false;
}

window.addEventListener('lore-terminal-nearby', () => {
    const prompt = document.getElementById('lore-hud-prompt');
    const key = prompt?.querySelector('.prompt-key');
    const text = prompt?.querySelector('.prompt-text');
    const touchPrompt = isTouchDevice();
    if (key) {
        key.textContent = touchPrompt ? 'TAP' : 'PRESS E';
        key.classList.toggle('prompt-key--tap', touchPrompt);
    }
    if (text) text.textContent = 'READ LOG';
    if (prompt) prompt.classList.remove('hidden');
});

window.addEventListener('lore-terminal-clear', () => {
    const prompt = document.getElementById('lore-hud-prompt');
    if (prompt) prompt.classList.add('hidden');
});

// Token invalidates any in-flight typewriter loop when the modal is reopened
// for a new log (prevents two loops interleaving into the same text node).
let loreTypewriterToken = 0;

function closeLoreModalAndResume() {
    loreTypewriterToken += 1;
    document.getElementById('lore-modal')?.classList.add('hidden');
    window.game?.setInputEnabled?.(true);
}

window.addEventListener('lore-terminal-read', (event) => {
    const { loreKey, loreText } = event?.detail ?? {};
    if (!loreKey || !loreText) return;

    const loreModal = document.getElementById('lore-modal');
    const loreKeyEl = document.getElementById('lore-modal-key');
    const loreTextEl = document.getElementById('lore-modal-text');
    if (!loreModal) return;

    if (loreKeyEl) loreKeyEl.textContent = `LOG-${loreKey}`;
    if (loreTextEl) loreTextEl.textContent = '';

    loreModal.classList.remove('hidden');
    window.game?.setInputEnabled?.(false);

    // Typewrite the log text
    const token = ++loreTypewriterToken;
    let charIdx = 0;
    const chars = loreText.split('');
    const tick = () => {
        if (!loreTextEl || token !== loreTypewriterToken || loreModal.classList.contains('hidden')) return;
        if (charIdx < chars.length) {
            loreTextEl.textContent += chars[charIdx++];
            setTimeout(tick, 18);
        }
    };
    tick();

    // Track discovery
    const isNew = markLogFound(loreKey);
    if (isNew) {
        fireMothershipReactiveLine('lore_found');
    }
});

document.getElementById('close-lore-modal')?.addEventListener('click', closeLoreModalAndResume);

// ── Reactive Mothership ───────────────────────────────────────
function fireMothershipReactiveLine(trigger) {
    if (_mothershipFiredTriggers.has(trigger)) return;
    const now = Date.now();
    if (!MOTHERSHIP_REACTIVE_CRITICAL.has(trigger) && now - _lastMothershipBroadcastAt < MOTHERSHIP_REACTIVE_COOLDOWN_MS) {
        return;
    }
    _mothershipFiredTriggers.add(trigger);
    _lastMothershipBroadcastAt = now;
    const lines = {
        first_kill:       'AGENT — FIRST THREAT NEUTRALIZED. PROCEED.',
        first_cryo:       'WARNING: CRYO SECTOR BOUNDARY CROSSED. THERMAL PROTOCOL ACTIVE.',
        first_bio:        'ALERT: BIO-CONTAINMENT ZONE ENTERED. SUIT FILTERS AT LIMIT.',
        hp_critical:      'DISTRESS SIGNAL: VITAL SIGNS CRITICAL. EXTRACTION WINDOW OPEN EARLY.',
        objective_found:  'UPLINK: OBJECTIVE CONFIRMED. MAX SHIP SYSTEMS REQUIRED FOR EXTRACTION.',
        first_deposit:    'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.',
        lore_found:       'AGENT — BUNKER DATA FRAGMENT RECOVERED. TRANSMITTING TO ARCHIVE.',
        sentinel_spotted: 'WARNING: AUTOMATED DEFENSE SYSTEM ACTIVE. RECOMMEND COVER.',
        crawler_detected:  'ALERT: FAST-MOVING BIO-ENTITY DETECTED. MAINTAIN DISTANCE.',
        armory_found:      'UPLINK: ARMORY CACHE LOCATED. HIGH-VALUE ASSET — EXPECT RESISTANCE.',
        the_nest:          'WARNING: BIO-ENTITY NEST CONFIRMED. MAXIMUM THREAT DENSITY. CAUTION.',
        weapon_calibrated: 'NOTED: AGENT WEAPON OUTPUT RISING. ... WHY DO YOU NEED MORE.',
        first_boss:        'CONFIRMED KILL: APEX BIO-ENTITY DOWN. THE SIGNAL FELT THAT.',
        specimen_notices:  '[UNAUTHORIZED CHANNEL] ...0047 HAS STOPPED BUILDING. IT IS LISTENING TO YOU NOW.',
    };
    const text = lines[trigger];
    if (text) showBiomePrompt(`> MOTHERSHIP: ${text}`);
}

window.addEventListener('pickup-collected', (event) => {
    if (event?.detail?.type === 'weapon') {
        if (!_mothershipFiredTriggers.has('first_deposit')) {
            // first_deposit fires on first console deposit; track separately
        }
    }
});

window.addEventListener('special-room-discovered', (event) => {
    const label = event?.detail?.label ?? 'SPECIAL ROOM';
    const template = event?.detail?.template ?? '';
    const roomMessages = {
        armory: `> SCAN: ${label} — WEAPON CACHE`,
        the_nest: `> ALERT: ${label} — HIGH THREAT`,
        agent_wreckage: `> SCAN: ${label} — RECOVERY SIGNAL`
    };
    if (roomMessages[template]) showBiomePrompt(roomMessages[template]);
    window.AudioManager?.play('ui_boot', { volume: 0.3, playbackRate: 0.82, bus: 'sfx' });
    if (template === 'the_nest') fireMothershipReactiveLine('the_nest');
    if (template === 'armory') fireMothershipReactiveLine('armory_found');
});

window.addEventListener('player-damaged', (event) => {
    const hp = event?.detail?.hp ?? 99;
    if (hp <= 1) fireMothershipReactiveLine('hp_critical');
});

window.addEventListener('mission-objective-complete', () => {
    fireMothershipReactiveLine('objective_found');
});

window.addEventListener('bunker-line', (event) => {
    const text = event?.detail?.text;
    if (text) showBiomePrompt(`> BUNKER: ${text}`);
});

window.addEventListener('black-box-marker-active', () => {
    showBiomePrompt('> BLACK BOX SIGNAL DETECTED — COMPASS RETARGETED');
});

window.addEventListener('black-box-prompt-nearby', () => {
    const prompt = document.getElementById('black-box-hud-prompt');
    if (!isGameplayHudActive()) {
        prompt?.classList.add('hidden');
        prompt?.classList.remove('visible');
        return;
    }
    const key = prompt?.querySelector('.prompt-key');
    const text = prompt?.querySelector('.prompt-text');
    const touchPrompt = isTouchDevice();
    if (key) {
        key.textContent = touchPrompt ? 'TAP' : 'PRESS E';
        key.classList.toggle('prompt-key--tap', touchPrompt);
    }
    if (text) text.textContent = 'RECOVER BLACK BOX';
    prompt?.classList.remove('hidden');
    prompt?.classList.add('visible');
});

window.addEventListener('black-box-prompt-clear', () => {
    const prompt = document.getElementById('black-box-hud-prompt');
    prompt?.classList.add('hidden');
    prompt?.classList.remove('visible');
});

window.addEventListener('sentinel-fired', () => {
    const viewport = document.getElementById('game-viewport');
    if (viewport) {
        viewport.classList.add('sentinel-warning-flash');
        setTimeout(() => viewport.classList.remove('sentinel-warning-flash'), 280);
    }
});

function showMissionProgressHUD(text) {
    if (!isGameplayPhase()) return;
    const hud = document.getElementById('mission-progress-hud');
    const textEl = document.getElementById('mission-progress-text');
    if (textEl) textEl.textContent = text;

    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const gameOverModal = document.getElementById('game-over-modal');
    const splash = document.getElementById('splash');
    const isGameplayActive = ui && !ui.classList.contains('hidden') &&
                             (!menu || menu.classList.contains('hidden')) &&
                             (!gameOverModal || gameOverModal.classList.contains('hidden')) &&
                             (!splash || splash.classList.contains('hidden'));

    if (isGameplayActive && !isResettingRun && hud) {
        hud.classList.remove('hidden');
    }
}

function hideMissionProgressHUD() {
    if (missionProgressHUDTimer) {
        clearTimeout(missionProgressHUDTimer);
        missionProgressHUDTimer = null;
    }
    const hud = document.getElementById('mission-progress-hud');
    if (hud) hud.classList.add('hidden');
}

const missionProgressHud = document.getElementById('mission-progress-hud');
if (missionProgressHud) {
    missionProgressHud.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        hideMissionProgressHUD();
    });
}

// Persistent loop-state cue (T1): always shows the next action while in a run.
window.addEventListener('loop-step-changed', (event) => {
    const hud = document.getElementById('loop-step-hud');
    const textEl = document.getElementById('loop-step-text');
    if (!hud) return;
    const step = event?.detail;

    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const gameOverModal = document.getElementById('game-over-modal');
    const splash = document.getElementById('splash');
    const isGameplayActive = ui && !ui.classList.contains('hidden') &&
                             (!menu || menu.classList.contains('hidden')) &&
                             (!gameOverModal || gameOverModal.classList.contains('hidden')) &&
                             (!splash || splash.classList.contains('hidden'));

    if (!step?.label || !isGameplayPhase() || !isGameplayActive || isResettingRun) {
        hud.classList.add('hidden');
        return;
    }
    if (textEl) textEl.textContent = step.label;
    hud.dataset.step = step.key ?? '';
    hud.classList.remove('hidden');
});

const tutorialPrompt = document.getElementById('tutorial-prompt');
if (tutorialPrompt) {
    tutorialPrompt.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        tutorialPrompt.classList.remove('is-visible', 'is-exiting');
        tutorialPrompt.classList.add('hidden');
    });
}

window.addEventListener('mission-kill-progress', (event) => {
    const { count = 0, target = 0 } = event?.detail ?? {};
    const missionEl = document.getElementById('mission-status-text');
    if (missionEl) missionEl.textContent = `ELIMINATE: ${count}/${target}`;
    showMissionProgressHUD(`ELIMINATE: ${count} / ${target}`);
});

window.addEventListener('mission-objective-complete', () => {
    hideMissionProgressHUD();
});

document.getElementById('class-ability-panel')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.game?.triggerClassAbility?.();
});

document.getElementById('radar-scan-panel')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.game?.triggerRadarScan?.();
});

function updateTouchAbilityButtonState({ remaining = 0, max = 1, active = false } = {}) {
    const touchBtn = document.getElementById('touch-ability-btn');
    if (!touchBtn) return;

    const clampedMax = Math.max(0.001, Number(max) || 0.001);
    const clampedRemaining = Math.max(0, Number(remaining) || 0);
    const cooldownProgress = active
        ? 1
        : Math.max(0, Math.min(1, 1 - (clampedRemaining / clampedMax)));

    touchBtn.style.setProperty('--ability-cooldown-progress', String(cooldownProgress));
    touchBtn.classList.toggle('is-cooling', clampedRemaining > 0);
    touchBtn.classList.toggle('is-ready', clampedRemaining <= 0 && !active);

    if (clampedRemaining > 0) {
        touchBtn.style.pointerEvents = 'none';
        touchBtn.style.opacity = '0.8';
    } else {
        touchBtn.style.pointerEvents = 'auto';
        touchBtn.style.opacity = '1';
    }

    const cooldownEl = document.getElementById('touch-ability-cooldown');
    if (cooldownEl) {
        cooldownEl.textContent = clampedRemaining > 0 ? `${clampedRemaining.toFixed(1)}s` : '';
    }
}

function updateTouchSprintButtonState({ remaining = 0, max = 1, active = false, activeProgress = 0, ability = '' } = {}) {
    const sprintBtn = document.getElementById('touch-sprint-btn');
    if (!sprintBtn) return;
    const isSprintAbility = ability === 'sprint';
    const clampedMax = Math.max(0.001, Number(max) || 0.001);
    const clampedRemaining = Math.max(0, Number(remaining) || 0);
    const clampedActiveProgress = Math.max(0, Math.min(1, Number(activeProgress) || 0));
    const sprintActive = isSprintAbility && Boolean(active);
    const cooldownProgress = sprintActive
        ? Math.max(0, 1 - clampedActiveProgress)
        : Math.max(0, Math.min(1, 1 - (clampedRemaining / clampedMax)));
    sprintBtn.style.setProperty('--ability-cooldown-progress', String(cooldownProgress));
    sprintBtn.classList.toggle('sprint-active', sprintActive);
    sprintBtn.classList.toggle('is-cooling', isSprintAbility && clampedRemaining > 0 && !sprintActive);
    sprintBtn.classList.toggle('is-ready', isSprintAbility && clampedRemaining <= 0 && !sprintActive);
    sprintBtn.style.pointerEvents = (isSprintAbility && clampedRemaining > 0 && !sprintActive) ? 'none' : 'auto';
    sprintBtn.style.opacity = (isSprintAbility && clampedRemaining > 0 && !sprintActive) ? '0.8' : '1';
    const label = sprintBtn.querySelector('#touch-sprint-cooldown');
    if (label) {
        label.textContent = sprintActive ? 'BURST' : (isSprintAbility && clampedRemaining > 0) ? `${Math.ceil(clampedRemaining)}s` : 'READY';
    }
}

window.addEventListener('class-ability-activated', (event) => {
    const panel = document.getElementById('class-ability-panel');
    if (panel) panel.classList.add('class-ability-panel--active');
    const { ability } = event?.detail ?? {};
    const viewport = document.getElementById('game-viewport');
    if (viewport) {
        viewport.classList.add(`ability-active-${ability}`);
    }
});

window.addEventListener('class-ability-ended', (event) => {
    const panel = document.getElementById('class-ability-panel');
    if (panel) {
        panel.classList.remove('class-ability-panel--active');
    }
    const { ability } = event?.detail ?? {};
    const viewport = document.getElementById('game-viewport');
    if (viewport) viewport.classList.remove(`ability-active-${ability}`);
});

window.addEventListener('ability-cooldown-tick', (event) => {
    const { remaining = 0, max = 1, active = false, activeProgress = 0, ability = '' } = event?.detail ?? {};
    const bar = document.getElementById('ability-bar');
    const panel = document.getElementById('class-ability-panel');
    const clampedMax = Math.max(0.001, Number(max) || 0.001);
    const clampedRemaining = Math.max(0, Number(remaining) || 0);
    const clampedActiveProgress = Math.max(0, Math.min(1, Number(activeProgress) || 0));
    if (bar) {
        const fillPct = active
            ? 1 - clampedActiveProgress
            : 1 - (clampedRemaining / clampedMax);
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fillPct))})`;
    }
    if (panel) {
        panel.classList.toggle('class-ability-panel--active', active);
        panel.classList.toggle('class-ability-panel--cooling', !active && clampedRemaining > 0);
        panel.classList.toggle('class-ability-panel--ready', !active && clampedRemaining <= 0);
    }
    updateTouchAbilityButtonState({ remaining, max, active });
    updateTouchSprintButtonState({ remaining, max, active, activeProgress, ability });
});

window.addEventListener('scan-cooldown-tick', (event) => {
    const { remaining = 0, max = 1 } = event?.detail ?? {};
    const bar = document.getElementById('scan-bar');
    const panel = document.getElementById('radar-scan-panel');
    const fillPct = 1 - (remaining / Math.max(0.001, max));
    
    if (bar) {
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fillPct))})`;
    }
    
    if (panel) {
        panel.classList.toggle('class-ability-panel--ready', remaining <= 0);
        panel.classList.toggle('class-ability-panel--active', remaining > 0);
    }

    updateTouchScanButtonState({ remaining, max });
});

function updateTouchScanButtonState({ remaining = 0, max = 1 } = {}) {
    const touchBtn = document.getElementById('touch-scan-btn');
    if (!touchBtn) return;

    const clampedMax = Math.max(0.001, Number(max) || 0.001);
    const clampedRemaining = Math.max(0, Number(remaining) || 0);
    const cooldownProgress = Math.max(0, Math.min(1, 1 - (clampedRemaining / clampedMax)));

    touchBtn.style.setProperty('--ability-cooldown-progress', String(cooldownProgress));
    touchBtn.classList.toggle('is-cooling', clampedRemaining > 0);
    touchBtn.classList.toggle('is-ready', clampedRemaining <= 0);

    if (clampedRemaining > 0) {
        touchBtn.style.pointerEvents = 'none';
        touchBtn.style.opacity = '0.8';
    } else {
        touchBtn.style.pointerEvents = 'auto';
        touchBtn.style.opacity = '1';
    }

    const cooldownEl = document.getElementById('touch-scan-cooldown');
    if (cooldownEl) {
        cooldownEl.textContent = clampedRemaining > 0 ? `${clampedRemaining.toFixed(1)}s` : '';
    }
}

function syncAbilityPanelLabel() {
    const info = window.game?.getClassAbilityInfo?.();
    const label = info?.label ?? 'SPRINT BURST';
    const nameEl = document.getElementById('ability-name');
    if (nameEl) nameEl.textContent = label;
    const panel = document.getElementById('class-ability-panel');
    if (panel) {
        panel.title = `${label} [F]`;
        const unlocked = window.game?.isSpecialAbilityUnlocked?.() ?? true;
        panel.classList.toggle('hidden', !unlocked);
        panel.classList.toggle('class-ability-panel--locked', !unlocked);
        if (!unlocked) {
            panel.title = `${label} [LOCKED — TAB SKILLS]`;
            if (nameEl) nameEl.textContent = `${label} (LOCKED)`;
        }
    }
}
window.syncAbilityPanelLabel = syncAbilityPanelLabel;

function updateExtractionRing(progress, active) {
    const ring = document.getElementById('extraction-progress-ring');
    if (!ring) return;
    ring.classList.toggle('hidden', !active && progress <= 0);

    const fillEl = document.getElementById('extraction-ring-fill');
    if (fillEl) {
        const circumference = 2 * Math.PI * 16;
        const offset = circumference * (1 - progress);
        fillEl.style.strokeDasharray = String(circumference);
        fillEl.style.strokeDashoffset = String(offset);
    }
}

function hideExtractionRing() {
    const ring = document.getElementById('extraction-progress-ring');
    if (ring) ring.classList.add('hidden');
}

function startO2Alarm() {
    if (o2AlarmActive) return;
    o2AlarmActive = true;
    const tick = () => {
        if (!o2AlarmActive) return;
        const currentO2 = window.game?.playerVitals?.o2 ?? 100;
        if (currentO2 > 10) {
            o2AlarmActive = false;
            return;
        }
        AudioManager.play('ui_error', { volume: 0.18, playbackRate: 0.72, bus: 'sfx' });
        o2AlarmTimer = window.setTimeout(tick, 2800);
    };
    tick();
}

function stopO2Alarm() {
    o2AlarmActive = false;
    if (o2AlarmTimer) {
        clearTimeout(o2AlarmTimer);
        o2AlarmTimer = null;
    }
}

// ── Reactive Music State ──────────────────────────────────────
let _musicTension = 'exploring';
let _musicContext = 'safe_ship';

function transitionToMenuMusic() {
    _musicTension = 'safe';
    _musicContext = 'safe_ship';
    window.AudioManager?.startMenuMusic?.();
}
window.transitionToMenuMusic = transitionToMenuMusic;

function updateMusicTension() {
    const hp = window.game?.playerVitals?.hp ?? 99;
    const o2 = window.game?.playerVitals?.o2 ?? 100;
    const biome = window.game?.currentBiomeKey ?? 'active';
    const bossActive = !!window.game?.activeBoss;

    // ── Tension intensity (drives music-bus loudness) ──
    let nextTension = 'exploring';
    // Safe: near ship, full health, good O2
    if (hp >= 3 && o2 > 50) {
        const dist = window.game?.getActiveO2GeneratorDistance?.() ?? Infinity;
        if (dist < 4) nextTension = 'safe';
    }
    if (bossActive) nextTension = 'boss';
    // Threatened: low hp or distress (overrides boss-tier loudness for survival cues)
    if (hp <= 1 || o2 < 15 || _distressModeActive) nextTension = 'threatened';

    // ── Track context (drives which stem plays) ──
    let nextContext;
    if (bossActive || _distressModeActive) {
        nextContext = 'combat';
    } else if (nextTension === 'safe') {
        nextContext = 'safe_ship';
    } else if (biome === 'cryo') {
        nextContext = 'cryo_explore';
    } else if (biome === 'bio') {
        nextContext = 'bio_explore';
    } else {
        nextContext = 'safe_ship'; // shipyard / active sector default theme
    }

    if (nextTension !== _musicTension) {
        _musicTension = nextTension;
        window.AudioManager?.setMusicTension?.(nextTension);
    }
    if (nextContext !== _musicContext) {
        _musicContext = nextContext;
        window.AudioManager?.setMusicContext?.(nextContext);
    }
}

// Poll for state changes that fire no vitals event (boss appearing/leaving,
// biome drift) so music context/tension stay in sync throughout a run.
setInterval(() => {
    if (window.AudioManager?.isUnlocked) updateMusicTension();
}, 1000);

let _distressModeActive = false;
let _lastLowO2LineAt = 0;
function updateDistressMode(o2, hp) {
    const shouldBeDistress = hp <= 1 && o2 < 15 && !window.game?.isPlayerDead;
    if (shouldBeDistress && !_distressModeActive) {
        _distressModeActive = true;
        document.body.classList.add('distress-mode');
        document.body.classList.add('vitals-critical');
        fireMothershipReactiveLine('hp_critical');
        window.AudioManager?.play('ui_error', { volume: 0.55, playbackRate: 0.48, bus: 'sfx' });
    } else if (!shouldBeDistress && _distressModeActive) {
        _distressModeActive = false;
        document.body.classList.remove('distress-mode');
        document.body.classList.remove('vitals-critical');
    }
}

window.addEventListener('player-o2-changed', (event) => {
    const o2 = event?.detail?.o2 ?? 100;
    const hp = window.game?.playerVitals?.hp ?? 99;
    if (o2 <= 10 && !o2AlarmActive) {
        startO2Alarm();
    } else if (o2 > 10 && o2AlarmActive) {
        stopO2Alarm();
    }
    // Low O2 general vignette (not full distress)
    document.body.classList.toggle('vitals-critical', o2 < 25 && !_distressModeActive);
    if (o2 < 25 && Date.now() - _lastLowO2LineAt > 45000) {
        _lastLowO2LineAt = Date.now();
        const line = getDialogueLine('lowO2');
        if (line) showBiomePrompt(`> BUNKER: ${line}`);
    }
    updateDistressMode(o2, hp);
    updateMusicTension();
});

window.addEventListener('player-damaged', (event) => {
    const hp = event?.detail?.hp ?? 99;
    const o2 = window.game?.playerVitals?.o2 ?? 100;
    updateDistressMode(o2, hp);
    updateMusicTension();
});

window.addEventListener('player-poisoned', () => {
    document.body.classList.add('player-poisoned');
});
window.addEventListener('player-poison-cleared', () => {
    document.body.classList.remove('player-poisoned');
});

window.addEventListener('health-restored', () => {
    const hp = window.game?.playerVitals?.hp ?? 99;
    const o2 = window.game?.playerVitals?.o2 ?? 100;
    updateDistressMode(o2, hp);
    updateMusicTension();
});

// Game over button handlers
const gameOverTryAgain = document.getElementById('game-over-try-again');
const gameOverMainMenu = document.getElementById('game-over-main-menu');

if (gameOverTryAgain) {
    gameOverTryAgain.addEventListener('click', () => {
        hideGameOverScreen();
        triggerDoorTransition(
            () => {
                window.game?.setPerformanceProfile?.('gameplay');
                resetRunToStartingState({
                    resetBank: false,
                    skipEffects: false,
                    snailSpawnEnabled: true,
                    purgeSnails: false
                });
                document.getElementById('ui')?.classList.remove('hidden');
                syncTouchSettingsVisibility();
                syncTouchMoveControlVisibility();
            },
            () => {
                window.game?.setInputEnabled?.(true);
            }
            // Defaults to the currently selected class door
        );
    });
}

function returnToMainMenuFromRun({ doorKey = 'base' } = {}) {
    hideGameOverScreen();
    hideBiomePrompt();
    if (biomePromptTimer) {
        clearTimeout(biomePromptTimer);
        biomePromptTimer = null;
    }
    missionFlowRunning = false;
    resetRunToStartingState({
        resetBank: false,
        skipEffects: true,
        snailSpawnEnabled: false,
        purgeSnails: true
    });

    triggerDoorTransition(
        () => {
            document.getElementById('ui')?.classList.add('hidden');
            window.game?.setInputEnabled?.(false);
            syncTouchSettingsVisibility();
            syncTouchMoveControlVisibility();
            if (menu) menu.classList.remove('hidden');
            window.game?.setPerformanceProfile?.('menu');
            transitionToMenuMusic();

            const gameContainer = document.getElementById('game-container');
            const mapBox = document.querySelector('.map-box');
            if (gameContainer && mapBox) {
                mapBox.insertBefore(gameContainer, mapBox.querySelector('.module-scanline'));
                gameContainer.classList.remove('fullscreen-mode');
                queueGameLayoutRefresh();
            }
        },
        null,
        doorKey
    );
}

if (gameOverMainMenu) {
    gameOverMainMenu.addEventListener('click', () => {
        returnToMainMenuFromRun();
    });
}

function isTouchDevice() {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const touchPoints = navigator.maxTouchPoints > 0;
    const touchEvents = 'ontouchstart' in window;
    const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
    const narrowViewport = window.innerWidth <= 900 || window.innerHeight <= 900;

    return coarsePointer || touchPoints || touchEvents || (mobileUserAgent && narrowViewport);
}

function setTouchDeviceMode() {
    const touchDevice = isTouchDevice();
    document.body.classList.toggle('touch-device', touchDevice);
    document.body.classList.toggle('touch-controls-enabled', touchDevice || Boolean(state.settings.touchControls));

    if (mainTouchToggle) {
        mainTouchToggle.checked = !!state.settings.touchControls;
    }

    syncTouchSettingsVisibility();
    syncTouchMoveControlVisibility();
}

function syncTouchSettingsVisibility() {
    if (!touchControlsSetting) return;
    const isHUD = !document.getElementById('ui')?.classList.contains('hidden');
    touchControlsSetting.classList.toggle('hidden', !isHUD);
}

function syncTouchMoveControlVisibility() {
    if (!touchMoveControl) return;

    const touchDevice = isTouchDevice();
    const touchUiEnabled = touchDevice || Boolean(state.settings.touchControls);
    document.body.classList.toggle('touch-controls-enabled', touchUiEnabled);
    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const isHUD = !ui?.classList.contains('hidden');
    const isMenuHidden = menu?.classList.contains('hidden') ?? true;
    const inMissionIntro = document.body.classList.contains('mission-intro-active');
    const showHudTouchReadouts = isHUD && isMenuHidden && !inMissionIntro;

    // Keep the container visible for the compass; the toggle only gates the
    // lower-left movement joystick itself.
    touchMoveControl.classList.toggle('hidden', !showHudTouchReadouts);

    // Show/hide the joystick ring and label based on the touchControls setting
    const showJoystick = touchUiEnabled && state.settings.touchControls;
    if (touchMoveRing) {
        touchMoveRing.classList.toggle('hidden', !showJoystick);
    }
    const label = touchMoveControl.querySelector('.touch-move-control__label');
    if (label) {
        label.classList.toggle('hidden', !showJoystick);
    }

    const sprintBtn = document.getElementById('touch-sprint-btn');
    if (sprintBtn) {
        sprintBtn.classList.toggle('hidden', !showHudTouchReadouts);
    }

    const abilityBtn = document.getElementById('touch-ability-btn');
    if (abilityBtn) {
        const abilityInfo = window.game?.getClassAbilityInfo?.();
        const specialUnlocked = window.game?.isSpecialAbilityUnlocked?.() ?? true;
        const showAbilityBtn = showHudTouchReadouts && specialUnlocked && abilityInfo?.key !== 'sprint';
        abilityBtn.classList.toggle('hidden', !showAbilityBtn);
    }

    const scanBtn = document.getElementById('touch-scan-btn');
    if (scanBtn) {
        scanBtn.classList.toggle('hidden', !showHudTouchReadouts);
    }

    if (!isHUD) {
        clearTouchInputState();
    } else if (!showJoystick) {
        clearTouchMoveInputState();
    }
}

// Wire touch sprint button
const touchSprintBtn = document.getElementById('touch-sprint-btn');
if (touchSprintBtn) {
    touchSprintBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!window.game) return;
        
        const triggered = window.game.setVirtualInputSprint?.(true);
        
        updateTouchSprintButtonState({
            remaining: window.game.classAbility?.cooldownRemaining ?? 0,
            max: window.game.classAbility?.cooldownMax ?? 1,
            active: window.game.classAbility?.active ?? false,
            activeProgress: window.game.classAbility?.active
                ? ((window.game.classAbility?.activeTimer ?? 0) / Math.max(0.001, window.game.classAbility?.activeDuration ?? 1))
                : 0,
            ability: window.game.getClassAbilityInfo?.().key
        });
        
        window.AudioManager?.play(triggered ? 'ui_click' : 'ui_error', { volume: 0.5, playbackRate: triggered ? 1.2 : 0.95 });
    });
}

// Wire touch ability button
const touchAbilityBtn = document.getElementById('touch-ability-btn');
if (touchAbilityBtn) {
    touchAbilityBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.game?.triggerClassAbility?.();
    });
}

const touchScanBtn = document.getElementById('touch-scan-btn');
if (touchScanBtn) {
    touchScanBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.game?.triggerRadarScan?.();
    });
}

function formatTouchCompassDistance(distance) {
    if (!Number.isFinite(distance) || distance <= 0) return '0u';
    return `${Math.round(distance)}u`;
}

function updateTouchCompass() {
    if (!touchCompassArrow || !touchCompassDistance) return;

    const compassState = window.game?.getSpawnCompassState?.();
    if (!compassState) {
        touchCompassArrow.style.transform = 'translate(-50%, -100%) rotate(0deg)';
        touchCompassArrow.style.opacity = '0.35';
        touchCompassDistance.textContent = '0u';
        if (touchCompassRadarArrow) {
            touchCompassRadarArrow.classList.add('hidden');
            touchCompassRadarArrow.style.transform = 'translate(-50%, -100%) rotate(0deg)';
            touchCompassRadarArrow.style.opacity = '0';
        }
        if (touchCompassRadarDistance) {
            touchCompassRadarDistance.classList.add('hidden');
            touchCompassRadarDistance.textContent = '';
        }
        return;
    }

    const angle = Number.isFinite(compassState.angle) ? compassState.angle : 0;
    const distance = Number.isFinite(compassState.distance) ? compassState.distance : 0;
    touchCompassArrow.style.transform = `translate(-50%, -100%) rotate(${angle.toFixed(2)}deg)`;
    touchCompassArrow.style.opacity = distance <= 0.05 ? '0.35' : '1';
    touchCompassDistance.textContent = formatTouchCompassDistance(distance);

    const radarState = compassState.radar ?? null;
    const radarActive = Boolean(radarState?.active);
    if (touchCompassRadarArrow) {
        if (!radarActive) {
            touchCompassRadarArrow.classList.add('hidden');
            touchCompassRadarArrow.style.opacity = '0';
        } else {
            const radarAngle = Number.isFinite(radarState.angle) ? radarState.angle : 0;
            const radarDistance = Number.isFinite(radarState.distance) ? radarState.distance : 0;
            touchCompassRadarArrow.classList.remove('hidden');
            touchCompassRadarArrow.style.transform = `translate(-50%, -100%) rotate(${radarAngle.toFixed(2)}deg)`;
            touchCompassRadarArrow.style.opacity = radarDistance <= 0.05 ? '0.35' : '0.95';
        }
    }
    if (touchCompassRadarDistance) {
        if (!radarActive) {
            touchCompassRadarDistance.classList.add('hidden');
            touchCompassRadarDistance.textContent = '';
        } else {
            const radarDistance = Number.isFinite(radarState.distance) ? radarState.distance : 0;
            touchCompassRadarDistance.classList.remove('hidden');
            touchCompassRadarDistance.textContent = radarState.mode === 'corrupt'
                ? 'OUT OF SYNC'
                : formatTouchCompassDistance(radarDistance);
            touchCompassRadarDistance.style.opacity = radarDistance <= 0.05 ? '0.35' : '1';
        }
    }
}

function installTouchCompass() {
    if (!touchCompassArrow || !touchCompassDistance) return;

    const step = () => {
        updateTouchCompass();
        requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

function installTouchMoveControl() {
    if (!touchMoveControl || !touchMoveRing || !touchMoveThumb) return;

    const maxThumbOffset = () => touchMoveRing.clientWidth * 0.22;

    const resetTouchControl = () => {
        activeTouchPointerId = null;
        touchMoveControl.classList.remove('active');
        touchMoveThumb.style.transform = 'translate(-50%, -50%)';
        window.game?.setVirtualInput?.(0, 0);
    };

    const updateTouchVector = (clientX, clientY) => {
        const rect = touchMoveRing.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        const radius = Math.max(rect.width * 0.36, 1);
        const distance = Math.hypot(deltaX, deltaY);
        const clampRatio = distance > radius ? radius / distance : 1;
        const clampedX = deltaX * clampRatio;
        const clampedY = deltaY * clampRatio;
        const thumbRange = maxThumbOffset();
        const thumbScale = radius > 0 ? thumbRange / radius : 0;

        touchMoveThumb.style.transform = `translate(calc(-50% + ${clampedX * thumbScale}px), calc(-50% + ${clampedY * thumbScale}px))`;
        window.game?.setVirtualInput?.(clampedX / radius, clampedY / radius);
    };

    touchMoveRing.addEventListener('pointerdown', (event) => {
        activeTouchPointerId = event.pointerId;
        touchMoveControl.classList.add('active');
        touchMoveRing.setPointerCapture(event.pointerId);
        updateTouchVector(event.clientX, event.clientY);
        event.preventDefault();
    });

    touchMoveRing.addEventListener('pointermove', (event) => {
        if (event.pointerId !== activeTouchPointerId) return;
        updateTouchVector(event.clientX, event.clientY);
        event.preventDefault();
    });

    const releaseTouchControl = (event) => {
        if (event.pointerId !== activeTouchPointerId) return;
        resetTouchControl();
    };

    touchMoveRing.addEventListener('pointerup', releaseTouchControl);
    touchMoveRing.addEventListener('pointercancel', releaseTouchControl);
    touchMoveRing.addEventListener('lostpointercapture', resetTouchControl);
}

function syncStageMetrics() {
    if (!gameViewport) return;

    // Set actual window dimensions as CSS variables to override standard dvh/vw on mobile fullscreen
    const width = window.innerWidth;
    const height = window.innerHeight;
    document.documentElement.style.setProperty('--vw-actual', `${width}px`);
    document.documentElement.style.setProperty('--vh-actual', `${height}px`);

    const rect = gameViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const unit = Math.min(rect.width / DESIGN_STAGE.width, rect.height / DESIGN_STAGE.height);
    gameViewport.style.setProperty('--vu', `${unit}px`);
}

function refreshGameLayout() {
    syncStageMetrics();

    window.game?.resize?.();
    if (window.game?.scale?.refresh) {
        requestAnimationFrame(() => {
            window.game.scale.refresh();
        });
    }
}

function queueGameLayoutRefresh(frameCount = 3) {
    let framesRemaining = frameCount;

    const step = () => {
        refreshGameLayout();
        framesRemaining -= 1;

        if (framesRemaining > 0) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}

async function settleGameLayoutForWarmup() {
    syncStageMetrics();
    window.game?.scale?.refresh?.();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    syncStageMetrics();
    window.game?.scale?.refresh?.();
}

function installStageLayoutSync() {
    syncStageMetrics();

    if (stageResizeObserver || !gameViewport || !('ResizeObserver' in window)) return;

    stageResizeObserver = new ResizeObserver(() => {
        refreshGameLayout();
    });
    stageResizeObserver.observe(gameViewport);
    if (gameStageContainer) {
        stageResizeObserver.observe(gameStageContainer);
    }
}

function getSelectedHeroType() {
    const selected = document.querySelector('.char-card.selected');
    return selected?.getAttribute('data-type') || window.game?.playerType || 'SCOUT';
}

function resolveCutsceneImpactPoint() {
    const overlay = document.getElementById('cutscene-overlay');
    const gameContainer = document.getElementById('game-container');
    if (!overlay || !gameContainer) {
        return null;
    }

    const rect = overlay.getBoundingClientRect();
    const gameRect = gameContainer.getBoundingClientRect();
    return {
        x: (gameRect.left - rect.left) + (gameRect.width * 0.5),
        y: (gameRect.top - rect.top) + (gameRect.height * 0.62)
    };
}

function ensureMissionManagers() {
    if (!cutsceneManager) {
        cutsceneManager = new CutsceneManager({
            resolveImpactPoint: resolveCutsceneImpactPoint
        });
    }

    if (!dialogueManager) {
        dialogueManager = new DialogueManager({
            setInputEnabled: (enabled) => {
                window.game?.setInputEnabled?.(enabled);
            }
        });
    }
}


function showRunLoadingScreen(status = 'SYNCHRONIZING DROP VECTOR', progress = 0, { overDoor = false } = {}) {
    clearLoaderBriefingMode();
    if (loaderTitle) loaderTitle.textContent = 'MOTHERSHIP DEPLOYMENT TELEMETRY';
    if (loaderStatus) loaderStatus.textContent = status;
    if (loaderBar) loaderBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    loadingScreen?.classList.toggle('over-door-loader', Boolean(overDoor));
    loadingScreen?.classList.remove('is-fading');
    loadingScreen?.classList.remove('hidden');
}

async function hideRunLoadingScreen({ fade = false } = {}) {
    if (fade && loadingScreen && !loadingScreen.classList.contains('hidden')) {
        loadingScreen.classList.add('is-fading');
        await new Promise((resolve) => window.setTimeout(resolve, 360));
    }
    loadingScreen?.classList.add('hidden');
    loadingScreen?.classList.remove('over-door-loader', 'is-fading');
    clearLoaderBriefingMode();
}

let tacticalOverlayTimer = null;
function showTacticalOverlay({
    title = 'SYSTEM UPDATE',
    status = '',
    progress = 100,
    duration = 1600,
    speaker = '',
    avatar = '',
    allowInMenus = false
} = {}) {
    if (!allowInMenus && !isGameplayPhase()) return;
    if (tacticalOverlayTimer) {
        clearTimeout(tacticalOverlayTimer);
        tacticalOverlayTimer = null;
    }
    if (loaderTitle) loaderTitle.textContent = title;
    if (loaderStatus) loaderStatus.innerHTML = `<div style="opacity: 1.0; animation: tactical-pulse 1.2s infinite ease-in-out;">${status}</div>`;
    if (loaderBar) loaderBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    loadingScreen?.classList.add('tactical-mode');
    loadingScreen?.classList.toggle('briefing-mode', Boolean(speaker || avatar));
    if (loaderBriefingSpeaker) {
        loaderBriefingSpeaker.textContent = speaker;
        loaderBriefingSpeaker.classList.toggle('hidden', !speaker);
    }
    if (loaderBriefingAvatarImg && avatar) {
        loaderBriefingAvatarImg.src = avatar;
    }
    loaderBriefingAvatar?.classList.toggle('hidden', !avatar);
    loadingScreen?.classList.remove('hidden');
    if (duration > 0) {
        tacticalOverlayTimer = setTimeout(() => {
            loadingScreen?.classList.add('hidden');
            clearLoaderBriefingMode();
            tacticalOverlayTimer = null;
        }, duration);
    }
}

async function prepareGameplayForDialogue({ loaderOverDoor = false } = {}) {
    const game = window.game;
    if (!game?.prepareVisibleChunksForGameplay) return;

    showRunLoadingScreen('DOWNLOADING SECTOR PILLAR TOPOGRAPHY...', 0, { overDoor: loaderOverDoor });
    game.setLoadingPaused?.(true);
    try {
        await settleGameLayoutForWarmup();
        await game.prepareVisibleChunksForGameplay({
            batchSize: 3,
            onProgress: (progress) => {
                const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
                showRunLoadingScreen(`DOWNLOADING SECTOR PILLAR TOPOGRAPHY... ${pct}%`, pct, { overDoor: loaderOverDoor });
            }
        });
        showRunLoadingScreen('DEPLOYMENT SYNC COMPLETE', 100, { overDoor: loaderOverDoor });
        await new Promise((resolve) => window.setTimeout(resolve, loaderOverDoor ? 220 : 120));
    } finally {
        game.setLoadingPaused?.(false);
        await hideRunLoadingScreen({ fade: loaderOverDoor });
    }
}

function setSnailSpawnState(enabled, { purgeExisting = false } = {}) {
    window.game?.setSnailsEnabled?.(Boolean(enabled), { removeExisting: purgeExisting });
}

const CLASS_INTRO_WEBM_BASENAMES = {
    SCOUT: 'scout-intro',
    TANK: 'tank-intro',
    ENGINEER: 'engineer-intro'
};

const cutsceneImagePreloadCache = new Map();
const cutsceneVideoPreloadCache = new Map();

function getCutsceneVideoHost() {
    return document.getElementById('game-container') ?? document.body;
}

function warmCutsceneImage(src) {
    if (!src || cutsceneImagePreloadCache.has(src)) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    cutsceneImagePreloadCache.set(src, image);
}

function warmCutsceneVideo(base) {
    if (!base) return;
    const canPlayWebm = document.createElement('video').canPlayType('video/webm');
    const source = canPlayWebm ? `/cutscenes/${base}.webm` : `/cutscenes/${base}.mp4`;
    if (cutsceneVideoPreloadCache.has(source)) return;

    warmCutsceneImage(`/cutscenes/${base}-poster.jpg`);

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.poster = `/cutscenes/${base}-poster.jpg`;
    video.src = source;
    video.load();
    cutsceneVideoPreloadCache.set(source, video);
}

function warmClassIntroMedia(playerType = 'SCOUT') {
    const webmBase = CLASS_INTRO_WEBM_BASENAMES[playerType] ?? CLASS_INTRO_WEBM_BASENAMES.SCOUT;
    warmCutsceneVideo(webmBase);
}

const CLASS_INTRO_GIFS = Object.freeze({
    SCOUT: '/Scout.Intro.gif',
    TANK: '/Tank.Intro.gif',
    ENGINEER: '/Eng.Intro.gif'
});
const CLASS_INTRO_GIF_VISIBLE_MS = 7750;
const CLASS_INTRO_GIF_LOOP_GUARD_MS = 250; // keep a safety margin before the loop boundary

function playClassIntroSequence(playerType = 'SCOUT') {
    const webmBase = CLASS_INTRO_WEBM_BASENAMES[playerType] ?? CLASS_INTRO_WEBM_BASENAMES.SCOUT;
    const gifSrc = CLASS_INTRO_GIFS[playerType] ?? CLASS_INTRO_GIFS.SCOUT;
    warmClassIntroMedia(playerType);

    return new Promise((resolve) => {
        const host = getCutsceneVideoHost();
        const overlay = document.createElement('div');
        overlay.className = 'class-intro-overlay';
        overlay.style.setProperty('--class-intro-poster', `url('/cutscenes/${webmBase}-poster.jpg')`);

        const skipHint = document.createElement('div');
        skipHint.className = 'class-intro-skip';
        skipHint.textContent = isTouchDevice() ? 'TAP TO SKIP' : 'PRESS ANY KEY TO SKIP';

        let settled = false;
        let step = 'gif'; // 'gif' → 'video' → done
        let gifTimer = null;
        let guardTimer = null;
        let videoElement = null;
        let gifImg = null;

        const clearTimers = () => {
            if (gifTimer) {
                window.clearTimeout(gifTimer);
                gifTimer = null;
            }
            if (guardTimer) {
                window.clearTimeout(guardTimer);
                guardTimer = null;
            }
        };

        function cleanupAndResolve() {
            if (settled) return;
            settled = true;
            step = 'done';
            clearTimers();
            window.removeEventListener('keydown', onKey);
            overlay.removeEventListener('pointerup', onPointerUp);
            if (videoElement) {
                try { videoElement.pause(); } catch { /* ignore */ }
            }
            overlay.classList.add('is-closing');
            window.setTimeout(() => overlay.remove(), 280);
            resolve();
        }

        function onKey(event) {
            event.preventDefault();
            if (step === 'gif') startVideoStep();
            else cleanupAndResolve();
        }

        function onPointerUp(event) {
            event.preventDefault();
            if (step === 'gif') startVideoStep();
            else cleanupAndResolve();
        }

        window.addEventListener('keydown', onKey);
        overlay.addEventListener('pointerup', onPointerUp);

        // ── Step 1: the class intro GIF, then the launch WebM ──
        function startVideoStep() {
            if (settled || step === 'video') return;
            step = 'video';
            if (gifTimer) {
                window.clearTimeout(gifTimer);
                gifTimer = null;
            }
            gifImg?.remove();
            buildVideo();
        }

        gifImg = document.createElement('img');
        gifImg.className = 'class-intro-video';
        gifImg.style.objectFit = 'cover';
        gifImg.alt = '';
        gifImg.src = gifSrc;
        gifImg.addEventListener('error', startVideoStep, { once: true });
        overlay.append(gifImg, skipHint);
        host.appendChild(overlay);
        const gifShownAt = performance.now();
        gifTimer = window.setTimeout(startVideoStep, CLASS_INTRO_GIF_VISIBLE_MS);

        // Cut to the video right before the GIF would wrap to frame one.
        void getGifDurationMs(gifSrc).then((durationMs) => {
            if (settled || step !== 'gif' || !durationMs) return;
            const elapsed = performance.now() - gifShownAt;
            const safeVisibleMs = Math.min(
                CLASS_INTRO_GIF_VISIBLE_MS,
                Math.max(0, durationMs - CLASS_INTRO_GIF_LOOP_GUARD_MS)
            );
            const remaining = safeVisibleMs - elapsed;
            window.clearTimeout(gifTimer);
            gifTimer = window.setTimeout(startVideoStep, Math.max(0, remaining));
        });

        function buildVideo() {
        videoElement = document.createElement('video');
        videoElement.className = 'class-intro-video';
        videoElement.style.opacity = '0';
        videoElement.playsInline = true;
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.controls = false;
        videoElement.preload = 'auto';
        videoElement.poster = `/cutscenes/${webmBase}-poster.jpg`;

        const webmSource = document.createElement('source');
        webmSource.src = `/cutscenes/${webmBase}.webm`;
        webmSource.type = 'video/webm';

        // Keep the GIF asset as preload-only; the visible intro is the WebM
        // one-shot cutscene so it never loops.
        if (videoElement.canPlayType('video/webm')) {
            videoElement.append(webmSource);
        } else {
            const mp4Fallback = document.createElement('source');
            mp4Fallback.src = `/cutscenes/${webmBase}.mp4`;
            mp4Fallback.type = 'video/mp4';
            videoElement.append(mp4Fallback);
        }
        overlay.insertBefore(videoElement, skipHint);

        guardTimer = window.setTimeout(() => {
            if (videoElement.readyState < 2) cleanupAndResolve();
        }, 4000);

        videoElement.addEventListener('playing', () => {
            if (guardTimer) {
                window.clearTimeout(guardTimer);
                guardTimer = null;
            }
            videoElement.style.opacity = '1';
        });
        videoElement.addEventListener('loadeddata', () => {
            videoElement.style.opacity = '1';
        }, { once: true });
        videoElement.addEventListener('ended', cleanupAndResolve);
        videoElement.addEventListener('error', cleanupAndResolve);

        videoElement.play().catch(cleanupAndResolve);
        }
    });
}

// Generic fullscreen cutscene video: plays /cutscenes/{base}.webm (mp4
// fallback, {base}-poster.jpg). Skippable, and resolves immediately when the
// asset doesn't exist so story beats never stall on missing files.
function playCutsceneVideo(base) {
    warmCutsceneVideo(base);

    return new Promise((resolve) => {
        const host = getCutsceneVideoHost();
        const overlay = document.createElement('div');
        overlay.className = 'class-intro-overlay';
        overlay.style.setProperty('--class-intro-poster', `url('/cutscenes/${base}-poster.jpg')`);

        const video = document.createElement('video');
        video.className = 'class-intro-video';
        video.style.opacity = '0';
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.controls = false;
        video.preload = 'auto';
        video.poster = `/cutscenes/${base}-poster.jpg`;

        const webm = document.createElement('source');
        webm.src = `/cutscenes/${base}.webm`;
        webm.type = 'video/webm';
        let fallbackSource = webm;
        if (video.canPlayType('video/webm')) {
            video.append(webm);
        } else {
            const mp4 = document.createElement('source');
            mp4.src = `/cutscenes/${base}.mp4`;
            mp4.type = 'video/mp4';
            video.append(mp4);
            fallbackSource = mp4;
        }

        const skipHint = document.createElement('div');
        skipHint.className = 'class-intro-skip';
        skipHint.textContent = isTouchDevice() ? 'TAP TO SKIP' : 'PRESS ANY KEY TO SKIP';

        let settled = false;
        let guardTimer = 0;
        const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(guardTimer);
            window.removeEventListener('keydown', onKey);
            try { video.pause(); } catch { /* already detached */ }
            overlay.classList.add('is-closing');
            window.setTimeout(() => overlay.remove(), 280);
            resolve();
        };
        const onKey = (event) => {
            event.preventDefault();
            finish();
        };

        video.addEventListener('ended', finish);
        video.addEventListener('error', finish);
        video.addEventListener('loadeddata', () => {
            video.style.opacity = '1';
        }, { once: true });
        // The selected source erroring means nothing was playable (asset absent).
        fallbackSource.addEventListener('error', finish);
        overlay.addEventListener('pointerup', finish);
        window.addEventListener('keydown', onKey);
        guardTimer = window.setTimeout(() => {
            if (video.readyState < 2) finish();
        }, 4000);
        video.addEventListener('playing', () => {
            window.clearTimeout(guardTimer);
            video.style.opacity = '1';
        });

        overlay.append(video, skipHint);
        host.appendChild(overlay);
        video.play().catch(finish);
    });
}

// ── Act 2 run intro: the queen replaces the Mothership handshake ──
function isAct2RunActive() {
    if (!ARC_PRELUDE_ENABLED || !arcManager || !act2Manager) return false;
    return arcManager.getState().arcState === 'hive_awakened_tease';
}

async function runAct2IntroSequence(game, playerType) {
    const alreadyBegun = act2Manager.getState().begun;
    if (!alreadyBegun) act2Manager.begin();

    document.body.classList.add('hud-hidden');
    await new Promise((resolve) => {
        triggerDoorTransition(
            () => {
                document.body.classList.remove('mission-intro-active');
            },
            () => resolve()
        );
    });
    await new Promise((r) => window.setTimeout(r, 1000));
    document.body.classList.remove('hud-hidden');

    const lines = alreadyBegun ? ACT2_LINES.resume : ACT2_LINES.intro;
    await dialogueManager?.openBriefTransmission({ playerType, lines: [...lines] });
    // Post-reveal HUD: the cover meter joins the vitals panel.
    const infectedState = act2Manager.getState();
    window.dispatchEvent(new CustomEvent('player-humanity-changed', {
        detail: { humanity: infectedState.humanity, stage: infectedState.infectionStage }
    }));
    window.AudioManager?.startAmbience?.();
}

async function runMissionIntroSequence() {
    if (missionFlowRunning) return;

    ensureMissionManagers();
    missionFlowRunning = true;
    document.body.classList.add('mission-intro-active');
    const game = window.game;
    const playerType = getSelectedHeroType();

    game?.setInputEnabled?.(false);
    hideAllGameplayPrompts();
    const consoleModal = document.getElementById('console-terminal-modal');
    if (consoleModal) {
        consoleModal.classList.add('hidden');
    }

    try {
        // Post-reveal saves belong to the queen: no crash replay, no
        // Mothership handshake, no human mission briefing.
        if (isAct2RunActive()) {
            await runAct2IntroSequence(game, playerType);
            return;
        }

        await playClassIntroSequence(playerType);

        await cutsceneManager?.play({
            playerType,
            allowSkip: true,
            resolveImpactPoint: resolveCutsceneImpactPoint
        });

        const choice = await dialogueManager?.openMothershipDialogue({ playerType }) ?? 'skip';

        if (choice === 'tutorial') {
            // Reveal HUD/touch elements for in-world tutorial prompts.
            document.body.classList.remove('mission-intro-active');
            game?.setInputEnabled?.(true);
            await dialogueManager?.startTutorialSequence({
                game,
                touchControlsEnabled: Boolean(state.settings.touchControls)
            });
        } else {
            document.body.classList.add('hud-hidden');
            await new Promise((resolve) => {
                triggerDoorTransition(
                    // onClosed: reveal game viewport behind the closed doors
                    () => {
                        document.body.classList.remove('mission-intro-active');
                    },
                    // onOpened: resolve transition promise
                    () => {
                        resolve();
                    }
                );
            });
            // Wait for doors to finish opening before revealing the HUD
            await new Promise((r) => window.setTimeout(r, 1000));
            document.body.classList.remove('hud-hidden');
        }

        // Show mission briefing after door transition
        if (currentMission?.label) {
            window.setTimeout(() => showBiomePrompt(`MISSION: ${currentMission.label}`), 400);
            if (currentRunModifier?.title) {
                window.setTimeout(() => showBiomePrompt(`MODIFIER: ${currentRunModifier.title}`), 1400);
            }
            if (missionProgressHUDTimer) {
                clearTimeout(missionProgressHUDTimer);
            }
            if (currentMission.type === 'elimination' && currentMission.targetKills > 0) {
                missionProgressHUDTimer = window.setTimeout(() => {
                    showMissionProgressHUD(`ELIMINATE: 0 / ${currentMission.targetKills}`);
                    missionProgressHUDTimer = null;
                }, 600);
            } else if (currentMission.type === 'retrieval') {
                missionProgressHUDTimer = window.setTimeout(() => {
                    showMissionProgressHUD('RETRIEVE: TECH CACHE — SCAN AREA');
                    missionProgressHUDTimer = null;
                }, 600);
            } else if (currentMission.type === 'survey') {
                missionProgressHUDTimer = window.setTimeout(() => {
                    showMissionProgressHUD(`SURVEY: REACH ${currentMission.targetDepth}u DEPTH`);
                    missionProgressHUDTimer = null;
                }, 600);
            }
        }

        // Start gameplay background music and loop ambience now that intro sequences are finished
        window.AudioManager?.startAmbience?.();
    } finally {
        document.body.classList.remove('mission-intro-active');
        document.body.classList.remove('hud-hidden');
        game?.setInputEnabled?.(true);
        missionFlowRunning = false;
    }
}

// --- Initialization ---
if (playBtn) {
    playBtn.addEventListener('click', () => {
        triggerDoorTransition(
            () => {
                if (splash) splash.classList.add('hidden');
                if (menu) {
                    setAppPhase('menu');
                    menu.classList.remove('hidden');
                    window.game?.setPerformanceProfile?.('menu');
                    queueGameLayoutRefresh();
                }
            },
            () => {
                if (state.settings.fullscreen) {
                    document.documentElement.requestFullscreen().catch(() => { });
                }
            },
            'base'
        );
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        triggerDoorTransition(
            () => {
                if (menu) menu.classList.add('hidden');
                setAppPhase('gameplay');
                window.game?.setPerformanceProfile?.('gameplay');
                window.game?.updatePlayerType?.(getSelectedHeroType(), { poof: false, emitWorldEvents: false });
                resetRunToStartingState({
                    resetBank: true,
                    skipEffects: true,
                    snailSpawnEnabled: true,
                    purgeSnails: false
                });
                document.getElementById('ui').classList.remove('hidden');
                syncTouchSettingsVisibility();
                syncTouchMoveControlVisibility();

                const gameContainer = document.getElementById('game-container');
                const viewport = document.getElementById('game-viewport');
                if (gameContainer && viewport) {
                    viewport.insertBefore(gameContainer, document.getElementById('ui'));
                    gameContainer.classList.add('fullscreen-mode');
                    queueGameLayoutRefresh();
                }

                // Keep the doors closed while the world build + shader warm-up
                // runs, with the progress readout mounted over the door face.
                return prepareGameplayForDialogue({ loaderOverDoor: true });
            },
            () => {
                void runMissionIntroSequence();
            },
            undefined,
            { waitForClosedWork: true, openingHoldMs: 160 }
            // Defaults to active class door
        );
    });
}

// Daily Ops button
const dailyOpsBtn = document.getElementById('daily-ops-btn');
if (dailyOpsBtn) {
    dailyOpsBtn.addEventListener('click', () => {
        const record = getDailyOpsRecord();
        if (record?.completed) return;
        saveDailyOpsRecord({ attempted: true, completed: false, date: getTodayDateString() });
        _isDailyOpsRun = true;
        if (window.game) {
            window.game.globalSeedOffset = getDailySeedInt();
            window.game.fixedRunEntropy = true;
        }
        triggerDoorTransition(
            () => {
                if (menu) menu.classList.add('hidden');
                setAppPhase('gameplay');
                window.game?.setPerformanceProfile?.('gameplay');
                window.game?.updatePlayerType?.(getSelectedHeroType(), { poof: false, emitWorldEvents: false });
                resetRunToStartingState({
                    resetBank: false,
                    skipEffects: true,
                    snailSpawnEnabled: true,
                    purgeSnails: false
                });
                document.getElementById('ui')?.classList.remove('hidden');
                syncTouchSettingsVisibility();
                syncTouchMoveControlVisibility();
                const gameContainer = document.getElementById('game-container');
                const viewport = document.getElementById('game-viewport');
                if (gameContainer && viewport) {
                    viewport.insertBefore(gameContainer, document.getElementById('ui'));
                    gameContainer.classList.add('fullscreen-mode');
                    queueGameLayoutRefresh();
                }

                // Keep the doors closed while the world build + shader warm-up
                // runs, with the progress readout mounted over the door face.
                return prepareGameplayForDialogue({ loaderOverDoor: true });
            },
            () => {
                void runMissionIntroSequence();
            },
            undefined,
            { waitForClosedWork: true, openingHoldMs: 160 }
            // Defaults to active class door
        );
    });
}

// Settings Handlers
if (splashDebugToggle) {
    splashDebugToggle.addEventListener('change', (e) => {
        state.settings.debug = e.target.checked;
        setDebugMode(state.settings.debug);
        if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
    });
}

if (splashNightVisionToggle) {
    splashNightVisionToggle.addEventListener('change', (e) => {
        state.settings.nightVision = e.target.checked;
        localStorage.setItem('hunker_nightvision_enabled', String(state.settings.nightVision));
        if (mainNightVisionToggle) mainNightVisionToggle.checked = state.settings.nightVision;
        if (window.game) {
            window.game.nightVision = state.settings.nightVision;
        }
    });
}

if (splashFsToggle) {
    splashFsToggle.addEventListener('change', (e) => {
        state.settings.fullscreen = e.target.checked;
        if (state.settings.fullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        }
    });
}

// Fullscreen State Sync Listener
document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    state.settings.fullscreen = isFs;
    if (splashFsToggle) splashFsToggle.checked = isFs;
    if (mainFsToggle) mainFsToggle.checked = isFs;
    queueGameLayoutRefresh();
});

// Global UI Updates
function setDebugMode(active) {
    if (active) {
        document.body.classList.add('show-debug');
    } else {
        document.body.classList.remove('show-debug');
    }
}

// FPS Counter (Debug Tool)
const fpsDisplay = document.getElementById('fps-counter');
let fpsFrames = 0;
let fpsLastTime = performance.now();
let fpsRafId = null;

function sampleFPS() {
    if (!document.body.classList.contains('show-debug')) {
        fpsRafId = null;
        return;
    }
    fpsFrames++;
    fpsRafId = requestAnimationFrame(sampleFPS);
}

const debugGrantResourcesBtn = document.getElementById('debug-grant-resources');
const debugGodModeBtn = document.getElementById('debug-god-mode');
let debugGodModeActive = false;

debugGrantResourcesBtn?.addEventListener('click', () => {
    bankManager.deposit({ tech: 250, coin: 150, med: 75 });
    bankManager.addShells(75);
    window.game?.healPlayer?.(99);
    window.game?.adjustOxygen?.(100);
    window.game?.renderConsoleBanking?.(window.game?.activeInteractiveConsole);
    renderFabricationModal();
    updateMenuCommandStatuses();
    showBiomePrompt('> DEBUG: SALVAGE, SHELLS, HP, AND O₂ GRANTED.');
});

debugGodModeBtn?.addEventListener('click', () => {
    debugGodModeActive = !debugGodModeActive;
    window.game?.setGodMode?.(debugGodModeActive);
    debugGodModeBtn.classList.toggle('debug-btn--active', debugGodModeActive);
    debugGodModeBtn.textContent = debugGodModeActive ? 'GOD✓' : 'GOD';
    showBiomePrompt(`> DEBUG: GOD MODE ${debugGodModeActive ? 'ONLINE' : 'OFFLINE'}.`);
});

if (fpsDisplay) {
    setInterval(() => {
        if (!document.body.classList.contains('show-debug')) {
            fpsFrames = 0;
            fpsLastTime = performance.now();
            return;
        }
        if (fpsRafId === null) {
            fpsFrames = 0;
            fpsLastTime = performance.now();
            fpsRafId = requestAnimationFrame(sampleFPS);
            return;
        }
        const now = performance.now();
        const elapsedSeconds = Math.max((now - fpsLastTime) / 1000, 0.001);
        fpsDisplay.textContent = `FPS: ${Math.round(fpsFrames / elapsedSeconds)}`;
        fpsFrames = 0;
        fpsLastTime = now;
    }, 1000);
}

function updateGearSpin(now) {
    const overlay = transitionOverlay || document.getElementById('transition-overlay');
    const dt = Math.min((now - gearSpinState.lastTime) / 1000, 0.05);
    gearSpinState.lastTime = now;

    if (overlay?.classList.contains('closing-v')) {
        gearSpinState.targetVelocity = 150;
    } else if (overlay?.classList.contains('opening-h')) {
        gearSpinState.targetVelocity = -120;
    } else {
        gearSpinState.targetVelocity = 0;
    }

    const smoothing = 1 - Math.exp(-dt * 7.5);
    gearSpinState.velocity += (gearSpinState.targetVelocity - gearSpinState.velocity) * smoothing;
    gearSpinState.rotation += gearSpinState.velocity * dt;

    if (overlay) {
        overlay.style.setProperty('--gear-rotation', `${gearSpinState.rotation}deg`);
    }

    requestAnimationFrame(updateGearSpin);
}
requestAnimationFrame(updateGearSpin);

// About Modal Logic
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');

if (aboutBtn && aboutModal) {
    aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
}
if (closeAbout && aboutModal) {
    closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));
}

// Typography Diagnostic Toggle (Debug Tool)
const typoToggle = document.getElementById('toggle-typo');
if (typoToggle) {
    typoToggle.addEventListener('click', () => {
        document.body.classList.toggle('show-typo');
    });
}

// Settings Modal Logic
const settingsPopup = document.getElementById('settings-popup');
const closeSettings = document.getElementById('close-settings');
const mainFsToggle = document.getElementById('main-fs-toggle');
const settingsBtns = document.querySelectorAll('.open-settings-btn');
const abortBtn = document.getElementById('abort-mission');

if (settingsBtns.length > 0 && settingsPopup) {
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Only show Abort Mission if we are actually in the tactical HUD
            const isHUD = !document.getElementById('ui')?.classList.contains('hidden');
            if (abortBtn) {
                if (isHUD) abortBtn.classList.remove('hidden');
                else abortBtn.classList.add('hidden');
            }

            syncTouchSettingsVisibility();
            settingsPopup.classList.remove('hidden');
            if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
            if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
            if (mainTouchToggle) mainTouchToggle.checked = !!state.settings.touchControls;
            if (mainNightVisionToggle) mainNightVisionToggle.checked = !!state.settings.nightVision;
            syncAudioMixerUI(state.settings.audioMix);
            setAudioMixerOpen(false);
            setSaveDataOpen(false);
            setResetSaveConfirmOpen(false);
        });
    });
}

if (abortBtn) {
    abortBtn.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.classList.remove('hidden');
    });
}

const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');

if (confirmNo) {
    confirmNo.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.classList.add('hidden');
    });
}

if (confirmYes) {
    confirmYes.addEventListener('click', () => {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal) confirmModal.classList.add('hidden');
        if (settingsPopup) settingsPopup.classList.add('hidden');
        setAudioMixerOpen(false);
        setSaveDataOpen(false);
        cutsceneManager?.finishActiveRun(true);
        dialogueManager?.cancelDialogue();
        dialogueManager?.cancelTutorial();
        document.body.classList.remove('mission-intro-active');
        hideMissionProgressHUD();
        hideBiomePrompt();
        if (!window.game?.abortMission?.()) {
            document.body.classList.remove('player-damage-flash', 'player-dead-flash', 'vitals-critical', 'distress-mode', 'player-poisoned');
            _distressModeActive = false;
            showGameOverScreen(
                window.game?.getRunStats?.() ?? { distanceTravelled: 0, totalPickups: 0, generatorLevel: 0 },
                { isVictory: false, deathReason: 'mission-abort' }
            );
        }
    });
}
if (closeSettings && settingsPopup) {
    closeSettings.addEventListener('click', () => {
        settingsPopup.classList.add('hidden');
        draftAudioMix = cloneAudioMix(state.settings.audioMix);
        AudioManager.setMix(state.settings.audioMix);
        setAudioMixerOpen(false);
        setSaveDataOpen(false);
        setResetSaveConfirmOpen(false);
    });
}

function setResetSaveConfirmOpen(isOpen) {
    resetSaveConfirmModal?.classList.toggle('hidden', !isOpen);
    resetSaveConfirmModal?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function setSaveDataOpen(isOpen) {
    saveDataPopup?.classList.toggle('hidden', !isOpen);
    if (!isOpen && saveDataStatus) {
        saveDataStatus.textContent = '';
        saveDataStatus.classList.remove('is-success', 'is-error');
    }
}

function setSaveDataStatus(message, type = '') {
    if (!saveDataStatus) return;
    saveDataStatus.textContent = message;
    saveDataStatus.classList.toggle('is-success', type === 'success');
    saveDataStatus.classList.toggle('is-error', type === 'error');
}

openSaveDataBtn?.addEventListener('click', () => {
    setSaveDataOpen(true);
    saveDataCode?.focus();
});
closeSaveDataBtn?.addEventListener('click', () => setSaveDataOpen(false));

openResetSaveBtn?.addEventListener('click', () => {
    setAudioMixerOpen(false);
    setSaveDataOpen(false);
    setResetSaveConfirmOpen(true);
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
});

resetSaveCancelBtn?.addEventListener('click', () => {
    setResetSaveConfirmOpen(false);
    window.AudioManager?.play?.('ui_click', { volume: 0.45 });
});

resetSaveConfirmBtn?.addEventListener('click', () => {
    const removed = clearSaveData();
    window.AudioManager?.play?.('ui_click', { volume: 0.55 });
    setResetSaveConfirmOpen(false);
    settingsPopup?.classList.add('hidden');
    setAudioMixerOpen(false);
    setSaveDataOpen(false);
    console.info(`Reset save data: cleared ${removed} record(s).`);
    window.setTimeout(() => window.location.reload(), 350);
});

// Global Escape Key Listener for Modals
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const dialogueModal = document.getElementById('mothership-dialogue');
        if (dialogueModal && !dialogueModal.classList.contains('hidden')) {
            return; // Let DialogueManager handle its own Escape key
        }

        if (campChoiceModal && !campChoiceModal.classList.contains('hidden')) {
            closeCampChoiceModal();
            event.preventDefault();
            return;
        }

        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && !confirmModal.classList.contains('hidden')) {
            confirmModal.classList.add('hidden');
            event.preventDefault();
            return;
        }

        if (resetSaveConfirmModal && !resetSaveConfirmModal.classList.contains('hidden')) {
            setResetSaveConfirmOpen(false);
            event.preventDefault();
            return;
        }

        const audioMixerPopup = document.getElementById('audio-mixer-popup');
        if (audioMixerPopup && !audioMixerPopup.classList.contains('hidden')) {
            draftAudioMix = cloneAudioMix(state.settings.audioMix);
            AudioManager.setMix(state.settings.audioMix);
            syncAudioMixerUI(draftAudioMix);
            setAudioMixerOpen(false);
            event.preventDefault();
            return;
        }

        const saveDataPopup = document.getElementById('save-data-popup');
        if (saveDataPopup && !saveDataPopup.classList.contains('hidden')) {
            setSaveDataOpen(false);
            event.preventDefault();
            return;
        }

        const settingsPopup = document.getElementById('settings-popup');
        if (settingsPopup && !settingsPopup.classList.contains('hidden')) {
            settingsPopup.classList.add('hidden');
            draftAudioMix = cloneAudioMix(state.settings.audioMix);
            AudioManager.setMix(state.settings.audioMix);
            setAudioMixerOpen(false);
            setSaveDataOpen(false);
            setResetSaveConfirmOpen(false);
            event.preventDefault();
            return;
        }

        const aboutModal = document.getElementById('about-modal');
        if (aboutModal && !aboutModal.classList.contains('hidden')) {
            aboutModal.classList.add('hidden');
            event.preventDefault();
            return;
        }

        const consoleModal = document.getElementById('console-terminal-modal');
        if (consoleModal && !consoleModal.classList.contains('hidden')) {
            window.game?.closeConsoleModal?.();
            event.preventDefault();
            return;
        }

        const o2GeneratorModal = document.getElementById('o2-generator-modal');
        if (o2GeneratorModal && !o2GeneratorModal.classList.contains('hidden')) {
            window.game?.closeO2GeneratorModal?.();
            event.preventDefault();
            return;
        }

        const loreModal = document.getElementById('lore-modal');
        if (loreModal && !loreModal.classList.contains('hidden')) {
            closeLoreModalAndResume();
            event.preventDefault();
            return;
        }

        const fabricationModal = document.getElementById('fabrication-modal');
        if (fabricationModal && !fabricationModal.classList.contains('hidden')) {
            closeFabricationModal();
            event.preventDefault();
            return;
        }

        const archiveLogDetail = document.getElementById('archive-log-detail-modal');
        if (archiveLogDetail && !archiveLogDetail.classList.contains('hidden')) {
            closeArchiveLogDetail();
            event.preventDefault();
            return;
        }

        const archiveModal = document.getElementById('archive-modal');
        if (archiveModal && !archiveModal.classList.contains('hidden')) {
            closeArchiveLogDetail();
            archiveModal.classList.add('hidden');
            archiveModal.setAttribute('aria-hidden', 'true');
            event.preventDefault();
            return;
        }

        const codexModal = document.getElementById('codex-modal');
        if (codexModal && !codexModal.classList.contains('hidden')) {
            closeCodexModal();
            event.preventDefault();
            return;
        }

        const rosterModal = document.getElementById('roster-modal');
        if (rosterModal && !rosterModal.classList.contains('hidden')) {
            rosterModal.classList.add('hidden');
            rosterModal.setAttribute('aria-hidden', 'true');
            event.preventDefault();
            return;
        }
    }
});

// Click Outside Helper to Close Modals
const setupClickOutside = (modalId, closeAction) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeAction();
            }
        });
    }
};

setupClickOutside('about-modal', () => {
    const aboutModal = document.getElementById('about-modal');
    if (aboutModal) aboutModal.classList.add('hidden');
});

// Lore readouts pause gameplay input, so clicking away must resume it too.
setupClickOutside('lore-modal', closeLoreModalAndResume);

// Archive modal
document.getElementById('archive-btn')?.addEventListener('click', () => {
    buildArchiveModal();
    const modal = document.getElementById('archive-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
});
document.getElementById('close-archive-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('archive-modal');
    closeArchiveLogDetail();
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
});
setupClickOutside('archive-modal', () => {
    const modal = document.getElementById('archive-modal');
    closeArchiveLogDetail();
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
});
document.getElementById('close-archive-log-detail')?.addEventListener('click', closeArchiveLogDetail);
setupClickOutside('archive-log-detail-modal', closeArchiveLogDetail);

// ── Fabrication Bay ───────────────────────────────────────────
// Spend banked salvage to print gear (recipe art reused from mothership's item
// cards). The Bay button unlocks once the O2 station powers the base (Beat 4 /
// .claude_work/01-feature-port-from-mothership.md §A).
function fabCostMarkup(cost) {
    const parts = [];
    if (cost.tech) parts.push(`<span class="fab-cost-chip">⬢ ${cost.tech}</span>`);
    if (cost.coin) parts.push(`<span class="fab-cost-chip">◎ ${cost.coin}</span>`);
    if (cost.med) parts.push(`<span class="fab-cost-chip">✚ ${cost.med}</span>`);
    return parts.join('');
}

function getBankResourceAmount(bank, key) {
    const value = Number(bank?.[key]);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function fabCostText(cost, bank = bankManager.getState(), { showHaveNeed = false } = {}) {
    const parts = [];
    for (const [key, label] of [['tech', 'TECH'], ['coin', 'COIN'], ['med', 'MED']]) {
        const need = Number(cost?.[key] ?? 0);
        if (!Number.isFinite(need) || need <= 0) continue;
        const normalizedNeed = Math.floor(need);
        const have = getBankResourceAmount(bank, key);
        parts.push(showHaveNeed ? `${label} ${have}/${normalizedNeed}` : `${normalizedNeed} ${label}`);
    }
    return parts.length ? parts.join(' / ') : 'NO COST';
}

function fabMissingResourceText(cost, bank = bankManager.getState()) {
    const missing = [];
    for (const [key, label] of [['tech', 'TECH'], ['coin', 'COIN'], ['med', 'MED']]) {
        const need = Number(cost?.[key] ?? 0);
        if (!Number.isFinite(need) || need <= 0) continue;
        const delta = Math.max(0, Math.floor(need) - getBankResourceAmount(bank, key));
        if (delta > 0) missing.push(`${delta} ${label}`);
    }
    return missing.length ? `NEED ${missing.join(' / ')}` : '';
}

function renderFoundryActivationPanel(grid, bank) {
    const activated = bankManager.isFoundryActivated();
    if (activated) return false;

    const canActivate = bankManager.canActivateFoundry();
    const missingText = fabMissingResourceText(FOUNDRY_ACTIVATION_COST, bank);
    const panel = document.createElement('div');
    panel.className = 'fab-activation-panel';
    panel.innerHTML = `
        <div class="fab-activation-panel__kicker">FOUNDRY LINK REQUIRED</div>
        <div class="fab-activation-panel__title">ACTIVATE FABRICATION BAY</div>
        <div class="fab-activation-panel__desc">Bring the in-world Foundry online before printing schematics.</div>
        <div class="fab-activation-panel__cost">${fabCostText(FOUNDRY_ACTIVATION_COST, bank, { showHaveNeed: !canActivate })}</div>
        <div class="fab-activation-panel__hint">${canActivate ? 'READY TO ACTIVATE' : missingText}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'fab-card__btn';
    btn.disabled = !canActivate;
    btn.textContent = canActivate ? 'ACTIVATE FOUNDRY' : missingText;
    if (!canActivate) btn.classList.add('fab-card__btn--locked');
    btn.addEventListener('click', () => {
        if (bankManager.activateFoundry()) {
            window.AudioManager?.play?.('class_lock', { volume: 0.55 });
            renderFabricationModal();
            refreshFabAccess();
        } else {
            window.AudioManager?.play?.('ui_error', { volume: 0.5 });
            renderFabricationModal();
        }
    });
    panel.appendChild(btn);
    grid.appendChild(panel);
    return true;
}

function renderFabricationModal() {
    const grid = document.getElementById('fab-recipe-grid');
    if (!grid) return;
    const bank = bankManager.getState();
    updateMenuCommandStatuses();
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('fab-bank-tech', bank.tech ?? 0);
    setTxt('fab-bank-coin', bank.coin ?? 0);
    setTxt('fab-bank-med', bank.med ?? 0);
    setTxt('fab-bank-shells', bank.shells ?? 0);

    const rollPanel = document.getElementById('fab-roll-panel');
    grid.innerHTML = '';
    if (renderFoundryActivationPanel(grid, bank)) {
        rollPanel?.classList.add('hidden');
        setTxt('fab-summary', `FOUNDRY ACTIVATION: ${fabCostText(FOUNDRY_ACTIVATION_COST, bank, { showHaveNeed: !bankManager.canActivateFoundry() })}`);
        return;
    }

    // Bay is online → show the gamba roll panel and sync the roll button.
    rollPanel?.classList.remove('hidden');
    const rollBtn = document.getElementById('fab-roll-btn');
    if (rollBtn && !fabRollSpinning) {
        const canRoll = fabricator.canRoll(bankManager);
        const objective = fabricator.getObjectiveState();
        rollBtn.disabled = !canRoll;
        rollBtn.classList.toggle('fab-roll-btn--locked', !canRoll);
        rollBtn.innerHTML = canRoll
            ? `FABRICATE TARGET &nbsp;·&nbsp; ${fabCostMarkup(FAB_SPIN_COST)}`
            : objective.siteUsesRemaining <= 0
                ? 'FABRICATOR BROKEN — FOLLOW NEXT SIGNAL'
                : `INSUFFICIENT SALVAGE &nbsp;·&nbsp; ${fabCostText(FAB_SPIN_COST, bank, { showHaveNeed: true })}`;
    }

    for (const recipe of FAB_RECIPES) {
        const fabricated = fabricator.isFabricated(recipe.id);

        // Collection card: display-only. Owned schematics are revealed; unowned
        // show as locked silhouettes you can still win from a roll. Rarity tints
        // the border so the collection reads at a glance.
        const rarity = (recipe.rarity ?? 'COMMON').toLowerCase();
        const card = document.createElement('div');
        card.className = ['fab-card', `fab-card--${rarity}`, fabricated ? 'fab-card--done' : 'fab-card--locked'].filter(Boolean).join(' ');

        const art = document.createElement('div');
        art.className = 'fab-card__art';
        const img = document.createElement('img');
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = recipe.name; img.src = recipe.art;
        img.addEventListener('error', () => { img.src = '/bunker_junk_rare.png'; }, { once: true });
        art.appendChild(img);
        const rarityTag = document.createElement('span');
        rarityTag.className = 'fab-card__rarity';
        rarityTag.textContent = recipe.rarity ?? 'COMMON';
        art.appendChild(rarityTag);
        card.appendChild(art);

        const name = document.createElement('div');
        name.className = 'fab-card__name';
        name.innerHTML = fabricated
            ? `<span class="fab-card__klass">${recipe.klass}</span>${recipe.name}`
            : `<span class="fab-card__klass">${recipe.klass}</span>??? LOCKED`;
        card.appendChild(name);

        const status = document.createElement('div');
        status.className = 'fab-card__status';
        status.textContent = fabricated ? '✓ FABRICATED' : 'NOT YET FABRICATED';
        card.appendChild(status);

        grid.appendChild(card);
    }
    const objective = fabricator.getObjectiveState();
    const targetName = objective.targetRecipe?.name ?? 'ALL TARGETS COMPLETE';
    const pct = Math.round((objective.chance ?? 1) * 100);
    setTxt('fab-summary', objective.complete
        ? `SCHEMATICS FABRICATED: ${fabricator.getFabricatedCount()} / ${FAB_RECIPES.length}`
        : `TARGET: ${targetName} · ODDS ${pct}% · USES ${objective.siteUsesRemaining}/${FABRICATOR_SITE_MAX_USES}`);
}

let fabTicker = null;
function startFabTicker() {
    if (fabTicker) return;
    fabTicker = setInterval(() => {
        fabricator.tickPrints();
        renderFabricationModal();
        if (!FAB_RECIPES.some((r) => fabricator.isPrinting(r.id))) stopFabTicker();
    }, 500);
}
function stopFabTicker() { if (fabTicker) { clearInterval(fabTicker); fabTicker = null; } }

// ── Fabricator gamba reveal (T7) ──────────────────────────────
const RARITY_TILES = ['COMMON', 'COMMON', 'RARE', 'COMMON', 'RARE', 'EPIC', 'RARE', 'COMMON', 'EPIC', 'LEGENDARY'];
let fabRollSpinning = false;

function runFabricatorRoll() {
    if (fabRollSpinning) return;
    const result = fabricator.rollFabrication(bankManager);
    if (!result) { window.AudioManager?.play?.('ui_error', { volume: 0.5 }); return; }

    fabRollSpinning = true;
    const reveal = document.getElementById('fab-reveal');
    const strip = document.getElementById('fab-reveal-strip');
    const cardEl = document.getElementById('fab-reveal-card');
    const rollBtn = document.getElementById('fab-roll-btn');
    if (rollBtn) { rollBtn.disabled = true; rollBtn.textContent = 'FABRICATING…'; }
    window.AudioManager?.play?.('door_gears_spin', { volume: 0.4 });

    // Build a long strip of rarity tiles; the winner lands under the marker.
    const WIN_INDEX = 42;
    const tiles = [];
    for (let i = 0; i < 58; i++) {
        tiles.push(i === WIN_INDEX ? result.rarity : RARITY_TILES[Math.floor(Math.random() * RARITY_TILES.length)]);
    }
    if (strip) {
        strip.innerHTML = tiles.map((r) => `<div class="fab-tile fab-tile--${r.toLowerCase()}">${r}</div>`).join('');
        strip.style.transition = 'none';
        strip.style.transform = 'translateX(0)';
        strip.offsetWidth; // Force synchronous layout reflow for accurate measurements
    }
    if (reveal) reveal.dataset.state = 'spinning';
    if (cardEl) cardEl.innerHTML = '';

    // Kick the animation on the next frame so the transition applies.
    requestAnimationFrame(() => {
        if (!strip) return;
        const wrap = document.getElementById('fab-reveal-strip-wrap');
        const firstTile = strip.firstElementChild;
        const tileRect = firstTile?.getBoundingClientRect?.();
        const computedStyle = window.getComputedStyle(strip);
        const tileWidth = tileRect?.width ?? 92;
        const tileGap = parseFloat(computedStyle.columnGap || computedStyle.gap || '0') || 0;
        const paddingLeft = parseFloat(computedStyle.paddingLeft || '0') || 0;
        const center = (wrap?.clientWidth ?? 320) / 2;
        const step = tileWidth + tileGap;
        const target = center - (paddingLeft + (WIN_INDEX * step) + (tileWidth / 2));
        strip.style.transition = 'transform 3.2s cubic-bezier(0.12, 0.8, 0.18, 1)';
        strip.style.transform = `translateX(${target}px)`;
    });

    setTimeout(() => {
        const r = result.rarity;
        const rec = result.recipe;
        if (reveal) reveal.dataset.state = 'revealed';
        if (cardEl) {
            cardEl.className = `fab-reveal__card fab-reveal__card--${r.toLowerCase()}`;
            cardEl.innerHTML =
                `<img class="fab-reveal__art" src="${rec.art}" alt="${rec.name}" onerror="this.src='/bunker_junk_rare.png'">` +
                `<div class="fab-reveal__rarity">${r}${result.duplicate ? ' · DUPLICATE' : ''}</div>` +
                `<div class="fab-reveal__name">${rec.name}</div>` +
                `<div class="fab-reveal__klass">${rec.klass}${result.objectiveHit ? ' · OBJECTIVE FABRICATED' : result.duplicate ? ' · ALREADY OWNED' : ' · SCHEMATIC UNLOCKED'}${result.broken ? ' · FABRICATOR BROKE' : ''}</div>`;
        }
        window.AudioManager?.playProceduralLoot?.('weapon', r.toLowerCase());
        if (result.objectiveHit) showBiomePrompt(`> FABRICATOR: ${rec.name} OBJECTIVE PRINT COMPLETE.`);
        if (result.broken) {
            showBiomePrompt('> FABRICATOR: PRINT HEAD FAILURE. PARTIAL REFUND ISSUED. FOLLOW NEW SIGNAL.');
            window.game?.revealFoundry?.({ randomEdge: true });
        }
        fabRollSpinning = false;
        renderFabricationModal();
    }, 3300);
}

document.getElementById('fab-roll-btn')?.addEventListener('click', runFabricatorRoll);

function openFabricationModal() {
    fabricator.tickPrints();
    renderFabricationModal();
    const modal = document.getElementById('fabrication-modal');
    if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false'); }
    if (FAB_RECIPES.some((r) => fabricator.isPrinting(r.id))) startFabTicker();
}
function closeFabricationModal() {
    const modal = document.getElementById('fabrication-modal');
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
    stopFabTicker();
}

function refreshFabAccess() {
    const btn = document.getElementById('fabrication-btn');
    if (!btn) return;
    document.getElementById('fabrication-command')?.classList.add('hidden');
    btn.textContent = bankManager.isFoundryActivated() ? '◇ FAB BAY' : '◇ ACTIVATE FAB';
    updateMenuCommandStatuses();
}

document.getElementById('fabrication-btn')?.addEventListener('click', openFabricationModal);
document.getElementById('close-fabrication-modal')?.addEventListener('click', closeFabricationModal);
setupClickOutside('fabrication-modal', closeFabricationModal);
window.addEventListener('o2-generator-upgraded', refreshFabAccess);
refreshFabAccess();

// Base death-thread banner (doc 11 §4.D): show a prior contractor's black box at
// the menu, and clear it once recovered in-run.
refreshLastContractor();
window.addEventListener('black-box-recovered', refreshLastContractor);

// ── Codex (doc 11 §3.2): discover-by-encounter meta layer ─────
function discoverCodex(id) {
    if (!id || !getCodexEntry(id)) return;
    const isNew = codexStore.record(id);
    if (isNew) {
        const entry = getCodexEntry(id);
        showBiomePrompt(`> CODEX UPDATED: ${entry.name}`);
        AudioManager?.play?.('ui_scan_ping', { volume: 0.34, playbackRate: 1.25 });
    }
    updateMenuCommandStatuses();
    if (!document.getElementById('codex-modal')?.classList.contains('hidden')) renderCodexModal();
}
// Map existing runtime signals onto codex ids.
window.addEventListener('enemy-killed', (e) => discoverCodex(e?.detail?.type));
window.addEventListener('milestone-boss-spawned', (e) => discoverCodex(e?.detail?.type));
window.addEventListener('lore-terminal-read', () => discoverCodex('lore_terminal'));
window.addEventListener('o2-bubble-activated', () => discoverCodex('o2_generator'));
window.addEventListener('foundry-discovered', () => {
    discoverCodex('foundry');
    fabricator.resetSiteUses();
    renderFabricationModal();
});
window.addEventListener('black-box-recovered', () => discoverCodex('black_box'));
window.addEventListener('elevator-sequence-started', () => discoverCodex('elevator_down'));
window.addEventListener('codex-discover', (e) => discoverCodex(e?.detail?.id));

function renderCodexModal() {
    const grid = document.getElementById('codex-grid');
    const summary = document.getElementById('codex-summary');
    if (!grid) return;
    if (summary) summary.textContent = `ENTRIES RECOVERED: ${codexStore.getDiscoveredCount()} / ${CODEX_TOTAL}`;
    grid.innerHTML = '';
    for (const category of CODEX_CATEGORIES) {
        const section = document.createElement('div');
        section.className = 'codex-section';
        const label = document.createElement('div');
        label.className = 'codex-section-label';
        label.textContent = category;
        section.appendChild(label);
        for (const entry of CODEX_ENTRIES.filter((x) => x.category === category)) {
            const known = codexStore.has(entry.id);
            const card = document.createElement('div');
            card.className = `codex-card${known ? '' : ' codex-card--locked'}`;
            card.innerHTML = known
                ? `<div class="codex-card__name">${entry.name}</div><div class="codex-card__blurb">${entry.blurb}</div>`
                : `<div class="codex-card__name">??? — UNCATALOGUED</div><div class="codex-card__blurb">Encounter this in the field to recover its record.</div>`;
            section.appendChild(card);
        }
        grid.appendChild(section);
    }
}
function openCodexModal() {
    renderCodexModal();
    const modal = document.getElementById('codex-modal');
    if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false'); }
}
function closeCodexModal() {
    const modal = document.getElementById('codex-modal');
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
}
document.getElementById('codex-btn')?.addEventListener('click', openCodexModal);
document.getElementById('close-codex-modal')?.addEventListener('click', closeCodexModal);
setupClickOutside('codex-modal', closeCodexModal);

// In-world Foundry (Beat 4): reaching the powered structure opens the Bay.
window.addEventListener('open-fabrication-bay', openFabricationModal);
window.addEventListener('o2-bubble-activated', (event) => {
    if ((event?.detail?.level ?? 0) !== 1) return;
    showTacticalOverlay({
        title: 'O₂ FIELD ONLINE',
        status: '> REPAIR SEQUENCE COMPLETE<br>> INITIALIZING SYSTEM REBOOT',
        progress: 100,
        duration: 2200
    });
});
window.addEventListener('milestone-boss-warning', () => {
    showBiomePrompt('> ALERT: PERIMETER BREACH — LARGE HOSTILE SIGNATURE CLOSING <');
});
window.addEventListener('foundry-discovered', (event) => {
    if (!isGameplayPhase()) return;
    const distance = event?.detail?.distance;
    const rangeText = Number.isFinite(distance) ? ` // ${distance}u` : '';
    showTacticalOverlay({
        title: 'FABRICATOR SIGNAL FOUND',
        status: `> FABRICATION FOUNDRY BROADCAST LOCKED${rangeText}<br>> FOLLOW THE FIELD COMPASS`,
        progress: 100,
        duration: 2600,
        speaker: 'ENGINEER OPERATOR',
        avatar: '/lore_portraits/survivor_03.webp'
    });
});
window.addEventListener('foundry-prompt-nearby', () => {
    if (!isGameplayPhase()) return;
    const prompt = document.getElementById('foundry-hud-prompt');
    const key = prompt?.querySelector('.prompt-key');
    const text = prompt?.querySelector('.prompt-text');
    const touchPrompt = isTouchDevice();
    if (key) {
        key.textContent = touchPrompt ? 'TAP' : 'PRESS E';
        key.classList.toggle('prompt-key--tap', touchPrompt);
    }
    if (text) {
        // Act 2 dish phase hijacks the foundry interaction entirely.
        text.textContent = (isAct2RunActive() && act2Manager.getPhase() === 'dish')
            ? 'GROW THE SIGNAL DISH'
            : (bankManager.isFoundryActivated() ? 'OPEN FAB BAY' : 'ACTIVATE FAB BAY');
    }
    prompt?.classList.remove('hidden');
});
window.addEventListener('foundry-prompt-clear', () => {
    const prompt = document.getElementById('foundry-hud-prompt');
    prompt?.classList.add('hidden');
    prompt?.classList.remove('visible');
});

// ── Act 1 finale: cave entrance + infection reveal (Sprint 18 §5–§6) ──
// The cave reuses the foundry HUD prompt element (they are never active at the
// same time — the cave only appears after the full rebuild ladder).
window.addEventListener('cave-prompt-nearby', () => {
    if (!isGameplayPhase()) return;
    const prompt = document.getElementById('foundry-hud-prompt');
    const key = prompt?.querySelector('.prompt-key');
    const text = prompt?.querySelector('.prompt-text');
    const touchPrompt = isTouchDevice();
    if (key) {
        key.textContent = touchPrompt ? 'TAP' : 'PRESS E';
        key.classList.toggle('prompt-key--tap', touchPrompt);
    }
    if (text) text.textContent = 'RECOVER FINAL COMPONENT';
    prompt?.classList.remove('hidden');
});
window.addEventListener('cave-prompt-clear', () => {
    const prompt = document.getElementById('foundry-hud-prompt');
    prompt?.classList.add('hidden');
    prompt?.classList.remove('visible');
});

window.addEventListener('cave-entrance-revealed', (event) => {
    if (!isGameplayPhase() || event?.detail?.instant) return;
    const distance = event?.detail?.distance;
    const rangeText = Number.isFinite(distance) ? ` // ${distance}u` : '';
    showTacticalOverlay({
        title: 'FINAL COMPONENT LOCATED',
        status: `> DEEP STRUCTURE SIGNAL LOCKED${rangeText}<br>> FOLLOW THE FIELD COMPASS`,
        progress: 100,
        duration: 3200
    });
    AudioManager.play('ui_scan_ping', { volume: 0.5, playbackRate: 0.6 });
});

let caveRevealController = null;

function startCaveRevealSequence() {
    if (!ARC_PRELUDE_ENABLED || !arcManager) return;
    ensureMissionManagers();
    if (!caveRevealController) {
        caveRevealController = new CaveRevealController({
            arcManager,
            dialogueManager,
            audioManager: AudioManager,
            setCinematicLock: (locked) => window.game?.setCinematicLock?.(locked),
            setObjectiveText: (text) => {
                window.dispatchEvent(new CustomEvent('loop-step-changed', {
                    detail: { key: 'queen', label: text }
                }));
            },
            triggerFade: (onClosed) => new Promise((resolve) => {
                triggerDoorTransition(
                    async () => { await onClosed?.(); },
                    () => resolve(),
                    'lose',
                    { waitForClosedWork: true, openingHoldMs: 420 }
                );
            }),
            returnToTitle: handleCaveRevealBecomeInfected
        });
    }
    if (!caveRevealController.canStart()) return;

    const stats = window.game?.getRunStats?.() ?? {};
    // The cave scene video (public/cutscenes/cave-reveal.webm) plays first,
    // under cinematic lock; the controller then owns the text/blackout beats.
    void (async () => {
        window.game?.setCinematicLock?.(true);
        await playCutsceneVideo('cave-reveal');
        await caveRevealController.start({
            classType: window.game?.playerType ?? getSelectedHeroType(),
            ...stats
        });
    })();
}

window.addEventListener('cave-entrance-interact', () => {
    startCaveRevealSequence();
});

// The reveal no longer kicks the player to the menu: you wake as the carrier
// at the cave mouth and walk back out into a world that now answers to the
// queen. The title corruption still lands for whenever they next see the menu.
async function handleCaveRevealBecomeInfected() {
    applyCorruptedTitlePresentation({ sting: true });
    const game = window.game;
    ensureMissionManagers();
    if (act2Manager && !act2Manager.getState().begun) {
        act2Manager.begin();
    }
    const infected = act2Manager?.getState?.();
    if (infected) {
        window.dispatchEvent(new CustomEvent('player-humanity-changed', {
            detail: { humanity: infected.humanity, stage: infected.infectionStage }
        }));
    }
    await dialogueManager?.openBriefTransmission({
        playerType: game?.playerType ?? getSelectedHeroType(),
        lines: [...ACT2_LINES.intro]
    });
    game?.setInputEnabled?.(true);
    showBiomePrompt('NEW INSTINCT ACTIVE — SEVER THE MOTHERSHIP UPLINK AT YOUR WRECK.');
}

// ── Act 2: the PregAlien loop (src/act2.js) ──────────────────────────
// Camps reuse the foundry HUD prompt element, same as the cave — Act 2 camps
// never coexist with an active fab-bay prompt.
window.addEventListener('camp-prompt-nearby', (event) => {
    if (!isGameplayPhase()) return;
    const prompt = document.getElementById('foundry-hud-prompt');
    const key = prompt?.querySelector('.prompt-key');
    const text = prompt?.querySelector('.prompt-text');
    const touchPrompt = isTouchDevice();
    if (key) {
        key.textContent = touchPrompt ? 'TAP' : 'PRESS E';
        key.classList.toggle('prompt-key--tap', touchPrompt);
    }
    if (text) text.textContent = event?.detail?.label ?? 'INTERACT';
    prompt?.classList.remove('hidden');
});
window.addEventListener('camp-prompt-clear', () => {
    const prompt = document.getElementById('foundry-hud-prompt');
    prompt?.classList.add('hidden');
    prompt?.classList.remove('visible');
});

const ACT2_ENDING_TITLES = Object.freeze({
    full_brood: 'FULL BROOD',
    clean_escape: 'CLEAN ESCAPE',
    mixed_crew: 'MIXED CREW',
    carriers_bargain: 'CARRIERS BARGAIN',
    scorched_sky: 'SCORCHED SKY',
    mothership_infection: 'MOTHERSHIP INFECTION',
    alien_exodus: 'ALIEN EXODUS',
    outed_escape: 'OUTED ESCAPE',
    failed_carrier: 'FAILED CARRIER',
    empty_husk: 'EMPTY HUSK'
});

function formatStoryToken(value = '') {
    return String(value || 'unknown').replace(/_/g, ' ').toUpperCase();
}

function setCampChoiceOpen(open) {
    if (!campChoiceModal) return;
    campChoiceModal.classList.toggle('hidden', !open);
    campChoiceModal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
        window.game?.setInputEnabled?.(false);
    } else if (isGameplayPhase()) {
        window.game?.setInputEnabled?.(true);
    }
}

function closeCampChoiceModal() {
    setCampChoiceOpen(false);
}

function renderCampChoice(detail = {}) {
    if (!campChoiceModal || !campChoiceOptions) return;
    const camp = detail.campState ?? {};
    const leaderLine = detail.leaderName
        ? `${detail.leaderName} // ${detail.leaderClass ?? 'SURVIVOR'}${detail.leaderIsBoss ? ' // INVERTED COMMAND' : ''}`
        : 'SURVIVOR COMMAND';
    if (campChoiceKicker) {
        campChoiceKicker.textContent = `CONTACT ${detail.storyOrder ?? '?'} // ${leaderLine}`;
    }
    if (campChoiceTitle) {
        campChoiceTitle.textContent = detail.campLabel ?? 'CAMP DECISION';
    }
    const ending = detail.endingVector?.ending;
    if (campChoiceStatus) {
        const stats = [
            ['status', formatStoryToken(camp.status)],
            ['level', `LVL ${camp.level ?? 0}`],
            ['bond', `${camp.bond ?? 0}/5`],
            ['vector', ACT2_ENDING_TITLES[ending] ?? formatStoryToken(ending)]
        ];
        campChoiceStatus.innerHTML = stats.map(([label, value]) => `
            <div class="camp-choice-stat">
                <span class="camp-choice-stat__label">${label}</span>
                <span class="camp-choice-stat__value">${value}</span>
            </div>
        `).join('');
    }
    if (campChoiceCopy) {
        const title = detail.leaderTitle ? `${detail.leaderTitle}. ` : '';
        const callsign = detail.leaderCallsign ? `Callsign ${detail.leaderCallsign}. ` : '';
        campChoiceCopy.textContent = `${title}${callsign}Your next action changes the launch manifest and the ending vector.`;
    }
    campChoiceOptions.innerHTML = '';
    for (const option of detail.options ?? []) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `camp-choice-option camp-choice-option--${option.action ?? 'noop'}`;
        btn.disabled = Boolean(option.disabled) || option.action === 'noop';
        btn.innerHTML = `
            <span class="camp-choice-option__label">${option.label ?? 'OPTION'}</span>
            <span class="camp-choice-option__desc">${option.desc ?? ''}</span>
        `;
        btn.addEventListener('click', () => {
            window.AudioManager?.play?.('ui_click', { volume: 0.45 });
            window.game?.resolveCampChoice?.(option.action, {
                ...option,
                campId: detail.campId
            });
            closeCampChoiceModal();
        });
        campChoiceOptions.appendChild(btn);
    }
    setCampChoiceOpen(true);
}

campChoiceCloseBtn?.addEventListener('click', () => {
    window.AudioManager?.play?.('ui_click', { volume: 0.35 });
    closeCampChoiceModal();
});

window.addEventListener('camp-choice-open', (event) => {
    renderCampChoice(event?.detail ?? {});
});

// Act 1 camp support + the Act 2 payoff (defended culls).
window.addEventListener('camp-supported', (event) => {
    const { campLabel, level, bond } = event?.detail ?? {};
    showBiomePrompt(`SYSTEM: ${campLabel ?? 'CAMP'} REINFORCED TO LEVEL ${level ?? '?'}. TRUST ${bond ?? 0}/5. SURVIVORS SHARE O₂ AND SUPPLIES.`);
});
window.addEventListener('camp-bonded', (event) => {
    const { campLabel, bond } = event?.detail ?? {};
    showBiomePrompt(`SYSTEM: ${campLabel ?? 'CAMP'} FAVOR COMPLETE. TRUST ${bond ?? 0}/5.`);
});
window.addEventListener('camp-support-denied', (event) => {
    const cost = event?.detail?.cost;
    showBiomePrompt(`SYSTEM: INSUFFICIENT SHELLS FOR CAMP SUPPORT${Number.isFinite(cost) ? ` — ${cost} REQUIRED` : ''}.`);
});
let lastTurretZapPromptAt = 0;
window.addEventListener('camp-turret-zap', (event) => {
    const now = Date.now();
    if (now - lastTurretZapPromptAt < 6000) return; // don't spam the radio
    lastTurretZapPromptAt = now;
    const { campLabel } = event?.detail ?? {};
    showBiomePrompt(`WARNING: ${campLabel ?? 'CAMP'} DEFENSE GRID FIRING — SPOOF IT, SMASH IT, OR STAY CLEAR.`);
});
window.addEventListener('camp-turret-resolved', (event) => {
    const { campLabel, mode, suspicion } = event?.detail ?? {};
    showBiomePrompt(mode === 'disabled'
        ? `SYSTEM: TURRET IFF SPOOFED — ${campLabel ?? 'CAMP'} GRID READS YOU AS FRIENDLY.`
        : `ALERT: TURRET DESTROYED. ${campLabel ?? 'CAMP'} HEARD THAT — SUSPICION ${suspicion ?? '?'}%.`);
});

window.addEventListener('camp-defense-triggered', (event) => {
    const { campLabel } = event?.detail ?? {};
    showBiomePrompt(`WARNING: ${campLabel ?? 'CAMP'} DEFENSE GRID ONLINE — THE GUNS YOU FUNDED ANSWER TO THEM.`);
});
// ── Humanity / cover HUD + hive feedback (post-reveal) ──
const coverRow = document.getElementById('vitals-cover-row');
const coverBar = document.getElementById('vitals-cover-bar');
const coverPct = document.getElementById('vitals-cover-pct');

function renderCoverBar(humanity = 100, stage = 'latent') {
    if (!coverRow) return;
    coverRow.classList.remove('hidden');
    const pct = Math.max(0, Math.min(100, Math.round(humanity)));
    if (coverBar) {
        coverBar.style.width = `${pct}%`;
        coverBar.dataset.stage = stage;
    }
    if (coverPct) coverPct.textContent = `${pct}%`;
}

window.addEventListener('player-humanity-changed', (event) => {
    const { humanity, stage } = event?.detail ?? {};
    renderCoverBar(humanity, stage);
    if (stage === 'symptomatic' && humanity === 50) {
        showBiomePrompt('WARNING: COVER DEGRADING — HUMANS WILL NOTICE THE TELLS.');
    }
});

window.addEventListener('player-suspicion-changed', (event) => {
    const { campLabel, suspicion } = event?.detail ?? {};
    if (suspicion === 50 || suspicion === 80) {
        showBiomePrompt(`CAUTION: ${campLabel ?? 'CAMP'} IS WATCHING YOU — SUSPICION ${suspicion}%.`);
    }
});

window.addEventListener('player-outed', (event) => {
    const { campLabel, spread } = event?.detail ?? {};
    const spreadText = (spread?.length ?? 0) > 1 ? ' THE RELAY IS CARRYING IT.' : '';
    showBiomePrompt(`ALERT: ${campLabel ?? 'A CAMP'} KNOWS WHAT YOU ARE.${spreadText}`);
    AudioManager.play('ui_error', { volume: 0.5, playbackRate: 0.5 });
});

window.addEventListener('leader-dialogue', (event) => {
    const { lines, beatType } = event?.detail ?? {};
    if (!lines?.length) return;
    ensureMissionManagers();
    void dialogueManager?.openBriefTransmission({
        playerType: window.game?.playerType ?? getSelectedHeroType(),
        lines: [...lines]
    });
    if (beatType === 'advance') {
        window.AudioManager?.play?.('ui_scan_ping', { volume: 0.4, playbackRate: 0.9 });
    }
});

window.addEventListener('camp-final-resolved', (event) => {
    const { campLabel, mode, humanity, obedience } = event?.detail ?? {};
    showBiomePrompt(mode === 'urge'
        ? `SYSTEM: FINAL VIGIL STOOD AT ${campLabel ?? 'CAMP'} — THE URGE COST YOU. HUMANITY ${humanity ?? '?'}.`
        : `SYSTEM: YOU DEFIED HER FOR ${campLabel ?? 'CAMP'} — THEY KNOW, AND STAND WITH YOU. OBEDIENCE ${obedience ?? '?'}.`);
});
window.addEventListener('camp-final-denied', (event) => {
    const { humanity } = event?.detail ?? {};
    showBiomePrompt(`WARNING: THE URGE IS TOO STRONG (HUMANITY ${humanity ?? '?'}). RESTORE YOUR COVER OR DEFY HER OPENLY.`);
});
let lastQueenDispleasedAt = 0;
window.addEventListener('queen-displeased', (event) => {
    const now = Date.now();
    if (now - lastQueenDispleasedAt < 8000) return;
    lastQueenDispleasedAt = now;
    const { obedience } = event?.detail ?? {};
    showBiomePrompt(`QUEEN: THAT ONE WAS MINE, CARRIER. (OBEDIENCE ${obedience ?? '?'})`);
    AudioManager.play('ui_error', { volume: 0.4, playbackRate: 0.5 });
});

window.addEventListener('boarding-blocked', (event) => {
    const { reasons, seatsUsed, seatsMax } = event?.detail ?? {};
    const why = (reasons ?? [])
        .map((r) => r === 'seat_capacity_exceeded' ? `OVER CAPACITY (${seatsUsed}/${seatsMax} SEATS)` : r === 'egg_unstable' ? 'EGG NEEDS THE QUEEN OR NAHL ABOARD' : String(r).toUpperCase())
        .join(' — ');
    showBiomePrompt(`LAUNCH ABORTED: ${why || 'INVALID MANIFEST'}.`);
});

window.addEventListener('hive-mined', (event) => {
    const { hiveLabel, extractionLevel, wounded } = event?.detail ?? {};
    showBiomePrompt(wounded
        ? `SYSTEM: ${hiveLabel ?? 'HIVE'} HARVEST ${extractionLevel}/3. SOMETHING INSIDE STOPPED MOVING.`
        : `SYSTEM: ${hiveLabel ?? 'HIVE'} HARVEST ${extractionLevel}/3 — RESOURCES BANKED.`);
});

window.addEventListener('hive-harvest-denied', (event) => {
    const { hiveLabel } = event?.detail ?? {};
    showBiomePrompt(`SYSTEM: ${hiveLabel ?? 'HIVE'} ALREADY HARVESTED TODAY — RETURN AFTER THE REAL-WORLD DAILY RESET.`);
    AudioManager.play('ui_error', { volume: 0.35, playbackRate: 0.65 });
});

window.addEventListener('hive-harvest-boss-spawned', (event) => {
    const { hiveLabel } = event?.detail ?? {};
    showBiomePrompt(`WARNING: ${hiveLabel ?? 'HIVE'} GUARDIAN AWAKENED — HARVEST CONTESTED.`);
});

window.addEventListener('hive-choice-resolved', (event) => {
    const { hiveLabel, action, status, bond } = event?.detail ?? {};
    showBiomePrompt(`SYSTEM: ${hiveLabel ?? 'HIVE'} ${formatStoryToken(action?.replace('hive-', ''))} — STATUS ${formatStoryToken(status)}, BOND ${bond ?? 0}/5.`);
});

window.addEventListener('camp-choice-resolved', (event) => {
    const { campLabel, action, status } = event?.detail ?? {};
    showBiomePrompt(`SYSTEM: ${campLabel ?? 'CAMP'} ${formatStoryToken(action)} COMPLETE. STATUS ${formatStoryToken(status)}.`);
});
window.addEventListener('camp-choice-denied', (event) => {
    const { action, requiredBond, bond, message } = event?.detail ?? {};
    if (message) {
        showBiomePrompt(message);
        return;
    }
    const bondText = Number.isFinite(requiredBond) ? ` TRUST ${bond ?? 0}/${requiredBond}` : '';
    showBiomePrompt(`SYSTEM: ${formatStoryToken(action)} UNAVAILABLE.${bondText}`);
});

// Every Act 2 milestone speaks through the brief-transmission panel using the
// copy defined next to the ladder in src/act2.js.
window.addEventListener('act2-milestone', (event) => {
    const lines = ACT2_LINES[event?.detail?.key];
    if (!lines?.length) return;
    ensureMissionManagers();
    void dialogueManager?.openBriefTransmission({
        playerType: window.game?.playerType ?? getSelectedHeroType(),
        lines: [...lines]
    });
});

window.addEventListener('act2-console-dead', () => {
    if (!isGameplayPhase()) return;
    showBiomePrompt('CONSOLE DEAD — UPLINK SEVERED');
    AudioManager.play('ui_error', { volume: 0.35, playbackRate: 0.6 });
});

// Boarding the vessel ends Act 2: queen sign-off, ACT III tease card, then
// back to the (corrupted) title. Act 3 itself is future-sprint scope.
window.addEventListener('act2-departed', (event) => {
    void runAct2DepartureSequence(event?.detail ?? {});
});

function showActThreeTeaseCard(ending = null) {
    return new Promise((resolve) => {
        const title = ACT2_ENDING_TITLES[ending] ?? 'ACT III';
        const kicker = ending ? 'ENDING VECTOR LOCKED' : 'THE VESSEL CLEARS THE ICE';
        const sub = ending ? 'SIGNAL RECORDED — TO BE CONTINUED' : 'IN TRANSIT — TO BE CONTINUED';
        const overlay = document.createElement('div');
        overlay.className = 'act3-tease-overlay';
        overlay.innerHTML = `
            <div class="act3-tease-card">
                <div class="act3-tease-kicker">${kicker}</div>
                <div class="act3-tease-title">${title}</div>
                <div class="act3-tease-sub">${sub}</div>
            </div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('is-open'));
        window.setTimeout(() => {
            overlay.classList.add('is-closing');
            window.setTimeout(() => {
                overlay.remove();
                resolve();
            }, 700);
        }, 4200);
    });
}

async function runAct2DepartureSequence(detail = {}) {
    ensureMissionManagers();
    const game = window.game;
    const vector = detail.endingVector ?? game?.act2?.getEndingVector?.() ?? act2Manager?.getEndingVector?.();
    const ending = vector?.ending ?? null;
    const videoBase = ACT2_ENDING_CUTSCENES[ending] ?? 'act3-departure';
    game?.setCinematicLock?.(true);
    AudioManager.play('door_gears_spin', { volume: 0.5, playbackRate: 0.7 });
    await dialogueManager?.openBriefTransmission({
        playerType: game?.playerType ?? getSelectedHeroType(),
        lines: [...getAct2EndingLines(ending)]
    });
    await playCutsceneVideo(videoBase);
    await showActThreeTeaseCard(ending);
    game?.setCinematicLock?.(false);
    returnToMainMenuFromRun({ doorKey: 'lose' });
}

// After the reveal, Hunker Bunker stops pretending: the title screen shows the
// game's true name. Applied on boot too so the corruption persists.
function applyCorruptedTitlePresentation({ sting = false } = {}) {
    if (!ARC_PRELUDE_ENABLED || !arcManager) return;
    if (arcManager.getState().arcState !== 'hive_awakened_tease') return;
    document.title = 'PREGALIEN | HIVE COMMAND';
    for (const el of [document.querySelector('.splash-title'), document.querySelector('.title-small')]) {
        if (!el) continue;
        el.textContent = 'PREGALIEN';
        el.classList.add('title-corrupted');
    }
    if (sting) {
        AudioManager.play?.('ui_error', { volume: 0.42, playbackRate: 0.5 });
        AudioManager.playProceduralBreathing?.({ volume: 0.05, duration: 3.2 });
    }
}

applyCorruptedTitlePresentation();

// ── Operator profile + portable save codes (no backend; doc 01.B.1) ──
const callsignInput = document.getElementById('operator-callsign');
if (callsignInput) {
    callsignInput.value = profile.getCallsign();
    const commitCallsign = () => { callsignInput.value = profile.setCallsign(callsignInput.value); };
    callsignInput.addEventListener('change', commitCallsign);
    callsignInput.addEventListener('blur', commitCallsign);
}

document.getElementById('export-save')?.addEventListener('click', async () => {
    const code = exportSaveCode();
    if (!code) {
        window.AudioManager?.play?.('ui_error', { volume: 0.5 });
        setSaveDataStatus('Unable to generate a save code.', 'error');
        return;
    }
    if (saveDataCode) {
        saveDataCode.value = code;
        saveDataCode.select();
    }
    let copied = false;
    try {
        await navigator.clipboard?.writeText(code);
        copied = true;
    } catch { /* clipboard blocked — fall back to manual copy */ }
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
    setSaveDataStatus(
        copied ? 'Save code copied to clipboard.' : 'Save code ready. Copy it from the field above.',
        'success'
    );
});

document.getElementById('import-save')?.addEventListener('click', () => {
    const code = saveDataCode?.value.trim();
    if (!code) {
        window.AudioManager?.play?.('ui_error', { volume: 0.5 });
        setSaveDataStatus('Paste a save code before importing.', 'error');
        saveDataCode?.focus();
        return;
    }
    const written = importSaveCode(code);
    if (written < 0) {
        window.AudioManager?.play?.('ui_error', { volume: 0.5 });
        setSaveDataStatus('That save code is not valid.', 'error');
        return;
    }
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
    setSaveDataStatus(`Restored ${written} save record(s). Reloading...`, 'success');
    window.setTimeout(() => window.location.reload(), 700);
});

// ── Operator roster / loadout console (doc 01.C) ──────────────
// Equip a fabricated weapon as the active sidearm; the choice surfaces on the
// in-game weapon panel and persists.
function syncEquippedWeaponLabel() {
    const titleEl = document.querySelector('#weapon-status-panel .weapon-status-panel__title');
    if (titleEl) titleEl.textContent = loadout.getEquippedLabel(fabricator);
}

function renderRosterModal() {
    const grid = document.getElementById('roster-weapon-grid');
    if (!grid) return;
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('roster-callsign', profile.getCallsign());
    setTxt('roster-id', profile.getProfileId());

    const weapons = FAB_RECIPES.filter((r) => r.klass === 'WEAPON');
    const fabbed = weapons.filter((r) => fabricator.isFabricated(r.id)).length;
    setTxt('roster-fab-count', `ARSENAL: ${fabbed} / ${weapons.length} WEAPONS FABRICATED`);

    const equippedId = loadout.getEquippedId();
    grid.innerHTML = '';
    for (const recipe of weapons) {
        const fabricated = fabricator.isFabricated(recipe.id);
        const equipped = fabricated && equippedId === recipe.id;

        const card = document.createElement('div');
        card.className = ['roster-weapon', fabricated ? '' : 'roster-weapon--locked', equipped ? 'roster-weapon--equipped' : ''].filter(Boolean).join(' ');

        const art = document.createElement('div');
        art.className = 'roster-weapon__art';
        const img = document.createElement('img');
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = recipe.name; img.src = recipe.art;
        img.addEventListener('error', () => { img.src = '/bunker_junk_rare.png'; }, { once: true });
        art.appendChild(img);
        card.appendChild(art);

        const name = document.createElement('div');
        name.className = 'roster-weapon__name';
        name.textContent = fabricated ? recipe.name : '???';
        card.appendChild(name);

        const btn = document.createElement('button');
        btn.className = 'roster-weapon__btn';
        if (!fabricated) {
            btn.textContent = 'NOT FABRICATED'; btn.disabled = true; btn.classList.add('roster-weapon__btn--locked');
        } else if (equipped) {
            btn.textContent = '✓ EQUIPPED'; btn.disabled = true; btn.classList.add('roster-weapon__btn--equipped');
        } else {
            btn.textContent = 'EQUIP';
            btn.addEventListener('click', () => {
                if (loadout.equip(recipe.id, fabricator)) {
                    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
                    syncEquippedWeaponLabel();
                    renderRosterModal();
                } else {
                    window.AudioManager?.play?.('ui_error', { volume: 0.5 });
                }
            });
        }
        card.appendChild(btn);
        grid.appendChild(card);
    }
}

document.getElementById('roster-btn')?.addEventListener('click', () => {
    renderRosterModal();
    const modal = document.getElementById('roster-modal');
    if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false'); }
});
document.getElementById('close-roster-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('roster-modal');
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
});
setupClickOutside('roster-modal', () => {
    const modal = document.getElementById('roster-modal');
    if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
});
// Reflect a previously-equipped weapon on the HUD as soon as the page loads,
// and keep it correct after a fresh fabrication completes.
syncEquippedWeaponLabel();
window.addEventListener('fabrication-complete', syncEquippedWeaponLabel);

setupClickOutside('settings-popup', () => {
    const settingsPopup = document.getElementById('settings-popup');
    if (settingsPopup) {
        settingsPopup.classList.add('hidden');
        draftAudioMix = cloneAudioMix(state.settings.audioMix);
        AudioManager.setMix(state.settings.audioMix);
        setAudioMixerOpen(false);
        setSaveDataOpen(false);
        setResetSaveConfirmOpen(false);
    }
});

setupClickOutside('save-data-popup', () => setSaveDataOpen(false));

setupClickOutside('reset-save-confirm-modal', () => setResetSaveConfirmOpen(false));

setupClickOutside('camp-choice-modal', closeCampChoiceModal);

setupClickOutside('confirm-modal', () => {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
});

setupClickOutside('console-terminal-modal', () => {
    window.game?.closeConsoleModal?.();
});

if (mainDebugToggle) {
    mainDebugToggle.addEventListener('change', (e) => {
        state.settings.debug = e.target.checked;
        setDebugMode(state.settings.debug);
        if (splashDebugToggle) splashDebugToggle.checked = state.settings.debug;
    });
}

if (mainNightVisionToggle) {
    mainNightVisionToggle.addEventListener('change', (e) => {
        state.settings.nightVision = e.target.checked;
        localStorage.setItem('hunker_nightvision_enabled', String(state.settings.nightVision));
        if (splashNightVisionToggle) splashNightVisionToggle.checked = state.settings.nightVision;
        if (window.game) {
            window.game.nightVision = state.settings.nightVision;
        }
    });
}

if (mainFsToggle) {
    mainFsToggle.addEventListener('change', (e) => {
        state.settings.fullscreen = e.target.checked;
        if (splashFsToggle) splashFsToggle.checked = state.settings.fullscreen;

        if (state.settings.fullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        }
    });
}

if (mainTouchToggle) {
    mainTouchToggle.addEventListener('change', (e) => {
        state.settings.touchControls = e.target.checked;
        e.target.checked = state.settings.touchControls;
        localStorage.setItem('hunker_touch_controls_enabled', String(state.settings.touchControls));
        syncTouchMoveControlVisibility();
    });
}

function getDoorImage(key) {
    const CLASS_DOORS = {
        'SCOUT': '/door_bio.png',
        'TANK': '/door_nuclear.png',
        'ENGINEER': '/door_cryo.png'
    };
    const SPECIAL_DOORS = {
        'base': '/door.webp',
        'win': '/door_alien.png',
        'lose': '/door_rust.png'
    };
    if (key === 'win') return SPECIAL_DOORS.win;
    if (key === 'lose') return SPECIAL_DOORS.lose;
    if (key === 'base') return SPECIAL_DOORS.base;
    if (CLASS_DOORS[key]) return CLASS_DOORS[key];
    
    // Automatically determine door image based on active/preview class
    const activeClass = window.game?.playerType || activePreviewType || 'SCOUT';
    return CLASS_DOORS[activeClass] || SPECIAL_DOORS.base;
}

function triggerDoorTransition(onClosed, onOpened, doorKey, options = {}) {
    const {
        waitForClosedWork = false,
        openingHoldMs = 300
    } = options;
    const overlay = transitionOverlay || document.getElementById('transition-overlay');
    if (!overlay) {
        if (onClosed) void onClosed();
        if (onOpened) onOpened();
        return;
    }

    const doorImg = getDoorImage(doorKey);
    overlay.style.setProperty('--door-bg-image', `url('${doorImg}')`);

    // 1. Prepare for vertical close
    overlay.classList.add('visible');
    overlay.classList.add('closing-v');
    AudioManager.play('ui_boot1', { volume: 0.5 });

    // Force reflow
    void overlay.offsetWidth;

    // 2. Start closing
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        AudioManager.play('door_slam_vertical', { volume: 0.4 });
        AudioManager.play('door_gears_spin', { volume: 0.25 });
    });

    // 3. Once closed, swap content and prepare horizontal open
    setTimeout(() => {
        spawnSmoke(0, 0, 30, true); // Slam smoke
        const closedWork = onClosed ? onClosed() : null;

        const openDoors = () => {
            // Swap classes
            overlay.classList.remove('closing-v', 'active');
            overlay.classList.add('opening-h');

            // Force reflow
            void overlay.offsetWidth;

            // 4. Start opening after a small "hold" gap
            setTimeout(() => {
                spawnSmoke(0, 0, 30, false); // Separation smoke
                overlay.classList.add('active');
                AudioManager.play('door_slide_horiz', { volume: 0.4 });
                AudioManager.play('door_gears_spin', { volume: 0.25 });
                if (onOpened) onOpened();
            }, openingHoldMs);

            // 5. Cleanup
            setTimeout(() => {
                overlay.classList.remove('visible', 'opening-h', 'active');
            }, openingHoldMs + 900);
        };

        if (waitForClosedWork) {
            Promise.resolve(closedWork).then(openDoors).catch((error) => {
                console.error('Door transition closed-state work failed:', error);
                openDoors();
            });
        } else {
            openDoors();
        }
    }, 900);
}

function spawnSmoke(x, y, count, isVertical = true) {
    const overlay = document.getElementById('transition-overlay');
    if (!overlay) return;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'smoke-particle';

        // Randomize size
        const size = 20 + Math.random() * 40;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;

        // Randomize position along the seam
        if (isVertical) {
            // Horizontal seam across the middle
            p.style.left = `${Math.random() * 100}%`;
            p.style.top = `calc(50% - ${size / 2}px)`;
            p.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
            p.style.setProperty('--dy', `${(Math.random() - 0.5) * 50}px`);
        } else {
            // Vertical seam down the middle
            p.style.top = `${Math.random() * 100}%`;
            p.style.left = `calc(50% - ${size / 2}px)`;
            p.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
            p.style.setProperty('--dy', `${(Math.random() - 0.5) * 100}px`);
        }

        overlay.appendChild(p);
        setTimeout(() => p.remove(), 1500);
    }
}

// Character Selection Logic
const charCards = document.querySelectorAll('.char-card');
const previewSprite = document.getElementById('char-preview-sprite');
const previewDoor = document.getElementById('char-preview-door');
const previewName = document.getElementById('char-preview-name');
const previewSpriteContext = previewSprite?.getContext('2d', { willReadFrequently: true }) ?? null;
const PREVIEW_SPRITE_COLUMNS = 4;
const PREVIEW_SPRITE_ROWS = 4;
const PREVIEW_WALK_FRAME_COUNT = 2;
const PREVIEW_FRAME_MS = 140;
const PREVIEW_FRONT_ROW = 3;
const PREVIEW_FRONT_BASE_COLUMN = 0;
const PREVIEW_DOOR_CLOSE_MS = 360;
const PREVIEW_DOOR_HOLD_MS = 220;
const PREVIEW_DOOR_OPEN_MS = 520;
let previewFrameIndex = 0;
let previewAnimationTimer = null;
let previewDoorTimer = null;
let pendingPreviewType = null;
let activePreviewType = 'TANK';
const previewSpriteImages = new Map();

const heroData = {
    'SCOUT': { name: 'SCOUT', sprite: '/Scout.full.jpeg' },
    'TANK': { name: 'TANK', sprite: '/Tank.full.jpeg' },
    'ENGINEER': { name: 'ENGINEER', sprite: '/Eng.Full.jpeg' }
};

function getPreviewSpriteImage(path) {
    if (!path) return Promise.resolve(null);

    const cached = previewSpriteImages.get(path);
    if (cached) {
        return cached instanceof Promise ? cached : Promise.resolve(cached);
    }

    const imagePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // Remove chroma green border/background pixels
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                if (a > 0) {
                    if (r < 140 && b < 140 && g > 90 && g > r * 1.4 && g > b * 1.4) {
                        data[i + 3] = 0; // Make transparent
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);

            previewSpriteImages.set(path, canvas);
            resolve(canvas);
        };
        image.onerror = reject;
        image.src = path;
    });

    previewSpriteImages.set(path, imagePromise);
    return imagePromise;
}

async function renderPreviewFrame(type, frameIndex = previewFrameIndex) {
    const data = heroData[type];
    if (!data || !previewSprite || !previewSpriteContext) return;

    const image = await getPreviewSpriteImage(data.sprite).catch(() => null);
    if (!image || !heroData[type] || heroData[type].sprite !== data.sprite) return;

    const frameWidth = Math.floor(image.width / PREVIEW_SPRITE_COLUMNS);
    const frameHeight = Math.floor(image.height / PREVIEW_SPRITE_ROWS);
    const walkFrame = ((frameIndex % PREVIEW_WALK_FRAME_COUNT) + PREVIEW_WALK_FRAME_COUNT) % PREVIEW_WALK_FRAME_COUNT;
    const sourceX = (PREVIEW_FRONT_BASE_COLUMN + walkFrame) * frameWidth;
    const sourceY = PREVIEW_FRONT_ROW * frameHeight;

    if (previewSprite.width !== frameWidth || previewSprite.height !== frameHeight) {
        previewSprite.width = frameWidth;
        previewSprite.height = frameHeight;
    }

    previewSpriteContext.clearRect(0, 0, frameWidth, frameHeight);
    previewSpriteContext.imageSmoothingEnabled = false;
    previewSpriteContext.drawImage(
        image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight
    );

}

function syncHeroPreview(type) {
    const data = heroData[type];
    if (!data) return;

    activePreviewType = type;
    if (previewName) previewName.textContent = data.name;
    previewFrameIndex = 0;
    void renderPreviewFrame(type, previewFrameIndex);

    // Update custom properties on preview stage wrapper for matching class glow colors
    const stage = document.querySelector('.char-preview-stage');
    if (stage) {
        const glowColors = {
            'SCOUT': {
                border: 'rgba(125, 255, 90, 0.28)',
                bg: 'rgba(125, 255, 90, 0.16)',
                shadow: 'rgba(125, 255, 90, 0.18)',
                spriteGlow: 'rgba(125, 255, 90, 0.25)',
                spriteGlowUnder: 'rgba(125, 255, 90, 0.38)'
            },
            'TANK': {
                border: 'rgba(255, 183, 0, 0.28)',
                bg: 'rgba(255, 183, 0, 0.16)',
                shadow: 'rgba(255, 183, 0, 0.18)',
                spriteGlow: 'rgba(255, 183, 0, 0.25)',
                spriteGlowUnder: 'rgba(255, 183, 0, 0.38)'
            },
            'ENGINEER': {
                border: 'rgba(0, 229, 255, 0.28)',
                bg: 'rgba(0, 229, 255, 0.16)',
                shadow: 'rgba(0, 229, 255, 0.18)',
                spriteGlow: 'rgba(0, 229, 255, 0.25)',
                spriteGlowUnder: 'rgba(0, 229, 255, 0.38)'
            }
        };
        const colors = glowColors[type] || glowColors['SCOUT'];
        stage.style.setProperty('--preview-glow-border', colors.border);
        stage.style.setProperty('--preview-glow-bg', colors.bg);
        stage.style.setProperty('--preview-glow-shadow', colors.shadow);
        stage.style.setProperty('--sprite-glow', colors.spriteGlow);
        stage.style.setProperty('--sprite-glow-under', colors.spriteGlowUnder);
    }
}

function startHeroPreviewAnimation() {
    if (!previewSprite || previewAnimationTimer !== null) return;

    previewAnimationTimer = window.setInterval(() => {
        previewFrameIndex = (previewFrameIndex + 1) % PREVIEW_WALK_FRAME_COUNT;
        void renderPreviewFrame(activePreviewType, previewFrameIndex);
    }, PREVIEW_FRAME_MS);
}

function triggerHeroPreviewSwap(type) {
    if (!heroData[type]) return;

    if (!previewDoor) {
        syncHeroPreview(type);
        return;
    }

    pendingPreviewType = type;

    if (previewDoorTimer !== null) {
        return;
    }

    const targetType = pendingPreviewType;
    const doorImg = getDoorImage(targetType);
    previewDoor.style.setProperty('--door-bg-image', `url('${doorImg}')`);

    previewDoor.classList.remove('opening', 'ready-to-open');
    previewDoor.classList.add('active', 'closing');
    AudioManager.play('door_slam_vertical', { volume: 0.2 });
    AudioManager.play('door_gears_spin', { volume: 0.12 });

    previewDoorTimer = window.setTimeout(() => {
        syncHeroPreview(targetType);
        previewDoor.classList.remove('closing');
        previewDoor.classList.add('ready-to-open');

        window.setTimeout(() => {
            void previewDoor.offsetWidth;
            previewDoor.classList.remove('ready-to-open');
            previewDoor.classList.add('opening');
            AudioManager.play('door_slide_horiz', { volume: 0.18 });
            AudioManager.play('door_gears_spin', { volume: 0.1 });
        }, PREVIEW_DOOR_HOLD_MS);

        previewDoorTimer = window.setTimeout(() => {
            previewDoor.classList.remove('active', 'opening', 'ready-to-open');
            previewDoorTimer = null;

            if (pendingPreviewType !== targetType) {
                const queuedType = pendingPreviewType;
                pendingPreviewType = null;
                triggerHeroPreviewSwap(queuedType);
                return;
            }

            pendingPreviewType = null;
        }, PREVIEW_DOOR_HOLD_MS + PREVIEW_DOOR_OPEN_MS);
    }, PREVIEW_DOOR_CLOSE_MS);
}

function spawnSectorScanSmoke(container, count = 15) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'smoke-particle';
        const size = 40 + Math.random() * 60;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `calc(50% - ${size / 2}px)`;
        p.style.top = `calc(50% - ${size / 2}px)`;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 80;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 20;
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        p.style.animationDuration = `${0.6 + Math.random() * 0.4}s`;
        p.style.zIndex = '100';
        container.appendChild(p);
        setTimeout(() => p.remove(), 1200);
    }
}

charCards.forEach(card => {
    card.addEventListener('click', () => {
        AudioManager.play('ui_click', { volume: 0.6 });
        // Remove selected from others
        charCards.forEach(c => c.classList.remove('selected'));
        // Add to clicked
        card.classList.add('selected');

        // Update Preview
        const type = card.getAttribute('data-type');
        if (heroData[type]) {
            warmClassIntroMedia(type);
            triggerHeroPreviewSwap(type);
            updateHeroStats(type);
            setActiveAmmoCapacity(type, { clampExisting: true });

            if (window.game?.updatePlayerType) {
                // Play swap sound and 2D DOM smoke poof in the demo container
                const gameContainer = document.getElementById('game-container');
                if (gameContainer) {
                    spawnSectorScanSmoke(gameContainer, 25);
                }
                AudioManager.play('amb_metal_stress1', { volume: 0.4 });

                if (!isGameplayPhase()) {
                    hideAllGameplayPrompts();
                    hideRunLoadingScreen();
                    setTimeout(() => {
                        window.game.updatePlayerType(type, { poof: true, emitWorldEvents: false });
                        AudioManager.play('class_lock', { volume: 0.5 });
                    }, 150);
                    return;
                }

                setTimeout(() => {
                    window.game.updatePlayerType(type, { poof: true, emitWorldEvents: true });
                    AudioManager.play('class_lock', { volume: 0.5 });
                }, 150);
            }
        }
    });
});

// In-Universe Tactical Cursor and Hover React
function initTacticalCursor() {
    const cursor = document.createElement('div');
    cursor.id = 'tactical-cursor';

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    cursor.appendChild(dot);

    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    cursor.appendChild(ring);

    ['tl', 'tr', 'bl', 'br'].forEach(dir => {
        const b = document.createElement('div');
        b.className = `cursor-bracket cursor-bracket-${dir}`;
        cursor.appendChild(b);
    });

    document.body.appendChild(cursor);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let targetScale = 1.0;
    let curScale = 1.0;
    const LERP_FACTOR = 0.15; // authentic retro mechanical delay
    let hasMoved = false;
    let touchFadeTimeout = null;

    let lastTouchTime = 0;
    const isInsideGameViewport = (clientX, clientY) => {
        const rect = gameViewport?.getBoundingClientRect();
        return !!rect
            && clientX >= rect.left
            && clientX <= rect.right
            && clientY >= rect.top
            && clientY <= rect.bottom;
    };

    window.addEventListener('mousemove', (e) => {
        // Ignore synthetic mousemove events triggered by touchscreen touch/taps
        if (Date.now() - lastTouchTime < 1000) return;

        // Ensure clientX and clientY are valid, finite numbers
        if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
        if (isNaN(e.clientX) || isNaN(e.clientY) || !isFinite(e.clientX) || !isFinite(e.clientY)) return;

        // Filter out simulated browser events (common on clicks/focus transitions) 
        // that report false (0,0) or extremely small coordinates on either axis.
        if (e.clientX < 8 || e.clientY < 8) return;

        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isInsideGameViewport(mouseX, mouseY)) {
            cursor.classList.add('cursor-fade-out');
            document.documentElement.classList.remove('custom-cursor-enabled');
            targetScale = 0.65;
            return;
        }
        
        // Ensure cursor is visible on desktop move (clearing touch fade states)
        cursor.classList.remove('cursor-fade-out');
        targetScale = 1.0;
        if (touchFadeTimeout) {
            clearTimeout(touchFadeTimeout);
            touchFadeTimeout = null;
        }

        if (!hasMoved) hasMoved = true;
        document.documentElement.classList.add('custom-cursor-enabled');
    }, { passive: true });

    // Instantly support touchscreen interaction: show cursor on tap/drag and fade it out nicely
    window.addEventListener('touchstart', (e) => {
        lastTouchTime = Date.now();
        if (e.touches && e.touches[0]) {
            const touch = e.touches[0];
            
            // Snap position instantly to tapped coordinate to avoid sliding from previous location
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            curX = mouseX;
            curY = mouseY;
            
            hasMoved = true;
            document.documentElement.classList.add('custom-cursor-enabled');
            cursor.classList.remove('cursor-fade-out');
            targetScale = 0.72; // Snappy touch tap compression
            
            if (touchFadeTimeout) {
                clearTimeout(touchFadeTimeout);
            }
            
            // Fade out cursor after a short delay following tap
            touchFadeTimeout = setTimeout(() => {
                cursor.classList.add('cursor-fade-out');
                targetScale = 0.65; // Collapse scale on fade-out
            }, 450);
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        lastTouchTime = Date.now();
        if (e.touches && e.touches[0]) {
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            
            cursor.classList.remove('cursor-fade-out');
            targetScale = 1.0; // scale up to 1.0 during active touch dragging
            if (touchFadeTimeout) {
                clearTimeout(touchFadeTimeout);
            }
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        lastTouchTime = Date.now();
        if (touchFadeTimeout) {
            clearTimeout(touchFadeTimeout);
        }
        touchFadeTimeout = setTimeout(() => {
            cursor.classList.add('cursor-fade-out');
            targetScale = 0.65; // Collapse scale on fade-out
        }, 300);
    }, { passive: true });

    function updateCursorPosition() {
        curX += (mouseX - curX) * LERP_FACTOR;
        curY += (mouseY - curY) * LERP_FACTOR;

        // Snappy dynamic scale LERP for precise clicks and fadeouts
        curScale += (targetScale - curScale) * 0.35;

        // Keep the custom cursor perfectly centered on the physical pointer tip and scaled correctly
        cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate3d(-50%, -50%, 0) scale(${curScale})`;
        requestAnimationFrame(updateCursorPosition);
    }
    requestAnimationFrame(updateCursorPosition);

    window.addEventListener('pointerdown', (e) => {
        // Skip touchpointerdown events as touchscreen taps are custom-scaled via touchstart
        if (e.pointerType === 'touch') return;

        cursor.classList.add('cursor-clicking');
        targetScale = 0.72; // Snap scale down on press and hold
        
        // Spawn the click sonar ripple exactly at the smoothed cursor's position.
        // This is robust against synthetic pointer events and ensures precise alignment.
        const ripple = document.createElement('div');
        ripple.className = 'cursor-ripple';
        ripple.style.left = `${curX}px`;
        ripple.style.top = `${curY}px`;
        document.body.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });

    window.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') return;
        cursor.classList.remove('cursor-clicking');
        targetScale = 1.0; // Restore full scale on release
    });

    let currentHoverTarget = null;

    document.addEventListener('pointerover', (e) => {
        const target = e.target.closest('button, .char-card, .toggle, .calibrate-btn, .close-modal, .about-btn, a, input, select');
        if (target) {
            if (currentHoverTarget !== target) {
                currentHoverTarget = target;
                cursor.classList.add('cursor-hovering');
                // Play in-universe hover click blip
                AudioManager.play('ui_hover', { volume: 0.12, varyPitch: true });
            }
        }
    });

    document.addEventListener('pointerout', (e) => {
        const target = e.target.closest('button, .char-card, .toggle, .calibrate-btn, .close-modal, .about-btn, a, input, select');
        if (target) {
            const related = e.relatedTarget ? e.relatedTarget.closest('button, .char-card, .toggle, .calibrate-btn, .close-modal, .about-btn, a, input, select') : null;
            if (related !== currentHoverTarget) {
                currentHoverTarget = related;
                if (!related) {
                    cursor.classList.remove('cursor-hovering');
                }
            }
        }
    });
}

// Initial State Setup
document.addEventListener('DOMContentLoaded', async () => {
    window.AudioManager = AudioManager; // Expose globally for the 3D engine/Telemeters
    initTacticalCursor();
    installOrientationInputLock();
    installStageLayoutSync();
    setTouchDeviceMode();
    installTouchMoveControl();
    installTouchCompass();
    window.addEventListener('resize', refreshGameLayout);
    window.addEventListener('orientationchange', refreshGameLayout);
    window.addEventListener('resize', setTouchDeviceMode);
    window.addEventListener('orientationchange', setTouchDeviceMode);

    setDebugMode(false);
    installAudioMixerControls();
    setAudioMixerOpen(false);
    loadAudioMixSettings();
    loadKeyBindings();
    setupControlsModal();
    refreshCharBestScores();
    updateDailyOpsUI();
    updateMenuCommandStatuses();

    const storedTouchControls = localStorage.getItem('hunker_touch_controls_enabled');
    if (storedTouchControls !== null) {
        state.settings.touchControls = storedTouchControls === 'true';
    } else {
        state.settings.touchControls = isTouchDevice();
    }
    if (mainTouchToggle) {
        mainTouchToggle.checked = !!state.settings.touchControls;
    }

    const storedNightVision = localStorage.getItem('hunker_nightvision_enabled');
    if (storedNightVision !== null) {
        state.settings.nightVision = storedNightVision === 'true';
    } else {
        state.settings.nightVision = false;
    }
    if (splashNightVisionToggle) {
        splashNightVisionToggle.checked = !!state.settings.nightVision;
    }
    if (mainNightVisionToggle) {
        mainNightVisionToggle.checked = !!state.settings.nightVision;
    }

    function getLoadingMessageForAsset(itemName) {
        const name = itemName.toLowerCase();
        
        // Doors
        if (name.includes('door_bio')) return 'CALIBRATING BIOMETRIC AIRLOCK GATEWAY';
        if (name.includes('door_nuclear')) return 'SHIELDING REACTOR PILE COOLANT BULKHEAD';
        if (name.includes('door_cryo')) return 'STABILIZING THERMAL SUPERCONDUCTOR SHIELD';
        if (name.includes('door_alien')) return 'DECRYPTING XENO-TECHNOLOGY SECURITY CODES';
        if (name.includes('door_rust')) return 'SEALING CORROSION-DECAYED OUTBOARD PORTS';
        if (name.includes('door')) return 'ENGAGING SECTOR TRANSIT DOORWAY HYDRAULICS';
        
        // Snails / Enemies
        if (name.includes('boss_cybersnail')) return 'PINPOINTING GIGAWATT GOLIATH RADAR PROFILE';
        if (name.includes('boss_cryosnail')) return 'WARNING: DETECTING SEVERE LOCAL TEMPERATURE DROP';
        if (name.includes('boss_sporesnail')) return 'DANGER: BIO-ORGANIC HULL CONTAGION CRITICAL';
        if (name.includes('cybersnail')) return 'IDENTIFYING SUPPORT-FIELD CORROSIVE ANOMALIES';
        if (name.includes('cryosnail')) return 'MEASURING GELID EXOSUIT DRAIN INDEX';
        if (name.includes('sporesnail')) return 'MONITORING SUBTERRANEAN BIO-KINETIC PATHOGENS';
        
        // Biome Textures
        if (name.includes('bunker_base') || name.includes('bunker_wall') || name.includes('bunker_grunge')) return 'MAPPING SECURE METAL-STRUCT SUPPORTS';
        if (name.includes('cryo_base') || name.includes('cryo_grunge') || name.includes('cryo_wall')) return 'STABILIZING CRYOGENIC COOLANT PIPELINES';
        if (name.includes('bio_base') || name.includes('bio_grunge') || name.includes('bio_wall')) return 'ISOLATING SPORE-INFESTED BIOSPHERES';
        if (name.includes('ice_base') || name.includes('ice_grunge') || name.includes('ice_wall')) return 'SURVEYING GEOTHERMAL GLACIAL CAVERNS';
        
        // Junk / Salvage
        if (name.includes('bunker_junk_legendary')) return 'DETECTING GOLD-SIGNATURE CORE CACHE';
        if (name.includes('bunker_junk_rare')) return 'RADAR RESOLVING UNUSUAL HIGH-VALUE LOBES';
        if (name.includes('bunker_junk_uncommon')) return 'FILTERING DUST SIGNALS FROM RECLAIMABLE METAL';
        if (name.includes('bunker_junk')) return 'SCANNING RECLAIMABLE SALVAGE DEBRIS';
        
        // Modules
        if (name.includes('module_o2')) return 'PREHEATING OXYGEN GENERATOR MIXER VALVE';
        if (name.includes('module_hull')) return 'TUNING DEFENSIVE MATRIX CELL POLARITY';
        if (name.includes('module_radar')) return 'ALIGNING HIGH-GAIN RADOME EM ANTENNA';
        if (name.includes('module_reactor')) return 'VENTING COMPRESSOR LIQUID NITROGEN COOLER';
        
        // Hero portraits
        if (name.includes('scout.full') || name.includes('scout_ship')) return 'ESTABLISHING FAST RECON SCOUT DATA-LINK';
        if (name.includes('tank.full') || name.includes('tank_ship')) return 'BOOTING HEAVY EXOSUIT STRENGTH BUFFERS';
        if (name.includes('eng.full') || name.includes('engineer_ship')) return 'UPLOADING NANOBOT FABRICATOR SUB-ROUTINES';
        
        // Audio / Backgrounds
        if (name.includes('.mp3') || name.includes('.wav')) return 'STABILIZING TACTICAL AUDIO MATRIX FEED';
        if (name.includes('bg.webp') || name.includes('menu_bg')) return 'BUFFERING INTERACTIVE DISPLAY SCHEMATICS';
        if (name.includes('scatter_')) return 'CALIBRATING DEBRIS DEFLECTION ASSIST';
        
        return 'SYNCHRONIZING TACTICAL DATA FILE';
    }

    // Load audio manifest (Critical elements only for splash & menu)
    const manifest = {
        images: [
            '/bg.webp',
            '/door.webp',
            '/door_bio.png',
            '/door_nuclear.png',
            '/door_cryo.png',
            '/door_alien.png',
            '/door_rust.png',
            '/menu_bg.webp',
            '/ship_wreckage.png',
            '/scout_ship.png',
            '/tank_ship.png',
            '/engineer_ship.png',
            '/console.png',
            '/module_o2_generator.png',
            '/module_hull_matrix.png',
            '/module_radar_dish.png',
            '/module_reactor_compressor.png',
            '/Scout.full.jpeg',
            '/Tank.full.jpeg',
            '/Eng.Full.jpeg'
        ],
        audio: [
            { key: 'amb_bunker_loop', url: '/audio/vg2/amb_bunker_loop.wav' },
            { key: 'mainbg_music', url: '/audio/vg2/mainbg_music.mp3' },
            { key: 'door_slam_vertical1', url: '/audio/vg2/door_slam_vertical1.wav' },
            { key: 'door_slam_vertical2', url: '/audio/vg2/door_slam_vertical2.wav' },
            { key: 'door_slam_vertical3', url: '/audio/vg2/door_slam_vertical3.wav' },
            { key: 'door_slide_horiz1', url: '/audio/vg2/door_slide_horiz.wav' },
            { key: 'door_slide_horiz2', url: '/audio/vg2/door_slide_horiz2.wav' },
            { key: 'door_slide_horiz3', url: '/audio/vg2/door_slide_horiz3.wav' },
            { key: 'door_slide_horiz4', url: '/audio/vg2/door_slide_horiz4.wav' },
            { key: 'door_gears_spin1', url: '/audio/vg2/door_gears_spin1.wav' },
            { key: 'door_gears_spin2', url: '/audio/vg2/door_gears_spin2.wav' },
            { key: 'door_gears_spin3', url: '/audio/vg2/door_gears_spin3.wav' },
            { key: 'door_gears_spin4', url: '/audio/vg2/door_gears_spin4.wav' },
            { key: 'ui_boot1', url: '/audio/vg2/ui_boot.wav' },
            { key: 'ui_boot2', url: '/audio/vg2/ui_boot2.wav' },
            { key: 'ui_hover1', url: '/audio/vg2/ui_hover1.wav' },
            { key: 'ui_hover2', url: '/audio/vg2/ui_hover2.wav' },
            { key: 'ui_click1', url: '/audio/vg2/ui_click_confirm1.wav' },
            { key: 'ui_error1', url: '/audio/vg2/ui_error1.wav' },
            { key: 'ui_error2', url: '/audio/vg2/ui_error2.wav' },
            { key: 'ui_error3', url: '/audio/vg2/ui_error3.wav' },
            { key: 'ui_scan_ping1', url: '/audio/vg2/ui_scan_ping1.wav' },
            { key: 'ui_scan_ping2', url: '/audio/vg2/ui_scan_ping2.wav' },
            { key: 'ui_scan_ping3', url: '/audio/vg2/ui_scan_ping3.wav' },
            { key: 'ui_scan_ping4', url: '/audio/vg2/ui_scan_ping4.wav' },
            { key: 'class_lock1', url: '/audio/vg2/class_lock1.wav' },
            { key: 'class_lock2', url: '/audio/vg2/class_lock2.wav' },
            { key: 'class_lock3', url: '/audio/vg2/class_lock3.wav' },
            { key: 'class_lock4', url: '/audio/vg2/class_lock4.wav' },
            { key: 'ui_click2', url: '/audio/vg2/ui_click_confirm2.wav' },
            { key: 'ui_typing1', url: '/audio/vg2/ui_typing1.wav' },
            { key: 'ui_typing2', url: '/audio/vg2/ui_typing2.wav' },
            { key: 'ui_typing3', url: '/audio/vg2/ui_typing3.wav' },
            { key: 'ui_typing4', url: '/audio/vg2/ui_typing4.wav' },
            { key: 'player_hit1', url: '/audio/vg2/player_hit1.wav' },
            { key: 'player_hit2', url: '/audio/vg2/player_hit2.wav' },
            { key: 'player_hit3', url: '/audio/vg2/player_hit3.wav' },
            { key: 'player_death1', url: '/audio/vg2/player_death1.wav' },
            { key: 'ui_upgrade_weapon1', url: '/audio/vg2/ui_upgrade_weapon1.wav' }
        ]
    };
    manifest.images = Array.from(new Set(manifest.images));

    // Clicks for generic buttons
    document.querySelectorAll('button, .toggle').forEach(el => {
        if (el.tagName === 'BUTTON' || el.classList.contains('toggle')) {
            el.addEventListener('click', () => {
                if (el.classList.contains('abort-btn')) AudioManager.play('ui_error', { volume: 0.6 });
                else AudioManager.play('ui_click', { volume: 0.6 });
            });
        }
    });

    // Initialize preview with first selected
    const initialSelected = document.querySelector('.char-card.selected');
    const initialType = initialSelected?.getAttribute('data-type') || 'SCOUT';
    setActiveAmmoCapacity(initialType, { clampExisting: true });
    if (initialSelected && heroData[initialType]) {
        warmClassIntroMedia(initialType);
        syncHeroPreview(initialType);
        updateHeroStats(initialType);
    }
    startHeroPreviewAnimation();
    if (splashFsToggle) splashFsToggle.checked = false;
    if (splashDebugToggle) splashDebugToggle.checked = false;
    if (mainDebugToggle) mainDebugToggle.checked = false;
    syncTouchSettingsVisibility();
    syncTouchMoveControlVisibility();

    let gameInitPromise = null;

    async function initializeGame(targetType) {
        if (window.game) return window.game;
        if (gameInitPromise) return gameInitPromise;

        gameInitPromise = (async () => {
            const gameplayManifest = {
                images: [
                    '/cybersnail.png',
                    '/cryosnail.png',
                    '/sporesnail.png',
                    '/boss_cybersnail.png',
                    '/boss_cryosnail.png',
                    '/boss_sporesnail.png',
                    '/bunker_base_metal.png',
                    '/bunker_grunge_rust.png',
                    '/bunker_tech_scratches.png',
                    '/bunker_wall_metal.png',
                    '/bunker_wall_grunge.png',
                    '/cryo_base_frost.png',
                    '/cryo_grunge_rime.png',
                    '/cryo_wall_conduit.png',
                    '/bio_base_growth.png',
                    '/bio_grunge_spores.png',
                    '/bio_wall_veins.png',
                    '/ice_base_rock.png',
                    '/ice_grunge_snow.png',
                    '/ice_wall_glacier.png',
                    '/bunker_junk.png',
                    '/bunker_junk_uncommon.png',
                    '/bunker_junk_rare.png',
                    '/bunker_junk_legendary.png',
                    '/bio_spores.png',
                    '/bio_spores_blue.png',
                    '/bio_spores_amber.png',
                    '/scatter_gravel.png',
                    '/scatter_coolant_puddle.png',
                    '/scatter_ice_stalagmite.png',
                    '/scatter_cryo_icicle.png',
                    '/scatter_cryo_shards.png',
                    '/scatter_bio_moss.png',
                    '/scatter_bio_pod.png',
                    '/scatter_slime_puddle.png',
                    '/build_structure_anim.png',
                    '/pit_hole.png',
                    '/decal_scars.png'
                ],
                audio: [
                    { key: 'music_safe_ship', url: '/audio/NewTrack1.mp3', fallbackUrl: '/audio/vg2/mainbg_music.mp3' },
                    { key: 'music_cryo_explore', url: '/audio/NewTrack2.mp3', fallbackUrl: '/audio/vg2/mainbg_music.mp3' },
                    { key: 'music_bio_explore', url: '/audio/NewTrack3.mp3', fallbackUrl: '/audio/vg2/mainbg_music.mp3' },
                    { key: 'music_combat_threatened', url: '/audio/NewTrack4.mp3', fallbackUrl: '/audio/vg2/mainbg_music.mp3' },
                    { key: 'amb_drip1', url: '/audio/vg2/amb_drip1.wav' },
                    { key: 'amb_drip2', url: '/audio/vg2/amb_drip2.wav' },
                    { key: 'amb_drip3', url: '/audio/vg2/amb_drip3.wav' },
                    { key: 'amb_drip4', url: '/audio/vg2/amb_drip4.wav' },
                    { key: 'amb_metal_stress1', url: '/audio/vg2/amb_metal_stress1.wav' },
                    { key: 'amb_metal_stress2', url: '/audio/vg2/amb_metal_stress2.wav' },
                    { key: 'amb_metal_stress3', url: '/audio/vg2/amb_metal_stress3.wav' },
                    { key: 'enemy_hit_soft1', url: '/audio/vg2/enemy_hit_soft1.wav' },
                    { key: 'enemy_hit_soft2', url: '/audio/vg2/enemy_hit_soft2.wav' },
                    { key: 'enemy_hit_soft3', url: '/audio/vg2/enemy_hit_soft3.wav' },
                    { key: 'enemy_death_snail1', url: '/audio/vg2/enemy_death_snail1.wav' },
                    { key: 'enemy_death_snail2', url: '/audio/vg2/enemy_death_snail2.wav' },
                    { key: 'enemy_death_snail3', url: '/audio/vg2/enemy_death_snail3.wav' },
                    { key: 'enemy_death_crawler1', url: '/audio/vg2/enemy_death_crawler1.wav' },
                    { key: 'enemy_death_crawler2', url: '/audio/vg2/enemy_death_crawler2.wav' },
                    { key: 'weapon_fire_sidearm1', url: '/audio/vg2/weapon_fire_sidearm1.wav' },
                    { key: 'weapon_fire_sidearm2', url: '/audio/vg2/weapon_fire_sidearm2.wav' },
                    { key: 'weapon_fire_sidearm3', url: '/audio/vg2/weapon_fire_sidearm3.wav' },
                    { key: 'weapon_reload1', url: '/audio/vg2/weapon_reload1.wav' },
                    { key: 'weapon_reload2', url: '/audio/vg2/weapon_reload2.wav' }
                ]
            };

            await AudioManager.loadAssets(gameplayManifest, (progress, itemName) => {
                if (loaderStatus && itemName) {
                    const msg = getLoadingMessageForAsset(itemName);
                    loaderStatus.innerHTML = `<div style="opacity: 1.0; animation: tactical-pulse 1s infinite ease-in-out;">> INITIALIZING TACTICAL EXOSUIT CORE... (${Math.round(progress)}%)<br><span style="font-size: var(--font-xs); color: var(--text-muted);">> ${msg}...</span></div>`;
                }
            });

            const { ThreeGame } = await import('./src/threeGame.js');
            try {
                window.game = new ThreeGame({
                    parent: 'game-container',
                    playerType: targetType,
                    bankManager,
                    dialogueManager,
                    arcManager,
                    act2Manager
                });
                window.game.nightVision = state.settings.nightVision;
            } catch (err) {
                console.error('[ThreeGame init failed]', err);
                const loaderTitle = document.querySelector('.loader-title');
                const loaderStatusEl = document.querySelector('.loader-status');
                if (loaderTitle) loaderTitle.textContent = 'SYSTEM INITIALIZATION FAILED';
                if (loaderStatusEl) {
                    loaderStatusEl.innerHTML = `<div style="color: var(--accent-secondary); font-size: var(--font-xs);">${err?.message ?? 'UNKNOWN ERROR — WebGL may be unavailable'}</div>`;
                }
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) loadingScreen.classList.remove('hidden');
                throw err;
            }

            window.game?.setPerformanceProfile?.('menu');
            window.game?.setLoadingPaused?.(true);
            resetRunToStartingState({
                resetBank: false,
                skipEffects: true,
                snailSpawnEnabled: false,
                purgeSnails: true
            });
            setSnailSpawnState(false, { purgeExisting: true });
            const initialBiomeState = window.game?.getBiomeState?.();
            if (initialBiomeState) {
                renderBiomeStatus(initialBiomeState, { showPrompt: false });
            }
            window.game?.emitVitalsState?.();
            ensureMissionManagers();

            return window.game;
        })();

        return gameInitPromise;
    }

    const maxLogs = 5;
    const logs = ['CONNECTING TO TACTICAL NETWORK...'];

    await AudioManager.loadAssets(manifest, (progress, itemName) => {
        if (loaderBar) loaderBar.style.width = `${progress}%`;
        if (loaderStatus && itemName) {
            const msg = getLoadingMessageForAsset(itemName);
            logs.push(`> ${msg}...`);
            if (logs.length > maxLogs) {
                logs.shift();
            }
            loaderStatus.innerHTML = logs.map((log, idx) => {
                const distance = logs.length - 1 - idx;
                const opacities = [1.0, 0.65, 0.4, 0.2, 0.08];
                const opacity = opacities[distance] ?? 0.05;
                return `<div style="opacity: ${opacity}; line-height: 1.4; transition: opacity 0.15s ease;">${log}</div>`;
            }).join('');
        }
    });

    if (loaderBar) loaderBar.style.width = `100%`;
    if (loaderStatus) {
        loaderStatus.style.opacity = 0;
        setTimeout(() => {
            loaderStatus.innerHTML = `<div style="opacity: 1.0; animation: tactical-pulse 2s infinite ease-in-out;">[ CLICK ANYWHERE TO INITIALIZE ]</div>`;
            loaderStatus.style.opacity = 1;
        }, 220);
    }

    let clickInitializing = false;
    document.body.addEventListener('click', async () => {
        if (clickInitializing) return;
        if (AudioManager.isUnlocked && window.game) return;

        clickInitializing = true;

        if (loaderStatus) {
            loaderStatus.innerHTML = `<div style="opacity: 1.0; animation: tactical-pulse 1s infinite ease-in-out;">> BOOTING TACTICAL WEBGL CORE...</div>`;
        }

        try {
            await AudioManager.unlock();
            const initialSelected = document.querySelector('.char-card.selected');
            const initialType = initialSelected?.getAttribute('data-type') || 'SCOUT';
            await initializeGame(initialType);
        } catch (err) {
            console.error('Initialization failed:', err);
            clickInitializing = false;
            if (loaderStatus) {
                loaderStatus.innerHTML = `<div style="opacity: 1.0; color: var(--accent-secondary); animation: tactical-pulse 2s infinite ease-in-out;">[ CLICK ANYWHERE TO RETRY INITIALIZATION ]</div>`;
            }
            return;
        }

        triggerDoorTransition(
            () => {
                if (loadingScreen) loadingScreen.classList.add('hidden');
                if (splash) splash.classList.remove('hidden');
                setAppPhase('splash');
                window.game?.setLoadingPaused?.(false);
                transitionToMenuMusic();
            },
            null,
            'base'
        );
    });
});

setDebugMode(false);
