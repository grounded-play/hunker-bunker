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

    it('creates an in-world 3D anchor when room generation places an architectural piece', async () => {
        const { planRoomPopulation } = await import('./roomPopulation.js');
        const grid = Array.from({ length: 7 }, () => Array(7).fill('.'));
        const room = {
            id: 'command-chamber',
            role: 'generic',
            interior: Array.from({ length: 16 }, (_, index) => ({ x: 1 + (index % 4), y: 1 + Math.floor(index / 4) })),
            navigation: { doorLanes: [] },
            populationBudget: { signature: 0, large: { min: 1, max: 1 } },
            themeConfig: {
                signatureProps: [],
                largeProps: ['arch_bulkhead_frame']
            }
        };
        const plan = planRoomPopulation(room, grid, () => 0);
        const archPlacement = plan.placements.find((p) => p.type === 'arch_bulkhead_frame');
        expect(archPlacement).toBeDefined();

        const fakeGame = {
            scatterMaterials: {},
            scatterTextures: {},
            deferWorld3dReplacement: vi.fn()
        };
        const anchor = ThreeGame.prototype.createScatterInstance.call(fakeGame, {
            type: archPlacement.type,
            x: archPlacement.x,
            z: archPlacement.y,
            scale: 1,
            rotation: 0,
            elevation: 0,
            scatterKey: `room:${archPlacement.type}`
        });

        expect(anchor).not.toBeNull();
        expect(anchor.userData.isWorld3dOnly).toBe(true);
        expect(anchor.userData.type).toBe('arch_bulkhead_frame');
        expect(fakeGame.deferWorld3dReplacement).toHaveBeenCalledWith(anchor, 'arch_bulkhead_frame');
    });
});
