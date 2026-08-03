// Structural guarantees for the staged-funnel content. Chapters 3 and 4 have
// previously shipped in a state where no hotspot could advance them, stranding
// the player mid-story; gating them more tightly makes that failure easier to
// reintroduce, so these tests play each chapter rather than inspecting it.

import { describe, expect, it } from 'vitest';
import { CHAPTERS, CHAPTER_ORDER } from './content.js';
import { isHotspotAvailable } from './gating.js';
import {
    createRunState,
    addItem,
    addEvidence,
    setPain,
    advanceTime,
    applyChoice,
    completeCalibration,
    chooseFinal,
    attemptRescue,
    recordKioskAttempt
} from './state.js';

// Mirrors runtime.js applyEffects. Kept here deliberately: if the runtime
// gains an effect this does not know about, the playthrough below diverges
// from the real game and these guarantees stop meaning anything.
function applyEffects(runState, effects) {
    if (!effects) return runState;
    let next = runState;
    if (effects.item) next = addItem(next, effects.item);
    for (const item of effects.items ?? []) next = addItem(next, item);
    if (effects.evidence) next = addEvidence(next, effects.evidence);
    if (effects.pain) next = setPain(next, effects.pain);
    if (effects.timeCost) next = advanceTime(next, effects.timeCost);
    if (effects.kioskAttempt) next = recordKioskAttempt(next);
    if (effects.choice) next = applyChoice(next, effects.choice);
    if (effects.calibration) {
        next = completeCalibration(next, effects.calibration.quality, effects.calibration.honest);
    }
    if (effects.finalChoice) next = chooseFinal(next, effects.finalChoice);
    if (effects.rescue) next = attemptRescue(next, effects.rescue);
    return next;
}

// Some beats are gated on progress earned in an earlier chapter: Chapter 5's
// "Copy and Transmit" needs evidence collected across Chapters 3 and 4.
// Reachability therefore has to be judged from a player who did
// everything available beforehand, not from a blank slate.
//
// Calibration is the one carried value with two incompatible readings — an
// honest log and a falsified one gate opposite halves of the finale — so this
// returns one seed per branch and a beat counts as reachable if any branch
// reaches it.
function seedVariantsFor(chapterId) {
    const earlier = CHAPTER_ORDER.slice(0, CHAPTER_ORDER.indexOf(chapterId));

    return [true, false].map((honest) => {
        let state = createRunState();
        let calibrated = false;

        for (const earlierId of earlier) {
            for (const hotspot of CHAPTERS[earlierId].hotspots) {
                const effects = hotspot.effects;
                if (!effects) continue;

                if (effects.evidence) state = addEvidence(state, effects.evidence);
                if (effects.calibration && !calibrated) {
                    state = completeCalibration(state, effects.calibration.quality, honest);
                    calibrated = true;
                }
                if (effects.choice) {
                    // Keep only the flags a choice turns on. Later chapters
                    // gate on opportunities taken, and no gate in the game
                    // requires a flag to be false, so accumulating the
                    // positives is the widest honest reading of "did
                    // everything available".
                    const applied = applyChoice(state, effects.choice);
                    const flags = { ...state.flags };
                    for (const [key, value] of Object.entries(applied.flags)) {
                        if (value) flags[key] = true;
                    }
                    state = { ...state, flags };
                }
            }
        }
        return state;
    });
}

// Plays a chapter, preferring non-advancing beats so the run explores before
// it exits — the same order a player following the fiction would take.
// Returns the ids of the advancing hotspots that became reachable.
function playChapter(chapter, startState = createRunState(), { preferId = null } = {}) {
    let runState = applyEffects(startState, chapter.initialEffects);
    const visited = new Set();
    const reachedExits = [];

    for (let step = 0; step < chapter.hotspots.length * 3; step += 1) {
        const open = chapter.hotspots.filter((h) => isHotspotAvailable(h, runState, visited));
        if (open.length === 0) break;

        const preferred = preferId ? open.find((h) => h.id === preferId) : null;
        const next = preferred ?? open.find((h) => !h.advances) ?? open[0];

        if (next.advances) {
            reachedExits.push(next.id);
            break;
        }
        visited.add(next.id);
        runState = applyEffects(runState, next.effects);
        for (const itemId of next.pickup?.items ?? []) runState = addItem(runState, itemId);
    }

    return { reachedExits, runState, visited };
}

describe('chapter reachability', () => {
    it('every chapter can be played to an advancing hotspot from a fresh state', () => {
        for (const id of CHAPTER_ORDER) {
            const { reachedExits } = playChapter(CHAPTERS[id]);
            expect(reachedExits.length, `${id} has no reachable exit`).toBeGreaterThan(0);
        }
    });

    it('every hotspot is reachable by some ordering of its chapter', () => {
        for (const id of CHAPTER_ORDER) {
            const chapter = CHAPTERS[id];
            for (const target of chapter.hotspots) {
                const seen = seedVariantsFor(id).some((seed) => {
                    const { visited, reachedExits } = playChapter(chapter, seed, {
                        preferId: target.id
                    });
                    return visited.has(target.id) || reachedExits.includes(target.id);
                });
                expect(seen, `${id}/${target.id} is unreachable`).toBe(true);
            }
        }
    });

    it('every requiresAllOf and excludesAllOf id resolves within its own chapter', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            const ids = new Set(chapter.hotspots.map((h) => h.id));
            for (const hotspot of chapter.hotspots) {
                for (const dep of [...(hotspot.requiresAllOf ?? []), ...(hotspot.excludesAllOf ?? [])]) {
                    expect(ids.has(dep), `${chapter.id}/${hotspot.id} -> ${dep}`).toBe(true);
                }
            }
        }
    });

    it('every minVisitedOf id resolves within its own chapter and is satisfiable', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            const ids = new Set(chapter.hotspots.map((h) => h.id));
            for (const hotspot of chapter.hotspots) {
                const gate = hotspot.requires?.minVisitedOf;
                if (!gate) continue;
                for (const dep of gate.ids) {
                    expect(ids.has(dep), `${chapter.id}/${hotspot.id} -> ${dep}`).toBe(true);
                }
                expect(gate.ids.length, `${chapter.id}/${hotspot.id}`).toBeGreaterThanOrEqual(gate.count);
            }
        }
    });

    it('excludesAllOf is declared symmetrically so either order retires the pair', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            const byId = new Map(chapter.hotspots.map((h) => [h.id, h]));
            for (const hotspot of chapter.hotspots) {
                for (const excluded of hotspot.excludesAllOf ?? []) {
                    const other = byId.get(excluded);
                    expect(
                        other.excludesAllOf ?? [],
                        `${chapter.id}: ${excluded} does not exclude ${hotspot.id} back`
                    ).toContain(hotspot.id);
                }
            }
        }
    });
});

describe('pacing gates hold', () => {
    it('the kiosk cannot be given up on before its alternatives are exhausted', () => {
        const chapter = CHAPTERS.medi_kiosk;
        const giveUp = chapter.hotspots.find((h) => h.id === 'give_up');
        expect(isHotspotAvailable(giveUp, createRunState(), new Set())).toBe(false);
        expect(isHotspotAvailable(giveUp, createRunState(), new Set(['scan_bottle']))).toBe(false);
    });

    it('the review room cannot be left straight off the collision', () => {
        const chapter = CHAPTERS.incident_review;
        const exit = chapter.hotspots.find((h) => h.id === 'proceed_to_kiosk');
        const injured = setPain(createRunState(), 'injured');
        expect(isHotspotAvailable(exit, injured, new Set(['demand_footage']))).toBe(false);
    });

    it('the parking lot exits are unavailable before the authored setup beats', () => {
        const chapter = CHAPTERS.parking_lot;
        const exits = chapter.hotspots.filter((h) => h.advances);
        const explored = new Set([
            'inspect_bottle',
            'check_balance',
            'listen_voicemail',
            'inspect_drawing',
            'speak_with_marisol'
        ]);
        expect(exits).toHaveLength(2);
        expect(exits.every((exit) => isHotspotAvailable(exit, createRunState(), new Set()))).toBe(false);
        expect(exits.every((exit) => isHotspotAvailable(exit, createRunState(), explored))).toBe(true);
    });
});

describe('calibration pays off in the finale', () => {
    const honest = completeCalibration(createRunState(), 2, true);
    const falsified = completeCalibration(createRunState(), 2, false);

    it('an honest error log lifts the rack in one pass', () => {
        const { reachedExits, runState } = playChapter(CHAPTERS.sector_four, honest);
        expect(reachedExits).toContain('rescue_recenter');
        expect(runState.rescueOutcome).toBe(null);
    });

    it('a falsified metric still succeeds, but costs an extra recenter', () => {
        const { reachedExits, visited } = playChapter(CHAPTERS.sector_four, falsified);
        expect(visited.has('rescue_recenter_weak')).toBe(true);
        expect(reachedExits).toContain('rescue_recenter_again');
    });

    it('offers exactly one first-attempt rescue for any calibration', () => {
        const chapter = CHAPTERS.sector_four;
        const crossed = new Set(['assess_lockdown', 'reach_drawing']);
        for (const state of [honest, falsified, createRunState()]) {
            const open = chapter.hotspots
                .filter((h) => h.id.startsWith('rescue_recenter'))
                .filter((h) => isHotspotAvailable(h, state, crossed));
            expect(open).toHaveLength(1);
        }
    });
});

describe('state wiring has no dead ends', () => {
    it('every flag a gate reads is set by some hotspot in the game', () => {
        const setFlags = new Set();
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                const choice = hotspot.effects?.choice;
                if (!choice) continue;
                const before = createRunState();
                const after = applyChoice(before, choice);
                for (const [key, value] of Object.entries(after.flags)) {
                    if (value !== before.flags[key]) setFlags.add(key);
                }
            }
        }

        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                for (const key of Object.keys(hotspot.requires?.flags ?? {})) {
                    expect(
                        setFlags.has(key),
                        `${chapter.id}/${hotspot.id} gates on ${key}, which no hotspot sets`
                    ).toBe(true);
                }
            }
        }
    });
});
