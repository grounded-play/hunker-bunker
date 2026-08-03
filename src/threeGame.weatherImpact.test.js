import { describe, expect, it } from 'vitest';
import { CLIFF_TILE, EXTERIOR_CANYON_TILE, ThreeGame } from './threeGame.js';

describe('weather surface collision and puddle behavior', () => {
    it('detects canyon abyss tiles (EXTERIOR_CANYON_TILE, CLIFF_TILE, holes) with negative fall height', () => {
        const game = Object.create(ThreeGame.prototype);
        game.getCachedTileType = (x, z) => {
            if (x === 0 && z === 0) return EXTERIOR_CANYON_TILE;
            if (x === 1 && z === 0) return CLIFF_TILE;
            if (x === 2 && z === 0) return '#';
            return '.';
        };
        game.isHoleTile = (x, z) => (x === 3 && z === 0);
        game.wallHeight = 2.8;

        // Canyon abyss / void
        expect(game.getWeatherSurfaceHeight(0, 0)).toEqual({ type: 'abyss', height: -15.0 });
        expect(game.getWeatherSurfaceHeight(1, 0)).toEqual({ type: 'abyss', height: -15.0 });
        expect(game.getWeatherSurfaceHeight(3, 0)).toEqual({ type: 'abyss', height: -15.0 });

        // Wall top
        expect(game.getWeatherSurfaceHeight(2, 0)).toEqual({ type: 'wall', height: 2.8 });

        // Standard floor
        expect(game.getWeatherSurfaceHeight(4, 0)).toEqual({ type: 'floor', height: 0.05 });
    });

    it('does not spawn intrusive dynamic grey circle puddles on the floor', () => {
        const game = Object.create(ThreeGame.prototype);
        game.player = { position: { x: 5, z: 5 } };
        game.scene = { add: () => {} };
        game.isRainWeatherActive = () => true;
        game.weather = { activeRainPuddles: 0 };
        game.dynamicPuddles = [];

        game.spawnRainPuddleNearPlayer();
        expect(game.dynamicPuddles.length).toBe(0);
    });
});
