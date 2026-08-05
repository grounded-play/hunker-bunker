/* global __HB_BUILD_INFO__ */
import { AudioManager } from './src/audio.js';
import { assetUrl } from './src/assetUrl.js';
import { debugLog } from './src/debugConsole.js';
import { canUseDeveloperTools } from './src/devToolsAccess.js';
import { ObjectiveRegistry } from './src/objectiveRegistry.js';
import { BankManager, FOUNDRY_ACTIVATION_COST } from './src/bank.js';
import { FabricatorManager, FAB_RECIPES, FAB_SPIN_COST, FABRICATOR_SITE_MAX_USES } from './src/fabricator.js';
import { ProfileManager, clearSaveData, exportSaveCode, importSaveCode } from './src/profile.js';
import { LoadoutManager } from './src/loadout.js';
import { CutsceneManager } from './src/cutscene.js';
import { DEPTH_TIER_NAMES } from './src/data/loot.js';
import { getDeathCinematicSpec, getEventCinematicSpec, normalizeCinematicStillSpec, shouldPlayAuthoredEventCinematic } from './src/cinematicFallback.js';
import { DialogueManager } from './src/dialogue.js';
import { VitalsHUD } from './src/vitals.js';
import { blackBoxStore } from './src/blackBox.js';
import { codexStore, getClassWreckageLog, recordSpecimen0047OriginIfFound } from './src/codex.js';
import { CODEX_ENTRIES, CODEX_CATEGORIES, getCodexEntry, CODEX_TOTAL, LORE_METADATA } from './src/data/codex.js';
import { pickRunModifier } from './src/data/runModifiers.js';
import { pickMissionBriefing } from './src/data/missions.js';
import { DIALOGUE_LINES, getDialogueLine } from './src/data/dialogueLines.js';
import { MOTHERSHIP_REACTIVE_LINES } from './src/data/lineDirectorPools.js';
import { ArcStateManager } from './src/arcState.js';
import { CaveRevealController } from './src/caveReveal.js';
import { Act2Manager, ACT2_ENDING_CUTSCENES, ACT2_LINES, getAct2EndingLines, pickAct2Ending, buildAct2Manifest } from './src/act2.js';
import { ARC_PRELUDE_ENABLED } from './src/featureFlags.js';
import * as featureFlags from './src/featureFlags.js';
import { ACHIEVEMENT_DEFS, AchievementEngine, getAchievementProgress, getSecretGateState, hasAnyUnlock, saveAchievements } from './src/achievements.js';
import { STEAM_RUN_SCORE_FINALIZED_EVENT, buildSteamRunScorePayload, dispatchSteamRunScoreFinalized } from './src/steam/steamEvents.js';
import { syncSteamStats } from './src/steamStats.js';
import { loadRgbSave, saveRgbSave, markUnlocked as markRgbUnlocked, shouldUnlockRgb, unlockChapter as unlockRgbChapter, isChapterUnlocked as isRgbChapterUnlocked } from './src/minigames/rgb/save.js';
import { mountRgb } from './src/minigames/rgb/runtime.js';
import { ENDINGS as RGB_ENDINGS, CHAPTERS as RGB_CHAPTERS, CHAPTER_ORDER as RGB_CHAPTER_ORDER } from './src/minigames/rgb/content.js';
import { mapBrowserGamepad } from './src/browserGamepad.js';
import { getControllerGlyphLabel } from './src/inputGlyphs.js';
import {
    ACTION_SETS,
    actionSetForAppPhase,
    createActionRouter,
    hasControllerContinuePress,
    menuKeyboardDirection,
    wrapMenuIndex,
    shouldPreferBrowserGamepad
} from './src/inputActions.js';
import { STAGE_WIDTH, computeStageTransform } from './src/stage.js';
import { PLAYER_SPRITE_LAYOUTS, getPlayerSpriteLayout } from './src/playerSpriteLayouts.js';
import { repackGeneratedSpriteAtlas } from './src/spriteAtlasRuntime.js';
import { createScoutHeroPreview } from './src/scoutHeroPreview.js';
import { initSteamVaultUI, loadVaultData, openSteamVaultModal, showSteamDropToast, renderSteamMilestoneGrants, STEAM_ITEM_CATALOG } from './src/steamVaultUi.js';
import { renderGameOverLeaderboard } from './src/leaderboardUi.js';
import { OPERATOR_POLISHES, getSelectedPolish, getUnlockedPolishIds, selectPolish, unlockAllPolishes, unlockMilestonePolish } from './src/operatorPolishes.js';
import { STARTING_RUN_AMMO, CLASS_AMMO_CAPACITY } from './src/data/ammoEconomy.js';
import { explainEnding, formatManifestBlocker } from './src/endingExplanations.js';
import { SongInterstitialController, selectCampInterstitial } from './src/songInterstitials.js';
import { dialogueReactionForLine, preloadLeaderMedia, resolveLeaderIdentity } from './src/leaderIdentity.js';
import { LeaderConversation3d } from './src/leaderConversation3d.js';
import {
    computeTopologyDistances,
    findConflictingChunkReservations,
    getMaxUnlockedRing,
    validateRingProgression
} from './src/mazeExpedition.js';
const startBtn = document.getElementById('start-game'); // INITIALIZE button
const titleContinueBtn = document.getElementById('title-continue-btn');
const titleSwitchClassBtn = document.getElementById('title-switch-class-btn');
const titleNewRunBtn = document.getElementById('title-newrun-btn');
const titleAchievementsBtn = document.getElementById('title-achievements-btn');
const titleSettingsBtn = document.getElementById('title-settings-btn');
const titleAboutBtn = document.getElementById('title-about-btn');
const splash = document.getElementById('splash');
const menu = document.getElementById('menu');
const loadingScreen = document.getElementById('loading-screen');
const loaderVersionTag = document.getElementById('loader-version-tag');
const transitionOverlay = document.getElementById('transition-overlay');
const loaderTitle = document.querySelector('.loader-title');
const loaderBar = document.querySelector('.loader-bar');
const loaderStatus = document.querySelector('.loader-status');
const loaderBriefingAvatar = document.getElementById('loader-briefing-avatar');
const loaderBriefingAvatarImg = document.getElementById('loader-briefing-avatar-img');
const loaderBriefingSpeaker = document.getElementById('loader-briefing-speaker');

function syncLoadingCursorSuppression() {
    document.documentElement.classList.toggle(
        'loading-cursor-hidden',
        Boolean(loadingScreen && !loadingScreen.classList.contains('hidden'))
    );
}

if (loadingScreen) {
    new MutationObserver(syncLoadingCursorSuppression).observe(loadingScreen, {
        attributes: true,
        attributeFilter: ['class']
    });
}
syncLoadingCursorSuppression();

const ACTIVE_CLASS_KEY = 'hb_active_class_v1';
const PLAYABLE_CLASSES = Object.freeze(['SCOUT', 'TANK', 'ENGINEER']);

function getSavedHeroType() {
    try {
        const saved = localStorage.getItem(ACTIVE_CLASS_KEY);
        return PLAYABLE_CLASSES.includes(saved) ? saved : 'TANK';
    } catch {
        return 'TANK';
    }
}

function saveHeroType(type) {
    if (!PLAYABLE_CLASSES.includes(type)) return;
    try { localStorage.setItem(ACTIVE_CLASS_KEY, type); } catch { /* storage unavailable */ }
}

const buildInfo = typeof __HB_BUILD_INFO__ === 'object'
    ? __HB_BUILD_INFO__
    : Object.freeze({
        version: 'dev',
        commit: 'unknown',
        branch: 'unknown',
        dirty: true,
        steamBuild: ''
    });
const buildCommitLabel = `${buildInfo.commit}${buildInfo.dirty ? '-dirty' : ''}`;
const pipelineBuildLabel = buildInfo.steamBuild ? ` // PIPELINE ${buildInfo.steamBuild}` : '';
const canonicalVersionText = `BUILD ${buildInfo.version} // ${buildCommitLabel} // ${buildInfo.branch}${pipelineBuildLabel}`;
if (loaderVersionTag) {
    loaderVersionTag.textContent = canonicalVersionText;
    loaderVersionTag.title = `Built ${buildInfo.builtAt ?? 'unknown time'}`;
}
const aboutSysVer = document.getElementById('about-modal-sys-ver');
if (aboutSysVer) {
    aboutSysVer.textContent = canonicalVersionText;
    aboutSysVer.title = `Built ${buildInfo.builtAt ?? 'unknown time'}`;
}

const mainDebugToggle = document.getElementById('main-debug-toggle');
const mainNightVisionToggle = document.getElementById('main-nightvision-toggle');
const mainCommentaryToggle = document.getElementById('main-commentary-toggle');
const gameViewport = document.getElementById('game-viewport');
const gameStageContainer = document.getElementById('game-container');
const desktopCompass = document.getElementById('desktop-compass');
const desktopCompassArrow = document.getElementById('desktop-compass-arrow');
const desktopCompassRadarArrow = document.getElementById('desktop-compass-radar-arrow');
const desktopCompassDistance = document.getElementById('desktop-compass-distance');
const desktopCompassRadarDistance = document.getElementById('desktop-compass-radar-distance');
const desktopCompassRadarRow = document.getElementById('desktop-compass-radar-row');
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
const titleQuitBtn = document.getElementById('title-quit-btn');
const openQuitConfirmBtn = document.getElementById('open-quit-confirm');
const quitConfirmModal = document.getElementById('quit-confirm-modal');
const quitConfirmBtn = document.getElementById('quit-confirm-btn');
const quitCancelBtn = document.getElementById('quit-cancel-btn');
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
const audioVoiceSlider = document.getElementById('audio-voice-slider');
const audioMasterValue = document.getElementById('audio-master-value');
const audioMusicValue = document.getElementById('audio-music-value');
const audioVfxValue = document.getElementById('audio-vfx-value');
const audioVoiceValue = document.getElementById('audio-voice-value');
const audioVoiceToggle = document.getElementById('audio-voice-toggle');
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

// Canonical Steam Deck-first stage: 16:10, authored against 1280x800 logical
// pixels (docs/steam-deck-first-display-and-input-spec.md). --vu is 1/100 of
// stage height, so one logical 1280x800 pixel is --vu / 8.
const DESIGN_STAGE = {
    width: 160,
    height: 100
};
const AUDIO_MIX_STORAGE_KEY = 'hunker_audio_mix_v1';
const LEGACY_AUDIO_TOGGLE_KEY = 'hunker_audio_enabled';
const COMMENTARY_STORAGE_KEY = 'hunker_commentary_enabled';
const DEFAULT_AUDIO_MIX = Object.freeze({
    master: 1,
    music: 1,
    vfx: 1,
    voice: 1,
    voiceEnabled: true
});
const STEAM_STORE_URL = 'https://store.steampowered.com/app/4957040/Hunker_Bunker/';
const KEY_BINDINGS_STORAGE_KEY = 'hunker_key_bindings';
// Each action has a [primary, secondary] slot. WASD + arrow keys are equivalent
// out of the box. threeGame.js reads window.state.settings.keyBindings.
const DEFAULT_KEY_BINDINGS = Object.freeze({
    moveUp: ['KeyW', 'ArrowUp'],
    moveDown: ['KeyS', 'ArrowDown'],
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    interact: ['KeyE', 'Enter'],
    reload: ['KeyR', null],
    melee: ['KeyV', null],
    ability: ['KeyF', null],
    scan: ['KeyQ', null],
    sprint: ['ShiftLeft', 'ShiftRight']
});

let appPhase = 'loading';

function isGameplayPhase() {
    return appPhase === 'gameplay';
}
window.isGameplayPhase = isGameplayPhase;

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
window.isGameplayHudActive = isGameplayHudActive;

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
        'hole-hud-prompt',
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
    const previousPhase = appPhase;
    appPhase = phase;
    window.__hbAppPhase = phase;
    const phaseLabels = {
        boot: 'BOOTSTRAP — renderer and account services starting',
        splash: 'TITLE READY — awaiting operator command',
        menu: 'LOADOUT CONSOLE — operator configuration active',
        gameplay: 'DEPLOYMENT — live simulation and input active',
        gameover: 'RUN COMPLETE — telemetry finalized',
        'demo-end': 'DEMO COMPLETE — session awaiting operator command'
    };
    debugLog.info('PHASE', `${previousPhase ?? 'none'} -> ${phase}: ${phaseLabels[phase] ?? 'application state changed'}`);
    syncSteamInputPhase();
    syncSteamTimelinePhase(phase);
    if (!isGameplayPhase()) {
        if (tacticalOverlayTimer) {
            clearTimeout(tacticalOverlayTimer);
            tacticalOverlayTimer = null;
        }
        hideAllGameplayPrompts();
        hideMissionProgressHUD();
        hideCampQuestHUD();
        hideBiomePrompt();
        clearLoaderBriefingMode();
        window.game?.setInputEnabled?.(false);
    }
    updateQueensLedgerHUD();
}

const STEAM_INPUT_PROMPT_IDS = Object.freeze([
    'console-hud-prompt',
    'lore-hud-prompt',
    'foundry-hud-prompt',
    'o2-generator-hud-prompt',
    'black-box-hud-prompt'
]);

const STEAM_INPUT_FOCUS_ROOT_IDS = Object.freeze([
    'dev-console-modal',
    'confirm-modal',
    'reset-save-confirm-modal',
    'quit-confirm-modal',
    'audio-mixer-popup',
    'save-data-popup',
    'controls-popup',
    'settings-popup',
    'about-modal',
    'archive-log-detail-modal',
    'archive-modal',
    'codex-detail-modal',
    'codex-modal',
    'achievements-modal',
    'roster-modal',
    'fabrication-modal',
    'elevator-choice-modal',
    'archive-sims-modal',
    'lore-modal',
    'steam-vault-modal',
    'operator-polish-modal',
    'tactical-map-modal',
    'base-turret-modal',
    'demo-end-modal',
    'game-over-modal',
    'camp-choice-modal',
    'leader-conversation-modal',
    'mothership-dialogue',
    'console-terminal-modal',
    'o2-generator-modal',
    'snail-encounter-modal',
    'rgb-root',
    'splash',
    'menu'
]);

function closeModalWithAnimation(modal, onComplete, { exitClass = '', duration = 280 } = {}) {
    if (!modal || modal.classList.contains('hidden') || modal.classList.contains('is-exiting')) {
        if (onComplete) onComplete();
        return;
    }
    modal.classList.add('is-exiting');
    if (exitClass) modal.classList.add(exitClass);
    modal.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('is-exiting');
        if (exitClass) modal.classList.remove(exitClass);
        if (onComplete) onComplete();
    }, duration);
}
window.closeModalWithAnimation = closeModalWithAnimation;

const COMMENTARY_ENTRIES = Object.freeze({
    run_start: {
        title: 'The Run Loop',
        body: 'The bunker is built around short pressure cycles: deploy, read the threat, bank what matters, and decide whether one more room is worth it.'
    },
    black_box_signal: {
        title: 'Failure Becomes Map Data',
        body: 'Black boxes make death persistent without making it punitive. A failed run becomes a breadcrumb, a banked lesson, and a reason to go back in.'
    },
    black_box_recovered: {
        title: 'Recoverable Consequences',
        body: 'The black box is meant to feel like contract work, not a reload button. You are collecting evidence from your own mistakes.'
    },
    room_armory: {
        title: 'Armory Rooms',
        body: 'Armories are deliberately loud rewards. They break the procedural rhythm so players can spot a meaningful room before reading any UI.'
    },
    room_the_nest: {
        title: 'Nest Rooms',
        body: 'The nest is an authored danger shape inside a generated map. It says: this was not just rolled, something lives here.'
    },
    room_agent_wreckage: {
        title: 'Three Wrecks',
        body: 'The class wreckage rooms connect the three operators to the larger crash mystery: tracking signal, relay, and weapon, scattered through one disaster.'
    },
    queen_fight: {
        title: 'Queen Fight',
        body: 'The Queen fight uses vulnerability windows so the arena is about reading intent, not only pouring damage into a large health bar.'
    },
    queen_killed: {
        title: 'The Queen Can Die',
        body: 'Combat kills and narrative rejection are tracked separately. The story cares whether you defeated her body or only refused her offer.'
    },
    achievement: {
        title: 'Steam Achievements',
        body: 'Achievements mirror fiction-first milestones. They should read like field records, not chores.'
    },
    leaderboard: {
        title: 'Trusted Scores',
        body: 'Leaderboard scores are recomputed server-side so the client submits a run receipt, not a number we blindly trust.'
    },
    steam_vault: {
        title: 'Steam Vault',
        body: 'The Vault is intentionally read-heavy. Tradable and marketable value belongs in Steam systems; the game renders verified ownership.'
    }
});

const steamInputState = {
    available: false,
    phase: appPhase,
    controllerCount: 0,
    anyInput: false,
    isSteamDeck: false,
    primaryControllerHandle: null,
    primaryControllerType: null,
    controllers: [],
    lastInputMode: 'keyboard'
};

const steamInputPrevControllers = new Map();
const mainActionRouter = createActionRouter();
let steamGamepadTextInputInFlight = false;
let pendingSteamInputBoot = false;
let suppressSteamInputUntilRelease = false;
let lastRequestedSteamInputPhase = null;

window.HunkerTriggerBoot = () => {
    pendingSteamInputBoot = true;
    if (typeof window.game?.setLoadingPaused === 'function') {
        window.game.setLoadingPaused(false);
    }
};

window.HunkerInputState = {
    getPromptKeyText,
    isControllerPrompt: () => isSteamControllerInputActive(),
    getLastInputMode: () => steamInputState.lastInputMode,
    getPrimaryControllerType: () => steamInputState.primaryControllerType,
    getState: () => ({ ...steamInputState })
};

function syncSteamInputPhase(phaseOverride = null) {
    const modalMenuOpen = appPhase !== 'archive' && STEAM_INPUT_FOCUS_ROOT_IDS.some((id) => {
        if (id === 'rgb-root' || id === 'splash' || id === 'menu') return false;
        const element = document.getElementById(id);
        return Boolean(element && !element.classList.contains('hidden'));
    });
    const effectivePhase = phaseOverride
        ?? (modalMenuOpen ? 'menu' : appPhase);
    mainActionRouter.setActionSet(actionSetForAppPhase(effectivePhase));
    if (effectivePhase !== lastRequestedSteamInputPhase) {
        lastRequestedSteamInputPhase = effectivePhase;
        window.electronAPI?.setSteamInputPhase?.(effectivePhase);
    }
}

function syncSteamTimelinePhase(phase = appPhase) {
    if (!window.electronAPI?.setSteamTimelineGameMode) return;
    const mode = phase === 'gameplay' ? 'playing' : phase === 'loading' ? 'loading' : 'menus';
    window.electronAPI.setSteamTimelineGameMode(mode).catch?.(() => {});
}

function recordSteamTimelineEvent(type, title, description, {
    icon = type,
    priority = 0,
    durationSeconds = 5,
    clipPriority = 0
} = {}) {
    if (!window.electronAPI?.addSteamTimelineEvent) return;
    window.electronAPI.addSteamTimelineEvent({
        type,
        icon,
        title,
        description,
        priority,
        durationSeconds,
        clipPriority
    }).catch?.(() => {});
}

function isSteamControllerInputActive() {
    return steamInputState.lastInputMode === 'controller'
        || (steamInputState.isSteamDeck && steamInputState.controllerCount > 0);
}

function getPromptKeyText(defaultKey = 'E', action = 'interact') {
    if (isSteamControllerInputActive()) {
        return getControllerGlyphLabel(action, steamInputState.primaryControllerType, defaultKey);
    }
    return defaultKey;
}

function ensureControllerMenuFocus() {
    if (appPhase === 'gameplay' && Boolean(window.game?.isGameplayInputActive?.())) return;
    syncControllerFocusBoundary();
}

function clearHeldApplicationInput() {
    window.game?.clearGameplayInputState?.();
}

window.addEventListener('blur', clearHeldApplicationInput);
window.addEventListener('focus', () => {
    window.requestAnimationFrame(ensureControllerMenuFocus);
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearHeldApplicationInput();
        return;
    }
    window.requestAnimationFrame(ensureControllerMenuFocus);
});

function setLastInputMode(mode, { refresh = true } = {}) {
    const normalized = mode === 'controller' ? 'controller' : 'keyboard';
    const changed = steamInputState.lastInputMode !== normalized;
    steamInputState.lastInputMode = normalized;

    const isController = isSteamControllerInputActive();
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('controller-mode', isController);
    }

    if (changed && refresh) refreshInteractivePromptKeys();
    if (isController) ensureControllerMenuFocus();
    return changed;
}

function setPromptKeyLabel(promptKey, defaultKey = 'E') {
    if (!promptKey) return;
    const label = getPromptKeyText(defaultKey);
    promptKey.dataset.defaultKey = defaultKey;

    const isController = isSteamControllerInputActive();
    promptKey.classList.toggle('prompt-key--controller', isController);

    if (isController && (label === 'A' || label === 'B' || label === 'X' || label === 'Y')) {
        promptKey.innerHTML = `PRESS <span class="controller-glyph glyph-${label.toLowerCase()}">${label}</span>`;
    } else {
        promptKey.textContent = label === 'TAP' ? 'TAP' : `PRESS ${label}`;
    }
    promptKey.classList.toggle('prompt-key--tap', label === 'TAP');
}

function refreshInteractivePromptKeys() {
    for (const id of STEAM_INPUT_PROMPT_IDS) {
        const prompt = document.getElementById(id);
        if (!prompt || prompt.classList.contains('hidden')) continue;
        const promptKey = prompt.querySelector('.prompt-key');
        if (promptKey) setPromptKeyLabel(promptKey, promptKey.dataset.defaultKey || 'E');
    }
}

function isElementVisible(element) {
    return Boolean(element && element.getClientRects().length > 0);
}

function getVisibleControllerFocusables(root = document) {
    if (!root) return [];
    const selector = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'a[href]',
        '[role="button"]',
        '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    return Array.from(root.querySelectorAll(selector)).filter((element) => {
        if (!isElementVisible(element)) return false;
        if (element.closest('.hidden')) return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;
        return true;
    });
}

function getInputType(element) {
    return String(element?.getAttribute?.('type') ?? '').trim().toLowerCase();
}

function isTextEditableElement(element) {
    if (!element) return false;
    if (element.matches?.('textarea')) return true;
    if (element.matches?.('input')) {
        const type = getInputType(element);
        return !type || ['text', 'search', 'url', 'tel', 'email', 'password', 'number'].includes(type);
    }
    return Boolean(element.isContentEditable);
}

function isRangeInputElement(element) {
    return Boolean(element?.matches?.('input')) && getInputType(element) === 'range';
}

function adjustRangeInputValue(element, direction) {
    if (!isRangeInputElement(element)) return false;

    const min = Number.parseFloat(element.min);
    const max = Number.parseFloat(element.max);
    const current = Number.parseFloat(element.value);
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : 100;
    let step = Number.parseFloat(element.step);
    if (!Number.isFinite(step) || step <= 0) {
        step = Math.max((safeMax - safeMin) / 100, 1);
    }

    const nextValue = Math.min(safeMax, Math.max(safeMin, (Number.isFinite(current) ? current : safeMin) + (step * direction)));
    if (element.value !== String(nextValue)) {
        element.value = String(nextValue);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
}

function adjustSelectValue(element, direction) {
    if (!element?.matches?.('select') || !element.options?.length) return false;
    const currentIndex = Math.max(0, element.selectedIndex);
    const nextIndex = wrapMenuIndex(currentIndex, direction, element.options.length);
    if (nextIndex === element.selectedIndex) return true;
    element.selectedIndex = nextIndex;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function getControllerFocusRoot() {
    for (const id of STEAM_INPUT_FOCUS_ROOT_IDS) {
        const element = document.getElementById(id);
        if (element && !element.classList.contains('hidden') && isElementVisible(element)) {
            return element;
        }
    }

    if (document.body.classList.contains('mission-intro-active')) {
        return document.body;
    }

    return null;
}

function getPreferredControllerFocusTarget(root, focusables) {
    if (!focusables.length) return null;
    if (root?.id === 'splash') {
        return focusables.find((element) => element.id === 'title-newrun-btn' && !element.disabled)
            ?? focusables.find((element) => element.id === 'title-continue-btn' && !element.disabled)
            ?? focusables[0];
    }
    if (root?.id === 'menu') {
        return focusables.find((element) => element.classList?.contains('char-card') && element.classList.contains('selected'))
            ?? focusables.find((element) => element.id === 'start-game')
            ?? focusables[0];
    }
    if (root?.id === 'operator-polish-modal') {
        return focusables.find((element) => element.classList?.contains('operator-polish-chip') && element.classList.contains('is-selected'))
            ?? focusables.find((element) => element.classList?.contains('operator-polish-chip'))
            ?? focusables[0];
    }
    if (root?.id === 'settings-popup') {
        return focusables.find((element) => element.id === 'setting-resolution')
            ?? focusables.find((element) => element.closest?.('.setting-item'))
            ?? focusables[0];
    }
    if (root?.id === 'mothership-dialogue') {
        return focusables.find((element) => element.id === 'mothership-choice-skip' && isElementVisible(element))
            ?? focusables.find((element) => element.id === 'mothership-choice-tutorial' && isElementVisible(element))
            ?? focusables[0];
    }
    return focusables[0];
}

let activeControllerFocusRoot = null;
const controllerFocusMemory = new WeakMap();
const controllerFocusInvokers = new WeakMap();

function centerSettingsFocusTarget(target) {
    const popup = target?.closest?.('#settings-popup');
    const scroller = popup?.querySelector?.('.settings-modal-content');
    if (!scroller) return false;

    if (target.closest('.settings-sticky-header')) {
        scroller.scrollTop = 0;
        return true;
    }

    const row = target.closest('.setting-item') ?? target;
    const scrollerRect = scroller.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const headerHeight = scroller.querySelector('.settings-sticky-header')?.getBoundingClientRect().height ?? 0;
    const usableHeight = Math.max(0, scroller.clientHeight - headerHeight);
    const rowCenterInScroller = (rowRect.top - scrollerRect.top) + scroller.scrollTop + (rowRect.height / 2);
    const desiredCenter = headerHeight + (usableHeight / 2);
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = Math.min(maxScroll, Math.max(0, rowCenterInScroller - desiredCenter));
    return true;
}

function focusControllerTarget(target, { playHover = false } = {}) {
    if (!target) return false;
    const previous = document.activeElement;
    try {
        target.focus?.({ preventScroll: true });
    } catch {
        target.focus?.();
    }
    if (!centerSettingsFocusTarget(target)) {
        target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    if (playHover && previous !== target) {
        AudioManager.play('ui_hover', { volume: 0.12, varyPitch: true });
    }
    return true;
}

function isModalFocusRoot(root) {
    return Boolean(root && root !== document.body && root.id !== 'splash' && root.id !== 'menu');
}

function syncControllerFocusBoundary() {
    const nextRoot = getControllerFocusRoot();
    const active = document.activeElement;
    let closingInvoker = null;

    if (nextRoot !== activeControllerFocusRoot) {
        if (isModalFocusRoot(nextRoot) && active && active !== document.body && !nextRoot.contains(active)) {
            controllerFocusInvokers.set(nextRoot, active);
        }
        if (isModalFocusRoot(activeControllerFocusRoot)) {
            closingInvoker = controllerFocusInvokers.get(activeControllerFocusRoot) ?? null;
        }
        if (activeControllerFocusRoot?.contains?.(active)) {
            controllerFocusMemory.set(activeControllerFocusRoot, active);
        }
        activeControllerFocusRoot = nextRoot;
    }

    if (!nextRoot) return null;
    if (active && active !== document.body && nextRoot.contains(active)) return active;

    const focusables = getVisibleControllerFocusables(nextRoot);
    const remembered = controllerFocusMemory.get(nextRoot);
    const target = closingInvoker && focusables.includes(closingInvoker)
        ? closingInvoker
        : remembered && focusables.includes(remembered)
            ? remembered
            : getPreferredControllerFocusTarget(nextRoot, focusables);
    if (target) focusControllerTarget(target);
    return target ?? null;
}

function moveControllerFocus(delta) {
    const root = getControllerFocusRoot();
    const focusables = getVisibleControllerFocusables(root ?? document);
    if (!focusables.length) return null;

    let index = focusables.indexOf(document.activeElement);
    if (index < 0 || (root && !root.contains(document.activeElement))) {
        const preferred = getPreferredControllerFocusTarget(root, focusables);
        if (preferred) {
            index = focusables.indexOf(preferred);
        } else {
            index = 0;
        }
    } else {
        index = (index + delta + focusables.length) % focusables.length;
    }

    const target = focusables[index] ?? null;
    focusControllerTarget(target, { playHover: true });
    return target;
}

let lastHeroMenuCommandFocus = null;

function moveHeroSelectPanelFocus(code) {
    const active = document.activeElement;
    const isLeft = code === 'KeyA' || code === 'ArrowLeft';
    const isRight = code === 'KeyD' || code === 'ArrowRight';
    const isUp = code === 'KeyW' || code === 'ArrowUp';
    const isDown = code === 'KeyS' || code === 'ArrowDown';
    if (!isLeft && !isRight && !isUp && !isDown) return false;

    const commandRail = active?.closest?.('.menu-header-actions');
    const heroRail = active?.closest?.('.char-selection');
    const previewRail = active?.closest?.('.preview-box');
    const initializeButton = active?.id === 'start-game';
    const settingsButton = active?.closest?.('.menu-corner-settings .open-settings-btn');
    const selectedHero = document.querySelector('.char-selection .char-card.selected')
        ?? document.querySelector('.char-selection .char-card');

    if (settingsButton) {
        const target = isLeft
            ? document.getElementById('hero-polish-btn')
            : (isDown ? selectedHero : null);
        return target ? focusControllerTarget(target, { playHover: true }) : true;
    }

    if (initializeButton) {
        if (isRight) {
            return focusControllerTarget(document.getElementById('hero-polish-btn'), { playHover: true });
        }
        if (isDown) {
            return selectedHero ? focusControllerTarget(selectedHero, { playHover: true }) : true;
        }
        const visibleCommands = getVisibleControllerFocusables(document.querySelector('.menu-header-actions'));
        const target = lastHeroMenuCommandFocus && visibleCommands.includes(lastHeroMenuCommandFocus)
            ? lastHeroMenuCommandFocus
            : visibleCommands.at(-1);
        return target ? focusControllerTarget(target, { playHover: true }) : true;
    }

    if (commandRail) {
        lastHeroMenuCommandFocus = active;
        if (!isRight) return true;
        const target = document.getElementById('hero-polish-btn')
            ?? document.querySelector('.char-selection .char-card.selected')
            ?? document.querySelector('.char-selection .char-card')
            ?? document.getElementById('start-game');
        return target ? focusControllerTarget(target, { playHover: true }) : true;
    }

    if (heroRail) {
        const cards = getVisibleControllerFocusables(heroRail).filter((element) => element.classList.contains('char-card'));
        const index = Math.max(0, cards.indexOf(active));
        let target = null;
        if (isUp && index === 0) target = document.querySelector('#menu .menu-corner-settings .open-settings-btn');
        else if (isUp) target = cards[index - 1];
        else if (isDown) target = cards[index + 1] ?? document.getElementById('start-game');
        else if (isLeft) target = document.getElementById('hero-polish-btn');
        else if (isRight) target = document.querySelector('#menu .menu-corner-settings .open-settings-btn');
        return target ? focusControllerTarget(target, { playHover: true }) : true;
    }

    if (previewRail) {
        const target = isRight
            ? (selectedHero ?? document.getElementById('start-game'))
            : isLeft
                ? (lastHeroMenuCommandFocus ?? getVisibleControllerFocusables(document.querySelector('.menu-header-actions'))[0])
                : isUp
                    ? document.querySelector('#menu .menu-corner-settings .open-settings-btn')
                    : document.getElementById('start-game');
        return target ? focusControllerTarget(target, { playHover: true }) : true;
    }

    return false;
}

function moveMenuDirectionalFocus(code) {
    if (moveMenuCommandGridFocus(code)) return true;
    if (moveHeroSelectPanelFocus(code)) return true;
    const direction = menuKeyboardDirection(code);
    return direction ? Boolean(moveControllerFocus(direction)) : false;
}

function moveOperatorPolishGridFocus(code) {
    const active = document.activeElement;
    if (!active?.classList?.contains('operator-polish-chip')) return false;
    const chips = Array.from(document.querySelectorAll('#operator-polish-grid .operator-polish-chip'));
    const index = chips.indexOf(active);
    if (index < 0 || !chips.length) return false;

    const columnCount = 4;
    let nextIndex = index;
    if (code === 'KeyA' || code === 'ArrowLeft') nextIndex = index % columnCount === 0 ? index + columnCount - 1 : index - 1;
    if (code === 'KeyD' || code === 'ArrowRight') nextIndex = index % columnCount === columnCount - 1 ? index - columnCount + 1 : index + 1;
    if (code === 'KeyW' || code === 'ArrowUp') nextIndex = (index - columnCount + chips.length) % chips.length;
    if (code === 'KeyS' || code === 'ArrowDown') nextIndex = (index + columnCount) % chips.length;
    return focusControllerTarget(chips[nextIndex], { playHover: true });
}

function moveMenuCommandGridFocus(code) {
    const active = document.activeElement;
    if (active?.id === 'start-game') {
        if (code !== 'KeyW' && code !== 'ArrowUp') return false;
        const visibleCommands = getVisibleControllerFocusables(document.querySelector('.menu-header-actions'));
        const target = lastHeroMenuCommandFocus && visibleCommands.includes(lastHeroMenuCommandFocus)
            ? lastHeroMenuCommandFocus
            : visibleCommands.at(-1);
        return target ? focusControllerTarget(target, { playHover: true }) : true;
    }
    const activeColumn = active?.closest?.('.menu-command-column');
    if (!activeColumn) return false;

    const columns = Array.from(document.querySelectorAll('#menu .menu-command-column'));
    if (!columns.includes(activeColumn)) return false;

    const focusablesFor = (column) => getVisibleControllerFocusables(column).filter((element) => (
        element.matches('button, .steam-account-badge--menu')
    ));
    const currentItems = focusablesFor(activeColumn);
    if (!currentItems.length) return false;
    const columnIndex = columns.indexOf(activeColumn);
    const rowIndex = Math.max(0, currentItems.indexOf(active));
    let target = null;

    if (code === 'KeyW' || code === 'ArrowUp') {
        target = currentItems[(rowIndex - 1 + currentItems.length) % currentItems.length];
    } else if (code === 'KeyS' || code === 'ArrowDown') {
        if (rowIndex === currentItems.length - 1) {
            lastHeroMenuCommandFocus = active;
            target = document.getElementById('start-game');
        } else {
            target = currentItems[rowIndex + 1];
        }
    } else if (code === 'KeyA' || code === 'ArrowLeft') {
        if (columnIndex === 0) return false;
        const adjacentItems = focusablesFor(columns[columnIndex - 1]);
        target = adjacentItems[Math.min(rowIndex, adjacentItems.length - 1)];
    } else if (code === 'KeyD' || code === 'ArrowRight') {
        if (columnIndex === columns.length - 1) return false;
        const adjacentItems = focusablesFor(columns[columnIndex + 1]);
        target = adjacentItems[Math.min(rowIndex, adjacentItems.length - 1)];
    }

    return target ? focusControllerTarget(target, { playHover: true }) : false;
}

// Keyboard-style Steam Deck layouts must be able to operate every menu even
// when the native Steam Input action manifest has not been published yet.
// Treat WASD like the directional pad; on a vertical menu A/W move up and
// D/S move down. Enter or Space activates the focused item.
document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    const activeTextInput = isTextEditableElement(document.activeElement) ? document.activeElement : null;
    if (activeTextInput?.dataset.menuTextEditing === 'true') {
        if (event.code === 'Escape') {
            event.preventDefault();
            activeTextInput.dataset.menuTextEditing = 'false';
            activeTextInput.classList.remove('is-menu-text-editing');
        }
        return;
    }
    const root = getControllerFocusRoot();
    if (!root) return;

    // Gameplay remains live unless a modal owns focus. This lets Settings and
    // every nested submenu use Deck/keyboard navigation when opened in-run.
    if (appPhase === 'gameplay' && !isModalFocusRoot(root)) return;

    const direction = menuKeyboardDirection(event.code);
    if (direction) {
        event.preventDefault();
        if (root.id === 'operator-polish-modal' && moveOperatorPolishGridFocus(event.code)) return;
        if (root.id === 'menu' && moveMenuDirectionalFocus(event.code)) return;
        const horizontal = ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(event.code);
        const active = document.activeElement;
        const adjusted = horizontal && (
            adjustRangeInputValue(active, direction)
            || adjustSelectValue(active, direction)
        );
        if (!adjusted) moveControllerFocus(direction);
    } else if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        activateControllerFocusedElement();
    } else if (activeTextInput) {
        // A text field reached through menu navigation is only selected, not
        // editing. Confirm/A explicitly enters editing or opens Deck input.
        event.preventDefault();
    }
}, { capture: true });

document.addEventListener('pointerdown', (event) => {
    const input = event.target?.closest?.('input, textarea');
    if (!isTextEditableElement(input)) return;
    input.dataset.menuTextEditing = 'true';
    input.classList.add('is-menu-text-editing');
});

document.addEventListener('focusout', (event) => {
    if (!isTextEditableElement(event.target)) return;
    event.target.dataset.menuTextEditing = 'false';
    event.target.classList.remove('is-menu-text-editing');
});

document.addEventListener('focusin', (event) => {
    const root = getControllerFocusRoot();
    if (!root) return;
    if (root !== activeControllerFocusRoot || (isModalFocusRoot(root) && !root.contains(event.target))) {
        syncControllerFocusBoundary();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const root = getControllerFocusRoot();
    if (!isModalFocusRoot(root)) return;
    const focusables = getVisibleControllerFocusables(root);
    if (!focusables.length) {
        event.preventDefault();
        return;
    }
    const currentIndex = focusables.indexOf(document.activeElement);
    const nextIndex = currentIndex < 0
        ? 0
        : (currentIndex + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
    event.preventDefault();
    focusControllerTarget(focusables[nextIndex]);
});

const controllerFocusObserver = new MutationObserver(() => {
    queueMicrotask(() => {
        const root = getControllerFocusRoot();
        syncSteamInputPhase();
        if (root !== activeControllerFocusRoot || isSteamControllerInputActive() || isModalFocusRoot(root)) {
            syncControllerFocusBoundary();
        }
    });
});
controllerFocusObserver.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-hidden']
});

async function openSteamGamepadTextInputForElement(element, {
    description = 'Enter text',
    maxCharacters = 32,
    multiline = false,
    password = false
} = {}) {
    if (!element || !window.electronAPI?.showGamepadTextInput) return false;
    if (!isSteamControllerInputActive()) return false;
    if (steamGamepadTextInputInFlight) return true;

    steamGamepadTextInputInFlight = true;
    try {
        const existingText = typeof element.value === 'string'
            ? element.value
            : typeof element.textContent === 'string'
                ? element.textContent
                : '';
        const result = await window.electronAPI.showGamepadTextInput(
            password ? 1 : 0,
            multiline ? 1 : 0,
            description,
            maxCharacters,
            existingText
        );
        if (typeof result === 'string' && document.contains(element)) {
            element.value = result;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
    } finally {
        steamGamepadTextInputInFlight = false;
    }
}

function activateControllerFocusedElement() {
    const root = getControllerFocusRoot();
    const focusables = getVisibleControllerFocusables(root ?? document);
    let activeElement = document.activeElement;
    if (!activeElement || activeElement === document.body || (root && !root.contains(activeElement))) {
        activeElement = getPreferredControllerFocusTarget(root, focusables);
        if (activeElement) focusControllerTarget(activeElement);
    }

    if (!activeElement) return false;

    if (isTextEditableElement(activeElement)) {
        const usesSteamKeyboard = Boolean(isSteamControllerInputActive() && window.electronAPI?.showGamepadTextInput);
        activeElement.dataset.menuTextEditing = 'true';
        activeElement.classList.add('is-menu-text-editing');
        const inputPromise = openSteamGamepadTextInputForElement(activeElement, {
            description: activeElement.getAttribute('aria-label')
                || activeElement.getAttribute('placeholder')
                || 'Enter text',
            maxCharacters: Number(activeElement.getAttribute('maxlength')) || (activeElement.tagName === 'TEXTAREA' ? 1024 : 32),
            multiline: activeElement.tagName === 'TEXTAREA'
        });
        if (usesSteamKeyboard) {
            void inputPromise.finally(() => {
                activeElement.dataset.menuTextEditing = 'false';
                activeElement.classList.remove('is-menu-text-editing');
            });
        }
        return true;
    }

    if (isRangeInputElement(activeElement)) {
        focusControllerTarget(activeElement);
        return true;
    }

    if (typeof activeElement.click === 'function') {
        activeElement.click();
        return true;
    }

    return false;
}

function dispatchControllerEscape() {
    const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(escapeEvent);
}

function triggerControllerPauseAction() {
    const settingsPopup = document.getElementById('settings-popup');
    if (settingsPopup && !settingsPopup.classList.contains('hidden')) {
        dispatchControllerEscape();
        return true;
    }
    const activeModal = STEAM_INPUT_FOCUS_ROOT_IDS
        .map((id) => document.getElementById(id))
        .find((element) => element && !element.classList.contains('hidden') && element !== settingsPopup);
    if (activeModal) {
        dispatchControllerEscape();
        return true;
    }
    document.querySelector('.open-settings-btn')?.click();
    return true;
}

function handleSteamInputSnapshot(snapshot = {}) {
    const previousPhase = steamInputState.phase;
    const previousMode = steamInputState.lastInputMode;
    const previousPrimaryType = steamInputState.primaryControllerType;
    const controllers = Array.isArray(snapshot.controllers) ? snapshot.controllers : [];

    steamInputState.available = Boolean(snapshot.available);
    steamInputState.phase = snapshot.phase ?? steamInputState.phase;
    steamInputState.controllerCount = Number(snapshot.controllerCount) || 0;
    steamInputState.anyInput = Boolean(snapshot.anyInput);
    steamInputState.isSteamDeck = Boolean(snapshot.isSteamDeck);
    steamInputState.primaryControllerHandle = snapshot.primaryControllerHandle ?? null;
    steamInputState.primaryControllerType = snapshot.primaryControllerType ?? null;
    steamInputState.controllers = controllers;

    if (steamInputState.anyInput) {
        setLastInputMode('controller', { refresh: false });
    } else if (steamInputState.controllerCount === 0 && steamInputState.lastInputMode === 'controller') {
        setLastInputMode('keyboard', { refresh: false });
    }

    if (previousPhase !== steamInputState.phase) {
        steamInputPrevControllers.clear();
    }
    if (previousMode !== steamInputState.lastInputMode || previousPrimaryType !== steamInputState.primaryControllerType) {
        refreshInteractivePromptKeys();
    }

    if (steamInputState.anyInput && (!window.AudioManager?.isUnlocked || !window.game)) {
        suppressSteamInputUntilRelease = true;
        window.HunkerTriggerBoot?.();
        return;
    }

    if (suppressSteamInputUntilRelease) {
        if (steamInputState.anyInput) return;
        suppressSteamInputUntilRelease = false;
        steamInputPrevControllers.clear();
        return;
    }

    let activeController = controllers.find((controller) => controller.active) ?? controllers[0] ?? null;
    if (!activeController) {
        if (window.game?.setVirtualInput) window.game.setVirtualInput(0, 0);
        return;
    }

    // Preserve movement on Deck configurations where Steam exposes the aim
    // action but leaves the native move action neutral. Only borrow Chromium's
    // physical left-stick axes; all buttons and aiming remain native actions.
    if (steamInputState.phase === 'gameplay' && Math.hypot(
        Number(activeController.move?.x) || 0,
        Number(activeController.move?.y) || 0
    ) <= 0.18) {
        const browserMovement = getBrowserGamepadControllers().find((controller) => (
            Math.hypot(Number(controller.move?.x) || 0, Number(controller.move?.y) || 0) > 0.18
        ));
        if (browserMovement) activeController = { ...activeController, move: browserMovement.move };
    }

    steamInputPrevControllers.set(activeController.handle, steamInputPrevControllers.get(activeController.handle) ?? {});

    const gameplayActive = Boolean(window.game?.isGameplayInputActive?.());
    routeMainControllerInput(activeController, steamInputState.phase === 'gameplay' && gameplayActive);
}

function updateControllerInputMemory(controller, nextState) {
    steamInputPrevControllers.set(controller.handle, { ...nextState });
}

function handleControllerTabNavigation(root, direction) {
    if (!root) return false;
    const tabs = Array.from(root.querySelectorAll('.tab-btn, .vault-tab-btn, .terminal-tab-btn, [role="tab"], .category-btn, .sub-tab-btn, .rgb-path-btn'))
        .filter((el) => isElementVisible(el) && !el.disabled);
    if (tabs.length < 2) return false;

    let activeIndex = tabs.findIndex((el) => el.classList.contains('active') || el.classList.contains('selected') || el.getAttribute('aria-selected') === 'true' || el === document.activeElement);
    if (activeIndex < 0) activeIndex = 0;

    const nextIndex = (activeIndex + direction + tabs.length) % tabs.length;
    const targetTab = tabs[nextIndex];
    if (targetTab) {
        targetTab.click();
        focusControllerTarget(targetTab, { playHover: true });
        return true;
    }
    return false;
}

let virtualGamepadCursor = null;

function ensureVirtualGamepadCursor() {
    if (virtualGamepadCursor || typeof document === 'undefined') return virtualGamepadCursor;
    virtualGamepadCursor = document.createElement('div');
    virtualGamepadCursor.id = 'virtual-gamepad-cursor';
    virtualGamepadCursor.className = 'virtual-gamepad-cursor hidden';
    virtualGamepadCursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#ff9f1c" stroke-width="2" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="3" fill="#ff9f1c"/></svg>`;
    document.body.appendChild(virtualGamepadCursor);
    return virtualGamepadCursor;
}

function updateVirtualGamepadCursorPosition(clientX, clientY, visible = true) {
    const cursor = ensureVirtualGamepadCursor();
    if (!cursor) return;
    const isMovie = Boolean(document.querySelector(
        '.fullscreen-video-overlay:not(.hidden), '
        + '.cinematic-overlay:not(.hidden), '
        + '.class-intro-overlay:not(.is-closing), '
        + '.cinematic-still-overlay:not(.is-closing), '
        + '#cutscene-overlay.is-active, '
        + '.rgb-cinematic--visible'
    ));
    if (!visible || isMovie) {
        cursor.classList.add('hidden');
        return;
    }
    cursor.classList.remove('hidden');
    cursor.style.transform = `translate3d(${clientX - 12}px, ${clientY - 12}px, 0)`;
}

function handleSteamMenuInput(actions) {
    const pointerX = Number(actions.pointer?.x) || 0;
    const pointerY = Number(actions.pointer?.y) || 0;
    const pointerMag = Math.hypot(pointerX, pointerY);
    const deltaY = Number(actions.cameraDelta?.y) || 0;
    const deltaX = Number(actions.cameraDelta?.x) || 0;
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 800;

    if (!controllerAimCursor) {
        controllerAimCursor = { x: width / 2, y: height / 2 };
    }

    if (pointerMag > 0.15 || Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        const sensitivity = state.settings.aimSensitivity ?? 1.0;
        const invertSign = state.settings.invertAimY ? -1 : 1;
        if (pointerMag > 0.15) {
            const cursorSpeed = 16 * sensitivity;
            controllerAimCursor.x = Math.min(width - 4, Math.max(4, controllerAimCursor.x + (pointerX * cursorSpeed)));
            controllerAimCursor.y = Math.min(height - 4, Math.max(4, controllerAimCursor.y + (pointerY * cursorSpeed * invertSign)));
        } else if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            controllerAimCursor.x = Math.min(width - 4, Math.max(4, controllerAimCursor.x + (deltaX * sensitivity)));
            controllerAimCursor.y = Math.min(height - 4, Math.max(4, controllerAimCursor.y + (deltaY * sensitivity * invertSign)));
        }

        updateVirtualGamepadCursorPosition(controllerAimCursor.x, controllerAimCursor.y, true);

        // Smooth scroll active or hovered container
        const scrollValue = (pointerY * 20) || (-deltaY * 20);
        if (Math.abs(scrollValue) > 0.5) {
            const elAtPoint = document.elementFromPoint(controllerAimCursor.x, controllerAimCursor.y);
            const root = getControllerFocusRoot() ?? document.body;
            const scrollContainer = elAtPoint?.closest?.('.modal-content, .settings-modal-content, .controls-list, .mothership-dialogue-body, .codex-modal-content, .archive-log-list')
                || root.querySelector?.('.settings-modal-content, .modal-content, .controls-list, .mothership-dialogue-body, .codex-modal-content, .archive-log-list')
                || (root.scrollHeight > root.clientHeight ? root : null);

            if (scrollContainer) {
                scrollContainer.scrollTop += scrollValue;
            }
        }

        // Hover element focus
        const hovered = document.elementFromPoint(controllerAimCursor.x, controllerAimCursor.y);
        const focusable = hovered?.closest?.('button, select, input, a, [tabindex]:not([tabindex="-1"]), .setting-item');
        if (focusable) {
            const target = focusable.matches('button, select, input, a') ? focusable : focusable.querySelector('button, select, input, a');
            if (target && target !== document.activeElement) {
                focusControllerTarget(target, { playHover: true });
            }
        }
    }

    const moved = Boolean(actions.up || actions.down || actions.left || actions.right);
    const activeElement = document.activeElement;
    const rangeAdjusted = Boolean(activeElement && isRangeInputElement(activeElement) && (
        (actions.left && adjustRangeInputValue(activeElement, -1))
        || (actions.right && adjustRangeInputValue(activeElement, 1))
    ));

    const root = getControllerFocusRoot();
    if (!document.activeElement || document.activeElement === document.body || !root?.contains?.(document.activeElement)) {
        const focusables = getVisibleControllerFocusables(root ?? document);
        const preferred = getPreferredControllerFocusTarget(root, focusables);
        if (preferred) focusControllerTarget(preferred);
    } else if (actions.tabLeft) {
        handleControllerTabNavigation(root, -1);
    } else if (actions.tabRight) {
        handleControllerTabNavigation(root, 1);
    } else if (moved && !rangeAdjusted) {
        const code = actions.up
            ? 'ArrowUp'
            : actions.down
                ? 'ArrowDown'
                : actions.left
                    ? 'ArrowLeft'
                    : 'ArrowRight';
        if (root?.id === 'menu') moveMenuDirectionalFocus(code);
        else moveControllerFocus((actions.up || actions.left) ? -1 : 1);
    }

    if (actions.confirm) {
        activateControllerFocusedElement();
    }
    if (actions.back) {
        updateVirtualGamepadCursorPosition(0, 0, false);
        dispatchControllerEscape();
    }
    if (actions.pause) triggerControllerPauseAction();
}

window.addEventListener('gamepad-menu-nav', (event) => {
    const action = event.detail?.action;
    if (!action) return;

    setLastInputMode('controller');
    if (action === 'menu_up' || action === 'menu_left' || action === 'menu_down' || action === 'menu_right') {
        const codeByAction = {
            menu_up: 'ArrowUp',
            menu_down: 'ArrowDown',
            menu_left: 'ArrowLeft',
            menu_right: 'ArrowRight'
        };
        const root = getControllerFocusRoot();
        if (root?.id === 'menu') moveMenuDirectionalFocus(codeByAction[action]);
        else moveControllerFocus(action === 'menu_up' || action === 'menu_left' ? -1 : 1);
    } else if (action === 'menu_confirm') {
        activateControllerFocusedElement();
    } else if (action === 'menu_back') {
        dispatchControllerEscape();
    }
});

// Trackpad and gyro aim arrive as per-frame mouse deltas rather than a stick
// position, so they drive a virtual cursor that feeds the same screen->world
// raycast a real mouse uses. Deltas are already in pixels; the sensitivity knob
// on the Steam side does the heavy lifting, so this stays 1:1 by default.
const CONTROLLER_CURSOR_SENSITIVITY = 1;
let controllerAimCursor = null;
let lastPlayerAnchor = null;

function getAimCursorAnchor() {
    const playerPt = window.game?.getPlayerScreenPoint?.();
    if (playerPt && Number.isFinite(playerPt.viewportX) && Number.isFinite(playerPt.viewportY)) {
        return { x: playerPt.viewportX, y: playerPt.viewportY };
    }
    const width = window.innerWidth || 1280;
    const height = window.innerHeight || 720;
    return { x: width / 2, y: height / 2 };
}

function applyControllerCursorAim(controller) {
    const deltaX = Number(controller.cameraDelta?.x) || 0;
    const deltaY = Number(controller.cameraDelta?.y) || 0;
    // Sub-pixel motion is sensor noise, not a gesture.
    if (Math.hypot(deltaX, deltaY) < 1) return false;
    if (typeof window.game?.updateAimFromClient !== 'function') return false;

    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    if (!width || !height) return false;

    const anchor = getAimCursorAnchor();
    if (!controllerAimCursor) {
        controllerAimCursor = { x: anchor.x, y: anchor.y };
    } else if (lastPlayerAnchor) {
        const playerMovedX = anchor.x - lastPlayerAnchor.x;
        const playerMovedY = anchor.y - lastPlayerAnchor.y;
        controllerAimCursor.x += playerMovedX;
        controllerAimCursor.y += playerMovedY;
    }
    lastPlayerAnchor = { ...anchor };

    const sensitivity = state.settings.aimSensitivity ?? 1.0;
    const invertSign = state.settings.invertAimY ? -1 : 1;
    controllerAimCursor.x = Math.min(width, Math.max(0, controllerAimCursor.x + (deltaX * CONTROLLER_CURSOR_SENSITIVITY * sensitivity)));
    controllerAimCursor.y = Math.min(height, Math.max(0, controllerAimCursor.y + (deltaY * CONTROLLER_CURSOR_SENSITIVITY * sensitivity * invertSign)));

    window.dispatchEvent(new MouseEvent('mousemove', {
        clientX: controllerAimCursor.x,
        clientY: controllerAimCursor.y,
        bubbles: true
    }));
    updateVirtualGamepadCursorPosition(controllerAimCursor.x, controllerAimCursor.y, true);

    return Boolean(window.game.updateAimFromClient(
        controllerAimCursor.x,
        controllerAimCursor.y,
        { keepMouseActive: true }
    ));
}

function handleSteamGameplayInput(controller) {
    const prev = steamInputPrevControllers.get(controller.handle) ?? {};
    const moveX = Math.abs(Number(controller.move?.x) || 0) > 0.18 ? Number(controller.move?.x) || 0 : 0;
    const moveY = Math.abs(Number(controller.move?.y) || 0) > 0.18 ? Number(controller.move?.y) || 0 : 0;
    const aimX = Math.abs(Number(controller.camera?.x) || 0) > 0.18 ? Number(controller.camera?.x) || 0 : 0;
    const aimY = Math.abs(Number(controller.camera?.y) || 0) > 0.18 ? Number(controller.camera?.y) || 0 : 0;

    if (window.game?.setVirtualInput) {
        window.game.setVirtualInput(moveX, -moveY);
    }

    const cursorAimed = applyControllerCursorAim(controller);
    const anchor = getAimCursorAnchor();

    if (!cursorAimed && (aimX || aimY)) {
        const width = window.innerWidth || 1280;
        const height = window.innerHeight || 800;
        const sensitivity = state.settings.aimSensitivity ?? 1.0;
        const invertSign = state.settings.invertAimY ? -1 : 1;
        if (!controllerAimCursor) controllerAimCursor = { x: anchor.x, y: anchor.y };
        if (lastPlayerAnchor) {
            controllerAimCursor.x += anchor.x - lastPlayerAnchor.x;
            controllerAimCursor.y += anchor.y - lastPlayerAnchor.y;
        }
        const cursorSpeed = 16 * sensitivity;
        controllerAimCursor.x = Math.min(width - 4, Math.max(4, controllerAimCursor.x + aimX * cursorSpeed));
        controllerAimCursor.y = Math.min(height - 4, Math.max(4, controllerAimCursor.y + aimY * cursorSpeed * invertSign));
        lastPlayerAnchor = { ...anchor };
        updateVirtualGamepadCursorPosition(controllerAimCursor.x, controllerAimCursor.y, true);
        window.dispatchEvent(new MouseEvent('mousemove', {
            clientX: controllerAimCursor.x,
            clientY: controllerAimCursor.y,
            bubbles: true
        }));
        window.game?.updateAimFromClient?.(controllerAimCursor.x, controllerAimCursor.y, { keepMouseActive: true });
    } else if (!cursorAimed) {
        lastPlayerAnchor = { ...anchor };
    }

    if (controller.fire) {
        window.game?.triggerControllerFire?.();
    }
    if (controller.interact && !prev.interact) {
        window.game?.triggerGameplayInteract?.();
    }
    if (controller.reload && !prev.reload) {
        window.game?.triggerGameplayReload?.({ manual: true });
    }
    if ((controller.melee && !prev.melee) || (controller.ability && !prev.ability)) {
        window.game?.triggerGameplayMelee?.();
    }
    if (controller.dash && !prev.dash) {
        window.game?.triggerGameplayDash?.();
    }
    if (controller.scan && !prev.scan) {
        window.game?.triggerRadarScan?.();
    }
    if (controller.pause && !prev.pause) {
        triggerControllerPauseAction();
    }
    if (controller.toggleMap && !prev.toggleMap) {
        toggleTacticalMapModal();
    }
    window.game?.setVirtualInputSprint?.(Boolean(controller.sprint));

    updateControllerInputMemory(controller, {
        ...prev,
        fire: Boolean(controller.fire),
        interact: Boolean(controller.interact),
        reload: Boolean(controller.reload),
        melee: Boolean(controller.melee),
        ability: Boolean(controller.ability),
        dash: Boolean(controller.dash),
        scan: Boolean(controller.scan),
        pause: Boolean(controller.pause),
        toggleMap: Boolean(controller.toggleMap),
        sprint: Boolean(controller.sprint),
        moveX,
        moveY,
        aimX,
        aimY
    });
}

function routeMainControllerInput(controller, gameplayActive) {
    // The native snapshot retains gameplay-shaped button names while a movie
    // temporarily owns input during a run. Check the raw controller before
    // choosing an action set so A/RT/etc. can still honor "any button".
    if (!gameplayActive && hasControllerContinuePress(controller) && document.querySelector(
        '.class-intro-overlay:not(.is-closing), '
        + '.cinematic-still-overlay:not(.is-closing), '
        + '#cutscene-overlay.is-active, '
        + '.rgb-cinematic--visible'
    )) {
        window.dispatchEvent(new KeyboardEvent('keydown', {
            key: ' ',
            code: 'Space',
            bubbles: false,
            cancelable: true
        }));
        return;
    }

    const actionSet = appPhase === 'archive'
        ? ACTION_SETS.ARCHIVE
        : gameplayActive
            ? ACTION_SETS.GAMEPLAY
            : ACTION_SETS.MENU;
    mainActionRouter.setActionSet(actionSet);
    const { actions } = mainActionRouter.deriveActions(controller);
    if (actionSet === ACTION_SETS.GAMEPLAY) {
        handleSteamGameplayInput(actions);
        return;
    }
    if (actionSet === ACTION_SETS.ARCHIVE) {
        window.dispatchEvent(new CustomEvent('hb-archive-controller-actions', {
            detail: actions
        }));
        return;
    }
    handleSteamMenuInput(actions);
}

if (window.electronAPI?.onSteamInputState) {
    window.electronAPI.onSteamInputState(handleSteamInputSnapshot);
}

let browserGamepadPollRaf = null;
let browserGamepadOwnedVirtualInput = false;
let browserGamepadFallbackEngaged = false;
let suppressBrowserGamepadUntilRelease = false;

function browserGamepadApiAvailable() {
    return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
}

function shouldUseBrowserGamepadFallback(controllers) {
    if (!browserGamepadApiAvailable()) return false;
    return shouldPreferBrowserGamepad({
        nativeAvailable: steamInputState.available,
        nativeControllerCount: steamInputState.controllerCount,
        nativeAnyInput: steamInputState.anyInput,
        browserAnyInput: controllers.some((controller) => controller.active),
        browserEngaged: browserGamepadFallbackEngaged
    });
}

function getBrowserGamepadControllers() {
    if (!browserGamepadApiAvailable()) return [];
    return Array.from(navigator.getGamepads() ?? [])
        .filter(Boolean)
        .map((gamepad) => mapBrowserGamepad(gamepad))
        .filter(Boolean);
}

function markBrowserGamepadInput(controller) {
    const previousMode = steamInputState.lastInputMode;
    const previousType = steamInputState.primaryControllerType;
    steamInputState.primaryControllerHandle = controller.handle;
    steamInputState.primaryControllerType = controller.type;
    setLastInputMode('controller', { refresh: false });
    if (previousMode !== steamInputState.lastInputMode || previousType !== steamInputState.primaryControllerType) {
        refreshInteractivePromptKeys();
    }
}

function clearBrowserGamepadGameplayInput() {
    if (!browserGamepadOwnedVirtualInput) return;
    window.game?.setVirtualInput?.(0, 0);
    browserGamepadOwnedVirtualInput = false;
}

function handleBrowserGamepadFallbackFrame() {
    const controllers = getBrowserGamepadControllers();
    if (!shouldUseBrowserGamepadFallback(controllers)) {
        browserGamepadFallbackEngaged = false;
        clearBrowserGamepadGameplayInput();
        browserGamepadPollRaf = window.requestAnimationFrame(handleBrowserGamepadFallbackFrame);
        return;
    }

    const activeController = controllers.find((controller) => controller.active) ?? null;
    if (!activeController) {
        const neutralController = controllers[0] ?? null;
        if (browserGamepadFallbackEngaged && neutralController) {
            const gameplayActive = Boolean(window.game?.isGameplayInputActive?.());
            routeMainControllerInput(
                neutralController,
                appPhase === 'gameplay' && gameplayActive
            );
        }
        browserGamepadFallbackEngaged = false;
        if (suppressBrowserGamepadUntilRelease) {
            suppressBrowserGamepadUntilRelease = false;
            steamInputPrevControllers.clear();
        }
        clearBrowserGamepadGameplayInput();
        browserGamepadPollRaf = window.requestAnimationFrame(handleBrowserGamepadFallbackFrame);
        return;
    }

    browserGamepadFallbackEngaged = true;
    markBrowserGamepadInput(activeController);

    if (suppressBrowserGamepadUntilRelease) {
        browserGamepadPollRaf = window.requestAnimationFrame(handleBrowserGamepadFallbackFrame);
        return;
    }

    if (!window.AudioManager?.isUnlocked || !window.game) {
        suppressBrowserGamepadUntilRelease = true;
        window.HunkerTriggerBoot?.();
        browserGamepadPollRaf = window.requestAnimationFrame(handleBrowserGamepadFallbackFrame);
        return;
    }

    const gameplayActive = Boolean(window.game?.isGameplayInputActive?.());
    if (appPhase === 'gameplay' && gameplayActive) {
        browserGamepadOwnedVirtualInput = true;
        routeMainControllerInput(activeController, true);
    } else {
        clearBrowserGamepadGameplayInput();
        routeMainControllerInput(activeController, false);
    }

    browserGamepadPollRaf = window.requestAnimationFrame(handleBrowserGamepadFallbackFrame);
}

function startBrowserGamepadFallback() {
    if (browserGamepadPollRaf || typeof window.requestAnimationFrame !== 'function') return;
    browserGamepadPollRaf = window.requestAnimationFrame(handleBrowserGamepadFallbackFrame);
}

startBrowserGamepadFallback();
window.addEventListener('gamepadconnected', startBrowserGamepadFallback);

window.addEventListener('keydown', (event) => {
    if (!event.isTrusted) return;
    setLastInputMode('keyboard');
}, true);

window.addEventListener('pointerdown', (event) => {
    if (!event.isTrusted) return;
    setLastInputMode('keyboard');
}, true);

const CONTROL_ACTIONS = Object.freeze([
    { id: 'moveUp', label: 'MOVE UP' },
    { id: 'moveDown', label: 'MOVE DOWN' },
    { id: 'moveLeft', label: 'MOVE LEFT' },
    { id: 'moveRight', label: 'MOVE RIGHT' },
    { id: 'interact', label: 'INTERACT' },
    { id: 'reload', label: 'RELOAD' },
    { id: 'melee', label: 'SMASH' },
    { id: 'ability', label: 'EXOSUIT ACTION' },
    { id: 'scan', label: 'RADAR SCAN' },
    { id: 'sprint', label: 'SPRINT BURST' },
    { id: 'map', label: 'TACTICAL MAP' }
]);
const BUNKER_TIER_NAMES = Object.freeze(['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS']);
const DEFAULT_BIOME_LABEL = 'ACTIVE SECTOR';

const state = {
    settings: {
        // Debug surfaces are opt-in and additionally gated by QA authorization.
        debug: false,
        audioMix: { ...DEFAULT_AUDIO_MIX },
        fullscreen: false,
        nightVision: false,
        commentary: false,
        aimSensitivity: parseFloat(localStorage.getItem('hb_aim_sensitivity') || '1.0'),
        invertAimY: localStorage.getItem('hb_invert_aim_y') === 'true',
        keyBindings: cloneKeyBindings(DEFAULT_KEY_BINDINGS)
    },
    onlineCount: 1,
    gameInitialized: false
};
// Exposed so threeGame.js can read live key bindings without a circular import.
window.state = state;

// RGB archive-sim unlock/save state (docs/mini-games/rgb/unlock-and-integration.md).
let rgbSave = loadRgbSave(localStorage);
let rgbUnlockToastPending = false;

function unlockRgbIfEarned({ specimen0047Recorded = false, anyEndingCompleted = false } = {}) {
    if (rgbSave.unlocked) return false;
    if (!shouldUnlockRgb({ specimen0047Recorded, anyEndingCompleted })) return false;
    rgbSave = markRgbUnlocked(rgbSave);
    saveRgbSave(localStorage, rgbSave);
    rgbUnlockToastPending = true;
    window.dispatchEvent(new CustomEvent('rgb-unlocked'));
    updateArchiveSimsMenuVisibility();
    return true;
}

function updateArchiveSimsMenuVisibility() {
    const command = document.getElementById('archive-sims-command');
    if (command) command.classList.toggle('hidden', !rgbSave.unlocked);
}

function maybeShowRgbUnlockToast() {
    if (!rgbUnlockToastPending) return;
    rgbUnlockToastPending = false;

    const toast = document.createElement('div');
    toast.className = 'rgb-unlock-toast';
    const kicker = document.createElement('div');
    kicker.className = 'rgb-unlock-toast__kicker';
    kicker.textContent = 'ARCHIVE SIMULATION RECOVERED';
    const title = document.createElement('div');
    title.className = 'rgb-unlock-toast__title';
    title.textContent = "RGB: RIVERSIDE GLOBAL 'BOTICS";
    toast.append(kicker, title);
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 5200);
}

let rgbHandle = null;
let rgbReturnPhase = 'menu';
let fullscreenVideoSuspendDepth = 0;
let fullscreenVideoWasPaused = false;
let fullscreenVideoCanvasVisibility = '';

function suspendGameForFullscreenVideo() {
    const game = window.game;
    if (fullscreenVideoSuspendDepth === 0) {
        fullscreenVideoWasPaused = Boolean(game?.loadingPaused);
        const canvas = game?.renderer?.domElement;
        if (canvas) {
            fullscreenVideoCanvasVisibility = canvas.style.visibility;
            canvas.style.visibility = 'hidden';
        }
        game?.setLoadingPaused?.(true);
    }
    fullscreenVideoSuspendDepth += 1;

    let resumed = false;
    return () => {
        if (resumed) return;
        resumed = true;
        fullscreenVideoSuspendDepth = Math.max(0, fullscreenVideoSuspendDepth - 1);
        if (fullscreenVideoSuspendDepth > 0) return;

        const activeGame = window.game;
        const canvas = activeGame?.renderer?.domElement;
        if (canvas) canvas.style.visibility = fullscreenVideoCanvasVisibility;
        activeGame?.setLoadingPaused?.(fullscreenVideoWasPaused);
    };
}

const RGB_ENDING_ORDER = ['system_loop', 'ashes_survival', 'open_hand'];

function openArchiveSimsModal() {
    const modal = document.getElementById('archive-sims-modal');
    if (!modal) return;
    const statusEl = document.getElementById('archive-sim-rgb-status');
    const endingsEl = document.getElementById('archive-sim-rgb-endings');
    const chaptersEl = document.getElementById('archive-sim-rgb-chapters');
    if (statusEl) {
        statusEl.textContent = rgbSave.checkpoint === 'parking_lot' && rgbSave.endingsSeen.length === 0
            ? 'NOT STARTED'
            : `IN PROGRESS — ${rgbSave.checkpoint.replace(/_/g, ' ').toUpperCase()}`;
    }
    if (endingsEl) {
        const seen = RGB_ENDING_ORDER.filter((id) => rgbSave.endingsSeen.includes(id));
        endingsEl.textContent = seen.length === 0
            ? 'No endings discovered yet.'
            : `Endings discovered: ${seen.map((id) => RGB_ENDINGS[id].title).join(', ')}`;
    }
    if (chaptersEl) {
        chaptersEl.replaceChildren();
        for (let i = 0; i < RGB_CHAPTER_ORDER.length; i += 1) {
            const chId = RGB_CHAPTER_ORDER[i];
            const chTitle = RGB_CHAPTERS[chId]?.title ?? chId;
            const isUnlocked = isRgbChapterUnlocked(rgbSave, chId);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `start-btn archive-sim-chapter-btn ${isUnlocked ? 'unlocked' : 'locked'}`;
            btn.style.margin = '4px 0';
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.textContent = isUnlocked
                ? `▶ START ${chTitle.toUpperCase()}`
                : `🔒 ${chTitle.toUpperCase()} [RECOVER IN CAMP SUB-MISSION]`;
            btn.disabled = !isUnlocked;
            if (isUnlocked) {
                btn.addEventListener('click', () => launchRgb(chId));
            }
            chaptersEl.appendChild(btn);
        }
    }
    modal.classList.remove('hidden');
}

function closeArchiveSimsModal() {
    document.getElementById('archive-sims-modal')?.classList.add('hidden');
}

function launchRgb(chapter = null) {
    closeArchiveSimsModal();
    if (menu) menu.classList.add('hidden');
    const root = document.getElementById('rgb-root');
    if (!root) return;
    rgbReturnPhase = appPhase === 'archive' ? 'menu' : appPhase;
    setAppPhase('archive');
    // The archive fully covers the Three.js canvas. Stop both rendering and
    // WebGL compositing so its fullscreen videos have exclusive GPU time.
    const resumeGame = suspendGameForFullscreenVideo();
    if (chapter && typeof chapter === 'string') {
        rgbSave = {
            ...rgbSave,
            checkpoint: chapter
        };
    }
    try {
        rgbHandle = mountRgb({
            root,
            save: rgbSave,
            storage: localStorage,
            onExit: () => exitRgb(resumeGame)
        });
    } catch (error) {
        setAppPhase(rgbReturnPhase);
        resumeGame();
        throw error;
    }
}

function exitRgb(resumeGame = null) {
    rgbHandle?.destroy();
    rgbHandle = null;
    resumeGame?.();
    rgbSave = loadRgbSave(localStorage);
    updateArchiveSimsMenuVisibility();
    if (menu) menu.classList.remove('hidden');
    setAppPhase(rgbReturnPhase);
    if (rgbReturnPhase === 'gameplay') {
        window.game?.setInputEnabled?.(true);
    }
}

window.addEventListener('rgb-chapter-archive-recovered', (e) => {
    const chapterId = e.detail?.chapterId;
    if (chapterId) {
        rgbSave = unlockRgbChapter(rgbSave, chapterId);
        saveRgbSave(localStorage, rgbSave);
        rgbUnlockToastPending = true;
        updateArchiveSimsMenuVisibility();
    }
});

document.getElementById('archive-sims-btn')?.addEventListener('click', openArchiveSimsModal);
document.getElementById('archive-sims-modal-close')?.addEventListener('click', closeArchiveSimsModal);
document.getElementById('archive-sim-rgb-launch')?.addEventListener('click', () => launchRgb());

const gearSpinState = {
    rotation: 0,
    velocity: 0,
    targetVelocity: 0,
    lastTime: performance.now()
};

let stageResizeObserver = null;
let draftAudioMix = { ...DEFAULT_AUDIO_MIX };
let cutsceneManager = null;
let dialogueManager = null;
const arcManager = new ArcStateManager();
const act2Manager = new Act2Manager();
let missionFlowRunning = false;
let isResettingRun = false;

function getActiveSuitDialogueContext() {
    const act2State = act2Manager?.getState?.() ?? {};
    const achievementState = window.achievementEngine?.getState?.() ?? {};
    return {
        infectionStage: act2State.infectionStage ?? 'latent',
        queenObedience: act2State.queenObedience ?? 0,
        totalDeaths: achievementState.stats?.totalDeaths ?? 0,
        sessionDeaths: getSecretGateState(achievementState).deathsThisRun
    };
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

const achievementEngine = new AchievementEngine();
window.achievementEngine = achievementEngine;

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

// All-time personal bests, independent of the per-class scores above —
// longest/deepest/deaths already persist in achievementEngine's stats and
// arcManager's signals for their own purposes (achievement checks, arc
// transitions); this just reads and displays them, no new tracking.
function refreshCareerStats() {
    const longestEl = document.getElementById('career-stat-longest-run');
    const depthEl = document.getElementById('career-stat-deepest-depth');
    const deathsEl = document.getElementById('career-stat-deaths');
    const menuHistoryEl = document.getElementById('menu-steam-history');
    if (!longestEl && !depthEl && !deathsEl && !menuHistoryEl) return;

    const stats = achievementEngine.getState().stats;
    const totalSeconds = Math.floor((stats.maxRunMs ?? 0) / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    const tier = arcManager.getState().signals.deepestDepthTier ?? 0;
    const depthName = DEPTH_TIER_NAMES[Math.max(0, Math.min(DEPTH_TIER_NAMES.length - 1, tier))] ?? 'SURFACE';
    const deaths = stats.totalDeaths ?? 0;
    if (longestEl) {
        longestEl.textContent = `LONGEST ${mm}:${ss}`;
    }
    if (deathsEl) {
        deathsEl.textContent = `DEATHS ${deaths}`;
    }
    if (depthEl) {
        depthEl.textContent = `DEPTH ${depthName}`;
    }
    if (menuHistoryEl) {
        const hasHistory = totalSeconds > 0 || deaths > 0 || tier > 0
            || localStorage.getItem('hb_run_stats_v1') !== null
            || localStorage.getItem('hb_bank_v1') !== null;
        menuHistoryEl.textContent = hasHistory
            ? `LONGEST ${mm}:${ss} · DEPTH ${depthName} · DEATHS ${deaths}`
            : 'NEW OPERATOR // NO RUN HISTORY';
        document.getElementById('menu-steam-badge')?.classList.toggle('steam-account-badge--returning', hasHistory);
    }
}

async function renderTitleProfilePortrait(playerType) {
    const portraitCanvas = document.getElementById('title-profile-portrait');
    const layout = PLAYER_SPRITE_LAYOUTS[playerType] ?? PLAYER_SPRITE_LAYOUTS.TANK;
    const context = portraitCanvas?.getContext?.('2d');
    if (!portraitCanvas || !context || !layout) return;

    const image = await getPreviewSpriteImage(layout.path, layout).catch(() => null);
    if (!image) return;

    const frameWidth = Math.floor(image.width / layout.columns);
    const frameHeight = Math.floor(image.height / layout.rows);
    const previewCell = layout.directionCells[layout.previewDirection];
    portraitCanvas.width = frameWidth;
    portraitCanvas.height = frameHeight;
    context.clearRect(0, 0, frameWidth, frameHeight);
    context.imageSmoothingEnabled = false;
    context.drawImage(
        image,
        previewCell.baseColumn * frameWidth,
        previewCell.row * frameHeight,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight
    );
}

function refreshTitleProfileHud(hasSave = true) {
    const hud = document.getElementById('title-profile-hud');
    if (!hud) return;
    hud.classList.toggle('hidden', !hasSave);
    if (!hasSave) {
        refreshCareerStats();
        return;
    }

    const playerType = getSavedHeroType();
    const callsignEl = document.getElementById('title-profile-callsign');
    const classEl = document.getElementById('title-profile-class');
    const portraitEl = document.getElementById('title-profile-portrait');
    const bestEl = document.getElementById('title-profile-best');
    if (callsignEl) callsignEl.textContent = profile.getCallsign();
    if (classEl) classEl.textContent = playerType;
    if (portraitEl) void renderTitleProfilePortrait(playerType);
    if (bestEl) {
        const best = Number(localStorage.getItem(`hb_best_score_${playerType}`) ?? 0);
        bestEl.textContent = `CLASS BEST ${String(best).padStart(4, '0')}`;
    }
    refreshCareerStats();
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
            vfx: clampAudioMixValue(parsed.vfx !== undefined ? parsed.vfx : parsed.sfx),
            voice: clampAudioMixValue(parsed.voice !== undefined ? parsed.voice : 1.0),
            voiceEnabled: parsed.voiceEnabled !== undefined ? Boolean(parsed.voiceEnabled) : true
        };
    } catch {
        return null;
    }
}

function cloneAudioMix(mix) {
    return {
        master: clampAudioMixValue(mix?.master),
        music: clampAudioMixValue(mix?.music),
        vfx: clampAudioMixValue(mix?.vfx),
        voice: clampAudioMixValue(mix?.voice !== undefined ? mix.voice : 1.0),
        voiceEnabled: mix?.voiceEnabled !== undefined ? Boolean(mix.voiceEnabled) : true
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
        { channel: 'vfx', slider: audioVfxSlider, valueEl: audioVfxValue },
        { channel: 'voice', slider: audioVoiceSlider, valueEl: audioVoiceValue }
    ];

    controls.forEach(({ channel, slider, valueEl }) => {
        const pct = Math.round(clampAudioMixValue(mix[channel]) * 100);
        if (slider) slider.value = String(pct);
        if (valueEl) valueEl.textContent = `${pct}%`;
    });

    if (audioVoiceToggle) {
        audioVoiceToggle.checked = mix.voiceEnabled !== false;
    }
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
        { channel: 'vfx', slider: audioVfxSlider },
        { channel: 'voice', slider: audioVoiceSlider }
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

    if (audioVoiceToggle) {
        audioVoiceToggle.addEventListener('change', (event) => {
            draftAudioMix = {
                ...draftAudioMix,
                voiceEnabled: event.target.checked
            };
            AudioManager.setMix(draftAudioMix);
            syncAudioMixerUI(draftAudioMix);
        });
    }
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
    const campEffects = window.game?.getCampVerbRuntimeEffects?.() ?? {};
    const medkitReserve = Math.max(0, Math.floor(Number(campEffects.medkitInventory) || 0));
    const ammoReserve = Math.max(0, Math.floor(Number(campEffects.ammoReserve) || 0));
    activeAmmoCapacity += ammoReserve;
    pickupCounterState.health = medkitReserve;
    pickupCounterState.ammo = Math.min(STARTING_RUN_AMMO + ammoReserve, activeAmmoCapacity);
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
        weaponStatusPanel.classList.toggle('is-low-ammo', clip <= 2 && !reloading);
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
// docs/faction-verb-matrix.md — Vesper FIELD RESUPPLY tops the ammo reserve
// to full; ThreeGame.activateCampVerb already refills the loaded clip
// directly (no main.js involvement needed for that part).
window.addEventListener('camp-verb-resupply', () => {
    pickupCounterState.ammo = activeAmmoCapacity;
    renderPickupCounter();
});
window.addEventListener('camp-verb-activated', (event) => {
    const campId = String(event?.detail?.campId ?? '').replace(/^camp_/, '');
    if (!['meridian', 'tallow', 'vesper'].includes(campId)) return;
    AudioManager.play(`camp_verb_${campId}`, {
        volume: event?.detail?.degraded ? 0.28 : 0.46,
        playbackRate: event?.detail?.degraded ? 0.78 : 1,
        bus: 'sfx'
    });
    const campLabel = event?.detail?.campLabel ?? campId.toUpperCase();
    const degraded = Boolean(event?.detail?.degraded);
    let promptMsg = `SYSTEM: ${campLabel} VERB ACTIVATED.`;
    if (campId === 'meridian') {
        promptMsg = degraded
            ? `SYSTEM: MERIDIAN ROUTE INTEL ACTIVATED (DEGRADED — RECENTLY ROBBED). RADAR LOCK DELAYED.`
            : `SYSTEM: MERIDIAN ROUTE INTEL ACTIVATED. RADAR SCANNING BLOCKER & KEY REGIONAL SITES.`;
    } else if (campId === 'tallow') {
        promptMsg = `SYSTEM: TALLOW TRIAGE ACTIVATED. HEALTH FULLY RESTORED & INFECTION CLEANSED.`;
    } else if (campId === 'vesper') {
        promptMsg = `SYSTEM: VESPER FIELD RESUPPLY ACTIVATED. LOADED CLIP & AMMO RESERVES FULLY REFILLED.`;
    }
    showBiomePrompt(promptMsg);
});
window.addEventListener('camp-verb-denied', (event) => {
    const reason = String(event?.detail?.reason ?? 'unavailable').replace(/_/g, ' ').toUpperCase();
    showBiomePrompt(`SYSTEM: FACTION VERB DENIED — ${reason}.`);
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

    const viewport = document.getElementById('game-viewport');
    if (viewport) {
        viewport.classList.remove('kill-confirm-flash');
        void viewport.offsetWidth;
        viewport.classList.add('kill-confirm-flash');
    }
    if (total === 1 && !isBoss) fireMothershipReactiveLine('first_kill');
    if (type === 'sentinel') fireMothershipReactiveLine('sentinel_spotted');
    if (type === 'crawler') fireMothershipReactiveLine('crawler_detected');
    if (isBoss || (typeof type === 'string' && type.startsWith('boss_'))) {
        // Corner radio transmission, not the full-screen brief-transmission
        // dialogue (openBriefTransmission pauses input via setInputEnabled
        // until dismissed) — a boss kill shouldn't stop the run to read text.
        showBiomePrompt('> MOTHERSHIP: APEX BIO-ENTITY DOWN.');
        window.setTimeout(() => showBiomePrompt('> MOTHERSHIP: SIGNAL ATTENUATION CONFIRMED. FIELD PATH IS CLEAR.'), 900);
    }
    // Escalation beat: once the agent racks up kills, 0047 takes notice.
    if (total >= 25) fireMothershipReactiveLine('specimen_notices');
});

window.addEventListener('weapon-upgraded', () => {
    fireMothershipReactiveLine('weapon_calibrated');
});

window.addEventListener('skill-unlocked', (event) => {
    window.AudioManager?.play?.('fx_levelup', { volume: 0.38, bus: 'sfx' });
    syncAbilityPanelLabel();
    syncHudCompassVisibility();
    const label = event?.detail?.label ? event.detail.label.toUpperCase() : 'POWER-UP';
    showBiomePrompt(`> PROTOCOL UNLOCKED: ${label}`);
});

window.addEventListener('bank-updated', () => {
    syncAbilityPanelLabel();
    syncHudCompassVisibility();
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
const commentarySeenThisRun = new Set();

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
        card.style.zIndex = String(17090 - index);
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

function resetCommentaryRunState() {
    commentarySeenThisRun.clear();
}

function isCommentaryModeEnabled() {
    return Boolean(state.settings.commentary);
}

function showDeveloperCommentary(key, detail = {}, { once = true } = {}) {
    if (!isCommentaryModeEnabled()) return false;
    const entry = COMMENTARY_ENTRIES[key];
    if (!entry) return false;
    const commentaryKey = `${key}:${detail?.template ?? detail?.id ?? ''}`;
    if (once && commentarySeenThisRun.has(commentaryKey)) return false;

    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return false;

    commentarySeenThisRun.add(commentaryKey);

    const card = document.createElement('div');
    card.className = 'commentary-toast hud-stack-card hidden';
    card.setAttribute('aria-live', 'polite');
    card.dataset.notificationPriority = '22';
    card.dataset.seq = String(hudCardSeq++);
    card.dataset.autoDismissMs = String(Math.max(6200, Math.min(11000, entry.body.length * 62)));
    card.dataset.removeDelayMs = '320';

    const icon = document.createElement('div');
    icon.className = 'commentary-toast__icon';
    icon.textContent = 'DC';

    const body = document.createElement('div');
    body.className = 'commentary-toast__body';

    const kicker = document.createElement('div');
    kicker.className = 'commentary-toast__kicker';
    kicker.textContent = 'DEVELOPER COMMENTARY';

    const title = document.createElement('div');
    title.className = 'commentary-toast__title';
    title.textContent = entry.title;

    const blurb = document.createElement('div');
    blurb.className = 'commentary-toast__blurb';
    blurb.textContent = entry.body;

    body.append(kicker, title, blurb);
    card.append(icon, body);
    card.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dismissHudNotificationCard(card);
    });

    stack.append(card);
    updateHudNotificationDeck();
    card.classList.remove('hidden');
    requestAnimationFrame(() => {
        card.classList.add('visible');
        updateHudNotificationDeck();
    });
    return true;
}

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

    const activeCards = Array.from(stack.querySelectorAll('.radio-transmission-prompt:not(.is-closing):not(.hidden)'));
    if (activeCards.length >= 2) {
        dismissRadioPrompt(activeCards[0]);
    }

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
          <img src="${assetUrl(portrait)}" alt="Sender Portrait" />
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
    AudioManager.playVoiceForMessage({ name: sender }, text);
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
    showDeveloperCommentary('black_box_recovered');
    recordSteamTimelineEvent('black_box_recovered', 'Black Box Recovered', 'A previous operator archive was recovered and banked.', {
        icon: 'black_box',
        priority: 2,
        durationSeconds: 8
    });
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
            AudioManager.playMetalStress({ volume: 0.3, playbackRate: 0.62, force: true });
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
    SCOUT:    { spdPips: 5, o2Pips: 4, lootPips: 5, color: '#7dff5a', spdLabel: 'FAST',   o2Label: 'HIGH',   lootLabel: 'WIDE',  detail: 'SPRINT BURST // WIDE SALVAGE MAGNET', demoLabel: 'SCOUT DEMO // SPRINT' },
    TANK:     { spdPips: 2, o2Pips: 2, lootPips: 2, color: '#ffb700', spdLabel: 'SLOW',   o2Label: 'LOW',    lootLabel: 'SHORT', detail: 'BRACE // LOW O₂ DRAIN', demoLabel: 'TANK DEMO // BRACE' },
    ENGINEER: { spdPips: 3, o2Pips: 3, lootPips: 3, color: '#00e5ff', spdLabel: 'MED',    o2Label: 'MED',    lootLabel: 'MED',   detail: 'REROUTE UTILITY // 20% CONSOLE DISCOUNT', demoLabel: 'ENGINEER DEMO // REROUTE' }
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

function renderOperatorPolishUi() {
    const selected = getSelectedPolish();
    const unlocked = getUnlockedPolishIds();
    const grid = document.getElementById('operator-polish-grid');
    const swatch = document.getElementById('hero-polish-swatch');
    const name = document.getElementById('hero-polish-name');
    const count = document.getElementById('hero-polish-count');
    const slot = document.getElementById('hero-polish-btn');

    slot?.style.setProperty('--polish-color', selected.color);
    swatch?.style.setProperty('--polish-color', selected.color);
    if (name) name.textContent = selected.name;
    if (count) count.textContent = `${unlocked.size}/16`;
    document.getElementById('operator-polish-modal')?.style.setProperty('--polish-color', selected.color);
    const readoutName = document.getElementById('operator-polish-readout-name');
    const readoutState = document.getElementById('operator-polish-readout-state');
    if (readoutName) readoutName.textContent = selected.name;
    if (readoutState) readoutState.textContent = 'EQUIPPED';

    if (!grid) return;
    grid.innerHTML = '';
    for (const polish of OPERATOR_POLISHES) {
        const isUnlocked = unlocked.has(polish.id);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `operator-polish-chip${isUnlocked ? '' : ' is-locked'}${selected.id === polish.id ? ' is-selected' : ''}`;
        button.style.setProperty('--polish-color', polish.color);
        button.setAttribute('aria-disabled', String(!isUnlocked));
        button.setAttribute('aria-label', `${polish.name}${isUnlocked ? '' : ` locked. Clue: ${polish.hint}`}`);
        button.innerHTML = `<span class="operator-polish-chip__swatch"></span><span>${String(polish.id + 1).padStart(2, '0')} // ${polish.name}</span>`;
        if (isUnlocked) {
            button.addEventListener('click', () => {
                const next = selectPolish(polish.id);
                if (!next) return;
                window.game?.setOperatorPolish?.(next.color);
                scoutHeroPreview?.setOperatorPolish?.(next.color);
                void renderPreviewFrame(activePreviewType, previewFrameIndex);
                renderOperatorPolishUi();
                window.AudioManager?.play?.('ui_click', { volume: 0.5 });
            });
        }
        button.addEventListener('focus', () => {
            if (readoutName) readoutName.textContent = polish.name;
            if (readoutState) readoutState.textContent = isUnlocked
                ? (selected.id === polish.id ? 'EQUIPPED' : 'UNLOCKED')
                : `LOCKED // ${polish.hint}`;
        });
        grid.append(button);
    }
}

function setOperatorPolishModalOpen(open) {
    const modal = document.getElementById('operator-polish-modal');
    if (!modal) return;
    modal.classList.toggle('hidden', !open);
    modal.setAttribute('aria-hidden', String(!open));
    if (open) renderOperatorPolishUi();
}

document.getElementById('hero-polish-btn')?.addEventListener('click', () => setOperatorPolishModalOpen(true));
document.getElementById('close-operator-polish-modal')?.addEventListener('click', () => setOperatorPolishModalOpen(false));
setupClickOutside('operator-polish-modal', () => setOperatorPolishModalOpen(false));
document.getElementById('debug-unlock-all-polishes')?.addEventListener('click', () => {
    unlockAllPolishes();
    renderOperatorPolishUi();
    showBiomePrompt('> DEBUG: ALL 16 OPERATOR POLISHES UNLOCKED');
});

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
    const idx = (totalUnlocks + Math.floor(Date.now() / 86400000)) % 4;
    const missions = [
        { type: 'retrieval', label: pickMissionBriefing('retrieval'), targetKills: 0, targetDepth: 0 },
        { type: 'survey', label: pickMissionBriefing('survey'), targetKills: 0, targetDepth: 145 },
        { type: 'elimination', label: pickMissionBriefing('elimination'), targetKills: 6, targetDepth: 0 },
        { type: 'mapping', label: pickMissionBriefing('mapping'), targetKills: 0, targetDepth: 0 }
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
        'mycelium_stalker':   '> CAUSE: BIO-ENTITY AMBUSH — MYCELIUM STALKER IMPACT',
        'bio_charger':        '> CAUSE: BIO-ENTITY IMPACT — CHARGER HEAVY STRIKE',
        'combat':             '> CAUSE: BIO-ENTITY CLOSE-QUARTERS COMBAT',
        'enemy-projectile':   '> CAUSE: HOSTILE KINETIC IMPACT — ENEMY PROJECTILE',
        'sentinel':           '> CAUSE: HOSTILE PROJECTILE — SENTINEL FIRE',
        'ship-destroyed':     '> CAUSE: SHIP STRUCTURAL FAILURE — HULL INTEGRITY ZERO',
        'mission-abort':      '> CAUSE: CONTRACT TERMINATED BY OPERATOR — RECOVERY BAG FILED',
        'frost-shockwave':    '> CAUSE: CRYO HAZARD — THERMAL SHOCKWAVE IMPACT',
        'queen-shockwave':    '> CAUSE: TITAN IMPACT — HIVE QUEEN SHOCKWAVE',
        'ground-slam':        '> CAUSE: TITAN IMPACT — KINETIC GROUND SLAM',
        'poison':             '> CAUSE: BIO-TOXIN EXPOSURE — SUIT INTEGRITY FAILURE',
        'hazard':             '> CAUSE: SUIT INTEGRITY BREACH — ENVIRONMENTAL HAZARD',
        'hazard-zone':        '> CAUSE: SUIT INTEGRITY BREACH — HAZARD ZONE EXPOSURE',
        'camp-turret':        '> CAUSE: FRIENDLY FIRE — AUTOMATED TURRET CROSSFIRE',
        'fall':               '> CAUSE: EXOSUIT GRAVITATIONAL FAILURE — HIGH-ALTITUDE FALL IMPACT',
        'pit-fall':           '> CAUSE: EXOSUIT GRAVITATIONAL FAILURE — PLUMMETED INTO PIT CHASM',
        'chasm':              '> CAUSE: EXOSUIT GRAVITATIONAL FAILURE — PLUMMETED INTO PIT CHASM',
        'abyss':              '> CAUSE: EXOSUIT GRAVITATIONAL FAILURE — PLUMMETED INTO PIT CHASM',
    };
    let cause = causeMap[reason];
    if (!cause) {
        if (reason && typeof reason === 'string') {
            const formatted = reason.toUpperCase().replace(/[-_]/g, ' ');
            cause = `> CAUSE: EXOSUIT FAILURE — ${formatted}`;
        } else {
            cause = '> CAUSE: EXOSUIT FAILURE — SUIT INTEGRITY COLLAPSE';
        }
    }
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
    clearTimeout(biomePromptTimer);
    biomePromptTimer = null;
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

    const endedAt = Date.now();
    const elapsedMs    = endedAt - runStartTime;
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
    const grantNoteEl = document.getElementById('go-steam-grant-note');
    if (grantNoteEl) {
        grantNoteEl.textContent = '';
        grantNoteEl.classList.add('hidden');
    }
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
        subtitle.innerHTML = '';
        subtitle.style.whiteSpace = 'pre-wrap';
        let charIdx = 0;
        const chars = report.split('');
        const typewriteReport = () => {
            if (charIdx < chars.length && subtitle) {
                const char = chars[charIdx++];
                if (char === '\n') {
                    subtitle.appendChild(document.createElement('br'));
                } else {
                    subtitle.appendChild(document.createTextNode(char));
                }
                setTimeout(typewriteReport, 8);
            }
        };
        setTimeout(typewriteReport, 250);
    }

    // Score + rating
    const score = window.game?.calculateRunScore?.(stats, { status: stats.missionStatus }, runStartTime) ?? 0;
    const rating = window.game?.getRunRating?.(score) ?? { grade: 'D', label: 'AGENT LOST — MINIMAL TELEMETRY' };
    const wasDailyOpsRun = _isDailyOpsRun;
    const dailyOpsDate = wasDailyOpsRun ? getTodayDateString() : null;
    const steamRunPayload = buildSteamRunScorePayload({
        stats: {
            ...stats,
            fullHealthAtEnd: Boolean(window.game?.playerVitals
                && window.game.playerVitals.hp >= window.game.playerVitals.maxHp)
        },
        score,
        rating,
        classType: window.game?.playerType ?? getSelectedHeroType(),
        runStartTime,
        endedAt,
        isVictory,
        deathReason,
        isDailyOps: wasDailyOpsRun,
        dailyOpsDate,
        seed: activeRunSeed,
        runCards: activeRunCards,
        depositedResources: window.game?.runDepositedResources ?? {}
    });
    dispatchSteamRunScoreFinalized(steamRunPayload, window);
    void renderGameOverLeaderboard(steamRunPayload);

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
    // Unconditional (unlike the per-class best above): longest run, deepest
    // depth, and death count each track their own best independent of score.
    refreshCareerStats();

    // World seed display
    const seedRow = document.getElementById('go-seed-row');
    const seedVal = document.getElementById('go-seed-val');
    if (seedRow) seedRow.classList.toggle('hidden', !wasDailyOpsRun);
    if (seedVal && wasDailyOpsRun) seedVal.textContent = `DAILY-${dailyOpsDate}`;

    // Daily Ops result save
    if (wasDailyOpsRun) {
        _isDailyOpsRun = false;
        if (window.game) {
            window.game.globalSeedOffset = 0;
            window.game.fixedRunEntropy = false;
        }
        saveDailyOpsRecord({
            attempted: true,
            completed: true,
            date: dailyOpsDate,
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
    if (archiveText) archiveText.textContent = `LOGS RECOVERED: ${logsFound}/${ALL_LORE_KEYS.length}`;

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

    renderGameOverAct2Summary();
}

let activeRunSeed = null;
let activeRunCards = [];

window.addEventListener('run-cards-drawn', (event) => {
    const detail = event?.detail ?? {};
    activeRunSeed = detail.seed ?? null;
    activeRunCards = detail.cards ?? [];

    const seedHUD = document.getElementById('hud-run-seed');
    if (seedHUD) {
        if (activeRunSeed !== null) {
            seedHUD.textContent = `SEED: ${activeRunSeed}`;
            seedHUD.classList.remove('hidden');
        } else {
            seedHUD.classList.add('hidden');
        }
    }
    updateQueensLedgerHUD();
});

function renderGameOverAct2Summary() {
    const summaryCard = document.getElementById('game-over-act2-summary');
    if (!summaryCard) return;

    if (!isAct2RunActive()) {
        summaryCard.classList.add('hidden');
        return;
    }

    summaryCard.classList.remove('hidden');

    const state = act2Manager.getState();
    const ending = pickAct2Ending(state);
    const obedience = state.queenObedience ?? 0;
    const seatsUsed = state.manifest?.seatsUsed ?? 1;
    const seatsMax = state.manifest?.seatsMax ?? 4;
    const oneLiner = explainEnding(ending);

    const endingName = ACT2_ENDING_TITLES[ending] ?? String(ending).replace(/_/g, ' ').toUpperCase();
    const obedienceSign = obedience < 0 ? '\u2212' : obedience > 0 ? '+' : '';
    const obedienceText = `${obedienceSign}${Math.abs(obedience)}`;

    const campDetails = state.camps.map(c => {
        const label = c.id === 'camp_meridian' ? 'MERIDIAN' : c.id === 'camp_tallow' ? 'TALLOW' : 'VESPER';
        return `
            <div class="go-act2-item">
                <span class="go-act2-item__label">${label}</span>
                <span class="go-act2-item__status go-act2-item__status--${c.status}">${formatStoryToken(c.status)}</span>
            </div>
        `;
    }).join('');

    const hiveDetails = state.hives.map(h => {
        const label = h.id === 'hive_suture' ? 'SUTURE HIVE' : h.id === 'hive_relay' ? 'RELAY HIVE' : 'CARAPACE HIVE';
        return `
            <div class="go-act2-item">
                <span class="go-act2-item__label">${label}</span>
                <span class="go-act2-item__status go-act2-item__status--${h.status}">${formatStoryToken(h.status)}</span>
            </div>
        `;
    }).join('');

    const seedText = activeRunSeed !== null
        ? `SEED: ${activeRunSeed}${activeRunCards.length > 0 ? ` (${activeRunCards.map(c => c.label).join(', ')})` : ''}`
        : 'SEED: STANDARD';

    summaryCard.innerHTML = `
        <div class="go-act2-header">
            <span class="go-act2-title">Projected End: ${endingName}</span>
            <span class="go-act2-seed">${seedText}</span>
        </div>
        <div class="go-act2-grid">
            <div>
                <div class="go-act2-col-title">Survivor Camps</div>
                <div class="go-act2-list">
                    ${campDetails}
                </div>
            </div>
            <div>
                <div class="go-act2-col-title">Alien Hives</div>
                <div class="go-act2-list">
                    ${hiveDetails}
                </div>
            </div>
        </div>
        <div class="go-act2-stats-row">
            <div class="go-act2-stat">Obedience: <span>${obedienceText}</span></div>
            <div class="go-act2-stat">Seats Filled: <span>${seatsUsed}/${seatsMax}</span></div>
            <div class="go-act2-stat">Humanity: <span>${state.humanity}%</span></div>
        </div>
        <div class="go-act2-one-liner">
            ${oneLiner}
        </div>
    `;
}

function hideGameOverScreen() {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.add('hidden');
}

function resetRunToStartingState({
    resetBank = false,
    skipEffects = true,
    snailSpawnEnabled = false,
    purgeSnails = true,
    deferChunkMount = false
} = {}) {
    activeRunSeed = null;
    activeRunCards = [];
    const seedHUD = document.getElementById('hud-run-seed');
    if (seedHUD) seedHUD.classList.add('hidden');

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
        resetCommentaryRunState();
        showDeveloperCommentary('run_start');
        recordSteamTimelineEvent('run_start', 'Run Started', `${window.game?.playerType ?? getSelectedHeroType()} deployed into the bunker.`, {
            icon: 'run',
            priority: 1,
            durationSeconds: 8
        });
        recordAchievementEvent('run-start', {
            startedAt: runStartTime,
            classType: window.game?.playerType ?? getSelectedHeroType()
        });
        const act2Run = isAct2RunActive();
        currentMission = act2Run ? null : assignMission(bankManager.getState());
        currentRunModifier = pickRunModifier();

        resetPickupCounter();
        window.game?.respawnPlayer?.({ resetRunState: true, skipEffects, deferChunkMount });
        if (currentMission) {
            window.game?.initMission?.(currentMission);
        } else {
            window.game?.clearMission?.();
        }
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
    clearTimeout(biomePromptTimer);
    biomePromptTimer = null;
    document.body.classList.add('player-dead-flash');
    playPlayerDeathCue(deathReason);

    deathSequenceTimer = window.setTimeout(async () => {
        document.body.classList.remove('player-dead-flash');
        deathSequenceTimer = null;

        const stats = window.game?.getRunStats?.() ?? {
            distanceTravelled: 0,
            totalPickups: 0,
            generatorLevel: 0
        };
        recordAchievementRunEnd({
            ...stats,
            outcome: 'death',
            deathReason,
            runMs: Date.now() - runStartTime,
            classType: window.game?.playerType ?? getSelectedHeroType()
        }, { delayMs: 2200 });
        const deathCinematic = getDeathCinematicSpec(deathReason);
        await playCinematicBeat({
            videoBase: deathCinematic.id,
            fallback: deathCinematic
        });
        triggerDoorTransition(
            () => {
                showGameOverScreen(stats, { isVictory: false, deathReason });
                setSnailSpawnState(false, { purgeExisting: true });
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
    // New-run world preparation uses the same respawn primitive as a live
    // retry. Do not let its event tear down the intro mask or enable input
    // while the first movie is still pending behind the doors.
    const deploymentLocked = isResettingRun || document.body.classList.contains('mission-intro-active');
    clearTimedClass('death', 'player-dead-flash');
    stopO2Alarm();
    hideExtractionRing();
    lastReportedDepthTier = 0;
    syncAbilityPanelLabel();
    _distressModeActive = false;
    // Recompute music from live state instead of forcing 'exploring'.
    updateMusicTension();
    document.body.classList.remove('distress-mode', 'vitals-critical', 'player-poisoned', 'player-damage-flash');
    if (!deploymentLocked) document.body.classList.remove('mission-intro-active');
    const bar = document.getElementById('ability-bar');
    if (bar) bar.style.transform = 'scaleX(1)';
    const scanBar = document.getElementById('scan-bar');
    if (scanBar) scanBar.style.transform = 'scaleX(1)';
    window.game?.setInputEnabled?.(!deploymentLocked);

    if (window.game?.act2?.getState?.().begun) {
        window.setTimeout(() => {
            void dialogueManager?.openBriefTransmission?.({
                playerType: window.game?.playerType ?? getSelectedHeroType(),
                lines: ['QUEEN: I FELT THAT. DO NOT DO IT AGAIN.']
            });
        }, 1200);
    }
});

window.addEventListener('mission-objective-complete', (event) => {
    const type = event?.detail?.type ?? '';
    const uplinkReady = Boolean(event?.detail?.uplinkReady);
    const messages = {
        retrieval: 'OBJECTIVE SECURED — RETURN TO SHIP',
        survey:    'SURVEY COMPLETE — RETURN TO SHIP',
        elimination: 'TARGETS ELIMINATED — RETURN TO SHIP',
        mapping:   'PATHWAY MAPPED — RETURN TO SHIP'
    };
    const msg = uplinkReady
        ? (messages[type] ?? 'OBJECTIVE COMPLETE — RETURN TO SHIP')
        : 'OBJECTIVE COMPLETE — UPLINK LOCKED // MAX ALL SYSTEMS TO EXTRACT';
    showBiomePrompt(msg);
    const line = getDialogueLine('extraction', Math.random, getActiveSuitDialogueContext());
    if (line) window.setTimeout(() => showBiomePrompt(`> BUNKER: ${line}`), 900);
    AudioManager.play('ui_boot', { volume: 0.45, playbackRate: 0.88, bus: 'sfx' });
});

window.addEventListener('goal-unlocked', (event) => {
    const goalKey = event?.detail?.goalKey;
    if (['o2Bubble', 'hullExpansion', 'radarNode', 'reactorCompressor'].includes(goalKey)) return;
    const line = getDialogueLine('majorUpgrade', Math.random, getActiveSuitDialogueContext());
    if (line) showBiomePrompt(`> BUNKER: ${line}`);
});

window.addEventListener('o2-generator-upgraded', (event) => {
    if (event?.detail?.level === 1) return;
    const line = getDialogueLine('majorUpgrade', Math.random, getActiveSuitDialogueContext());
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
                setSnailSpawnState(false, { purgeExisting: true });
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
    'B01','B02','B03','B13',
    'drop_horizon_badge', 'drop_dig_manifest', 'drop_security_log',
    'drop_survey_probe', 'drop_meteor_core', 'drop_ration_ledger',
    'drop_child_drawing', 'drop_dogtags', 'drop_resin_locket',
    'drop_moult_shard', 'drop_first_bore_tag', 'drop_prayer_stone',
    'drop_frozen_letter', 'drop_black_flask'
];

function updateMenuCommandStatuses() {
    updateArchiveSimsMenuVisibility();
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

    if (keyEl) keyEl.textContent = window.game?.getLoreTitle?.(key) ?? `LOG-${key}`;
    if (textEl) textEl.textContent = window.game?.getLoreText?.(key) ?? '[LOG TEXT UNAVAILABLE — RETURN TO BUNKER]';
    if (portraitEl) portraitEl.src = assetUrl(lorePortraitSrc(key));

    const metadata = LORE_METADATA[key];
    const dateEl = document.getElementById('archive-log-detail-date');
    const coordsEl = document.getElementById('archive-log-detail-coords');
    if (dateEl) dateEl.textContent = metadata ? `DATE: ${metadata.date}` : '';
    if (coordsEl) coordsEl.textContent = metadata ? `LOC: ${metadata.coords}` : '';

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

    const historicalKeys = ALL_LORE_KEYS.filter(k => LORE_METADATA[k]?.group === 'historical');
    const recentKeys = ALL_LORE_KEYS.filter(k => LORE_METADATA[k]?.group === 'recent');

    const sections = [
        { label: 'HISTORICAL COLLAPSE RECORDS', keys: historicalKeys },
        { label: 'RECENT CONTAINMENT OPERATIONS', keys: recentKeys }
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
                img.src = assetUrl(lorePortraitSrc(key));
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
const ACHIEVEMENT_BUTTON_SHINE_KEY = 'hb_achievements_button_shown_v1';

function getAchievementUnlockCount(state = achievementEngine.getState()) {
    return Object.keys(state.unlocked ?? {}).length;
}

function getLiveAchievementCount() {
    return ACHIEVEMENT_DEFS.filter((def) => !def.comingSoon).length;
}

function updateAchievementsMenuButton({ shine = false } = {}) {
    const state = achievementEngine.getState();
    const unlockedCount = getAchievementUnlockCount(state);
    const command = document.getElementById('achievements-command');
    const status = document.getElementById('achievements-command-status');
    if (command) command.classList.toggle('hidden', unlockedCount <= 0);
    if (status) status.textContent = unlockedCount > 0
        ? `${unlockedCount} / ${getLiveAchievementCount()} UNLOCKED`
        : 'LOCKED';

    if (!command || unlockedCount <= 0 || !shine) return;
    const alreadyShined = localStorage.getItem(ACHIEVEMENT_BUTTON_SHINE_KEY) === '1';
    if (alreadyShined) return;
    command.classList.add('achievement-command--new');
    localStorage.setItem(ACHIEVEMENT_BUTTON_SHINE_KEY, '1');
    window.setTimeout(() => command.classList.remove('achievement-command--new'), 3600);
}

function showAchievementToast(unlock) {
    if (!unlock) return;
    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) {
        showBiomePrompt(`> ACHIEVEMENT: ${unlock.title}`);
        return;
    }
    window.AudioManager?.play?.('fx_achievement', { volume: 0.35, bus: 'sfx' });
    const toast = document.createElement('div');
    toast.className = 'achievement-toast hud-stack-card hidden';
    toast.setAttribute('aria-live', 'polite');
    toast.dataset.notificationPriority = '5';
    toast.dataset.seq = String(hudCardSeq++);
    toast.dataset.autoDismissMs = '5600';
    toast.dataset.removeDelayMs = '320';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'achievement-toast__icon';
    const img = document.createElement('img');
    img.alt = '';
    img.src = assetUrl(`/ach_${unlock.icon ?? unlock.key}.png`);
    const fallback = document.createElement('span');
    fallback.textContent = 'ACH';
    img.addEventListener('error', () => {
        img.classList.add('hidden');
        fallback.classList.remove('hidden');
    }, { once: true });
    fallback.classList.add('hidden');
    iconWrap.append(img, fallback);

    const body = document.createElement('div');
    body.className = 'achievement-toast__body';
    const kicker = document.createElement('div');
    kicker.className = 'achievement-toast__kicker';
    kicker.textContent = 'ACHIEVEMENT UNLOCKED';
    const title = document.createElement('div');
    title.className = 'achievement-toast__title';
    title.textContent = unlock.title;
    const blurb = document.createElement('div');
    blurb.className = 'achievement-toast__blurb';
    blurb.textContent = unlock.blurb;
    body.append(kicker, title, blurb);
    toast.append(iconWrap, body);
    toast.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dismissHudNotificationCard(toast);
    });

    stack.append(toast);
    updateHudNotificationDeck();
    toast.classList.remove('hidden');
    requestAnimationFrame(() => {
        toast.classList.add('visible');
        updateHudNotificationDeck();
    });
}

function handleAchievementUnlocks(newUnlocks = [], { delayMs = 0 } = {}) {
    if (!newUnlocks.length) {
        updateAchievementsMenuButton();
        return;
    }
    updateAchievementsMenuButton({ shine: true });
    newUnlocks.forEach((unlock, index) => {
        window.dispatchEvent(new CustomEvent('achievement-unlocked', {
            detail: { key: unlock.key, title: unlock.title, blurb: unlock.blurb }
        }));
        window.setTimeout(() => showAchievementToast(unlock), delayMs + index * 700);
    });
}

function recordAchievementEvent(name, detail = {}, options = {}) {
    const result = achievementEngine.recordEvent(name, detail);
    handleAchievementUnlocks(result.newUnlocks, options);
    syncSteamStats(result.state, window.electronAPI?.setStat);
    return result;
}

function recordAchievementRunEnd(stats = {}, options = {}) {
    const result = achievementEngine.recordRunEnd(stats);
    handleAchievementUnlocks(result.newUnlocks, options);
    syncSteamStats(result.state, window.electronAPI?.setStat);
    return result;
}

function renderAchievementsModal() {
    const state = achievementEngine.getState();
    const grid = document.getElementById('achievements-grid');
    const summary = document.getElementById('achievements-summary');
    const status = document.getElementById('achievements-save-status');
    if (summary) summary.textContent = `${getAchievementUnlockCount(state)} / ${getLiveAchievementCount()} UNLOCKED`;
    if (status) status.textContent = '';
    if (!grid) return;
    grid.innerHTML = '';

    for (const def of ACHIEVEMENT_DEFS) {
        const unlocked = Boolean(state.unlocked?.[def.key]);
        const secretLocked = def.secret && !unlocked && !def.comingSoon;
        const progress = getAchievementProgress(def, state);
        const card = document.createElement('div');
        card.className = [
            'achievement-card',
            unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked',
            def.comingSoon ? 'achievement-card--soon' : ''
        ].filter(Boolean).join(' ');

        const icon = document.createElement('div');
        icon.className = 'achievement-card__icon';
        const img = document.createElement('img');
        img.alt = '';
        img.src = assetUrl(`/ach_${def.icon ?? def.key}.png`);
        const fallback = document.createElement('span');
        fallback.textContent = secretLocked ? '???' : (def.title.match(/[A-Z0-9]/g)?.slice(0, 3).join('') || 'ACH');
        img.addEventListener('error', () => {
            img.classList.add('hidden');
            fallback.classList.remove('hidden');
        }, { once: true });
        if (!unlocked) img.classList.add('achievement-card__img--locked');
        fallback.classList.add('hidden');
        icon.append(img, fallback);

        const body = document.createElement('div');
        body.className = 'achievement-card__body';
        const title = document.createElement('div');
        title.className = 'achievement-card__title';
        title.textContent = secretLocked ? '???' : def.title;
        const blurb = document.createElement('div');
        blurb.className = 'achievement-card__blurb';
        blurb.textContent = secretLocked ? 'Hidden record. Unlock to reveal.' : def.blurb;
        body.append(title, blurb);

        if (def.comingSoon) {
            const soon = document.createElement('div');
            soon.className = 'achievement-card__meta';
            soon.textContent = 'COMING SOON';
            body.appendChild(soon);
        } else if (progress && !unlocked && !secretLocked) {
            const meta = document.createElement('div');
            meta.className = 'achievement-card__meta';
            meta.textContent = `${progress.current} / ${progress.target}`;
            body.appendChild(meta);
        } else if (unlocked) {
            const meta = document.createElement('div');
            meta.className = 'achievement-card__meta achievement-card__meta--unlocked';
            meta.textContent = 'UNLOCKED';
            body.appendChild(meta);
        }

        card.append(icon, body);
        grid.appendChild(card);
    }
}

function openAchievementsModal() {
    renderAchievementsModal();
    const modal = document.getElementById('achievements-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closeAchievementsModal() {
    const modal = document.getElementById('achievements-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

async function copyAchievementSaveCode() {
    const code = exportSaveCode();
    const status = document.getElementById('achievements-save-status');
    if (!code) {
        if (status) status.textContent = 'SAVE CODE UNAVAILABLE';
        window.AudioManager?.play?.('ui_error', { volume: 0.5 });
        return;
    }
    let copied = false;
    try {
        await navigator.clipboard?.writeText(code);
        copied = true;
    } catch {
        // clipboard blocked
    }
    if (status) {
        status.textContent = copied
            ? 'SAVE CODE COPIED'
            : 'SAVE CODE READY IN SAVE DATA PANEL';
    }
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
    if (!copied) {
        setSaveDataOpen(true);
        if (saveDataCode) {
            saveDataCode.value = code;
            saveDataCode.select();
        }
    }
}

function installAchievementsUi() {
    updateAchievementsMenuButton({ shine: hasAnyUnlock(achievementEngine.getState()) });
    document.getElementById('achievements-btn')?.addEventListener('click', openAchievementsModal);
    document.getElementById('close-achievements-modal')?.addEventListener('click', closeAchievementsModal);
    document.getElementById('achievement-copy-save')?.addEventListener('click', copyAchievementSaveCode);
    document.getElementById('achievements-modal')?.addEventListener('click', (event) => {
        if (event.target?.id === 'achievements-modal') closeAchievementsModal();
    });
}
installAchievementsUi();

[
    'act2-milestone',
    'player-suspicion-changed',
    'hive-mined',
    'hive-choice-resolved',
    'reyes-letter-delivered',
    'run-cards-drawn',
    'shell-collected',
    'lore-drop-collected'
].forEach((eventName) => {
    window.addEventListener(eventName, (event) => {
        recordAchievementEvent(eventName, event?.detail ?? {});
    });
});

// ── Lore Terminal System ──────────────────────────────────────
const WORLD_MEMORY_KEY = 'hb_world_memory_v1';

function getWorldMemory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(WORLD_MEMORY_KEY) ?? 'null') ?? {};
        return {
            logsFound: Array.isArray(parsed.logsFound) ? parsed.logsFound : [],
            biomesMapped: Array.isArray(parsed.biomesMapped) ? parsed.biomesMapped : [],
            storyFlags: parsed.storyFlags && typeof parsed.storyFlags === 'object' ? { ...parsed.storyFlags } : {}
        };
    } catch { return { logsFound: [], biomesMapped: [], storyFlags: {} }; }
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
    if (key) setPromptKeyLabel(key);
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
    const { loreKey, loreText, title } = event?.detail ?? {};
    if (!loreKey || !loreText) return;

    const loreModal = document.getElementById('lore-modal');
    const loreKeyEl = document.getElementById('lore-modal-key');
    const loreTextEl = document.getElementById('lore-modal-text');
    if (!loreModal) return;

    if (loreKeyEl) loreKeyEl.textContent = title ? title : (window.game?.getLoreTitle?.(loreKey) ?? `LOG-${loreKey}`);
    if (loreTextEl) loreTextEl.textContent = '';

    const metadata = LORE_METADATA[loreKey];
    const dateEl = document.getElementById('lore-modal-date');
    const coordsEl = document.getElementById('lore-modal-coords');
    if (dateEl) dateEl.textContent = metadata ? `DATE: ${metadata.date}` : '';
    if (coordsEl) coordsEl.textContent = metadata ? `LOC: ${metadata.coords}` : '';

    loreModal.classList.remove('hidden');
    window.game?.setInputEnabled?.(false);

    // Typewrite the log text
    const token = ++loreTypewriterToken;
    let charIdx = 0;
    const chars = loreText.split('');
    AudioManager.playVoiceForMessage('BUNKER TERMINAL', loreText);
    const tick = () => {
        if (!loreTextEl || token !== loreTypewriterToken || loreModal.classList.contains('hidden')) return;
        if (charIdx < chars.length) {
            if (charIdx > 0 && charIdx % 28 === 0) {
                AudioManager.playVoiceForMessage('BUNKER TERMINAL', loreText.slice(charIdx, charIdx + 12));
            }
            loreTextEl.textContent += chars[charIdx++];
            setTimeout(tick, 18);
        }
    };
    tick();

    // Track discovery
    if (!event?.detail?.skipSave) {
        const isNew = markLogFound(loreKey);
        if (isNew) {
            fireMothershipReactiveLine('lore_found');
        }
    }
    if (recordSpecimen0047OriginIfFound(codexStore, getWorldMemory())) {
        const entry = getCodexEntry('specimen_0047');
        if (entry) showBiomePrompt(`> CODEX UPDATED: ${entry.name}`);
        updateMenuCommandStatuses();
        unlockRgbIfEarned({ specimen0047Recorded: true });
    }
});

document.getElementById('close-lore-modal')?.addEventListener('click', closeLoreModalAndResume);

// ── Reactive Mothership ───────────────────────────────────────
function fireMothershipReactiveLine(trigger) {
    const context = window.game?.buildLineDirectorContext?.() ?? {};
    const line = window.lineDirector?.requestLine(`mothership:${trigger}`, context, MOTHERSHIP_REACTIVE_LINES);
    if (line) showBiomePrompt(line.text);
}

window.addEventListener('special-room-discovered', (event) => {
    const label = event?.detail?.label ?? 'SPECIAL ROOM';
    const template = event?.detail?.template ?? '';
    showDeveloperCommentary(`room_${template}`, event?.detail ?? {});
    recordSteamTimelineEvent('special_room', 'Special Room Found', label, {
        icon: template || 'room',
        priority: template === 'the_nest' ? 3 : 1,
        durationSeconds: template === 'the_nest' ? 10 : 6
    });
    const wreckageLog = template === 'agent_wreckage'
        ? getClassWreckageLog(window.game?.playerType ?? getSelectedHeroType(), event?.detail ?? {})
        : null;
    const roomMessages = {
        armory: `> SCAN: ${label} — WEAPON CACHE`,
        the_nest: `> ALERT: ${label} — HIGH THREAT`,
        agent_wreckage: wreckageLog
            ? `> SCAN: ${wreckageLog.title} — ${wreckageLog.hull} PAYLOAD RECOVERED`
            : `> SCAN: ${label} — RECOVERY SIGNAL`
    };
    if (roomMessages[template]) showBiomePrompt(roomMessages[template]);
    if (wreckageLog) {
        discoverCodex(wreckageLog.codexId, {
            classType: wreckageLog.classType,
            hull: wreckageLog.hull,
            date: wreckageLog.date,
            coords: wreckageLog.coords,
            payload: wreckageLog.payload
        });
    }
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
    showDeveloperCommentary('black_box_signal');
    recordSteamTimelineEvent('black_box_signal', 'Black Box Signal Detected', 'A recoverable death archive signal was marked on the compass.', {
        icon: 'black_box',
        priority: 2,
        durationSeconds: 8
    });
});

window.addEventListener('black-box-prompt-nearby', (event) => {
    const locked = event?.detail?.locked;
    const prompt = document.getElementById('black-box-hud-prompt');
    if (!isGameplayHudActive()) {
        prompt?.classList.add('hidden');
        prompt?.classList.remove('visible');
        return;
    }
    const key = prompt?.querySelector('.prompt-key');
    const text = prompt?.querySelector('.prompt-text');
    if (key) {
        setPromptKeyLabel(key);
        key.classList.toggle('hidden', Boolean(locked));
    }
    if (text) {
        text.textContent = locked ? 'DEFEAT GUARD TO UNLOCK BLACK BOX' : 'RECOVER BLACK BOX';
    }
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

// Camp Bonding Quests sub-objective tracker — same show/hide shape as
// showMissionProgressHUD/hideMissionProgressHUD above, driven by the
// camp-quest-progress/camp-quest-complete events threeGame.js dispatches.
function showCampQuestHUD(text) {
    if (!isGameplayPhase()) return;
    const hud = document.getElementById('camp-quest-hud');
    const textEl = document.getElementById('camp-quest-text');
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

function hideCampQuestHUD() {
    const hud = document.getElementById('camp-quest-hud');
    if (hud) hud.classList.add('hidden');
}

// ── Single-Grammar Objective Registry & HUD Tracker ───────────
const objectiveRegistry = new ObjectiveRegistry();
window.objectiveRegistry = objectiveRegistry;
objectiveRegistry.bindWindowEvents(window);

function renderObjectiveTracker(activeObjectives) {
    const trackerEl = document.getElementById('objective-tracker');
    if (!trackerEl) return;

    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const gameOverModal = document.getElementById('game-over-modal');
    const splash = document.getElementById('splash');
    const isGameplayActive = ui && !ui.classList.contains('hidden') &&
                             (!menu || menu.classList.contains('hidden')) &&
                             (!gameOverModal || gameOverModal.classList.contains('hidden')) &&
                             (!splash || splash.classList.contains('hidden'));

    if (!isGameplayPhase() || !isGameplayActive || isResettingRun || !activeObjectives || activeObjectives.length === 0) {
        trackerEl.classList.add('hidden');
        trackerEl.replaceChildren();
        return;
    }

    trackerEl.replaceChildren();
    activeObjectives.forEach((obj, index) => {
        const item = document.createElement('div');
        item.className = `objective-tracker__item ${index === 0 ? 'objective-tracker__item--prio-high' : ''}`;

        const header = document.createElement('div');
        header.className = 'objective-tracker__header';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'objective-tracker__label';
        labelSpan.innerHTML = `<span class="objective-tracker__icon">◈</span>${obj.label}`;

        const progSpan = document.createElement('span');
        progSpan.className = 'objective-tracker__progress';
        progSpan.textContent = obj.target > 1 ? `${obj.current}/${obj.target}` : (obj.current >= obj.target ? '100%' : 'ACTIVE');

        header.append(labelSpan, progSpan);
        item.appendChild(header);

        if (Array.isArray(obj.steps) && obj.steps.length > 0 && index === 0) {
            const stepsDiv = document.createElement('div');
            stepsDiv.className = 'objective-tracker__steps';
            obj.steps.forEach((step) => {
                const stepRow = document.createElement('div');
                stepRow.className = `objective-tracker__step ${step.done ? 'objective-tracker__step--done' : ''}`;
                const check = document.createElement('span');
                check.className = 'objective-tracker__check';
                check.textContent = step.done ? '✓' : '◇';
                const label = document.createElement('span');
                label.textContent = step.label;
                stepRow.append(check, label);
                stepsDiv.appendChild(stepRow);
            });
            item.appendChild(stepsDiv);
        }

        trackerEl.appendChild(item);
    });

    trackerEl.classList.remove('hidden');
}

objectiveRegistry.onChange((active) => {
    renderObjectiveTracker(active);
});

window.addEventListener('camp-quest-progress', (event) => {
    const { questId, label, current, target, compass } = event?.detail ?? {};
    if (!label) return;
    showCampQuestHUD(`${label}: ${current ?? 0}/${target ?? 1}`);
    objectiveRegistry.trackObjective({
        id: `camp_quest:${questId ?? label}`,
        source: 'camp-quest',
        label,
        current: current ?? 0,
        target: target ?? 1,
        priority: 40,
        compass: compass ?? null
    });
});

window.addEventListener('camp-quest-complete', (event) => {
    const { questId } = event?.detail ?? {};
    hideCampQuestHUD();
    if (questId) {
        objectiveRegistry.resolveObjective(`camp_quest:${questId}`, 'complete');
    }
});

window.addEventListener('black-box-marker-active', (event) => {
    const { x, z } = event?.detail ?? {};
    objectiveRegistry.trackObjective({
        id: 'story:black_box',
        source: 'black-box',
        label: 'RECOVER BLACK BOX',
        current: 0,
        target: 1,
        priority: 10,
        compass: Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null
    });
});

window.addEventListener('black-box-recovered', () => {
    objectiveRegistry.resolveObjective('story:black_box', 'complete');
});

window.addEventListener('player-death', () => {
    objectiveRegistry.clear();
});

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

document.getElementById('radar-scan-panel')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.game?.triggerRadarScan?.();
});

window.addEventListener('engineer-turret-tick', (event) => {
    const { remaining = 0, max = 1, active = false } = event?.detail ?? {};
    const bar = document.getElementById('ability-bar');
    const panel = document.getElementById('class-ability-panel');
    const clampedMax = Math.max(0.001, Number(max) || 0.001);
    const clampedRemaining = Math.max(0, Number(remaining) || 0);
    if (bar) {
        const fillPct = active
            ? (clampedRemaining / clampedMax)
            : 1 - (clampedRemaining / clampedMax);
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fillPct))})`;
    }
    if (panel) {
        panel.classList.toggle('class-ability-panel--active', active);
        panel.classList.toggle('class-ability-panel--cooling', !active && clampedRemaining > 0);
        panel.classList.toggle('class-ability-panel--ready', !active && clampedRemaining <= 0);
    }
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

});

function syncAbilityPanelLabel() {
    const info = window.game?.getClassPassiveInfo?.();
    const name = info?.name ?? 'EVASIVE';
    const description = info?.description ?? '';
    const nameEl = document.getElementById('ability-name');
    if (nameEl) nameEl.textContent = name;
    const panel = document.getElementById('class-ability-panel');
    if (panel) {
        panel.title = description;
        const isEngineer = window.game?.playerType === 'ENGINEER';
        panel.classList.toggle('class-ability-panel--static', !isEngineer);
        if (!isEngineer) {
            panel.classList.remove('class-ability-panel--active', 'class-ability-panel--cooling', 'class-ability-panel--ready');
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
        const line = getDialogueLine('lowO2', Math.random, getActiveSuitDialogueContext());
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
        triggerDoorTransition(
            () => {
                hideGameOverScreen();
                showRunLoadingScreen('DOWNLOADING SECTOR PILLAR TOPOGRAPHY...', 0, { overDoor: true });
                // Death puts the app in the gameover phase. Input can be
                // enabled on ThreeGame after the doors reopen, but movement
                // is still rejected while the global phase remains there.
                // Restore gameplay before rebuilding, matching a fresh run.
                setAppPhase('gameplay');
                window.game?.setPerformanceProfile?.('gameplay');
                resetRunToStartingState({
                    resetBank: false,
                    skipEffects: false,
                    snailSpawnEnabled: true,
                    purgeSnails: false,
                    deferChunkMount: true
                });
                document.getElementById('ui')?.classList.remove('hidden');
                syncHudCompassVisibility();
                return prepareGameplayForDialogue({ loaderOverDoor: true });
            },
            () => {
                window.game?.setInputEnabled?.(true);
            },
            undefined,
            { waitForClosedWork: true, openingHoldMs: 160 }
            // Defaults to the currently selected class door
        );
    });
}

function returnToMainMenuFromRun({ doorKey = 'base' } = {}) {
    hideBiomePrompt();
    missionFlowRunning = false;
    setSnailSpawnState(false, { purgeExisting: true });

    triggerDoorTransition(
        () => {
            hideGameOverScreen();
            document.getElementById('ui')?.classList.add('hidden');
            window.game?.setInputEnabled?.(false);
            syncHudCompassVisibility();
            if (menu) menu.classList.remove('hidden');
            window.game?.setPerformanceProfile?.('menu');
            transitionToMenuMusic();
            updateArchiveSimsMenuVisibility();
            maybeShowRgbUnlockToast();

            const gameContainer = document.getElementById('game-container');
            const mapBox = document.querySelector('.map-box');
            if (gameContainer && mapBox) {
                const commandBlock = mapBox.querySelector('.menu-header-actions');
                mapBox.insertBefore(gameContainer, commandBlock ?? mapBox.querySelector('.module-scanline'));
                gameContainer.classList.remove('fullscreen-mode');
                // A death return leaves the world avatar flagged dead (and pit
                // deaths may leave its scale at zero). Restore the menu-map
                // preview without resetting the player's persistent run data.
                window.game?.respawnPlayer?.({ resetRunState: false, skipEffects: true });
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

function showDemoEndModal() {
    setAppPhase('demo-end');
    window.game?.setInputEnabled?.(false);
    hideAllGameplayPrompts();
    const modal = document.getElementById('demo-end-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        document.getElementById('demo-wishlist-btn')?.focus?.({ preventScroll: true });
    });
}

document.getElementById('demo-wishlist-btn')?.addEventListener('click', () => {
    if (window.electronAPI?.openSteamOverlayToUrl) {
        window.electronAPI.openSteamOverlayToUrl(STEAM_STORE_URL);
    } else {
        window.open(STEAM_STORE_URL, '_blank', 'noopener');
    }
});

document.getElementById('demo-end-main-menu')?.addEventListener('click', () => {
    window.location.reload();
});

function syncHudCompassVisibility() {
    if (!desktopCompass) return;

    const ui = document.getElementById('ui');
    const menu = document.getElementById('menu');
    const isHUD = !ui?.classList.contains('hidden');
    const isMenuHidden = menu?.classList.contains('hidden') ?? true;
    const inMissionIntro = document.body.classList.contains('mission-intro-active');
    const showHudReadouts = isHUD && isMenuHidden && !inMissionIntro;

    desktopCompass.classList.toggle('hidden', !showHudReadouts);
}

function formatCompassDistance(distance) {
    if (!Number.isFinite(distance) || distance <= 0) return '0u';
    return `${Math.round(distance)}u`;
}

function updateHudCompass() {
    const compassState = window.game?.getSpawnCompassState?.();
    if (!compassState) {
        if (desktopCompassArrow) {
            desktopCompassArrow.style.transform = 'rotate(0deg)';
            desktopCompassArrow.style.opacity = '0.35';
        }
        if (desktopCompassDistance) {
            desktopCompassDistance.textContent = '0u';
        }
        if (desktopCompassRadarArrow) {
            desktopCompassRadarArrow.classList.add('hidden');
            desktopCompassRadarArrow.style.transform = 'rotate(0deg)';
            desktopCompassRadarArrow.style.opacity = '0';
        }
        if (desktopCompassRadarRow) {
            desktopCompassRadarRow.classList.add('hidden');
        }
        if (desktopCompassRadarDistance) {
            desktopCompassRadarDistance.textContent = '';
        }
        return;
    }

    const angle = Number.isFinite(compassState.angle) ? compassState.angle : 0;
    const distance = Number.isFinite(compassState.distance) ? compassState.distance : 0;
    if (desktopCompassArrow) {
        desktopCompassArrow.style.transform = `rotate(${angle.toFixed(2)}deg)`;
        desktopCompassArrow.style.opacity = distance <= 0.05 ? '0.35' : '1';
    }
    if (desktopCompassDistance) {
        desktopCompassDistance.textContent = formatCompassDistance(distance);
    }

    const radarState = compassState.radar ?? null;
    const radarActive = Boolean(radarState?.active);
    if (desktopCompassRadarArrow) {
        if (!radarActive) {
            desktopCompassRadarArrow.classList.add('hidden');
            desktopCompassRadarArrow.style.opacity = '0';
        } else {
            const radarAngle = Number.isFinite(radarState.angle) ? radarState.angle : 0;
            const radarDistance = Number.isFinite(radarState.distance) ? radarState.distance : 0;
            desktopCompassRadarArrow.classList.remove('hidden');
            desktopCompassRadarArrow.style.transform = `rotate(${radarAngle.toFixed(2)}deg)`;
            desktopCompassRadarArrow.style.opacity = radarDistance <= 0.05 ? '0.35' : '0.95';
        }
    }
    if (desktopCompassRadarRow) {
        desktopCompassRadarRow.classList.toggle('hidden', !radarActive);
    }
    if (desktopCompassRadarDistance) {
        if (radarActive) {
            const radarDistance = Number.isFinite(radarState.distance) ? radarState.distance : 0;
            desktopCompassRadarDistance.textContent = radarState.mode === 'corrupt'
                ? 'OUT OF SYNC'
                : formatCompassDistance(radarDistance);
        } else {
            desktopCompassRadarDistance.textContent = '';
        }
    }
}

function installHudCompass() {
    if (!desktopCompassArrow || !desktopCompassDistance) return;

    if (desktopCompass && !desktopCompass.dataset.clickBound) {
        desktopCompass.dataset.clickBound = 'true';
        desktopCompass.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleTacticalMapModal();
        });
        desktopCompass.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleTacticalMapModal();
            }
        });
    }

    const step = () => {
        syncHudCompassVisibility();
        updateHudCompass();
        requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

function syncStageMetrics() {
    if (!gameViewport) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const targetRes = state?.settings?.resolutionPreset;
    if (targetRes && targetRes !== 'auto') {
        const presets = {
            'deck': { w: 1280, h: 800 },
            '720p': { w: 1280, h: 720 },
            '1080p': { w: 1920, h: 1080 },
            '1440p': { w: 2560, h: 1440 },
            '4k': { w: 3840, h: 2160 }
        };
        const selected = presets[targetRes];
        if (selected) {
            width = selected.w;
            height = selected.h;
        }
    }

    document.documentElement.style.setProperty('--vw-actual', `${width}px`);
    document.documentElement.style.setProperty('--vh-actual', `${height}px`);

    const rect = gameViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const uiScaleMultiplier = (Number(state?.settings?.uiScale) || 100) / 100;
    const baseUnit = Math.min(rect.width / DESIGN_STAGE.width, rect.height / DESIGN_STAGE.height);
    // --vu is the base layout unit (unscaled) for layout containers, doors, images, and canvas elements
    gameViewport.style.setProperty('--vu', `${baseUnit}px`);
    // --vu-text is scaled by UI Accessibility Scale to scale text sizes independently of images
    gameViewport.style.setProperty('--vu-text', `${baseUnit * uiScaleMultiplier}px`);
    gameViewport.style.setProperty('--ui-scale-multiplier', String(uiScaleMultiplier));

    const textFloor = Number(state?.settings?.textFloor) || 18;
    document.documentElement.style.setProperty('--hb-text-floor', `${textFloor}px`);

    // Expose the canonical 1280x800 stage transform for logical-pixel
    // consumers (archive sims, pointer mapping, safe-frame checks).
    const stage = computeStageTransform(width, height);
    window.hbStage = stage;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--stage-scale', String(stage.scale));
    rootStyle.setProperty('--stage-x', `${stage.offsetX}px`);
    rootStyle.setProperty('--stage-y', `${stage.offsetY}px`);
    rootStyle.setProperty('--stage-w', `${stage.stageWidth}px`);
    rootStyle.setProperty('--stage-h', `${stage.stageHeight}px`);
    rootStyle.setProperty('--stage-px', `${stage.stageWidth / STAGE_WIDTH}px`);
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
    return selected?.getAttribute('data-type') || window.game?.playerType || getSavedHeroType();
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
        loaderBriefingAvatarImg.src = assetUrl(avatar);
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

function showTacticalNotificationToast({ title, status, duration = 4000 }) {
    const stack = document.querySelector('.hud-notification-stack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = 'tactical-alert-toast';
    toast.innerHTML = `
        <div class="tactical-alert-toast__icon">⚠️</div>
        <div class="tactical-alert-toast__body">
            <div class="tactical-alert-toast__header">
                <span class="tactical-alert-toast__kicker">TACTICAL ALERT</span>
                <span class="tactical-alert-toast__status">CRITICAL</span>
            </div>
            <div class="tactical-alert-toast__title">${title}</div>
            <div class="tactical-alert-toast__blurb">${status}</div>
        </div>
    `;

    stack.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 50);

    setTimeout(() => {
        toast.classList.remove('visible');
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 600);
    }, duration);
}

async function prepareGameplayForDialogue({ loaderOverDoor = false } = {}) {
    const game = window.game;
    if (!game?.prepareVisibleChunksForGameplay) return;

    // An intro launch owns a longer-lived pause that begins before the world
    // build and ends only after the final doors reveal gameplay. Preserve that
    // outer hold instead of briefly starting vitals/enemies during warm-up.
    const wasLoadingPaused = Boolean(game.loadingPaused);

    let announcedStage = '';
    const announceDeploymentStage = (stage, status, progress) => {
        showRunLoadingScreen(status, progress, { overDoor: loaderOverDoor });
        if (announcedStage !== stage) {
            announcedStage = stage;
            debugLog.info('STARTUP', `${stage} — ${status}`);
        }
    };
    announceDeploymentStage('PROFILE', 'VALIDATING OPERATOR PROFILE AND LOADOUT...', 0);
    game.setLoadingPaused?.(true);
    try {
        announceDeploymentStage('VIEWPORT', 'CALIBRATING VIEWPORT AND INPUT...', 6);
        await settleGameLayoutForWarmup();
        announceDeploymentStage('WORLD', 'GENERATING SECTOR TOPOLOGY...', 10);
        await game.prepareVisibleChunksForGameplay({
            batchSize: 3,
            onProgress: (progress) => {
                const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
                if (pct < 70) {
                    announceDeploymentStage('WORLD', `GENERATING SECTOR TOPOLOGY... ${pct}%`, pct);
                } else if (pct < 94) {
                    announceDeploymentStage('MOUNT', `MOUNTING TERRAIN, ROOMS, AND ENCOUNTERS... ${pct}%`, pct);
                } else {
                    announceDeploymentStage('RENDER', `WARMING MATERIALS AND LIGHTING... ${pct}%`, pct);
                }
            }
        });
        announceDeploymentStage('PRESENT', 'PRESENTING FIRST RENDERED SECTOR FRAME...', 98);
        if (!wasLoadingPaused) game.setLoadingPaused?.(false);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        game.renderer?.render?.(game.scene, game.camera);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        announceDeploymentStage('READY', 'DEPLOYMENT READY — TRANSFERRING CONTROL', 100);
        await new Promise((resolve) => window.setTimeout(resolve, loaderOverDoor ? 220 : 120));
    } finally {
        game.setLoadingPaused?.(wasLoadingPaused);
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
    return document.getElementById('game-viewport')
        ?? document.getElementById('game-container')
        ?? document.body;
}

function warmCutsceneImage(src) {
    if (!src || cutsceneImagePreloadCache.has(src)) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = assetUrl(src);
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
    video.poster = assetUrl(`/cutscenes/${base}-poster.jpg`);
    video.src = assetUrl(source);
    video.load();
    cutsceneVideoPreloadCache.set(source, video);
}

function warmClassIntroMedia(playerType = 'SCOUT') {
    const webmBase = CLASS_INTRO_WEBM_BASENAMES[playerType] ?? CLASS_INTRO_WEBM_BASENAMES.SCOUT;
    warmCutsceneVideo(webmBase);
}

function playClassIntroSequence(playerType = 'SCOUT') {
    const webmBase = CLASS_INTRO_WEBM_BASENAMES[playerType] ?? CLASS_INTRO_WEBM_BASENAMES.SCOUT;
    warmClassIntroMedia(playerType);
    window.AudioManager?.unlock?.();

    return new Promise((resolve) => {
        if (window.skipAllIntro) {
            resolve();
            return;
        }
        const resumeGame = suspendGameForFullscreenVideo();

        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('AUDIO', 'info', `Starting intro cutscene sequence for ${playerType}`);
        }

        const host = getCutsceneVideoHost();
        const overlay = document.createElement('div');
        overlay.className = 'class-intro-overlay';
        overlay.style.setProperty('--class-intro-poster', `url('${assetUrl(`/cutscenes/${webmBase}-poster.jpg`)}')`);

        const skipHint = document.createElement('div');
        skipHint.className = 'class-intro-skip';
        skipHint.textContent = 'PRESS ANY BUTTON / KEY TO SKIP';

        let settled = false;
        let guardTimer = null;
        let videoElement = null;
        let checkSkipInterval = null;

        const clearTimers = () => {
            if (guardTimer) {
                window.clearTimeout(guardTimer);
                guardTimer = null;
            }
        };

        function cleanupAndResolve() {
            if (settled) return;
            settled = true;
            clearTimers();
            if (checkSkipInterval) {
                clearInterval(checkSkipInterval);
                checkSkipInterval = null;
            }
            window.removeEventListener('keydown', onKey);
            overlay.removeEventListener('pointerup', onPointerUp);
            overlay.classList.add('is-closing');

            window.setTimeout(() => {
                overlay.style.display = 'none';
                if (videoElement) {
                    try {
                        videoElement.pause();
                        videoElement.removeAttribute('src');
                        videoElement.replaceChildren();
                        videoElement.load();
                    } catch { /* ignore */ }
                    videoElement.remove();
                }
                overlay.remove();
                resumeGame();
                resolve();
            }, 280);
        }

        function onKey(event) {
            event.preventDefault();
            cleanupAndResolve();
        }

        function onPointerUp(event) {
            event.preventDefault();
            cleanupAndResolve();
        }

        window.addEventListener('keydown', onKey);
        overlay.addEventListener('pointerup', onPointerUp);

        checkSkipInterval = setInterval(() => {
            if (window.skipAllIntro) {
                cleanupAndResolve();
            }
        }, 50);

        // Start directly on the authored class movie. The old GIF pre-roll
        // looked like a stray flash/interstitial before the real intro loaded.
        overlay.append(skipHint);
        host.appendChild(overlay);
        buildVideo();

        function buildVideo() {
        videoElement = document.createElement('video');
        videoElement.className = 'class-intro-video';
        videoElement.style.opacity = '0';
        videoElement.playsInline = true;
        // The class clips contain unexplained combat/gunfire audio that does
        // not match the on-screen action. Keep the visual briefing clean.
        videoElement.muted = true;
        videoElement.volume = Math.min(1, Math.max(0, window.AudioManager?.masterVolume ?? 1.0));
        videoElement.autoplay = true;
        videoElement.controls = false;
        videoElement.preload = 'auto';
        videoElement.poster = assetUrl(`/cutscenes/${webmBase}-poster.jpg`);

        const webmSource = document.createElement('source');
        webmSource.src = assetUrl(`/cutscenes/${webmBase}.webm`);
        webmSource.type = 'video/webm';

        // The intro is a one-shot cutscene and never loops.
        if (videoElement.canPlayType('video/webm')) {
            videoElement.append(webmSource);
        } else {
            const mp4Fallback = document.createElement('source');
            mp4Fallback.src = assetUrl(`/cutscenes/${webmBase}.mp4`);
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

        videoElement.play().catch(() => {
            videoElement.muted = true;
            return videoElement.play();
        }).catch(cleanupAndResolve);
        }
    });
}

// Generic fullscreen cutscene video: plays /cutscenes/{base}.webm (mp4
// fallback, {base}-poster.jpg). Skippable, and resolves immediately when the
// asset doesn't exist so story beats never stall on missing files.
function playCutsceneVideo(base, options = {}) {
    const { onDoorCutoff = null } = (typeof options === 'object' && options !== null ? options : {});
    warmCutsceneVideo(base);
    window.AudioManager?.unlock?.();

    return new Promise((resolve) => {
        const resumeGame = suspendGameForFullscreenVideo();
        if (typeof window !== 'undefined' && window.hbLog) {
            window.hbLog('AUDIO', 'info', `Playing cutscene video: ${base}`);
        }

        const host = getCutsceneVideoHost();
        const overlay = document.createElement('div');
        overlay.className = 'class-intro-overlay';
        if (base === 'DoorIntro' || base.includes('DoorIntro')) {
            overlay.style.backgroundColor = '#000000';
            overlay.style.setProperty('--class-intro-poster', 'none');
        } else {
            const posterUrl = base.includes('/') || base.endsWith('.mp4') ? '/title_key_art_v2.png' : `/cutscenes/${base}-poster.jpg`;
            overlay.style.setProperty('--class-intro-poster', `url('${assetUrl(posterUrl)}')`);
        }

        const video = document.createElement('video');
        video.className = 'class-intro-video';
        video.style.opacity = '0';
        video.playsInline = true;
        video.muted = Boolean(window.AudioManager?.globalMuted);
        video.volume = Math.min(1, Math.max(0, window.AudioManager?.masterVolume ?? 1.0));
        video.autoplay = true;
        video.controls = false;
        video.preload = 'auto';

        const sources = [];
        if (base === 'DoorIntro' || base === '/DoorIntro.mp4' || base === 'DoorIntro.mp4') {
            sources.push('/DoorIntro.mp4');
        }
        if (base.startsWith('/')) {
            sources.push(base);
        }
        sources.push(`/cutscenes/${base}.webm`, `/cutscenes/${base}.mp4`, `/${base}.mp4`, `/${base}.webm`);

        let primarySource = null;
        for (const src of [...new Set(sources)]) {
            const sourceEl = document.createElement('source');
            sourceEl.src = assetUrl(src);
            if (src.endsWith('.webm')) sourceEl.type = 'video/webm';
            if (src.endsWith('.mp4')) sourceEl.type = 'video/mp4';
            video.appendChild(sourceEl);
            if (!primarySource) primarySource = sourceEl;
        }

        const skipHint = document.createElement('div');
        skipHint.className = 'class-intro-skip';
        skipHint.textContent = 'PRESS ANY BUTTON / KEY TO SKIP';

        let settled = false;
        let played = false;
        let fadingOut = false;
        let guardTimer = 0;

        const finish = ({ skipped = false } = {}) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(guardTimer);
            window.removeEventListener('keydown', onKey);
            if (typeof onDoorCutoff === 'function') {
                onDoorCutoff();
            }
            overlay.classList.add('is-closing');

            setTimeout(() => {
                overlay.style.display = 'none';
                try {
                    video.pause();
                    video.removeAttribute('src');
                    video.replaceChildren();
                    video.load();
                } catch { /* ignore */ }
                video.remove();
                overlay.remove();
                resumeGame();
                resolve({ played, skipped });
            }, skipped ? 150 : 280);
        };

        const onKey = (event) => {
            event.preventDefault();
            finish({ skipped: true });
        };

        video.addEventListener('timeupdate', () => {
            if (!fadingOut && Number.isFinite(video.duration) && video.duration > 0) {
                const doorCutoffTime = (base === 'DoorIntro' || base.includes('DoorIntro') || base.includes('intro'))
                    ? Math.min(video.duration * 0.40, 3.2)
                    : (video.duration - 0.5);

                if (video.currentTime >= doorCutoffTime) {
                    fadingOut = true;
                    if (typeof onDoorCutoff === 'function') {
                        onDoorCutoff();
                    }
                    setTimeout(() => finish({ skipped: false }), 200);
                }
            }
        });

        video.addEventListener('ended', finish);
        video.addEventListener('error', finish);
        video.addEventListener('loadeddata', () => {
            played = true;
            video.style.opacity = '1';
        }, { once: true });

        if (primarySource) {
            primarySource.addEventListener('error', finish);
        }
        overlay.addEventListener('pointerup', finish);
        window.addEventListener('keydown', onKey);
        guardTimer = window.setTimeout(() => {
            if (video.readyState < 2) finish();
        }, 4000);
        video.addEventListener('playing', () => {
            window.clearTimeout(guardTimer);
            played = true;
            video.style.opacity = '1';
        });

        overlay.append(video, skipHint);
        host.appendChild(overlay);
        video.play().catch(() => {
            video.muted = true;
            return video.play();
        }).catch(finish);
    });
}

function playCinematicStills(rawSpec = {}) {
    const spec = normalizeCinematicStillSpec(rawSpec);
    if (!spec.images.length && !spec.title && !spec.body) {
        return Promise.resolve({ skipped: false });
    }

    return new Promise((resolve) => {
        const host = getCutsceneVideoHost();
        const overlay = document.createElement('div');
        overlay.className = `cinematic-still-overlay cinematic-still-overlay--${spec.tone}`;
        overlay.style.setProperty('--cinematic-still-fit', spec.fit);
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', spec.title);

        const frameA = document.createElement('img');
        frameA.className = 'cinematic-still-frame is-active';
        frameA.alt = '';
        if (spec.images[0]) frameA.src = assetUrl(spec.images[0]);

        const frameB = document.createElement('img');
        frameB.className = 'cinematic-still-frame';
        frameB.alt = '';
        if (spec.images[1]) frameB.src = assetUrl(spec.images[1]);

        const shade = document.createElement('div');
        shade.className = 'cinematic-still-shade';

        const copy = document.createElement('div');
        copy.className = 'cinematic-still-copy';
        const kicker = document.createElement('div');
        kicker.className = 'cinematic-still-kicker';
        kicker.textContent = spec.kicker;
        const title = document.createElement('div');
        title.className = 'cinematic-still-title';
        title.textContent = spec.title;
        const body = document.createElement('div');
        body.className = 'cinematic-still-body';
        body.textContent = spec.body;
        copy.append(kicker, title);
        if (spec.body) copy.append(body);

        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'class-intro-skip cinematic-still-skip';
        skip.textContent = spec.allowSkip ? 'PRESS ANY BUTTON / KEY TO CONTINUE' : '';
        skip.disabled = !spec.allowSkip;

        overlay.append(frameA);
        if (spec.images[1]) overlay.append(frameB);
        overlay.append(shade, copy, skip);
        host.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('is-open'));

        let settled = false;
        let frameTimer = 0;
        let finishTimer = 0;
        const finish = (skipped = false) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(frameTimer);
            window.clearTimeout(finishTimer);
            window.removeEventListener('keydown', onKey);
            overlay.removeEventListener('pointerup', onPointer);
            skip.removeEventListener('click', onSkipClick);
            overlay.classList.add('is-closing');
            window.setTimeout(() => overlay.remove(), 320);
            resolve({ skipped });
        };
        const onKey = (event) => {
            if (!spec.allowSkip) return;
            event.preventDefault();
            finish(true);
        };
        const onPointer = (event) => {
            if (!spec.allowSkip) return;
            event.preventDefault();
            finish(true);
        };
        const onSkipClick = (event) => {
            event.preventDefault();
            finish(true);
        };

        if (spec.allowSkip) {
            window.addEventListener('keydown', onKey);
            overlay.addEventListener('pointerup', onPointer);
            skip.addEventListener('click', onSkipClick);
            skip.focus({ preventScroll: true });
        }
        if (spec.images[1]) {
            frameTimer = window.setTimeout(() => {
                frameA.classList.remove('is-active');
                frameB.classList.add('is-active');
                overlay.classList.add('is-second-frame');
            }, Math.min(spec.frameMs, spec.durationMs - 600));
        }
        finishTimer = window.setTimeout(() => finish(false), spec.durationMs);
    });
}

async function playCinematicBeat({
    videoBase = null,
    fallback = null
} = {}) {
    if (videoBase) {
        const result = await playCutsceneVideo(videoBase);
        if (result?.played || result?.skipped) return result;
    }
    return playCinematicStills(fallback ?? {});
}

let cinematicEventQueue = Promise.resolve();
const seenSessionCinematicEvents = new Set();

function queueCinematicEvent(options = {}) {
    if (!isGameplayPhase()) return Promise.resolve({ skipped: true, reason: 'not-gameplay' });
    cinematicEventQueue = cinematicEventQueue
        .catch(() => undefined)
        .then(async () => {
            window.game?.setCinematicLock?.(true);
            try {
                return await playCinematicBeat(options);
            } finally {
                window.game?.setCinematicLock?.(false);
            }
        });
    return cinematicEventQueue;
}

window.addEventListener('cinematic-event', (event) => {
    const detail = event?.detail ?? {};
    void queueCinematicEvent({
        videoBase: detail.videoBase ?? null,
        fallback: detail.fallback ?? detail
    });
});

function playAuthoredEventOnce(eventId, { videoBase = null, eventDetail = {} } = {}) {
    if (!shouldPlayAuthoredEventCinematic({ appPhase, ...eventDetail })) return;
    if (seenSessionCinematicEvents.has(eventId)) return;
    const fallback = getEventCinematicSpec(eventId);
    if (!fallback) return;
    seenSessionCinematicEvents.add(eventId);
    void queueCinematicEvent({ videoBase, fallback });
}

window.addEventListener('foundry-discovered', (event) => {
    playAuthoredEventOnce('foundry_discovered', {
        videoBase: 'event-foundry-discovered',
        eventDetail: event?.detail ?? {}
    });
});
window.addEventListener('black-box-recovered', () => {
    playAuthoredEventOnce('black_box_recovered', { videoBase: 'event-black-box-recovered' });
});
window.addEventListener('queen-fight-started', () => {
    playAuthoredEventOnce('queen_encounter', { videoBase: 'event-queen-encounter' });
});

// ── Act 2 run intro: the queen replaces the Mothership handshake ──
function repairInterruptedCaveReveal() {
    if (!ARC_PRELUDE_ENABLED || !arcManager) return null;
    const arc = arcManager.getState();
    if (arc.arcState === 'infected_blackout') {
        return arcManager.forceState('hive_awakened_tease');
    }
    return arc;
}

function isAct2RunActive() {
    if (!ARC_PRELUDE_ENABLED || !arcManager || !act2Manager) return false;
    return repairInterruptedCaveReveal()?.arcState === 'hive_awakened_tease';
}

function clearAct1MissionForAct2(game = window.game) {
    currentMission = null;
    game?.clearMission?.();
    hideExtractionRing();
    hideMissionProgressHUD();
}

async function runAct2IntroSequence(game, playerType) {
    clearAct1MissionForAct2(game);
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

async function runMissionIntroSequence({ deploymentHold = null } = {}) {
    if (missionFlowRunning) {
        deploymentHold?.();
        return;
    }

    ensureMissionManagers();
    missionFlowRunning = true;
    document.body.classList.add('mission-intro-active');
    const game = window.game;
    let resumeIntroRendering = deploymentHold || suspendGameForFullscreenVideo();
    const playerType = getSelectedHeroType();

    // This is independent of renderer warm-up pause state: scripted intro
    // sequences must remain invulnerable even if another caller changes the
    // render pause while loading assets or mounting chunks.
    game?.setCinematicLock?.(true);
    game?.setInputEnabled?.(false);
    hideAllGameplayPrompts();
    const consoleModal = document.getElementById('console-terminal-modal');
    if (consoleModal) {
        consoleModal.classList.add('hidden');
    }

    // Set up global skip button
    window.skipAllIntro = false;
    const skipBtn = document.getElementById('global-skip-intro-btn');
    if (skipBtn) {
        skipBtn.classList.remove('hidden');
        skipBtn.onclick = () => {
            window.skipAllIntro = true;
            skipBtn.classList.add('hidden');
            cutsceneManager?.finishActiveRun?.(true);
            dialogueManager?.cancelDialogue?.();
        };
    }

    try {
        // Post-reveal saves belong to the queen: no crash replay, no
        // Mothership handshake, no human mission briefing.
        if (isAct2RunActive()) {
            if (skipBtn) skipBtn.classList.add('hidden');
            await runAct2IntroSequence(game, playerType);
            return;
        }

        if (!window.skipAllIntro) {
            await playClassIntroSequence(playerType);
        }

        if (!window.skipAllIntro) {
            await cutsceneManager?.play({
                playerType,
                allowSkip: true,
                resolveImpactPoint: resolveCutsceneImpactPoint
            });
        }

        let choice = 'skip';
        if (!window.skipAllIntro) {
            choice = await dialogueManager?.openMothershipDialogue({ playerType }) ?? 'skip';
        }

        if (skipBtn) skipBtn.classList.add('hidden');

        const startTutorial = choice === 'tutorial' && !window.skipAllIntro;
        document.body.classList.add('hud-hidden');
        await new Promise((resolve) => {
            triggerDoorTransition(
                // The panels are fully closed: make the prepared world the
                // scene behind them, but keep cinematic invulnerability and
                // input lock until the 800ms opening animation is complete.
                () => {
                    resumeIntroRendering?.();
                    resumeIntroRendering = null;
                    document.body.classList.remove('mission-intro-active');
                },
                resolve
            );
        });
        document.body.classList.remove('hud-hidden');
        game?.setCinematicLock?.(false);

        if (startTutorial) {
            await dialogueManager?.startTutorialSequence({ game });
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
        resumeIntroRendering?.();
        document.body.classList.remove('mission-intro-active');
        document.body.classList.remove('hud-hidden');
        game?.setCinematicLock?.(false);
        game?.setInputEnabled?.(true);
        missionFlowRunning = false;
        const skipBtn = document.getElementById('global-skip-intro-btn');
        if (skipBtn) skipBtn.classList.add('hidden');
    }
}

const transitionFromTitleToMenu = (afterClosed = null) => {
    triggerDoorTransition(
        () => {
            if (splash) splash.classList.add('hidden');
            if (menu) {
                setAppPhase('menu');
                menu.classList.remove('hidden');
                window.game?.setPerformanceProfile?.('menu');
                queueGameLayoutRefresh();
            }
            afterClosed?.();
        },
        () => {
            if (state.settings.fullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        },
        'base'
    );
};

function launchStandardRun({ resetBank = false, playIntro = false } = {}) {
    const playerType = getSelectedHeroType();
    saveHeroType(playerType);
    // Hold one continuous black/simulation barrier from the menu close,
    // through world warm-up and the authored intro, to the final door reveal.
    // Adding the body class before switching to gameplay also prevents a
    // single rendered-world flash while the first doors are opening.
    if (playIntro) document.body.classList.add('mission-intro-active');
    const deploymentHold = playIntro ? suspendGameForFullscreenVideo() : null;
    triggerDoorTransition(
        () => {
            showRunLoadingScreen('DOWNLOADING SECTOR PILLAR TOPOGRAPHY...', 0, { overDoor: true });
            splash?.classList.add('hidden');
            menu?.classList.add('hidden');
            setAppPhase('gameplay');
            window.game?.setPerformanceProfile?.('gameplay');
            window.game?.updatePlayerType?.(playerType, { poof: false, emitWorldEvents: false });
            resetRunToStartingState({
                resetBank,
                skipEffects: true,
                snailSpawnEnabled: true,
                purgeSnails: false,
                deferChunkMount: true
            });
            document.getElementById('ui')?.classList.remove('hidden');
            syncHudCompassVisibility();

            const gameContainer = document.getElementById('game-container');
            const viewport = document.getElementById('game-viewport');
            if (gameContainer && viewport) {
                viewport.insertBefore(gameContainer, document.getElementById('ui'));
                gameContainer.classList.add('fullscreen-mode');
                queueGameLayoutRefresh();
            }
            return prepareGameplayForDialogue({ loaderOverDoor: true });
        },
        () => {
            if (playIntro) {
                void runMissionIntroSequence({ deploymentHold });
            } else {
                window.game?.setInputEnabled?.(true);
            }
        },
        undefined,
        { waitForClosedWork: true, openingHoldMs: 160 }
    );
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        launchStandardRun({ resetBank: true, playIntro: true });
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
        document.body.classList.add('mission-intro-active');
        const deploymentHold = suspendGameForFullscreenVideo();
        triggerDoorTransition(
            () => {
                showRunLoadingScreen('DOWNLOADING SECTOR PILLAR TOPOGRAPHY...', 0, { overDoor: true });
                if (menu) menu.classList.add('hidden');
                setAppPhase('gameplay');
                window.game?.setPerformanceProfile?.('gameplay');
                window.game?.updatePlayerType?.(getSelectedHeroType(), { poof: false, emitWorldEvents: false });
                resetRunToStartingState({
                    resetBank: false,
                    skipEffects: true,
                    snailSpawnEnabled: true,
                    purgeSnails: false,
                    deferChunkMount: true
                });
                document.getElementById('ui')?.classList.remove('hidden');
                syncHudCompassVisibility();
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
                void runMissionIntroSequence({ deploymentHold });
            },
            undefined,
            { waitForClosedWork: true, openingHoldMs: 160 }
            // Defaults to active class door
        );
    });
}

// Fullscreen State Sync Listener
document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    state.settings.fullscreen = isFs;
    if (mainFsToggle) mainFsToggle.checked = isFs;
    queueGameLayoutRefresh();
});

// Global UI Updates
let qaToolsEnabled = false;
const electronApiPresent = Boolean(window.electronAPI);
let developerToolsAuthorized = canUseDeveloperTools({ electronApiPresent, qaToolsEnabled });

function setDebugMode(active) {
    const enabled = Boolean(active) && developerToolsAuthorized;
    if (enabled) {
        document.body.classList.add('show-debug');
    } else {
        document.body.classList.remove('show-debug');
    }
    window.game?.setMazeDebugVisible?.(enabled);
    if (mainDebugToggle) {
        mainDebugToggle.checked = enabled;
        mainDebugToggle.disabled = !developerToolsAuthorized;
    }
}

if (window.electronAPI?.getQaToolsEnabled) {
    window.electronAPI.getQaToolsEnabled()
        .then((enabled) => {
            qaToolsEnabled = Boolean(enabled);
            developerToolsAuthorized = canUseDeveloperTools({
                electronApiPresent,
                qaToolsEnabled
            });
            if (!developerToolsAuthorized) {
                state.settings.debug = false;
                setDebugMode(false);
                closeDevConsoleModal();
            }
        })
        .catch(() => {
            qaToolsEnabled = false;
            developerToolsAuthorized = canUseDeveloperTools({
                electronApiPresent,
                qaToolsEnabled
            });
        });
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

// ── Dev Console & Steam Test Harness ────────────────────────────
function logDevConsole(text, type = 'normal') {
    const logContainer = document.getElementById('dev-console-log');
    if (!logContainer) return;
    const line = document.createElement('div');
    line.className = `dev-log-line ${type}`;
    line.textContent = text;
    logContainer.appendChild(line);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function devUnlockAchievement(key) {
    if (!key) return 'No achievement key specified.';
    const def = ACHIEVEMENT_DEFS.find((d) => d.key === key || d.title.toLowerCase() === key.toLowerCase());
    const targetKey = def ? def.key : key;
    const targetTitle = def ? def.title : key;

    const state = achievementEngine.getState();
    state.unlocked[targetKey] = { unlockedAt: Date.now() };
    saveAchievements(state, localStorage);
    renderAchievementsModal();
    updateMenuCommandStatuses();

    window.dispatchEvent(new CustomEvent('achievement-unlocked', {
        detail: { key: targetKey, title: targetTitle }
    }));
    if (window.electronAPI?.unlockAchievement) {
        window.electronAPI.unlockAchievement(targetKey);
    }
    return `Unlocked achievement: ${targetTitle} (${targetKey})`;
}

function devUnlockAllAchievements() {
    let count = 0;
    for (const def of ACHIEVEMENT_DEFS) {
        devUnlockAchievement(def.key);
        count++;
    }
    return `Unlocked all ${count} achievements locally & sent to Steam.`;
}

function devUnlockAllCodex() {
    let count = 0;
    for (const entry of CODEX_ENTRIES) {
        discoverCodex(entry.id, { debugUnlocked: true });
        count++;
    }
    updateMenuCommandStatuses();
    if (!document.getElementById('codex-modal')?.classList.contains('hidden')) renderCodexModal();
    return `Unlocked all ${count} codex intel records.`;
}

function devResetAchievements() {
    const state = achievementEngine.getState();
    state.unlocked = {};
    saveAchievements(state, localStorage);
    renderAchievementsModal();
    updateMenuCommandStatuses();
    return 'Cleared all unlocked achievements from local save.';
}

function devGrantResources() {
    bankManager.deposit({ tech: 250, coin: 150, med: 75 });
    bankManager.addShells(75);
    window.game?.healPlayer?.(99);
    window.game?.adjustOxygen?.(100);
    window.game?.renderConsoleBanking?.(window.game?.activeInteractiveConsole);
    renderFabricationModal();
    updateMenuCommandStatuses();
    return 'Granted 250 Tech, 150 Coin, 75 Med, 75 Shells, Max HP & Max O₂.';
}

function devToggleGodMode() {
    debugGodModeActive = !debugGodModeActive;
    window.game?.setGodMode?.(debugGodModeActive);
    if (debugGodModeBtn) {
        debugGodModeBtn.classList.toggle('debug-btn--active', debugGodModeActive);
        debugGodModeBtn.textContent = debugGodModeActive ? 'GOD✓' : 'GOD';
    }
    return `God mode ${debugGodModeActive ? 'ONLINE (Invulnerable)' : 'OFFLINE'}.`;
}

function devHealPlayer() {
    window.game?.healPlayer?.(999);
    window.game?.adjustOxygen?.(999);
    return 'Player fully healed and O₂ refilled.';
}

function devKillSnails() {
    const killed = window.game?.purgeHostiles?.() ?? 0;
    return `Purged hostiles from current sector (${killed} removed).`;
}

function devLaunchRgb(chapter = null) {
    closeDevConsoleModal();
    launchRgb(chapter);
    return `Launched RGB minigame${chapter ? ` at chapter '${chapter}'` : ''}.`;
}

function persistSettings() {
    try {
        if (state.settings.resolutionPreset) {
            localStorage.setItem('hb_resolution_preset', state.settings.resolutionPreset);
        }
        if (state.settings.uiScale) {
            localStorage.setItem('hb_ui_scale', String(state.settings.uiScale));
        }
        if (state.settings.textFloor) {
            localStorage.setItem('hb_text_floor', String(state.settings.textFloor));
        }
        if (state.settings.aimSensitivity != null) {
            localStorage.setItem('hb_aim_sensitivity', String(state.settings.aimSensitivity));
        }
        if (state.settings.invertAimY != null) {
            localStorage.setItem('hb_invert_aim_y', String(state.settings.invertAimY));
        }
    } catch {
        // best-effort persistence
    }
}

function devSetResolution(preset) {
    const validPresets = ['auto', 'deck', '720p', '1080p', '1440p', '4k'];
    const p = String(preset || '').toLowerCase();
    if (!validPresets.includes(p)) {
        return `Invalid resolution preset '${preset}'. Valid options: ${validPresets.join(', ')}`;
    }
    state.settings.resolutionPreset = p;
    persistSettings();
    refreshGameLayout();

    const devSelect = document.getElementById('dev-res-select');
    if (devSelect) devSelect.value = p;
    const settingsSelect = document.getElementById('setting-resolution');
    if (settingsSelect) settingsSelect.value = p;

    return `Target resolution preset set to '${p}'. Layout refreshed.`;
}

function devSetUiScale(scalePct) {
    const scale = parseInt(scalePct, 10);
    if (isNaN(scale) || scale < 80 || scale > 200) {
        return 'Invalid UI scale. Enter a percentage between 80 and 200.';
    }
    state.settings.uiScale = scale;
    persistSettings();
    refreshGameLayout();

    const devSelect = document.getElementById('dev-uiscale-select');
    if (devSelect) devSelect.value = String(scale);
    const settingsSelect = document.getElementById('setting-ui-scale');
    if (settingsSelect) settingsSelect.value = String(scale);

    return `UI Accessibility scale set to ${scale}%. Layout refreshed.`;
}

function devSetTextFloor(px) {
    const floor = parseInt(px, 10);
    if (isNaN(floor) || floor < 12 || floor > 36) {
        return 'Invalid text floor. Enter a pixel value between 12 and 36.';
    }
    state.settings.textFloor = floor;
    persistSettings();
    refreshGameLayout();

    const devSelect = document.getElementById('dev-textfloor-select');
    if (devSelect) devSelect.value = String(floor);
    const settingsSelect = document.getElementById('setting-text-floor');
    if (settingsSelect) settingsSelect.value = String(floor);

    return `Minimum text floor set to ${floor}px. CSS --hb-text-floor updated.`;
}

function devGetLayoutMetrics() {
    const st = window.hbStage || computeStageTransform(window.innerWidth, window.innerHeight);
    const preset = state.settings.resolutionPreset || 'deck';
    const uiScale = state.settings.uiScale || 100;
    const textFloor = state.settings.textFloor || 18;
    const vu = document.getElementById('game-viewport')?.style.getPropertyValue('--vu') || 'calculated';

    return `STAGE LAYOUT METRICS:\n`
        + `  Window Size:     ${window.innerWidth} × ${window.innerHeight}\n`
        + `  Logical Stage:   1280 × 800 (16:10 Deck reference stage)\n`
        + `  Transform Scale: ${(st.scale ?? 1).toFixed(4)}x\n`
        + `  Stage Offsets:   X=${(st.offsetX ?? 0).toFixed(1)}px, Y=${(st.offsetY ?? 0).toFixed(1)}px\n`
        + `  Stage Bounds:    ${(st.stageWidth ?? 1280).toFixed(1)}px × ${(st.stageHeight ?? 800).toFixed(1)}px\n`
        + `  Viewport Unit:   --vu = ${vu}\n`
        + `  Min Text Floor:  --hb-text-floor = ${textFloor}px\n`
        + `  UI Scale Multi:  ${uiScale}%\n`
        + `  Res Preset:      ${preset}`;
}

function executeDevCommand(input) {
    const raw = String(input ?? '').trim();
    if (!raw) return;
    logDevConsole(`> ${raw}`, 'system');

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    let result;
    let resultType = 'success';

    switch (cmd) {
        case 'help':
        case 'commands':
        case '?':
            result = 'Available commands:\n'
                + '  unlock <key>        - Unlock specific achievement\n'
                + '  unlock_all          - Unlock all achievements\n'
                + '  reset_ach           - Clear local achievement unlocks\n'
                + '  reset_save          - Confirm a full save, RGB, and achievement reset\n'
                + '  rgb [chapter]       - Launch RGB minigame (parking_lot, warehouse, incident_review, medi_kiosk, server_room, sector_four)\n'
                + '  resolution <preset> - Set target resolution preset (auto, deck, 720p, 1080p, 1440p, 4k)\n'
                + '  uiscale <100-150>   - Set UI accessibility scale (%)\n'
                + '  textfloor <16-24>   - Set minimum text floor font size (px)\n'
                + '  layout / stage      - Display canonical stage transform & viewport metrics\n'
                + '  ringplan / ringlock - Show the active run\'s radial ring plan, unlock gate, and non-bypass proof\n'
                + '  perf / bootlog      - Display boot timings and current renderer workload\n'
                + '  god                 - Toggle God Mode\n'
                + '  salvage / +$        - Grant salvage & shells\n'
                + '  heal                - Refill Health & O₂\n'
                + '  nuke / kill         - Clear hostiles in current sector\n'
                + '  steam               - View Steam connection info\n'
                + '  steamlog            - View Steam startup diagnostics\n'
                + '  clear / cls         - Clear console log';
            break;
        case 'layout':
        case 'stage':
        case 'metrics':
            result = devGetLayoutMetrics();
            break;
        case 'ringplan':
        case 'ringlock': {
            // Phase 6.1/6.2 live diagnostic: inspects the current run's
            // actual seeded radial plan (window.game.getRadialMazePlan(),
            // already live-used to position camps/hives/the queen) rather
            // than a synthetic test seed. Read-only -- does not affect
            // generation.
            const game = window.game;
            if (!game?.getRadialMazePlan) {
                result = 'No active run (radial plan is created lazily once a run starts).';
                break;
            }
            const plan = game.getRadialMazePlan();
            const progression = validateRingProgression(plan);
            const conflicts = findConflictingChunkReservations(plan);
            const unlocks = game.bank?.getState?.()?.unlocks ?? {};
            const unlockedGoalKeys = new Set(Object.keys(unlocks).filter((key) => unlocks[key]));
            const maxUnlockedRing = getMaxUnlockedRing(unlockedGoalKeys);
            const topology = plan.topology;
            const physicalDistances = computeTopologyDistances(topology);
            const queenDistance = physicalDistances.get(topology?.queenChunkKey);
            result = `RADIAL PLAN DIAGNOSTIC (seed ${plan.seed})\n`
                + `  Max unlocked ring: ${maxUnlockedRing}/5 (goals: ${[...unlockedGoalKeys].join(', ') || 'none'})\n`
                + `  Ring-progression proof: ${progression.valid ? 'VALID (non-bypassable at the abstract graph level)' : `INVALID: ${progression.errors.join('; ')}`}\n`
                + `  Physical route: ${topology?.routeChunks?.length ?? 0} chunks / ${topology?.routeEdges?.length ?? 0} edges / ${topology?.spineChunkKeys?.length ?? 0} spine chunks\n`
                + `  Dijkstra crash-to-Queen distance: ${Number.isFinite(queenDistance) ? `${queenDistance} chunk crossings` : 'UNREACHABLE'}\n`
                + `  Chunk placement conflicts: ${conflicts.length === 0 ? 'none' : conflicts.map((c) => `(${c.chunkX},${c.chunkY}): ${c.siteIds.join(' + ')}`).join('; ')}\n`
                + '  NOTE: macro portals now follow this physical graph. In-chunk blocker-door cut placement still requires live traversal acceptance.';
            break;
        }
        case 'perf':
        case 'bootlog': {
            const renderer = window.game?.renderer;
            result = `BOOT / RENDERER DIAGNOSTICS\n${bootDiagnostics
                .map((entry) => `  +${entry.elapsedMs.toFixed(1)}ms ${entry.phase}${entry.details ? ` ${JSON.stringify(entry.details)}` : ''}`)
                .join('\n') || '  No boot timing entries recorded.'}\n`
                + `  Profile: ${window.game?.performanceProfile ?? 'unavailable'}\n`
                + `  Pixel ratio: ${renderer?.getPixelRatio?.() ?? 'unavailable'}\n`
                + `  Draw calls: ${renderer?.info?.render?.calls ?? 'unavailable'}\n`
                + `  Triangles: ${renderer?.info?.render?.triangles ?? 'unavailable'}\n`
                + `  Textures: ${renderer?.info?.memory?.textures ?? 'unavailable'}`;
            break;
        }
        case 'resolution':
        case 'res':
            result = devSetResolution(arg);
            break;
        case 'uiscale':
        case 'scale':
            result = devSetUiScale(arg);
            break;
        case 'textfloor':
        case 'fontfloor':
            result = devSetTextFloor(arg);
            break;
        case 'unlock':
        case 'ach':
        case 'achievement':
            result = devUnlockAchievement(arg);
            break;
        case 'unlock_all':
        case 'ach_all':
        case 'unlockall':
            result = devUnlockAllAchievements();
            break;
        case 'codex_all':
        case 'codexall':
        case 'unlock_codex':
            result = devUnlockAllCodex();
            break;
        case 'reset_ach':
        case 'resetach':
            result = devResetAchievements();
            break;
        case 'reset_save':
        case 'resetsave':
            closeDevConsoleModal();
            openFullSaveResetConfirm();
            result = 'Full save reset confirmation opened.';
            break;
        case 'rgb':
        case 'minigame':
            result = devLaunchRgb(arg || null);
            break;
        case 'god':
            result = devToggleGodMode();
            break;
        case 'salvage':
        case 'resources':
        case '+$':
            result = devGrantResources();
            break;
        case 'heal':
        case 'hp':
        case 'o2':
            result = devHealPlayer();
            break;
        case 'nuke':
        case 'kill':
        case 'kill_all':
            result = devKillSnails();
            break;
        case 'steam':
            if (window.electronAPI?.getSteamInfo) {
                Promise.all([
                    window.electronAPI.getSteamInfo(),
                    window.electronAPI.getSteamDiagnostics?.()
                ]).then(([info, diagnostics]) => {
                    logDevConsole(`Steam Identity: ${JSON.stringify(info, null, 2)}\nDiagnostics: ${JSON.stringify(diagnostics?.init ?? null, null, 2)}\nLog file: ${diagnostics?.logPath ?? 'unavailable'}`, 'system');
                }).catch((err) => logDevConsole(`Steam diagnostic request failed: ${err?.message ?? err}`, 'error'));
                result = 'Fetching Steam info...';
            } else {
                result = 'Steam API unavailable (running in web browser).';
            }
            break;
        case 'steamlog':
        case 'steamlogs':
            if (window.electronAPI?.getSteamDiagnostics) {
                window.electronAPI.getSteamDiagnostics().then((diagnostics) => {
                    const lines = diagnostics?.entries?.map((entry) => (
                        `${entry.timestamp} +${entry.elapsedMs ?? '-'}ms [${entry.level.toUpperCase()}] ${entry.phase}: ${entry.message}`
                        + (entry.details ? `\n${JSON.stringify(entry.details, null, 2)}` : '')
                    )) ?? [];
                    logDevConsole(`STEAM STARTUP DIAGNOSTICS\n${lines.join('\n') || 'No entries recorded.'}\nLog file: ${diagnostics?.logPath ?? 'unavailable'}`, diagnostics?.init?.ok ? 'system' : 'error');
                }).catch((err) => logDevConsole(`Steam diagnostic request failed: ${err?.message ?? err}`, 'error'));
                result = 'Fetching Steam startup log...';
            } else {
                result = 'Steam diagnostics unavailable (running in web browser).';
            }
            break;
        case 'clear':
        case 'cls': {
            const logContainer = document.getElementById('dev-console-log');
            if (logContainer) logContainer.replaceChildren();
            logDevConsole('> Console log cleared.', 'system');
            return;
        }
        default:
            result = `Unknown command '${cmd}'. Type 'help' for command list.`;
            resultType = 'error';
            break;
    }

    logDevConsole(result, resultType);
}

function openDevConsoleModal() {
    if (!developerToolsAuthorized) {
        setDebugMode(false);
        return;
    }
    setDebugMode(true);
    const modal = document.getElementById('dev-console-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    populateDevAchievementDropdowns();
    if (window.electronAPI?.getSteamDiagnostics) {
        window.electronAPI.getSteamDiagnostics().then((diagnostics) => {
            const init = diagnostics?.init ?? {};
            const lastEntry = diagnostics?.entries?.at?.(-1);
            logDevConsole(
                `Steam startup: ${init.ok ? 'OK' : 'FAILED'} · phase=${init.phase ?? 'unknown'} · ${init.durationMs ?? '?'}ms`
                + `${lastEntry ? `\nLast event: [${lastEntry.level}] ${lastEntry.phase}: ${lastEntry.message}` : ''}`
                + `\nType 'steamlog' for the full trace. File: ${diagnostics?.logPath ?? 'unavailable'}`,
                init.ok ? 'system' : 'error'
            );
        }).catch((err) => {
            logDevConsole(`Steam diagnostics unavailable: ${err?.message ?? err}`, 'error');
        });
    }

    const resSelect = document.getElementById('dev-res-select');
    if (resSelect) resSelect.value = state.settings.resolutionPreset || 'deck';
    const uiScaleSelect = document.getElementById('dev-uiscale-select');
    if (uiScaleSelect) uiScaleSelect.value = String(state.settings.uiScale || 100);
    const textFloorSelect = document.getElementById('dev-textfloor-select');
    if (textFloorSelect) textFloorSelect.value = String(state.settings.textFloor || 18);

    const input = document.getElementById('dev-console-input');
    if (input) {
        input.value = '';
        input.focus();
    }
}

function closeDevConsoleModal() {
    const modal = document.getElementById('dev-console-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function populateDevAchievementDropdowns() {
    const toolbarSelect = document.getElementById('debug-achievement-select');
    const modalSelect = document.getElementById('dev-ach-dropdown');
    if (toolbarSelect && toolbarSelect.options.length <= 1) {
        for (const def of ACHIEVEMENT_DEFS) {
            const opt = document.createElement('option');
            opt.value = def.key;
            opt.textContent = `${def.title} (${def.key})`;
            toolbarSelect.appendChild(opt);
        }
    }
    if (modalSelect && modalSelect.options.length <= 1) {
        for (const def of ACHIEVEMENT_DEFS) {
            const opt = document.createElement('option');
            opt.value = def.key;
            opt.textContent = `${def.title} (${def.key})`;
            modalSelect.appendChild(opt);
        }
    }
}

// Dev Console UI Bindings
document.getElementById('debug-open-console')?.addEventListener('click', openDevConsoleModal);
document.getElementById('debug-launch-rgb')?.addEventListener('click', () => launchRgb());
document.getElementById('debug-achievement-select')?.addEventListener('change', (e) => {
    const key = e.target.value;
    if (key) {
        const res = devUnlockAchievement(key);
        showBiomePrompt(`> DEBUG: ${res}`);
        e.target.value = '';
    }
});

document.getElementById('close-dev-console')?.addEventListener('click', closeDevConsoleModal);

document.getElementById('dev-btn-unlock-ach')?.addEventListener('click', () => {
    const select = document.getElementById('dev-ach-dropdown');
    if (select?.value) {
        const res = devUnlockAchievement(select.value);
        logDevConsole(res, 'success');
    } else {
        logDevConsole('Please select an achievement from the dropdown.', 'error');
    }
});
document.getElementById('debug-unlock-all-ach')?.addEventListener('click', () => {
    const res = devUnlockAllAchievements();
    showBiomePrompt(`> DEBUG: ${res}`);
});
document.getElementById('debug-unlock-all-codex')?.addEventListener('click', () => {
    const res = devUnlockAllCodex();
    showBiomePrompt(`> DEBUG: ${res}`);
});
document.getElementById('dev-btn-unlock-all-ach')?.addEventListener('click', () => {
    const res = devUnlockAllAchievements();
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-unlock-all-codex')?.addEventListener('click', () => {
    const res = devUnlockAllCodex();
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-reset-save')?.addEventListener('click', () => {
    closeDevConsoleModal();
    openFullSaveResetConfirm();
});
document.getElementById('dev-btn-launch-rgb')?.addEventListener('click', () => {
    const res = devLaunchRgb();
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-jump-rgb-chapter')?.addEventListener('click', () => {
    const select = document.getElementById('dev-rgb-chapter-select');
    const res = devLaunchRgb(select?.value || null);
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-god')?.addEventListener('click', () => {
    const res = devToggleGodMode();
    logDevConsole(res, 'system');
});
document.getElementById('dev-btn-resources')?.addEventListener('click', () => {
    const res = devGrantResources();
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-heal')?.addEventListener('click', () => {
    const res = devHealPlayer();
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-nuke')?.addEventListener('click', () => {
    const res = devKillSnails();
    logDevConsole(res, 'success');
});
document.getElementById('dev-res-select')?.addEventListener('change', (e) => {
    const res = devSetResolution(e.target.value);
    logDevConsole(res, 'success');
});
document.getElementById('dev-uiscale-select')?.addEventListener('change', (e) => {
    const res = devSetUiScale(e.target.value);
    logDevConsole(res, 'success');
});
document.getElementById('dev-textfloor-select')?.addEventListener('change', (e) => {
    const res = devSetTextFloor(e.target.value);
    logDevConsole(res, 'success');
});
document.getElementById('dev-btn-layout')?.addEventListener('click', () => {
    const res = devGetLayoutMetrics();
    logDevConsole(res, 'system');
});

const devConsoleInput = document.getElementById('dev-console-input');
const devConsoleSubmit = document.getElementById('dev-console-submit');

devConsoleSubmit?.addEventListener('click', () => {
    if (devConsoleInput) {
        executeDevCommand(devConsoleInput.value);
        devConsoleInput.value = '';
    }
});

devConsoleInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        executeDevCommand(devConsoleInput.value);
        devConsoleInput.value = '';
    }
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

if (settingsPopup) {
    new MutationObserver(() => syncSteamInputPhase()).observe(settingsPopup, {
        attributes: true,
        attributeFilter: ['class']
    });
}

function openSettingsModal() {
    if (!settingsPopup) return;
    const isHUD = !document.getElementById('ui')?.classList.contains('hidden');
    if (abortBtn) {
        if (isHUD) abortBtn.classList.remove('hidden');
        else abortBtn.classList.add('hidden');
    }

    settingsPopup.classList.remove('hidden');
    syncSteamInputPhase('menu');
    if (mainDebugToggle) mainDebugToggle.checked = state.settings.debug;
    if (mainFsToggle) mainFsToggle.checked = state.settings.fullscreen;
    if (mainNightVisionToggle) mainNightVisionToggle.checked = !!state.settings.nightVision;
    if (mainCommentaryToggle) mainCommentaryToggle.checked = !!state.settings.commentary;

    const resSelect = document.getElementById('setting-resolution');
    if (resSelect) resSelect.value = state.settings.resolutionPreset || 'deck';

    const uiScaleSelect = document.getElementById('setting-ui-scale');
    if (uiScaleSelect) uiScaleSelect.value = String(state.settings.uiScale || 100);

    const textFloorSelect = document.getElementById('setting-text-floor');
    if (textFloorSelect) textFloorSelect.value = String(state.settings.textFloor || 18);

    const txtSpeedSelect = document.getElementById('setting-text-speed');
    if (txtSpeedSelect) txtSpeedSelect.value = state.settings.textSpeed || 'normal';

    const shakeToggle = document.getElementById('setting-shake-toggle');
    if (shakeToggle) shakeToggle.checked = state.settings.shakeEnabled !== false;

    const cbToggle = document.getElementById('setting-colorblind-toggle');
    if (cbToggle) cbToggle.checked = !!state.settings.colorblindAssist;

    const aimSensSelect = document.getElementById('setting-aim-sensitivity');
    if (aimSensSelect) aimSensSelect.value = String(state.settings.aimSensitivity ?? 1.0);

    const invertYToggle = document.getElementById('setting-invert-y-toggle');
    if (invertYToggle) invertYToggle.checked = !!state.settings.invertAimY;

    const diffVal = document.getElementById('setting-difficulty-val');
    if (diffVal) {
        const difficulty = window.game?.difficulty || state.settings.difficulty || 'standard';
        diffVal.textContent = difficulty.toUpperCase();
    }

    syncAudioMixerUI(state.settings.audioMix);
    setAudioMixerOpen(false);
    setSaveDataOpen(false);
    setResetSaveConfirmOpen(false);
}

document.getElementById('setting-resolution')?.addEventListener('change', (e) => {
    devSetResolution(e.target.value);
});
document.getElementById('setting-ui-scale')?.addEventListener('change', (e) => {
    devSetUiScale(e.target.value);
});
document.getElementById('setting-text-floor')?.addEventListener('change', (e) => {
    devSetTextFloor(e.target.value);
});
document.getElementById('setting-aim-sensitivity')?.addEventListener('change', (e) => {
    state.settings.aimSensitivity = parseFloat(e.target.value) || 1.0;
    persistSettings();
});
document.getElementById('setting-invert-y-toggle')?.addEventListener('change', (e) => {
    state.settings.invertAimY = Boolean(e.target.checked);
    persistSettings();
});

if (settingsBtns.length > 0 && settingsPopup) {
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', openSettingsModal);
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
        syncSteamInputPhase();
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

saveDataCode?.addEventListener('focus', () => {
    void openSteamGamepadTextInputForElement(saveDataCode, {
        description: 'Portable save code',
        maxCharacters: 8192,
        multiline: true
    });
});

function openFullSaveResetConfirm() {
    setAudioMixerOpen(false);
    setSaveDataOpen(false);
    setResetSaveConfirmOpen(true);
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
}

openResetSaveBtn?.addEventListener('click', openFullSaveResetConfirm);

resetSaveCancelBtn?.addEventListener('click', () => {
    setResetSaveConfirmOpen(false);
    window.AudioManager?.play?.('ui_click', { volume: 0.45 });
});

resetSaveConfirmBtn?.addEventListener('click', () => {
    blackBoxStore.clear();
    if (window.game) {
        window.game.clearBlackBoxMarker();
    }
    if (window.bankManager?.reset) {
        window.bankManager.reset();
    }
    const removed = clearSaveData();
    window.AudioManager?.play?.('ui_click', { volume: 0.55 });
    setResetSaveConfirmOpen(false);
    settingsPopup?.classList.add('hidden');
    setAudioMixerOpen(false);
    setSaveDataOpen(false);
    console.info(`Reset save data: cleared ${removed} record(s).`);
    window.setTimeout(() => window.location.reload(), 350);
});

function setQuitConfirmOpen(open) {
    if (!quitConfirmModal) return;
    quitConfirmModal.classList.toggle('hidden', !open);
    quitConfirmModal.setAttribute('aria-hidden', String(!open));
}

function openQuitConfirmModal() {
    setQuitConfirmOpen(true);
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
}

function executeQuitApplication() {
    window.AudioManager?.play?.('ui_click', { volume: 0.55 });
    if (window.electronAPI?.quitApp) {
        window.electronAPI.quitApp();
    } else {
        try {
            window.close();
        } catch {
            window.location.reload();
        }
    }
}

titleQuitBtn?.addEventListener('click', openQuitConfirmModal);
openQuitConfirmBtn?.addEventListener('click', openQuitConfirmModal);
quitCancelBtn?.addEventListener('click', () => {
    setQuitConfirmOpen(false);
    window.AudioManager?.play?.('ui_click', { volume: 0.45 });
});
quitConfirmBtn?.addEventListener('click', executeQuitApplication);
setupClickOutside('quit-confirm-modal', () => setQuitConfirmOpen(false));

// ── Tactical Blueprint Map Overlay Render & Interactive Navigation ──────
let tacticalMapAnimFrame = null;
let tacticalMapEventsInitialized = false;
const tacticalMapState = {
    panX: 0,
    panY: 0,
    zoom: 1.0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialPanX: 0,
    initialPanY: 0,
    debugRevealAll: false
};

function resetTacticalMapView() {
    tacticalMapState.panX = 0;
    tacticalMapState.panY = 0;
    tacticalMapState.zoom = 1.0;
}

function focusTacticalMapOnHome() {
    tacticalMapState.panX = 0;
    tacticalMapState.panY = 0;
}

function focusTacticalMapOnPlayer() {
    const mapState = window.game?.getTacticalMapState?.();
    if (mapState?.player) {
        const home = mapState.home ?? { x: 0, z: 0 };
        const scale = 2.2 * tacticalMapState.zoom;
        tacticalMapState.panX = -(mapState.player.x - home.x) * scale;
        tacticalMapState.panY = -(mapState.player.z - home.z) * scale;
    }
}

function adjustTacticalMapZoom(delta) {
    tacticalMapState.zoom = Math.max(0.5, Math.min(3.5, tacticalMapState.zoom + delta));
}

function setupTacticalMapEvents() {
    if (tacticalMapEventsInitialized) return;
    const canvas = document.getElementById('tactical-map-canvas');
    if (!canvas) return;

    tacticalMapEventsInitialized = true;

    canvas.addEventListener('mousedown', (e) => {
        tacticalMapState.isDragging = true;
        tacticalMapState.dragStartX = e.clientX;
        tacticalMapState.dragStartY = e.clientY;
        tacticalMapState.initialPanX = tacticalMapState.panX;
        tacticalMapState.initialPanY = tacticalMapState.panY;
        canvas.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
        if (!tacticalMapState.isDragging) return;
        const dx = e.clientX - tacticalMapState.dragStartX;
        const dy = e.clientY - tacticalMapState.dragStartY;
        tacticalMapState.panX = tacticalMapState.initialPanX + dx;
        tacticalMapState.panY = tacticalMapState.initialPanY + dy;
    });

    window.addEventListener('mouseup', () => {
        tacticalMapState.isDragging = false;
        canvas.classList.remove('dragging');
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
        adjustTacticalMapZoom(zoomDelta);
    }, { passive: false });

    document.getElementById('map-zoom-in')?.addEventListener('click', () => adjustTacticalMapZoom(0.25));
    document.getElementById('map-zoom-out')?.addEventListener('click', () => adjustTacticalMapZoom(-0.25));
    document.getElementById('map-focus-home')?.addEventListener('click', focusTacticalMapOnHome);
    document.getElementById('map-focus-player')?.addEventListener('click', focusTacticalMapOnPlayer);
    document.getElementById('map-reset-view')?.addEventListener('click', resetTacticalMapView);
    document.getElementById('map-debug-reveal')?.addEventListener('click', (event) => {
        tacticalMapState.debugRevealAll = !tacticalMapState.debugRevealAll;
        event.currentTarget.setAttribute('aria-pressed', String(tacticalMapState.debugRevealAll));
    });
}

function pollTacticalMapGamepadInput() {
    const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
    if (!pad) return;

    const deadzone = 0.2;
    const stickX = Math.abs(pad.axes?.[0] ?? 0) > deadzone ? pad.axes[0] : 0;
    const stickY = Math.abs(pad.axes?.[1] ?? 0) > deadzone ? pad.axes[1] : 0;
    const dpadLeft = pad.buttons?.[14]?.pressed;
    const dpadRight = pad.buttons?.[15]?.pressed;
    const dpadUp = pad.buttons?.[12]?.pressed;
    const dpadDown = pad.buttons?.[13]?.pressed;

    const moveX = stickX + (dpadRight ? 1 : 0) - (dpadLeft ? 1 : 0);
    const moveY = stickY + (dpadDown ? 1 : 0) - (dpadUp ? 1 : 0);

    if (Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05) {
        tacticalMapState.panX -= moveX * 7;
        tacticalMapState.panY -= moveY * 7;
    }

    if (pad.buttons?.[4]?.pressed) adjustTacticalMapZoom(-0.02);
    if (pad.buttons?.[5]?.pressed) adjustTacticalMapZoom(0.02);
}

function drawTacticalMapOverlay() {
    const canvas = document.getElementById('tactical-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#04080e';
    ctx.fillRect(0, 0, width, height);

    const mapState = window.game?.getTacticalMapState?.() ?? {
        player: { x: 0, z: 0, rotation: 0 },
        exploredCells: [],
        landmarks: [],
        stats: { totalExplored: 0, activeLandmarks: 0 }
    };

    const exploredCells = mapState.exploredCells ?? [];
    const landmarks = mapState.landmarks ?? [];
    const player = mapState.player ?? { x: 0, z: 0, rotation: 0 };
    const home = mapState.home ?? { x: 0, z: 0 };
    const chunkSize = mapState.chunkSize ?? 49;
    const detailedChunks = mapState.detailedChunks ?? [];
    const discoveredKeys = new Set(detailedChunks.map((chunk) => chunk.key));

    const tileStatEl = document.getElementById('map-stat-tiles');
    if (tileStatEl) tileStatEl.textContent = String(detailedChunks.length);
    const signalStatEl = document.getElementById('map-stat-signals');
    if (signalStatEl) signalStatEl.textContent = String(landmarks.length);

    // World-space blueprint coordinates keep home base at the canvas center.
    // Panning is an explicit user offset, never an implicit explored-bounds
    // shift, so discovery can expand without making the map jump around.
    const cellSize = 2.2 * tacticalMapState.zoom;
    const offsetX = width / 2 - home.x * cellSize + tacticalMapState.panX;
    const offsetY = height / 2 - home.z * cellSize + tacticalMapState.panY;
    const worldToMap = (x, z) => ({ x: x * cellSize + offsetX, y: z * cellSize + offsetY });

    // Grid lines background
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridStep = Math.max(12, chunkSize * cellSize);
    for (let x = (offsetX % gridStep + gridStep) % gridStep; x <= width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = (offsetY % gridStep + gridStep) % gridStep; y <= height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Debug uses the lightweight regional plan rather than generating every
    // 49x49 gameplay chunk. It reveals the complete macro route without
    // causing the same procedural-generation hitch the map is diagnosing.
    if (tacticalMapState.debugRevealAll) {
        ctx.lineWidth = Math.max(1, cellSize * 0.7);
        ctx.strokeStyle = 'rgba(255, 176, 32, 0.42)';
        for (const edge of mapState.routeEdges ?? []) {
            const [ax, ay] = String(edge.from ?? '').split(',').map(Number);
            const [bx, by] = String(edge.to ?? '').split(',').map(Number);
            if (![ax, ay, bx, by].every(Number.isFinite)) continue;
            const a = worldToMap((ax + 0.5) * chunkSize, (ay + 0.5) * chunkSize);
            const b = worldToMap((bx + 0.5) * chunkSize, (by + 0.5) * chunkSize);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        for (const chunk of mapState.routeChunks ?? []) {
            if (discoveredKeys.has(`${chunk.chunkX},${chunk.chunkY}`)) continue;
            const p = worldToMap(chunk.chunkX * chunkSize + 5, chunk.chunkY * chunkSize + 5);
            const size = (chunkSize - 10) * cellSize;
            ctx.fillStyle = chunk.roles?.includes('ring') ? 'rgba(255,176,32,.13)' : 'rgba(0,229,255,.10)';
            ctx.strokeStyle = chunk.roles?.includes('ring') ? 'rgba(255,176,32,.62)' : 'rgba(0,229,255,.4)';
            ctx.fillRect(p.x, p.y, size, size); ctx.strokeRect(p.x, p.y, size, size);
        }
    }

    // Render the actual stamped floors. Rooms and halls retain their authored
    // silhouettes, including bends, branches, and door connector lanes.
    for (const chunk of detailedChunks) {
        for (const cell of chunk.cells ?? []) {
            const p = worldToMap(chunk.chunkX * chunkSize + cell.x, chunk.chunkY * chunkSize + cell.y);
            if (p.x < -cellSize || p.x > width || p.y < -cellSize || p.y > height) continue;
            ctx.fillStyle = cell.kind === 'door' ? '#ffd15c'
                : cell.kind === 'room' ? 'rgba(0,229,255,.72)'
                    : 'rgba(55,145,178,.5)';
            ctx.fillRect(p.x, p.y, Math.max(1.2, cellSize + 0.25), Math.max(1.2, cellSize + 0.25));
        }
    }

    // Landmarks (including Home Base)
    for (const landmark of landmarks) {
        const landmarkKey = `${Math.floor(landmark.x / chunkSize)},${Math.floor(landmark.z / chunkSize)}`;
        if (landmark.type !== 'home_base' && !tacticalMapState.debugRevealAll && !discoveredKeys.has(landmarkKey)) continue;
        const point = worldToMap(landmark.x, landmark.z);
        const lx = point.x;
        const ly = point.y;

        if (lx < -60 || lx > width + 60 || ly < -60 || ly > height + 60) continue;

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (landmark.type === 'home_base') {
            ctx.beginPath();
            ctx.arc(lx, ly, 16, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffd700';
            ctx.fillText('🏠', lx, ly);

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 11px Space Mono, monospace';
            ctx.fillText(landmark.label ?? 'HOME BASE', lx, ly + 20);
        } else if (landmark.type === 'camp') {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText('⛺', lx, ly);
            ctx.fillStyle = '#d0e0f0';
            ctx.font = '10px Space Mono, monospace';
            ctx.fillText(landmark.label ?? '', lx, ly + 14);
        } else if (landmark.type === 'hive') {
            ctx.fillStyle = '#ff0055';
            ctx.fillText('⚡', lx, ly);
            ctx.fillStyle = '#d0e0f0';
            ctx.font = '10px Space Mono, monospace';
            ctx.fillText(landmark.label ?? '', lx, ly + 14);
        } else {
            ctx.fillStyle = '#a040ff';
            ctx.fillText('★', lx, ly);
            ctx.fillStyle = '#d0e0f0';
            ctx.font = '10px Space Mono, monospace';
            ctx.fillText(landmark.label ?? '', lx, ly + 14);
        }
    }

    // Render scanned sector grid dots from exploredCells
    for (const c of exploredCells) {
        if (!c.scanned) continue;
        const pt = worldToMap(c.gx * 15, c.gz * 15);
        if (pt.x < 0 || pt.x > width || pt.y < 0 || pt.y > height) continue;
        ctx.fillStyle = 'rgba(0, 210, 255, 0.18)';
        ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
    }

    // Render scanned path connectivity lines & route vectors ("math paths of scanned area")
    const scannedPaths = mapState.scannedPaths ?? [];
    for (const sp of scannedPaths) {
        if (!sp.path || sp.path.length < 2) continue;
        ctx.save();
        ctx.beginPath();
        const startP = worldToMap(sp.path[0].x, sp.path[0].z);
        ctx.moveTo(startP.x, startP.y);
        for (let i = 1; i < sp.path.length; i++) {
            const pt = worldToMap(sp.path[i].x, sp.path[i].z);
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = sp.found ? 'rgba(0, 255, 210, 0.85)' : 'rgba(0, 210, 255, 0.35)';
        ctx.lineWidth = sp.found ? 3 : 1.5;
        ctx.setLineDash(sp.found ? [6, 4] : [2, 4]);
        ctx.stroke();

        // Draw glowing waypoint nodes along the route
        for (let i = 0; i < sp.path.length; i += Math.max(1, Math.floor(sp.path.length / 6))) {
            const pt = worldToMap(sp.path[i].x, sp.path[i].z);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, sp.found ? 3.5 : 2, 0, Math.PI * 2);
            ctx.fillStyle = sp.found ? '#00ffd2' : '#00d2ff';
            ctx.fill();
        }
        ctx.restore();
    }

    // Player position
    const playerPoint = worldToMap(player.x, player.z);
    const px = playerPoint.x;
    const py = playerPoint.y;

    if (px >= -20 && px <= width + 20 && py >= -20 && py <= height + 20) {
        const time = Date.now() * 0.003;
        const pulseRadius = 12 + Math.sin(time) * 4;
        ctx.beginPath();
        ctx.arc(px, py, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(player.rotation ?? 0);

        ctx.fillStyle = '#00ffaa';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(7, 8);
        ctx.lineTo(-7, 8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }

    // Zoom level HUD overlay
    ctx.font = '10px Space Mono, monospace';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(`ZOOM: ${tacticalMapState.zoom.toFixed(1)}x`, 12, height - 12);
}

function toggleTacticalMapModal(forceState) {
    const modal = document.getElementById('tactical-map-modal');
    if (!modal) return;

    setupTacticalMapEvents();

    const isHidden = modal.classList.contains('hidden');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : isHidden;

    if (shouldOpen) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        if (!tacticalMapAnimFrame) {
            const updateLoop = () => {
                const modalNow = document.getElementById('tactical-map-modal');
                if (modalNow && !modalNow.classList.contains('hidden')) {
                    pollTacticalMapGamepadInput();
                    drawTacticalMapOverlay();
                    tacticalMapAnimFrame = requestAnimationFrame(updateLoop);
                } else {
                    tacticalMapAnimFrame = null;
                }
            };
            tacticalMapAnimFrame = requestAnimationFrame(updateLoop);
        }
    } else {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        if (tacticalMapAnimFrame) {
            cancelAnimationFrame(tacticalMapAnimFrame);
            tacticalMapAnimFrame = null;
        }
    }
}

document.getElementById('close-tactical-map-modal')?.addEventListener('click', () => toggleTacticalMapModal(false));
setupClickOutside('tactical-map-modal', () => toggleTacticalMapModal(false));

// Global Key Listener for Modals & Dev Console
document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;

    const tacticalMapModal = document.getElementById('tactical-map-modal');
    const isMapOpen = tacticalMapModal && !tacticalMapModal.classList.contains('hidden');

    if (isMapOpen) {
        if (event.code === 'KeyH') {
            focusTacticalMapOnHome();
            event.preventDefault();
            return;
        }
        if (event.code === 'KeyP') {
            focusTacticalMapOnPlayer();
            event.preventDefault();
            return;
        }
        if (event.code === 'KeyR') {
            resetTacticalMapView();
            event.preventDefault();
            return;
        }
        if (event.key === '=' || event.key === '+') {
            adjustTacticalMapZoom(0.25);
            event.preventDefault();
            return;
        }
        if (event.key === '-') {
            adjustTacticalMapZoom(-0.25);
            event.preventDefault();
            return;
        }
        if (['ArrowUp', 'KeyW'].includes(event.code)) {
            tacticalMapState.panY += 25;
            event.preventDefault();
            return;
        }
        if (['ArrowDown', 'KeyS'].includes(event.code)) {
            tacticalMapState.panY -= 25;
            event.preventDefault();
            return;
        }
        if (['ArrowLeft', 'KeyA'].includes(event.code)) {
            tacticalMapState.panX += 25;
            event.preventDefault();
            return;
        }
        if (['ArrowRight', 'KeyD'].includes(event.code)) {
            tacticalMapState.panX -= 25;
            event.preventDefault();
            return;
        }
    }

    if (event.code === 'Backquote' || event.key === '`' || event.key === '~') {
        if (!developerToolsAuthorized) {
            setDebugMode(false);
            return;
        }
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' && document.activeElement?.id !== 'dev-console-input') {
            return;
        }
        if (activeTag === 'textarea') return;
        event.preventDefault();
        const devModal = document.getElementById('dev-console-modal');
        if (devModal && !devModal.classList.contains('hidden')) {
            closeDevConsoleModal();
        } else {
            openDevConsoleModal();
        }
        return;
    }

    if (event.code === 'KeyM' || (event.key === 'Tab' && !event.ctrlKey && !event.altKey)) {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
            event.preventDefault();
            toggleTacticalMapModal();
            return;
        }
    }

    if (event.key === 'Escape') {
        const tacticalMapModal = document.getElementById('tactical-map-modal');
        if (tacticalMapModal && !tacticalMapModal.classList.contains('hidden')) {
            toggleTacticalMapModal(false);
            event.preventDefault();
            return;
        }
        const devModal = document.getElementById('dev-console-modal');
        if (devModal && !devModal.classList.contains('hidden')) {
            closeDevConsoleModal();
            event.preventDefault();
            return;
        }
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

        if (isGameplayPhase()) {
            openSettingsModal();
            event.preventDefault();
            return;
        }
    }
});

// Click Outside Helper to Close Modals
function setupClickOutside(modalId, closeAction) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeAction();
            }
        });
    }
}

setupClickOutside('dev-console-modal', closeDevConsoleModal);

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
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = recipe.name; img.src = assetUrl(recipe.art);
        img.addEventListener('error', () => { img.src = assetUrl('/bunker_junk_rare.png'); }, { once: true });
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
    const fabCmd = document.getElementById('fabrication-command');
    if (!fabCmd) return;
    const activated = bankManager.isFoundryActivated();
    fabCmd.classList.toggle('hidden', !activated);
    const btn = document.getElementById('fabrication-btn');
    if (btn) btn.textContent = '◇ FAB BAY';
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
function discoverCodex(id, metadata = null) {
    if (!id || !getCodexEntry(id)) return;
    const isNew = codexStore.record(id, metadata);
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
window.addEventListener('codex-discover', (e) => discoverCodex(e?.detail?.id, e?.detail?.metadata));

function openCodexDetailModal(id) {
    const entry = getCodexEntry(id);
    if (!entry || !codexStore.has(id)) return;

    const modal = document.getElementById('codex-detail-modal');
    const kicker = document.getElementById('codex-detail-kicker');
    const name = document.getElementById('codex-detail-name');
    const img = document.getElementById('codex-detail-img');
    const blurb = document.getElementById('codex-detail-blurb');

    if (kicker) kicker.textContent = `❑ ${entry.category} INTEL RECORD`;
    if (name) name.textContent = entry.name;
    if (blurb) blurb.textContent = entry.blurb;
    if (img) {
        img.src = assetUrl(entry.image || '/favicon.png');
        img.alt = entry.name;
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
    AudioManager?.play?.('ui_click', { volume: 0.6 });
}

function closeCodexDetailModal() {
    const modal = document.getElementById('codex-detail-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

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
            card.className = `codex-card${known ? ' codex-card--unlocked' : ' codex-card--locked'}`;
            if (known) {
                card.innerHTML = `
                    <div class="codex-card__header">
                      <div class="codex-card__name">${entry.name}</div>
                      <span class="codex-card__icon" title="View Intel Dossier & Artwork">🔍</span>
                    </div>
                    <div class="codex-card__blurb">${entry.blurb}</div>
                    <div class="codex-card__hint">CLICK TO VIEW INTEL DOSSIER & ARTWORK</div>
                `;
                card.addEventListener('click', () => openCodexDetailModal(entry.id));
            } else {
                card.innerHTML = `
                    <div class="codex-card__name">??? — UNCATALOGUED</div>
                    <div class="codex-card__blurb">Encounter this in the field to recover its record.</div>
                `;
            }
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
document.getElementById('close-codex-detail-modal')?.addEventListener('click', closeCodexDetailModal);
setupClickOutside('codex-modal', closeCodexModal);
setupClickOutside('codex-detail-modal', closeCodexDetailModal);

// In-world Foundry (Beat 4): reaching the powered structure opens the Bay.
window.addEventListener('open-fabrication-bay', openFabricationModal);
window.addEventListener('o2-startup-sequence-started', (event) => {
    if ((event?.detail?.level ?? 0) !== 1) return;
    showTacticalOverlay({
        title: 'O₂ FIELD ONLINE',
        status: '> REPAIR SEQUENCE COMPLETE<br>> INITIALIZING SYSTEM REBOOT',
        progress: 100,
        duration: 3200
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
    if (key) setPromptKeyLabel(key);
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
    if (key) setPromptKeyLabel(key);
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
    const x = event?.detail?.x;
    const z = event?.detail?.z;
    const locStr = (Number.isFinite(x) && Number.isFinite(z)) ? ` // LOC: [${x.toFixed(1)}, ${z.toFixed(1)}]` : '';
    showTacticalOverlay({
        title: 'FINAL COMPONENT LOCATED — SECTOR ZERO',
        status: `> DEEP STRUCTURE SIGNAL LOCKED${rangeText}${locStr}<br>> FOLLOW THE FIELD COMPASS`,
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
    const arcSignals = arcManager?.getState?.().signals ?? {};
    const deepestDepthTier = Math.max(
        Number(arcSignals.deepestDepthTier) || 0,
        Number(stats.deepestDepthTier ?? stats.depthTier ?? stats.depth) || 0
    );
    const snailsKilled = Math.max(
        Number(arcSignals.snailsKilled) || 0,
        Number(stats.snailsKilled ?? stats.killCount) || 0
    );
    const blackBoxesRecovered = Math.max(
        Number(arcSignals.blackBoxesRecovered) || 0,
        Number(stats.blackBoxesRecovered) || 0
    );
    const preludeSummary = {
        ...stats,
        ...arcSignals,
        classType: window.game?.playerType ?? getSelectedHeroType(),
        blackBoxesRecovered,
        snailsKilled,
        salvageBanked: stats.salvageBanked ?? stats.totalPickups ?? stats.salvage ?? 0,
        salvage: stats.salvage ?? stats.totalPickups ?? stats.salvageBanked ?? 0,
        deepestDepthTier
    };
    // The cave scene video (public/cutscenes/cave-reveal.webm) plays first,
    // under cinematic lock; the controller then owns the text/blackout beats.
    void (async () => {
        window.game?.setCinematicLock?.(true);
        await playCutsceneVideo('cave-reveal');
        await caveRevealController.start(preludeSummary);
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
    if (featureFlags.DEMO_BUILD) {
        showDemoEndModal();
        return;
    }

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
    const secretGate = getSecretGateState(achievementEngine.getState());
    if (secretGate.totalDeaths <= 0 && markLogFound('B13')) {
        showBiomePrompt('ARCHIVE UPDATED: CHEN HIDDEN LOG 13 RECOVERED.');
    }
    recordAchievementEvent('reveal-reached', {
        classType: game?.playerType ?? getSelectedHeroType(),
        totalDeathsBeforeReveal: secretGate.totalDeaths,
        hiveHarmed: !secretGate.noHiveHarmThisRun
    });
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
    if (key) setPromptKeyLabel(key);
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

const ACT2_ENDING_STILLS = Object.freeze({
    full_brood: ['/ending_fullbrood_ship.png'],
    clean_escape: ['/ending_cleanescape_cabin.png'],
    mixed_crew: ['/ending_mixedcrew_cabin.png'],
    carriers_bargain: ['/ending_carriersbargain_eggs.png'],
    scorched_sky: ['/ending_scorchedsky_cockpit.png'],
    mothership_infection: ['/ach_ending_mothership_infection.jpg'],
    alien_exodus: ['/ach_ending_alien_exodus.jpg'],
    outed_escape: ['/ach_ending_outed_escape.jpg'],
    failed_carrier: ['/ach_ending_failed_carrier.jpg'],
    empty_husk: ['/ach_ending_empty_husk.jpg']
});

function formatStoryToken(value = '') {
    return String(value || 'unknown').replace(/_/g, ' ').toUpperCase();
}

function getActiveRunManifestOptions() {
    const effects = window.game?.getRunCardEffects?.() ?? {};
    return {
        eggSeatRequiresNahl: Boolean(effects.manifest?.eggSeatRequiresNahl)
    };
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
    const boardOptions = (detail.options ?? []).filter(o => o.action === 'board');
    const panelEl = campChoiceModal.querySelector('.camp-choice-panel');
    if (panelEl) {
        if (boardOptions.length > 0) {
            panelEl.classList.add('camp-choice-panel--boarding');
        } else {
            panelEl.classList.remove('camp-choice-panel--boarding');
        }
    }
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

    // Boarding manifest forecast logic
    const forecastEl = document.getElementById('boarding-manifest-forecast');

    function updateForecast(variant) {
        const state = act2Manager.getState();
        let queenStatus = state.queenStatus;
        let eggsStatus = state.eggsStatus;

        if (variant === 'queen') { queenStatus = 'aboard'; eggsStatus = 'aboard'; }
        else if (variant === 'purge') { queenStatus = 'killed'; eggsStatus = 'destroyed'; }
        else if (variant === 'bargain') { queenStatus = 'killed'; eggsStatus = 'hidden'; }
        else if (variant === 'abandon') { queenStatus = 'abandoned'; eggsStatus = 'abandoned'; }

        const previewState = { ...state, queenStatus, eggsStatus };
        const manifest = buildAct2Manifest(previewState, getActiveRunManifestOptions());

        const seats = [];
        seats.push({ type: 'player', label: 'OPERATOR (CARRIER)', status: previewState.infectionStage === 'cured' ? 'CLEANED' : 'INFECTED' });

        if (queenStatus === 'aboard') {
            seats.push({ type: 'queen', label: 'QUEEN ALIEN', status: 'BROOD MOTHER (2 SLOTS)', isDouble: true });
        }
        if (eggsStatus === 'aboard' || eggsStatus === 'hidden') {
            seats.push({ type: 'eggs', label: 'BROOD CLUTCH', status: eggsStatus === 'hidden' ? 'HIDDEN' : 'SECURED' });
        }

        const humanLabels = {
            camp_meridian: 'MERIDIAN LEADER',
            camp_tallow: 'TALLOW LEADER',
            camp_vesper: 'VESPER LEADER'
        };
        for (const humanId of manifest.humans) {
            const c = previewState.camps.find((x) => x.id === humanId);
            const label = humanLabels[humanId] ?? 'HUMAN PASSENGER';
            seats.push({ type: 'human', label, status: c?.passengerState === 'turned' ? 'NEURAL HYBRID' : 'SURVIVOR' });
        }

        const alienLabels = {
            hive_suture: 'ALLIED BEING: NAHL',
            hive_relay: 'ALLIED BEING: VEY',
            hive_carapace: 'ALLIED BEING: RHUN'
        };
        for (const alienId of manifest.aliens) {
            seats.push({ type: 'alien', label: alienLabels[alienId] ?? 'ALLIED BEING', status: 'HIVE RESONANT' });
        }

        while (seats.length < 4 && seats.reduce((acc, s) => acc + (s.isDouble ? 2 : 1), 0) < 4) {
            seats.push({ type: 'empty', label: 'VACANT SLOT', status: 'FREE' });
        }

        const seatsGrid = forecastEl?.querySelector('.manifest-seats-grid');
        if (seatsGrid) {
            seatsGrid.innerHTML = seats.map((seat) => {
                const doubleClass = seat.isDouble ? ' manifest-seat-slot--double' : '';
                return `
                    <div class="manifest-seat-slot manifest-seat-slot--${seat.type}${doubleClass}">
                        <div class="manifest-seat-label">${seat.label}</div>
                        <div class="manifest-seat-status">${seat.status}</div>
                    </div>
                `;
            }).join('');
        }

        const blockersList = document.getElementById('manifest-blockers-list');
        if (blockersList) {
            if (!manifest.valid) {
                blockersList.innerHTML = manifest.invalidReasons.map((reason) => {
                    let msg = formatManifestBlocker(reason, manifest);
                    if (reason === 'seat_capacity_exceeded') msg = 'MANIFEST GATING: VESSEL CAPACITY EXCEEDED (4 SLOTS MAX)';
                    if (reason === 'egg_unstable') msg = 'BIOLOGICAL CRITICAL: HIVE EGG UNSTABLE WITHOUT QUEEN OR NAHL IN TRANSIT';
                    return `<div class="manifest-blocker-item">${msg}</div>`;
                }).join('');
            } else {
                const projectedEnding = pickAct2Ending(previewState);
                const endingName = ACT2_ENDING_TITLES[projectedEnding] ?? projectedEnding.replace(/_/g, ' ').toUpperCase();
                blockersList.innerHTML = `<div class="manifest-success-item">PROJECTED PATH: ${endingName}</div>`;
            }
        }
    }

    if (boardOptions.length > 0 && forecastEl) {
        forecastEl.classList.remove('hidden');
        updateForecast(boardOptions[0].variant);
    } else if (forecastEl) {
        forecastEl.classList.add('hidden');
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
        if (option.action === 'board') {
            btn.addEventListener('mouseenter', () => updateForecast(option.variant));
            btn.addEventListener('focus', () => updateForecast(option.variant));
        }
        btn.addEventListener('click', () => {
            window.AudioManager?.play?.('ui_click', { volume: 0.45 });
            closeCampChoiceModal();
            window.game?.resolveCampChoice?.(option.action, {
                ...option,
                campId: detail.campId
            });
        });
        campChoiceOptions.appendChild(btn);
    }
    setCampChoiceOpen(true);
}

campChoiceCloseBtn?.addEventListener('click', () => {
    window.AudioManager?.play?.('ui_click', { volume: 0.35 });
    closeCampChoiceModal();
});

const songInterstitial = new SongInterstitialController({
    root: document.getElementById('song-interstitial'),
    image: document.getElementById('song-interstitial-image'),
    video: document.getElementById('song-interstitial-video'),
    title: document.getElementById('song-interstitial-title'),
    track: document.getElementById('song-interstitial-track'),
    AudioManager,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
});

window.addEventListener('camp-choice-open', async (event) => {
    const detail = event?.detail ?? {};
    await songInterstitial.show(selectCampInterstitial(detail));
    renderCampChoice(detail);
});

const leaderConversationModal = document.getElementById('leader-conversation-modal');
const leaderConversationCanvas = document.getElementById('leader-conversation-canvas');
const leaderConversationPortrait = document.getElementById('leader-conversation-portrait');
const leaderConversationName = document.getElementById('leader-conversation-name');
const leaderConversationKicker = document.getElementById('leader-conversation-kicker');
const leaderConversationMeta = document.getElementById('leader-conversation-meta');
const leaderConversationLine = document.getElementById('leader-conversation-line');
const leaderConversationStats = document.getElementById('leader-conversation-stats');
const leaderConversationGuidance = document.getElementById('leader-conversation-guidance');
const leaderConversationContinue = document.getElementById('leader-conversation-continue');
const leaderConversationLeave = document.getElementById('leader-conversation-leave');
const leaderConversationClose = document.getElementById('leader-conversation-close');
const leaderConversation3d = new LeaderConversation3d(leaderConversationCanvas);
let leaderConversationLines = [];
let leaderConversationLineIndex = 0;
let leaderConversationIdentity = null;

function cleanLeaderDialogueLine(line, speakerName = '') {
    const text = String(line ?? '').trim();
    const colon = text.indexOf(':');
    if (colon < 0 || colon > 32) return text;
    const prefix = text.slice(0, colon).trim().toLowerCase();
    const names = String(speakerName).toLowerCase().split(/\s+/).filter(Boolean);
    return names.some((name) => prefix.includes(name)) ? text.slice(colon + 1).trim() : text;
}

function renderLeaderConversationLine() {
    const raw = leaderConversationLines[leaderConversationLineIndex] ?? '';
    if (leaderConversationLine) leaderConversationLine.textContent = cleanLeaderDialogueLine(raw, leaderConversationIdentity?.name);
    const reaction = dialogueReactionForLine(raw);
    leaderConversationModal?.setAttribute('data-mood', reaction.mood);
    leaderConversation3d.react(reaction);
    const atEnd = leaderConversationLineIndex >= leaderConversationLines.length - 1;
    if (leaderConversationContinue) leaderConversationContinue.textContent = atEnd ? 'FINISH CONVERSATION' : 'CONTINUE';
}

function closeLeaderConversation() {
    leaderConversationModal?.classList.add('hidden');
    leaderConversationModal?.setAttribute('aria-hidden', 'true');
    leaderConversation3d.hide();
    leaderConversationLines = [];
    leaderConversationLineIndex = 0;
    if (isGameplayPhase()) window.game?.setInputEnabled?.(true);
}

leaderConversationContinue?.addEventListener('click', () => {
    window.AudioManager?.play?.('ui_click', { volume: 0.4 });
    if (leaderConversationLineIndex >= leaderConversationLines.length - 1) {
        closeLeaderConversation();
        return;
    }
    leaderConversationLineIndex += 1;
    renderLeaderConversationLine();
});
leaderConversationLeave?.addEventListener('click', closeLeaderConversation);
leaderConversationClose?.addEventListener('click', closeLeaderConversation);

window.addEventListener('leader-dialogue', async (event) => {
    const detail = event?.detail ?? {};
    const identity = resolveLeaderIdentity(detail);
    leaderConversationIdentity = identity;
    leaderConversationLines = (detail.lines ?? []).map((line) => String(line ?? '')).filter(Boolean);
    leaderConversationLineIndex = 0;
    if (!leaderConversationLines.length || !leaderConversationModal) return;
    preloadLeaderMedia(identity);
    leaderConversationModal.style.setProperty('--leader-accent', identity.accent);
    if (leaderConversationName) leaderConversationName.textContent = identity.name;
    if (leaderConversationKicker) leaderConversationKicker.textContent = detail.kind === 'camp' ? 'CAMP CONVERSATION' : 'FIELD CONVERSATION';
    if (leaderConversationMeta) {
        leaderConversationMeta.textContent = [identity.title, identity.callsign ? `CALLSIGN ${identity.callsign}` : '', identity.classId]
            .filter(Boolean).join(' // ');
    }
    if (leaderConversationPortrait) {
        leaderConversationPortrait.src = identity.portrait;
        leaderConversationPortrait.alt = identity.name;
        leaderConversationPortrait.classList.remove('hidden');
        leaderConversationPortrait.onerror = () => {
            leaderConversationPortrait.onerror = null;
            leaderConversationPortrait.src = identity.sprite;
        };
    }
    const relationship = detail.relationship ?? {};
    if (leaderConversationStats) {
        const stats = [];
        if (Number.isFinite(relationship.bond)) stats.push(`BOND ${relationship.bond}/5`);
        if (Number.isFinite(relationship.level)) stats.push(`CAMP LEVEL ${relationship.level}/3`);
        if (Number.isFinite(relationship.suspicion)) stats.push(`SUSPICION ${relationship.suspicion}/100`);
        stats.push(`STORY STAGE ${(detail.progress?.stage ?? detail.stage ?? 0) + 1}`);
        leaderConversationStats.textContent = stats.join('  •  ');
    }
    if (leaderConversationGuidance) leaderConversationGuidance.textContent = detail.progress?.guidance || 'Listen, then decide how you want to help.';
    renderLeaderConversationLine();
    leaderConversationModal.classList.remove('hidden');
    leaderConversationModal.setAttribute('aria-hidden', 'false');
    window.game?.setInputEnabled?.(false);
    leaderConversationContinue?.focus();
    window.AudioManager?.play?.('door_slide_horiz', { volume: 0.32 });
    const has3d = await leaderConversation3d.show(identity);
    if (leaderConversationIdentity?.id !== identity.id) return;
    leaderConversationPortrait?.classList.toggle('hidden', has3d);
    if (has3d) leaderConversation3d.react(dialogueReactionForLine(leaderConversationLines[leaderConversationLineIndex]));
});

// Generic hook for dialogue, encounters, bosses, memories, and endings. A
// caller only needs to dispatch `{ detail: { trackId: 13 } }`; the manifest
// owns image/audio/motion paths and the controller owns all fallback behavior.
window.addEventListener('song-interstitial-open', async (event) => {
    const trackId = event?.detail?.trackId;
    const result = await songInterstitial.show(trackId, event?.detail ?? {});
    window.dispatchEvent(new CustomEvent('song-interstitial-settled', {
        detail: { trackId, ...result }
    }));
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
    const { campLabel, negated } = event?.detail ?? {};
    showBiomePrompt(negated
        ? `TANK GUARD: ${campLabel ?? 'CAMP'} DEFENSE ZAP ABSORBED — FIRST SHOCK NEGATED.`
        : `WARNING: ${campLabel ?? 'CAMP'} DEFENSE GRID FIRING — SPOOF IT, SMASH IT, OR STAY CLEAR.`);
});
window.addEventListener('camp-turret-resolved', (event) => {
    const { campLabel, mode, suspicion } = event?.detail ?? {};
    const message = mode === 'reprogrammed'
        ? `SYSTEM: TURRET REPROGRAMMED — ${campLabel ?? 'CAMP'} GRID NOW COVERS YOU.`
        : mode === 'disabled'
            ? `SYSTEM: TURRET IFF SPOOFED — ${campLabel ?? 'CAMP'} GRID READS YOU AS FRIENDLY.`
            : `ALERT: TURRET DESTROYED. ${campLabel ?? 'CAMP'} HEARD THAT — SUSPICION ${suspicion ?? '?'}%.`;
    showBiomePrompt(message);
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

function updateQueensLedgerHUD() {
    const hud = document.getElementById('queens-ledger-hud');
    if (!hud) return;

    if (!isAct2RunActive()) {
        hud.classList.add('hidden');
        return;
    }

    hud.classList.remove('hidden');

    const state = act2Manager.getState();
    const ending = state.manifest ? pickAct2Ending(state) : null;
    const obedience = state.queenObedience ?? 0;
    const seatsUsed = state.manifest?.seatsUsed ?? 1;
    const seatsMax = state.manifest?.seatsMax ?? 4;

    let vectorText = 'UNSTABLE';
    let vectorClass = 'unstable';

    if (state.dishBuilt) {
        vectorText = ACT2_ENDING_TITLES[ending] ?? String(ending ?? 'unknown').replace(/_/g, ' ').toUpperCase();
        vectorClass = 'revealed';
    }

    const sign = obedience < 0 ? '\u2212' : obedience > 0 ? '+' : '';
    const obedienceText = `${sign}${Math.abs(obedience)}`;

    hud.classList.remove('queens-ledger-hud--obedience-hive', 'queens-ledger-hud--obedience-human', 'queens-ledger-hud--neutral');
    if (obedience > 0) {
        hud.classList.add('queens-ledger-hud--obedience-hive');
    } else if (obedience < 0) {
        hud.classList.add('queens-ledger-hud--obedience-human');
    } else {
        hud.classList.add('queens-ledger-hud--neutral');
    }

    const newHTML = `
        <span class="queens-ledger-hud__icon">♛</span>
        OBEDIENCE <span class="queens-ledger-hud__value queens-ledger-hud__value--obedience">${obedienceText}</span>
        &nbsp;·&nbsp;
        SEATS <span class="queens-ledger-hud__value">${seatsUsed}/${seatsMax}</span>
        &nbsp;·&nbsp;
        VECTOR: <span class="queens-ledger-hud__value queens-ledger-hud__value--vector ${vectorClass}">${vectorText}</span>
    `;

    if (hud.innerHTML !== newHTML) {
        hud.innerHTML = newHTML;
        hud.classList.remove('queens-ledger-hud__flash');
        void hud.offsetWidth; // Force reflow
        hud.classList.add('queens-ledger-hud__flash');
    }
}

window.addEventListener('camp-choice-resolved', updateQueensLedgerHUD);
window.addEventListener('hive-choice-resolved', updateQueensLedgerHUD);
window.addEventListener('camp-supported', updateQueensLedgerHUD);
window.addEventListener('camp-bonded', updateQueensLedgerHUD);
window.addEventListener('camp-final-resolved', updateQueensLedgerHUD);
window.addEventListener('act2-milestone', updateQueensLedgerHUD);

window.addEventListener('player-humanity-changed', (event) => {
    const { humanity, stage } = event?.detail ?? {};
    renderCoverBar(humanity, stage);
    updateQueensLedgerHUD();
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

window.addEventListener('act2-apex-threat-spawned', (event) => {
    const { type, campLabel, label } = event?.detail ?? {};
    const source = campLabel ? ` FROM ${campLabel}` : '';
    const title = type === 'hunter_pair' ? 'HUNTER PAIR' : label ?? 'APEX THREAT';
    showBiomePrompt(`WARNING: ${title}${source} — ESCALATION ACTIVE.`);
});

window.addEventListener('leader-dialogue', (event) => {
    const { beatType, leaderName, leaderClassId } = event?.detail ?? {};
    let lines = [...(event?.detail?.lines ?? [])];
    if (!lines.length) return;
    const memory = getWorldMemory();
    const hasReyesLetter = memory.logsFound.includes('C11');
    const talkingToBriggs = String(leaderName ?? '').toUpperCase().includes('BRIGGS')
        || String(leaderClassId ?? '').toUpperCase() === 'TANK';
    if (hasReyesLetter && talkingToBriggs && !memory.storyFlags.reyesLetterDelivered) {
        memory.storyFlags.reyesLetterDelivered = true;
        saveWorldMemory(memory);
        lines = [
            ...lines,
            'BRIGGS: REYES WROTE THIS? SHE ALWAYS SAID SHE WOULD MAKE IT HOME ON PAPER IF NOT IN PERSON.',
            'BRIGGS: WE DO NOT HAVE A FUNERAL DETAIL. WE HAVE A LINE TO HOLD. I WILL HOLD IT FOR HER.'
        ];
        window.dispatchEvent(new CustomEvent('reyes-letter-delivered', {
            detail: { leaderName: leaderName ?? 'Commander Briggs', loreKey: 'C11' }
        }));
    }
    ensureMissionManagers();
    void dialogueManager?.openBriefTransmission({
        playerType: window.game?.playerType ?? getSelectedHeroType(),
        lines
    });
    if (beatType === 'advance') {
        window.AudioManager?.play?.('ui_scan_ping', { volume: 0.4, playbackRate: 0.9 });
    }
    if (leaderName === 'Dr. Okonkwo-Vass' && beatType === 'advance' && event?.detail?.stage === 2) {
        objectiveRegistry.trackObjective({
            id: 'befriend-a-snail',
            source: 'camp-quest',
            label: 'BEFRIEND A SNAIL',
            current: 0,
            target: 1
        });
    }
});

document.getElementById('snail-encounter-fight-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterFight?.();
});
document.getElementById('snail-encounter-talk-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterTalk?.();
});
document.getElementById('snail-encounter-custom-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterCustom?.();
});
document.getElementById('snail-encounter-flee-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterFlee?.();
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

window.addEventListener('queen-phase-line', (event) => {
    const { text } = event?.detail ?? {};
    if (text) showBiomePrompt(`QUEEN: ${text}`);
});

window.addEventListener('boarding-blocked', (event) => {
    const { reasons, seatsUsed, seatsMax } = event?.detail ?? {};
    const why = (reasons ?? [])
        .map((r) => formatManifestBlocker(r, { seatsUsed, seatsMax }))
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
    let lines = ACT2_LINES[event?.detail?.key];
    if (!lines?.length) return;

    if (event?.detail?.key === 'campDiscovered') {
        const campLabel = event?.detail?.campLabel || 'CAMP';
        const x = event?.detail?.x;
        const z = event?.detail?.z;
        let sector = 'SECTOR A-9 GRID RUINS';
        if (campLabel.includes('TALLOW')) sector = 'SECTOR B-4 FROZEN OUTPOST';
        if (campLabel.includes('VESPER')) sector = 'SECTOR C-7 HIVE SHADOW';
        const locStr = (Number.isFinite(x) && Number.isFinite(z)) ? ` // LOC: [${x.toFixed(1)}, ${z.toFixed(1)}]` : '';
        lines = [
            `SYSTEM: ${campLabel} — ${sector}${locStr}`,
            ...lines
        ];
    }

    lines.forEach((line) => {
        const rawLine = typeof line === 'object' ? line.text : line;
        showRadioTransmission(rawLine);
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
    const classType = game?.playerType ?? getSelectedHeroType();
    recordAchievementRunEnd({
        ...(detail.runStats ?? game?.getRunStats?.() ?? {}),
        outcome: 'victory',
        ending,
        runMs: Date.now() - runStartTime,
        classType
    }, { delayMs: 900 });
    if (window.electronAPI?.requestSteamPromoGrant) {
        window.electronAPI.requestSteamPromoGrant(classType)
            .then((result) => {
                (result?.granted ?? []).forEach((item) => showSteamDropToast(item.itemdefid, item.quantity));
            })
            .catch((err) => {
                console.log(`[steam] victory promo grant skipped: ${err?.message ?? err}`);
            });
    }
    game?.setCinematicLock?.(true);
    AudioManager.play('door_gears_spin', { volume: 0.5, playbackRate: 0.7 });
    await dialogueManager?.openBriefTransmission({
        playerType: classType,
        lines: [...getAct2EndingLines(ending)]
    });
    await playCinematicBeat({
        videoBase,
        fallback: {
            id: `ending-${ending ?? 'departure'}`,
            kicker: 'ENDING VECTOR // RECORDED',
            title: ACT2_ENDING_TITLES[ending] ?? 'THE VESSEL CLEARS THE ICE',
            body: 'The manifest is sealed. Everything aboard will live with the choice.',
            images: ACT2_ENDING_STILLS[ending] ?? ['/ship_wreckage.png'],
            durationMs: 4200,
            tone: 'ending'
        }
    });
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

const TACTICAL_CALLSIGNS = Object.freeze([
    'VORTEX-7', 'PHANTOM-9', 'SPECTRE-3', 'GHOST-1', 'CYPHER-5',
    'VIPER-4', 'TITAN-2', 'APEX-8', 'NEXUS-6', 'ZERO-9', 'HAWK-3',
    'SHADOW-5', 'RAVEN-7', 'STRIKER-4', 'BUNKER-1'
]);

function renderRosterModal(mode = 'continue') {
    const grid = document.getElementById('roster-weapon-grid');
    if (!grid) return;
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const titleEl = document.getElementById('roster-title-label');
    const confirmBtn = document.getElementById('roster-confirm-btn');
    const callsignInput = document.getElementById('roster-callsign-input');
    const randomizeBtn = document.getElementById('roster-randomize-btn');

    if (titleEl) {
        titleEl.textContent = mode === 'new_game'
            ? 'NEW OPERATOR REGISTRATION'
            : '▣ OPERATOR DOSSIER // SAVED RUN TRACKER';
    }

    if (confirmBtn) {
        confirmBtn.textContent = mode === 'new_game'
            ? 'CONFIRM CALLSIGN & DEPLOY'
            : 'CONTINUE DEPLOYMENT';
    }

    if (callsignInput) {
        let currentCallsign = profile.getCallsign();
        if (mode === 'new_game' && (!currentCallsign || currentCallsign === 'AGENT' || currentCallsign === 'AGENT-01')) {
            currentCallsign = TACTICAL_CALLSIGNS[Math.floor(Math.random() * TACTICAL_CALLSIGNS.length)];
            profile.setCallsign(currentCallsign);
        }
        callsignInput.value = currentCallsign;
        callsignInput.oninput = (e) => {
            const clean = profile.setCallsign(e.target.value);
            e.target.value = clean;
        };
    }

    if (randomizeBtn && !randomizeBtn._wired) {
        randomizeBtn._wired = true;
        randomizeBtn.addEventListener('click', () => {
            const pick = TACTICAL_CALLSIGNS[Math.floor(Math.random() * TACTICAL_CALLSIGNS.length)];
            profile.setCallsign(pick);
            if (callsignInput) {
                callsignInput.value = pick;
                callsignInput.classList.add('callsign-pulse');
                setTimeout(() => callsignInput.classList.remove('callsign-pulse'), 400);
            }
            window.AudioManager?.play?.('ui_click', { volume: 0.5 });
        });
    }

    if (confirmBtn && !confirmBtn._wired) {
        confirmBtn._wired = true;
        confirmBtn.addEventListener('click', () => {
            const modal = document.getElementById('roster-modal');
            closeModalWithAnimation(modal, null, {
                exitClass: 'roster-modal--deploying',
                duration: 680
            });
            window.AudioManager?.play?.('ui_click', { volume: 0.5 });
        });
    }

    setTxt('roster-id', profile.getProfileId());

    // Populate Run Telemetry stats (reset to 0 on brand new operator registration)
    try {
        const isNewGame = (mode === 'new_game');
        const stats = isNewGame ? {} : (window.game?.getRunStats?.() ?? {});
        const bbState = isNewGame ? null : blackBoxStore.load();
        const depthVal = stats.depthTier ?? 0;
        const distVal = stats.distanceTravelled ?? 0;
        const killVal = stats.snailsKilled ?? 0;

        setTxt('roster-stat-depth', `SECTOR ${depthVal}`);
        setTxt('roster-stat-distance', `${distVal}u`);
        setTxt('roster-stat-kills', `${killVal} HOSTILES`);
        setTxt('roster-stat-blackbox', bbState?.active ? `RECOVERABLE (SECTOR ${bbState.depth ?? 0})` : 'NONE');
    } catch {
        setTxt('roster-stat-depth', 'SECTOR 0');
        setTxt('roster-stat-distance', '0u');
        setTxt('roster-stat-kills', '0 HOSTILES');
        setTxt('roster-stat-blackbox', 'NONE');
    }

    // Render equipped Steam cosmetics (3 pre-blank placeholder cards showing NULL when unequipped)
    const patchId = localStorage.getItem('hb_equipped_patch');
    const decalId = localStorage.getItem('hb_equipped_decal');
    const finishId = localStorage.getItem('hb_equipped_weapon_finish');

    setTxt('roster-equipped-patch', patchId ? (STEAM_ITEM_CATALOG[Number(patchId)]?.name ?? 'NULL') : 'NULL');
    setTxt('roster-equipped-decal', decalId ? (STEAM_ITEM_CATALOG[Number(decalId)]?.name ?? 'NULL') : 'NULL');
    setTxt('roster-equipped-weapon-finish', finishId ? (STEAM_ITEM_CATALOG[Number(finishId)]?.name ?? 'NULL') : 'NULL');

    // Make cosmetic cards clickable to open Steam Vault submenu
    const cosmeticsRow = document.getElementById('roster-cosmetics-row');
    if (cosmeticsRow && !cosmeticsRow._wired) {
        cosmeticsRow._wired = true;
        cosmeticsRow.querySelectorAll('.roster-cosmetic-chip').forEach((chip) => {
            chip.style.cursor = 'pointer';
            chip.title = 'Click to open Steam Vault cosmetics submenu';
            chip.addEventListener('click', () => {
                window.AudioManager?.play?.('ui_click', { volume: 0.5 });
                openSteamVaultModal();
            });
        });
    }

    const weapons = FAB_RECIPES.filter((r) => r.klass === 'WEAPON');
    const fabbedWeapons = weapons.filter((r) => fabricator.isFabricated(r.id));
    const fabbed = fabbedWeapons.length;
    setTxt('roster-fab-count', `ARSENAL: ${fabbed} / ${weapons.length} WEAPONS FABRICATED`);

    grid.innerHTML = '';
    if (fabbed === 0) {
        // Single compact slot with one Fabricate button when 0 weapons are fabricated
        const isFoundryUnlocked = bankManager.isFoundryActivated();

        const emptyCard = document.createElement('div');
        emptyCard.className = 'roster-weapon-empty-slot';

        const info = document.createElement('div');
        info.className = 'roster-empty-info';

        const icon = document.createElement('div');
        icon.className = 'roster-empty-icon';
        icon.textContent = '◇';

        const textGroup = document.createElement('div');
        textGroup.className = 'roster-empty-text';

        const title = document.createElement('div');
        title.className = 'roster-empty-title';
        title.textContent = 'NO WEAPONS FABRICATED';

        const sub = document.createElement('div');
        sub.className = 'roster-empty-sub';
        sub.textContent = isFoundryUnlocked
            ? 'Visit the Fabrication Bay to print sidearms from bunker salvage.'
            : 'Power the base generator to unlock the Fabrication Bay.';

        textGroup.appendChild(title);
        textGroup.appendChild(sub);
        info.appendChild(icon);
        info.appendChild(textGroup);
        emptyCard.appendChild(info);

        const fabBtn = document.createElement('button');
        fabBtn.className = 'roster-weapon__btn roster-weapon__btn--single-fab';
        if (isFoundryUnlocked) {
            fabBtn.textContent = '+ OPEN FAB BAY';
            fabBtn.addEventListener('click', () => {
                window.AudioManager?.play?.('ui_click', { volume: 0.5 });
                openFabricationModal();
            });
        } else {
            fabBtn.textContent = 'FAB BAY LOCKED';
            fabBtn.disabled = true;
            fabBtn.classList.add('roster-weapon__btn--locked');
        }
        emptyCard.appendChild(fabBtn);
        grid.appendChild(emptyCard);
    } else {
        const equippedId = loadout.getEquippedId();
        for (const recipe of fabbedWeapons) {
            const equipped = equippedId === recipe.id;

            const card = document.createElement('div');
            card.className = ['roster-weapon', equipped ? 'roster-weapon--equipped' : ''].filter(Boolean).join(' ');

            const art = document.createElement('div');
            art.className = 'roster-weapon__art';
            const img = document.createElement('img');
            img.loading = 'lazy'; img.decoding = 'async'; img.alt = recipe.name;
            img.src = assetUrl(recipe.art);
            img.addEventListener('error', () => { img.src = assetUrl('/bunker_junk_rare.png'); }, { once: true });
            art.appendChild(img);
            card.appendChild(art);

            const name = document.createElement('div');
            name.className = 'roster-weapon__name';
            name.textContent = recipe.name;
            name.title = recipe.name;
            card.appendChild(name);

            const btn = document.createElement('button');
            btn.className = 'roster-weapon__btn';
            if (equipped) {
                btn.textContent = '✓ EQUIPPED'; btn.disabled = true; btn.classList.add('roster-weapon__btn--equipped');
            } else {
                btn.textContent = 'EQUIP';
                btn.addEventListener('click', () => {
                    if (loadout.equip(recipe.id, fabricator)) {
                        window.AudioManager?.play?.('ui_click', { volume: 0.5 });
                        syncEquippedWeaponLabel();
                        renderRosterModal(mode);
                    } else {
                        window.AudioManager?.play?.('ui_error', { volume: 0.5 });
                    }
                });
            }
            card.appendChild(btn);
            grid.appendChild(card);
        }
    }
}

document.getElementById('roster-btn')?.addEventListener('click', () => {
    renderRosterModal();
    const modal = document.getElementById('roster-modal');
    if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false'); }
});
document.getElementById('close-roster-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('roster-modal');
    closeModalWithAnimation(modal);
});
setupClickOutside('roster-modal', () => {
    const modal = document.getElementById('roster-modal');
    closeModalWithAnimation(modal);
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
    });
}

if (mainNightVisionToggle) {
    mainNightVisionToggle.addEventListener('change', (e) => {
        state.settings.nightVision = e.target.checked;
        localStorage.setItem('hunker_nightvision_enabled', String(state.settings.nightVision));
        if (window.game) {
            window.game.nightVision = state.settings.nightVision;
        }
    });
}

if (mainFsToggle) {
    mainFsToggle.addEventListener('change', (e) => {
        state.settings.fullscreen = e.target.checked;

        if (state.settings.fullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        }
    });
}

if (mainCommentaryToggle) {
    mainCommentaryToggle.addEventListener('change', (e) => {
        state.settings.commentary = e.target.checked;
        localStorage.setItem(COMMENTARY_STORAGE_KEY, String(state.settings.commentary));
        if (state.settings.commentary) {
            showDeveloperCommentary('run_start', {}, { once: false });
        }
    });
}

function getDoorImage(key) {
    const CLASS_DOORS = {
        'SCOUT': '/door_bio_keyart_v2.webp',
        'TANK': '/door_nuclear_keyart_v2.webp',
        'ENGINEER': '/door_cryo_keyart_v2.webp'
    };
    const SPECIAL_DOORS = {
        'base': '/door_biomech_keyart_v2.webp',
        'win': '/door_alien_keyart_v2.webp',
        'lose': '/door_rust_keyart_v2.webp'
    };
    if (key === 'win') return assetUrl(SPECIAL_DOORS.win);
    if (key === 'lose') return assetUrl(SPECIAL_DOORS.lose);
    if (key === 'base') return assetUrl(SPECIAL_DOORS.base);
    if (CLASS_DOORS[key]) return assetUrl(CLASS_DOORS[key]);

    // Automatically determine door image based on active/preview class
    const activeClass = window.game?.playerType || activePreviewType || 'SCOUT';
    return assetUrl(CLASS_DOORS[activeClass] || SPECIAL_DOORS.base);
}

function getMapDoorImage(key) {
    const MAP_CLASS_DOORS = {
        'SCOUT': '/door_bio.png',
        'TANK': '/door_nuclear.png',
        'ENGINEER': '/door_cryo.png'
    };
    const SPECIAL_DOORS = {
        'base': '/door_biomechanical.png'
    };
    if (MAP_CLASS_DOORS[key]) return assetUrl(MAP_CLASS_DOORS[key]);
    const activeClass = window.game?.playerType || activePreviewType || 'SCOUT';
    return assetUrl(MAP_CLASS_DOORS[activeClass] || SPECIAL_DOORS.base);
}

function preloadDoorAssets() {
    const doorImages = [
        '/door_biomech_keyart_v2.webp',
        '/door_bio_keyart_v2.webp',
        '/door_nuclear_keyart_v2.webp',
        '/door_cryo_keyart_v2.webp',
        '/door_alien_keyart_v2.webp',
        '/door_rust_keyart_v2.webp',
        '/door_bio.png',
        '/door_nuclear.png',
        '/door_cryo.png',
        '/door_biomechanical.png',
        '/ship_wreckage.png'
    ];

    for (const src of doorImages) {
        const img = new Image();
        img.src = assetUrl(src);
    }

    try {
        AudioManager.preload?.(['ui_boot1', 'door_slam_vertical', 'door_gears_spin', 'door_slide_horiz']);
    } catch {
        // best-effort audio preload
    }
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
    const preloader = new Image();
    preloader.src = doorImg;
    overlay.style.setProperty('--door-bg-image', `url('${doorImg}')`);

    syncStageMetrics();

    // 1. Prepare for vertical close
    overlay.classList.add('visible');
    overlay.classList.add('closing-v');
    AudioManager.play('ui_boot1', { volume: 0.5 });

    // Force reflow
    void overlay.offsetWidth;

    // 2. Start closing after double RAF frame-settle
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            AudioManager.play('door_slam_vertical', { volume: 0.4 });
            AudioManager.play('door_gears_spin', { volume: 0.25 });
        });
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

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // 4. Start opening after a small "hold" gap
                    setTimeout(() => {
                        spawnSmoke(0, 0, 30, false); // Separation smoke
                        overlay.classList.add('active');
                        AudioManager.play('door_slide_horiz', { volume: 0.4 });
                        AudioManager.play('door_gears_spin', { volume: 0.25 });
                        // Opening owns the reveal. Do not transfer control or
                        // start intro work until the panels have visibly
                        // completed their 800ms travel.
                        setTimeout(() => {
                            if (onOpened) onOpened();
                        }, 800);
                    }, openingHoldMs);

                    // 5. Cleanup
                    setTimeout(() => {
                        overlay.classList.remove('visible', 'opening-h', 'active');
                    }, openingHoldMs + 900);
                });
            });
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
const previewFallback = document.getElementById('char-preview-fallback');
const preview3dCanvas = document.getElementById('char-preview-3d');
const previewDoor = document.getElementById('char-preview-door');
const previewName = document.getElementById('char-preview-name');
const previewSpriteContext = previewSprite?.getContext('2d', { willReadFrequently: true }) ?? null;
const PREVIEW_FRAME_MS = 110;
const PREVIEW_DOOR_CLOSE_MS = 360;
const PREVIEW_DOOR_HOLD_MS = 220;
const PREVIEW_DOOR_OPEN_MS = 520;
let previewFrameIndex = 0;
let previewAnimationTimer = null;
let previewDoorTimer = null;
let pendingPreviewType = null;
let activePreviewType = 'TANK';
let scoutHeroPreview = null;
void createScoutHeroPreview(preview3dCanvas)
    .then((preview) => {
        scoutHeroPreview = preview;
        preview.setOperatorPolish(getSelectedPolish().color);
        void preview.setType(activePreviewType);
        preview.setVisible(true);
        previewSprite?.classList.add('hidden');
        previewFallback?.classList.add('hidden');
    })
    .catch((error) => {
        console.warn('[scout-hero-preview] keeping 2D fallback', error);
    });
const previewSpriteImages = new Map();
const PREVIEW_PORTRAITS = Object.freeze({
    SCOUT: '/Scout.full_v2.png',
    TANK: '/Tank.full_v2.png',
    ENGINEER: '/Eng.Full_v2.png'
});

charCards.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', card.classList.contains('selected') ? 'true' : 'false');
    card.addEventListener('keydown', (event) => {
        if (event.code !== 'Enter' && event.code !== 'Space') return;
        event.preventDefault();
        card.click();
    });
});

const heroData = PLAYER_SPRITE_LAYOUTS;

function getPreviewSpriteImage(path, layout) {
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
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

            const runtimeCanvas = repackGeneratedSpriteAtlas(canvas, layout);
            previewSpriteImages.set(path, runtimeCanvas);
            resolve(runtimeCanvas);
        };
        image.onerror = reject;
        image.src = assetUrl(path);
    });

    previewSpriteImages.set(path, imagePromise);
    return imagePromise;
}

async function renderPreviewFrame(type, frameIndex = previewFrameIndex) {
    const data = heroData[type];
    if (!data || !previewSprite || !previewSpriteContext) return;

    const image = await getPreviewSpriteImage(data.path, data).catch(() => null);
    if (!image || !heroData[type] || heroData[type].path !== data.path) {
        previewFallback?.classList.remove('hidden');
        return;
    }

    const frameWidth = Math.floor(image.width / data.columns);
    const frameHeight = Math.floor(image.height / data.rows);
    const walkFrame = ((frameIndex % data.walkFrames) + data.walkFrames) % data.walkFrames;
    const previewCell = data.directionCells[data.previewDirection];
    const sourceX = (previewCell.baseColumn + walkFrame) * frameWidth;
    const sourceY = previewCell.row * frameHeight;

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
    const polish = getSelectedPolish();
    if (polish.id !== 0) {
        previewSpriteContext.save();
        previewSpriteContext.globalCompositeOperation = 'multiply';
        previewSpriteContext.fillStyle = polish.color;
        previewSpriteContext.fillRect(0, 0, frameWidth, frameHeight);
        previewSpriteContext.restore();
    }
    previewFallback?.classList.add('hidden');

}

function syncHeroPreview(type) {
    const data = heroData[type];
    if (!data) return;

    activePreviewType = type;
    const show3dHero = Boolean(scoutHeroPreview);
    void scoutHeroPreview?.setType(type);
    scoutHeroPreview?.setVisible(true);
    previewSprite?.classList.toggle('hidden', show3dHero);
    if (previewName) previewName.textContent = data.name;
    if (previewFallback) {
        previewFallback.src = assetUrl(PREVIEW_PORTRAITS[type] ?? PREVIEW_PORTRAITS.SCOUT);
        previewFallback.classList.toggle('hidden', show3dHero);
    }
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
        const frameCount = getPlayerSpriteLayout(activePreviewType).walkFrames;
        previewFrameIndex = (previewFrameIndex + 1) % frameCount;
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
    const gameContainer = document.getElementById('game-container');
    let mapDoor = document.getElementById('map-box-door');
    if (gameContainer) {
        if (!mapDoor) {
            mapDoor = document.createElement('div');
            mapDoor.id = 'map-box-door';
            mapDoor.className = 'map-box-door';
            mapDoor.setAttribute('aria-hidden', 'true');
            mapDoor.innerHTML = `
                <div class="char-preview-door__panel char-preview-door__panel--top"></div>
                <div class="char-preview-door__panel char-preview-door__panel--bottom"></div>
            `;
            gameContainer.appendChild(mapDoor);
        } else {
            gameContainer.appendChild(mapDoor);
        }
    }
    const mapDoorImg = getMapDoorImage(targetType);

    previewDoor.style.setProperty('--door-bg-image', `url('${doorImg}')`);
    if (mapDoor) {
        mapDoor.style.setProperty('--map-door-bg-image', `url('${mapDoorImg}')`);
        mapDoor.classList.remove('opening', 'ready-to-open');
        mapDoor.classList.add('active', 'closing');
    }

    previewDoor.classList.remove('opening', 'ready-to-open');
    previewDoor.classList.add('active', 'closing');
    AudioManager.play('door_slam_vertical', { volume: 0.2 });
    AudioManager.play('door_gears_spin', { volume: 0.12 });

    previewDoorTimer = window.setTimeout(() => {
        syncHeroPreview(targetType);
        previewDoor.classList.remove('closing');
        previewDoor.classList.add('ready-to-open');
        if (mapDoor) {
            mapDoor.classList.remove('closing');
            mapDoor.classList.add('ready-to-open');
        }

        window.setTimeout(() => {
            void previewDoor.offsetWidth;
            if (mapDoor) void mapDoor.offsetWidth;
            previewDoor.classList.remove('ready-to-open');
            previewDoor.classList.add('opening');
            if (mapDoor) {
                mapDoor.classList.remove('ready-to-open');
                mapDoor.classList.add('opening');
            }
            AudioManager.play('door_slide_horiz', { volume: 0.18 });
            AudioManager.play('door_gears_spin', { volume: 0.1 });
        }, PREVIEW_DOOR_HOLD_MS);

        previewDoorTimer = window.setTimeout(() => {
            previewDoor.classList.remove('active', 'opening', 'ready-to-open');
            if (mapDoor) {
                mapDoor.classList.remove('active', 'opening', 'ready-to-open');
            }
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
        charCards.forEach(c => c.setAttribute('aria-pressed', 'false'));
        // Add to clicked
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');

        // Update Preview
        const type = card.getAttribute('data-type');
        if (heroData[type]) {
            saveHeroType(type);
            refreshTitleProfileHud(true);
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
                if (isGameplayPhase()) {
                    AudioManager.playMetalStress({ volume: 0.4 });
                }

                if (!isGameplayPhase()) {
                    hideAllGameplayPrompts();
                    hideRunLoadingScreen();
                    setTimeout(() => {
                        window.game.updatePlayerType(type, { poof: true, emitWorldEvents: false });
                        AudioManager.play('class_lock', { volume: 0.5 });
                    }, 360);
                    return;
                }

                setTimeout(() => {
                    window.game.updatePlayerType(type, { poof: true, emitWorldEvents: true });
                    AudioManager.play('class_lock', { volume: 0.5 });
                }, 360);
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
    const isInsideGameViewport = (clientX, clientY) => {
        const rect = gameViewport?.getBoundingClientRect();
        return !!rect
            && clientX >= rect.left
            && clientX <= rect.right
            && clientY >= rect.top
            && clientY <= rect.bottom;
    };

    window.addEventListener('mousemove', (e) => {
        // Ensure clientX and clientY are valid, finite numbers
        if (typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return;
        if (isNaN(e.clientX) || isNaN(e.clientY) || !isFinite(e.clientX) || !isFinite(e.clientY)) return;

        // Filter out simulated browser events (common on clicks/focus transitions)
        // that report false (0,0) or extremely small coordinates on either axis.
        if (e.clientX < 8 || e.clientY < 8) return;

        // Gamescope can emit synthetic mouse motion while it transfers focus
        // away from Steam's launch overlay. Do not reveal either cursor until
        // the final airlock doors have completely exposed the title menu.
        if (document.documentElement.classList.contains('boot-cursor-hidden')) {
            cursor.classList.add('cursor-fade-out');
            document.documentElement.classList.remove('custom-cursor-enabled');
            return;
        }

        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isInsideGameViewport(mouseX, mouseY)) {
            cursor.classList.add('cursor-fade-out');
            document.documentElement.classList.remove('custom-cursor-enabled');
            targetScale = 0.65;
            return;
        }

        cursor.classList.remove('cursor-fade-out');
        targetScale = 1.0;

        if (!hasMoved) hasMoved = true;
        document.documentElement.classList.add('custom-cursor-enabled');
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
    traceBootPhase('dom-content-loaded', {
        electron: Boolean(window.electronAPI),
        devicePixelRatio: window.devicePixelRatio
    });
    startBootLongTaskDiagnostics();
    window.AudioManager = AudioManager; // Expose globally for the 3D engine/Telemeters
    preloadDoorAssets();
    initTacticalCursor();
    installStageLayoutSync();
    installHudCompass();
    window.addEventListener('resize', refreshGameLayout);

    setDebugMode(state.settings.debug);
    installAudioMixerControls();
    setAudioMixerOpen(false);
    loadAudioMixSettings();
    loadKeyBindings();
    setupControlsModal();
    refreshCharBestScores();
    refreshCareerStats();
    updateDailyOpsUI();
    updateMenuCommandStatuses();

    // Touch controls were removed with the Steam Deck-first migration; clear
    // any persisted preference so stale saves don't carry dead settings.
    localStorage.removeItem('hunker_touch_controls_enabled');

    const storedNightVision = localStorage.getItem('hunker_nightvision_enabled');
    if (storedNightVision !== null) {
        state.settings.nightVision = storedNightVision === 'true';
    } else {
        state.settings.nightVision = false;
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
        if (name.includes('tank.full') || name.includes('tank.walk') || name.includes('tank_ship')) return 'BOOTING HEAVY EXOSUIT STRENGTH BUFFERS';
        if (name.includes('eng.full') || name.includes('eng.walk') || name.includes('engineer_ship')) return 'UPLOADING NANOBOT FABRICATOR SUB-ROUTINES';

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
            '/door_bio_keyart_v2.webp',
            '/door_nuclear_keyart_v2.webp',
            '/door_cryo_keyart_v2.webp',
            '/door_alien_keyart_v2.webp',
            '/door_rust_keyart_v2.webp',
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
            PLAYER_SPRITE_LAYOUTS.SCOUT.path,
            PLAYER_SPRITE_LAYOUTS.TANK.path,
            PLAYER_SPRITE_LAYOUTS.ENGINEER.path
        ],
        audio: [
            { key: 'amb_bunker_loop', url: '/audio/vg2/amb_bunker_loop.wav' },
            { key: 'mainbg_music', url: '/audio/ost/Hunker Bunker Main Theme.mp3' },
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

    // Restore the last deployed class before initializing the selection UI.
    const savedHeroType = getSavedHeroType();
    charCards.forEach((card) => {
        const selected = card.getAttribute('data-type') === savedHeroType;
        card.classList.toggle('selected', selected);
        card.setAttribute('aria-pressed', String(selected));
    });

    // Initialize preview with the current profile class.
    const initialSelected = document.querySelector('.char-card.selected');
    const initialType = initialSelected?.getAttribute('data-type') || savedHeroType;
    setActiveAmmoCapacity(initialType, { clampExisting: true });
    if (initialSelected && heroData[initialType]) {
        warmClassIntroMedia(initialType);
        syncHeroPreview(initialType);
        updateHeroStats(initialType);
    }
    renderOperatorPolishUi();
    startHeroPreviewAnimation();
    if (mainDebugToggle) mainDebugToggle.checked = false;

    // Check if player has active save data to enable CONTINUE
    const checkHasSaveData = () => {
        try {
            const bankState = window.bankManager?.getState?.() ?? {};
            const hasBanked = (Number(bankState.tech) > 0 || Number(bankState.coin) > 0 || Number(bankState.med) > 0);
            const hasUnlocks = hasAnyUnlock(getAchievementProgress());
            const hasBlackBox = Boolean(blackBoxStore.load()?.active);
            const hasRunStats = localStorage.getItem('hb_run_stats_v1') !== null || localStorage.getItem('hb_bank_v1') !== null;
            return hasBanked || hasUnlocks || hasBlackBox || hasRunStats;
        } catch {
            return false;
        }
    };

    const updateContinueButtonState = () => {
        const hasSave = checkHasSaveData();
        if (titleContinueBtn) {
            titleContinueBtn.disabled = !hasSave;
            titleContinueBtn.classList.toggle('disabled', !hasSave);
            titleContinueBtn.classList.toggle('hidden', !hasSave);
            titleContinueBtn.style.display = hasSave ? '' : 'none';
        }
        if (titleSwitchClassBtn) {
            titleSwitchClassBtn.classList.toggle('hidden', !hasSave);
        }
        refreshTitleProfileHud(hasSave);
    };
    updateContinueButtonState();

    if (titleNewRunBtn) {
        titleNewRunBtn.addEventListener('click', () => {
            transitionFromTitleToMenu(() => {
                clearSaveData();
                blackBoxStore.clear();
                window.game?.clearBlackBoxMarker?.();
                updateContinueButtonState();
                renderRosterModal('new_game');
                const modal = document.getElementById('roster-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.setAttribute('aria-hidden', 'false');
                }
                document.getElementById('roster-callsign-input')?.focus?.();
            });
        });
    }
    if (titleContinueBtn) {
        titleContinueBtn.addEventListener('click', () => {
            if (!checkHasSaveData()) return;
            launchStandardRun({ resetBank: false, playIntro: false });
        });
    }
    if (titleSwitchClassBtn) {
        titleSwitchClassBtn.addEventListener('click', () => {
            if (!checkHasSaveData()) return;
            transitionFromTitleToMenu();
        });
    }
    if (titleAchievementsBtn) {
        titleAchievementsBtn.addEventListener('click', openAchievementsModal);
    }
    if (titleAboutBtn) {
        titleAboutBtn.addEventListener('click', () => {
            const aboutModal = document.getElementById('about-modal');
            if (aboutModal) aboutModal.classList.remove('hidden');
        });
    }
    if (titleSettingsBtn) {
        titleSettingsBtn.addEventListener('click', openSettingsModal);
    }

    // Load new settings
    state.settings.textSpeed = localStorage.getItem('hunker_text_speed') || 'normal';
    state.settings.shakeEnabled = localStorage.getItem('hunker_shake_enabled') !== 'false';
    state.settings.colorblindAssist = localStorage.getItem('hunker_colorblind_assist') === 'true';
    state.settings.difficulty = localStorage.getItem('hunker_difficulty') || 'standard';
    state.settings.commentary = localStorage.getItem(COMMENTARY_STORAGE_KEY) === 'true';
    if (mainCommentaryToggle) {
        mainCommentaryToggle.checked = state.settings.commentary;
    }

    if (state.settings.colorblindAssist) {
        document.body.classList.add('colorblind-assist');
    } else {
        document.body.classList.remove('colorblind-assist');
    }

    // Wire settings modal changes
    const settingTextSpeed = document.getElementById('setting-text-speed');
    if (settingTextSpeed) {
        settingTextSpeed.addEventListener('change', (e) => {
            state.settings.textSpeed = e.target.value;
            localStorage.setItem('hunker_text_speed', state.settings.textSpeed);
        });
    }

    const settingShakeToggle = document.getElementById('setting-shake-toggle');
    if (settingShakeToggle) {
        settingShakeToggle.addEventListener('change', (e) => {
            state.settings.shakeEnabled = e.target.checked;
            localStorage.setItem('hunker_shake_enabled', String(state.settings.shakeEnabled));
        });
    }

    const settingColorblindToggle = document.getElementById('setting-colorblind-toggle');
    if (settingColorblindToggle) {
        settingColorblindToggle.addEventListener('change', (e) => {
            state.settings.colorblindAssist = e.target.checked;
            localStorage.setItem('hunker_colorblind_assist', String(state.settings.colorblindAssist));
            if (state.settings.colorblindAssist) {
                document.body.classList.add('colorblind-assist');
            } else {
                document.body.classList.remove('colorblind-assist');
            }
        });
    }

    syncHudCompassVisibility();

    let gameInitPromise = null;

    async function initializeGame(targetType) {
        if (window.game) return window.game;
        if (gameInitPromise) return gameInitPromise;

        gameInitPromise = (async () => {
            traceBootPhase('gameplay-assets-start', { targetType });
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
                    { key: 'music_safe_ship', url: '/audio/ost/Safe Haven (Ship Sanctuary).mp3', fallbackUrl: '/audio/ost/Hunker Bunker Main Theme.mp3' },
                    { key: 'music_cryo_explore', url: '/audio/ost/Glacial Depths (Cryo Biome).mp3', fallbackUrl: '/audio/ost/Hunker Bunker Main Theme.mp3' },
                    { key: 'music_bio_explore', url: '/audio/ost/Overgrown Bio-Sphere (Bio Biome).mp3', fallbackUrl: '/audio/ost/Hunker Bunker Main Theme.mp3' },
                    { key: 'music_combat_threatened', url: '/audio/ost/Under Siege (Combat Alert).mp3', fallbackUrl: '/audio/ost/Hunker Bunker Main Theme.mp3' },
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
                    { key: 'weapon_reload2', url: '/audio/vg2/weapon_reload2.wav' },
                    { key: 'camp_fire_loop', url: '/audio/vg2/camp_fire_loop.wav' },
                    { key: 'camp_fire_douse', url: '/audio/vg2/camp_fire_douse.wav' },
                    { key: 'camp_lockdown_alarm', url: '/audio/vg2/camp_lockdown_alarm.wav' },
                    { key: 'camp_lockdown_chains', url: '/audio/vg2/camp_lockdown_chains.wav' },
                    { key: 'camp_worker_alerted', url: '/audio/generated/camp_worker_alerted.wav' },
                    { key: 'camp_worker_armed', url: '/audio/generated/camp_worker_armed.wav' },
                    { key: 'camp_worker_panicked', url: '/audio/generated/camp_worker_panicked.wav' },
                    { key: 'camp_worker_fleeing', url: '/audio/generated/camp_worker_fleeing.wav' },
                    { key: 'camp_worker_infected', url: '/audio/generated/camp_worker_infected.wav' },
                    { key: 'camp_verb_meridian', url: '/audio/generated/camp_verb_meridian.wav' },
                    { key: 'camp_verb_tallow', url: '/audio/generated/camp_verb_tallow.wav' },
                    { key: 'camp_verb_vesper', url: '/audio/generated/camp_verb_vesper.wav' },
                    { key: 'hive_eggs_hum', url: '/audio/vg2/hive_eggs_hum.wav' },
                    { key: 'hive_eggs_hatch', url: '/audio/vg2/hive_eggs_hatch.wav' },
                    { key: 'hive_spores_puff', url: '/audio/vg2/hive_spores_puff.wav' },
                    { key: 'hive_webs_sticky', url: '/audio/vg2/hive_webs_sticky.wav' },
                    { key: 'hive_queen_throne', url: '/audio/vg2/hive_queen_throne.wav' },
                    { key: 'hive_wounded_drip', url: '/audio/vg2/hive_wounded_drip.wav' },
                    { key: 'fx_scout_sprint', url: '/audio/vg2/fx_scout_sprint.wav' },
                    { key: 'fx_tank_shockwave', url: '/audio/vg2/fx_tank_shockwave.wav' },
                    { key: 'fx_engineer_turret', url: '/audio/vg2/fx_engineer_turret.wav' },
                    { key: 'fx_levelup', url: '/audio/vg2/fx_levelup.wav' },
                    { key: 'fx_achievement', url: '/audio/vg2/fx_achievement.wav' }
                ]
            };

            await AudioManager.loadAssets(gameplayManifest, (progress, itemName) => {
                if (loaderStatus && itemName) {
                    const msg = getLoadingMessageForAsset(itemName);
                    loaderStatus.innerHTML = `<div style="opacity: 1.0; animation: tactical-pulse 1s infinite ease-in-out;">> INITIALIZING TACTICAL EXOSUIT CORE... (${Math.round(progress)}%)<br><span style="font-size: var(--font-xs); color: var(--text-muted);">> ${msg}...</span></div>`;
                }
            });
            traceBootPhase('gameplay-assets-ready', {
                images: gameplayManifest.images.length,
                audio: gameplayManifest.audio.length
            });

            traceBootPhase('three-module-import-start');
            const { ThreeGame } = await import('./src/threeGame.js');
            traceBootPhase('three-module-import-ready');
            try {
                traceBootPhase('three-constructor-start', { targetType });
                window.game = new ThreeGame({
                    parent: 'game-container',
                    playerType: targetType,
                    deferPlayerSpriteLoad: true,
                    deferGameplayAtlasLoad: true,
                    bankManager,
                    dialogueManager,
                    arcManager,
                    act2Manager
                });
                window.game.setOperatorPolish?.(getSelectedPolish().color);
                window.game.nightVision = state.settings.nightVision;
                traceBootPhase('three-constructor-ready', {
                    pixelRatio: window.game.renderer?.getPixelRatio?.(),
                    profile: window.game.performanceProfile
                });
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
            traceBootPhase('game-initialized');

            return window.game;
        })();

        return gameInitPromise;
    }

    const maxLogs = 5;
    const logs = ['CONNECTING TO TACTICAL NETWORK...'];

    const renderLoaderLogs = (newLog = null) => {
        if (!loaderStatus) return;
        if (newLog && !logs.includes(newLog)) {
            logs.push(newLog);
            if (logs.length > maxLogs) {
                logs.shift();
            }
        }
        loaderStatus.innerHTML = logs.map((log, idx) => {
            const distance = logs.length - 1 - idx;
            const opacities = [1.0, 0.65, 0.4, 0.2, 0.08];
            const opacity = opacities[distance] ?? 0.05;
            return `<div style="opacity: ${opacity}; line-height: 1.4; transition: opacity 0.15s ease;">${log}</div>`;
        }).join('');
    };

    renderLoaderLogs();

    // 1. Refresh Steam bridge & check backend health
    traceBootPhase('steam-identity-check-start');
    renderLoaderLogs('> VERIFYING STEAMWORKS INTEGRATION...');
    if (loaderBar) loaderBar.style.width = '15%';
    const steamStatus = await refreshSteamBridgeStatus({ waitForBackend: false }).catch((err) => {
        renderLoaderLogs(`> STEAM CHECK ERROR: ${err?.message ?? 'UNKNOWN ERROR'}`);
        console.error('[steam] loading-screen verification failed:', err);
        return null;
    });
    traceBootPhase('steam-identity-check-ready', {
        active: Boolean(steamStatus?.info?.active),
        reason: steamStatus?.info?.reason ?? null,
        backend: 'async'
    });
    if (steamStatus?.info?.active) {
        renderLoaderLogs(`> STEAM LINKED: ${steamStatus.info.persona ?? 'CONNECTED'}`);
    } else {
        const reason = steamStatus?.info?.reason ?? steamStatus?.health?.reason ?? 'OFFLINE';
        renderLoaderLogs(`> STEAM DEGRADED: ${String(reason).toUpperCase()} — CONTINUING`);
    }

    // 2. Load core audio & image manifest
    traceBootPhase('core-assets-start', {
        images: manifest.images.length,
        audio: manifest.audio.length
    });
    await AudioManager.loadAssets(manifest, (progress, itemName) => {
        const scaledProgress = 15 + Math.round(progress * 0.45);
        if (loaderBar) loaderBar.style.width = `${scaledProgress}%`;
        if (itemName) {
            const msg = getLoadingMessageForAsset(itemName);
            renderLoaderLogs(`> ${msg}...`);
        }
    });
    traceBootPhase('core-assets-ready');

    renderLoaderLogs('> BOOTING TACTICAL WEBGL CORE...');
    if (loaderBar) loaderBar.style.width = '65%';

    let bootInitializing = false;
    const autoTriggerBoot = async () => {
        if (bootInitializing) return;
        bootInitializing = true;
        traceBootPhase('boot-triggered', { initialType });

        try {
            await initializeGame(initialType);
            traceBootPhase('airlock-start');
            if (loaderBar) loaderBar.style.width = '100%';
            renderLoaderLogs('> ALL ASSETS LOADED — OPENING AIRLOCK...');
        } catch (err) {
            console.error('Initialization failed:', err);
            bootInitializing = false;
            if (loaderStatus) {
                loaderStatus.innerHTML = `<div style="opacity: 1.0; color: var(--accent-secondary); animation: tactical-pulse 2s infinite ease-in-out;">[ SYSTEM INITIALIZATION ERROR — RETRYING... ]</div>`;
            }
            return;
        }

        setTimeout(() => {
            triggerDoorTransition(
                () => {
                    if (loadingScreen) loadingScreen.classList.add('hidden');
                    if (splash) splash.classList.add('hidden');
                },
                async () => {
                    // Play DoorIntro cutscene against solid pitch-black background.
                    // The second door transition triggers WHILE the video is playing (at ~70% mark)
                    // so the heavy blast doors slam shut directly over the active video.
                    await new Promise((resolve) => {
                        let doorStarted = false;
                        const triggerClosingDoors = () => {
                            if (doorStarted) return;
                            doorStarted = true;
                            triggerDoorTransition(
                                () => {
                                    if (splash) splash.classList.remove('hidden');
                                    setAppPhase('splash');
                                    window.game?.setLoadingPaused?.(false);
                                    transitionToMenuMusic();
                                    finishBootDiagnostics();
                                },
                                () => {
                                    document.documentElement.classList.remove(
                                        'boot-cursor-hidden',
                                        'custom-cursor-enabled'
                                    );
                                    ensureControllerMenuFocus();
                                },
                                'base'
                            );
                            resolve();
                        };

                        playCutsceneVideo('DoorIntro', { onDoorCutoff: triggerClosingDoors })
                            .then(triggerClosingDoors)
                            .catch(async () => {
                                await playCutsceneVideo('scout-intro').catch(() => null);
                                triggerClosingDoors();
                            });
                    });
                },
                'base'
            );
        }, 180);
    };

    window.HunkerTriggerBoot = autoTriggerBoot;
    if (pendingSteamInputBoot) {
        pendingSteamInputBoot = false;
    }
    void autoTriggerBoot();
});

setDebugMode(state.settings.debug);

// ── Sprint 19 Wave 3 threat warnings and Queen hallucinations ──
window.addEventListener('queen-hallucination', (event) => {
    const intensity = event?.detail?.intensity ?? 0.5;
    document.body.classList.add('queen-hallucination-pulse');
    const speed = (0.05 + (1.0 - intensity) * 0.15).toFixed(2);
    document.body.style.setProperty('--hallucination-speed', `${speed}s`);
    window.setTimeout(() => {
        document.body.classList.remove('queen-hallucination-pulse');
    }, 300);
});

window.addEventListener('queen-fight-started', () => {
    showDeveloperCommentary('queen_fight');
    recordSteamTimelineEvent('queen_fight', 'Queen Fight Started', 'Specimen-0047 entered direct combat.', {
        icon: 'queen',
        priority: 4,
        durationSeconds: 12
    });
});

window.addEventListener('hunter-pair-spawned', () => {
    showTacticalNotificationToast({
        title: 'WARNING: HUNTER SHADOWS INBOUND',
        status: '> BRIGGS COVERT TEAM DEPLOYED<br>> SCANNING PATROLS DETECTED',
        duration: 3800
    });
    AudioManager.play('camp_lockdown_alarm', { volume: 0.5, playbackRate: 1.2 });
    document.body.classList.add('hud-alert-flash');
    setTimeout(() => document.body.classList.remove('hud-alert-flash'), 1200);
});

window.addEventListener('lander-deployed', () => {
    showTacticalNotificationToast({
        title: 'CRITICAL ALERT: EXTERMINATION LANDER INBOUND',
        status: '> MOTHERSHIP EXTERMINATOR DEPLOYED<br>> HULL INTEGRITY TRACKING LOCKED',
        duration: 4800
    });
    AudioManager.play('camp_lockdown_alarm', { volume: 0.65, playbackRate: 0.85 });
    document.body.classList.add('hud-critical-flash');
    setTimeout(() => document.body.classList.remove('hud-critical-flash'), 2000);
});

// ── Desktop shell (Electron/Steam) bridge ─────────────────────
// Present only inside the desktop wrapper; the web build never defines
// electronAPI. Achievements ride the existing wave-2 event contract.
const steamDebugStatus = document.getElementById('steam-debug-status');
const bootDiagnostics = [];
let bootDiagnosticOrigin = null;
let bootLongTaskObserver = null;
let bootLongTasks = [];
let lastSteamIdentityLogKey = null;
let lastSteamBackendLogKey = null;

function traceBootPhase(phase, details = null) {
    const now = performance.now();
    if (bootDiagnosticOrigin === null) bootDiagnosticOrigin = now;
    const entry = {
        phase,
        elapsedMs: Math.round((now - bootDiagnosticOrigin) * 10) / 10,
        details
    };
    bootDiagnostics.push(entry);
    debugLog.info('BOOT', `+${entry.elapsedMs.toFixed(1)}ms ${phase}`, details ?? undefined);
    try {
        performance.mark(`hb:${phase}`);
    } catch {
        // Performance marks are diagnostic-only.
    }
    return entry;
}

function startBootLongTaskDiagnostics() {
    if (typeof PerformanceObserver === 'undefined' || bootLongTaskObserver) return;
    try {
        bootLongTaskObserver = new PerformanceObserver((list) => {
            for (const task of list.getEntries()) {
                bootLongTasks.push({
                    durationMs: Math.round(task.duration),
                    startMs: Math.round(task.startTime)
                });
            }
        });
        bootLongTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
        bootLongTaskObserver = null;
    }
}

function finishBootDiagnostics() {
    if (bootLongTasks.length > 0) {
        const totalMs = bootLongTasks.reduce((sum, task) => sum + task.durationMs, 0);
        const slowest = [...bootLongTasks].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);
        debugLog.warn('PERF', `Boot contained ${bootLongTasks.length} long tasks (${totalMs}ms total)`, { slowest });
    }
    traceBootPhase('boot-ready', {
        renderer: window.game?.renderer?.info?.render ?? null,
        pixelRatio: window.game?.renderer?.getPixelRatio?.() ?? null
    });
    bootLongTaskObserver?.disconnect();
    bootLongTaskObserver = null;
    bootLongTasks = [];
}

window.__hbBootDiagnostics = bootDiagnostics;

function setSteamDebugStatus(text, state = 'unknown') {
    if (!steamDebugStatus) return;
    steamDebugStatus.textContent = text;
    steamDebugStatus.dataset.state = state;
}

function formatSteamStatus(info, health) {
    const steamLine = info?.active
        ? `STEAM: ${info.persona ?? info.steamId64 ?? 'LINKED'}`
        : 'STEAM: OFFLINE';
    let backendLine = 'BACKEND: OFF';
    if (health?.pending) {
        backendLine = 'BACKEND: CHECKING';
    } else if (health?.ok) {
        backendLine = health.steam?.authConfigured ? 'BACKEND: AUTH READY' : 'BACKEND: DEV';
    } else if (health?.reason) {
        backendLine = `BACKEND: ${String(health.reason).replace(/^steam_backend_/, '').toUpperCase()}`;
    }
    const cloud = info?.cloud;
    const cloudLine = cloud?.available
        ? `CLOUD: ${cloud.enabledForAccount && cloud.enabledForApp ? 'READY' : 'OFF'}`
        : 'CLOUD: UNKNOWN';
    return `${steamLine}\n${backendLine}\n${cloudLine}`;
}

async function refreshSteamBridgeStatus({ waitForBackend = true } = {}) {
    if (!window.electronAPI) {
        console.log('[STEAM] Environment: Web browser (Electron API absent)');
        setSteamDebugStatus('STEAM: WEB BUILD\nBACKEND: OFF', 'offline');
        return null;
    }

    console.debug('[STEAM] Verifying Steamworks integration...');

    const identityRequest = window.electronAPI.getSteamIdentity
        ? window.electronAPI.getSteamIdentity()
        : window.electronAPI.getSteamInfo?.();
    const identityTimeout = new Promise((resolve) => window.setTimeout(
        () => resolve({ active: false, reason: 'identity_timeout' }),
        2500
    ));
    const info = await Promise.race([
        Promise.resolve(identityRequest).catch((err) => ({
            ok: false,
            active: false,
            reason: 'identity_call_error',
            message: err?.message ?? String(err)
        })),
        identityTimeout
    ]);

    const healthPromise = window.electronAPI.getSteamBackendHealth
        ? window.electronAPI.getSteamBackendHealth().catch((err) => ({
            ok: false,
            reason: 'health_call_error',
            message: err?.message ?? String(err)
        }))
        : Promise.resolve({ ok: false, reason: 'health_unavailable' });
    const health = waitForBackend
        ? await healthPromise
        : { ok: false, pending: true, reason: 'health_pending' };

    const identityLogKey = JSON.stringify({
        active: Boolean(info?.active),
        persona: info?.persona ?? null,
        appId: info?.appId ?? null,
        steamId64: info?.steamId64 ?? null,
        reason: info?.reason ?? null,
        cloud: info?.cloud ?? null,
        isSteamDeck: Boolean(info?.isSteamDeck)
    });
    if (identityLogKey !== lastSteamIdentityLogKey) {
        lastSteamIdentityLogKey = identityLogKey;
        if (info?.active) {
            console.info(`[STEAM] Steamworks ACTIVE — Account: ${info.persona ?? 'Unknown'} (AppID: ${info.appId}, SteamID64: ${info.steamId64 ?? 'N/A'})`);
            if (info.isSteamDeck) console.info('[STEAM] Hardware: Steam Deck detected');
            if (info.cloud?.available) console.info(`[STEAM] Cloud Sync: Available (App: ${info.cloud.enabledForApp}, Account: ${info.cloud.enabledForAccount})`);
        } else {
            console.warn(`[STEAM] Steamworks INACTIVE — Reason: ${info?.reason ?? 'unavailable'}${info?.message ? ` (${info.message})` : ''}`);
        }
    }

    const logBackendStatus = (backendHealth) => {
        const backendLogKey = JSON.stringify({
            pending: Boolean(backendHealth?.pending),
            ok: Boolean(backendHealth?.ok),
            authConfigured: Boolean(backendHealth?.steam?.authConfigured),
            reason: backendHealth?.reason ?? null
        });
        if (backendLogKey === lastSteamBackendLogKey) return;
        lastSteamBackendLogKey = backendLogKey;
        if (backendHealth?.pending) {
            console.debug('[STEAM] Backend Service: checking asynchronously (does not gate Steam identity)');
        } else if (backendHealth?.ok) {
            console.info(`[STEAM] Backend Service: ACTIVE (Auth Configured: ${backendHealth.steam?.authConfigured ?? false})`);
        } else {
            console.warn(`[STEAM] Backend Service: UNREACHABLE — Reason: ${backendHealth?.reason ?? 'offline'}${backendHealth?.message ? ` (${backendHealth.message})` : ''}`);
        }
    };
    logBackendStatus(health);

    const state = info?.active && health?.steam?.authConfigured
        ? 'ready'
        : (info?.active || health?.ok ? 'partial' : 'offline');
    setSteamDebugStatus(formatSteamStatus(info, health), state);
    updateSteamAccountBadges(info);

    if (!waitForBackend) {
        void healthPromise.then((resolvedHealth) => {
            const resolvedState = info?.active && resolvedHealth?.steam?.authConfigured
                ? 'ready'
                : (info?.active || resolvedHealth?.ok ? 'partial' : 'offline');
            setSteamDebugStatus(formatSteamStatus(info, resolvedHealth), resolvedState);
            logBackendStatus(resolvedHealth);
        });
    }
    return { info, health };
}

window.refreshSteamBridgeStatus = refreshSteamBridgeStatus;

function updateSteamAccountBadges(info) {
    const persona = info?.persona || (info?.active ? 'STEAM USER' : 'WEB AGENT');
    const isOnline = Boolean(info?.active);
    const statusText = info?.isSteamDeck ? 'STEAM DECK · ONLINE' : (isOnline ? 'STEAM CONNECTED' : 'WEB DEMO MODE');

    const splashPersona = document.getElementById('splash-steam-persona');
    const splashStatus = document.getElementById('splash-steam-status');
    const menuPersona = document.getElementById('menu-steam-persona');
    const menuStatus = document.getElementById('menu-steam-status');
    const splashBadge = document.getElementById('splash-steam-badge');
    const menuBadge = document.getElementById('menu-steam-badge');

    if (splashPersona) splashPersona.textContent = persona;
    if (splashStatus) splashStatus.textContent = statusText;
    if (menuPersona) menuPersona.textContent = persona;
    if (menuStatus) menuStatus.textContent = statusText;

    if (splashBadge) splashBadge.classList.toggle('steam-account-badge--active', isOnline);
    if (menuBadge) menuBadge.classList.toggle('steam-account-badge--active', isOnline);
}



function handleSteamBadgeClick() {
    window.AudioManager?.play?.('ui_click', { volume: 0.5 });
    if (window.electronAPI?.openSteamOverlayToUrl) {
        window.electronAPI.openSteamOverlayToUrl('https://steamcommunity.com/my');
    } else {
        openSteamVaultModal();
    }
}

document.getElementById('splash-steam-badge')?.addEventListener('click', handleSteamBadgeClick);
document.getElementById('menu-steam-badge')?.addEventListener('click', handleSteamBadgeClick);

// Achievement keys that also grant a distinct Steam Inventory cosmetic on
// top of the local achievement unlock/Steam stat. The achievements engine
// (src/achievements.js) guarantees each key only ever unlocks once per
// save, so this never needs its own client-side one-off guard — the
// backend's requestId (ach-<key>-<steamId>) is idempotent regardless.
const STEAM_ACHIEVEMENT_ITEM_MAP = Object.freeze({
    slay_the_queen: 'achievement:slay_the_queen',
    archivist: 'achievement:archivist'
});

window.addEventListener('achievement-unlocked', (event) => {
    const key = event?.detail?.key;
    if (!key) return;
    const polishGrant = unlockMilestonePolish(`achievement:${key}`);
    if (!polishGrant.unlocked) return;
    renderOperatorPolishUi();
    showBiomePrompt(`> SUIT POLISH UNLOCKED: ${OPERATOR_POLISHES[polishGrant.id].name}`);
});

function grantWorldMilestonePolish(milestone) {
    const polishGrant = unlockMilestonePolish(milestone);
    if (!polishGrant.unlocked) return;
    renderOperatorPolishUi();
    showBiomePrompt(`> SUIT POLISH UNLOCKED: ${OPERATOR_POLISHES[polishGrant.id].name}`);
}

window.addEventListener('black-box-recovered', () => grantWorldMilestonePolish('black-box-recovered'));
window.addEventListener('act2-milestone', (event) => {
    const key = event?.detail?.key;
    if (key) grantWorldMilestonePolish(`act2:${key}`);
});

if (window.electronAPI) {
    window.addEventListener('achievement-unlocked', (event) => {
        const key = event?.detail?.key;
        if (!key) return;
        window.electronAPI.unlockAchievement(key);
        showDeveloperCommentary('achievement');
        recordSteamTimelineEvent('achievement', 'Achievement Unlocked', event?.detail?.title ?? key, {
            icon: 'achievement',
            priority: 2,
            durationSeconds: 6
        });

        const milestone = STEAM_ACHIEVEMENT_ITEM_MAP[key];
        if (milestone && window.electronAPI?.requestSteamMilestoneGrant) {
            window.electronAPI.requestSteamMilestoneGrant(milestone).then((result) => {
                (result?.granted ?? []).forEach((item) => showSteamDropToast(item.itemdefid, item.quantity));
            }).catch((err) => {
                console.log(`[steam] achievement item grant skipped: ${err?.message ?? err}`);
            });
        }
    });
    // Boss/queen defeat: a guaranteed free Deep Relic Cache tied to a
    // combat-sourced run milestone rather than a narrative branch choice.
    // runKey only needs to be unique per run, not globally meaningful.
    window.addEventListener('act2-milestone', (event) => {
        if (event?.detail?.key !== 'queenKilled' || !window.electronAPI?.requestSteamMilestoneGrant) return;
        if (event.detail.combat !== true && event.detail.source !== 'queen-fight') return;
        const runKey = `${activeRunSeed ?? 'no-seed'}:${runStartTime}`;
        showDeveloperCommentary('queen_killed');
        recordSteamTimelineEvent('queen_killed', 'Queen Defeated', 'Specimen-0047 was defeated in combat.', {
            icon: 'queen',
            priority: 5,
            durationSeconds: 10
        });
        window.electronAPI.requestSteamMilestoneGrant('boss_kill', runKey).then((result) => {
            (result?.granted ?? []).forEach((item) => showSteamDropToast(item.itemdefid, item.quantity));
        }).catch((err) => {
            console.log(`[steam] boss-kill grant skipped: ${err?.message ?? err}`);
        });
    });
    // World-loot roll: ties the free-drop economy to genuine in-world loot
    // interaction (camp support, etc.) instead of a blind timer. The 15%
    // client-side gate keeps this from firing on every single local
    // salvage-cache pickup, which happens often.
    window.addEventListener('salvage-cache-opened', () => {
        if (Math.random() >= 0.15 || !window.electronAPI?.triggerSteamPlaytimeDrop) return;
        window.electronAPI.triggerSteamPlaytimeDrop().then((result) => {
            if (result?.ok) {
                (result.granted ?? []).forEach((item) => showSteamDropToast(item.itemdefid, item.quantity));
            }
        }).catch((err) => {
            console.log(`[steam] world-loot roll skipped: ${err?.message ?? err}`);
        });
    });
    window.addEventListener(STEAM_RUN_SCORE_FINALIZED_EVENT, (event) => {
        const payload = event?.detail;
        if (!payload || !window.electronAPI?.submitSteamRunScore) return;
        showDeveloperCommentary('leaderboard');
        recordSteamTimelineEvent('run_end', payload.outcome === 'victory' ? 'Extraction Complete' : 'Run Ended', `Score ${payload.score ?? 0} submitted for trusted ranking.`, {
            icon: payload.outcome === 'victory' ? 'victory' : 'run_end',
            priority: payload.outcome === 'victory' ? 4 : 2,
            durationSeconds: 10
        });

        window.electronAPI.submitSteamRunScore(payload).then((result) => {
            if (result?.ok) {
                console.log(`[steam] leaderboard payload accepted (${payload.runId})`);
                renderSteamMilestoneGrants(result.milestoneGrants);
            } else if (!['steam_auth_unavailable', 'steam_backend_unreachable'].includes(result?.reason)) {
                console.log(`[steam] leaderboard submit skipped: ${result?.reason ?? 'unknown'}`);
            }
        }).catch((err) => {
            console.log(`[steam] leaderboard submit failed: ${err?.message ?? err}`);
        });
    });
    refreshSteamBridgeStatus().then(({ info } = {}) => {
        if (info?.active) console.log(`[steam] linked as ${info.persona} (app ${info.appId})`);
    }).catch(() => {});
    window.setInterval(() => {
        void refreshSteamBridgeStatus();
    }, 60000);

    loadVaultData().catch(() => null);
} else {
    setSteamDebugStatus('STEAM: WEB BUILD\nBACKEND: OFF', 'offline');
}

// Initialize Steam Vault UI in all environments
initSteamVaultUI();

// Keep the title art alive at rest while making pointer movement feel like a
// reflection travelling across damp metal. Motion is deliberately tiny so the
// menu remains stable and the effect also works with the custom game cursor.
const splashHero = document.getElementById('splash');
if (splashHero && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    let splashHeroFrame = 0;
    splashHero.addEventListener('pointermove', (event) => {
        if (splashHeroFrame) cancelAnimationFrame(splashHeroFrame);
        splashHeroFrame = requestAnimationFrame(() => {
            const bounds = splashHero.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
            const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
            splashHero.style.setProperty('--hero-shift-x', `${(x - 0.5) * -8}px`);
            splashHero.style.setProperty('--hero-shift-y', `${(y - 0.5) * -5}px`);
            splashHero.style.setProperty('--hero-light-x', `${x * 100}%`);
            splashHero.style.setProperty('--hero-light-y', `${y * 100}%`);
            splashHeroFrame = 0;
        });
    }, { passive: true });

    splashHero.addEventListener('pointerleave', () => {
        splashHero.style.setProperty('--hero-shift-x', '0px');
        splashHero.style.setProperty('--hero-shift-y', '0px');
        splashHero.style.setProperty('--hero-light-x', '64%');
        splashHero.style.setProperty('--hero-light-y', '48%');
    });
}

// ── Steam Vault & Leaderboard Frontend implementations decoupled to: ──
// - src/steamVaultUi.js
// - src/leaderboardUi.js
