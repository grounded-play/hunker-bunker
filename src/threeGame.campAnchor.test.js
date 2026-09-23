import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

const TERRAIN_GROUND = 0;

function makeGame({ loadedChunks = new Map(), camps = [] } = {}) {
    return {
        chunkSize: 16,
        chunkCache: loadedChunks,
        camps,
        hasLoadedTerrainAt: ThreeGame.prototype.hasLoadedTerrainAt,
        getTerrainHeightAt: ThreeGame.prototype.getTerrainHeightAt,
        sampleTerrainHeight: ThreeGame.prototype.sampleTerrainHeight,
        reanchorUnanchoredCamps: ThreeGame.prototype.reanchorUnanchoredCamps
    };
}

function chunkWithHeight(height) {
    return { heightmap: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => height)) };
}

function fakeCamp(id, x, z) {
    return {
        id,
        revealed: true,
        pos: { x, z },
        groundY: TERRAIN_GROUND,
        getPosition: () => ({ x, z }),
        reveal: vi.fn(function (nx, nz, groundY) { this.groundY = groundY; })
    };
}

describe('terrain sampling tells the truth about what it knows', () => {
    it('reports an unloaded chunk as not anchored, not as ground level', () => {
        const game = makeGame();
        const sample = game.sampleTerrainHeight(200, 200);
        expect(sample.height).toBe(TERRAIN_GROUND);
        // The height is a fallback, and the caller can tell.
        expect(sample.anchored).toBe(false);
    });

    it('reports a loaded chunk as anchored', () => {
        const game = makeGame({ loadedChunks: new Map([['0,0', chunkWithHeight(4)]]) });
        expect(game.sampleTerrainHeight(2, 2)).toEqual({ height: 4, anchored: true });
    });

    it('treats a garbage position as unanchored rather than throwing', () => {
        const game = makeGame();
        expect(game.hasLoadedTerrainAt(Number.NaN, 0)).toBe(false);
        expect(() => game.sampleTerrainHeight(undefined, undefined)).not.toThrow();
    });
});

describe('camps revealed before their chunk exists', () => {
    // The reported bug: Camp Meridian appears after the first boss and is
    // invisible, because it anchored to the fallback height while its chunk was
    // still unloaded and nothing ever corrected it.
    it('re-anchors a camp once its terrain streams in', () => {
        const camp = fakeCamp('camp_meridian', 40, 40);
        camp._groundAnchored = false;
        const loaded = new Map();
        const game = makeGame({ loadedChunks: loaded, camps: [camp] });

        // Chunk absent: nothing to do yet, and the camp is left alone.
        expect(game.reanchorUnanchoredCamps()).toBe(0);
        expect(camp.reveal).not.toHaveBeenCalled();

        loaded.set('2,2', chunkWithHeight(6));
        expect(game.reanchorUnanchoredCamps()).toBe(1);
        expect(camp.reveal).toHaveBeenCalledWith(40, 40, 6);
        expect(camp.groundY).toBe(6);
    });

    it('re-anchors each camp once, not every frame', () => {
        const camp = fakeCamp('camp_tallow', 40, 40);
        camp._groundAnchored = false;
        const game = makeGame({
            loadedChunks: new Map([['2,2', chunkWithHeight(3)]]),
            camps: [camp]
        });
        expect(game.reanchorUnanchoredCamps()).toBe(1);
        expect(game.reanchorUnanchoredCamps()).toBe(0);
        expect(camp.reveal).toHaveBeenCalledTimes(1);
    });

    it('leaves a correctly anchored camp untouched', () => {
        const camp = fakeCamp('camp_vesper', 40, 40);
        camp._groundAnchored = true;
        const game = makeGame({
            loadedChunks: new Map([['2,2', chunkWithHeight(9)]]),
            camps: [camp]
        });
        expect(game.reanchorUnanchoredCamps()).toBe(0);
        expect(camp.reveal).not.toHaveBeenCalled();
    });

    it('ignores camps that have not been revealed yet', () => {
        const camp = fakeCamp('camp_meridian', 40, 40);
        camp.revealed = false;
        camp._groundAnchored = false;
        const game = makeGame({
            loadedChunks: new Map([['2,2', chunkWithHeight(5)]]),
            camps: [camp]
        });
        expect(game.reanchorUnanchoredCamps()).toBe(0);
    });

    it('survives an empty world', () => {
        expect(makeGame().reanchorUnanchoredCamps()).toBe(0);
    });
});
