import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function game(wall) {
    return {
        player: { position: new THREE.Vector3(40, 0, 40) },
        playerForwardDir: new THREE.Vector2(1, 0),
        exploredTileSet: new Set(),
        hasWallBetween: vi.fn(() => wall),
        getFogOfWarVisibility: ThreeGame.prototype.getFogOfWarVisibility
    };
}

// 2026-10-16 profile: anything near the player inside the suit cone paid for
// the same wall raycast twice.
describe('fog-of-war visibility', () => {
    it('raycasts once for a target inside both the clear radius and the cone', () => {
        const open = game(false);
        expect(open.getFogOfWarVisibility(41, 40)).toBe(1);
        expect(open.hasWallBetween).toHaveBeenCalledTimes(1);

        const walled = game(true);
        const behindWall = walled.getFogOfWarVisibility(41, 40);
        expect(behindWall).toBeLessThan(1);
        expect(walled.hasWallBetween).toHaveBeenCalledTimes(1);
    });
});
