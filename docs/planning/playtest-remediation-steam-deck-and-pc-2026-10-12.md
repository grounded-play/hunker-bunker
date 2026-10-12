# Playtest Remediation Plan: Steam Deck & PC Findings (2026-10-12)

**Branch:** `dev/sprint-52`  
**Target:** Sprint 52 Gameplay & Controller Hardening  
**Authors:** Gemini & Tuesday Cinema Club  
**Status:** In Progress / Documented on Branch  

---

## 1. Executive Summary & Playtest Session Logs

During the 2026-10-11 / 2026-10-12 playtest session across Steam Deck and PC (Direct3D11 / ANGLE), 4 live session captures were retrieved directly from the game's production session log authority (`steam.tuesdaycinema.club/logs/session`):

```
+--------------------------------------------------------------------------------------------------------------------+
| Timestamp (UTC)      | Device      | GPU / Driver          | Class    | Dur.    | Phase    | Session Log File      |
+--------------------------------------------------------------------------------------------------------------------+
| 2026-10-12T04:34:21Z | Steam Deck  | AMD Custom GPU 0405   | SCOUT    | 7.6 min | gameover | ...-mv4rcjwy-9xsh.json|
| 2026-10-12T06:00:02Z | Steam Deck  | AMD Custom GPU 0405   | ENGINEER | 6.6 min | gameover | ...-mv4ueqiy-4cj4.json|
| 2026-10-12T06:30:09Z | Desktop PC  | NVIDIA RTX 2070 SUPER | SCOUT    | 1.76 min| gameplay | ...-mv4vhg54-8h7c.json|
| 2026-10-12T06:31:15Z | Desktop PC  | NVIDIA RTX 2070 SUPER | TANK     | 0.92 min| gameplay | ...-mv4vivlw-flpg.json|
+--------------------------------------------------------------------------------------------------------------------+
```

### Key Telemetry Observations
1. **Steam Deck Runs (`v2.4.16-beta-920f240647e4`):**
   - Both runs operated in Gaming Mode on the Deck controller (`primaryControllerType: SteamDeckController`, Electron 44.4.4).
   - The Scout run covered 395m in Sector 1 (Bio Sector) before game over.
   - The Engineer run covered 843m in Sector 1 (Bio Sector) with 5 snail hostiles eliminated. It recorded multiple `PLAYER: depenetrated` warnings (`x: 4943, z: 4942` and `x: 118, z: 118`), confirming physical collision wedging and collider intrusion issues.
2. **PC Runs (`v2.4.16-beta-920f240647e4`):**
   - Captured in Active Sector (Sector 0) on Desktop PC (`NVIDIA GeForce RTX 2070 SUPER`, Direct3D11 ANGLE).
   - The Scout session at `06:30:09Z` exactly generated the captured visual evidence analyzed below.

---

## 2. In-Run Visual Audit (PC Playtest Screenshot)

![PC Playtest Screenshot — Active Sector 0 Issues](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/reports/assets/playtest-pc-2026-10-12-issues.jpg)

### Observed Defects in Screenshot:
1. **Missing Floor (Beige Void):** The hallway between high bunker walls displays a completely flat, untextured beige void plane matching the background sky/clearColor, with dark polygonal pit holes puncturing through walkable pathways.
2. **Gun Backwards and Sideways:** The Scout operator's sidearm weapon is inverted 180° along its pitch/yaw axis, with the muzzle pointing backwards into the character's torso/elbow and canted sideways instead of aiming forward along the line of fire.
3. **Floating Decals:** Wall decals (such as biological growth and skeletal grates) are spawned floating in midair at head height (`y ~ 1.34m`) without a backing wall surface, or clipped horizontally above void boundaries.
4. **Buried Wall Props:** Props placed along the wall perimeter penetrate deep into solid wall meshes, with rear volumes submerged inside wall geometry.
5. **Doorway Obstruction:** Archways and modular props spawn directly in doorway lanes or create invisible blocking volumes that trap players attempting to traverse room thresholds.
6. **Mismatched Texture Scaling & Texel Density:** Adjacent modular wall sections show starkly mismatched texel proportions (e.g. coarse, low-resolution green metal panels immediately bordering ultra-fine dark fluted paneling).

---

## 3. Detailed Root Cause Analysis & Code References

### Defect 1: Gun Backwards and Sideways
- **Symptom:** In gameplay, the player's weapon is pointed backwards into the character model and rotated sideways.
- **Root Cause Code:** [src/weaponCalibration.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/weaponCalibration.js#L13-L57) & [src/player3dOverlay.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/player3dOverlay.js#L164-L580)
  ```javascript
  // src/weaponCalibration.js
  talon: Object.freeze({
      rotation: Object.freeze([0, -Math.PI / 2, -Math.PI / 2]),
      position: Object.freeze([0.03, 0.02, -0.10]),
  ...
  ```
  In [src/player3dOverlay.js:580](file:///home/caveman/Desktop/icecave/hunker-bunker/src/player3dOverlay.js#L580), the weapon model is attached as a direct child of `rightHand` (`mixamorig1:RightHand`). The hand bone's local coordinate system in the Mixamo animation rig has its primary axis facing along the fingers. Applying `[0, -Math.PI / 2, -Math.PI / 2]` rotates the weapon's forward barrel vector into the backward forearm vector, causing the gun to point directly into the player's body and elbow.
- **Required Fix:**
  1. Calibrate `WEAPON_CALIBRATION[archetype].rotation` in bone local space so the weapon's barrel axis points strictly along the operator's forward aim ray (`+Z` in overlay aim space).
  2. Add automated orientation verification in `tests/` asserting that `weapon.getWorldDirection()` points within 15° of the operator's forward aim direction when idle.

---

### Defect 2: Missing Floor & Pit Cutouts in Walkable Corridors
- **Symptom:** Walkable corridors render with untextured beige void ground and black polygon holes.
- **Root Cause Code:** [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L32672-L32701) & [src/floorSplat.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/floorSplat.js#L468-L480)
  ```javascript
  // src/threeGame.js
  const instancedFloor = landform === LANDFORMS.MAZE || hasExteriorCanyon;
  if (instancedFloor) {
      ...
      for (let localY = 0; localY < this.chunkSize; localY += 1) {
          for (let localX = 0; localX < this.chunkSize; localX += 1) {
              const tileChar = grid[localY][localX];
              if (tileChar === LEDGE_TILE) exteriorGroundCells.push(...);
              else if (tileChar !== EXTERIOR_CANYON_TILE && tileChar !== CLIFF_TILE) floorCells.push(...);
          }
      }
      const floors = new THREE.InstancedMesh(this.floorGeometry, floorSplatMaterial ?? this.floorMaterial, floorCells.length);
  ```
  1. In `instancedFloor` mode, cells classified as `EXTERIOR_CANYON_TILE` (`'X'`) or `CLIFF_TILE` (`'C'`) have **no floor mesh instantiated at all**. If the maze/canyon generator carves an `'X'` into an active navigable corridor, a literal hole opens into the scene background.
  2. When `floorSplatMaterial` is compiling or when `uFloorLayersReady` is `0`, the shader uses `createPlaceholderFloorLayerArray()`. On GPUs where texture arrays take frames to initialize, or when textures fail to load, the floor shader renders unblended clearColor / fog color (`#dfd7c8`), appearing as completely untextured beige ground.
- **Required Fix:**
  1. Provide a guaranteed base floor mesh under all walkable corridors.
  2. In `architecturalMaze.js`, forbid `'X'` tiles from generating in cells adjacent to room doors, thresholds, or critical path corridors.
  3. Ensure `floorSplatMaterial` has an immediate textured fallback material instead of clear/untextured beige.

---

### Defect 3: Floating Wall Decals
- **Symptom:** Wall decals float unsupported in midair in corridors and rooms.
- **Root Cause Code:** [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L35380-L35412)
  ```javascript
  // src/threeGame.js
  if (!Number.isFinite(nx) || !Number.isFinite(nz) || (nx === 0 && nz === 0)) {
      const neighbors = [
          { dx: 0, dz: -1, nx: 0, nz: 1 },  // North wall -> faces South (+Z)
          ...
      ];
      const foundNeighbor = neighbors.find((n) => this.getTileType?.(tileX + n.dx, tileZ + n.dz) === '#');
      if (foundNeighbor) {
          nx = foundNeighbor.nx;
          nz = foundNeighbor.nz;
      } else {
          nx = 0;
          nz = 1; // <--- Hardcoded fallback!
      }
  }
  ...
  const wallY = this.wallHeight ? this.wallHeight * 0.48 : 1.34;
  decalMesh.position.set(decalX, wallY, decalZ); // Floats at 1.34m in open space!
  ```
  1. The neighbor scan only tests for `'#'`. If the adjacent wall is a `'W'` tile (destructible/room wall) or an instanced modular wall piece, `foundNeighbor` is `undefined`.
  2. The code defaults to `nx = 0, nz = 1`, positioning the decal at `wallY = 1.34m` floating in midair without any wall behind it.
- **Required Fix:**
  1. Expand wall neighbor detection to test for all wall types: `this.isWallTile?.(x, z) || ['#', 'W'].includes(this.getTileType(x, z))`.
  2. If no wall neighbor exists, **abort decal placement** or re-project it onto the floor plane (`isFloorOverlay: true`).

---

### Defect 4: Wall Props Buried Inside Walls
- **Symptom:** Cabinets, consoles, lockers, and drills penetrate 0.2m–0.4m into solid walls.
- **Root Cause Code:** [src/roomDressing.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/roomDressing.js#L235-L236)
  ```javascript
  // src/roomDressing.js
  items.push({
      layer: 'wallProp',
      type,
      x: cell.x + wx * 0.28,
      y: cell.y + wy * 0.28,
      yaw,
  ...
  ```
  `[wx, wy]` points **toward the wall**. Adding `0.28` pushes the model's center toward the wall boundary (which is at `0.5m` from cell center). Any 3D prop whose bounding depth exceeds `0.44m` (`0.28 + depth/2 > 0.50`) penetrates directly into the solid wall mesh.
- **Required Fix:**
  1. Compute the prop model's bounding depth `halfDepth = getPropBoundingDepth(type)`.
  2. Clamp wall offset so the back surface of the prop aligns flush with the wall face (`0.50 - halfDepth - 0.02`), rather than using a static `0.28` scalar.

---

### Defect 5: Doorway Blockage by Props & Dressing
- **Symptom:** Doorways and room entrance thresholds are physically blocked by props.
- **Root Cause Code:** [src/roomDressing.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/roomDressing.js#L81) & [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L31124)
  1. In `maintenanceHallPresentation` and various room dressing invocations, `reserved` is not consistently populated with door apron exclusion zones.
  2. Scatter prop instances generated by `roomSetPieces` do not check for door threshold reservations, allowing props to spawn directly within door swing corridors.
- **Required Fix:**
  1. Ensure every door tile has a mandatory 1.5-tile radius apron in `reserved` across all dressing, setpiece, and scatter passes.
  2. Reject any blocking prop placement whose distance to a door center is `< 1.6m`.

---

### Defect 6: Mismatched Texture Scaling & Texel Density
- **Symptom:** Adjacent wall sections feature wildly divergent texel densities and texture stretching.
- **Root Cause Code:** [src/threeGame.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L3122-L3245)
  1. Triplanar wall projection uses disparate UV multipliers:
     `vec2 uvX = vec2(vWorldPos.z * 0.45, vWorldPos.y * 0.35);` (horizontal scale 0.45, vertical scale 0.35).
  2. Authored room wall suites (`uRoomStyleId > 0.5`) use atlas sampling:
     `vec2 localUv = ... * vec2(1.0 / 3.0, 1.0 / 2.8);` (horizontal scale 0.333, vertical scale 0.357).
  3. Modular kit pieces use authored UV layouts at 1m = 1 unit.
  When an instanced wall chunk meets a room style wall or modular asset, the UV coordinates scale at completely different frequencies, creating an obvious, jarring visual seam.
- **Required Fix:**
  Standardize all wall shader UV projections to uniform 1m world-space mapping (`vec2(1.0 / 2.5, 1.0 / 2.5)`).

---

### Defect 7: Archways Seen as Solid Under the Arch
- **Symptom:** Players cannot walk under archway props; the empty opening between pillars blocks movement.
- **Root Cause Code:**
  1. [src/threeGame.js:35503](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L35503):
     ```javascript
     isSolidProp: placement.isSolidProp ?? placement.type.startsWith('arch_'),
     collisionRadius: placement.collisionRadius ?? Math.max(0.3, scaleX * 0.35),
     ```
     Forces every prop starting with `arch_` to have a central solid spherical collider placed at `(placement.x, placement.z)`—the exact middle of the archway opening!
  2. [src/propBehavior.js:59-65](file:///home/caveman/Desktop/icecave/hunker-bunker/src/propBehavior.js#L59-L65):
     `WALK_THROUGH_ARCHES` only includes `arch_deco_archway_grand_01..04` and `prop_biomech_arch`. Props like `arch_bulkhead_frame`, `arch_rib_ceiling_vault_01..03`, and `arch_deco_doorway` are excluded and fall back to `PROP_COLLISION.SOLID`.
  3. [src/threeGame.js:7755](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L7755):
     ```javascript
     source.userData.pillarColliders = archPillarColliders({ x: center.x, z: center.z, width: size.x, depth: size.z });
     ```
     `measureArchPillars` **fails to pass `yaw`** to `archPillarColliders`. Rotated arches have pillar colliders generated along the wrong axis (often blocking the opening).
  4. [src/threeGame.js:31162](file:///home/caveman/Desktop/icecave/hunker-bunker/src/threeGame.js#L31162):
     `addRoomDressing` creates single central colliders for all blocking items, ignoring dual pillar support.
- **Required Fix:**
  1. Add all arch/doorway types (`arch_bulkhead_frame`, `arch_rib_ceiling_vault_*`, `arch_deco_doorway`) to `WALK_THROUGH_ARCHES`.
  2. Pass `yaw: root.rotation.y` to `archPillarColliders` in `measureArchPillars`.
  3. In `createScatterInstance`, set `isSolidProp: false` for all `WALK_THROUGH_ARCHES` at the center, relying exclusively on `pillarColliders`.

---

### Defect 8: Menu Controller Flow Disruption (Hero Select & Armory)
- **Symptom:** On Steam Deck, pressing Down in Hero Select or Armory does not navigate to the Next/Advance button (`#start-game` / `#armory-btn-embark`).
- **Root Cause Code:** [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L1550-L1566) & [src/inputActions.js](file:///home/caveman/Desktop/icecave/hunker-bunker/src/inputActions.js#L116-L149)
  1. In `main.js:1550` (`moveHeroSelectPanelFocus`), when focus is on `heroRail` (`.char-selection`):
     ```javascript
     if (isDown) {
         if (index < focusableElements.length - 1) target = focusableElements[index + 1];
         else target = document.getElementById('start-game');
     }
     ```
     If the player is on Scout (index 0) or Tank (index 1), Down selects the next character card. It does **not** proceed to `#start-game` unless the player has already moved down to Engineer (index 2). In `commandRail`, `!isRight` returns `true`, swallowing Down inputs.
  2. In `armory-screen`, spatial navigation (`spatialFocusIndex`) calculates:
     `primary = dy * vector.y`.
     Because Armory's sidebar contains 10+ stacked loadout slots and fields, pressing Down repeatedly cycles through every individual slot in the vertical stack before ever evaluating the footer advance button (`#armory-btn-embark`).
- **Required Fix:**
  1. In Hero Select, provide explicit controller escape: pressing Down when on any character card or the preview box should allow direct progression to `#start-game` if desired (or via right-down / explicit shortcut).
  2. In Armory, add an escape route from the bottom panel or loadout slots directly to `#armory-btn-embark`.

---

### Defect 9: 2D Placeholder Images on Hero Screen
- **Symptom:** 2D placeholder portraits (`/Scout.full_v2.webp`, `/Tank.full_v2.webp`, `/Eng.Full_v2.webp`) and 2D canvas sprite appear in the hero select screen instead of the 3D pedestal character model.
- **Root Cause Code:** [index.html](file:///home/caveman/Desktop/icecave/hunker-bunker/index.html#L452-L454) & [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js#L9594-L9616,L15947-L15957)
  1. `index.html` mounts `#char-preview-fallback` and `#char-preview-sprite` as visible elements, while `#char-preview-3d` is set to `.hidden`.
  2. In `main.js:15947` (`syncHeroPreview`):
     ```javascript
     const is3dActive = scoutHeroPreview && preview3dCanvas && !preview3dCanvas.classList.contains('hidden');
     if (!is3dActive) {
         scoutHeroPreview?.setVisible(false);
         previewSprite?.classList.remove('hidden');
         if (previewFallback) {
             previewFallback.src = assetUrl(PREVIEW_PORTRAITS[type] ?? PREVIEW_PORTRAITS.SCOUT);
             previewFallback.classList.remove('hidden');
         }
         ...
     }
     ```
     When the menu opens, `scoutHeroPreview` is still loading asynchronously. `is3dActive` evaluates to `false`, immediately unhiding the 2D fallback portrait.
  3. Critically, `syncHeroPreview` **never calls `scoutHeroPreview.setType(targetType)`** when swapping heroes, causing 3D character updates to stall or fall back to 2D.
- **Required Fix:**
  1. Preload 3D character preview during boot.
  2. In `syncHeroPreview`, ensure `scoutHeroPreview.setType(type)` is called and awaited.
  3. Deprecate and hide 2D fallback elements `#char-preview-fallback` and `#char-preview-sprite`.

---

## 4. Implementation & Remediation Roadmap

```
+----+------------------------------------+------------------------------------------+-------------------------------------+
| ID | Task                               | Files Modified                           | Verification Gate                   |
+----+------------------------------------+------------------------------------------+-------------------------------------+
| T1 | Calibrate Gameplay Weapon Aim/Rot  | src/weaponCalibration.js                 | Unit test + screenshot aim inspect  |
| T2 | Fix Missing Floor & Canyon Carving | src/threeGame.js, architecturalMaze.js   | E2E test corridor floor integrity   |
| T3 | Fix Floating Wall Decals           | src/threeGame.js, roomDressing.js        | Decal normal unit tests             |
| T4 | Dynamic Prop Wall Inset/Depth      | src/roomDressing.js                      | Prop bounding penetration test      |
| T5 | Doorway Clearance / Apron Guard    | src/roomPopulation.js, roomDressing.js   | Zero props within 1.5m door apron   |
| T6 | Standardize Wall Texel Density     | src/threeGame.js (wall fragment shader)  | Visual shader inspection            |
| T7 | Walk-Under Archways Dual Colliders | src/propBehavior.js, src/threeGame.js    | tests/e2e/walk-under-arch.spec.js   |
| T8 | Menu Down-to-Advance Controller    | main.js, src/inputActions.js             | tests/e2e/controller-journey.spec.js|
| T9 | Remove 2D Hero Placeholders        | index.html, main.js, scoutHeroPreview.js | E2E character preview 3D test       |
+----+------------------------------------+------------------------------------------+-------------------------------------+
```

---

## 5. Artifact Links & Verification Assets

- **Playtest Screenshot (Repo):** [docs/reports/assets/playtest-pc-2026-10-12-issues.jpg](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/reports/assets/playtest-pc-2026-10-12-issues.jpg)
- **Session Logs Downloaded to Repo:**
  - Steam Deck Scout Run: [logs/hunker-bunker-session-2026-10-12T04-34-21-207Z-mv4rcjwy-9xsh.json](file:///home/caveman/Desktop/icecave/hunker-bunker/logs/hunker-bunker-session-2026-10-12T04-34-21-207Z-mv4rcjwy-9xsh.json)
  - Steam Deck Engineer Run: [logs/hunker-bunker-session-2026-10-12T06-00-02-740Z-mv4ueqiy-4cj4.json](file:///home/caveman/Desktop/icecave/hunker-bunker/logs/hunker-bunker-session-2026-10-12T06-00-02-740Z-mv4ueqiy-4cj4.json)
  - Desktop PC Scout Run (Screenshot Session): [logs/hunker-bunker-session-2026-10-12T06-30-09-216Z-mv4vhg54-8h7c.json](file:///home/caveman/Desktop/icecave/hunker-bunker/logs/hunker-bunker-session-2026-10-12T06-30-09-216Z-mv4vhg54-8h7c.json)
  - Desktop PC Tank Run: [logs/hunker-bunker-session-2026-10-12T06-31-15-951Z-mv4vivlw-flpg.json](file:///home/caveman/Desktop/icecave/hunker-bunker/logs/hunker-bunker-session-2026-10-12T06-31-15-951Z-mv4vivlw-flpg.json)
