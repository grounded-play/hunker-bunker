import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame architectural placement routing', () => {
    it.each(['arch_bulkhead_frame', 'state_wall_breached_01', 'fixture_clock_dead'])(
        'creates a world-3D anchor for %s without requiring a sprite material',
        (type) => {
            const fakeGame = {
                scatterMaterials: {},
                scatterTextures: {},
                deferWorld3dReplacement: vi.fn()
            };
            const placement = {
                type,
                x: 12,
                z: 8,
                scale: 1,
                rotation: 0.4,
                elevation: 0,
                scatterKey: `test:${type}`
            };

            const anchor = ThreeGame.prototype.createScatterInstance.call(fakeGame, placement);

            expect(anchor).not.toBeNull();
            expect(anchor.userData.isWorld3dOnly).toBe(true);
            expect(anchor.userData.type).toBe(type);
            expect(anchor.position.x).toBe(12);
            expect(anchor.position.z).toBe(8);
            expect(fakeGame.deferWorld3dReplacement).toHaveBeenCalledWith(anchor, type);
        }
    );
});
