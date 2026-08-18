import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// getHoleCutForLandform is the single source of truth mountChunk's render
// pass and isHoleTile's collision/fall-hazard pass both call — the bug
// this fixes ("holes are in the door") was these two paths each hardcoding
// their own copy of these thresholds and drifting apart. It only reads its
// argument, so it's callable without a full ThreeGame instance.
function holeCutFor(landform) {
    return ThreeGame.prototype.getHoleCutForLandform.call({}, landform);
}

function makeAllWallGrid(size = 19) {
    return Array.from({ length: size }, () => Array(size).fill('#'));
}

function makeFakeHoleGame() {
    const chunkSize = 19;
    const grid = makeAllWallGrid(chunkSize);
    const fakeThis = {
        chunkSize,
        chunkCache: new Map([['0,0', grid]]),
        _chunkLandformCache: new Map(),
        getOrCreateChunk: () => grid,
        getChunkLandform: () => 'maze',
        hashTile: ThreeGame.prototype.hashTile,
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getTileType: ThreeGame.prototype.getTileType,
        getCachedTileType: ThreeGame.prototype.getCachedTileType,
        getHoleCutForLandform: ThreeGame.prototype.getHoleCutForLandform,
        getHoleVisualInfo: ThreeGame.prototype.getHoleVisualInfo
    };
    return fakeThis;
}

function findFirstHole(fakeThis) {
    for (let y = 0; y < fakeThis.chunkSize; y += 1) {
        for (let x = 0; x < fakeThis.chunkSize; x += 1) {
            const rng = fakeThis.createSeededRandom(fakeThis.hashTile(x, y) + 999);
            if (rng() < fakeThis.getHoleCutForLandform('maze')) {
                return { x, y };
            }
        }
    }
    throw new Error('Expected at least one deterministic maze hole in the test chunk.');
}

describe('getHoleCutForLandform', () => {
    it('matches the exact per-landform thresholds mountChunk renders with', () => {
        expect(holeCutFor('maze')).toBe(0.08);
        expect(holeCutFor('ruins')).toBe(0.08);
        expect(holeCutFor('field')).toBe(0.03);
        expect(holeCutFor('canyon')).toBe(0.0);
        // Regression: crater used to fall through to the generic 0.06/0.22
        // fallback (missing from this table even though every other
        // per-landform density table in threeGame.js explicitly tunes
        // crater), giving it a 16% hazard-wall roll window instead of the
        // ~3-4% every named landform gets -- confirmed live via mountChunk
        // producing 100+ individual animated hazard-wall meshes in a single
        // crater chunk.
        expect(holeCutFor('crater')).toBe(0.05);
        expect(holeCutFor(undefined)).toBe(0.06);
    });
});

describe('isHoleTile / mountChunk agreement', () => {
    it('rolls the same seeded value both call sites would compare against the same threshold', () => {
        // Both mountChunk and isHoleTile derive their roll from
        // hashTile(worldX, worldY) + 999 via createSeededRandom — confirm
        // that derivation is deterministic and reused correctly by
        // isHoleTile, which is the actual code path under test here.
        const fakeThis = makeFakeHoleGame();

        const isHole = ThreeGame.prototype.isHoleTile.call(fakeThis, 5, 5);
        // Independently recompute what the threshold-aware roll should be.
        const rng = fakeThis.createSeededRandom(fakeThis.hashTile(5, 5) + 999);
        const expectedHole = rng() < fakeThis.getHoleCutForLandform('maze');

        expect(isHole).toBe(expectedHole);
    });

    it('returns the shared visual scale, rotation, and fall radius for pit hazards', () => {
        const fakeThis = makeFakeHoleGame();
        const hole = findFirstHole(fakeThis);

        const rng = fakeThis.createSeededRandom(fakeThis.hashTile(hole.x, hole.y) + 999);
        const roll = rng();
        const expectedScale = (1.5 + (roll / fakeThis.getHoleCutForLandform('maze')) * 2.5) * 0.5;
        const expectedRotation = rng() * Math.PI * 2;

        const holeInfo = ThreeGame.prototype.getHoleVisualInfo.call(fakeThis, hole.x, hole.y);

        expect(holeInfo).toMatchObject({
            x: hole.x,
            z: hole.y
        });
        expect(holeInfo.scale).toBeCloseTo(expectedScale);
        expect(holeInfo.rotationZ).toBeCloseTo(expectedRotation);
        expect(holeInfo.fallRadius).toBeCloseTo(expectedScale * 0.16);
    });

    it('uses cached chunks when radar scans for pit danger outlines', () => {
        const fakeThis = makeFakeHoleGame();
        const hole = findFirstHole(fakeThis);
        const pingedIds = new Set();
        fakeThis.spawnHoleDangerOutline = vi.fn();

        ThreeGame.prototype.scanDangerHoles.call(fakeThis, hole.x, hole.y, 0.1, pingedIds);

        expect(fakeThis.spawnHoleDangerOutline).toHaveBeenCalled();
        expect(pingedIds.has(`hole:${hole.x},${hole.y}`)).toBe(true);

        const callCount = fakeThis.spawnHoleDangerOutline.mock.calls.length;
        ThreeGame.prototype.scanDangerHoles.call(fakeThis, hole.x, hole.y, 0.1, pingedIds);

        expect(fakeThis.spawnHoleDangerOutline).toHaveBeenCalledTimes(callCount);
    });

    it('allows filling hole tiles, marking them safe, walkable, and updating state', () => {
        const fakeThis = makeFakeHoleGame();
        fakeThis.getWallKey = ThreeGame.prototype.getWallKey;
        fakeThis.isHoleTile = ThreeGame.prototype.isHoleTile;
        fakeThis.isFilledHoleTile = ThreeGame.prototype.isFilledHoleTile;
        fakeThis.canOccupyPosition = ThreeGame.prototype.canOccupyPosition;
        fakeThis.overlapsWall = ThreeGame.prototype.overlapsWall;
        fakeThis.isSnailTileWalkable = ThreeGame.prototype.isSnailTileWalkable;
        const hole = findFirstHole(fakeThis);

        expect(fakeThis.isHoleTile(hole.x, hole.y)).toBe(true);

        const filled = ThreeGame.prototype.fillHoleAt.call(fakeThis, hole.x, hole.y);

        expect(filled).toBe(true);
        expect(fakeThis.filledHoleKeys.has(`${hole.x},${hole.y}`)).toBe(true);
        expect(fakeThis.isHoleTile(hole.x, hole.y)).toBe(false);
        expect(fakeThis.isFilledHoleTile(hole.x, hole.y)).toBe(true);
        expect(fakeThis.canOccupyPosition(hole.x, hole.y)).toBe(true);
        expect(fakeThis.isSnailTileWalkable(hole.x, hole.y)).toBe(true);
    });

    it('defaults enemy X-ray ghost to natural sprite material color instead of red injury tint', () => {
        const fakeThis = {
            scene: { add: vi.fn() },
            transientEffects: []
        };
        const sprite = {
            isSprite: true,
            scale: { copy: vi.fn() },
            position: { copy: vi.fn() },
            material: {
                map: {},
                color: { getHex: () => 0xffffff }
            }
        };

        ThreeGame.prototype.spawnEnemyXrayGhost.call(fakeThis, sprite);

        expect(fakeThis.scene.add).toHaveBeenCalled();
        const createdGhost = fakeThis.scene.add.mock.calls[0][0];
        expect(createdGhost.material.color.getHex()).toBe(0xffffff);
    });
});

describe('interactWithPocketClimbPoint', () => {
    // pocket.climbPoint is in pocket-grid-local space (0..size-1), not world
    // space — the same offset math mountPocket uses to place the group
    // (worldX = holeWorldX - centerCell.x + gridX) has to convert it before
    // comparing against the player's world position. With centerCell (5,5)
    // and climbPoint (9,5), a hole at world (10,20) puts the climb point at
    // world (10 - 5 + 9, 20 - 5 + 5) = (14, 20).
    function makePocketCacheEntry() {
        return new Map([['10,20', {
            climbPoint: { x: 9, y: 5 },
            centerCell: { x: 5, y: 5 }
        }]]);
    }

    it('does nothing when not in a pocket', () => {
        const fakeThis = { isInPocket: false, exitPocket: vi.fn() };
        const result = ThreeGame.prototype.interactWithPocketClimbPoint.call(fakeThis);
        expect(result).toBe(false);
        expect(fakeThis.exitPocket).not.toHaveBeenCalled();
    });

    it('calls exitPocket when standing near the climb point in world space', () => {
        const fakeThis = {
            isInPocket: true,
            player: { position: { x: 14, z: 20 } }, // the converted world position, see note above
            pocketCache: makePocketCacheEntry(),
            _pocketHoleX: 10,
            _pocketHoleZ: 20,
            getWallKey: ThreeGame.prototype.getWallKey,
            exitPocket: vi.fn()
        };
        const result = ThreeGame.prototype.interactWithPocketClimbPoint.call(fakeThis);
        expect(result).toBe(true);
        expect(fakeThis.exitPocket).toHaveBeenCalled();
    });

    it('does nothing when in a pocket but too far from the climb point', () => {
        const fakeThis = {
            isInPocket: true,
            player: { position: { x: 0, z: 0 } }, // far from world (14, 20)
            pocketCache: makePocketCacheEntry(),
            _pocketHoleX: 10,
            _pocketHoleZ: 20,
            getWallKey: ThreeGame.prototype.getWallKey,
            exitPocket: vi.fn()
        };
        const result = ThreeGame.prototype.interactWithPocketClimbPoint.call(fakeThis);
        expect(result).toBe(false);
        expect(fakeThis.exitPocket).not.toHaveBeenCalled();
    });
});
