// Shared presentation-telemetry contract for Sprint 29.
//
// Three lanes (UI, rendering, audio/locomotion) all need to emit events into
// the same session log that produces docs/logs/*.json. Without one contract
// each lane invents its own category and message spelling, and the exported
// log becomes unqueryable -- which is exactly what left log16 unable to
// distinguish a hidden menu from a missing one.
//
// Event names are closed: emitting one that is not declared here is a
// programming error, not a silently-accepted new event.
import { debugLog } from './debugConsole.js';

export const PRESENTATION_EVENTS = Object.freeze({
    RETICLE: Object.freeze({
        STATE: 'state',
        HIDDEN_REASON: 'hidden-reason',
        TARGET: 'target',
        SCREEN_POS: 'screen-pos'
    }),
    MENU: Object.freeze({
        OPEN: 'open',
        CLOSE: 'close',
        VISIBILITY_SNAPSHOT: 'visibility-snapshot',
        INPUT_BLOCKED: 'input-blocked'
    }),
    XP: Object.freeze({
        GAIN: 'gain',
        AGGREGATE: 'aggregate',
        UI_SHOW: 'ui-show',
        UI_HIDE: 'ui-hide',
        SOUND: 'sound',
        CLEANUP: 'cleanup'
    }),
    REWARD: Object.freeze({
        CLAIM_START: 'claim-start',
        GRANT_CONFIRMED: 'grant-confirmed',
        REVEAL_OPEN: 'reveal-open',
        PREVIEW_READY: 'preview-ready',
        PREVIEW_FAILED: 'preview-failed',
        BURST_FIRED: 'burst-fired',
        AUDIO_FIRED: 'audio-fired',
        REVEAL_CLOSE: 'reveal-close'
    }),
    LIGHTING: Object.freeze({
        SNAPSHOT: 'snapshot',
        TIER_CHANGE: 'tier-change',
        LIGHT_DROPPED: 'light-dropped'
    }),
    WEAPON: Object.freeze({
        FIRE_INPUT: 'fire-input',
        SHOT_ACCEPTED: 'shot-accepted',
        SHOT_BLOCKED: 'shot-blocked',
        PROJECTILE: 'projectile'
    })
});

export function createPresentationTelemetry({ logger = debugLog } = {}) {
    function emit(category, event, detail) {
        const events = PRESENTATION_EVENTS[category];
        if (!events) {
            throw new Error(`presentationTelemetry: unknown category "${category}"`);
        }
        if (!Object.values(events).includes(event)) {
            throw new Error(`presentationTelemetry: unknown ${category} event "${event}"`);
        }
        logger.info(category, event, detail);
    }

    // Sprint 29 §19 requires each lane's events to fire exactly once per
    // user-visible action. Callers pass an action key (a claim of one tier, one
    // XP burst); repeat stages under the same key are dropped rather than
    // producing the duplicate bursts and double stings the plan calls out.
    const seen = new Set();

    function emitOnce(category, event, detail, actionKey) {
        const dedupeKey = `${actionKey}::${category}::${event}`;
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        emit(category, event, detail);
        return true;
    }

    function clearAction(actionKey) {
        const prefix = `${actionKey}::`;
        for (const key of seen) {
            if (key.startsWith(prefix)) seen.delete(key);
        }
    }

    return { emit, emitOnce, clearAction };
}

export const presentationTelemetry = createPresentationTelemetry();
