# Wall & Door Instancing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the dominant remaining draw-call cost (individual `Mesh` objects for wall tiles, standard-wall decorations, and door sub-parts) into chunk-level `InstancedMesh` pools, without changing wall damage/destroy/raycast/decal behavior or visual appearance.

**Architecture:** Extend the per-chunk instancing pattern already used for floors/rubble/void/cliffs/terrain-steps to walls and door sub-parts. A new `_wallInstanceIndex: Map<wallKey, record>` replaces "a wall *is* its Mesh object" — the record's `.userData` self-reference lets every existing call site that reads `wall.userData.X` keep working unchanged against either a real Mesh (hazard walls, doors) or an instanced-wall record, with explicit `isInstancedWall` branches only where Three.js-specific operations (remove from parent, material clone) don't apply to an instance.

**Tech Stack:** Vanilla JS (ES modules), Three.js (`InstancedMesh`, `setColorAt`), Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-wall-door-instancing-design.md` (including its two amendments — `roomStyleId` pooling instead of one pool per chunk, and pillar/bracket/vent/pipe decoration instancing).
- Hazard walls and door slabs (+ their status bar/buttons) stay individual `Mesh` objects — explicitly out of scope for instancing.
- No shader changes. `wallMaterial`'s custom `onBeforeCompile` (`threeGame.js:1405-1588`) only replaces `#include <map_fragment>`; it does not touch `#include <color_fragment>` or the vertex-side `color_vertex`/`color_pars_vertex` chunks, so Three.js's standard `InstancedMesh.setColorAt` / `USE_INSTANCING_COLOR` pipeline works against this material unmodified — verified by reading the full shader source before writing this plan.
- `roomStyleId` varies *within* a chunk (per-room, via `wfcMetadataCache`); `landformShaderId` does not (one `getChunkLandform` call per chunk) — pools only need to be bucketed by `roomStyleId`, not `landformShaderId`.
- Every new/changed method must remain callable via the established `ThreeGame.prototype.method.call(fakeThis, ...)` test pattern (see `threeGame.destructibleWalls.test.js`, `threeGame.chunkVariation.test.js`) — no method may assume `this` is a fully-constructed `ThreeGame`/real DOM/Three.js renderer beyond what a plain object with the relevant fields can provide.
- This is a live, actively co-edited branch. Before each task's edits, re-locate anchor text by content (grep/read), not by trusting this plan's line numbers literally — they were correct when this plan was written but may have shifted from unrelated concurrent edits elsewhere in the file. If an anchor's exact text doesn't match (not just shifted, but actually different), stop and report BLOCKED.

---

## File Structure

- **Modify** `src/threeGame.js` — all changes live here: `_wallInstanceIndex` init (constructor), a new wall-transform/index-record helper section (near `configureWallMesh`), the `mountChunk` wall/decoration/door loops, and the damage/destroy/raycast functions.
- **Modify** `src/threeGame.destructibleWalls.test.js` — new tests for instanced-wall damage/destroy/index bookkeeping, alongside the existing individual-wall tests (which must keep passing unchanged).
- **Modify** `src/threeGame.chunkVariation.test.js` — new test for `_wallInstanceIndex` cleanup on chunk unmount.

---

### Task 1: Wall instance index infrastructure

**Files:**
- Modify: `src/threeGame.js` (constructor, near `:929`; new methods near `configureWallMesh`, `:15600`)
- Test: `src/threeGame.destructibleWalls.test.js`

**Interfaces:**
- Produces: `this._wallInstanceIndex: Map<string, WallInstanceRecord>` (instance property).
- Produces: `createWallInstanceRecord(opts) -> WallInstanceRecord` — builds a record and sets `record.userData = record` (self-reference, so `record.userData.wallHp` etc. reads/writes the same object every existing wall-handling call site already expects).
- Produces: `WallInstanceRecord` shape: `{ isWall: true, isInstancedWall: true, wallKey, wallHp, maxWallHp, wallVariant, wallHeightScale, chunkX, chunkY, localX, localY, worldX, worldZ, chunkKey, roomId, roomWallStyle, destroyed: false, instancedMesh: null, instanceIndex: -1, userData: <self> }`.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing tests**

Add to `src/threeGame.destructibleWalls.test.js` (new `describe` block, alongside the existing ones):

```js
describe('createWallInstanceRecord — instanced wall identity record', () => {
    it('builds a self-referential userData record so wall.userData.X reads/writes the same object', () => {
        const fakeThis = {
            getWallKey: ThreeGame.prototype.getWallKey,
            getWallMaxHp: ThreeGame.prototype.getWallMaxHp
        };

        const record = call('createWallInstanceRecord', fakeThis, {
            chunkX: 1, chunkY: -2, localX: 5, localY: 6,
            worldX: 30, worldZ: -37, landform: 'maze',
            variant: 'standard', heightScale: 1,
            roomId: 'room-a', roomWallStyle: 'bunker-standard'
        });

        expect(record.isWall).toBe(true);
        expect(record.isInstancedWall).toBe(true);
        expect(record.wallKey).toBe('30,-37');
        expect(record.destroyed).toBe(false);
        expect(record.userData).toBe(record);

        record.userData.wallHp = 1;
        expect(record.wallHp).toBe(1);
    });

    it('sets maxWallHp/wallHp from getWallMaxHp for the given variant', () => {
        const fakeThis = {
            getWallKey: ThreeGame.prototype.getWallKey,
            getWallMaxHp: ThreeGame.prototype.getWallMaxHp
        };

        const record = call('createWallInstanceRecord', fakeThis, {
            chunkX: 0, chunkY: 0, localX: 0, localY: 0,
            worldX: 0, worldZ: 0, landform: 'maze',
            variant: 'damaged', heightScale: 1
        });

        const expectedHp = ThreeGame.prototype.getWallMaxHp.call(fakeThis, { landform: 'maze', variant: 'damaged', heightScale: 1 });
        expect(record.maxWallHp).toBe(expectedHp);
        expect(record.wallHp).toBe(expectedHp);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js -t "createWallInstanceRecord"`
Expected: FAIL — `ThreeGame.prototype.createWallInstanceRecord is not a function`.

- [ ] **Step 3: Add the constructor init**

In `src/threeGame.js`, find this line (search for the exact text — it's in the `ThreeGame` constructor):

```js
        this.wallMeshes = [];
```

Immediately after it, add:

```js
        // Identity record for instanced wall tiles (standard/damaged variants —
        // see mountChunk). Keyed by wallKey, same key space as
        // destroyedWallKeys/getWallKey. Hazard walls and doors stay real
        // Mesh objects and are never in this map.
        this._wallInstanceIndex = new Map();
```

- [ ] **Step 4: Add `createWallInstanceRecord`**

In `src/threeGame.js`, find the `configureWallMesh` method (search for `configureWallMesh(wall, {`). Immediately **before** it, add this new method:

```js
    // Identity record for one instanced wall tile — the InstancedMesh
    // equivalent of what configureWallMesh stamps onto a real Mesh's
    // userData. `record.userData = record` is deliberate: every existing
    // wall-handling call site reads/writes `wall.userData.X` on what it
    // believes is a Mesh; giving the record a self-referential userData
    // lets those call sites keep working unchanged against this record,
    // with explicit `isInstancedWall` branches only where a Three.js-
    // specific operation (parent.remove, material clone) doesn't apply.
    createWallInstanceRecord({
        chunkX,
        chunkY,
        localX,
        localY,
        worldX,
        worldZ,
        landform = null,
        variant = 'standard',
        heightScale = 1,
        roomId = null,
        roomWallStyle = null
    } = {}) {
        const maxHp = this.getWallMaxHp({ landform, variant, heightScale });
        const record = {
            isWall: true,
            isInstancedWall: true,
            wallKey: this.getWallKey(worldX, worldZ),
            wallHp: maxHp,
            maxWallHp: maxHp,
            wallVariant: variant,
            wallHeightScale: heightScale,
            chunkX,
            chunkY,
            localX,
            localY,
            worldX,
            worldZ,
            chunkKey: `${chunkX},${chunkY}`,
            roomId,
            roomWallStyle,
            destroyed: false,
            instancedMesh: null,
            instanceIndex: -1
        };
        record.userData = record;
        return record;
    }

```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js`
Expected: PASS — all tests in the file, including the two new ones and every pre-existing one (unaffected, since nothing existing was changed).

- [ ] **Step 6: Run the full suite and check syntax**

Run: `npx vitest run` — expect no regressions (baseline before this task: 1088 passing).
Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 7: Commit**

```bash
git add src/threeGame.js src/threeGame.destructibleWalls.test.js
git commit -m "feat: add wall instance index infrastructure for InstancedMesh walls"
```

---

### Task 2: Shared wall-transform helper (jitter extraction)

**Files:**
- Modify: `src/threeGame.js` (near `configureWallMesh`, `:15600`)
- Test: `src/threeGame.destructibleWalls.test.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `computeExteriorWallJitter(worldX, worldZ) -> { offsetX: number, offsetZ: number, rotationY: number }` — pulled out of `configureWallMesh`'s inline jitter block so both the individual-wall path (`configureWallMesh`, unchanged behavior) and the new instanced-matrix-building path (Task 3) use the exact same math, rather than duplicating it by hand and risking drift.

- [ ] **Step 1: Write the failing tests**

Add to `src/threeGame.destructibleWalls.test.js`:

```js
describe('computeExteriorWallJitter — shared position/rotation jitter for exterior walls', () => {
    it('returns zero jitter for a non-exterior wall tile', () => {
        const fakeThis = {
            isExteriorWallTile: () => false,
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom
        };

        const jitter = call('computeExteriorWallJitter', fakeThis, 5, 5);

        expect(jitter).toEqual({ offsetX: 0, offsetZ: 0, rotationY: 0 });
    });

    it('returns deterministic non-zero jitter for an exterior wall tile, seeded by world position', () => {
        const fakeThis = {
            isExteriorWallTile: () => true,
            hashTile: ThreeGame.prototype.hashTile,
            createSeededRandom: ThreeGame.prototype.createSeededRandom
        };

        const jitterA = call('computeExteriorWallJitter', fakeThis, 5, 5);
        const jitterB = call('computeExteriorWallJitter', fakeThis, 5, 5);
        const jitterC = call('computeExteriorWallJitter', fakeThis, 6, 5);

        expect(jitterA).toEqual(jitterB);
        expect(jitterA).not.toEqual({ offsetX: 0, offsetZ: 0, rotationY: 0 });
        expect(jitterA).not.toEqual(jitterC);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js -t "computeExteriorWallJitter"`
Expected: FAIL — `ThreeGame.prototype.computeExteriorWallJitter is not a function`.

- [ ] **Step 3: Extract the helper and use it in `configureWallMesh`**

In `src/threeGame.js`, find this exact block inside `configureWallMesh` (search for `Apply organic jitter to exterior/canyon-facing wall segments`):

```js
        // Apply organic jitter to exterior/canyon-facing wall segments
        if (this.isExteriorWallTile?.(worldX, worldZ)) {
            const seed = this.hashTile(Math.round(worldX), Math.round(worldZ));
            const rng = this.createSeededRandom(seed);
            wall.position.x += (rng() - 0.5) * 0.16;
            wall.position.z += (rng() - 0.5) * 0.16;
            wall.rotation.y += (rng() - 0.5) * 0.14;
        }
```

Replace it with:

```js
        // Apply organic jitter to exterior/canyon-facing wall segments
        const jitter = this.computeExteriorWallJitter(worldX, worldZ);
        wall.position.x += jitter.offsetX;
        wall.position.z += jitter.offsetZ;
        wall.rotation.y += jitter.rotationY;
```

Then add the new method immediately **before** `configureWallMesh` (search for `configureWallMesh(wall, {` — this puts the new method directly above it, after `createWallInstanceRecord` from Task 1):

```js
    // Shared by configureWallMesh (individual Mesh) and the instanced-wall
    // matrix builder (mountChunk) so both apply identical position/rotation
    // jitter to exterior-facing wall tiles — extracted so instancing can't
    // silently drift from what individual walls already do.
    computeExteriorWallJitter(worldX, worldZ) {
        if (!this.isExteriorWallTile?.(worldX, worldZ)) {
            return { offsetX: 0, offsetZ: 0, rotationY: 0 };
        }
        const seed = this.hashTile(Math.round(worldX), Math.round(worldZ));
        const rng = this.createSeededRandom(seed);
        return {
            offsetX: (rng() - 0.5) * 0.16,
            offsetZ: (rng() - 0.5) * 0.16,
            rotationY: (rng() - 0.5) * 0.14
        };
    }

```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js`
Expected: PASS — all tests, including the two new ones. The extraction must not change `configureWallMesh`'s behavior for individual walls (same seed, same math, just relocated).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run` — expect no regressions.
Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.destructibleWalls.test.js
git commit -m "refactor: extract computeExteriorWallJitter shared by individual and instanced walls"
```

---

### Task 3: Instance standard + damaged walls in `mountChunk`

**Files:**
- Modify: `src/threeGame.js` (`mountChunk`, wall-tile loop)

**Interfaces:**
- Consumes: `this._wallInstanceIndex` (Task 1), `createWallInstanceRecord` (Task 1), `computeExteriorWallJitter` (Task 2).
- Produces: for each mounted chunk, one `THREE.InstancedMesh` per distinct `roomStyleId` bucket (using `this.wallGeometry`/`this.wallMaterial`), each pool's `userData.isWall = true` (so the existing `wallMeshes` collection loop at `syncVisibleChunks` picks it up unchanged — see Global Constraints), and each pool's `onBeforeRender` stamping `uLandformId`/`uRoomStyleId` once per pool (not per wall). `_wallInstanceIndex` gains one entry per standard/damaged wall tile mounted, with `instancedMesh`/`instanceIndex` pointing at its pool slot.

- [ ] **Step 1: Replace the hazard/damaged/standard wall branches**

In `src/threeGame.js`, inside `mountChunk`'s per-tile loop, find this exact block (search for `Hazard Wall (pulsing warning siren)`) — it spans the hazard, damaged, and standard branches through the end of the standard branch's decoration `if/else if` chain:

```js
                } else if (wallTypeRoll < hazardCut) {
                    // Hazard Wall (pulsing warning siren)
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    wall.position.set(worldX, this.wallHeight / 2, worldZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.configureWallMesh(wall, {
                        chunkX,
                        chunkY,
                        localX,
                        localY,
                        worldX,
                        worldZ,
                        landform,
                        variant: 'hazard',
                        heightScale: 1
                    });
                    group.add(wall);

                    const sirenBase = new THREE.Mesh(this.sirenBaseGeometry, this.sirenBaseMaterial);
                    sirenBase.position.y = this.wallHeight / 2 + 0.05;
                    wall.add(sirenBase);

                    // Emissive dome only — NO per-wall PointLight. Dozens of dynamic
                    // lights per chunk forced a full shader recompile on every mount
                    // (the chunk-load stall) and crushed forward rendering. The shared
                    // dome material pulses instead (see the siren animation loop).
                    const sirenDome = new THREE.Mesh(this.sirenDomeGeometry, this.sirenDomeMaterial);
                    sirenDome.position.y = this.wallHeight / 2 + 0.14;
                    wall.add(sirenDome);
                } else if (wallTypeRoll < damagedCut) {
                    // Damaged Wall (ruins with rubble debris)
                    const shortHeightMult = 0.45 + wallTypeRng() * 0.25;
                    const damagedHeight = this.wallHeight * shortHeightMult;
                    
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    wall.position.set(worldX, damagedHeight / 2, worldZ);
                    // Scale the Y height dynamically on the reused geometry
                    wall.scale.set(1, shortHeightMult, 1);
                    
                    wall.rotation.x = (wallTypeRng() - 0.5) * 0.15;
                    wall.rotation.z = (wallTypeRng() - 0.5) * 0.15;
                    
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.configureWallMesh(wall, {
                        chunkX,
                        chunkY,
                        localX,
                        localY,
                        worldX,
                        worldZ,
                        landform,
                        variant: 'damaged',
                        heightScale: shortHeightMult
                    });
                    group.add(wall);

                    const rubbleCount = 2 + Math.floor(wallTypeRng() * 3);
                    for (let i = 0; i < rubbleCount; i++) {
                        const size = 0.05 + wallTypeRng() * 0.07;
                        const rx = (wallTypeRng() - 0.5) * 0.72;
                        const rz = (wallTypeRng() - 0.5) * 0.72;
                        const rubbleQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(wallTypeRng() * Math.PI, wallTypeRng() * Math.PI, 0));
                        const rubbleMat = new THREE.Matrix4().compose(
                            new THREE.Vector3(worldX + rx, size, worldZ + rz),
                            rubbleQuat,
                            new THREE.Vector3(size, size, size)
                        );
                        rubbleMatrices.push(rubbleMat);
                    }
                } else {
                    // Standard Wall
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    let heightScale = 1;
                    if (landform === LANDFORMS.CANYON) {
                        // Canyon ridges tower over the standard maze so the halls
                        // read as carved terrain, not corridors.
                        heightScale = 1.2 + wallTypeRng() * 0.35;
                    } else if (landform === LANDFORMS.MAZE) {
                        const terrainRoll = wallTypeRng();
                        if (terrainRoll < 0.28) {
                            heightScale = 0.60 + wallTypeRng() * 0.18;
                        } else if (terrainRoll < 0.66) {
                            heightScale = 0.82 + wallTypeRng() * 0.16;
                        } else if (terrainRoll > 0.92) {
                            heightScale = 1.08 + wallTypeRng() * 0.18;
                        }
                    } else if (landform === LANDFORMS.RUINS) {
                        const terrainRoll = wallTypeRng();
                        heightScale = terrainRoll < 0.62
                            ? 0.58 + wallTypeRng() * 0.26
                            : 0.88 + wallTypeRng() * 0.22;
                    } else if (landform === LANDFORMS.FIELD) {
                        heightScale = 0.72 + wallTypeRng() * 0.36;
                    } else if (landform === LANDFORMS.CRATER) {
                        heightScale = 0.88 + wallTypeRng() * 0.40;
                    }
                    wall.scale.y = heightScale;
                    wall.position.set(worldX, (this.wallHeight * heightScale) / 2, worldZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.configureWallMesh(wall, {
                        chunkX,
                        chunkY,
                        localX,
                        localY,
                        worldX,
                        worldZ,
                        landform,
                        variant: 'standard',
                        heightScale
                    });
                    group.add(wall);

                    const rng = this.createSeededRandom(this.hashTile(worldX, worldZ));
                    const roll = rng();
                    if (roll < 0.12) {
                        const pillar = new THREE.Mesh(this.pillarGeometry, this.wallMaterial);
                        const cx = (rng() < 0.5 ? -0.5 : 0.5);
                        const cz = (rng() < 0.5 ? -0.5 : 0.5);
                        pillar.position.set(cx, 0, cz);
                        pillar.castShadow = true;
                        pillar.receiveShadow = true;
                        wall.add(pillar);
                    } else if (roll < 0.24) {
                        const bracket = new THREE.Mesh(this.bracketGeometry, this.wallMaterial);
                        const faceRoll = Math.floor(rng() * 4);
                        if (faceRoll === 0) {
                            bracket.position.set(0.5, (rng() - 0.5) * 1.5, 0);
                            bracket.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 1) {
                            bracket.position.set(-0.5, (rng() - 0.5) * 1.5, 0);
                            bracket.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 2) {
                            bracket.position.set(0, (rng() - 0.5) * 1.5, 0.5);
                        } else {
                            bracket.position.set(0, (rng() - 0.5) * 1.5, -0.5);
                        }
                        bracket.castShadow = true;
                        bracket.receiveShadow = true;
                        wall.add(bracket);
                    } else if (roll < 0.32) {
                        const vent = new THREE.Mesh(this.ventGeometry, this.ventMaterial);
                        const faceRoll = Math.floor(rng() * 4);
                        const vy = 0.4 + rng() * 0.6;
                        if (faceRoll === 0) {
                            vent.position.set(0.501, vy, 0);
                            vent.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 1) {
                            vent.position.set(-0.501, vy, 0);
                            vent.rotation.y = Math.PI / 2;
                        } else if (faceRoll === 2) {
                            vent.position.set(0, vy, 0.501);
                        } else {
                            vent.position.set(0, vy, -0.501);
                        }
                        wall.add(vent);
                    } else if (roll < 0.38) {
                        const pipe = new THREE.Mesh(this.pipeGeometry, this.pipeMaterial);
                        const faceRoll = Math.floor(rng() * 4);
                        if (faceRoll === 0) {
                            pipe.position.set(0.42, 0, (rng() - 0.5) * 0.6);
                        } else if (faceRoll === 1) {
                            pipe.position.set(-0.42, 0, (rng() - 0.5) * 0.6);
                        } else if (faceRoll === 2) {
                            pipe.position.set((rng() - 0.5) * 0.6, 0, 0.42);
                        } else {
                            pipe.position.set((rng() - 0.5) * 0.6, 0, -0.42);
                        }
                        pipe.castShadow = true;
                        pipe.receiveShadow = true;
                        wall.add(pipe);
                    }
                }
```

Replace it with (hazard branch unchanged; damaged/standard branches now push into per-`roomStyleId` matrix buckets instead of creating a `Mesh`; decoration rolls unchanged in probability/placement math, now recorded as matrices too — decoration matrices are handled in Task 4, this step only wires the **hooks** `pushWallInstanceMatrix(...)` and `pushDecorationMatrix(...)` that Task 4 implements):

```js
                } else if (wallTypeRoll < hazardCut) {
                    // Hazard Wall (pulsing warning siren) — stays an individual
                    // Mesh: rare, and carries a live-animated child (siren dome).
                    const wall = new THREE.Mesh(this.wallGeometry, this.wallMaterial);
                    wall.position.set(worldX, this.wallHeight / 2, worldZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    this.configureWallMesh(wall, {
                        chunkX,
                        chunkY,
                        localX,
                        localY,
                        worldX,
                        worldZ,
                        landform,
                        variant: 'hazard',
                        heightScale: 1
                    });
                    group.add(wall);

                    const sirenBase = new THREE.Mesh(this.sirenBaseGeometry, this.sirenBaseMaterial);
                    sirenBase.position.y = this.wallHeight / 2 + 0.05;
                    wall.add(sirenBase);

                    // Emissive dome only — NO per-wall PointLight. Dozens of dynamic
                    // lights per chunk forced a full shader recompile on every mount
                    // (the chunk-load stall) and crushed forward rendering. The shared
                    // dome material pulses instead (see the siren animation loop).
                    const sirenDome = new THREE.Mesh(this.sirenDomeGeometry, this.sirenDomeMaterial);
                    sirenDome.position.y = this.wallHeight / 2 + 0.14;
                    wall.add(sirenDome);
                } else if (wallTypeRoll < damagedCut) {
                    // Damaged Wall (ruins with rubble debris) — instanced.
                    const shortHeightMult = 0.45 + wallTypeRng() * 0.25;
                    const damagedHeight = this.wallHeight * shortHeightMult;
                    const jitter = this.computeExteriorWallJitter(worldX, worldZ);
                    const damagedMatrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(worldX + jitter.offsetX, damagedHeight / 2, worldZ + jitter.offsetZ),
                        new THREE.Quaternion().setFromEuler(new THREE.Euler(
                            (wallTypeRng() - 0.5) * 0.15,
                            jitter.rotationY,
                            (wallTypeRng() - 0.5) * 0.15
                        )),
                        new THREE.Vector3(1, shortHeightMult, 1)
                    );
                    pushWallInstanceMatrix(damagedMatrix, {
                        chunkX, chunkY, localX, localY, worldX, worldZ, landform,
                        variant: 'damaged', heightScale: shortHeightMult
                    });

                    const rubbleCount = 2 + Math.floor(wallTypeRng() * 3);
                    for (let i = 0; i < rubbleCount; i++) {
                        const size = 0.05 + wallTypeRng() * 0.07;
                        const rx = (wallTypeRng() - 0.5) * 0.72;
                        const rz = (wallTypeRng() - 0.5) * 0.72;
                        const rubbleQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(wallTypeRng() * Math.PI, wallTypeRng() * Math.PI, 0));
                        const rubbleMat = new THREE.Matrix4().compose(
                            new THREE.Vector3(worldX + rx, size, worldZ + rz),
                            rubbleQuat,
                            new THREE.Vector3(size, size, size)
                        );
                        rubbleMatrices.push(rubbleMat);
                    }
                } else {
                    // Standard Wall — instanced.
                    let heightScale = 1;
                    if (landform === LANDFORMS.CANYON) {
                        // Canyon ridges tower over the standard maze so the halls
                        // read as carved terrain, not corridors.
                        heightScale = 1.2 + wallTypeRng() * 0.35;
                    } else if (landform === LANDFORMS.MAZE) {
                        const terrainRoll = wallTypeRng();
                        if (terrainRoll < 0.28) {
                            heightScale = 0.60 + wallTypeRng() * 0.18;
                        } else if (terrainRoll < 0.66) {
                            heightScale = 0.82 + wallTypeRng() * 0.16;
                        } else if (terrainRoll > 0.92) {
                            heightScale = 1.08 + wallTypeRng() * 0.18;
                        }
                    } else if (landform === LANDFORMS.RUINS) {
                        const terrainRoll = wallTypeRng();
                        heightScale = terrainRoll < 0.62
                            ? 0.58 + wallTypeRng() * 0.26
                            : 0.88 + wallTypeRng() * 0.22;
                    } else if (landform === LANDFORMS.FIELD) {
                        heightScale = 0.72 + wallTypeRng() * 0.36;
                    } else if (landform === LANDFORMS.CRATER) {
                        heightScale = 0.88 + wallTypeRng() * 0.40;
                    }
                    const jitter = this.computeExteriorWallJitter(worldX, worldZ);
                    const standardMatrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(worldX + jitter.offsetX, (this.wallHeight * heightScale) / 2, worldZ + jitter.offsetZ),
                        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, jitter.rotationY, 0)),
                        new THREE.Vector3(1, heightScale, 1)
                    );
                    pushWallInstanceMatrix(standardMatrix, {
                        chunkX, chunkY, localX, localY, worldX, worldZ, landform,
                        variant: 'standard', heightScale
                    });

                    const rng = this.createSeededRandom(this.hashTile(worldX, worldZ));
                    const roll = rng();
                    if (roll < 0.12) {
                        const cx = (rng() < 0.5 ? -0.5 : 0.5);
                        const cz = (rng() < 0.5 ? -0.5 : 0.5);
                        pushDecorationMatrix('pillar', standardMatrix, roomStyleIdFor(chunkX, chunkY, localX, localY),
                            new THREE.Matrix4().makeTranslation(cx, 0, cz));
                    } else if (roll < 0.24) {
                        const faceRoll = Math.floor(rng() * 4);
                        const bracketLocal = new THREE.Matrix4();
                        if (faceRoll === 0) {
                            bracketLocal.compose(
                                new THREE.Vector3(0.5, (rng() - 0.5) * 1.5, 0),
                                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
                                new THREE.Vector3(1, 1, 1)
                            );
                        } else if (faceRoll === 1) {
                            bracketLocal.compose(
                                new THREE.Vector3(-0.5, (rng() - 0.5) * 1.5, 0),
                                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
                                new THREE.Vector3(1, 1, 1)
                            );
                        } else if (faceRoll === 2) {
                            bracketLocal.makeTranslation(0, (rng() - 0.5) * 1.5, 0.5);
                        } else {
                            bracketLocal.makeTranslation(0, (rng() - 0.5) * 1.5, -0.5);
                        }
                        pushDecorationMatrix('bracket', standardMatrix, roomStyleIdFor(chunkX, chunkY, localX, localY), bracketLocal);
                    } else if (roll < 0.32) {
                        const faceRoll = Math.floor(rng() * 4);
                        const vy = 0.4 + rng() * 0.6;
                        const ventLocal = new THREE.Matrix4();
                        if (faceRoll === 0) {
                            ventLocal.compose(
                                new THREE.Vector3(0.501, vy, 0),
                                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
                                new THREE.Vector3(1, 1, 1)
                            );
                        } else if (faceRoll === 1) {
                            ventLocal.compose(
                                new THREE.Vector3(-0.501, vy, 0),
                                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
                                new THREE.Vector3(1, 1, 1)
                            );
                        } else if (faceRoll === 2) {
                            ventLocal.makeTranslation(0, vy, 0.501);
                        } else {
                            ventLocal.makeTranslation(0, vy, -0.501);
                        }
                        pushDecorationMatrix('vent', standardMatrix, null, ventLocal);
                    } else if (roll < 0.38) {
                        const faceRoll = Math.floor(rng() * 4);
                        const pipeLocal = new THREE.Matrix4();
                        if (faceRoll === 0) {
                            pipeLocal.makeTranslation(0.42, 0, (rng() - 0.5) * 0.6);
                        } else if (faceRoll === 1) {
                            pipeLocal.makeTranslation(-0.42, 0, (rng() - 0.5) * 0.6);
                        } else if (faceRoll === 2) {
                            pipeLocal.makeTranslation((rng() - 0.5) * 0.6, 0, 0.42);
                        } else {
                            pipeLocal.makeTranslation((rng() - 0.5) * 0.6, 0, -0.42);
                        }
                        pushDecorationMatrix('pipe', standardMatrix, null, pipeLocal);
                    }
                }
```

Note: `pushWallInstanceMatrix`, `pushDecorationMatrix`, and `roomStyleIdFor` are local closures defined in Step 2 below (placed before the loop, same scope as the existing `rubbleMatrices`/`addCliffInstance` locals) — Task 3 implements `pushWallInstanceMatrix` fully; Task 4 implements `pushDecorationMatrix`/`roomStyleIdFor` fully. To keep Task 3 independently testable, its Step 2 stubs `pushDecorationMatrix` as a no-op and `roomStyleIdFor` returning `null` — Task 4 replaces both stubs with real implementations (same file region, no other call site changes needed).

- [ ] **Step 2: Add the bucket-building locals and `pushWallInstanceMatrix`, build pools after the loop**

In `src/threeGame.js`, find this exact block (search for `const rubbleMatrices = [];`):

```js
        const voidPatchMatrices = [];
        const cliffMatricesByBiome = new Map();
        const rubbleMatrices = [];
        const floorRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        const instMatrix = new THREE.Matrix4();
```

Replace it with:

```js
        const voidPatchMatrices = [];
        const cliffMatricesByBiome = new Map();
        const rubbleMatrices = [];
        const floorRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        const instMatrix = new THREE.Matrix4();

        // Standard/damaged walls instance into one InstancedMesh per distinct
        // roomStyleId within this chunk (not one pool for the whole chunk):
        // wallMaterial's onBeforeRender-stamped uRoomStyleId uniform is shared
        // by every instance in one draw call, and different rooms in the same
        // chunk can carry different wall styles. landformShaderId is constant
        // per chunk (one getChunkLandform call), so it doesn't need bucketing.
        const wallMatricesByRoomStyle = new Map(); // roomStyleId -> Matrix4[]
        const wallMetaByRoomStyle = new Map();     // roomStyleId -> opts[] (parallel to matrices)
        const roomStyleIdCache = new Map();        // "localX,localY" -> roomStyleId, avoids re-scanning roomInstances per tile

        const roomStyleIdFor = (cx, cy, localX, localY) => {
            const cacheKey = `${localX},${localY}`;
            if (roomStyleIdCache.has(cacheKey)) return roomStyleIdCache.get(cacheKey);
            const roomMetadata = this.wfcMetadataCache?.get(`${cx},${cy}`);
            const room = roomMetadata?.roomInstances?.find((candidate) => (
                candidate.wallCells?.some((cell) => cell.x === localX && cell.y === localY)
            ));
            const roomStyleId = ROOM_WALL_STYLE_ID[room?.themeConfig?.wallStyle] ?? 0;
            roomStyleIdCache.set(cacheKey, { roomStyleId, roomId: room?.id ?? null, roomWallStyle: room?.themeConfig?.wallStyle ?? null });
            return roomStyleIdCache.get(cacheKey);
        };

        const pushWallInstanceMatrix = (matrix, opts) => {
            const roomInfo = roomStyleIdFor(opts.chunkX, opts.chunkY, opts.localX, opts.localY);
            const bucketKey = roomInfo.roomStyleId;
            if (!wallMatricesByRoomStyle.has(bucketKey)) {
                wallMatricesByRoomStyle.set(bucketKey, []);
                wallMetaByRoomStyle.set(bucketKey, []);
            }
            wallMatricesByRoomStyle.get(bucketKey).push(matrix);
            wallMetaByRoomStyle.get(bucketKey).push({ ...opts, roomId: roomInfo.roomId, roomWallStyle: roomInfo.roomWallStyle });
        };
```

Then find this exact block (search for `if (this.rubbleGeometry && this.wallMaterial && rubbleMatrices.length > 0) {` — it's after the per-tile loop closes):

```js
        if (this.rubbleGeometry && this.wallMaterial && rubbleMatrices.length > 0) {
```

Immediately **before** it, add the pool-building pass:

```js
        const landformShaderId = LANDFORM_SHADER_ID[landform] ?? 0;
        for (const [roomStyleId, matrices] of wallMatricesByRoomStyle.entries()) {
            const metaList = wallMetaByRoomStyle.get(roomStyleId);
            const pool = new THREE.InstancedMesh(this.wallGeometry, this.wallMaterial, matrices.length);
            matrices.forEach((m, idx) => pool.setMatrixAt(idx, m));
            pool.instanceMatrix.needsUpdate = true;
            pool.castShadow = true;
            pool.receiveShadow = true;
            pool.userData = { isWall: true, isInstancedWallPool: true };
            pool.onBeforeRender = () => {
                if (this.wallShaderUniforms) {
                    this.wallShaderUniforms.uLandformId.value = landformShaderId;
                    this.wallShaderUniforms.uRoomStyleId.value = roomStyleId;
                }
            };
            metaList.forEach((opts, idx) => {
                const record = this.createWallInstanceRecord(opts);
                record.instancedMesh = pool;
                record.instanceIndex = idx;
                this._wallInstanceIndex.set(record.wallKey, record);
            });
            group.add(pool);
        }

```

- [ ] **Step 3: Stub the not-yet-implemented decoration hook**

Task 4 implements `pushDecorationMatrix` for real. For Task 3 to be independently testable/runnable right now, add a temporary no-op stub in the same local-closures block from Step 2 (immediately after the `pushWallInstanceMatrix` closure):

```js
        // TODO(Task 4): replaced with real per-decoration-type instanced pools.
        const pushDecorationMatrix = () => {};
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS, no regressions. This task doesn't add new direct unit tests of its own (the wall-tile loop's only test coverage today is indirect, via chunk-generation tests that don't inspect mesh counts) — correctness here is verified in Task 6 once damage/destroy round-trips through the new index, and in the manual verification step at the end of this plan.

Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js
git commit -m "feat: instance standard+damaged walls into per-roomStyleId InstancedMesh pools"
```

---

### Task 4: Instance standard-wall decorations (pillar/bracket/vent/pipe)

**Files:**
- Modify: `src/threeGame.js` (`mountChunk`, replacing Task 3's `pushDecorationMatrix` stub)

**Interfaces:**
- Consumes: `pushWallInstanceMatrix`'s sibling closures from Task 3 (same local scope), `roomStyleIdFor` (Task 3).
- Produces: real `pushDecorationMatrix(type, wallMatrix, roomStyleId, localMatrix)` — composes `wallMatrix * localMatrix` (preserving the current parent-child visual: the decoration inherits the wall's jittered position and height-scale) and pushes into the correct per-type bucket. Pillar/bracket bucket by `roomStyleId` (shared `wallMaterial`); vent/pipe use one flat pool per chunk each (separate plain materials, no shader constraint — confirmed by reading `ventMaterial`/`pipeMaterial`'s definitions, both plain `MeshBasicMaterial`).

- [ ] **Step 1: Replace the stub with the real implementation**

In `src/threeGame.js`, find the stub added in Task 3 Step 3:

```js
        // TODO(Task 4): replaced with real per-decoration-type instanced pools.
        const pushDecorationMatrix = () => {};
```

Replace it with:

```js
        const pillarMatricesByRoomStyle = new Map();
        const bracketMatricesByRoomStyle = new Map();
        const ventMatrices = [];
        const pipeMatrices = [];
        const decorationScratch = new THREE.Matrix4();

        const pushDecorationMatrix = (type, wallMatrix, roomInfo, localMatrix) => {
            decorationScratch.multiplyMatrices(wallMatrix, localMatrix);
            if (type === 'vent') {
                ventMatrices.push(decorationScratch.clone());
                return;
            }
            if (type === 'pipe') {
                pipeMatrices.push(decorationScratch.clone());
                return;
            }
            const target = type === 'pillar' ? pillarMatricesByRoomStyle : bracketMatricesByRoomStyle;
            const bucketKey = roomInfo.roomStyleId;
            if (!target.has(bucketKey)) target.set(bucketKey, []);
            target.get(bucketKey).push(decorationScratch.clone());
        };
```

Then update Task 3's three `pushDecorationMatrix(...)` call sites (`'pillar'`, `'bracket'`, `'vent'`, `'pipe'`) to pass the room info object instead of a raw `roomStyleId` number, since `roomStyleIdFor` (Task 3) returns `{ roomStyleId, roomId, roomWallStyle }`. Find each of these four call sites (search for `pushDecorationMatrix('pillar'`, `pushDecorationMatrix('bracket'`, `pushDecorationMatrix('vent'`, `pushDecorationMatrix('pipe'`) and change the third argument from `roomStyleIdFor(chunkX, chunkY, localX, localY)` to the same expression — **no change needed**, since `roomStyleIdFor` already returns the full `{ roomStyleId, roomId, roomWallStyle }` object (Task 3 wrote it that way in anticipation of this task), and the vent/pipe call sites already pass `null` (unused by the vent/pipe branch above, which ignores `roomInfo`). Confirm this by re-reading Task 3's Step 1 diff — no edit is actually required here; this step exists to document why the shapes line up.

- [ ] **Step 2: Build the four decoration pools after the wall-pool-building pass**

In `src/threeGame.js`, find the wall-pool-building loop added in Task 3 Step 2 (search for `metaList.forEach((opts, idx) => {`) and locate its closing `}` followed by `group.add(pool);` and the loop's closing `}`:

```js
            metaList.forEach((opts, idx) => {
                const record = this.createWallInstanceRecord(opts);
                record.instancedMesh = pool;
                record.instanceIndex = idx;
                this._wallInstanceIndex.set(record.wallKey, record);
            });
            group.add(pool);
        }

```

Immediately **after** this block (still before `if (this.rubbleGeometry && this.wallMaterial && rubbleMatrices.length > 0) {`), add:

```js
        for (const [roomStyleId, matrices] of pillarMatricesByRoomStyle.entries()) {
            if (matrices.length === 0) continue;
            const pool = new THREE.InstancedMesh(this.pillarGeometry, this.wallMaterial, matrices.length);
            matrices.forEach((m, idx) => pool.setMatrixAt(idx, m));
            pool.instanceMatrix.needsUpdate = true;
            pool.castShadow = true;
            pool.receiveShadow = true;
            pool.userData = { isWallDecoration: true, decorationType: 'pillar' };
            pool.onBeforeRender = () => {
                if (this.wallShaderUniforms) {
                    this.wallShaderUniforms.uLandformId.value = landformShaderId;
                    this.wallShaderUniforms.uRoomStyleId.value = roomStyleId;
                }
            };
            group.add(pool);
        }

        for (const [roomStyleId, matrices] of bracketMatricesByRoomStyle.entries()) {
            if (matrices.length === 0) continue;
            const pool = new THREE.InstancedMesh(this.bracketGeometry, this.wallMaterial, matrices.length);
            matrices.forEach((m, idx) => pool.setMatrixAt(idx, m));
            pool.instanceMatrix.needsUpdate = true;
            pool.castShadow = true;
            pool.receiveShadow = true;
            pool.userData = { isWallDecoration: true, decorationType: 'bracket' };
            pool.onBeforeRender = () => {
                if (this.wallShaderUniforms) {
                    this.wallShaderUniforms.uLandformId.value = landformShaderId;
                    this.wallShaderUniforms.uRoomStyleId.value = roomStyleId;
                }
            };
            group.add(pool);
        }

        if (ventMatrices.length > 0) {
            const ventPool = new THREE.InstancedMesh(this.ventGeometry, this.ventMaterial, ventMatrices.length);
            ventMatrices.forEach((m, idx) => ventPool.setMatrixAt(idx, m));
            ventPool.instanceMatrix.needsUpdate = true;
            ventPool.userData = { isWallDecoration: true, decorationType: 'vent' };
            group.add(ventPool);
        }

        if (pipeMatrices.length > 0) {
            const pipePool = new THREE.InstancedMesh(this.pipeGeometry, this.pipeMaterial, pipeMatrices.length);
            pipeMatrices.forEach((m, idx) => pipePool.setMatrixAt(idx, m));
            pipePool.instanceMatrix.needsUpdate = true;
            pipePool.castShadow = true;
            pipePool.receiveShadow = true;
            pipePool.userData = { isWallDecoration: true, decorationType: 'pipe' };
            group.add(pipePool);
        }

```

Note: `pillar`/`bracket` pools deliberately do **not** set `userData.isWall = true` (unlike the wall pools in Task 3) — they must not be swept into `this.wallMeshes` (they'd be spurious raycast/occlusion targets that were never part of `wallMeshes` before this change either, since decorations were plain children of a wall Mesh, never pushed into `wallMeshes` themselves).

- [ ] **Step 2: Run the full suite**

Run: `npx vitest run`
Expected: PASS, no regressions.
Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 3: Commit**

```bash
git add src/threeGame.js
git commit -m "feat: instance standard-wall pillar/bracket/vent/pipe decorations"
```

---

### Task 5: Instance door ribs and control panels

**Files:**
- Modify: `src/threeGame.js` (`mountChunk`, door-tile branch)

**Interfaces:**
- Consumes: nothing from Tasks 1-4 (independent — doors are unaffected by wall instancing).
- Produces: two chunk-level `InstancedMesh` pools (ribs, panels) replacing 5 of a door's ~8 sub-meshes. Door slab, status bar, and buttons stay individual `Mesh` objects exactly as today (status bar/buttons are state-dependent, per the spec's door-scope decision).

- [ ] **Step 1: Replace the rib/panel creation with matrix collection**

In `src/threeGame.js`, inside `mountChunk`'s door-tile branch, find this exact block (search for `for (const ribOffset of [-0.28, 0, 0.28]) {`):

```js
                    for (const ribOffset of [-0.28, 0, 0.28]) {
                        const rib = new THREE.Mesh(
                            new THREE.BoxGeometry(0.08, 1.02, 1.1),
                            new THREE.MeshStandardMaterial({
                                color: 0x11161b,
                                roughness: 0.3,
                                metalness: 0.92
                            })
                        );
                        rib.position.x = horizontal ? ribOffset : 0;
                        rib.position.z = horizontal ? 0 : ribOffset;
                        if (!horizontal) rib.rotation.y = Math.PI / 2;
                        doorMesh.add(rib);
                    }

                    const panelGeometry = new THREE.BoxGeometry(0.38, 0.58, 0.24);
                    for (const side of [-1, 1]) {
                        const panel = new THREE.Mesh(
                            panelGeometry,
                            new THREE.MeshStandardMaterial({
                                color: 0x12191f,
                                emissive: 0x07141a,
                                metalness: 0.78,
                                roughness: 0.38
                            })
                        );
                        panel.position.set(
                            worldX + (horizontal ? -1.72 : side * 0.78),
                            0.82,
                            worldZ + (horizontal ? side * 0.78 : -1.72)
                        );
                        const button = new THREE.Mesh(
                            new THREE.CircleGeometry(0.11, 16),
                            statusMaterial
                        );
                        button.position.z = 0.125;
                        panel.add(button);
                        panel.userData = {
                            isProceduralDoorControl: true,
                            proceduralDoorId: persistedDoor?.id ?? null
                        };
                        group.add(panel);
                    }
```

Replace it with (ribs are relative to the door slab's own position/rotation, which doesn't get exterior jitter today — doors aren't passed through `computeExteriorWallJitter`, so their world matrix is simply their own `position`/`rotation.y` composed directly; panels/buttons keep the button attached to an individually-tracked position since buttons are state-dependent and stay out of scope per the spec):

```js
                    const doorWorldMatrix = new THREE.Matrix4().compose(
                        new THREE.Vector3(worldX, 0, worldZ),
                        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, horizontal ? 0 : Math.PI / 2, 0)),
                        new THREE.Vector3(1, 1, 1)
                    );
                    for (const ribOffset of [-0.28, 0, 0.28]) {
                        const localX = horizontal ? ribOffset : 0;
                        const localZ = horizontal ? 0 : ribOffset;
                        const ribMatrix = new THREE.Matrix4()
                            .multiplyMatrices(doorWorldMatrix, new THREE.Matrix4().makeTranslation(localX, 0.42, localZ));
                        doorRibMatrices.push(ribMatrix);
                    }

                    for (const side of [-1, 1]) {
                        const panelWorldX = worldX + (horizontal ? -1.72 : side * 0.78);
                        const panelWorldZ = worldZ + (horizontal ? side * 0.78 : -1.72);
                        doorPanelMatrices.push(new THREE.Matrix4().makeTranslation(panelWorldX, 0.82, panelWorldZ));

                        const button = new THREE.Mesh(
                            new THREE.CircleGeometry(0.11, 16),
                            statusMaterial
                        );
                        button.position.set(panelWorldX, 0.82, panelWorldZ + 0.125);
                        button.userData = {
                            isProceduralDoorControl: true,
                            proceduralDoorId: persistedDoor?.id ?? null
                        };
                        group.add(button);
                    }
```

**Note:** the original code positioned `rib`/`panel` at local offsets from `0` since they were `doorMesh.add(...)` children (inheriting `doorMesh.position`), and it positioned `button` at a LOCAL offset (`button.position.z = 0.125`) since it was `panel.add(button)` — a child of the panel. Since panels are no longer individual objects (instanced) and buttons must stay individual (state-dependent, click targets — see `isProceduralDoorControl`), buttons are now positioned in **world space directly** (`panelWorldX/panelWorldZ + 0.125` offset baked in), matching the previous *effective* world position exactly (local child offsets composed with the panel's world position produce the same final world coordinates either way). The rib matrix's height offset (`0.42`) replaces what was previously an inherited Y from `doorMesh`'s vertical animation — **this is a deliberate, spec-agreed simplification**: since ribs are purely decorative and doors open by moving down (`doorMesh.userData.openY`), instanced ribs will not follow an open door's downward slide the way a real child would have. Flag this as a behavior change for the task reviewer to confirm against the spec's door-scope decision before merging (the spec said ribs/panels are "purely static," which was true for position but did not explicitly discuss the open-animation-following behavior — this is a real, visible gap the reviewer must weigh in on, not silently accept).

- [ ] **Step 2: Declare the matrix arrays and build the two pools**

In `src/threeGame.js`, find the same local-closures block from Task 3 Step 2 (search for `const decorationScratch = new THREE.Matrix4();` added in Task 4) and add two more array declarations immediately after it:

```js
        const doorRibMatrices = [];
        const doorPanelMatrices = [];
```

Then find the decoration-pool-building block added in Task 4 Step 2 (search for `if (pipeMatrices.length > 0) {`) and its closing `}`, and add the door pools immediately after:

```js
        if (doorRibMatrices.length > 0) {
            const ribGeometry = new THREE.BoxGeometry(0.08, 1.02, 1.1);
            const ribMaterial = new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.3, metalness: 0.92 });
            const ribPool = new THREE.InstancedMesh(ribGeometry, ribMaterial, doorRibMatrices.length);
            doorRibMatrices.forEach((m, idx) => ribPool.setMatrixAt(idx, m));
            ribPool.instanceMatrix.needsUpdate = true;
            ribPool.userData = { isDoorDecoration: true, decorationType: 'rib' };
            group.add(ribPool);
        }

        if (doorPanelMatrices.length > 0) {
            const panelGeometry = new THREE.BoxGeometry(0.38, 0.58, 0.24);
            const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x12191f, emissive: 0x07141a, metalness: 0.78, roughness: 0.38 });
            const panelPool = new THREE.InstancedMesh(panelGeometry, panelMaterial, doorPanelMatrices.length);
            doorPanelMatrices.forEach((m, idx) => panelPool.setMatrixAt(idx, m));
            panelPool.instanceMatrix.needsUpdate = true;
            panelPool.userData = { isDoorDecoration: true, decorationType: 'panel' };
            group.add(panelPool);
        }

```

Note: `ribGeometry`/`ribMaterial`/`panelGeometry`/`panelMaterial` were previously created fresh per rib/panel (one `new THREE.BoxGeometry(...)`/`new THREE.MeshStandardMaterial(...)` per instance, per door). This change creates ONE geometry/material per chunk instead (shared across every door's ribs/panels in that chunk) — consistent with every other instanced pool in this file, and strictly cheaper (was already wasteful to allocate N identical geometries/materials per door).

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: PASS, no regressions.
Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 4: Commit**

```bash
git add src/threeGame.js
git commit -m "feat: instance door ribs and control panels, flag open-animation gap for review"
```

---

### Task 6: Damage/destroy/find/cleanup branching for instanced walls

**Files:**
- Modify: `src/threeGame.js` (`findWallMeshAt`, `damageWall`, `destroyWall`, `updateWallDamageColor`, `markWallTileDestroyed`, `syncVisibleChunks`'s chunk-unmount block)
- Test: `src/threeGame.destructibleWalls.test.js`, `src/threeGame.chunkVariation.test.js`

**Interfaces:**
- Consumes: `this._wallInstanceIndex` (Task 1), pools from Task 3 (`instancedMesh`/`instanceIndex` on each record).
- Produces: `findWallMeshAt` returns an instanced-wall record (not just real Meshes) when the coordinate matches one; `damageWall`/`destroyWall`/`updateWallDamageColor` branch on `wall.isInstancedWall`; chunk unmount clears that chunk's entries from `_wallInstanceIndex`.

- [ ] **Step 1: Write the failing tests**

Add to `src/threeGame.destructibleWalls.test.js`:

```js
describe('instanced wall damage/destroy — via _wallInstanceIndex', () => {
    function makeInstancedWallFakeThis(record) {
        return {
            wallMaterial: {},
            destroyedWallKeys: new Set(),
            destroyedExteriorWallKeys: new Set(),
            chunkSize: 19,
            chunkCache: new Map([['0,0', Array.from({ length: 19 }, () => Array(19).fill('#'))]]),
            _chunkRoomTypeCache: new Map(),
            _chunkTemplateCache: new Map(),
            _wallInstanceIndex: new Map([[record.wallKey, record]]),
            wallMeshes: [],
            proceduralDoorStates: new Map(),
            refreshMazeAccessState: () => {},
            clearWallDecalsForWall: () => {},
            spawnPhysicalBurst: () => {},
            spawnTextureBurstEffect: () => {},
            triggerCameraShake: () => {},
            getWallKey: ThreeGame.prototype.getWallKey,
            getChunkLocalFromWorld: ThreeGame.prototype.getChunkLocalFromWorld,
            isExteriorWallTile: () => false,
            findWallMeshAt: ThreeGame.prototype.findWallMeshAt,
            markWallTileDestroyed: ThreeGame.prototype.markWallTileDestroyed,
            updateWallDamageColor: ThreeGame.prototype.updateWallDamageColor,
            destroyWall: ThreeGame.prototype.destroyWall,
            damageWall: ThreeGame.prototype.damageWall
        };
    }

    function makeInstancedMeshStub(count) {
        return {
            count,
            instanceColor: null,
            setColorAt: vi.fn(function setColorAt(index, color) {
                this.instanceColor = this.instanceColor ?? {};
                this.instanceColor[index] = color;
            }),
            setMatrixAt: vi.fn(),
            instanceMatrix: { needsUpdate: false }
        };
    }

    it('findWallMeshAt resolves an instanced wall record by wallKey', () => {
        const pool = makeInstancedMeshStub(1);
        const record = ThreeGame.prototype.createWallInstanceRecord.call(
            { getWallKey: ThreeGame.prototype.getWallKey, getWallMaxHp: ThreeGame.prototype.getWallMaxHp },
            { chunkX: 0, chunkY: 0, localX: 5, localY: 5, worldX: 5, worldZ: 5, landform: 'maze', variant: 'standard', heightScale: 1 }
        );
        record.instancedMesh = pool;
        record.instanceIndex = 0;
        const fakeThis = makeInstancedWallFakeThis(record);

        const found = call('findWallMeshAt', fakeThis, 5, 5);

        expect(found).toBe(record);
        expect(found.isInstancedWall).toBe(true);
    });

    it('damageWall tints an instanced wall via setColorAt instead of cloning a material', () => {
        const pool = makeInstancedMeshStub(1);
        const record = ThreeGame.prototype.createWallInstanceRecord.call(
            { getWallKey: ThreeGame.prototype.getWallKey, getWallMaxHp: ThreeGame.prototype.getWallMaxHp },
            { chunkX: 0, chunkY: 0, localX: 5, localY: 5, worldX: 5, worldZ: 5, landform: 'maze', variant: 'standard', heightScale: 1 }
        );
        record.instancedMesh = pool;
        record.instanceIndex = 0;
        const fakeThis = makeInstancedWallFakeThis(record);

        const destroyed = call('damageWall', fakeThis, record, 1);

        expect(destroyed).toBe(false);
        expect(record.wallHp).toBe(record.maxWallHp - 1);
        expect(pool.setColorAt).toHaveBeenCalledTimes(1);
        expect(pool.setColorAt.mock.calls[0][0]).toBe(0);
    });

    it('destroyWall zeroes only the destroyed instance\'s matrix and removes it from the index, without touching wallMeshes', () => {
        const pool = makeInstancedMeshStub(2);
        const recordA = ThreeGame.prototype.createWallInstanceRecord.call(
            { getWallKey: ThreeGame.prototype.getWallKey, getWallMaxHp: ThreeGame.prototype.getWallMaxHp },
            { chunkX: 0, chunkY: 0, localX: 5, localY: 5, worldX: 5, worldZ: 5, landform: 'maze', variant: 'standard', heightScale: 1 }
        );
        recordA.instancedMesh = pool;
        recordA.instanceIndex = 0;
        const recordB = ThreeGame.prototype.createWallInstanceRecord.call(
            { getWallKey: ThreeGame.prototype.getWallKey, getWallMaxHp: ThreeGame.prototype.getWallMaxHp },
            { chunkX: 0, chunkY: 0, localX: 6, localY: 5, worldX: 6, worldZ: 5, landform: 'maze', variant: 'standard', heightScale: 1 }
        );
        recordB.instancedMesh = pool;
        recordB.instanceIndex = 1;
        const fakeThis = makeInstancedWallFakeThis(recordA);
        fakeThis._wallInstanceIndex.set(recordB.wallKey, recordB);
        fakeThis.wallMeshes = [pool]; // the pool itself is a raycast target

        recordA.wallHp = 1;
        const destroyed = call('damageWall', fakeThis, recordA, 5);

        expect(destroyed).toBe(true);
        expect(recordA.destroyed).toBe(true);
        expect(fakeThis._wallInstanceIndex.has(recordA.wallKey)).toBe(false);
        // recordB (a different instance in the SAME pool) is untouched
        expect(fakeThis._wallInstanceIndex.has(recordB.wallKey)).toBe(true);
        expect(recordB.destroyed).toBe(false);
        // the pool itself stays in wallMeshes — only the one instance is retired
        expect(fakeThis.wallMeshes).toContain(pool);
        expect(pool.setMatrixAt).toHaveBeenCalledWith(0, expect.anything());
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js -t "instanced wall damage/destroy"`
Expected: FAIL — `findWallMeshAt` only checks `this.wallMeshes` (a real-Mesh array), so it returns `null`; the other two tests fail for the same underlying reason (no instanced-wall branch exists yet).

- [ ] **Step 3: Update `findWallMeshAt`**

In `src/threeGame.js`, find:

```js
    findWallMeshAt(worldX, worldZ) {
        const key = this.getWallKey(worldX, worldZ);
        return this.wallMeshes.find((wall) => wall?.userData?.wallKey === key && !wall.userData.destroyed) ?? null;
    }
```

Replace it with:

```js
    findWallMeshAt(worldX, worldZ) {
        const key = this.getWallKey(worldX, worldZ);
        const instanced = this._wallInstanceIndex?.get(key);
        if (instanced && !instanced.destroyed) return instanced;
        return this.wallMeshes.find((wall) => wall?.userData?.wallKey === key && !wall.userData.destroyed) ?? null;
    }
```

- [ ] **Step 4: Branch `updateWallDamageColor` on `isInstancedWall`**

In `src/threeGame.js`, find:

```js
    updateWallDamageColor(wall) {
        if (!wall?.userData?.isWall || wall.userData.destroyed) return;
        const maxHp = Math.max(1, wall.userData.maxWallHp ?? WALL_HP_STANDARD);
        const hp = Math.max(0, wall.userData.wallHp ?? maxHp);
        const damageRatio = Math.min(1, Math.max(0, 1 - hp / maxHp));
        if (damageRatio <= 0) return;

        if (wall.material === this.wallMaterial) {
            wall.material = this.wallMaterial.clone();
        }

        if (!wall.userData.originalColorHex && wall.material?.color) {
            wall.userData.originalColorHex = wall.material.color.getHex();
        }

        if (wall.material?.color) {
            const baseColor = new THREE.Color(wall.userData.originalColorHex ?? 0x808b96);
            const targetColor = new THREE.Color(0xff3300);
            wall.material.color.copy(baseColor).lerp(targetColor, damageRatio * 0.75);
        }

        if (wall.material?.emissive) {
            wall.material.emissive.setHex(0xff2200);
            wall.material.emissiveIntensity = damageRatio * 0.85;
        }
    }
```

Replace it with:

```js
    updateWallDamageColor(wall) {
        if (!wall?.userData?.isWall || wall.userData.destroyed) return;
        const maxHp = Math.max(1, wall.userData.maxWallHp ?? WALL_HP_STANDARD);
        const hp = Math.max(0, wall.userData.wallHp ?? maxHp);
        const damageRatio = Math.min(1, Math.max(0, 1 - hp / maxHp));
        if (damageRatio <= 0) return;

        if (wall.isInstancedWall) {
            // No per-mesh material to clone — per-instance color via the
            // standard InstancedMesh color pipeline instead. wallMaterial's
            // custom shader only replaces #include <map_fragment>; the
            // standard #include <color_fragment> (and the vertex-side
            // USE_INSTANCING_COLOR multiply into vColor) are untouched, so
            // setColorAt works against this material unmodified.
            const baseColor = new THREE.Color(0x808b96);
            const targetColor = new THREE.Color(0xff3300);
            baseColor.lerp(targetColor, damageRatio * 0.75);
            wall.instancedMesh.setColorAt(wall.instanceIndex, baseColor);
            if (wall.instancedMesh.instanceColor) wall.instancedMesh.instanceColor.needsUpdate = true;
            return;
        }

        if (wall.material === this.wallMaterial) {
            wall.material = this.wallMaterial.clone();
        }

        if (!wall.userData.originalColorHex && wall.material?.color) {
            wall.userData.originalColorHex = wall.material.color.getHex();
        }

        if (wall.material?.color) {
            const baseColor = new THREE.Color(wall.userData.originalColorHex ?? 0x808b96);
            const targetColor = new THREE.Color(0xff3300);
            wall.material.color.copy(baseColor).lerp(targetColor, damageRatio * 0.75);
        }

        if (wall.material?.emissive) {
            wall.material.emissive.setHex(0xff2200);
            wall.material.emissiveIntensity = damageRatio * 0.85;
        }
    }
```

- [ ] **Step 5: Branch `markWallTileDestroyed` and `destroyWall` on `isInstancedWall`**

In `src/threeGame.js`, find:

```js
        const wallMesh = this.findWallMeshAt?.(coord.tileX, coord.tileZ);
        if (wallMesh) {
            const parent = wallMesh.parent;
            wallMesh.userData.destroyed = true;
            wallMesh.visible = false;
            parent?.remove(wallMesh);
            if (exterior) {
                const patch = this.createExteriorGroundPatch?.(coord.tileX, coord.tileZ);
                if (patch) parent?.add(patch);
            }
            if (this.wallMeshes) {
                this.wallMeshes = this.wallMeshes.filter((candidate) => candidate !== wallMesh);
            }
        }
```

Replace it with:

```js
        const wallMesh = this.findWallMeshAt?.(coord.tileX, coord.tileZ);
        if (wallMesh?.isInstancedWall) {
            // No parent to remove from and no per-tile geometry to swap out —
            // zero the instance's matrix (collapses its bounding volume, so
            // raycasts naturally stop hitting it — see lineDirector-style
            // "no eligible = no-op" precedent) and drop it from the index.
            // The pool itself stays in the scene/wallMeshes; only this one
            // instance is retired.
            wallMesh.instancedMesh?.setMatrixAt(wallMesh.instanceIndex, new THREE.Matrix4().makeScale(0, 0, 0));
            if (wallMesh.instancedMesh) wallMesh.instancedMesh.instanceMatrix.needsUpdate = true;
            wallMesh.destroyed = true;
            this._wallInstanceIndex?.delete(wallMesh.wallKey);
            if (exterior) {
                const patch = this.createExteriorGroundPatch?.(coord.tileX, coord.tileZ);
                if (patch) this.chunkMeshes?.get?.(wallMesh.chunkKey)?.add(patch);
            }
        } else if (wallMesh) {
            const parent = wallMesh.parent;
            wallMesh.userData.destroyed = true;
            wallMesh.visible = false;
            parent?.remove(wallMesh);
            if (exterior) {
                const patch = this.createExteriorGroundPatch?.(coord.tileX, coord.tileZ);
                if (patch) parent?.add(patch);
            }
            if (this.wallMeshes) {
                this.wallMeshes = this.wallMeshes.filter((candidate) => candidate !== wallMesh);
            }
        }
```

Then find, inside `destroyWall`:

```js
        wall.userData.destroyed = true;
        wall.visible = false;
        wall.parent?.remove(wall);
        this.wallMeshes = this.wallMeshes.filter((candidate) => candidate !== wall);
```

Replace it with:

```js
        wall.userData.destroyed = true;
        if (!wall.isInstancedWall) {
            wall.visible = false;
            wall.parent?.remove(wall);
            this.wallMeshes = this.wallMeshes.filter((candidate) => candidate !== wall);
        }
```

(`markWallTileDestroyed` — called by `destroyWall` just above this block, via `this.markWallTileDestroyed(worldX, worldZ)` — already does the instance-matrix zeroing and index cleanup for the instanced case, so this second block only needs to skip the individual-Mesh-only operations for instanced walls, not duplicate the zeroing.)

- [ ] **Step 6: Clean up `_wallInstanceIndex` on chunk unmount**

In `src/threeGame.js`, find (inside `syncVisibleChunks`):

```js
            this.disposeChunkGroupResources(group);
            this.chunkGroups.remove(group);
            this.chunkMeshes.delete(key);
            this.pendingChunkMountKeys.delete(key);
```

Replace it with:

```js
            this.disposeChunkGroupResources(group);
            this.chunkGroups.remove(group);
            this.chunkMeshes.delete(key);
            this.pendingChunkMountKeys.delete(key);
            if (this._wallInstanceIndex) {
                for (const [wallKey, record] of this._wallInstanceIndex) {
                    if (record.chunkKey === key) this._wallInstanceIndex.delete(wallKey);
                }
            }
```

- [ ] **Step 7: Write the failing chunk-unmount test**

Add to `src/threeGame.chunkVariation.test.js` (near the existing `clearLoadedChunksForRunReset` describe block):

```js
describe('syncVisibleChunks — _wallInstanceIndex cleanup on chunk unmount', () => {
    it('removes _wallInstanceIndex entries belonging to a chunk that falls out of the resident window', () => {
        const record = { wallKey: '5,5', chunkKey: '0,0' };
        const otherRecord = { wallKey: '50,50', chunkKey: '2,2' };
        const fakeThis = {
            player: { position: { x: 0, z: 0 } },
            chunkSize: 19,
            visibleChunkRadius: 0,
            chunkResidentPadding: 0,
            chunkPrefetchMargin: 0,
            chunkMeshes: new Map([['0,0', { visible: true, userData: {}, children: [] }]]),
            chunkGroups: { remove: () => {} },
            pendingChunkMountKeys: new Set(),
            pendingChunkMounts: [],
            wallMeshes: [],
            pickupMeshes: [],
            scatterSprites: [],
            _wallInstanceIndex: new Map([['5,5', record], ['50,50', otherRecord]]),
            disposeChunkGroupResources: () => {},
            processPendingChunkMounts: () => {},
            getChunkPrefetchCoords: () => [],
            maxChunkMountsPerFrame: 1
        };

        ThreeGame.prototype.syncVisibleChunks.call(fakeThis, true);

        expect(fakeThis._wallInstanceIndex.has('50,50')).toBe(false);
        expect(fakeThis._wallInstanceIndex.has('5,5')).toBe(true);
    });
});
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js src/threeGame.chunkVariation.test.js`
Expected: PASS — all tests including the new ones, and every pre-existing test unchanged (individual-wall paths untouched by the added branches).

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run` — expect no regressions.
Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 10: Commit**

```bash
git add src/threeGame.js src/threeGame.destructibleWalls.test.js src/threeGame.chunkVariation.test.js
git commit -m "feat: branch wall damage/destroy/find/cleanup on isInstancedWall"
```

---

### Task 7: Projectile raycast resolves instanced-wall hits

**Files:**
- Modify: `src/threeGame.js` (`checkProjectileWallHit`)
- Test: `src/threeGame.destructibleWalls.test.js`

**Interfaces:**
- Consumes: `this._wallInstanceIndex` (Task 1), the fact that `intersectObjects` against an `InstancedMesh` returns `.instanceId` in the hit result (standard Three.js raycasting behavior, no change needed to the raycast call itself — see spec's "Raycasting" section).
- Produces: `checkProjectileWallHit` returns `{ point, normalX, normalZ, wall }` where `wall` is either a real Mesh (hazard wall) or an instanced-wall record resolved via `hit.object.userData.isInstancedWallPool` + `hit.instanceId` — same return shape callers already expect (`14896`: `this.damageWall(wallHit.wall, ...)`; `14901`: `wallHit.wall?.userData?.wallKey`).

- [ ] **Step 1: Write the failing test**

Add to `src/threeGame.destructibleWalls.test.js`:

```js
describe('checkProjectileWallHit — resolves instanced-wall hits by instanceId', () => {
    it('resolves an InstancedMesh hit to the correct _wallInstanceIndex record via wallKey lookup', () => {
        const record = { wallKey: '5,5', instancedMesh: null, instanceIndex: 2, userData: null };
        record.userData = record;
        const pool = { userData: { isInstancedWallPool: true } };
        record.instancedMesh = pool;

        // findWallMeshAtInstanceIndex is the small helper this task adds to
        // resolve (pool, instanceId) -> the record — test it directly rather
        // than the full raycast, since raycasting itself needs a real
        // THREE.Raycaster/scene not worth mocking here.
        const fakeThis = {
            _wallInstanceIndex: new Map([['5,5', record]])
        };

        const resolved = call('findWallByPoolInstance', fakeThis, pool, 2);

        expect(resolved).toBe(record);
    });

    it('returns null when no record in the index matches that pool+instanceId', () => {
        const fakeThis = { _wallInstanceIndex: new Map() };

        const resolved = call('findWallByPoolInstance', fakeThis, {}, 0);

        expect(resolved).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js -t "checkProjectileWallHit"`
Expected: FAIL — `ThreeGame.prototype.findWallByPoolInstance is not a function`.

- [ ] **Step 3: Add `findWallByPoolInstance` and use it in `checkProjectileWallHit`**

In `src/threeGame.js`, find `checkProjectileWallHit` (search for `checkProjectileWallHit(projectile) {`) and add this new method immediately **before** it:

```js
    // Resolves an InstancedMesh raycast hit (pool + instanceId) back to the
    // specific wall it represents. O(n) over the index is fine — this only
    // runs on an actual projectile-vs-wall hit, not every frame.
    findWallByPoolInstance(pool, instanceId) {
        if (!this._wallInstanceIndex) return null;
        for (const record of this._wallInstanceIndex.values()) {
            if (record.instancedMesh === pool && record.instanceIndex === instanceId) return record;
        }
        return null;
    }

```

Then find, inside `checkProjectileWallHit`:

```js
        const hits = this._projRaycaster.intersectObjects(this.wallMeshes, false);
        if (!hits.length) return null;
        const hit = hits[0];
        // World-space face normal (geometry normals are in local space).
        let nx = -projectile.vx / speed;
        let nz = -projectile.vz / speed;
        if (hit.face && hit.object) {
            const worldNormal = hit.face.normal.clone()
                .transformDirection(hit.object.matrixWorld);
            if (Number.isFinite(worldNormal.x) && Number.isFinite(worldNormal.z)) {
                nx = worldNormal.x;
                nz = worldNormal.z;
            }
        }
        return { point: hit.point, normalX: nx, normalZ: nz, wall: hit.object };
```

Replace it with:

```js
        const hits = this._projRaycaster.intersectObjects(this.wallMeshes, false);
        if (!hits.length) return null;
        const hit = hits[0];
        // World-space face normal (geometry normals are in local space).
        let nx = -projectile.vx / speed;
        let nz = -projectile.vz / speed;
        if (hit.face && hit.object) {
            const worldNormal = hit.face.normal.clone()
                .transformDirection(hit.object.matrixWorld);
            if (Number.isFinite(worldNormal.x) && Number.isFinite(worldNormal.z)) {
                nx = worldNormal.x;
                nz = worldNormal.z;
            }
        }
        const wall = (hit.object?.userData?.isInstancedWallPool && Number.isInteger(hit.instanceId))
            ? (this.findWallByPoolInstance(hit.object, hit.instanceId) ?? hit.object)
            : hit.object;
        return { point: hit.point, normalX: nx, normalZ: nz, wall };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/threeGame.destructibleWalls.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run` — expect no regressions.
Run: `node --check src/threeGame.js` — expect clean.

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.destructibleWalls.test.js
git commit -m "feat: resolve instanced-wall projectile hits via instanceId lookup"
```

---

## Self-Review Notes

- **Spec coverage:** wall+damaged instancing with roomStyleId pooling (Task 3), pillar/bracket/vent/pipe decoration instancing (Task 4), door rib/panel instancing (Task 5), identity/damage/destroy/find/raycast preservation (Tasks 1, 2, 6, 7). Hazard walls and door slabs/status-bars/buttons confirmed left untouched throughout.
- **Placeholder scan:** no TBD/TODO left unresolved — the one `// TODO(Task 4): ...` marker in Task 3 Step 3 is explicitly a hand-off to the very next task in this same plan, not an open placeholder, and Task 4 Step 1 replaces it.
- **Type consistency:** `WallInstanceRecord` shape (Task 1) is used identically by `createWallInstanceRecord`, `findWallMeshAt`, `damageWall`, `destroyWall`, `updateWallDamageColor`, `markWallTileDestroyed`, and `findWallByPoolInstance` — `isInstancedWall`, `instancedMesh`, `instanceIndex`, `wallKey`, `chunkKey`, self-referential `userData` all match across every task that touches them.
- **Known, flagged gap (not silently accepted):** Task 5's instanced door ribs/panels don't follow a door's open/close Y-animation the way real children did. This is called out explicitly in Task 5 Step 1 for the task reviewer to weigh against the spec's door-scope decision — it may need a follow-up (e.g., keep ribs/panels as individual Meshes after all, accepting the smaller win there) rather than being silently merged as-is.

## Manual Verification (after all tasks land)

- Run `npm run dev`, load into a run, and visually confirm: wall damage tinting still shows (shoot a wall repeatedly), wall destruction still opens a gap and drops rubble/spark FX, door open/close animation still works, pillar/bracket/vent/pipe decorations still appear on walls, room-to-room wall style changes are still visually distinct within one chunk.
- Check the renderer stats overlay (same one the original playtest log captured) for a materially lower draw-call count in a wall-dense maze chunk.
