import { AudioManager } from './src/audio.js';
import { BankManager } from './src/bank.js';
import { CutsceneManager } from './src/cutscene.js';
import { DialogueManager } from './src/dialogue.js';
import { VitalsHUD } from './src/vitals.js';
const startBtn = document.getElementById('start-game'); // INITIALIZE button
const playBtn = document.getElementById('enter-fullscreen'); // PLAY GAME button
const splash = document.getElementById('splash');
const menu = document.getElementById('menu');
const loadingScreen = document.getElementById('loading-screen');
const transitionOverlay = document.getElementById('transition-overlay');
const loaderBar = document.querySelector('.loader-bar');
const loaderStatus = document.querySelector('.loader-status');

const splashDebugToggle = document.getElementById('splash-debug-toggle');
const splashFsToggle = document.getElementById('splash-fs-toggle');
const mainDebugToggle = document.getElementById('main-debug-toggle');
const gameViewport = document.getElementById('game-viewport');
const gameStageContainer = document.getElementById('game-container');
const touchMoveControl = document.getElementById('touch-move-control');
const touchMoveRing = touchMoveControl?.querySelector('.touch-move-control__ring');
const touchMoveThumb = touchMoveControl?.querySelector('.touch-move-control__thumb');
const touchCompass = touchMoveControl?.querySelector('.touch-move-control__compass');
const touchCompassArrow = touchCompass?.querySelector('.touch-move-control__compass-arrow');
const touchCompassRadarArrow = touchCompass?.querySelector('#touch-compass-radar-arrow');
const touchCompassDistance = touchCompass?.querySelector('.touch-move-control__compass-distance');
const touchControlsSetting = document.getElementById('touch-controls-setting');
const mainTouchToggle = document.getElementById('main-touch-toggle');
const openAudioMixerBtn = document.getElementById('open-audio-mixer');
const audioMixerPopup = document.getElementById('audio-mixer-popup');
const closeAudioMixerBtn = document.getElementById('close-audio-mixer');
const saveAudioMixBtn = document.getElementById('save-audio-mix');
const audioMasterSlider = document.getElementById('audio-master-slider');
const audioMusicSlider = document.getElementById('audio-music-slider');
const audioVfxSlider = document.getElementById('audio-vfx-slider');
const audioMasterValue = document.getElementById('audio-master-value');
const audioMusicValue = document.getElementById('audio-music-value');
const audioVfxValue = document.getElementById('audio-vfx-value');
const pickupCountTotal = document.getElementById('pickup-count-total');
const bunkerLevelNum = document.getElementById('level-num');
const biomeLabelEl = document.getElementById('biome-label');
const biomeHudPromptEl = document.getElementById('biome-hud-prompt');
const biomeHudTextEl = document.getElementById('biome-hud-text');
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
const BUNKER_TIER_NAMES = Object.freeze(['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS']);
const DEFAULT_BIOME_LABEL = 'ACTIVE SECTOR';
const BIOME_PROMPT_DURATION_MS = 2800;
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
        touchControls: false
    },
    onlineCount: 1,
    gameInitialized: false
};

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
let missionFlowRunning = false;
let deathSequenceTimer = null;
let damageFlashTimer = null;
let weaponErrorTimer = null;
let biomePromptTimer = null;
let o2AlarmTimer = null;
let o2AlarmActive = false;
let pickupComboCount = 0;
let pickupComboTimer = null;
const PICKUP_COMBO_WINDOW_MS = 1400;
const PICKUP_COMBO_THRESHOLD = 3;
let runStartTime = Date.now();
let currentMission = null;
const _mothershipFiredTriggers = new Set();
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

function recomputePickupTotal() {
    pickupCounterState.total = Math.max(
        0,
        (pickupCounterState.health ?? 0)
        + (pickupCounterState.weapon ?? 0)
        + (pickupCounterState.coin ?? 0)
    );
}

function renderPickupCounter() {
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
        applyAudioMixSettings(storedMix, { persist: false });
        return;
    }

    const legacyAudioEnabled = localStorage.getItem(LEGACY_AUDIO_TOGGLE_KEY);
    const migratedMix = legacyAudioEnabled === 'false'
        ? { master: 0, music: 0, vfx: 0 }
        : { ...DEFAULT_AUDIO_MIX };

    applyAudioMixSettings(migratedMix, { persist: true });
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
        weaponReloadBar.style.transform = `scaleX(${reloading ? reloadProgress : 0})`;
    }
    if (weaponStatusPanel) {
        weaponStatusPanel.classList.toggle('is-reloading', reloading);
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
    if (total === 1) fireMothershipReactiveLine('first_kill');
    if (type === 'sentinel') fireMothershipReactiveLine('sentinel_spotted');
    if (type === 'crawler') fireMothershipReactiveLine('crawler_detected');
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
window.addEventListener('ship-health-changed', (event) => {
    renderShipHealth(event?.detail ?? {});
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
    if (!biomeHudPromptEl) return;
    if (biomePromptTimer) {
        clearTimeout(biomePromptTimer);
        biomePromptTimer = null;
    }
    biomeHudPromptEl.classList.remove('visible');
    biomeHudPromptEl.classList.add('hidden');
}

function showBiomePrompt(message = '') {
    if (!biomeHudPromptEl || !biomeHudTextEl) return;
    biomeHudTextEl.textContent = message;
    biomeHudPromptEl.classList.remove('hidden');
    requestAnimationFrame(() => {
        biomeHudPromptEl.classList.add('visible');
    });

    if (biomePromptTimer) {
        clearTimeout(biomePromptTimer);
        biomePromptTimer = null;
    }

    biomePromptTimer = window.setTimeout(() => {
        hideBiomePrompt();
    }, BIOME_PROMPT_DURATION_MS);
}

function renderBiomeStatus(detail = {}, { showPrompt = false } = {}) {
    const label = typeof detail?.label === 'string' && detail.label.trim()
        ? detail.label.trim()
        : DEFAULT_BIOME_LABEL;
    if (biomeLabelEl) {
        biomeLabelEl.textContent = label;
        biomeLabelEl.title = label;
        biomeLabelEl.setAttribute('aria-label', `CURRENT BIOME ${label}`);
    }

    const hudVisible = !document.getElementById('ui')?.classList.contains('hidden');
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

let lastReportedDepthTier = 0;
window.addEventListener('depth-tier-changed', (event) => {
    const tier = event?.detail?.tier ?? 0;
    renderBunkerLevel(tier);
    if (tier > lastReportedDepthTier && tier > 0) {
        lastReportedDepthTier = tier;
        const label = event?.detail?.label ?? `DEPTH ${tier}`;
        AudioManager.play('ui_boot', { volume: 0.28, playbackRate: 0.78 + tier * 0.06, bus: 'sfx' });
        showBiomePrompt(`> DEPTH TIER: ${label} — HAZARD ASSESSMENT ELEVATED`);
    }
});
const BIOME_HUD_COLORS = {
    active: { label: 'rgba(173, 225, 255, 0.98)', glow: 'rgba(94, 178, 255, 0.33)' },
    cryo:   { label: 'rgba(148, 204, 255, 0.98)', glow: 'rgba(68, 158, 240, 0.45)' },
    bio:    { label: 'rgba(144, 220, 140, 0.98)', glow: 'rgba(60, 160, 80, 0.40)'  }
};
window.addEventListener('biome-changed', (event) => {
    renderBiomeStatus(event?.detail ?? {}, { showPrompt: true });
    renderBunkerLevel(window.game?.maxDepthTierReached ?? Number(bunkerLevelNum?.textContent ?? 0));
    const biomeKey = event?.detail?.key ?? 'active';
    const biomeCols = BIOME_HUD_COLORS[biomeKey] ?? BIOME_HUD_COLORS.active;
    const hud = document.getElementById('ui');
    if (hud) {
        hud.style.setProperty('--biome-label-color', biomeCols.label);
        hud.style.setProperty('--biome-label-glow', biomeCols.glow);
    }
    if (biomeKey === 'cryo') {
        AudioManager.play('ui_scan_ping', { volume: 0.22, playbackRate: 0.48, bus: 'sfx' });
        fireMothershipReactiveLine('first_cryo');
    } else if (biomeKey === 'bio') {
        AudioManager.play('amb_metal_stress', { volume: 0.3, playbackRate: 0.62, bus: 'sfx' });
        fireMothershipReactiveLine('first_bio');
    }
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

function triggerDamageFlash() {
    clearTimedClass('damage', 'player-damage-flash');
    document.body.classList.add('player-damage-flash');
    damageFlashTimer = window.setTimeout(() => {
        document.body.classList.remove('player-damage-flash');
        damageFlashTimer = null;
    }, 240);
}

// ---- Hero select stat pips ----
const HERO_DISPLAY_STATS = {
    SCOUT:    { spdPips: 5, o2Pips: 2, lootPips: 5, color: '#7dff5a', spdLabel: 'FAST',   o2Label: 'LOW',    lootLabel: 'WIDE'  },
    TANK:     { spdPips: 2, o2Pips: 5, lootPips: 2, color: '#ffb700', spdLabel: 'SLOW',   o2Label: 'HIGH',   lootLabel: 'SHORT' },
    ENGINEER: { spdPips: 4, o2Pips: 4, lootPips: 4, color: '#00e5ff', spdLabel: 'NORMAL', o2Label: 'NORMAL', lootLabel: 'MED'   }
};
const HERO_STAT_TOTAL = 5;

function renderPips(containerId, filled) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.replaceChildren();
    for (let i = 0; i < HERO_STAT_TOTAL; i++) {
        const pip = document.createElement('span');
        pip.className = `pip ${i < filled ? 'pip--full' : 'pip--empty'}`;
        el.appendChild(pip);
    }
}

function updateHeroStats(type) {
    const stats = HERO_DISPLAY_STATS[type];
    if (!stats) return;

    // Set class colour on the row container so all pips + value text inherit it
    const row = document.getElementById('hero-stats-row');
    if (row) row.style.setProperty('--class-pip-color', stats.color);

    renderPips('hero-stat-spd', stats.spdPips);
    renderPips('hero-stat-o2', stats.o2Pips);
    renderPips('hero-stat-loot', stats.lootPips);

    const spdVal  = document.getElementById('hero-stat-spd-val');
    const o2Val   = document.getElementById('hero-stat-o2-val');
    const lootVal = document.getElementById('hero-stat-loot-val');
    if (spdVal)  spdVal.textContent  = stats.spdLabel;
    if (o2Val)   o2Val.textContent   = stats.o2Label;
    if (lootVal) lootVal.textContent = stats.lootLabel;
}

// ---- Game Over Screen ----
function assignMission(bankState) {
    const unlocks = bankState?.unlocks ?? {};
    const totalUnlocks = Object.values(unlocks).filter(Boolean).length;
    if (totalUnlocks === 0) {
        return { type: 'retrieval', label: 'RETRIEVE: PRIORITY TECH CACHE', targetKills: 0, targetDepth: 0 };
    } else if (totalUnlocks < 3) {
        return { type: 'survey', label: 'SURVEY: CRYO SECTOR BOUNDARY', targetKills: 0, targetDepth: 65 };
    }
    const idx = (totalUnlocks + Math.floor(Date.now() / 86400000)) % 3;
    const missions = [
        { type: 'retrieval', label: 'RETRIEVE: HIGH-VALUE TECH ASSET', targetKills: 0, targetDepth: 0 },
        { type: 'survey', label: 'SURVEY: DEEP SECTOR RECON', targetKills: 0, targetDepth: 145 },
        { type: 'elimination', label: 'ELIMINATE: BIO-ENTITY CLUSTER', targetKills: 6, targetDepth: 0 }
    ];
    return missions[idx];
}

function generateDeathReport(stats, reason) {
    const biome = stats.biomeLabel ?? 'ACTIVE SECTOR';
    const depth = stats.distanceTravelled ?? 0;
    const causeMap = {
        'o2-depletion':       '> CAUSE: EXOSUIT ATMOSPHERIC FAILURE — O₂ RESERVES EXHAUSTED',
        'snail':              '> CAUSE: BIO-ENTITY CONTACT — CYBERSNAIL MELEE IMPACT',
        'cybersnail':         '> CAUSE: BIO-ENTITY CONTACT — CYBERSNAIL MELEE IMPACT',
        'cryosnail':          '> CAUSE: BIO-ENTITY CONTACT — CRYOSNAIL IMPACT',
        'sporesnail':         '> CAUSE: BIO-ENTITY CONTACT — SPORESNAIL IMPACT',
        'enemy-projectile':   '> CAUSE: HOSTILE PROJECTILE IMPACT',
        'sentinel':           '> CAUSE: HOSTILE PROJECTILE — SENTINEL FIRE',
        'ship-destroyed':     '> CAUSE: SHIP STRUCTURAL FAILURE — HULL INTEGRITY ZERO',
        'frost-shockwave':    '> CAUSE: CRYO HAZARD — THERMAL SHOCKWAVE IMPACT',
        'poison':             '> CAUSE: BIO-TOXIN EXPOSURE — SUIT INTEGRITY FAILURE',
    };
    const cause = causeMap[reason] ?? '> CAUSE: EXOSUIT FAILURE — UNKNOWN EVENT';
    return [
        `> LAST KNOWN POSITION: ${biome}`,
        `> DISTANCE FROM BASE: ${Math.round(depth)}u`,
        `> SALVAGE RECOVERED: ${stats.totalPickups ?? 0} ITEMS`,
        `> THREATS NEUTRALIZED: ${stats.snailsKilled ?? 0}`,
        cause
    ].join('\n');
}

function formatRunTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function showGameOverScreen(stats, { isVictory = false, deathReason = 'hazard' } = {}) {
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

    if (scoreVal) scoreVal.textContent = String(score);
    if (ratingBadge) {
        ratingBadge.textContent = rating.grade;
        ratingBadge.className = `go-rating-badge go-rating-badge--${rating.grade.toLowerCase()}`;
    }
    if (ratingLabel) ratingLabel.textContent = rating.label;

    // Personal best
    const bestKey = `hb_best_score_${window.game?.playerType ?? 'SCOUT'}`;
    const prevBest = Number(localStorage.getItem(bestKey) ?? 0);
    const isNewBest = score > prevBest;
    if (isNewBest) localStorage.setItem(bestKey, String(score));
    if (newBest) newBest.classList.toggle('hidden', !isNewBest);

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
    if (resetBank) {
        bankManager.reset();
    }

    runStartTime = Date.now();
    currentMission = assignMission(bankManager.getState());
    _mothershipFiredTriggers.clear();

    resetPickupCounter();
    window.game?.respawnPlayer?.({ resetRunState: true, skipEffects });
    window.game?.initMission?.(currentMission);
    setSnailSpawnState(snailSpawnEnabled, { purgeExisting: purgeSnails });
    window.game?.setInputEnabled?.(false);
    renderBunkerLevel(0);
    renderBiomeStatus({ label: DEFAULT_BIOME_LABEL }, { showPrompt: false });
    hideBiomePrompt();
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
    AudioManager.play('ui_error', { volume: 0.7 });

    deathSequenceTimer = window.setTimeout(() => {
        document.body.classList.remove('player-dead-flash');
        deathSequenceTimer = null;

        const stats = window.game?.getRunStats?.() ?? {
            distanceTravelled: 0,
            totalPickups: 0,
            generatorLevel: 0
        };
        showGameOverScreen(stats, { isVictory: false, deathReason });
        resetRunToStartingState({
            resetBank: false,
            skipEffects: true,
            snailSpawnEnabled: false,
            purgeSnails: true
        });
        window.game?.setInputEnabled?.(false);
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
    const bar = document.getElementById('ability-bar');
    if (bar) bar.style.transform = 'scaleX(1)';
    updateTouchAbilityButtonState({ remaining: 0, max: 1, active: false });
    window.game?.setInputEnabled?.(true);
});

window.addEventListener('mission-objective-complete', (event) => {
    const type = event?.detail?.type ?? '';
    const messages = {
        retrieval: 'OBJECTIVE SECURED — RETURN TO SHIP',
        survey:    'SURVEY COMPLETE — RETURN TO SHIP',
        elimination: 'TARGETS ELIMINATED — RETURN TO SHIP'
    };
    const msg = messages[type] ?? 'OBJECTIVE COMPLETE — RETURN TO SHIP';
    showBiomePrompt(msg);
    AudioManager.play('ui_boot', { volume: 0.45, playbackRate: 0.88, bus: 'sfx' });
});

window.addEventListener('extraction-progress', (event) => {
    const { progress = 0, active = false } = event?.detail ?? {};
    updateExtractionRing(progress, active);
});

window.addEventListener('player-extracted', (event) => {
    hideExtractionRing();
    window.game?.setInputEnabled?.(false);
    hideBiomePrompt();

    const stats = event?.detail?.runStats ?? window.game?.getRunStats?.() ?? {};
    AudioManager.play('ui_boot', { volume: 0.6, playbackRate: 0.72, bus: 'sfx' });

    window.setTimeout(() => {
        showGameOverScreen(stats, { isVictory: true });
        resetRunToStartingState({
            resetBank: false,
            skipEffects: true,
            snailSpawnEnabled: false,
            purgeSnails: true
        });
        window.game?.setInputEnabled?.(false);
    }, 600);
});

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
    if (prompt) prompt.classList.remove('hidden');
});

window.addEventListener('lore-terminal-clear', () => {
    const prompt = document.getElementById('lore-hud-prompt');
    if (prompt) prompt.classList.add('hidden');
});

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
    let charIdx = 0;
    const chars = loreText.split('');
    const tick = () => {
        if (!loreTextEl || loreModal.classList.contains('hidden')) return;
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

const closeLoreModal = document.getElementById('close-lore-modal');
if (closeLoreModal) {
    closeLoreModal.addEventListener('click', () => {
        document.getElementById('lore-modal')?.classList.add('hidden');
        window.game?.setInputEnabled?.(true);
    });
}

// ── Reactive Mothership ───────────────────────────────────────
function fireMothershipReactiveLine(trigger) {
    if (_mothershipFiredTriggers.has(trigger)) return;
    _mothershipFiredTriggers.add(trigger);
    const lines = {
        first_kill:       'AGENT — FIRST THREAT NEUTRALIZED. PROCEED.',
        first_cryo:       'WARNING: CRYO SECTOR BOUNDARY CROSSED. THERMAL PROTOCOL ACTIVE.',
        first_bio:        'ALERT: BIO-CONTAINMENT ZONE ENTERED. SUIT FILTERS AT LIMIT.',
        hp_critical:      'DISTRESS SIGNAL: VITAL SIGNS CRITICAL. EXTRACTION WINDOW OPEN EARLY.',
        objective_found:  'UPLINK: OBJECTIVE CONFIRMED. RETURN TO SHIP IMMEDIATELY.',
        first_deposit:    'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.',
        lore_found:       'AGENT — BUNKER DATA FRAGMENT RECOVERED. TRANSMITTING TO ARCHIVE.',
        sentinel_spotted: 'WARNING: AUTOMATED DEFENSE SYSTEM ACTIVE. RECOMMEND COVER.',
        crawler_detected:  'ALERT: FAST-MOVING BIO-ENTITY DETECTED. MAINTAIN DISTANCE.',
        armory_found:      'UPLINK: ARMORY CACHE LOCATED. HIGH-VALUE ASSET — EXPECT RESISTANCE.',
        the_nest:          'WARNING: BIO-ENTITY NEST CONFIRMED. MAXIMUM THREAT DENSITY. CAUTION.',
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
    showBiomePrompt(`> SECTOR DATA: ${label} DETECTED`);
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

window.addEventListener('sentinel-fired', () => {
    const viewport = document.getElementById('game-viewport');
    if (viewport) {
        viewport.classList.add('sentinel-warning-flash');
        setTimeout(() => viewport.classList.remove('sentinel-warning-flash'), 280);
    }
});

window.addEventListener('mission-kill-progress', (event) => {
    const { count = 0, target = 0 } = event?.detail ?? {};
    const missionEl = document.getElementById('mission-status-text');
    if (missionEl) missionEl.textContent = `ELIMINATE: ${count}/${target}`;
});

document.getElementById('class-ability-panel')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.game?.triggerClassAbility?.();
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

    if (clampedRemaining > 0) {
        touchBtn.style.pointerEvents = 'none';
        touchBtn.style.opacity = '0.8';
    } else {
        touchBtn.style.pointerEvents = 'auto';
        touchBtn.style.opacity = '1';
    }

    const cooldownEl = document.getElementById('touch-ability-cooldown');
    if (cooldownEl) {
        cooldownEl.textContent = clampedRemaining > 0 ? `${clampedRemaining.toFixed(1)}s` : 'READY';
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
        panel.classList.add('class-ability-panel--ready');
        setTimeout(() => panel.classList.remove('class-ability-panel--ready'), 1100);
    }
    const { ability } = event?.detail ?? {};
    const viewport = document.getElementById('game-viewport');
    if (viewport) viewport.classList.remove(`ability-active-${ability}`);
});

window.addEventListener('ability-cooldown-tick', (event) => {
    const { remaining = 0, max = 1, active = false } = event?.detail ?? {};
    const bar = document.getElementById('ability-bar');
    if (bar) {
        const fillPct = active ? 1 : 1 - (remaining / Math.max(0.001, max));
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fillPct))})`;
    }
    updateTouchAbilityButtonState({ remaining, max, active });
});

function syncAbilityPanelLabel() {
    const nameEl = document.getElementById('ability-name');
    if (!nameEl) return;
    const playerType = window.game?.playerType ?? 'SCOUT';
    const labels = { SCOUT: 'SPRINT BURST', TANK: 'FORTIFY', ENGINEER: 'FIELD OVERCLOCK' };
    nameEl.textContent = labels[playerType] ?? 'ABILITY';
}

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

window.addEventListener('player-o2-changed', (event) => {
    const o2 = event?.detail?.o2 ?? 100;
    if (o2 <= 10 && !o2AlarmActive) {
        startO2Alarm();
    } else if (o2 > 10 && o2AlarmActive) {
        stopO2Alarm();
    }
});

// Game over button handlers
const gameOverTryAgain = document.getElementById('game-over-try-again');
const gameOverMainMenu = document.getElementById('game-over-main-menu');

if (gameOverTryAgain) {
    gameOverTryAgain.addEventListener('click', () => {
        hideGameOverScreen();
        triggerDoorTransition(
            () => {
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
        );
    });
}

if (gameOverMainMenu) {
    gameOverMainMenu.addEventListener('click', () => {
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

                const gameContainer = document.getElementById('game-container');
                const mapBox = document.querySelector('.map-box');
                if (gameContainer && mapBox) {
                    mapBox.insertBefore(gameContainer, mapBox.querySelector('.module-scanline'));
                    gameContainer.classList.remove('fullscreen-mode');
                    queueGameLayoutRefresh();
                }
            },
            null
        );
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

    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const isHUD = !ui?.classList.contains('hidden');
    const isMenuHidden = menu?.classList.contains('hidden') ?? true;
    const inMissionIntro = document.body.classList.contains('mission-intro-active');
    // Keep touchMoveControl container visible on the HUD so the compass is always visible
    touchMoveControl.classList.toggle('hidden', !isHUD);

    // Show/hide the joystick ring and label based on the touchControls setting
    const showJoystick = state.settings.touchControls;
    if (touchMoveRing) {
        touchMoveRing.classList.toggle('hidden', !showJoystick);
    }
    const label = touchMoveControl.querySelector('.touch-move-control__label');
    if (label) {
        label.classList.toggle('hidden', !showJoystick);
    }

    // Show on desktop HUD always; on touch devices, mirror joystick visibility.
    const abilityBtn = document.getElementById('touch-ability-btn');
    if (abilityBtn) {
        const touchDevice = document.body.classList.contains('touch-device');
        const showAbilityBtn = isHUD && isMenuHidden && !inMissionIntro && (!touchDevice || showJoystick);
        abilityBtn.classList.toggle('hidden', !showAbilityBtn);
    }

    if (!isHUD || !showJoystick) {
        activeTouchPointerId = null;
        touchMoveControl.classList.remove('active');
        touchMoveThumb?.style.setProperty('transform', 'translate(-50%, -50%)');
        window.game?.setVirtualInput?.(0, 0);
    }
}

// Wire touch ability button
const touchAbilityBtn = document.getElementById('touch-ability-btn');
if (touchAbilityBtn) {
    touchAbilityBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        window.game?.triggerClassAbility?.();
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

    const rect = gameViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const unit = Math.min(rect.width / DESIGN_STAGE.width, rect.height / DESIGN_STAGE.height);
    gameViewport.style.setProperty('--vu', `${unit}px`);
}

function refreshGameLayout() {
    syncStageMetrics();

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

function runDoorTransitionAsync() {
    return new Promise((resolve) => {
        triggerDoorTransition(
            null,
            () => resolve()
        );
    });
}

function setSnailSpawnState(enabled, { purgeExisting = false } = {}) {
    window.game?.setSnailsEnabled?.(Boolean(enabled), { removeExisting: purgeExisting });
}

async function runMissionIntroSequence() {
    if (missionFlowRunning) return;

    ensureMissionManagers();
    missionFlowRunning = true;
    document.body.classList.add('mission-intro-active');
    const game = window.game;
    const playerType = getSelectedHeroType();

    game?.setInputEnabled?.(false);
    const consoleModal = document.getElementById('console-terminal-modal');
    if (consoleModal) {
        consoleModal.classList.add('hidden');
    }

    try {
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
            await runDoorTransitionAsync();
        }

        // Show mission briefing after door transition
        if (currentMission?.label) {
            window.setTimeout(() => showBiomePrompt(`MISSION: ${currentMission.label}`), 400);
        }
    } finally {
        document.body.classList.remove('mission-intro-active');
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
                    menu.classList.remove('hidden');
                    queueGameLayoutRefresh();
                }
            },
            () => {
                if (state.settings.fullscreen) {
                    document.documentElement.requestFullscreen().catch(() => { });
                }
            }
        );
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        triggerDoorTransition(
            () => {
                if (menu) menu.classList.add('hidden');
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
            },
            () => {
                void runMissionIntroSequence();
            }
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
let lastTime = performance.now();
let frames = 0;
const fpsDisplay = document.getElementById('fps-counter');

function updateFPS() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        if (fpsDisplay) fpsDisplay.textContent = `FPS: ${frames}`;
        frames = 0;
        lastTime = now;
    }
    requestAnimationFrame(updateFPS);
}
requestAnimationFrame(updateFPS);

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
            const isHUD = !document.getElementById('ui').classList.contains('hidden');
            if (abortBtn) {
                if (isHUD) abortBtn.classList.remove('hidden');
                else abortBtn.classList.add('hidden');
            }

            syncTouchSettingsVisibility();
            settingsPopup.classList.remove('hidden');
            if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
            if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
            if (mainTouchToggle) mainTouchToggle.checked = !!state.settings.touchControls;
            syncAudioMixerUI(state.settings.audioMix);
            setAudioMixerOpen(false);
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
        cutsceneManager?.finishActiveRun(true);
        dialogueManager?.cancelDialogue();
        dialogueManager?.cancelTutorial();
        document.body.classList.remove('mission-intro-active');
        document.body.classList.remove('player-damage-flash', 'player-dead-flash', 'vitals-critical');
        hideBiomePrompt();
        if (biomePromptTimer) {
            clearTimeout(biomePromptTimer);
            biomePromptTimer = null;
        }
        if (damageFlashTimer) {
            clearTimeout(damageFlashTimer);
            damageFlashTimer = null;
        }
        if (deathSequenceTimer) {
            clearTimeout(deathSequenceTimer);
            deathSequenceTimer = null;
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
                if (document.getElementById('ui')) document.getElementById('ui').classList.add('hidden');
                window.game?.setInputEnabled?.(false);
                syncTouchSettingsVisibility();
                syncTouchMoveControlVisibility();
                if (menu) menu.classList.remove('hidden');

                const gameContainer = document.getElementById('game-container');
                const mapBox = document.querySelector('.map-box');
                if (gameContainer && mapBox) {
                    mapBox.insertBefore(gameContainer, mapBox.querySelector('.module-scanline'));
                    gameContainer.classList.remove('fullscreen-mode');
                    queueGameLayoutRefresh();
                }
            },
            null
        );
    });
}
if (closeSettings && settingsPopup) {
    closeSettings.addEventListener('click', () => {
        settingsPopup.classList.add('hidden');
        draftAudioMix = cloneAudioMix(state.settings.audioMix);
        AudioManager.setMix(state.settings.audioMix);
        setAudioMixerOpen(false);
    });
}

// Global Escape Key Listener for Modals
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const dialogueModal = document.getElementById('mothership-dialogue');
        if (dialogueModal && !dialogueModal.classList.contains('hidden')) {
            return; // Let DialogueManager handle its own Escape key
        }

        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && !confirmModal.classList.contains('hidden')) {
            confirmModal.classList.add('hidden');
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

        const settingsPopup = document.getElementById('settings-popup');
        if (settingsPopup && !settingsPopup.classList.contains('hidden')) {
            settingsPopup.classList.add('hidden');
            draftAudioMix = cloneAudioMix(state.settings.audioMix);
            AudioManager.setMix(state.settings.audioMix);
            setAudioMixerOpen(false);
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

setupClickOutside('settings-popup', () => {
    const settingsPopup = document.getElementById('settings-popup');
    if (settingsPopup) {
        settingsPopup.classList.add('hidden');
        draftAudioMix = cloneAudioMix(state.settings.audioMix);
        AudioManager.setMix(state.settings.audioMix);
        setAudioMixerOpen(false);
    }
});

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

function triggerDoorTransition(onClosed, onOpened) {
    const overlay = transitionOverlay || document.getElementById('transition-overlay');
    if (!overlay) {
        if (onClosed) onClosed();
        if (onOpened) onOpened();
        return;
    }

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
        if (onClosed) onClosed();

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
        }, 300);

        // 5. Cleanup
        setTimeout(() => {
            overlay.classList.remove('visible', 'opening-h', 'active');
        }, 1200);
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
const previewIcon = document.getElementById('char-preview-icon');
const previewSprite = document.getElementById('char-preview-sprite');
const previewDoor = document.getElementById('char-preview-door');
const previewName = document.getElementById('char-preview-name');
const previewSpriteContext = previewSprite?.getContext('2d', { willReadFrequently: true }) ?? null;
const PREVIEW_FRAME_COUNT = 4;
const PREVIEW_FRAME_MS = 140;
const PREVIEW_FRONT_ROW = 0;
const PREVIEW_DOOR_CLOSE_MS = 360;
const PREVIEW_DOOR_HOLD_MS = 220;
const PREVIEW_DOOR_OPEN_MS = 520;
let previewFrameIndex = 0;
let previewAnimationTimer = null;
let previewDoorTimer = null;
let pendingPreviewType = null;
let activePreviewType = 'SCOUT';
const previewSpriteImages = new Map();

const heroData = {
    'SCOUT': { icon: '◈', name: 'SCOUT', sprite: '/scout_walk.png' },
    'TANK': { icon: '⬢', name: 'TANK', sprite: '/tank_walk.png' },
    'ENGINEER': { icon: '⬣', name: 'ENGINEER', sprite: '/engineer_walk.png' }
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

    const frameWidth = Math.floor(image.width / PREVIEW_FRAME_COUNT);
    const frameHeight = Math.floor(image.height / PREVIEW_FRAME_COUNT);
    const sourceX = frameIndex * frameWidth;
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
    if (previewIcon) previewIcon.textContent = data.icon;
    if (previewName) previewName.textContent = data.name;
    previewFrameIndex = 0;
    void renderPreviewFrame(type, previewFrameIndex);
}

function startHeroPreviewAnimation() {
    if (!previewSprite || previewAnimationTimer !== null) return;

    previewAnimationTimer = window.setInterval(() => {
        previewFrameIndex = (previewFrameIndex + 1) % PREVIEW_FRAME_COUNT;
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
            triggerHeroPreviewSwap(type);
            updateHeroStats(type);
            setActiveAmmoCapacity(type, { clampExisting: true });

            if (window.game?.updatePlayerType) {
                const gameContainer = document.getElementById('game-container');
                spawnSectorScanSmoke(gameContainer, 25);
                AudioManager.play('amb_metal_stress1', { volume: 0.4 });
                
                setTimeout(() => {
                    window.game.updatePlayerType(type);
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
        
        // Ensure cursor is visible on desktop move (clearing touch fade states)
        cursor.classList.remove('cursor-fade-out');
        targetScale = 1.0;
        if (touchFadeTimeout) {
            clearTimeout(touchFadeTimeout);
            touchFadeTimeout = null;
        }

        if (!hasMoved) {
            hasMoved = true;
            document.documentElement.classList.add('custom-cursor-enabled');
        }
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

    const storedTouchControls = localStorage.getItem('hunker_touch_controls_enabled');
    if (storedTouchControls !== null) {
        state.settings.touchControls = storedTouchControls === 'true';
    } else {
        state.settings.touchControls = isTouchDevice();
    }
    if (mainTouchToggle) {
        mainTouchToggle.checked = !!state.settings.touchControls;
    }

    // Load audio manifest
    const manifest = {
        images: ['/door.png', '/scout_ship.png', '/tank_ship.png', '/engineer_ship.png'],
        audio: [
            { key: 'amb_bunker_loop', url: '/audio/vg2/amb_bunker_loop.wav' },
            { key: 'mainbg_music', url: '/audio/vg2/mainbg_music.mp3' },
            { key: 'amb_drip1', url: '/audio/vg2/amb_drip1.wav' },
            { key: 'amb_drip2', url: '/audio/vg2/amb_drip2.wav' },
            { key: 'amb_drip3', url: '/audio/vg2/amb_drip3.wav' },
            { key: 'amb_drip4', url: '/audio/vg2/amb_drip4.wav' },
            { key: 'amb_metal_stress1', url: '/audio/vg2/amb_metal_stress1.wav' },
            { key: 'amb_metal_stress2', url: '/audio/vg2/amb_metal_stress2.wav' },
            { key: 'amb_metal_stress3', url: '/audio/vg2/amb_metal_stress3.wav' },
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
            { key: 'class_lock4', url: '/audio/vg2/class_lock4.wav' }
        ]
    };

    // Clicks for generic buttons
    document.querySelectorAll('button, .toggle').forEach(el => {
        if (el.tagName === 'BUTTON' || el.classList.contains('toggle')) {
            el.addEventListener('click', () => {
                if (el.classList.contains('abort-btn')) AudioManager.play('ui_error', { volume: 0.6 });
                else AudioManager.play('ui_click', { volume: 0.6 });
            });
        }
    });

    const { ThreeGame } = await import('./src/threeGame.js');

    // Initialize preview with first selected
    const initialSelected = document.querySelector('.char-card.selected');
    const initialType = initialSelected?.getAttribute('data-type') || 'SCOUT';
    setActiveAmmoCapacity(initialType, { clampExisting: true });
    if (initialSelected && heroData[initialType]) {
        syncHeroPreview(initialType);
        updateHeroStats(initialType);
    }
    startHeroPreviewAnimation();
    if (splashFsToggle) splashFsToggle.checked = false;
    if (splashDebugToggle) splashDebugToggle.checked = false;
    if (mainDebugToggle) mainDebugToggle.checked = false;
    syncTouchSettingsVisibility();
    syncTouchMoveControlVisibility();

    if (!window.game) {
        try {
            window.game = new ThreeGame({
                parent: 'game-container',
                playerType: initialType,
                bankManager
            });
        } catch (err) {
            console.error('[ThreeGame init failed]', err);
            const loadingScreen = document.getElementById('loading-screen');
            const loaderTitle = document.querySelector('.loader-title');
            const loaderStatusEl = document.querySelector('.loader-status');
            if (loaderTitle) loaderTitle.textContent = 'SYSTEM INITIALIZATION FAILED';
            if (loaderStatusEl) loaderStatusEl.textContent = err?.message ?? 'UNKNOWN ERROR — WebGL may be unavailable';
            if (loadingScreen) loadingScreen.classList.remove('hidden');
            return;
        }
    }
    setSnailSpawnState(false, { purgeExisting: true });
    const initialBiomeState = window.game?.getBiomeState?.();
    if (initialBiomeState) {
        renderBiomeStatus(initialBiomeState, { showPrompt: false });
    }
    window.game?.emitVitalsState?.();
    ensureMissionManagers();

    await AudioManager.loadAssets(manifest, (progress, itemName) => {
        if (loaderBar) loaderBar.style.width = `${progress}%`;
        if (loaderStatus && itemName) {
            const parts = itemName.split('/');
            const filename = parts[parts.length - 1];
            loaderStatus.textContent = `LOADING ASSET: ${filename.toUpperCase()}`;
        }
    });

    if (loaderBar) loaderBar.style.width = `100%`;
    if (loaderStatus) loaderStatus.textContent = "[ CLICK ANYWHERE TO INITIALIZE ]";

    document.body.addEventListener('click', async () => {
        if (AudioManager.isUnlocked) return;
        await AudioManager.unlock();

        triggerDoorTransition(
            () => { if (loadingScreen) loadingScreen.classList.add('hidden'); },
            null
        );
    }, { once: true });
});

setDebugMode(false);
