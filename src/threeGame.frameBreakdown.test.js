import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { createFrameProfiler } from './frameProfiler.js';

// Sprint 52 A1: the Deck logs showed frames slowing as a run explored, but not
// which system. Gameplay now writes a per-system breakdown every 10 s.
describe('frame breakdown in the session log', () => {
    function game() {
        const g = Object.create(ThreeGame.prototype);
        const enemy = new THREE.Sprite(); enemy.userData = { type: 'cybersnail' };
        const crate = new THREE.Sprite(); crate.userData = { type: 'prop_camp_crate' };
        Object.assign(g, {
            performanceProfile: 'gameplay',
            frameProfiler: createFrameProfiler(),
            scatterSprites: [enemy, crate],
            chunkMeshes: new Map([['0,0', {}], ['0,1', {}]]),
            isEnemyType: (type) => type === 'cybersnail',
            logFrameBreakdown: vi.fn()
        });
        return g;
    }

    it('turns the profiler on in gameplay and reports every 10 seconds', () => {
        const g = game();
        g.updateFrameBreakdownReport(1000);
        expect(g.frameProfiler.enabled).toBe(true);
        g.frameProfiler.beginFrame();
        g.frameProfiler.measure('updateScatter', () => {});
        g.frameProfiler.endFrame();
        g.updateFrameBreakdownReport(5000);
        expect(g.logFrameBreakdown).not.toHaveBeenCalled();
        g.updateFrameBreakdownReport(11_500);
        expect(g.logFrameBreakdown).toHaveBeenCalledTimes(1);
        expect(g.logFrameBreakdown.mock.calls[0][0].load).toEqual({ enemies: 1, props: 1, chunks: 2 });
    });

    it('stays off outside gameplay', () => {
        const g = game();
        g.performanceProfile = 'menu';
        g.updateFrameBreakdownReport(1000);
        expect(g.frameProfiler.enabled).toBe(false);
    });
});
