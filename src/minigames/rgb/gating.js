// Pure availability rules for RGB hotspots. Extracted from runtime.js so the
// staged-funnel gating can be tested without a DOM: runtime.js asks only
// "may the player select this right now?" and this module answers from the
// hotspot's declared requirements plus the run state.
//
// Supported hotspot fields:
//   once: boolean            -> selectable at most one time
//   requiresAllOf: [id]      -> every listed hotspot must already be visited
//   excludesAllOf: [id]      -> no listed hotspot may have been visited
//   requires: {
//     flags: { key: bool }     -> run flags must match
//     items: [id]              -> every item must be in inventory
//     maxTimeBand: n           -> hidden once time pressure passes n
//     canExpose: true          -> the expose evidence threshold is met
//     painSet: true            -> the collision has resolved to a pain level
//     minVisitedOf: { ids, count } -> at least `count` of `ids` visited
//     minTrust4A / maxTrust4A: n   -> inclusive bounds on 4A's trust
//   }

import { canExpose } from './state.js';

export function isHotspotAvailable(hotspot, runState, visited) {
    if (hotspot.once && visited.has(hotspot.id)) return false;

    for (const dep of hotspot.requiresAllOf ?? []) {
        if (!visited.has(dep)) return false;
    }

    // Either/or beats (keep vs surrender the notebook, brace vs don't) declare
    // each other here so selecting one retires the other, instead of leaving
    // both live and letting the player take both sides of one decision.
    for (const excluded of hotspot.excludesAllOf ?? []) {
        if (visited.has(excluded)) return false;
    }

    const req = hotspot.requires;
    if (!req) return true;

    if (req.flags) {
        for (const [key, expected] of Object.entries(req.flags)) {
            if (Boolean(runState.flags[key]) !== Boolean(expected)) return false;
        }
    }
    for (const itemId of req.items ?? []) {
        if (!runState.inventory.includes(itemId)) return false;
    }
    if (Number.isFinite(req.maxTimeBand) && runState.timeBand > req.maxTimeBand) return false;
    if (req.canExpose && !canExpose(runState)) return false;
    if (req.painSet && runState.pain === 'stable') return false;

    // Chapter exits use this so a player cannot reach a chapter's decision —
    // or its game over — without having played enough of the chapter for that
    // decision to mean anything.
    if (req.minVisitedOf) {
        const { ids = [], count = 1 } = req.minVisitedOf;
        const met = ids.reduce((total, id) => total + (visited.has(id) ? 1 : 0), 0);
        if (met < count) return false;
    }

    if (Number.isFinite(req.minTrust4A) && runState.trust4A < req.minTrust4A) return false;
    if (Number.isFinite(req.maxTrust4A) && runState.trust4A > req.maxTrust4A) return false;

    return true;
}
