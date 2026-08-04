# Manual Smash and 3D Animation Mapping

## Implemented gameplay contract

The dry-ammo escape hatch is now a universal **Smash** attack:

- `V`, mouse right-click, or the controller ability/face action triggers it.
- Pulling fire with an empty clip and no reserve ammo triggers Smash automatically.
- Reach is 1.8 world units across a 70-degree forward arc.
- It deals 4 damage to enemies and destructible props, with enemy knockback,
  impact particles, camera response, audio, and structured telemetry.
- Intact lockers and room props are solid. Shooting or smashing them clears the
  obstruction; ammo lockers eject three guaranteed ammo pickups.

The gameplay hook calls the `melee` one-shot on the 3D operator overlay.

> **Update (2026-08-04):** the `melee` clip is exported and live. Added
> `"melee": "Creature Pack/mutant punch.fbx"` to `CLIPS` in
> `scripts/blender/build_mixamo_scout_glb.py` and re-ran the existing
> pipeline (`blender --background --python scripts/blender/build_mixamo_scout_glb.py --
> --base art/source/mixamo/scout/Scouting.fbx --animations art/source/mixamo/scout/animations
> --textures art/source/mixamo/scout/textures-original --output public/3d/scouting-scout/Scout.game.glb`).
> The script's own `verify_glb()` gate and a new `src/scoutAnimationClips.test.js`
> both confirm all 13 clips are present in the rebuilt GLB, so Smash now plays
> a real punch instead of a silent no-op for all three classes. Contact-frame
> alignment against the 70° arc has not been eyeballed in-engine yet — that's
> the next acceptance-check item below, not implied by the export succeeding.

## Shipped runtime animation inventory

`public/3d/scouting-scout/Scout.game.glb` currently supplies:

- `idle`, `heroIdle`, `walk`, `run`, `backward`, `strafeLeft`, `strafeRight`
- `fire`, `reload`, `hit`, `fall`, `land`

`public/3d/runtime/engineer-rigged-gestures.glb` additionally supplies 15 named
social gestures already exposed through `ENGINEER_GESTURES`. The Tank runtime
model is rigged but contains only its imported base clip, so it currently relies
on the shared retargeted Scout locomotion pack.

## Source-pack mapping backlog

The source FBXs under `art/source/mixamo/scout/animations/` contain substantially
more usable motion than the runtime bundle. Export these in small reviewed waves:

| Runtime name | Source candidate | Gameplay mapping |
|---|---|---|
| `melee` | ~~Creature Pack `mutant punch.fbx` or `mutant swiping.fbx`~~ **Exported 2026-08-04** (`mutant punch.fbx`) | Smash attack; prioritize punch because its contact timing is easier to align with the 70° arc. |
| `injuredIdle` | Male Injured Pack `injured idle.fbx` | Automatic idle below 40% HP. |
| `injuredWalk` | Male Injured Pack `injured walk.fbx` | Low-health locomotion below 40% HP. |
| `injuredRun` | Male Injured Pack `injured run.fbx` | Low-health sprint locomotion. |
| `hardLand` | Action Adventure Pack `hard landing.fbx` | Large fall/pocket return; retain current `land` for ordinary drops. |
| `runStop` | Action Adventure Pack `run to stop.fbx` | Short one-shot when sprint releases above a speed threshold. |
| `interactConsole` | Gestures `acknowledging.fbx` | Console confirmation and successful repair. |
| `interactFoundry` | Farming Pack `pull plant.fbx` or `box idle.fbx` | Foundry fabrication/collection after a visual review; avoid literal farming motion if silhouette reads poorly. |
| `death` | Creature Pack `mutant dying.fbx` | World-body collapse before the authored death cinematic takes over. |
| `throw` | Basic Shooter Pack `toss grenade.fbx` | Reserved for a future throwable/tool action; do not wire before gameplay exists. |

## Export and integration order

1. ~~Export `melee` alone into the shared animation GLB, keep it in-place, and
   add it to `ONE_SHOTS`.~~ **Done 2026-08-04.** Verify the contact frame
   aligns around 45% of the clip still needs an in-engine eyeball pass.
2. ~~Export the injured trio and extend `computeLocomotionWeights()` with an
   HP severity input. Cross-fade over 0.2–0.35 seconds to avoid snapping.~~
   **Done 2026-08-04.** Kept `computeLocomotionWeights()`'s return shape
   unchanged (its keys are asserted by existing tests) and instead added
   `selectLocomotionActionName()` plus `INJURED_LOCOMOTION_VARIANTS` in
   `player3dOverlay.js`: below 40% HP (`ThreeGame.isPlayerInjured()`,
   `INJURED_HP_RATIO` in `threeGame.js`), idle/walk/run redirect their weight
   to `injuredIdle`/`injuredWalk`/`injuredRun` every frame through the same
   `THREE.MathUtils.damp(..., 14, delta)` every other locomotion blend
   already uses — no separate crossfade timer, no snap. `backward`/
   `strafeLeft`/`strafeRight` have no injured take in the source pack and are
   unaffected. Verified live for all three classes (SCOUT/ENGINEER/TANK) via
   Playwright against the running dev server: `melee` and all three injured
   clips are present in `player3dOverlay.actions` for each class (retargeted
   correctly onto ENGINEER/TANK's own rigs), and `triggerGameplayMelee()`
   actually plays and ramps the `melee` action's weight to ~1 with no
   console errors.
3. Add `runStop` and `hardLand`, driven by existing sprint/fall transitions.
4. Add context gestures only after viewing each retargeted class. Social and
   interaction animations should never delay authoritative gameplay completion.
5. ~~Add an automated runtime-clip manifest test so every mapped name is
   present in the built GLB and missing clips fail during asset preparation,
   not play.~~ **Done 2026-08-04** as `src/scoutAnimationClips.test.js`,
   scoped to the 16 names currently mapped; extend its `EXPECTED_CLIPS` list
   as later waves land.

## Acceptance checks

- [x] Smash gameplay (damage, arc, cooldown) confirmed class-agnostic by
      inspection: `triggerGameplayMelee()` in `threeGame.js` has no
      `playerType` branch. Steam Deck (Neptune) and every other bundled
      controller profile bind `ability → Smash` at the same input-manifest
      level, not per class.
- [x] `melee` clip present and playing for all three classes, verified live
      (Playwright against `npm run dev`, 2026-08-04): SCOUT carries it
      natively, ENGINEER/TANK get it via the existing `mixamorig` retarget
      path alongside their own class-specific clips (Engineer's 16 gestures,
      Tank's unused single baked clip). No console errors on any class.
- [ ] Smash contact, damage, and animation **contact frame** agreeing with
      the 70° arc/4-damage window has NOT been precisely measured — only
      confirmed the clip plays end-to-end (weight ramps to ~1, `time`
      advances across its 1.1s duration). Needs an eyeball pass with the
      canvas actually visible (screenshot capture timed out against the
      WebGL canvas in this headless run; a human or a non-headless capture
      is the next step here).
- [x] Low-health animation changes do not alter movement speed or collision
      — structurally true, not just tested: `isPlayerInjured()`/the
      `injuredIdle/Walk/Run` redirect only ever call
      `action.setEffectiveWeight()` on the cosmetic overlay's own
      `AnimationMixer`; nothing in that path touches `player.position`,
      `moveSpeed`, or any collision check.
- [ ] Interaction one-shots remain interruptible by damage, movement, and
      menus — not yet exercised.
- [ ] Retargeting does not introduce planar root motion or class-specific
      limb stretch — not yet visually checked for the new `melee`/injured
      clips specifically (the existing `makeClipInPlace()` root-motion strip
      applies to every clip uniformly, so this is likely fine, but "likely"
      isn't "checked").
- [x] Steam Deck/controller glyphs describe the same Smash action as
      keyboard/mouse — confirmed in `steam/controller_configs/controller_neptune.vdf`
      (`game_action gameplay ability, Smash`) and `steam/steam_input_manifest.vdf`
      (`"ActionAbility" "Smash"`), matching the `V`/right-click keyboard path.
