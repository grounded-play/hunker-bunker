# Survivable Falls & Under-Layer Pockets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the instant-kill hole/pit hazard with a survivable fall into a small generated pocket, gated by a persistent upgrade that lets a player survive a second fall in the same run.

**Architecture:** Reuses the existing fall animation, chunk-caching pattern, seeded-RNG-with-runEntropy convention, and `ThreeGame.prototype.method.call(fakeThis, ...)` test style already established in this codebase. No new rendering pipeline, no new collision axis — a pocket is an ordinary small grid rendered as ordinary geometry at a fixed lower world Y, and the player's own Y coordinate is the only thing that changes.

**Tech Stack:** Vanilla JS + Three.js (no framework), Vitest for unit tests, Playwright for the final in-browser verification pass.

## Global Constraints

- Every damage value must be a whole number: `Math.max(1, Math.round(...))`, never a raw/fractional result (repo-wide rule as of this branch's last stabilization pass).
- Every new seeded-random call must fold in `runEntropy`: `createSeededRandom((this.hashTile(x, y) ^ this.runEntropy) >>> 0)` — never `hashTile` alone — so content varies per run, not just by location.
- No new persistent collision/render axis. Reuse existing X/Z collision (`canOccupyPosition`, `isSnailTileWalkable`) and existing wall/floor mesh/material conventions (`this.wallMaterial`, `this.floorMaterial`, `this.wallGeometry`, `configureWallMesh`).
- All new `ThreeGame` methods are tested via `ThreeGame.prototype.method.call(fakeThis, ...)` against a minimal object literal — never a real WebGL/DOM context (see `src/threeGame.holeTiles.test.js`, `src/threeGame.chunkVariation.test.js` for the established pattern).
- Base player max HP is `BASE_HEARTS = 3` (`src/threeGame.js:131`) — fall damage values are chosen against that scale, not arbitrarily.

---

### Task 1: Farthest-floor-cell BFS helper

**Files:**
- Modify: `src/landforms.js`
- Test: `src/landforms.test.js`

**Interfaces:**
- Produces: `findFarthestFloorCell(grid, startX, startY)` — exported function. `grid` is an array-of-arrays of `'#'`/`'.'` cells (same shape `buildChunk` produces). Returns `{ x, y, distance }` for the floor cell reachable from `(startX, startY)` with the greatest shortest-path distance (BFS, 4-directional), or `null` if `(startX, startY)` isn't itself an open floor cell. Later tasks use this to place the pocket's climb-up point.

- [ ] **Step 1: Write the failing test**

Add to `src/landforms.test.js` (after the existing `describe('connectPortalsInward', ...)` block):

```js
import { findFarthestFloorCell } from './landforms.js';

describe('findFarthestFloorCell', () => {
    function makeOpenGrid(size) {
        return Array.from({ length: size }, () => Array(size).fill('.'));
    }

    it('returns null when the start cell is not open floor', () => {
        const grid = makeOpenGrid(5);
        grid[2][2] = '#';
        expect(findFarthestFloorCell(grid, 2, 2)).toBeNull();
    });

    it('finds the corner farthest from the center in an open room', () => {
        const grid = makeOpenGrid(9);
        const result = findFarthestFloorCell(grid, 4, 4);
        expect(result).not.toBeNull();
        // Every corner is equidistant (Manhattan-BFS) at distance 8 from center.
        expect(result.distance).toBe(8);
        expect([0, 8]).toContain(result.x);
        expect([0, 8]).toContain(result.y);
    });

    it('routes around walls instead of returning straight-line distance', () => {
        // A single row gap forces a detour around a dividing wall.
        const grid = makeOpenGrid(5);
        for (let y = 0; y < 5; y += 1) grid[y][2] = '#';
        grid[4][2] = '.'; // one gap at the bottom row
        const result = findFarthestFloorCell(grid, 0, 0);
        expect(result).toEqual({ x: 4, y: 0, distance: 12 });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/landforms.test.js -t "findFarthestFloorCell"`
Expected: FAIL — `findFarthestFloorCell is not a function` (not exported yet).

- [ ] **Step 3: Write minimal implementation**

Add to `src/landforms.js`, near `reachableFloorCells` (after its closing brace, around line 124):

```js
export function findFarthestFloorCell(grid, startX, startY) {
    if (grid[startY]?.[startX] !== '.') return null;

    const seen = new Set([`${startX},${startY}`]);
    let queue = [{ x: startX, y: startY, distance: 0 }];
    let farthest = { x: startX, y: startY, distance: 0 };

    while (queue.length) {
        const next = [];
        for (const cell of queue) {
            if (cell.distance > farthest.distance) farthest = cell;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cell.x + dx;
                const ny = cell.y + dy;
                const key = `${nx},${ny}`;
                if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[ny].length) continue;
                if (grid[ny][nx] !== '.' || seen.has(key)) continue;
                seen.add(key);
                next.push({ x: nx, y: ny, distance: cell.distance + 1 });
            }
        }
        queue = next;
    }

    return farthest;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/landforms.test.js -t "findFarthestFloorCell"`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/landforms.js src/landforms.test.js
git commit -m "feat: add findFarthestFloorCell BFS helper for pocket climb points"
```

---

### Task 2: "Impact Dampeners" fall-hardening upgrade

**Files:**
- Modify: `src/bank.js`
- Test: `src/bank.test.js`

**Interfaces:**
- Produces: `TIER2_UPGRADE_ORDER` includes `'fallHardening'`; `TIER2_UPGRADE_CONFIGS.fallHardening` follows the exact shape of `stimCache`/`deconFilters`. Later tasks read it via `this.bank?.getState?.()?.tier2Unlocks?.fallHardening` — the exact same pattern already used for `suitThermal`/`deconFilters`/`stimCache` in `src/threeGame.js`.

- [ ] **Step 1: Write the failing test**

Add to `src/bank.test.js` (inside the existing `describe('BankManager', ...)` block, near the other tier2/goal tests):

```js
    it('exposes fallHardening as a tier-2 upgrade gated behind the reactor compressor', () => {
        expect(TIER2_UPGRADE_ORDER).toContain('fallHardening');
        expect(TIER2_UPGRADE_CONFIGS.fallHardening).toMatchObject({
            key: 'fallHardening',
            prereq: 'reactorCompressor'
        });
        expect(TIER2_UPGRADE_CONFIGS.fallHardening.cost.tech).toBeGreaterThan(0);
    });
```

Add `TIER2_UPGRADE_ORDER, TIER2_UPGRADE_CONFIGS` to the existing import line at the top of `src/bank.test.js`:

```js
import { BankManager, FOUNDRY_ACTIVATION_COST, GOAL_COSTS, O2_GENERATOR_UPGRADES, shellPriceOf, TIER2_UPGRADE_ORDER, TIER2_UPGRADE_CONFIGS } from './bank.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/bank.test.js -t "fallHardening"`
Expected: FAIL — `expect(received).toContain(expected)` with `fallHardening` not in the array.

- [ ] **Step 3: Write minimal implementation**

In `src/bank.js`, modify `TIER2_UPGRADE_ORDER` (line 285-289):

```js
export const TIER2_UPGRADE_ORDER = Object.freeze([
    'suitThermal',
    'deconFilters',
    'stimCache',
    'fallHardening'
]);
```

And add to `TIER2_UPGRADE_CONFIGS` (inside the object, after `stimCache`, before the closing `});` at line 316):

```js
    fallHardening: Object.freeze({
        key: 'fallHardening',
        label: 'IMPACT DAMPENERS',
        desc: 'Halves fall damage — survive a second fall through a hole in the same run.',
        cost: Object.freeze({ tech: 70, coin: 18 }),
        prereq: 'reactorCompressor'
    })
```

Also add `fallHardening: false` to `createDefaultState()`'s `tier2Unlocks` object (near line 342-345, alongside `suitThermal`/`deconFilters`) — check the exact current keys there first (`stimCache` may or may not already be listed) and add `fallHardening: false` following the same style.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/bank.test.js -t "fallHardening"`
Expected: PASS

Then run the full bank suite to confirm nothing else assumes a fixed `TIER2_UPGRADE_ORDER` length: `npx vitest run src/bank.test.js`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bank.js src/bank.test.js
git commit -m "feat: add IMPACT DAMPENERS fall-hardening tier-2 upgrade"
```

---

### Task 3: Whole-number fall damage, gated by iFrames and the new upgrade

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.damageRounding.test.js`

**Interfaces:**
- Consumes: `TIER2_UPGRADE_CONFIGS`/`tier2Unlocks.fallHardening` from Task 2 (already read via `this.bank?.getState?.()`, no new import needed — `BankManager` is already imported in `src/threeGame.js`).
- Produces: `ThreeGame.prototype.resolveFallDamage()` — returns a whole-number damage amount, halved (still whole, floored at 1) when `fallHardening` is unlocked. `takeDamage` gains a `reason === 'fall'` path that (unlike `'abyss'`) respects `iFrameTimer`, and a new `this.isInPocket` guard that blocks all damage while a player is inside a pocket (added in Task 6, but the guard clause itself is added here since it lives in `takeDamage`). Task 6 consumes `resolveFallDamage()`.

- [ ] **Step 1: Write the failing test**

Add to `src/threeGame.damageRounding.test.js` (new `describe` block at the end):

```js
describe('resolveFallDamage — whole-number, upgrade-gated', () => {
    it('returns the base fall damage when fallHardening is not unlocked', () => {
        const fakeThis = { bank: { getState: () => ({ tier2Unlocks: {} }) } };
        const damage = ThreeGame.prototype.resolveFallDamage.call(fakeThis);
        expect(Number.isInteger(damage)).toBe(true);
        expect(damage).toBe(2);
    });

    it('halves fall damage (still a whole number) when fallHardening is unlocked', () => {
        const fakeThis = { bank: { getState: () => ({ tier2Unlocks: { fallHardening: true } }) } };
        const damage = ThreeGame.prototype.resolveFallDamage.call(fakeThis);
        expect(Number.isInteger(damage)).toBe(true);
        expect(damage).toBe(1);
    });

    it('never returns less than 1 even with no bank attached', () => {
        const fakeThis = {};
        const damage = ThreeGame.prototype.resolveFallDamage.call(fakeThis);
        expect(damage).toBeGreaterThanOrEqual(1);
    });
});

describe('takeDamage — fall reason respects iFrames, abyss does not', () => {
    function makeFakeThisForTakeDamage(overrides = {}) {
        return {
            isPlayerDead: false,
            godMode: false,
            cinematicLock: false,
            _abilityImmune: false,
            iFrameTimer: 1.0,
            missionState: { status: 'active' },
            isInPocket: false,
            playerVitals: { hp: 3, maxHp: 3 },
            showDirectionalHitIndicator: () => {},
            ...overrides
        };
    }

    it('a fall reason is blocked while iFrameTimer is active, unlike abyss', () => {
        const fallThis = makeFakeThisForTakeDamage();
        ThreeGame.prototype.takeDamage.call(fallThis, 2, 'fall');
        expect(fallThis.playerVitals.hp).toBe(3); // blocked by iFrames

        const abyssThis = makeFakeThisForTakeDamage();
        ThreeGame.prototype.takeDamage.call(abyssThis, 2, 'abyss');
        expect(abyssThis.playerVitals.hp).toBe(1); // abyss bypasses iFrames
    });

    it('blocks all damage while isInPocket is true', () => {
        const fakeThis = makeFakeThisForTakeDamage({ iFrameTimer: 0, isInPocket: true });
        ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'hazard');
        expect(fakeThis.playerVitals.hp).toBe(3);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.damageRounding.test.js -t "resolveFallDamage"`
Expected: FAIL — `ThreeGame.prototype.resolveFallDamage is not a function`.

Run: `npx vitest run src/threeGame.damageRounding.test.js -t "isInPocket"`
Expected: FAIL — `hp` drops to `1`, not `3` (guard doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Add a new constant near `PROJECTILE_DAMAGE` (`src/threeGame.js:210`):

```js
const FALL_DAMAGE_BASE = 2;
```

Add `resolveFallDamage()` as a new method on `ThreeGame` (place it directly above `takeDamage`, currently at `src/threeGame.js:10056`):

```js
    resolveFallDamage() {
        const hardened = Boolean(this.bank?.getState?.()?.tier2Unlocks?.fallHardening);
        const raw = hardened ? FALL_DAMAGE_BASE / 2 : FALL_DAMAGE_BASE;
        return Math.max(1, Math.round(raw));
    }
```

Modify `takeDamage` (`src/threeGame.js:10056-10065` before this plan's edits — re-locate by matching this exact current body) to add the pocket guard and respect iFrames for `'fall'` the same way it already does for every reason except `'abyss'`:

```js
    takeDamage(amount = 1, reason = 'hazard', sourceX = null, sourceZ = null) {
        if (this.isPlayerDead) return;
        if (this.godMode) return;
        if (this.cinematicLock) return; // untouchable during scripted sequences
        if (this._abilityImmune) return;
        if (this.isInPocket) return; // untouchable while resolving a fall inside a pocket
        if (this.iFrameTimer > 0 && reason !== 'abyss') return;
        if (this.missionState?.status === 'inactive') return;
        const previousHp = this.playerVitals.hp;
        const damage = Math.max(0, Math.round(amount));
        this.playerVitals.hp = Math.max(0, this.playerVitals.hp - damage);
        if (this.playerVitals.hp === previousHp) return;

        if (sourceX != null && sourceZ != null) {
            this.showDirectionalHitIndicator(sourceX, sourceZ);
        }
```

(Only the new `if (this.isInPocket) return;` line is added — the rest of the method body is unchanged from its current state.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/threeGame.damageRounding.test.js`
Expected: all PASS, including the 5 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js src/threeGame.damageRounding.test.js
git commit -m "feat: add resolveFallDamage and an isInPocket damage guard"
```

---

### Task 4: Pocket grid generation

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.chunkVariation.test.js`

**Interfaces:**
- Consumes: `findFarthestFloorCell` (Task 1, import from `./landforms.js`), the existing `carveCell`/`carvePassage`/`shuffleDirections`/`createSeededRandom`/`hashTile`/`getWallKey`/`runEntropy` methods.
- Produces: `ThreeGame.prototype.generatePocket(holeWorldX, holeWorldZ)` — returns `{ grid, size, centerCell, climbPoint: { x, y } }` (grid coordinates, not world coordinates). Caches by `getWallKey(holeWorldX, holeWorldZ)` in `this.pocketCache` (a `Map`, initialized in the constructor). Task 5 (mounting) and Task 6 (orchestration) consume this return shape.

- [ ] **Step 1: Write the failing test**

Add to `src/threeGame.chunkVariation.test.js` (new `describe` block at the end, reusing the file's existing `makeFakeChunkGame` helper — extend it to also carry `getWallKey`, `pocketCache`, and `findFarthestFloorCell`... actually `findFarthestFloorCell` is a plain import used directly by `generatePocket`, not a `this` method, so no fakeThis wiring needed for it):

```js
import { findFarthestFloorCell } from './landforms.js';

describe('generatePocket — per-hole, per-run pocket layout', () => {
    // POCKET_CELL_COUNT is 5 (an odd cell-count, like the real chunk carve's
    // chunkCellCount=9) so the DFS start cell lands exactly on the grid's
    // true center — see the worked arithmetic in this task's implementation
    // note. Grid size = 5*2+1 = 11.
    function makePocketFakeGame(runEntropy) {
        return {
            runEntropy,
            globalSeedOffset: 0,
            pocketCache: new Map(),
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            carveCell: ThreeGame.prototype.carveCell,
            carvePassage: ThreeGame.prototype.carvePassage,
            shuffleDirections: ThreeGame.prototype.shuffleDirections,
            getWallKey: ThreeGame.prototype.getWallKey
        };
    }

    it('is deterministic for a fixed runEntropy and hole location', () => {
        const gameA = makePocketFakeGame(42);
        const gameB = makePocketFakeGame(42);
        const pocketA = ThreeGame.prototype.generatePocket.call(gameA, 10, 20);
        const pocketB = ThreeGame.prototype.generatePocket.call(gameB, 10, 20);
        expect(pocketA.grid.map((r) => r.join('')).join('\n'))
            .toBe(pocketB.grid.map((r) => r.join('')).join('\n'));
        expect(pocketA.climbPoint).toEqual(pocketB.climbPoint);
    });

    it('differs across runEntropy for the same hole location', () => {
        const gameA = makePocketFakeGame(1);
        const gameB = makePocketFakeGame(999999);
        const pocketA = ThreeGame.prototype.generatePocket.call(gameA, 10, 20);
        const pocketB = ThreeGame.prototype.generatePocket.call(gameB, 10, 20);
        expect(pocketA.grid.map((r) => r.join('')).join('\n'))
            .not.toBe(pocketB.grid.map((r) => r.join('')).join('\n'));
    });

    it('caches by hole location, returning the same pocket on a second fall', () => {
        const game = makePocketFakeGame(7);
        const first = ThreeGame.prototype.generatePocket.call(game, 5, 5);
        const second = ThreeGame.prototype.generatePocket.call(game, 5, 5);
        expect(second).toBe(first); // same object identity, not just equal content
    });

    it('places the player-entry center cell as open floor, and a valid, distinct climb point', () => {
        const game = makePocketFakeGame(3);
        const pocket = ThreeGame.prototype.generatePocket.call(game, 0, 0);
        expect(pocket.grid[pocket.centerCell.y][pocket.centerCell.x]).toBe('.');
        expect(pocket.grid[pocket.climbPoint.y][pocket.climbPoint.x]).toBe('.');
        expect(pocket.climbPoint).not.toEqual(pocket.centerCell);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.chunkVariation.test.js -t "generatePocket"`
Expected: FAIL — `ThreeGame.prototype.generatePocket is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add a new constant near `FALL_DAMAGE_BASE`. **This must stay odd** — `carveCell`/`carvePassage` work in half-density "cell space" (`grid position = cellIndex * 2 + 1`, see `src/threeGame.js:19291-19304`), and the DFS starts at `Math.floor(cellCount / 2)`. That expression only lands exactly on the grid's true center when `cellCount` is odd (verified against the real chunk carve: `chunkCellCount = 9`, `Math.floor(9/2) = 4`, `4*2+1 = 9` = the true center of a 19-wide grid). An even count would land one cell off-center — not broken, but needlessly imprecise:

```js
const POCKET_CELL_COUNT = 5; // odd — see note above. Grid size = 5*2+1 = 11.
```

Add `generatePocket` as a new `ThreeGame` method (place it near `buildChunk`, e.g. directly before it). Note the two coordinate spaces: the DFS loop works in **cell space** (`0..cellCount-1`), exactly mirroring `buildChunk`'s own loop; `centerCell` and everything returned from this method is in **grid space** (`0..size-1`), which is what `findFarthestFloorCell`, `mountPocket`, and the climb-interaction code all consume:

```js
    generatePocket(holeWorldX, holeWorldZ) {
        if (!this.pocketCache) this.pocketCache = new Map();
        const key = this.getWallKey(holeWorldX, holeWorldZ);
        if (this.pocketCache.has(key)) return this.pocketCache.get(key);

        const cellCount = POCKET_CELL_COUNT;
        const size = cellCount * 2 + 1;
        const grid = Array(size).fill(null).map(() => Array(size).fill('#'));
        const random = this.createSeededRandom(
            (this.hashTile(holeWorldX, holeWorldZ) ^ this.runEntropy) >>> 0
        );
        const startCell = Math.floor(cellCount / 2); // cell space
        const stack = [[startCell, startCell]];
        const visited = new Set([`${startCell},${startCell}`]);

        this.carveCell(grid, startCell, startCell);

        while (stack.length > 0) {
            const [cellX, cellY] = stack[stack.length - 1];
            const neighbors = this.shuffleDirections([
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
            ], random);
            let carved = false;
            for (const { dx, dy } of neighbors) {
                const nextX = cellX + dx;
                const nextY = cellY + dy;
                const nKey = `${nextX},${nextY}`;
                // Bound against cellCount (cell space), not size (grid space)
                // — matches buildChunk's own DFS bound exactly.
                if (nextX < 0 || nextX >= cellCount || nextY < 0 || nextY >= cellCount || visited.has(nKey)) continue;
                this.carvePassage(grid, cellX, cellY, nextX, nextY);
                visited.add(nKey);
                stack.push([nextX, nextY]);
                carved = true;
                break;
            }
            if (!carved) stack.pop();
        }

        const centerCell = { x: startCell * 2 + 1, y: startCell * 2 + 1 }; // grid space
        const climbPoint = findFarthestFloorCell(grid, centerCell.x, centerCell.y) ?? centerCell;
        const pocket = { grid, size, centerCell, climbPoint: { x: climbPoint.x, y: climbPoint.y } };
        this.pocketCache.set(key, pocket);
        return pocket;
    }
```

Add the import at the top of `src/threeGame.js` — extend the existing landforms import line (`src/threeGame.js:36`):

```js
import { LANDFORMS, pickLandform, applyLandform, applyRingRoadSystem, applyCanyonCollapse, connectPortalsInward, openMazeTerrain, generateHeightmapGrid, TERRAIN_HEIGHTS, findFarthestFloorCell } from './landforms.js';
```

Add `this.pocketCache = new Map();` to the constructor, alongside `this.chunkCache = new Map();` (`src/threeGame.js:742`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/threeGame.chunkVariation.test.js`
Expected: all PASS, including the 4 new tests.

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js src/threeGame.chunkVariation.test.js
git commit -m "feat: add generatePocket — seeded, cached, per-run pocket layout"
```

---

### Task 5: Mounting a pocket's geometry (walls, floor, loot, climb marker)

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.chunkVariation.test.js`

**Interfaces:**
- Consumes: `generatePocket` (Task 4), existing `this.wallGeometry`/`this.wallMaterial`/`this.floorGeometry`/`this.floorMaterial`/`configureWallMesh`/`createSnailDropPlacement`/`createPickupInstance`/`this.ventGeometry`/`this.ventMaterial`.
- Produces: `ThreeGame.prototype.mountPocket(holeWorldX, holeWorldZ)` — returns the mounted `THREE.Group`, cached in `this.pocketGroups` (a `Map`, keyed the same way as `pocketCache`). A new `LANDFORM_SHADER_ID.pocket = 5` entry and a matching tint branch in the wall shader's fragment code. Task 6 consumes `mountPocket`'s returned group and its world-position math.

- [ ] **Step 1: Write the failing test**

Add to `src/threeGame.chunkVariation.test.js`:

```js
describe('mountPocket — pocket geometry mounting', () => {
    function makeFakeThreeGameForMount() {
        return {
            pocketCache: new Map(),
            pocketGroups: new Map(),
            runEntropy: 123,
            globalSeedOffset: 0,
            wallHeight: 2,
            wallGeometry: {},
            wallMaterial: {},
            floorGeometry: {},
            floorMaterial: {},
            ventGeometry: {},
            ventMaterial: {},
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            carveCell: ThreeGame.prototype.carveCell,
            carvePassage: ThreeGame.prototype.carvePassage,
            shuffleDirections: ThreeGame.prototype.shuffleDirections,
            getWallKey: ThreeGame.prototype.getWallKey,
            generatePocket: ThreeGame.prototype.generatePocket,
            configureWallMesh: ThreeGame.prototype.configureWallMesh,
            getWallMaxHp: () => 8,
            createSnailDropPlacement: () => ({ worldX: 0, worldZ: 0, type: 'health', elevation: 0.2, offsetX: 0, offsetZ: 0, bobOffset: 0, rotation: 0, tiltX: 0, tiltZ: 0, scale: 0.8, shadowRadius: 0.24, collectLock: 0.34 }),
            createPickupInstance: () => ({ userData: {}, position: { set: () => {} } })
        };
    }

    it('mounts a group with a floor, at least one wall, and exactly one climb marker', () => {
        const fakeThis = makeFakeThreeGameForMount();
        const group = ThreeGame.prototype.mountPocket.call(fakeThis, 10, 10);

        expect(group.children.length).toBeGreaterThan(0);
        const climbMarkers = group.children.filter((c) => c.userData?.isPocketClimbPoint);
        expect(climbMarkers.length).toBe(1);
    });

    it('caches the mounted group by hole location', () => {
        const fakeThis = makeFakeThreeGameForMount();
        const first = ThreeGame.prototype.mountPocket.call(fakeThis, 3, 3);
        const second = ThreeGame.prototype.mountPocket.call(fakeThis, 3, 3);
        expect(second).toBe(first);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.chunkVariation.test.js -t "mountPocket"`
Expected: FAIL — `ThreeGame.prototype.mountPocket is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add the shader-tint ID next to the existing `LANDFORM_SHADER_ID` map (`src/threeGame.js`, added earlier in this branch alongside `WALL_HP_CANYON_BONUS`):

```js
const LANDFORM_SHADER_ID = {
    [LANDFORMS.MAZE]: 0,
    [LANDFORMS.FIELD]: 1,
    [LANDFORMS.CANYON]: 2,
    [LANDFORMS.CRATER]: 3,
    [LANDFORMS.RUINS]: 4,
    pocket: 5
};
```

Add a pocket tint branch in the wall shader's fragment code, in `this.wallMaterial.onBeforeCompile`'s `shader.fragmentShader.replace('#include <map_fragment>', ...)` block, immediately after the existing `else if (uLandformId > 3.5)` RUINS branch and before `finalWallColor = landformTintColor;`:

```glsl
                    } else if (uLandformId > 4.5) {
                        // POCKET — dim, damp underground concrete.
                        landformTintColor = mix(finalWallColor, vec3(0.16, 0.17, 0.19), 0.42);
                    }
```

Add `POCKET_WORLD_Y` near `POCKET_CELL_COUNT`:

```js
const POCKET_WORLD_Y = -6; // fixed depth below the surface (y=0)
```

Add `mountPocket` as a new method, near `mountChunk`:

```js
    mountPocket(holeWorldX, holeWorldZ) {
        if (!this.pocketGroups) this.pocketGroups = new Map();
        const key = this.getWallKey(holeWorldX, holeWorldZ);
        if (this.pocketGroups.has(key)) return this.pocketGroups.get(key);

        const pocket = this.generatePocket(holeWorldX, holeWorldZ);
        const group = new THREE.Group();
        group.position.set(
            holeWorldX - pocket.centerCell.x,
            POCKET_WORLD_Y,
            holeWorldZ - pocket.centerCell.y
        );

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(pocket.size, pocket.size),
            this.floorMaterial
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(pocket.centerCell.x, 0, pocket.centerCell.y);
        group.add(floor);

        for (let y = 0; y < pocket.size; y += 1) {
            for (let x = 0; x < pocket.size; x += 1) {
                if (pocket.grid[y][x] !== '#') continue;
                const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                wall.position.set(x, this.wallHeight / 2, y);
                this.configureWallMesh(wall, {
                    chunkX: 0, chunkY: 0, localX: x, localY: y,
                    worldX: holeWorldX + (x - pocket.centerCell.x),
                    worldZ: holeWorldZ + (y - pocket.centerCell.y),
                    landform: 'pocket', variant: 'standard', heightScale: 1
                });
                group.add(wall);
            }
        }

        // Modest loot bump: one pickup at a random open floor cell (not the
        // center or the climb point).
        const floorCells = [];
        for (let y = 0; y < pocket.size; y += 1) {
            for (let x = 0; x < pocket.size; x += 1) {
                if (pocket.grid[y][x] !== '.') continue;
                if (x === pocket.centerCell.x && y === pocket.centerCell.y) continue;
                if (x === pocket.climbPoint.x && y === pocket.climbPoint.y) continue;
                floorCells.push({ x, y });
            }
        }
        if (floorCells.length > 0) {
            const random = this.createSeededRandom(
                (this.hashTile(holeWorldX + 5000, holeWorldZ + 5000) ^ this.runEntropy) >>> 0
            );
            const pick = floorCells[Math.floor(random() * floorCells.length)];
            const lootType = random() < 0.5 ? 'health' : 'tech';
            const placement = this.createSnailDropPlacement(
                pocket.centerCell.x, pocket.centerCell.y, pick.x, pick.y, lootType
            );
            const pickup = this.createPickupInstance(placement);
            group.add(pickup);
        }

        // Climb-point marker, reusing the existing wall-vent asset.
        const marker = new THREE.Mesh(this.ventGeometry, this.ventMaterial);
        marker.position.set(pocket.climbPoint.x, 0.6, pocket.climbPoint.y);
        marker.userData = { isPocketClimbPoint: true, worldX: holeWorldX, worldZ: holeWorldZ };
        group.add(marker);

        this.pocketGroups.set(key, group);
        return group;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/threeGame.chunkVariation.test.js`
Expected: all PASS, including the 2 new tests.

Run the full suite once to confirm the shader edit didn't break anything: `npx vitest run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js src/threeGame.chunkVariation.test.js
git commit -m "feat: add mountPocket — walls, floor, loot, and climb marker geometry"
```

---

### Task 6: Enter/exit orchestration — wiring falls to pockets

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.chunkVariation.test.js`

**Interfaces:**
- Consumes: `resolveFallDamage` (Task 3), `mountPocket`/`generatePocket` (Tasks 4-5), existing `takeDamage`, `setInputEnabled`, `chunkMeshes`, `getTileType`/`getCachedTileType`/`canOccupyPosition`.
- Produces: `ThreeGame.prototype.enterPocket(holeWorldX, holeWorldZ)` and `ThreeGame.prototype.exitPocket()`. Rewires `updatePlayer`'s fall-resolution branch to call `enterPocket` instead of `takeDamage(999, 'abyss')`, and its fall-trigger branch to remember which hole tile triggered the fall. **Also patches `getTileType`/`getCachedTileType` to resolve against the pocket's own grid while `isInPocket` is true** — without this, every collision/walkability check in the game (`isSnailTileWalkable` delegates straight to `getTileType`; `canOccupyPosition` calls it directly too) would keep reading the *surface* chunk's grid at the player's world X/Z, since those functions have no pocket awareness at all. The player would either be unable to move in the pocket, or walk straight through its walls. This was caught during this plan's self-review, not in the original spec — the spec's "reuse existing X/Z collision" constraint is honored, but *redirecting* that collision to the right grid while underground is new, necessary logic.

- [ ] **Step 1: Write the failing test**

Add to `src/threeGame.chunkVariation.test.js`:

```js
describe('enterPocket / exitPocket — fall resolution', () => {
    function makeFakeThreeGameForEnter(overrides = {}) {
        const scene = { add: () => {}, remove: () => {} };
        return {
            scene,
            player: { position: { x: 10, y: -2.5, z: 20 } },
            playerVitals: { hp: 3, maxHp: 3 },
            bank: { getState: () => ({ tier2Unlocks: {} }) },
            isInPocket: false,
            pocketCache: new Map(),
            pocketGroups: new Map(),
            chunkMeshes: new Map([['0,1', { visible: true }]]),
            chunkSize: 19,
            runEntropy: 55,
            globalSeedOffset: 0,
            wallHeight: 2,
            wallGeometry: {}, wallMaterial: {}, floorGeometry: {}, floorMaterial: {},
            ventGeometry: {}, ventMaterial: {},
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom,
            carveCell: ThreeGame.prototype.carveCell,
            carvePassage: ThreeGame.prototype.carvePassage,
            shuffleDirections: ThreeGame.prototype.shuffleDirections,
            getWallKey: ThreeGame.prototype.getWallKey,
            getWallMaxHp: () => 8,
            configureWallMesh: ThreeGame.prototype.configureWallMesh,
            generatePocket: ThreeGame.prototype.generatePocket,
            mountPocket: ThreeGame.prototype.mountPocket,
            resolveFallDamage: () => 2,
            takeDamage: ThreeGame.prototype.takeDamage,
            iFrameTimer: 0,
            isPlayerDead: false, godMode: false, cinematicLock: false, _abilityImmune: false,
            missionState: { status: 'active' },
            showDirectionalHitIndicator: () => {},
            setInputEnabled: function (v) { this.inputEnabled = v; },
            createSnailDropPlacement: () => ({ worldX: 0, worldZ: 0, type: 'health', elevation: 0.2, offsetX: 0, offsetZ: 0, bobOffset: 0, rotation: 0, tiltX: 0, tiltZ: 0, scale: 0.8, shadowRadius: 0.24, collectLock: 0.34 }),
            createPickupInstance: () => ({ userData: {}, position: { set: () => {} } }),
            ...overrides
        };
    }

    it('deals fall damage, hides the surface chunk, drops the player into the pocket, and re-enables input', () => {
        const fakeThis = makeFakeThreeGameForEnter();
        ThreeGame.prototype.enterPocket.call(fakeThis, 10, 20);

        expect(fakeThis.playerVitals.hp).toBe(1); // 3 - 2 fall damage
        expect(fakeThis.isInPocket).toBe(true);
        expect(fakeThis.chunkMeshes.get('0,1').visible).toBe(false);
        expect(fakeThis.inputEnabled).toBe(true);
        expect(fakeThis.player.position.y).toBe(-6);
        expect(fakeThis._pocketHoleX).toBe(10);
        expect(fakeThis._pocketHoleZ).toBe(20);
    });

    it('exitPocket restores the player to the surface and shows the chunk again', () => {
        const fakeThis = makeFakeThreeGameForEnter();
        ThreeGame.prototype.enterPocket.call(fakeThis, 10, 20);

        ThreeGame.prototype.exitPocket.call(fakeThis);

        expect(fakeThis.isInPocket).toBe(false);
        expect(fakeThis.player.position.y).toBe(0);
        expect(fakeThis.player.position.x).toBe(10);
        expect(fakeThis.player.position.z).toBe(20);
        expect(fakeThis.chunkMeshes.get('0,1').visible).toBe(true);
    });
});

describe('getTileType — pocket-aware collision redirection', () => {
    function makeFakeThisForTileType() {
        // A pocket whose center cell (5,5) is floor and one adjacent cell
        // (6,5) is a wall, so a real player position maps onto both.
        const grid = Array(11).fill(null).map(() => Array(11).fill('.'));
        grid[5][6] = '#';
        const pocket = { grid, size: 11, centerCell: { x: 5, y: 5 }, climbPoint: { x: 9, y: 9 } };
        return {
            isInPocket: true,
            _pocketHoleX: 100,
            _pocketHoleZ: 200,
            pocketCache: new Map([[ThreeGame.prototype.getWallKey.call({}, 100, 200), pocket]]),
            getWallKey: ThreeGame.prototype.getWallKey,
            chunkSize: 19,
            destroyedWallKeys: new Set(),
            getOrCreateChunk: () => { throw new Error('should not touch the surface chunk system while in a pocket'); }
        };
    }

    it('reads the pocket grid instead of the surface chunk when isInPocket is true', () => {
        const fakeThis = makeFakeThisForTileType();
        // World (100, 200) is the hole itself, which maps to the pocket's
        // center cell (5,5) — open floor.
        expect(ThreeGame.prototype.getTileType.call(fakeThis, 100, 200)).toBe('.');
        // One world unit east maps to pocket-local (6,5) — the wall we set.
        expect(ThreeGame.prototype.getTileType.call(fakeThis, 101, 200)).toBe('#');
    });

    it('falls back to the surface chunk system when not in a pocket', () => {
        const fakeThis = { ...makeFakeThisForTileType(), isInPocket: false, getOrCreateChunk: () => [['.']] };
        expect(() => ThreeGame.prototype.getTileType.call(fakeThis, 100, 200)).not.toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.chunkVariation.test.js -t "enterPocket"`
Expected: FAIL — `ThreeGame.prototype.enterPocket is not a function`.

Run: `npx vitest run src/threeGame.chunkVariation.test.js -t "getTileType"`
Expected: FAIL — the first assertion throws `should not touch the surface chunk system while in a pocket` (current `getTileType` has no pocket awareness at all and falls straight through to `getOrCreateChunk`).

- [ ] **Step 3: Write minimal implementation**

Add `enterPocket`/`exitPocket` as new methods, near `mountPocket`:

```js
    enterPocket(holeWorldX, holeWorldZ) {
        const damage = this.resolveFallDamage();
        this.takeDamage(damage, 'fall');

        const pocketChunkX = Math.floor(holeWorldX / this.chunkSize);
        const pocketChunkY = Math.floor(holeWorldZ / this.chunkSize);
        const surfaceGroup = this.chunkMeshes?.get(`${pocketChunkX},${pocketChunkY}`);
        if (surfaceGroup) surfaceGroup.visible = false;

        const group = this.mountPocket(holeWorldX, holeWorldZ);
        if (this.scene && group.parent !== this.scene) this.scene.add(group);

        this._pocketHoleX = holeWorldX;
        this._pocketHoleZ = holeWorldZ;
        this.isInPocket = true;

        if (this.player) {
            this.player.position.x = holeWorldX;
            this.player.position.z = holeWorldZ;
            this.player.position.y = POCKET_WORLD_Y;
            this.player.scale.set(1, 1, 1);
            this.player.rotation.set(0, 0, 0);
        }
        this.setInputEnabled(true);
    }

    exitPocket() {
        if (!this.isInPocket) return;
        const holeWorldX = this._pocketHoleX;
        const holeWorldZ = this._pocketHoleZ;

        const chunkX = Math.floor(holeWorldX / this.chunkSize);
        const chunkY = Math.floor(holeWorldZ / this.chunkSize);
        const surfaceGroup = this.chunkMeshes?.get(`${chunkX},${chunkY}`);
        if (surfaceGroup) surfaceGroup.visible = true;

        if (this.player) {
            this.player.position.x = holeWorldX;
            this.player.position.z = holeWorldZ;
            this.player.position.y = 0;
        }
        this.isInPocket = false;
        this._pocketHoleX = null;
        this._pocketHoleZ = null;
    }
```

Add `this.isInPocket = false;` to the constructor, alongside `this.pocketCache = new Map();` (Task 4), and `this.pocketGroups = new Map();` right after it.

Modify `updatePlayer`'s fall handling (`src/threeGame.js:11273-11303`, exact current body reproduced in Task 3's investigation) — replace the two spots that reference the hole coordinates and the instant kill:

```js
        // Handle falling in hole state
        if (this.isPlayerFalling) {
            this.isMoving = false;
            if (this.player) {
                this.player.position.y -= 3.5 * delta;
                this.player.rotation.y += 8.0 * delta;
                const newScale = Math.max(0, this.player.scale.x - 2.5 * delta);
                this.player.scale.set(newScale, newScale, newScale);

                if (this.player.position.y <= -2.5) {
                    this.isPlayerFalling = false;
                    this.enterPocket(this._fallHoleX, this._fallHoleZ);
                }
            }
            return;
        }

        if (this.performanceProfile === 'gameplay' && !this.isGameplayInputActive()) {
            this.clearGameplayInputState();
        }

        // Check if player stepped on a hole
        if (this.player && this.performanceProfile === 'gameplay') {
            if (this.isPlayerOverAnyHole(this.player.position.x, this.player.position.z)) {
                this.isPlayerFalling = true;
                this._fallHoleX = Math.round(this.player.position.x);
                this._fallHoleZ = Math.round(this.player.position.z);
                this.setInputEnabled(false);
                window.AudioManager?.playMetalStress?.({ volume: 0.8, playbackRate: 0.6, force: true });
                this.spawnPhysicalBurst(this.player.position.x, this.player.position.z, { color: 0x111111, count: 12, upward: 0.2 });
                return;
            }
        }
```

(Only the two `this._fallHoleX/Z = ...` additions and the `this.enterPocket(...)` swap are new; everything else in this block is unchanged.)

Redirect collision to the pocket's own grid whenever the player is inside one. Modify `getTileType` (`src/threeGame.js:18840-18853`) by adding an early pocket branch — the rest of the method is unchanged:

```js
    getTileType(worldX, worldY) {
        const tileX = Math.round(worldX);
        const tileY = Math.round(worldY);
        if (this.isInPocket) {
            const pocket = this.pocketCache?.get(this.getWallKey(this._pocketHoleX, this._pocketHoleZ));
            if (!pocket) return '#';
            const localX = tileX - this._pocketHoleX + pocket.centerCell.x;
            const localY = tileY - this._pocketHoleZ + pocket.centerCell.y;
            return pocket.grid[localY]?.[localX] ?? '#';
        }
        if (this.bunkerBlastDoorState && tileY === 15 && tileX >= 6 && tileX <= 11) {
            return this.bunkerBlastDoorState.open ? '.' : '#';
        }
        const key = this.getWallKey ? this.getWallKey(tileX, tileY) : `${tileX},${tileY}`;
        if (this.destroyedWallKeys?.has(key)) return '.';
        const chunkX = Math.floor(tileX / this.chunkSize);
        const chunkY = Math.floor(tileY / this.chunkSize);
        const localX = tileX - chunkX * this.chunkSize;
        const localY = tileY - chunkY * this.chunkSize;
        return this.getOrCreateChunk(chunkX, chunkY)?.[localY]?.[localX] ?? '.';
    }
```

Apply the exact same early branch to `getCachedTileType` (`src/threeGame.js:18855-18869`) — same pocket-lookup logic, same early return, before its existing body.

`isSnailTileWalkable` already just delegates to `getTileType` (`this.getTileType(tileX, tileZ) !== '#'`), so it's covered automatically. `canOccupyPosition`'s wall-lookup loop also calls `this.getTileType` directly, so it's covered too — but its *ship/console/module collision* block (`src/threeGame.js:18716-18785`, the section before the tile loop) runs unconditionally and would incorrectly block movement in a pocket that happens to sit under the crashed ship's world position. Guard it: change `if (this.crashedShips) {` to `if (this.crashedShips && !this.isInPocket) {` — nothing else in that block changes.

Add `this.isInPocket = false;` and clear `_pocketHoleX`/`_pocketHoleZ` to the existing run-reset block alongside `this.isPlayerFalling = false;` (`src/threeGame.js:10480`), so a new run never starts already inside a pocket:

```js
        this.isPlayerFalling = false;
        this.isInPocket = false;
        this._pocketHoleX = null;
        this._pocketHoleZ = null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/threeGame.chunkVariation.test.js`
Expected: all PASS, including the 2 `enterPocket`/`exitPocket` tests and the 2 `getTileType` tests.

Run the full suite: `npx vitest run`
Expected: all PASS (no regressions in the fall-trigger/reset code paths this touched, or in any of the many existing call sites of `getTileType`/`canOccupyPosition`).

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js src/threeGame.chunkVariation.test.js
git commit -m "feat: wire falling to enterPocket/exitPocket and redirect collision to the pocket grid"
```

---

### Task 7: Climb-up interaction and HUD prompt

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.holeTiles.test.js`

**Interfaces:**
- Consumes: `exitPocket` (Task 6), the existing `#hole-hud-prompt` DOM element (no `index.html` changes — the same element's copy switches between "FILL HOLE" and "CLIMB UP" depending on `this.isInPocket`).
- Produces: `ThreeGame.prototype.interactWithPocketClimbPoint()` — wired into `triggerGameplayInteract()` alongside the other `interactWith*` calls.

- [ ] **Step 1: Write the failing test**

Add to `src/threeGame.holeTiles.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.holeTiles.test.js -t "interactWithPocketClimbPoint"`
Expected: FAIL — `ThreeGame.prototype.interactWithPocketClimbPoint is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add `interactWithPocketClimbPoint` as a new method, near `interactWithHoleTile` (`src/threeGame.js:18766`):

```js
    interactWithPocketClimbPoint() {
        if (!this.isInPocket || !this.player) return false;
        const key = this.getWallKey(this._pocketHoleX, this._pocketHoleZ);
        const pocket = this.pocketCache?.get(key);
        if (!pocket) return false;

        // pocket.climbPoint is grid-local (0..size-1) — convert to world
        // space with the same offset mountPocket used to place the pocket's
        // group, before comparing against the player's world position.
        const climbWorldX = this._pocketHoleX - pocket.centerCell.x + pocket.climbPoint.x;
        const climbWorldZ = this._pocketHoleZ - pocket.centerCell.y + pocket.climbPoint.y;
        const dist = Math.hypot(this.player.position.x - climbWorldX, this.player.position.z - climbWorldZ);
        if (dist > 1.5) return false;

        this.exitPocket();
        return true;
    }
```

Wire it into `triggerGameplayInteract()` (`src/threeGame.js:3133-3147`):

```js
    triggerGameplayInteract() {
        if (!this.isGameplayInputActive()) return false;
        this.interactWithConsole();
        this.interactWithO2Generator();
        this.interactWithLoreTerminal();
        this.interactWithFoundry();
        this.interactWithBlackBox();
        this.interactWithCaveEntrance();
        this.interactWithAct2Camp();
        this.interactWithHiveSite();
        this.interactWithCampQuestObject();
        this.interactWithHoleTile();
        this.interactWithPocketClimbPoint();
        this.interactWithBiomechanicalDoor();
        return true;
    }
```

Extend the existing hole-HUD-prompt block (`src/threeGame.js:5004-5038`) to show "CLIMB UP" while in a pocket instead of running the surface hole check:

```js
        const holePromptEl = document.getElementById('hole-hud-prompt');
        if (holePromptEl) {
            let nearHole = false;
            let promptLabel = 'FILL HOLE';
            if (this.inputEnabled && hudActive && this.player && this.isGameplayInputActive()) {
                if (this.isInPocket) {
                    const key = this.getWallKey(this._pocketHoleX, this._pocketHoleZ);
                    const pocket = this.pocketCache?.get(key);
                    if (pocket) {
                        // Convert grid-local climbPoint to world space first
                        // (see interactWithPocketClimbPoint) before comparing.
                        const climbWorldX = this._pocketHoleX - pocket.centerCell.x + pocket.climbPoint.x;
                        const climbWorldZ = this._pocketHoleZ - pocket.centerCell.y + pocket.climbPoint.y;
                        const dist = Math.hypot(
                            this.player.position.x - climbWorldX,
                            this.player.position.z - climbWorldZ
                        );
                        if (dist <= 1.5) {
                            nearHole = true;
                            promptLabel = 'CLIMB UP';
                        }
                    }
                } else {
                    const px = this.player.position.x;
                    const pz = this.player.position.z;
                    const cx = Math.round(px);
                    const cz = Math.round(pz);
                    for (let dx = -2; dx <= 2; dx++) {
                        for (let dz = -2; dz <= 2; dz++) {
                            const hx = cx + dx;
                            const hz = cz + dz;
                            if (Math.hypot(px - hx, pz - hz) <= 2.0 && this.isHoleTile(hx, hz)) {
                                nearHole = true;
                                break;
                            }
                        }
                        if (nearHole) break;
                    }
                }
            }
            if (nearHole) {
                const actionText = holePromptEl.querySelector('.prompt-text');
                const promptKey = holePromptEl.querySelector('.prompt-key');
                if (actionText) actionText.textContent = promptLabel;
                if (promptKey) {
                    const promptKeyLabel = this.getPromptKeyLabel('E');
                    promptKey.textContent = promptKeyLabel;
                    promptKey.classList.toggle('prompt-key--tap', promptKeyLabel === 'TAP');
                }
                holePromptEl.classList.add('visible');
                holePromptEl.classList.remove('hidden');
            } else {
                holePromptEl.classList.add('hidden');
                holePromptEl.classList.remove('visible');
            }
        }
```

(Only the `promptLabel` variable and the new `if (this.isInPocket) { ... } else { ...existing check... }` branch are new; the existing surface-hole loop moves unchanged into the `else`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/threeGame.holeTiles.test.js`
Expected: all PASS, including the 3 new tests.

Run the full suite and lint: `npx vitest run && npx eslint .`
Expected: all PASS, lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js src/threeGame.holeTiles.test.js
git commit -m "feat: add climb-up interaction and reuse the hole HUD prompt for it"
```

---

### Task 8: In-browser verification pass

**Files:**
- None modified — this task only verifies the feature actually works when played, per this repo's convention of testing frontend/gameplay changes in a real browser rather than trusting unit tests alone.

**Note on bridging:** the spec's "avoid the fall entirely" requirement is intentionally covered by zero new code — the existing `fillHoleAt`/`interactWithHoleTile` action (untouched by this plan) already turns a hole permanently safe via the same "PRESS E" prompt. Nothing in Tasks 1-7 changes that path; it's confirmed still working by the existing `src/threeGame.holeTiles.test.js` coverage, which this plan doesn't modify.

- [ ] **Step 1: Start the dev server if not already running**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/`
Expected: `200`. If not, run `npm run dev -- --port 5173 --strictPort` in the background first.

- [ ] **Step 2: Write a throwaway Playwright script to force a fall and observe the result**

Create `tests/e2e/zzz-verify-pocket.spec.js` (temporary — delete after this task):

```js
import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from './helpers.js';

test('falling through a hole drops the player into a survivable pocket', async ({ page }) => {
    test.setTimeout(60_000);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await page.locator('#start-game').click();
    await startRunAndSkipIntro(page);

    const before = await page.evaluate(() => {
        const game = window.game;
        // Find a nearby hole tile by scanning outward from the player.
        const px = Math.round(game.player.position.x);
        const pz = Math.round(game.player.position.z);
        for (let r = 1; r < 40; r += 1) {
            for (let dx = -r; dx <= r; dx += 1) {
                for (let dz = -r; dz <= r; dz += 1) {
                    if (game.isHoleTile(px + dx, pz + dz)) {
                        return { hp: game.playerVitals.hp, holeX: px + dx, holeZ: pz + dz };
                    }
                }
            }
        }
        return null;
    });
    expect(before).not.toBeNull();

    await page.evaluate(({ holeX, holeZ }) => {
        window.game.player.position.set(holeX, 0, holeZ);
    }, { holeX: before.holeX, holeZ: before.holeZ });

    await page.waitForFunction(() => window.game.isInPocket === true, { timeout: 5_000 });

    const afterFall = await page.evaluate(() => ({
        hp: window.game.playerVitals.hp,
        y: window.game.player.position.y,
        inputEnabled: window.game.inputEnabled
    }));
    expect(afterFall.hp).toBeLessThan(before.hp);
    expect(afterFall.hp).toBeGreaterThan(0);
    expect(afterFall.y).toBeLessThan(-2.5);
    expect(afterFall.inputEnabled).toBe(true);

    // The player lands at the pocket's center cell, and the climb point is
    // deliberately the farthest cell from it (real traversal, not "climb out
    // where you stand") — walk there first using the same world-space
    // conversion interactWithPocketClimbPoint itself uses, rather than
    // interacting from directly underneath the hole.
    await page.evaluate(() => {
        const game = window.game;
        const key = game.getWallKey(game._pocketHoleX, game._pocketHoleZ);
        const pocket = game.pocketCache.get(key);
        const climbWorldX = game._pocketHoleX - pocket.centerCell.x + pocket.climbPoint.x;
        const climbWorldZ = game._pocketHoleZ - pocket.centerCell.y + pocket.climbPoint.y;
        game.player.position.x = climbWorldX;
        game.player.position.z = climbWorldZ;
    });

    await expect(page.locator('#hole-hud-prompt')).toContainText(/CLIMB UP/i, { timeout: 2000 });

    await page.evaluate(() => window.game.interactWithPocketClimbPoint());
    await page.waitForFunction(() => window.game.isInPocket === false, { timeout: 2_000 });

    const afterClimb = await page.evaluate(() => ({ y: window.game.player.position.y }));
    expect(afterClimb.y).toBe(0);
});
```

- [ ] **Step 3: Run it**

Run: `npx playwright test tests/e2e/zzz-verify-pocket.spec.js --project=chromium --workers=1`
Expected: 1 passed. If the hole-search loop finds nothing within range, increase the scan radius or move the player toward a non-spawn chunk first (spawn chunks clear a hole-free radius, per `clearSpawnArea`).

- [ ] **Step 4: Take a screenshot for a manual visual sanity check**

```js
// add just before the final assertion, temporarily:
await page.screenshot({ path: '/tmp/pocket-check.png' });
```

Read the screenshot. Confirm: the pocket reads visually distinct (darker/cooler tint from the new pocket wall tint), the player and camera are both visible (not occluded by the hidden surface chunk), and the loot pickup and vent climb marker are visible somewhere in frame.

- [ ] **Step 5: Delete the throwaway spec and confirm the full suite is still green**

```bash
rm tests/e2e/zzz-verify-pocket.spec.js
npx vitest run
npx eslint .
npm run build
```

Expected: all tests pass, lint clean, build succeeds.

- [ ] **Step 6: Commit** (only if Step 4 surfaced a real bug that needed a code fix — otherwise this task produces no commit, since it's verification-only)

```bash
git add -A
git commit -m "fix: <describe whatever the in-browser pass caught>"
```
