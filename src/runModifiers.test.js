import { describe, expect, it } from 'vitest';
import {
    RUN_MODIFIER_CARDS,
    createRunCardState,
    drawRunCards,
    getRunCardByKey,
    mergeEffects,
    serializeRunCards
} from './runModifiers.js';

describe('run modifier cards', () => {
    it('defines the sprint-19 pressure card set', () => {
        expect(RUN_MODIFIER_CARDS.map((card) => card.key)).toEqual([
            'relay_blackout',
            'spore_bloom',
            'patrol_surge',
            'ice_collapse',
            'camp_paranoia',
            'egg_instability'
        ]);
        for (const card of RUN_MODIFIER_CARDS) {
            expect(typeof card.label).toBe('string');
            expect(typeof card.blurb).toBe('string');
            expect(card.effects).toBeTruthy();
        }
    });

    it('draws 2-3 deterministic cards from a seed', () => {
        const first = drawRunCards('sprint-19-alpha').map((card) => card.key);
        const second = drawRunCards('sprint-19-alpha').map((card) => card.key);
        const other = drawRunCards('sprint-19-beta').map((card) => card.key);

        expect(first).toEqual(second);
        expect(first.length).toBeGreaterThanOrEqual(2);
        expect(first.length).toBeLessThanOrEqual(3);
        expect(other).not.toEqual(first);
    });

    it('caps world and faction pressure to one card each', () => {
        for (let i = 0; i < 40; i++) {
            const cards = drawRunCards(`cap-check-${i}`);
            expect(cards.filter((card) => card.type === 'world')).toHaveLength(cards.some((card) => card.type === 'world') ? 1 : 0);
            expect(cards.filter((card) => card.type === 'faction')).toHaveLength(cards.some((card) => card.type === 'faction') ? 1 : 0);
        }
    });

    it('merges nested effect objects into a consumer contract', () => {
        const effects = mergeEffects(
            { radar: { rangeMult: 0.65 }, spawnBias: { patrolBias: true } },
            { radar: { cooldownMult: 1.35 }, suspicionMult: 2 }
        );

        expect(effects).toEqual({
            radar: { rangeMult: 0.65, cooldownMult: 1.35 },
            spawnBias: { patrolBias: true },
            suspicionMult: 2
        });
    });

    it('builds a serializable run card state for UI seams', () => {
        const state = createRunCardState('ui-seed');

        expect(state.seed).toBe('ui-seed');
        expect(state.cards.length).toBeGreaterThanOrEqual(2);
        expect(serializeRunCards(state.cards)[0]).toEqual({
            key: state.cards[0].key,
            label: state.cards[0].label,
            blurb: state.cards[0].blurb
        });
    });

    it('looks up individual card definitions', () => {
        expect(getRunCardByKey('egg_instability')?.effects.manifest.eggSeatRequiresNahl).toBe(true);
        expect(getRunCardByKey('missing')).toBeNull();
    });
});
