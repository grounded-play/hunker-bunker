import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// 2026-09-24 QA: the Meridian recruit sat stuck behind a wall and did nothing.

beforeEach(() => vi.stubGlobal('window', { dispatchEvent: () => true, AudioManager: { play: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());

// A wall at x = 5 from z = -4 to z = 4.
const isWall = (x, z) => x === 5 && z >= -4 && z <= 4;

function game(overrides = {}) {
    const g = {
        player: { position: { x: 9, y: 0, z: 0 } },
        scatterSprites: [],
        isSnailTileWalkable: (x, z) => !isWall(x, z),
        getTerrainHeightAt: () => 0,
        isEnemyType: () => true,
        applyPlayerDamageToEnemy: vi.fn(),
        spawnMuzzleFlash: vi.fn(),
        ...overrides
    };
    for (const method of ['stepCompanionAlongPath', 'hasCompanionFireLane', 'fireCompanionBasicShot']) g[method] = ThreeGame.prototype[method];
    return g;
}

function root(x, z) {
    return { position: { x, y: 0, z, set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; } }, rotation: { y: 0 } };
}

describe('the companion walks around walls', () => {
    it('reaches the player on the far side of a wall without passing through it or teleporting', () => {
        const g = game();
        const companion = { wanderer: { id: 'meridian_recruit' } };
        const body = root(2, 0);
        const goal = { x: 8, z: 0 };
        let maxJump = 0;
        for (let frame = 0; frame < 400; frame += 1) {
            const before = { ...body.position };
            g.stepCompanionAlongPath(companion, body, goal, 0.05);
            maxJump = Math.max(maxJump, Math.hypot(body.position.x - before.x, body.position.z - before.z));
            expect(isWall(Math.round(body.position.x), Math.round(body.position.z))).toBe(false);
            if (Math.hypot(goal.x - body.position.x, goal.z - body.position.z) < 0.4) break;
        }
        expect(Math.hypot(goal.x - body.position.x, goal.z - body.position.z)).toBeLessThan(0.4);
        // Walked, never relocated (a relocation would jump several tiles).
        expect(maxJump).toBeLessThan(0.5);
    });

    it('relocates behind the player only when there is no way through', () => {
        const sealed = (x, z) => Math.max(Math.abs(x - 2), Math.abs(z)) !== 2;
        const g = game({ isSnailTileWalkable: sealed });
        const companion = {};
        const body = root(2, 0);
        for (let frame = 0; frame < 200; frame += 1) g.stepCompanionAlongPath(companion, body, { x: 8, z: 0 }, 0.05);
        expect(body.position.x).toBeCloseTo(8);
    });
});

describe('the companion fights', () => {
    it('shoots the nearest hostile it can see, steadily', () => {
        const hostile = { position: { x: 4, z: 0 }, userData: { type: 'crawler' } };
        const g = game({ scatterSprites: [hostile] });
        const companion = {};
        const body = root(2, 0);
        let shots = 0;
        for (let frame = 0; frame < 60; frame += 1) if (g.fireCompanionBasicShot(companion, body, 0.05)) shots += 1;
        // 3 s of fire at one shot per 0.9 s.
        expect(shots).toBeGreaterThanOrEqual(3);
        expect(g.applyPlayerDamageToEnemy).toHaveBeenCalledWith(hostile, 1);
    });

    it('does not shoot through walls', () => {
        const hostile = { position: { x: 7, z: 0 }, userData: { type: 'crawler' } };
        const g = game({ scatterSprites: [hostile] });
        expect(g.fireCompanionBasicShot({}, root(3, 0), 1)).toBe(false);
    });
});
