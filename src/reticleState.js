// Reactive reticle state selection (Sprint 29 plan §1), Lane A.
//
// Before this, #gameplay-crosshair had exactly one state class -- .hidden --
// so the reticle could tell the player nothing about what they were looking
// at. This module is the single authority for which state the reticle is in;
// presentation (colour, brackets, pulse) keys off the returned state name.

const STATE_BY_TARGET_KIND = Object.freeze({
    enemy: 'hostile',
    interactable: 'interactable',
    pickup: 'pickup'
});

export function selectReticleState({ target, blockedReason, hasBlockingOverlay } = {}) {
    // A menu is open over the world: the reticle must not report on whatever
    // happens to sit behind it (§1).
    if (hasBlockingOverlay) {
        return { state: 'neutral', visible: false, hiddenReason: 'blocking-overlay', reason: null };
    }

    // §1: "Blocked/unavailable: muted, never invisible." A refusal outranks
    // the target, because what the player needs to know is that the action
    // will not happen -- not what they are pointing at.
    if (blockedReason) {
        return { state: 'blocked', visible: true, hiddenReason: null, reason: blockedReason };
    }

    // §1: the hostile state appears "only when the target is valid and
    // actionable" -- an enemy behind glass or out of range must not read as a
    // shot the player can take.
    if (target?.actionable) {
        const state = STATE_BY_TARGET_KIND[target.kind];
        if (state) return { state, visible: true, hiddenReason: null, reason: null };
    }
    return { state: 'neutral', visible: true, hiddenReason: null, reason: null };
}

/**
 * Where the reticle belongs, and whether it should be on screen at all.
 *
 * The pre-Sprint-29 behaviour was movement-driven: #gameplay-crosshair shipped
 * with .hidden and only ever became visible inside a mousemove handler, so a
 * player who entered gameplay and moved with WASD had no reticle. Placement is
 * therefore a function of phase, not of input history -- entering gameplay is
 * itself enough to show it.
 */
export function resolveReticlePlacement({ phase, pointerLocked = false, pointer = null, viewport } = {}) {
    const centreX = (viewport?.width ?? 0) / 2;
    const centreY = (viewport?.height ?? 0) / 2;

    if (phase !== 'gameplay') {
        return { visible: false, x: centreX, y: centreY };
    }
    // Under pointer lock clientX/clientY stop tracking anything real, so the
    // aim ray is the screen centre and the reticle must say so.
    if (pointerLocked || !pointer) {
        return { visible: true, x: centreX, y: centreY };
    }
    return { visible: true, x: pointer.x, y: pointer.y };
}

/**
 * Pull the refusal reason out of a Lane C WEAPON telemetry entry.
 *
 * Lane C emits `shot-blocked` with a `{ reason }` detail from
 * src/threeGame.js, which Lane A does not own. debugConsole flattens details
 * into the entry's message string, so this reads the reason back out -- which
 * lets the reticle show a blocked state without either lane reaching into the
 * other's files.
 */
export function parseWeaponBlockReason(entry) {
    if (entry?.category !== 'WEAPON') return null;
    const message = String(entry.message ?? '');
    if (!message.startsWith('shot-blocked')) return null;
    return message.match(/"reason"\s*:\s*"([^"]+)"/)?.[1] ?? null;
}

// Ordered most-urgent first: an enemy the player is also able to interact with
// should read as a threat, not as a door.
const CURSOR_CLASS_TARGETS = Object.freeze([
    ['cursor-enemy', 'enemy'],
    ['cursor-loot', 'pickup'],
    ['cursor-interact', 'interactable'],
    ['cursor-camp', 'interactable']
]);

export function targetFromCursorClasses(classes = []) {
    const present = new Set(classes);
    for (const [cls, kind] of CURSOR_CLASS_TARGETS) {
        if (present.has(cls)) return { kind, actionable: true };
    }
    return null;
}

/**
 * Is the weapon completely out of ammunition?
 *
 * Both numbers must be present and zero. A missing reading means "we do not
 * know", which must not raise a dry warning -- a false alarm on a full weapon
 * would be worse than the silence this is fixing.
 */
export function isWeaponDry({ clip, cache } = {}) {
    if (!Number.isFinite(clip) || !Number.isFinite(cache)) return false;
    return clip <= 0 && cache <= 0;
}

/**
 * Which reticle telemetry events a transition warrants.
 *
 * Reticle state is recomputed on every pointer move and on a refresh tick.
 * Emitting per evaluation would bury the log -- log16 was already 2,108 PERF
 * entries out of 2,875 -- so events fire only when something actually changed.
 */
export function diffReticleTelemetry(previous, next) {
    const events = [];
    if (!next) return events;
    if (!previous || previous.state !== next.state) {
        events.push('state', 'screen-pos');
    }
    if (!previous || previous.targetKind !== next.targetKind) events.push('target');
    const wasHidden = Boolean(previous && previous.visible === false);
    if (next.visible === false && !wasHidden && next.hiddenReason) {
        events.push('hidden-reason');
    }
    return events;
}
