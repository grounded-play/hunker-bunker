import { describe, expect, it } from 'vitest';
import { HUMAN_ARCHETYPES, getHumanArchetype } from './humans.js';

describe('HUMAN_ARCHETYPES', () => {
    it('defines future host payloads without spawning live humans', () => {
        expect(Object.keys(HUMAN_ARCHETYPES).sort()).toEqual(['commander', 'engineer', 'medic', 'miner', 'scout', 'soldier']);
        for (const archetype of Object.values(HUMAN_ARCHETYPES)) {
            expect(archetype.hostConversion).toMatch(/drone|nurse|queen/);
            expect(archetype.loot.tech + archetype.loot.coin + archetype.loot.med).toBeGreaterThan(0);
        }
    });

    it('falls back safely', () => {
        expect(getHumanArchetype('missing')).toBe(HUMAN_ARCHETYPES.scout);
    });
});
