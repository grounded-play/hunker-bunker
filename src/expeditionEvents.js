// Ring 1 expedition events -- a surprise worth leaving the ship-goal route for.
//
// One event per deployment, rolled from the expedition seed, never the same
// as the previous deployment's. Each offers at least two responses, and the
// deployment's condition changes how it plays (the fight it can start, how
// long a bypass takes, how clearly the signal reads). Fights come from Lane
// 2's encounter recipes and rewards from Lane 3's run drops, reached through
// src/sliceContracts.js; this module only decides. Pure.
import { mixRunEntropy } from './runEntropy.js';

export const EXPEDITION_EVENT_IDS = Object.freeze(['false_distress', 'unstable_vault']);

// Synergy components (Lane 3's catalog) an event can grant, by condition:
// cold conditions lean cryo, biological ones lean bio.
export const EVENT_REWARD_DROPS = Object.freeze({
    glacial_gale: Object.freeze(['cryo_rime', 'shatter_engine']),
    subzero_stillness: Object.freeze(['shatter_engine', 'cryo_rime']),
    spore_bloom: Object.freeze(['caustic_payload', 'bio_vampirism']),
    bio_resin_surge: Object.freeze(['bio_vampirism', 'caustic_payload']),
    geothermal_arc: Object.freeze(['cryo_rime', 'caustic_payload'])
});

// How each condition changes each event.
export const EVENT_CONDITION_VARIANTS = Object.freeze({
    false_distress: Object.freeze({
        glacial_gale: Object.freeze({ ambushRecipe: 'cold_pincer', signal: 'clear', contaminationBias: 0.4 }),
        subzero_stillness: Object.freeze({ ambushRecipe: 'cold_pincer', signal: 'faint', contaminationBias: 0.5 }),
        spore_bloom: Object.freeze({ ambushRecipe: 'bloom_push', signal: 'clear', contaminationBias: 0.7 }),
        bio_resin_surge: Object.freeze({ ambushRecipe: 'bloom_push', signal: 'clear', contaminationBias: 0.6 }),
        // The arc browns the grid out: the signal only comes through in bursts.
        geothermal_arc: Object.freeze({ ambushRecipe: 'locked_crossfire', signal: 'intermittent', contaminationBias: 0.5 })
    }),
    unstable_vault: Object.freeze({
        glacial_gale: Object.freeze({ defendersRecipe: 'cold_pincer', bypassSeconds: 12, bypassO2Drain: 1.6 }),
        // Frozen locks: the slow way is slower.
        subzero_stillness: Object.freeze({ defendersRecipe: 'cold_pincer', bypassSeconds: 16, bypassO2Drain: 1.6 }),
        spore_bloom: Object.freeze({ defendersRecipe: 'bloom_push', bypassSeconds: 12, bypassO2Drain: 2.0 }),
        bio_resin_surge: Object.freeze({ defendersRecipe: 'bloom_push', bypassSeconds: 12, bypassO2Drain: 1.6 }),
        // Live power: the bypass is quick, but the arc makes it expensive to breathe.
        geothermal_arc: Object.freeze({ defendersRecipe: 'locked_crossfire', bypassSeconds: 7, bypassO2Drain: 2.2 })
    })
});

export const EVENT_RESPONSES = Object.freeze({
    false_distress: Object.freeze(['scan', 'open', 'leave']),
    unstable_vault: Object.freeze(['breach', 'bypass', 'leave'])
});

// Every line an event speaks, as literal keys (npm run i18n:audit reads them).
export const EVENT_TEXT_KEYS = Object.freeze({
    false_distress: Object.freeze({
        name: 'ui.events.false_distress.name',
        site: 'ui.events.false_distress.site',
        signal_clear: 'ui.events.false_distress.signal_clear',
        signal_faint: 'ui.events.false_distress.signal_faint',
        signal_intermittent: 'ui.events.false_distress.signal_intermittent',
        scan_survivor: 'ui.events.false_distress.scan_survivor',
        scan_contaminated: 'ui.events.false_distress.scan_contaminated',
        rescued: 'ui.events.false_distress.rescued',
        ambush: 'ui.events.false_distress.ambush',
        report_rescued: 'ui.events.false_distress.report_rescued',
        report_ambush: 'ui.events.false_distress.report_ambush',
        report_left: 'ui.events.false_distress.report_left',
        report_empty: 'ui.events.false_distress.report_empty',
        response_scan: 'ui.events.false_distress.response_scan',
        response_open: 'ui.events.false_distress.response_open',
        response_leave: 'ui.events.false_distress.response_leave'
    }),
    unstable_vault: Object.freeze({
        name: 'ui.events.unstable_vault.name',
        site: 'ui.events.unstable_vault.site',
        signal_clear: 'ui.events.unstable_vault.signal_clear',
        breach: 'ui.events.unstable_vault.breach',
        bypass_start: 'ui.events.unstable_vault.bypass_start',
        bypassed: 'ui.events.unstable_vault.bypassed',
        report_bypassed: 'ui.events.unstable_vault.report_bypassed',
        report_breached: 'ui.events.unstable_vault.report_breached',
        report_breached_quiet: 'ui.events.unstable_vault.report_breached_quiet',
        report_left: 'ui.events.unstable_vault.report_left',
        response_breach: 'ui.events.unstable_vault.response_breach',
        response_bypass: 'ui.events.unstable_vault.response_bypass',
        response_leave: 'ui.events.unstable_vault.response_leave'
    })
});

export const EVENT_RESPONSE_LABEL_KEYS = Object.freeze({
    scan: 'ui.events.response.scan',
    open: 'ui.events.response.open',
    leave: 'ui.events.response.leave',
    breach: 'ui.events.response.breach',
    bypass: 'ui.events.response.bypass'
});

// What each response does, per event.
export const EVENT_RESPONSE_DESC_KEYS = Object.freeze(Object.fromEntries(Object.entries(EVENT_RESPONSES)
    .map(([eventId, responses]) => [eventId, Object.freeze(Object.fromEntries(responses
        .map((response) => [response, EVENT_TEXT_KEYS[eventId][`response_${response}`]])))])));

// The optional-route chip, by stage.
export const EVENT_ROUTE_KEYS = Object.freeze({
    signalled: 'ui.events.route_signalled',
    bypassing: 'ui.events.route_bypassing',
    engaged: 'ui.events.route_engaged'
});

export const EVENT_TUNING = Object.freeze({
    // The ten-minute contract's 1:00-3:00 window.
    signalMinSeconds: 60,
    signalMaxSeconds: 150,
    scanSeconds: 3,
    siteRadius: 4
});

/**
 * The deployment's event. The same seed always gives the same event, except
 * that it never repeats the previous deployment's.
 */
export function selectDeploymentEvent({ expeditionSeed = 0, previousEventId = null } = {}) {
    const roll = mixRunEntropy(Number(expeditionSeed) >>> 0, 0x45564e54, 1);
    const picked = EXPEDITION_EVENT_IDS[roll % EXPEDITION_EVENT_IDS.length];
    if (picked !== previousEventId) return picked;
    return EXPEDITION_EVENT_IDS.find((id) => id !== previousEventId) ?? picked;
}

/**
 * Where the event happens: a Ring 1 route chunk off the spine and unclaimed,
 * else an unclaimed spine chunk that is not the crash site. Null when the
 * campaign's Ring 1 has no free chunk.
 */
export function chooseEventSite(worldPlan, expeditionSeed = 0) {
    const topology = worldPlan?.topology;
    if (!topology?.routeChunks) return null;
    const claimed = new Set([
        ...(worldPlan.reservations ?? []).map((entry) => entry.chunkKey),
        ...(worldPlan.ringCrossings ?? []).map((entry) => entry.chunkKey),
        topology.startChunkKey
    ].filter(Boolean));
    const ringOne = topology.routeChunks
        .filter((chunk) => chunk.ring === 1 && !claimed.has(`${chunk.chunkX},${chunk.chunkY}`))
        .sort((a, b) => (a.chunkX - b.chunkX) || (a.chunkY - b.chunkY));
    const offSpine = ringOne.filter((chunk) => !chunk.roles?.includes('spine'));
    const pool = offSpine.length ? offSpine : ringOne;
    if (!pool.length) return null;
    const chunk = pool[mixRunEntropy(Number(expeditionSeed) >>> 0, 0x53495445, 1) % pool.length];
    return { chunkX: chunk.chunkX, chunkY: chunk.chunkY, chunkKey: `${chunk.chunkX},${chunk.chunkY}`, offRoute: offSpine.length > 0 };
}

/** The whole plan for one deployment's event, or null when it has none. */
export function planDeploymentEvent({ expeditionSeed = 0, conditionId, eventId, worldPlan } = {}) {
    const variants = EVENT_CONDITION_VARIANTS[eventId];
    const variant = variants?.[conditionId];
    const site = chooseEventSite(worldPlan, expeditionSeed);
    if (!variant || !site) return null;
    const seed = Number(expeditionSeed) >>> 0;
    const signalAt = EVENT_TUNING.signalMinSeconds
        + (mixRunEntropy(seed, 0x54494d45, 1) % (EVENT_TUNING.signalMaxSeconds - EVENT_TUNING.signalMinSeconds + 1));
    const drops = EVENT_REWARD_DROPS[conditionId] ?? EVENT_REWARD_DROPS.glacial_gale;
    const plan = {
        eventId,
        conditionId,
        site,
        signalAt,
        responses: EVENT_RESPONSES[eventId],
        rewardDrop: drops[mixRunEntropy(seed, 0x44524f50, 1) % drops.length],
        ...variant
    };
    if (eventId === 'false_distress') {
        // What is actually behind the door, fixed for this deployment.
        const roll = (mixRunEntropy(seed, 0x54525554, 1) % 1000) / 1000;
        plan.truth = roll < variant.contaminationBias ? 'contaminated' : 'survivor';
    }
    return plan;
}

export function createEventState(plan) {
    return plan ? { eventId: plan.eventId, phase: 'dormant', scanned: false, response: null, outcome: null, bypassProgress: 0 } : null;
}

/**
 * Advance an event. Returns { state, effects } -- effects are what the runtime
 * must do (announce, spawn a recipe, grant a drop, report). Pure.
 *
 * Actions: 'signal', and at the site the plan's responses ('scan', 'open',
 * 'leave' / 'breach', 'bypass', 'leave'), plus 'bypass_tick' { seconds },
 * 'encounter_cleared', 'encounter_unavailable'.
 */
export function applyEventAction(plan, state, action = {}) {
    const none = { state, effects: [] };
    if (!plan || !state || state.phase === 'resolved') return none;
    const type = action.type;
    if (type === 'signal') {
        if (state.phase !== 'dormant') return none;
        return { state: { ...state, phase: 'signalled' }, effects: [{ kind: 'announce', lineKey: EVENT_TEXT_KEYS[plan.eventId][`signal_${plan.signal ?? 'clear'}`] }] };
    }
    if (state.phase === 'dormant') return none;
    if (type === 'leave') {
        return { state: { ...state, phase: 'resolved', response: 'leave', outcome: 'left' }, effects: [{ kind: 'report', item: { kind: 'event', labelKey: EVENT_TEXT_KEYS[plan.eventId].report_left } }] };
    }
    // The fight could not start (no encounter recipe registered, or nothing
    // spawned). The vault's reward was already taken, and the report says no
    // defenders came rather than claiming a fight was held; the bait pays nothing.
    if (type === 'encounter_unavailable' && state.phase === 'engaged') {
        if (plan.eventId === 'unstable_vault') {
            return {
                state: { ...state, phase: 'resolved', outcome: 'breach_unopposed' },
                effects: [{ kind: 'report', item: { kind: 'event', labelKey: EVENT_TEXT_KEYS.unstable_vault.report_breached_quiet } }]
            };
        }
        return {
            state: { ...state, phase: 'resolved', outcome: 'ambush_empty' },
            effects: [{ kind: 'report', item: { kind: 'event', labelKey: 'ui.events.false_distress.report_empty' } }]
        };
    }
    if (plan.eventId === 'false_distress') {
        if (type === 'scan' && !state.scanned && state.phase === 'signalled') {
            return { state: { ...state, scanned: true }, effects: [{ kind: 'announce', lineKey: EVENT_TEXT_KEYS.false_distress[`scan_${plan.truth}`] }] };
        }
        if (type === 'open' && state.phase === 'signalled') {
            if (plan.truth === 'survivor') {
                return {
                    state: { ...state, phase: 'resolved', response: 'open', outcome: 'rescued' },
                    effects: [
                        { kind: 'announce', lineKey: 'ui.events.false_distress.rescued' },
                        { kind: 'grant', dropId: plan.rewardDrop },
                        { kind: 'report', item: { kind: 'lead', labelKey: 'ui.events.false_distress.report_rescued' } }
                    ]
                };
            }
            return {
                state: { ...state, phase: 'engaged', response: 'open', outcome: 'ambushed' },
                effects: [
                    { kind: 'announce', lineKey: 'ui.events.false_distress.ambush' },
                    { kind: 'encounter', recipeId: plan.ambushRecipe }
                ]
            };
        }
        if (type === 'encounter_cleared' && state.phase === 'engaged') {
            return {
                state: { ...state, phase: 'resolved', outcome: 'ambush_survived' },
                effects: [
                    { kind: 'grant', dropId: plan.rewardDrop },
                    { kind: 'report', item: { kind: 'event', labelKey: 'ui.events.false_distress.report_ambush' } }
                ]
            };
        }
    }
    if (plan.eventId === 'unstable_vault') {
        if (type === 'breach' && state.phase === 'signalled') {
            return {
                state: { ...state, phase: 'engaged', response: 'breach', outcome: 'breached' },
                effects: [
                    { kind: 'announce', lineKey: 'ui.events.unstable_vault.breach' },
                    { kind: 'grant', dropId: plan.rewardDrop },
                    { kind: 'encounter', recipeId: plan.defendersRecipe }
                ]
            };
        }
        if (type === 'bypass' && state.phase === 'signalled') {
            return {
                state: { ...state, phase: 'bypassing', response: 'bypass' },
                effects: [{ kind: 'announce', lineKey: 'ui.events.unstable_vault.bypass_start' }, { kind: 'o2_drain', multiplier: plan.bypassO2Drain }]
            };
        }
        if (type === 'bypass_tick' && state.phase === 'bypassing') {
            const bypassProgress = Math.min(plan.bypassSeconds, state.bypassProgress + Math.max(0, Number(action.seconds) || 0));
            if (bypassProgress < plan.bypassSeconds) return { state: { ...state, bypassProgress }, effects: [] };
            return {
                state: { ...state, phase: 'resolved', bypassProgress, outcome: 'bypassed' },
                effects: [
                    { kind: 'o2_drain', multiplier: 1 },
                    { kind: 'announce', lineKey: 'ui.events.unstable_vault.bypassed' },
                    { kind: 'grant', dropId: plan.rewardDrop },
                    { kind: 'report', item: { kind: 'event', labelKey: 'ui.events.unstable_vault.report_bypassed' } }
                ]
            };
        }
        if (type === 'encounter_cleared' && state.phase === 'engaged') {
            return {
                state: { ...state, phase: 'resolved', outcome: 'breach_held' },
                effects: [{ kind: 'report', item: { kind: 'event', labelKey: 'ui.events.unstable_vault.report_breached' } }]
            };
        }
    }
    return none;
}
