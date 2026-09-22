# Armory Character Rig Readiness

Status: enforced · Date: 2026-09-22

## Rule

The Armory may offer a character/chassis body only when its GLB has a real skin binding, a usable humanoid bone chain, and can accept an idle animation. File existence and skeleton-like node names alone are not sufficient. A failed live load falls back to the class factory rig; it may not leave an empty stage or a T-pose.

## Removed until assets are ready

| ID | Chassis | Finding | Re-entry requirement |
| --- | --- | --- | --- |
| 4200 | Deep Frost | Skeleton-named nodes, zero GLTF skins, zero animations | Bind mesh to the humanoid armature and validate shared idle |
| 4207 | Rust & Bone | Skeleton-named nodes, zero GLTF skins, zero animations | Bind mesh to the humanoid armature and validate shared idle |
| 4214 | Hive Chitin | Skeleton-named nodes, zero GLTF skins, zero animations | Bind mesh to the humanoid armature and validate shared idle |
| 4228 | Bunker 404 | Skeleton-named nodes, zero GLTF skins, zero animations | Bind mesh to the humanoid armature and validate shared idle |
| 4235 | Grand Marshal | Skeleton-named nodes, zero GLTF skins, zero animations | Bind mesh to the humanoid armature and validate shared idle |
| 5001 | GHOST Chassis | No model file | Supply a rigged GLB, shared idle compatibility, and preview render |

These item definitions and ownership records remain intact. Only their chassis-picker exposure is suppressed, so restoring them requires no save migration.

## Ready population

- Factory Scout, Tank, and Engineer rigs remain available.
- Chassis 4112–4119 have skin bindings and embedded animation data.
- Horizon Corporate (4221) has a skin binding and accepts the shared animation pack.
- Achievement chassis 5003–5005, 5007–5008, and 5011–5012 have skin bindings and embedded animation data.
- The 30 community chassis models have skin bindings and embedded animation data.

## Runtime safeguards

1. `CLASS_CHASSIS_SKINS` is the UI allowlist and excludes the six unsupported bodies.
2. `createPlayer3dOverlay({ requireRigged: true })` rejects a model without a `SkinnedMesh` or a minimally viable bone chain.
3. The same runtime contract rejects an idle clip after retargeting if it has no usable tracks, preventing a valid-looking skeleton from remaining in its bind pose.
4. A missing wearable module logs and leaves that socket empty; it cannot blank the operator preview.
5. The Armory retries with the factory class rig when a selected cosmetic fails the live contract.
6. Gameplay ignores a stale unsupported chassis selection and uses the factory class rig, retaining the 2D sprite until the 3D rig is ready.
7. Supported rigs receive the shared idle pack; their own clips remain available for gestures without being allowed to strand the default pose.
8. `npm run audit:armory-assets -- --check` reads the GLB skin and joint tables and fails when an offered chassis lacks a valid binding.

## Asset acceptance checklist

- At least one GLTF skin and one `SkinnedMesh`.
- Humanoid chain includes Hips, Spine, Head, both arms, and both hands or an approved mapped equivalent.
- Shared idle produces visible vertex deformation for ten seconds with no bind-pose snap.
- Bounds normalize correctly at Scout, Tank, and Engineer target heights.
- Feet remain on the Armory platform and no mesh is culled during the full idle loop.
- Chest/back/head/waist equipment sockets follow the animation.
- The asset loads in Armory, Homebase preview, and gameplay without console errors.
- Automated audit, visual capture, build, and controller navigation pass before the ID returns to `CLASS_CHASSIS_SKINS`.

## Verification record

- Asset audit: 127 offered items, 0 unnamed, 0 missing icons, 0 green-screen icons, and **0 unrigged chassis offered**.
- Live 1280×800 Armory check: factory Scout, Tank, and Engineer all render fully on the platform and leave the bind pose under the idle mixer.
- Live console check: no model, skeleton, retargeting, or animation errors while switching among the three classes.
- Ballast Plating check: module follows Tank's chest socket while the weapon remains unmodified; deployment-status UI reports the chest-center mount and gameplay effects.
