# Operator 3D Patches, Decal Assets & Startup Scale Fix

Status: verified implementation report | Owner: Antigravity + Maintainer | Date: 2026-09-09
Review: before PR into mothership

## Scope and Summary

This report records the implementation and verification for two visual and presentation improvements:
1. **Snug 3D Chest Patches & High-Detail Decals**: Upgrading cosmetic patches from placeholder graphics to transparent RGBA emblems mounted on a physical 3D backing plate parented to the operator's chest bone (`mixamorig1Spine2`), with front-side culling and Z-buffer depth writing ensuring the patch rotates with the torso and naturally occludes behind the model when viewed from behind.
2. **Startup UI Scaling Flash Elimination**: Eliminating the initial paint flash where HUD and loading screen rendered microscopically for 200–500ms before JavaScript computed viewport metrics.

---

## 1. 3D Operator Chest Patches (`src/operatorPatch.js`)

### Problem
Previously, operator patches used a fallback forward depth offset of `targetHeight * 0.075` (~14cm forward from the spine bone). Because unskinned bind poses returned 0 raycast hits on skinned meshes, the patch floated ~14cm in mid-air in front of the breastplate. In addition, patches were flat 2D sprite billboards without a physical backing plate or backface occlusion.

### Technical Fix
1. **Clamped Depth Offset**: Clamped the fallback depth to `targetHeight * 0.02` to `0.038` (~5.2–6.8cm from the spine bone center). This brings the patch flush directly against the breastplate armor geometry.
2. **Physical 3D Backing Plate (`PatchClothBacking`)**: Created a beveled rounded composite plate (`RoundedBoxGeometry`) with shadow casting (`castShadow: true`) and receiving (`receiveShadow: true`).
3. **Skeletal Parenting**: Mounted directly into `mixamorig1Spine2` (or `mixamorigSpine2`). The patch articulates and rotates with upper-body animations (breathing, aiming, walking).
4. **Natural Occlusion & Backface Culling**:
   - `face.material.side = THREE.FrontSide` ensures backfaces are culled.
   - `face.material.depthTest = true` and `face.material.depthWrite = true` ensure that when the operator rotates away from the camera, the player model's back geometry writes to the depth buffer first, occluding the patch naturally.

### Asset Upgrades (`public/economy/`)
Replaced placeholder SVGs with custom high-fidelity transparent RGBA decals (standard 256×256 and 512×512 inspect variants):
- `4120`: **Sub-Zero Pioneer Patch** (`decal_subzero_pioneer.png` / `_large.png`)
- `4121`: **Radiation Trefoil Emblem** (`decal_radiation_trefoil.png` / `_large.png`)
- `4122`: **Sporesnail Hunter Crest** (`decal_sporesnail_hunter_crest.png` / `_large.png`)
- `4124`: **Cyber-Skull Tactical Pin** (`decal_cyber_skull_tactical_pin.png` / `_large.png`)
- `4125`: **Cryo-Phoenix Insignia** (`decal_cryo_phoenix.png` / `_large.png`)
- Preserved existing victory patches: Scout (`2000`), Tank (`2001`), and Engineer (`2002`).

---

## 2. Startup Microscopic UI Scaling Fix (`index.html`, `style.css`)

### Problem
`#game-viewport` declared `--vu: 1px` in CSS. Because `main.js` is an asynchronous ES module, the browser painted frame 0 before JavaScript initialized `--vu` to ~7.8–10.8px, causing an 8x visual jump.

### Technical Fix
1. **Responsive CSS Evaluation**:
   ```css
   --vu: min(calc(var(--vw-actual, 100vw) / 160), calc(var(--vh-actual, 100dvh) / 100));
   --vu-text: calc(var(--vu) * var(--ui-scale-multiplier, 1));
   --stage-px: calc(var(--vu) / 8);
   ```
2. **Synchronous Inline Layout Seed**:
   Added an early synchronous `<script>` in `<head>` and immediately inside `#game-viewport` measuring `window.innerWidth/innerHeight` and seeding `--vw-actual`, `--vh-actual`, `--vu`, `--vu-text`, and `--stage-px` before the browser performs its initial layout and paint.

---

## 3. Verification

| Check | Result |
| --- | --- |
| **Unit Test Suite** | **293 test files passed, 2,623 tests passed** (Vitest). Includes 3 dedicated tests in `src/operatorPatch.test.js`. |
| **ESLint** | Pass (0 errors, 0 warnings). |
| **Presubmit** | Pass (`npm run presubmit:generated`: 7 Steam claims, 39 WAVs, 1,420 retail assets, 71 Steam items, 43 OST tracks, 72 chroma green items). |
| **Doc Audit** | Pass (`npm run audit:docs`). |
| **In-Browser Verification** | Visual verification of startup frame 0 without scaling jumps; visual verification in 3D showroom showing snug breastplate mount and back occlusion when operator turns around. |
