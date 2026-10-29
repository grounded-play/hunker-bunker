# GLB Wall Placement and Contact Plane Audit & Remediation Plan — 2026-10-15

**Document Status:** Implementation in Progress  
**Sprint / Scope:** Sprint 53 Quality & Presentation Pass  
**Impacted Subsystems:** [`src/modelPresentationRegistry.js`](../../src/modelPresentationRegistry.js), [`src/world3dOverlay.js`](../../src/world3dOverlay.js), [`src/roomDressing.js`](../../src/roomDressing.js), [`src/roomDressingKits.js`](../../src/roomDressingKits.js), [`src/roomPopulation.js`](../../src/roomPopulation.js), [`scripts/audit-model-presentation.mjs`](../../scripts/audit-model-presentation.mjs)

---

## 1. Executive Summary & Context

A review of world models at scale (619 runtime GLBs, 485 registered in `WORLD_3D_MODELS`, 89 classified as wall-supported) identified recurring visual placement defects in gameplay:
1. **Wall-backed machinery, lockers, and racks floating away from walls** or penetrating deep into wall geometry.
2. **Models facing the wrong direction** (e.g. facing into the wall or turned 90° sideways) because default yaw calculations assumed a uniform `forwardAxis` without accounting for authored mesh orientations.
3. **Contact plane mismatch:** The 89 wall-supported models in `modelPresentationRegistry.js` were assigned a placeholder default of `contact: { axis: 'z', side: 'min' }`, whereas geometry inspection reveals that 3D artists authored the flat mounting back plate at `Z = 0` (`max.z`), extending into negative Z.
4. **Bounding-box recentering** in `prepareWorld3dModel` strips the authored contact origin (`Z = 0`) and shifts models to their geometric center, pushing the back plate into the room.
5. **Inconsistent wall placement offsets** between `roomDressing.js` (which uses regex heuristics on prop names) and `roomPopulation.js` (which places wall machines in the exact center of the tile with zero wall offset).

This plan outlines the root causes, documents the per-model geometry audit, and executes the implementation across the registry, placement math, elevation data, and CI verification.

---

## 2. Technical Root Cause Breakdown

### Issue A: Contact Plane Direction (`side: 'min'` vs `side: 'max'`)
- In `modelPresentationRegistry.js`:
  ```javascript
  const WALL_PROFILE = Object.freeze({
      surface: MODEL_SURFACE.WALL,
      forwardAxis: '+Z',
      contact: Object.freeze({ axis: 'z', side: 'min', inset: 0.02 }),
      ...
  });
  ```
- **The Reality in Geometry:**
  Inspecting shipped GLBs (`prop_exosuit_docking_gantry`, `storage-locker`, `corp_biometric_wall_safe`, `life_server_racks`, `prop_vital_monitor`, etc.) shows:
  - `max.z` is `0.000m` (the back mounting plate designed to touch the wall).
  - `min.z` is `-0.68m` to `-1.05m` (the front of the machine facing into the room).
  - Declaring `side: 'min'` designated the *front* of the machine as the contact surface, inverting offsets.

### Issue B: Center-Origin Normalization Destroys Flush Mounting
- In `src/world3dOverlay.js`:
  ```javascript
  const center = scaled.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -scaled.min.y, -center.z);
  ```
- This centers the model horizontally on X and Z. A locker with depth `0.88m` has `center.z = -0.44m`. Shifting by `-center.z` moves the back plate from `Z = 0` to `Z = +0.44m`, floating the back in mid-air.

### Issue C: Placement Pipelines Use Inconsistent Offsets
- `src/roomDressing.js`: Estimates depth using `getPropBoundingDepth(type)` which checks string keywords (`rack`, `cabinet`, `locker` $\to$ 0.52m; `console`, `station` $\to$ 0.46m). The offset is `Math.max(0.12, Math.min(0.28, 0.48 - halfDepth))`.
- `src/roomPopulation.js`: Places functional wall anchors directly at tile center `(cell.x, cell.y)` with **no** wall offset.
- `src/roomDressingKits.js`: Lists only 12 models in `WALL_MOUNT_HEIGHT`. The remaining 77 wall models default to `mountY: 0`, forcing wall-hanging fixtures onto the floor.

---

## 3. Systematic Remediation Architecture

### Phase 1: Real Geometry Extraction & Registry Enrichment
Enhance `src/modelPresentationRegistry.js`:
- For every wall model, store verified metadata:
  - `contact`: `{ axis: 'z', side: 'max', inset: 0.02 }` (or measured axis/side)
  - `depth`: measured bounding depth from the actual GLB
  - `mountType`: `'floor'` (sits on floor against wall) vs `'wall-hanging'` (elevated)
  - `mountY`: elevation above floor (sconces, clocks, monitors, sirens, cable trays)
  - `forwardAxis`: direction facing into the room (away from wall)

### Phase 2: Unify Wall Depth & Inset Resolution
- In `src/roomDressing.js`:
  - `getPropBoundingDepth(type)` queries `getModelPresentationProfile(type)?.depth` first.
- In `src/roomPopulation.js`:
  - When placing wall-backed props (`isWallBackedPropType`), apply the wall offset along `wallNormal` so functional machines sit flush against the wall tile rather than floating in tile center.

### Phase 3: Synchronize Elevation (`mountY`)
- Centralize `mountY` in `modelPresentationRegistry.js` and have `roomDressingKits.js` import or mirror it, ensuring all elevated wall fixtures are raised off the floor.

### Phase 4: Automated Model Presentation CI Gate
- Enhance `scripts/audit-model-presentation.mjs` to verify that every wall-mounted model has:
  1. A measured bounding box and depth.
  2. A verified contact profile (`side: 'max'` or explicit override).
  3. Valid `mountY` for wall-hanging models.

---

## 4. Execution Matrix & Progress Tracker

| Task ID | Component | Description | Status |
| :--- | :--- | :--- | :--- |
| **WALL-01** | `scripts/audit-model-presentation.mjs` | Run full geometry scan of all 89 wall GLBs to extract exact bounds, contact sides, and depths. | Completed |
| **WALL-02** | `src/modelPresentationRegistry.js` | Update `WALL_PROFILE` and model table with `side: 'max'`, verified depths, and `mountY`. | Completed |
| **WALL-03** | `src/roomDressing.js` | Wire `getPropBoundingDepth` directly into `modelPresentationRegistry.js`. | Completed |
| **WALL-04** | `src/roomPopulation.js` | Offset wall-backed functional anchors towards their supporting wall normal. | Completed |
| **WALL-05** | `src/roomDressingKits.js` | Harmonize `WALL_MOUNT_HEIGHT` with all elevated wall-hanging models. | Completed |
| **WALL-06** | Test Suite & CI Gate | Verify unit tests pass and `npm run audit:model-presentation:check` validates 100% of wall models. | Completed |
