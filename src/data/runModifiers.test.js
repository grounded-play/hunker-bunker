import { describe, expect, it } from 'vitest';
import { RUN_MODIFIERS, getRunModifierById, pickRunModifier } from './runModifiers.js';

describe('runModifiers', () => {
    it('defines the expected run modifier pool', () => {
        expect(RUN_MODIFIERS.map((modifier) => modifier.id)).toEqual([
            'rolling_blackout',
            'thin_air',
            'patrol_surge',
            'bad_map_data',
            'unstable_doors'
        ]);
        for (const modifier of RUN_MODIFIERS) {
            expect(typeof modifier.title).toBe('string');
            expect(typeof modifier.description).toBe('string');
            expect(modifier.weight).toBeGreaterThan(0);
        }
    });

    it('looks up modifiers by id', () => {
        expect(getRunModifierById('thin_air')?.title).toBe('THIN AIR');
        expect(getRunModifierById('missing')).toBeNull();
    });

    it('picks deterministically with injected RNG', () => {
        expect(pickRunModifier(() => 0)?.id).toBe('rolling_blackout');
        expect(pickRunModifier(() => 0.999)?.id).toBe('unstable_doors');
    });
});
