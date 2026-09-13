import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame player depenetration', () => {
    let game;

    beforeEach(() => {
        globalThis.window = globalThis.window || {};
        globalThis.window.hbLog = vi.fn();
        game = Object.create(ThreeGame.prototype);
        game.player = new THREE.Object3D();
        game.player.position.set(10, 0, 10);
        game.noclip = false;
        game.isPlayerOverAnyHole = vi.fn().mockReturnValue(false);
    });

    it('leaves a valid player position untouched', () => {
        game.canOccupyPosition = vi.fn().mockReturnValue(true);

        expect(game.resolvePlayerDepenetration()).toBe(false);
        expect(game.player.position.toArray()).toEqual([10, 0, 10]);
        expect(game.canOccupyPosition).toHaveBeenCalledTimes(1);
    });

    it('moves an overlapping player to the nearest safe position', () => {
        game.canOccupyPosition = vi.fn((x, z) => Math.hypot(x - 10, z - 10) >= 0.7);

        expect(game.resolvePlayerDepenetration()).toBe(true);
        expect(Math.hypot(game.player.position.x - 10, game.player.position.z - 10)).toBeLessThan(1);
        expect(game.canOccupyPosition(game.player.position.x, game.player.position.z)).toBe(true);
        expect(window.hbLog).toHaveBeenCalledWith(
            'PLAYER',
            'warn',
            'depenetrated',
            expect.any(Object)
        );
    });

    it('never resolves onto a hole even when collision clearance permits it', () => {
        game.canOccupyPosition = vi.fn((x, z) => Math.hypot(x - 10, z - 10) >= 0.2);
        game.isPlayerOverAnyHole = vi.fn((x) => x > 10);

        expect(game.resolvePlayerDepenetration()).toBe(true);
        expect(game.isPlayerOverAnyHole(game.player.position.x, game.player.position.z)).toBe(false);
    });

    it('stays put and reports exhaustion when no nearby position is safe', () => {
        game.canOccupyPosition = vi.fn().mockReturnValue(false);

        expect(game.resolvePlayerDepenetration()).toBe(false);
        expect(game.player.position.toArray()).toEqual([10, 0, 10]);
        expect(window.hbLog).toHaveBeenCalledWith(
            'PLAYER',
            'warn',
            'depenetration-no-safe-position',
            { x: 10, z: 10 }
        );
    });
});
