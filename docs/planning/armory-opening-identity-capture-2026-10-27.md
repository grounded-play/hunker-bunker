# Armory departure and exact operator identity capture

Status: process defined; capture tooling and departure animation are the next
implementation slice. Do not start the 144 loadout-microclip batch until this
spike is reviewed.

## The ask

When the player confirms the loadout, remove every Armory UI layer but keep the
live 3D scene. That clean frame becomes the first frame of the opening. The
exact equipped operator, holding the exact equipped gun, walks out of frame to
screen right. The generated opening then inherits the same operator through a
nine-view identity sheet, including a dedicated behind-the-head shot.

This preserves the player's chosen class, chassis/body, operator tint, weapon,
weapon tint, badge, charm and visible modules. It also respects the existing
art bible: the runtime render defines identity and physical truth; the bible
defines the cinematic rendering and environment.

## Why not render every combination

The live catalog currently produces these appearance counts:

| Class | Chassis/body choices, including factory | Guns | Chassis × operator polish × gun × gun sheen |
|---|---:|---:|---:|
| Scout | 19 | 12 | 69,312 |
| Tank | 18 | 7 | 38,304 |
| Engineer | 15 | 8 | 36,480 |
| **Total** | | | **144,096 core appearances** |

The shared visible slots add 17 charm states, 24 badge/decal states, and 17
states in each of two module bays. Including those yields **16,990,647,552
full visible loadouts**. Nine angles of every full loadout would be
**152,915,827,968 images**.

The reproducible count comes from:

```bash
node scripts/cinematics/report-operator-identity-space.mjs
```

Therefore the production unit is not “one image pack per catalog combination.”
It is **one cached nine-image pack for the player's currently equipped
appearance**, regenerated only when its appearance signature changes.

## Recommended opening structure

1. **Armory departure — live engine, exact identity.** On EMBARK, freeze
   selection, hide `#armory-hud-overlay`, remove the duplicate floating bench
   weapon, centre the held-weapon operator, and wait two rendered frames. Save
   this clean frame as the transition first frame. Play one real walk cycle and
   translate the operator out to screen right. The final frame is the same
   Armory without the operator.
2. **Rear bridge shot — live engine or 3D composite.** Use the dedicated rear
   over-shoulder capture: helmet/head, shoulder silhouette, back equipment,
   held weapon and charm socket visible. Composite that exact 3D operator over
   the painted hangar plate while they approach the ship.
3. **Generated wide opening.** Once the operator is too small to inspect—or is
   inside the ship—use the authored launch, space-flight and crash footage.
   The ship references, first/last frames and art-bible locks remain in force.

This hybrid keeps identifiable cosmetics deterministic. Diffusion is never
asked to reconstruct an arbitrary marketplace loadout from prose alone.

## The nine-view identity pack

Eight views are a fixed full-body turntable at 45-degree increments. The ninth
is a separate rear over-shoulder camera, not a duplicate of the normal back
view:

1. front (`0°`)
2. `45°`
3. side (`90°`)
4. `135°`
5. back (`180°`)
6. `225°`
7. opposite side (`270°`)
8. `315°`
9. rear over-shoulder close framing

Store the nine individual PNGs, one 3×3 contact sheet, metadata, and the clean
departure endpoints under a hash of the appearance signature. The machine
specification is
`scripts/cinematics/operator-identity-capture-spec.json`.

Use the 3×3 sheet as one Comfy reference rather than nine independent reference
latents. That lowers VRAM use and leaves reference slots for the environment
plate and physical action prop. Reference order is always:

1. scene/environment plate;
2. exact operator identity sheet;
3. physical prop plate, if the shot manipulates a prop.

The prompt lock must say that the identity sheet owns chassis silhouette, body
proportions, helmet/head, operator polish, weapon geometry and sheen, badge,
charm, and modules. The art bible owns style, light, architecture and mood.

## Appearance signature and cache invalidation

Hash canonical JSON containing:

- class, chassis id and chassis body;
- operator polish id and colour;
- weapon archetype/skin and weapon sheen id/colour;
- charm, decal, module A and module B;
- operator asset revision and capture-rig version.

HUD, radio voice, tracer and muzzle effect do not belong in the static identity
hash because they do not change these nine frames. A changed appearance hash
creates a new pack. An unchanged hash reuses the existing pack.

## Capture-tool implementation

Build on the existing `createArmoryScene` tooling used by
`capture-equipment-fit.mjs` and `capture-weapon-fit.mjs`. It already exposes
class/chassis loading, weapon, charm, modules, decal, polish, sheen,
`setOperatorYaw()`, `holdPresentation()` and `getOperatorRoot()`.

Add three narrowly scoped APIs:

- `setCinematicCaptureMode(true)`: hide bench-only props, lock lighting and
  centre the operator without changing equipment;
- `setCaptureCamera('turntable' | 'rear-over-shoulder')`: use versioned,
  deterministic camera transforms;
- `beginDeparture({ direction: 'right' })`: drive the overlay as moving while
  translating the root out of frame, with a root-motion fallback for static
  community chassis.

A Playwright capture script should load a supplied save/loadout fixture, apply
all visible slots, wait for model and texture readiness, capture the nine views,
assemble the contact sheet with ffmpeg, and write `identity.json`. The normal
game path performs only the UI-free live departure; it does not block EMBARK on
PNG export or local AI generation.

## Acceptance gates

- The clean departure frame is pixel-identical to the chosen Armory appearance
  except for removed UI and duplicate bench props.
- No camera or light changes occur between the visible Armory and first clean
  frame.
- All nine captures have the same equipment, material colours and proportions.
- The rear-over-shoulder tile clearly resolves head/helmet, shoulders, back
  silhouette, held weapon and charm socket.
- Static or unusual community chassis still exit cleanly using root translation.
- Missing identity-pack files never block deployment; generated character
  close-ups fall back to live 3D composition.
- Review Scout, Tank and Engineer with factory gear and one maximally customized
  loadout each before enabling the transition by default.

