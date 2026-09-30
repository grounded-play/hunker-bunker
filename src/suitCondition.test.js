import { describe, expect, it } from 'vitest';
import {
    SUIT_BLOOD_DRY_MS,
    createSuitCondition,
    damageTierForVitals,
    reduceSuitCondition,
    resolveSuitCondition
} from './suitCondition.js';

describe('suit condition', () => {
    it('maps live vitals into stable damage tiers', () => {
        expect(damageTierForVitals(3, 3)).toBe(0);
        expect(damageTierForVitals(2, 3)).toBe(1);
        expect(damageTierForVitals(1, 3)).toBe(2);
        expect(damageTierForVitals(0, 3)).toBe(3);
    });

    it('accumulates capped combat blood and life-scoped scuffs', () => {
        let state = createSuitCondition({ inCombat: true });
        for (let index = 0; index < 12; index += 1) {
            state = reduceSuitCondition(state, {
                type: 'damage', hp: 2, maxHp: 3, inCombat: true,
                goreEnabled: true, reason: 'boss_sporesnail', direction: 'left'
            });
        }
        expect(state).toMatchObject({ damageTier: 1, bloodCount: 8, scuffCount: 8, bloodColor: 'alien', lastJolt: 'left' });
    });

    it('dries blood only after combat and washes it without repairing damage', () => {
        let state = createSuitCondition({ inCombat: true, bloodCount: 3, damageTier: 2, toxin: 1 });
        state = reduceSuitCondition(state, { type: 'tick', deltaMs: SUIT_BLOOD_DRY_MS });
        expect(state.bloodDryMs).toBe(0);
        state = reduceSuitCondition(state, { type: 'combat', active: false });
        state = reduceSuitCondition(state, { type: 'tick', deltaMs: SUIT_BLOOD_DRY_MS });
        expect(resolveSuitCondition(state).overlays.bloodDry).toBe(1);
        state = reduceSuitCondition(state, { type: 'wash' });
        expect(state).toMatchObject({ bloodCount: 0, toxin: 0, damageTier: 2 });
    });

    it('repairs damage into a lasting scratch and resets everything on a new life', () => {
        let state = createSuitCondition({ damageTier: 2, scuffCount: 3, bloodCount: 2 });
        state = reduceSuitCondition(state, { type: 'repair' });
        expect(state).toMatchObject({ damageTier: 0, scratchCount: 1, scuffCount: 3 });
        state = reduceSuitCondition(state, { type: 'death' });
        expect(resolveSuitCondition(state)).toMatchObject({ damageTier: 3, dead: true });
        expect(reduceSuitCondition(state, { type: 'new-life' })).toEqual(createSuitCondition());
    });

    it('caps nonessential overlays under reduced visual pressure', () => {
        const view = resolveSuitCondition(createSuitCondition({
            bloodCount: 8, scuffCount: 8, frost: 1, toxin: 1
        }), { visualPressure: 0.4 });
        expect(view.overlays).toMatchObject({ blood: 0.4, scuffs: 0.4, frost: 0.4, toxin: 0.4 });
    });
});
