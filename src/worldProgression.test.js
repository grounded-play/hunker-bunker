import { describe, expect, it } from 'vitest';
import { getDepthThreatScale, WORLD_PROGRESSION_SLOTS } from './worldProgression.js';

describe('world progression plan', () => {
    it('orders shelters, hive branches, mothership cave, then final cave', () => {
        const camps = WORLD_PROGRESSION_SLOTS.camp.map((slot) => slot.distance);
        const hives = WORLD_PROGRESSION_SLOTS.hive.map((slot) => slot.distance);
        expect(camps).toEqual([...camps].sort((a, b) => a - b));
        expect(hives[0]).toBeGreaterThan(camps[1]);
        expect(hives[1]).toBeGreaterThan(camps[2]);
        expect(WORLD_PROGRESSION_SLOTS.mothershipCave.distance).toBeGreaterThan(hives.at(-1));
        expect(WORLD_PROGRESSION_SLOTS.finalCave.distance).toBeGreaterThan(WORLD_PROGRESSION_SLOTS.mothershipCave.distance);
    });

    it('raises enemy durability and speed continuously with depth', () => {
        const home = getDepthThreatScale(0);
        const deep = getDepthThreatScale(224);
        expect(deep.hp).toBeGreaterThan(home.hp);
        expect(deep.speed).toBeGreaterThan(home.speed);
    });
});
