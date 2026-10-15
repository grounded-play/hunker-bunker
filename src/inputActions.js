// Semantic action routing per docs/steam-deck-first-display-and-input-spec.md.
// The game asks for actions inside an active action set (menu / gameplay /
// archive); the physical source — Steam Input natively, or a browser Gamepad
// snapshot from mapBrowserGamepad — stays behind this layer. Names mirror
// steam/steam_input_manifest.vdf.

export const ACTION_SETS = Object.freeze({
    MENU: 'menu',
    GAMEPLAY: 'gameplay',
    ARCHIVE: 'archive'
});

// Ordered from the most specific/topmost transient surface to the broadest
// application screens. getControllerFocusRoot() selects the first visible
// entry, so child reveals and scene viewers must precede their parent modal.
// Keep this list as the single runtime/test inventory for full-controller
// menu coverage; see docs/menu-input-navigation-contract.md.
export const MENU_FOCUS_ROOT_IDS = Object.freeze([
    'select-picker-overlay',
    'virtual-keyboard-overlay',
    'player-chat-modal',
    'progression-reward-overlay',
    'vault-reveal-overlay',
    // The Armory's slot picker opened from the Foundry or the hero screen
    // (Sprint 51); it sits above both.
    'loadout-picker-modal',
    'mature-audit-scene-viewer',
    'progression-scene-viewer',
    'qa-nexus-modal',
    'wanderer-encounter-modal',
    'hb-debug-console',
    'dev-console-modal',
    'confirm-modal',
    'reset-save-confirm-modal',
    'quit-confirm-modal',
    'audio-mixer-popup',
    'save-data-popup',
    'crosshair-color-popup',
    'language-select-popup',
    'controls-popup',
    'commentary-list-modal',
    // Opened from Settings and drawn above it, so they must win focus over it.
    'mature-content-audit-modal',
    'progression-walkthrough-modal',
    'settings-popup',
    'about-modal',
    'archive-log-detail-modal',
    'archive-modal',
    'codex-detail-modal',
    'codex-modal',
    'achievements-modal',
    'foundry-hub-modal',
    'fabrication-modal',
    'elevator-choice-modal',
    'archive-sims-modal',
    'lore-modal',
    'season-pass-modal',
    'steam-vault-modal',
    'player-trade-modal',
    'multiplayer-modal',
    'armory-picker-modal',
    'operator-polish-modal',
    'tactical-map-modal',
    'base-turret-modal',
    'demo-end-modal',
    'game-over-modal',
    'expedition-event-modal',
    'camp-choice-modal',
    'field-workbench-modal',
    'camp-services-modal',
    'leader-conversation-modal',
    'npc-dialogue-modal',
    'mothership-dialogue',
    'console-terminal-modal',
    'o2-generator-modal',
    'snail-encounter-modal',
    'armory-screen',
    'rgb-root',
    'splash',
    'menu'
]);

const VALID_SETS = new Set(Object.values(ACTION_SETS));

export function actionSetForAppPhase(phase) {
    if (phase === 'gameplay') return ACTION_SETS.GAMEPLAY;
    if (phase === 'archive') return ACTION_SETS.ARCHIVE;
    return ACTION_SETS.MENU;
}

export function menuKeyboardDirection(code) {
    if (['KeyW', 'KeyA', 'ArrowUp', 'ArrowLeft'].includes(code)) return -1;
    if (['KeyS', 'KeyD', 'ArrowDown', 'ArrowRight'].includes(code)) return 1;
    return 0;
}

export function wrapMenuIndex(index, delta, length) {
    if (!Number.isInteger(length) || length < 1) return 0;
    const current = Number.isInteger(index) && index >= 0 ? index : 0;
    return (current + delta + length) % length;
}

/**
 * Choose the next focus target in the requested visual direction, the way a
 * console or TV focus engine does (and the browsers' spatial-navigation spec):
 *
 * 1. A candidate must lie past the current control in that direction: its
 *    near edge beyond the current control's middle, so a control on the same
 *    row is never "below" (nav map 2026-10-14, F12). One that is not aligned
 *    (see 2) must lie fully past it.
 * 2. Candidates that overlap the current control across the movement axis
 *    (the "beam": same row for left / right, same column for up / down) beat
 *    any diagonal one, however close.
 * 3. Then the nearest wins, scored like the CSS spatial-navigation spec:
 *    closest-edge distance plus the gap along the axis plus the sideways gap
 *    weighted 30x on left / right moves and 2x on up / down, so "right"
 *    means "on this row" far more than "a bit to the right, rows away".
 *
 * With nothing in that direction focus stays put (returns currentIndex), so a
 * press at the edge of a screen never teleports across it. Pass
 * `{ wrap: true }` to jump to the far edge instead (long lists may opt in).
 */
export function spatialFocusIndex(rects = [], currentIndex = 0, direction = 'down', { wrap = false } = {}) {
    if (!Array.isArray(rects) || rects.length === 0) return 0;
    const current = rects[currentIndex] ?? rects[0];
    const vertical = direction === 'up' || direction === 'down';
    const sign = direction === 'down' || direction === 'right' ? 1 : -1;
    if (!current || !['up', 'down', 'left', 'right'].includes(direction)) {
        return Math.max(0, Math.min(currentIndex, rects.length - 1));
    }
    const box = (rect) => {
        const left = Number(rect.left) || 0;
        const top = Number(rect.top) || 0;
        const width = Number(rect.width) || 0;
        const height = Number(rect.height) || 0;
        // Along the movement axis: start / end; across it: lo / hi.
        return vertical
            ? { start: top, end: top + height, mid: top + height / 2, lo: left, hi: left + width, cross: left + width / 2 }
            : { start: left, end: left + width, mid: left + width / 2, lo: top, hi: top + height, cross: top + height / 2 };
    };
    const from = box(current);

    const candidates = [];
    rects.forEach((rect, index) => {
        if (index === currentIndex || !rect) return;
        const to = box(rect);
        // Past the current control: the candidate's near edge lies beyond the
        // current control's middle (and its middle beyond ours).
        const ahead = sign > 0
            ? to.start >= from.mid - 1 && to.mid > from.mid + 1
            : to.end <= from.mid + 1 && to.mid < from.mid - 1;
        if (!ahead) return;
        const gap = Math.max(0, sign > 0 ? to.start - from.end : from.start - to.end);
        const inBeam = Math.min(from.hi, to.hi) - Math.max(from.lo, to.lo) > 0;
        const offset = Math.abs(to.cross - from.cross);
        // Off the beam, a candidate must lie fully past the current control,
        // not merely overlap it on the movement axis.
        if (!inBeam && gap <= 0) return;
        const sideGap = inBeam ? 0 : Math.max(to.lo - from.hi, from.lo - to.hi, 0);
        const score = Math.hypot(gap, sideGap) + gap + sideGap * (vertical ? 2 : 30);
        candidates.push({ index, inBeam, gap, offset, score });
    });

    if (candidates.length > 0) {
        candidates.sort((a, b) => {
            if (a.inBeam !== b.inBeam) return a.inBeam ? -1 : 1;
            if (a.inBeam) return (a.gap - b.gap) || (a.offset - b.offset) || (a.index - b.index);
            return (a.score - b.score) || (a.offset - b.offset) || (a.index - b.index);
        });
        return candidates[0].index;
    }

    if (!wrap) return currentIndex;
    // Wrap: the control at the far edge, nearest the current row / column.
    const wrapped = rects.map((rect, index) => {
        const to = box(rect);
        return { index, edge: to.mid * sign, offset: Math.abs(to.cross - from.cross) };
    }).filter((candidate) => candidate.index !== currentIndex);
    wrapped.sort((a, b) => a.edge - b.edge || a.offset - b.offset || a.index - b.index);
    return wrapped[0]?.index ?? currentIndex;
}

export function hasControllerContinuePress(actions = {}) {
    return Boolean(
        actions.confirm || actions.back || actions.pause
        || actions.tabLeft || actions.tabRight
        || actions.up || actions.down || actions.left || actions.right
        || actions.menuConfirm || actions.menuBack
        || actions.menuTabLeft || actions.menuTabRight
        || actions.menuUp || actions.menuDown || actions.menuLeft || actions.menuRight
        || actions.interact || actions.dash || actions.reload || actions.ability
        || actions.fire || actions.scan || actions.toggleMap
    );
}

export function shouldPreferBrowserGamepad({
    nativeAvailable = false,
    nativeControllerCount = 0,
    nativeAnyInput = false,
    browserAnyInput = false,
    browserEngaged = false
} = {}) {
    if (!nativeAvailable || nativeControllerCount < 1) return true;
    if (nativeAnyInput) return false;
    // A connected Steam Input device with a missing/unpublished action
    // manifest reports a controller forever, but never reports an action.
    // Let Chromium's standard Gamepad mapping rescue that case. Keep the
    // fallback for one neutral frame so edge-triggered menu actions release.
    return browserAnyInput || (browserEngaged && !browserAnyInput);
}

const NEUTRAL_PAD = Object.freeze({
    move: Object.freeze({ x: 0, y: 0 }),
    fire: false,
    interact: false,
    reload: false,
    melee: false,
    ability: false,
    dash: false,
    scan: false,
    tacticalPing: false,
    quickCommand: false,
    cycleInteract: false,
    pause: false,
    toggleMap: false,
    menuUp: false,
    menuDown: false,
    menuLeft: false,
    menuRight: false,
    menuConfirm: false,
    menuBack: false,
    menuTabLeft: false,
    menuTabRight: false
});

// Holding a direction in a menu (stick or D-pad) moves once, then repeats
// after this delay at this interval, like a console list. Keyboard arrows get
// the OS key repeat instead.
export const MENU_REPEAT_DELAY_MS = 380;
export const MENU_REPEAT_INTERVAL_MS = 110;

export function createActionRouter({ now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) } = {}) {
    let activeSet = ACTION_SETS.MENU;
    let previous = {};
    let heldSince = {};
    let lastRepeat = {};

    // Rising-edge detector for discrete presses so a held button fires once.
    function edge(name, level) {
        const fired = Boolean(level) && !previous[name];
        previous[name] = Boolean(level);
        return fired;
    }

    // A direction fires on press, then repeats while held.
    function repeating(name, level) {
        if (!level) {
            previous[name] = false;
            delete heldSince[name];
            delete lastRepeat[name];
            return false;
        }
        const at = now();
        if (!previous[name]) {
            previous[name] = true;
            heldSince[name] = at;
            lastRepeat[name] = at;
            return true;
        }
        if (at - heldSince[name] < MENU_REPEAT_DELAY_MS) return false;
        const sincePress = at - heldSince[name];
        if (lastRepeat[name] === heldSince[name] || at - lastRepeat[name] >= MENU_REPEAT_INTERVAL_MS) {
            lastRepeat[name] = at;
            return sincePress >= MENU_REPEAT_DELAY_MS;
        }
        return false;
    }

    function deriveMenuActions(pad) {
        return {
            up: repeating('menu_up', pad.menuUp),
            down: repeating('menu_down', pad.menuDown),
            left: repeating('menu_left', pad.menuLeft),
            right: repeating('menu_right', pad.menuRight),
            // `fire` is RT in the browser fallback. Native layouts bind RT to
            // menu_confirm directly; accepting either keeps the semantics
            // identical while stale Steam layouts are being replaced.
            confirm: edge('menu_confirm', pad.menuConfirm || pad.fire),
            back: edge('menu_back', pad.menuBack),
            // Dedicated bumper fields (kept separate from scan/fire/menuBack,
            // which share buttons with each other in the browser fallback).
            tabLeft: edge('menu_tab_left', pad.menuTabLeft),
            tabRight: edge('menu_tab_right', pad.menuTabRight),
            pause: edge('menu_pause', pad.pause),
            pointer: pad.pointer ?? { x: 0, y: 0 },
            // handleSteamMenuInput (main.js) reads these to drive the right-stick
            // cursor, with its own deadzone against resting-stick drift. Forward
            // them through untouched -- deriveMenuActions used to hardcode
            // pointer to {0,0} specifically to defeat that cursor, but the
            // deadzone now lives in the consumer instead.
            camera: pad.camera ?? { x: 0, y: 0 },
            move: pad.move ?? { x: 0, y: 0 },
            cameraDelta: pad.cameraDelta ?? { x: 0, y: 0 }
        };
    }

    function deriveArchiveActions(pad) {
        const stickX = pad.move?.x ?? 0;
        const stickY = pad.move?.y ?? 0;
        const dpadX = (pad.menuRight ? 1 : 0) - (pad.menuLeft ? 1 : 0);
        const dpadY = (pad.menuDown ? 1 : 0) - (pad.menuUp ? 1 : 0);
        return {
            focus: {
                x: stickX || dpadX,
                y: stickY || dpadY
            },
            confirm: edge('archive_confirm', pad.interact || pad.menuConfirm),
            inventory: edge('archive_inventory', pad.ability),
            back: edge('archive_back', pad.menuBack),
            // Reveal is a hold, not a press.
            reveal: Boolean(pad.reload),
            pause: edge('archive_pause', pad.pause)
        };
    }

    return {
        getActionSet() {
            return activeSet;
        },
        setActionSet(name) {
            if (!VALID_SETS.has(name) || name === activeSet) return;
            activeSet = name;
            previous = {};
            heldSince = {};
            lastRepeat = {};
        },
        deriveActions(padSnapshot) {
            const pad = padSnapshot ?? NEUTRAL_PAD;
            if (activeSet === ACTION_SETS.GAMEPLAY) {
                // Field-play snapshots are already semantic (move/fire/...).
                return { set: activeSet, actions: pad };
            }
            const actions = activeSet === ACTION_SETS.ARCHIVE
                ? deriveArchiveActions(pad)
                : deriveMenuActions(pad);
            return { set: activeSet, actions };
        }
    };
}

/**
 * Real pointer movement has to hand the UI back to mouse mode.
 *
 * The UI used to leave controller mode only on keydown and pointerdown. On a
 * Steam Deck the trackpad MOVES the pointer without clicking, so once anything
 * had been done with the stick or buttons, sliding the trackpad no longer moved
 * the selection -- the cursor drifted over controls that never highlighted.
 *
 * Touch is excluded because the Deck's touchscreen emits synthetic moves while
 * a finger rests on it, and the jitter threshold stops a controller-driven or
 * sub-pixel event from flapping the mode back and forth.
 */
export const POINTER_MODE_MOVEMENT_THRESHOLD_PX = 6;

export function shouldPointerRestoreMouseMode(event, lastPosition = null) {
    if (!event?.isTrusted) return false;
    const pointerType = event.pointerType;
    if (pointerType && pointerType !== 'mouse' && pointerType !== 'pen') return false;
    const x = Number(event.clientX);
    const y = Number(event.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (!lastPosition || !Number.isFinite(lastPosition.x) || !Number.isFinite(lastPosition.y)) return true;
    const travelled = Math.abs(x - lastPosition.x) + Math.abs(y - lastPosition.y);
    return travelled >= POINTER_MODE_MOVEMENT_THRESHOLD_PX;
}
