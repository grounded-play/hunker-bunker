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
2. Export the injured trio and extend `computeLocomotionWeights()` with an HP
   severity input. Cross-fade over 0.2–0.35 seconds to avoid snapping.
3. Add `runStop` and `hardLand`, driven by existing sprint/fall transitions.
4. Add context gestures only after viewing each retargeted class. Social and
   interaction animations should never delay authoritative gameplay completion.
5. Add an automated runtime-clip manifest test so every mapped name is present
   in the built GLB and missing clips fail during asset preparation, not play.

## Acceptance checks

- Smash contact, damage, and animation contact frame agree for all three classes.
- Low-health animation changes do not alter movement speed or collision.
- Interaction one-shots remain interruptible by damage, movement, and menus.
- Retargeting does not introduce planar root motion or class-specific limb stretch.
- Steam Deck/controller glyphs describe the same Smash action as keyboard/mouse.
