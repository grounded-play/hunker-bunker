import { describe, expect, it } from 'vitest';
import { RUN_MODIFIERS, getRunModifierById, pickRunModifier } from './runModifiers.js';

describe('runModifiers', () => {
    it('defines the expected run modifier pool', () => {
        expect(RUN_MODIFIERS.map((modifier) => modifier.id)).toEqual([
            'relay_blackout',
            'spore_bloom',
            'patrol_surge',
            'ice_collapse',
            'camp_paranoia',
            'egg_instability'
        ]);
        for (const modifier of RUN_MODIFIERS) {
            expect(typeof modifier.title).toBe('string');
            expect(typeof modifier.description).toBe('string');
            expect(modifier.effects).toBeTruthy();
        }
    });

    it('looks up modifiers by id', () => {
        expect(getRunModifierById('egg_instability')?.title).toBe('EGG INSTABILITY');
        expect(getRunModifierById('missing')).toBeNull();
    });

    it('picks a deterministic multi-card run state with a seed', () => {
        const modifier = pickRunModifier(Math.random, { seed: 'compat-seed' });

        expect(modifier.seed).toBe('compat-seed');
        expect(modifier.cards.length).toBeGreaterThanOrEqual(2);
        expect(modifier.cards.length).toBeLessThanOrEqual(3);
        expect(modifier.title).toContain(modifier.cards[0].label);
        expect(modifier.effects).toBeTruthy();
    });
});
