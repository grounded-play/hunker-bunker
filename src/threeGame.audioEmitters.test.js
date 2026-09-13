import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Emitter placement + obstruction. No jsdom in this suite, so only the surface
// these two methods touch is stubbed.
function stub(overrides = {}) {
    return Object.assign(Object.create(ThreeGame.prototype), {
        player: { position: { x: 0, y: 0, z: 0 } },
        canOccupyPosition: () => true,
        ...overrides
    });
}

beforeEach(() => { globalThis.window = {}; });
afterEach(() => { delete globalThis.window; });

describe('audioAt', () => {
    it('adds world position while preserving the caller options', () => {
        const opts = stub().audioAt(4, -2, { volume: 0.5, playbackRate: 0.9 });
        expect(opts).toMatchObject({ worldX: 4, worldZ: -2, volume: 0.5, playbackRate: 0.9 });
    });

    it('passes non-finite positions through untouched rather than emitting NaN', () => {
        const extra = { volume: 0.5 };
        expect(stub().audioAt(NaN, 3, extra)).toBe(extra);
        expect(stub().audioAt(1, undefined, extra)).toBe(extra);
    });

    it('lets a caller override the obstruction it computed', () => {
        const game = stub({ canOccupyPosition: () => false });
        expect(game.audioAt(20, 0, { obstructed: false }).obstructed).toBe(false);
    });
});

describe('isAudioPathObstructed — raycast against world geometry', () => {
    // A stand-in for THREE.Raycaster's contract: set(), .far, intersectObjects().
    function rayStub(hits) {
        return stub({
            wallMeshes: [{}, {}],
            _audioRaycaster: {
                far: 0,
                set() {},
                // Real Raycaster honours `far`; a stub that ignores it cannot
                // test the back-off, so model the contract.
                intersectObjects() {
                    return hits.filter((hit) => hit.distance <= this.far);
                }
            },
            _audioRayOrigin: { set() {} },
            _audioRayDir: { set() {} }
        });
    }

    it('uses the wall meshes when they exist, not the collision fallback', () => {
        const game = rayStub([{ distance: 4 }]);
        // canOccupyPosition would say "clear"; the ray says blocked and wins.
        expect(game.isAudioPathObstructed(20, 0)).toBe(true);
    });

    it('is clear when the ray hits nothing', () => {
        expect(rayStub([]).isAudioPathObstructed(20, 0)).toBe(false);
    });

    it('stops short of the emitter, so a wall it stands against does not muffle it', () => {
        const game = rayStub([{ distance: 1 }]);
        // 1.6 apart: past the 1.5 near-guard but inside the 0.75 back-off.
        expect(game.isAudioPathObstructed(1.6, 0)).toBe(false);
    });

    it('falls back to collision sampling before the meshes are built', () => {
        const game = stub({ wallMeshes: [], canOccupyPosition: (x) => !(x > 9 && x < 11) });
        expect(game.isAudioPathObstructed(20, 0)).toBe(true);
    });
});

describe('isAudioPathObstructed', () => {
    it('never obstructs a very close emitter', () => {
        const game = stub({ canOccupyPosition: () => false });
        expect(game.isAudioPathObstructed(0.5, 0.5)).toBe(false);
    });

    it('is clear when every sample along the path is walkable', () => {
        expect(stub().isAudioPathObstructed(20, 0)).toBe(false);
    });

    it('is obstructed when the path crosses solid geometry', () => {
        // A wall band at x ~10 between listener and emitter.
        const game = stub({ canOccupyPosition: (x) => !(x > 9 && x < 11) });
        expect(game.isAudioPathObstructed(20, 0)).toBe(true);
    });

    it('does not treat geometry beyond the emitter as blocking', () => {
        const game = stub({ canOccupyPosition: (x) => !(x > 30) });
        expect(game.isAudioPathObstructed(20, 0)).toBe(false);
    });

    it('is inert without a player or collision function', () => {
        expect(stub({ player: null }).isAudioPathObstructed(20, 0)).toBe(false);
        expect(stub({ canOccupyPosition: undefined }).isAudioPathObstructed(20, 0)).toBe(false);
    });
});
