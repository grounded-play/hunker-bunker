import { describe, expect, it } from 'vitest';
import {
    FATIGUE_SCARS,
    composeFatigueIntoLoadoutMods,
    fatigueMaxHealthPenalty,
    FATIGUE_STAGES,
    FATIGUE_STATE_KEY,
    createFatigueState,
    describeScars,
    fatigueModifiers,
    getFatigueStage,
    normalizeFatigueState,
    recordExpedition,
    sprintPricing,
    restoreOnSleep,
    treatScar
} from './fatigue.js';

describe('fatigue stages', () => {
    it('starts rested and climbs one stage per expedition without sleep', () => {
        let state = createFatigueState();
        expect(getFatigueStage(state).id).toBe('RESTED');
        const seen = [];
        for (let i = 0; i < 6; i += 1) {
            state = recordExpedition(state);
            seen.push(getFatigueStage(state).id);
        }
        expect(seen).toEqual(['ALERT', 'STRAINED', 'RAGGED', 'LONG_DARK', 'LONG_DARK', 'LONG_DARK']);
    });

    it('spans freshly rested to never slept without gaps', () => {
        const ids = FATIGUE_STAGES.map((stage) => stage.id);
        expect(ids[0]).toBe('RESTED');
        expect(ids.at(-1)).toBe('LONG_DARK');
        // Every stage is reachable: thresholds ascend by exactly one expedition.
        FATIGUE_STAGES.forEach((stage, index) => {
            expect(stage.minExpeditions).toBe(index);
        });
    });

    it('gives every stage past baseline both a cost and an upside', () => {
        for (const stage of FATIGUE_STAGES) {
            if (stage.id === 'RESTED' || stage.id === 'ALERT') continue;
            const mods = stage.modifiers;
            const costs = [
                (mods.healingMultiplier ?? 1) < 1,
                (mods.moveSpeedMultiplier ?? 1) < 1,
                (mods.oxygenDrainMultiplier ?? 1) > 1,
                (mods.maxHealthBonus ?? 0) < 0,
                (mods.swayMultiplier ?? 1) > 1
            ].some(Boolean);
            const upsides = [
                (mods.salvageValueMultiplier ?? 1) > 1,
                (mods.relicRarityTierBonus ?? 0) > 0,
                (mods.hiddenRoomDetectionRange ?? 0) > 0,
                (mods.scrapMagnetRadiusBonus ?? 0) > 0
            ].some(Boolean);
            expect(costs, `${stage.id} needs a cost`).toBe(true);
            expect(upsides, `${stage.id} needs an upside`).toBe(true);
        }
    });

    it('emits modifiers under the keys the loadout bus already composes', () => {
        const state = recordExpedition(recordExpedition(recordExpedition(createFatigueState())));
        const mods = fatigueModifiers(state);
        expect(mods).toHaveProperty('healingMultiplier');
        expect(mods).toHaveProperty('oxygenDrainMultiplier');
        expect(mods).toHaveProperty('salvageValueMultiplier');
        expect(Number.isFinite(mods.relicRarityTierBonus)).toBe(true);
    });
});

describe('sleeping, scars and partial treatment', () => {
    it('sleeping clears the wake ladder back to rested', () => {
        let state = createFatigueState();
        state = recordExpedition(recordExpedition(state));
        const { state: rested } = restoreOnSleep(state);
        expect(rested.expeditionsSinceSleep).toBe(0);
        expect(getFatigueStage(rested).id).toBe('RESTED');
    });

    it('sleeping below the scar threshold leaves no scar', () => {
        const state = recordExpedition(createFatigueState());
        const { state: rested, gainedScar } = restoreOnSleep(state);
        expect(gainedScar).toBe(null);
        expect(rested.scars).toEqual([]);
    });

    it('sleeping while ragged or worse leaves a scar that outlives the rest', () => {
        let state = createFatigueState();
        for (let i = 0; i < 3; i += 1) state = recordExpedition(state);
        expect(getFatigueStage(state).id).toBe('RAGGED');
        const { state: rested, gainedScar } = restoreOnSleep(state);
        expect(gainedScar).not.toBe(null);
        expect(rested.scars).toHaveLength(1);
        // The ladder resets; the scar does not.
        expect(rested.expeditionsSinceSleep).toBe(0);
    });

    // Each collapse leaves a NEW mark; severity only deepens once the player
    // holds every scar. That keeps a degrading campaign legible -- you can see
    // which marks you have -- instead of silently stacking one hidden number.
    it('adds a distinct scar per collapse, then deepens once all are held', () => {
        const collapseAndSleep = (input) => {
            let next = input;
            for (let i = 0; i < 4; i += 1) next = recordExpedition(next);
            return restoreOnSleep(next).state;
        };

        let state = collapseAndSleep(createFatigueState());
        expect(state.scars).toHaveLength(1);
        state = collapseAndSleep(state);
        expect(state.scars).toHaveLength(2);
        expect(state.scars.every((scar) => scar.severity === 1)).toBe(true);

        // Keep going until every scar is held, then the next one deepens.
        for (let i = 0; i < 3; i += 1) state = collapseAndSleep(state);
        const ids = state.scars.map((scar) => scar.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(state.scars.some((scar) => scar.severity > 1)).toBe(true);
    });

    // The untreatable end state is earned last, so it reads as the consequence
    // of a campaign run into the ground rather than bad luck on night one.
    it('holds the untreatable scar back until the treatable ones are all held', () => {
        let state = createFatigueState();
        const collapse = () => {
            for (let i = 0; i < 4; i += 1) state = recordExpedition(state);
            state = restoreOnSleep(state).state;
        };
        collapse();
        expect(state.scars.map((s) => s.id)).not.toContain('BLUNTED');
        collapse();
        collapse();
        expect(state.scars).toHaveLength(3);
        expect(state.scars.map((s) => s.id)).not.toContain('BLUNTED');
        collapse();
        expect(state.scars.map((s) => s.id)).toContain('BLUNTED');
    });

    it('treatment lowers severity one tier and never clears the scar', () => {
        const state = normalizeFatigueState({ scars: [{ id: 'TREMOR', severity: 3 }] });
        const once = treatScar(state, 'TREMOR');
        expect(once.state.scars[0].severity).toBe(2);
        expect(once.treated).toBe(true);
        const twice = treatScar(once.state, 'TREMOR');
        const thrice = treatScar(twice.state, 'TREMOR');
        // Floors at 1: the scar is always still there.
        expect(thrice.state.scars[0].severity).toBe(1);
        expect(thrice.state.scars.map((s) => s.id)).toContain('TREMOR');
    });

    it('has at least one untreatable end state', () => {
        const untreatable = FATIGUE_SCARS.filter((scar) => scar.treatable === false);
        expect(untreatable.length).toBeGreaterThanOrEqual(1);
        const id = untreatable[0].id;
        const state = normalizeFatigueState({ scars: [{ id, severity: 2 }] });
        const result = treatScar(state, id);
        expect(result.treated).toBe(false);
        expect(result.state.scars[0].severity).toBe(2);
    });

    it('folds scar penalties into the same modifier bus', () => {
        const clean = fatigueModifiers(createFatigueState());
        const scarred = fatigueModifiers(normalizeFatigueState({ scars: [{ id: 'HYPERVIGILANCE', severity: 2 }] }));
        expect(scarred.healingMultiplier).toBeLessThan(clean.healingMultiplier);
    });
});

describe('persistence', () => {
    it('uses its own storage key and never collides with the day cycle', () => {
        expect(FATIGUE_STATE_KEY).toBe('hb_fatigue');
        expect(FATIGUE_STATE_KEY.startsWith('hb_')).toBe(true);
    });

    it('survives corrupt, hostile or partial saves', () => {
        expect(normalizeFatigueState(null)).toEqual(createFatigueState());
        expect(normalizeFatigueState('nope')).toEqual(createFatigueState());
        expect(normalizeFatigueState({ expeditionsSinceSleep: -4 }).expeditionsSinceSleep).toBe(0);
        expect(normalizeFatigueState({ expeditionsSinceSleep: 9e9 }).expeditionsSinceSleep).toBeLessThanOrEqual(99);
        // Unknown scar ids are dropped rather than lingering in a save forever.
        const bogus = normalizeFatigueState({ scars: [{ id: 'NOT_A_SCAR', severity: 2 }, { id: 'TREMOR', severity: 99 }] });
        expect(bogus.scars.map((s) => s.id)).toEqual(['TREMOR']);
        expect(bogus.scars[0].severity).toBeLessThanOrEqual(3);
    });
});

describe('composing into the loadout bus', () => {
    const ragged = () => {
        let state = createFatigueState();
        for (let i = 0; i < 4; i += 1) state = recordExpedition(state);
        return state;
    };

    it('multiplies multipliers and adds bonuses onto the existing mods', () => {
        const base = { healingMultiplier: 0.6, scrapMagnetRadiusBonus: 2, fireRateMultiplier: 1.3 };
        const merged = composeFatigueIntoLoadoutMods(base, ragged());
        const solo = fatigueModifiers(ragged());
        expect(merged.healingMultiplier).toBeCloseTo(0.6 * solo.healingMultiplier, 5);
        expect(merged.scrapMagnetRadiusBonus).toBe(2 + solo.scrapMagnetRadiusBonus);
        // Keys fatigue knows nothing about pass through untouched.
        expect(merged.fireRateMultiplier).toBe(1.3);
    });

    it('never folds the heart penalty into a key the consumer clamps at zero', () => {
        const merged = composeFatigueIntoLoadoutMods({}, ragged());
        expect(merged.maxHealthBonus).toBeUndefined();
        expect(fatigueMaxHealthPenalty(ragged())).toBeLessThan(0);
        // ...and it is never a bonus.
        expect(fatigueMaxHealthPenalty(createFatigueState())).toBe(0);
    });

    it('is a no-op at baseline, so a rested run plays exactly as before', () => {
        const base = { healingMultiplier: 1, moveSpeedMultiplier: 1 };
        let state = createFatigueState();
        state = recordExpedition(state); // ALERT = baseline
        const merged = composeFatigueIntoLoadoutMods(base, state);
        expect(merged.healingMultiplier).toBe(1);
        expect(merged.moveSpeedMultiplier).toBe(1);
        expect(fatigueMaxHealthPenalty(state)).toBe(0);
    });

    it('tolerates a missing base object', () => {
        expect(() => composeFatigueIntoLoadoutMods(null, createFatigueState())).not.toThrow();
        expect(() => composeFatigueIntoLoadoutMods(undefined, null)).not.toThrow();
    });
});

describe('sprint pricing', () => {
    const at = (n) => {
        let state = createFatigueState();
        for (let i = 0; i < n; i += 1) state = recordExpedition(state);
        return state;
    };

    it('is free at baseline', () => {
        expect(sprintPricing(at(1))).toEqual({ o2DrainMultiplier: 1, speedBonusScale: 1 });
    });

    it('gets steadily more expensive, never cheaper', () => {
        const costs = [1, 2, 3, 4, 5].map((n) => sprintPricing(at(n)).o2DrainMultiplier);
        for (let i = 1; i < costs.length; i += 1) {
            expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
        }
        expect(costs.at(-1)).toBeGreaterThan(costs[0]);
    });

    // The verb must survive: sprint is priced, never removed.
    it('never scales the speed bonus to zero at any stage', () => {
        for (let n = 0; n <= 8; n += 1) {
            const { speedBonusScale } = sprintPricing(at(n));
            expect(speedBonusScale).toBeGreaterThan(0.5);
            expect(speedBonusScale).toBeLessThanOrEqual(1);
        }
    });
});

describe('describeScars', () => {
    it('reports nothing when the operator is unmarked', () => {
        expect(describeScars(createFatigueState())).toBe(null);
        expect(describeScars(null)).toBe(null);
    });

    it('names each scar and marks severity above the first tier', () => {
        const state = normalizeFatigueState({
            scars: [{ id: 'TREMOR', severity: 2 }, { id: 'HYPERVIGILANCE', severity: 1 }]
        });
        expect(describeScars(state)).toBe('TREMOR x2 / HYPERVIGILANCE');
    });

    // Copy for the empty case belongs to the caller, which owns localization.
    it('never invents a "nothing wrong" string of its own', () => {
        expect(describeScars(createFatigueState())).toBe(null);
    });
});
