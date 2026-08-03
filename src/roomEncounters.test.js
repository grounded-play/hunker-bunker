import { describe, expect, it } from 'vitest';
import { planRoomEncounter } from './roomEncounters.js';

describe('room encounters', () => {
    const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
    const baseRoom = {
        id: 'room',
        interior: [{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }],
        navigation: { doorLanes: [{ x: 3, y: 0 }] },
        populationPlan: { reserved: [] }
    };

    it('keeps safe and medical profiles enemy-free', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            themeConfig: { encounterProfile: 'sterile' }
        }, grid, () => 0, { depthTier: 4 });
        expect(result.spawns).toEqual([]);
    });

    it('places required nest guards only on valid room interior', () => {
        const result = planRoomEncounter({
            ...baseRoom,
            themeConfig: { encounterProfile: 'bio-nest-guard' }
        }, grid, () => 0, { depthTier: 4 });
        expect(result.spawns.length).toBeGreaterThan(0);
        for (const spawn of result.spawns) {
            expect(baseRoom.interior).toContainEqual({ x: spawn.x, y: spawn.y });
        }
    });
});
