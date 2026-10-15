# Prop Emissions, Hazards, and Liquids Plan

**Date:** 2026-10-15

**Status:** In progress; Slice 1A complete

**Scope:** Steam/frost/spore bursts, pipe and prop outlets, slime/liquid volumes,
interaction and proximity triggers, gameplay payloads, destruction, persistence,
and co-op behavior.

## Implementation log

### 2026-10-15 — Slice 1A: outlet transforms and destruction teardown

Status: complete; focused verification green.

- Added full position/quaternion resolution for authored `FX_EMITTER_00`
  transforms with legacy-anchor support.
- Added explicit fallback directions for `prop_pipe_rupture` and
  `geo_steam_manifold_actuator`; their particle groups now travel along the
  declared outlet instead of always rising in world/local vertical.
- Preserved each effect primitive's base orientation while applying the outlet
  rotation, including horizontal liquid-surface geometry.
- Prop destruction now unregisters and disposes prop FX and presentation before
  removing the 3D root.
- Verification: `propFx.test.js`, `threeGame.roomDressingDestruction.test.js`, and
  `threeGame.envLightBudget.test.js` — 39 tests passed.

Remaining in Slice 1: the asset-anchor audit/debug visualization and the fungal
spore proof source (it currently follows the enemy/attack path, not prop FX).

### 2026-10-15 — Slice 2A: pure emitter simulation core

Status: implemented; integration pending.

- Added a closed initial profile catalog for ruptured pipe steam, the interactive
  steam manifold, and fungal spore vents.
- Added deterministic cycle/proximity phase transitions, hysteresis, interaction
  actions, per-target payload cadence, profile validation, and stable one-shot
  destruction child IDs.
- Kept the module independent of rendering and `ThreeGame`; player-facing payload
  application arrives in Slice 2B.

### 2026-10-15 — Slice 2B: live prop runtime and payload adapter

Status: implemented for the pipe/manifold vertical slice.

- Added a bounded 10 Hz runtime that discovers mounted prop sources, advances the
  pure state machine, shares the visible outlet transform with capsule exposure,
  and keeps simulation cadence independent of render delta.
- Routed damage, healing, infection, cleanse, and poison through one guarded
  `ThreeGame` adapter.
- Interaction state now enables/disables the matching emitter, and prop
  destruction retires emitter state before visual teardown.
- Fungal spore vents deliberately remain on their established enemy eruption and
  projectile path until that path can be migrated without double-triggering.

## Decision summary

Build one data-driven `WorldEmitterSystem` for prop-attached emissions and liquid
volumes. A profile declares:

1. **where** material comes from (an authored transform or a bounds fallback),
2. **which way** it travels,
3. **what starts it** (cycle, proximity, interaction, damage, or destruction),
4. **what it does** (cosmetic, damage, infection, healing, poison, or a bounded
   combination), and
5. **what happens when its source prop is destroyed**.

Rendering follows emitter state; it does not decide gameplay. Gameplay ticks use
the game simulation delta and a host-authoritative event/state contract in co-op.
The existing procedural `AmbientVentSystem` remains the high-volume floor/fissure
renderer initially, but consumes the same trigger/payload vocabulary so its
geysers are no longer a special gameplay island.

## Current repo truth

### What is already working

- Procedural room/fissure vents are planned by `planChunkVents()` and rendered by
  `AmbientVentSystem` in `src/ambientVentsAndFog.js`.
- Steam, cryo, spore, and geothermal floor vents visibly cycle. Geothermal vents
  telegraph and deal one point of heat damage within `1.35m`, throttled to once
  per `1.2s` per source.
- Many GLB props receive ambient steam, bubbles, water surfaces, spores, sparks,
  and lights through `PROP_FX_PROFILES` in `src/propFx.js`.
- Prop FX can be switched by interaction state (`idle`, `on`, `working`, `off`,
  `spent`, `disabled`, `destroyed`). The existing custom interaction catalogue
  already toggles machinery and contains one-shot healing props.
- Destructible props have stable scatter/dressing keys, HP, debris, drops,
  persistence across chunk remounts, and a `prop-broken` co-op event.
- Bio prop destruction can create a temporary toxic spore puddle. Dynamic slime
  already participates in poison and footprint/relic queries.
- Player damage routes through `takeDamage()`, healing through `healPlayer()`, and
  Act 2 infection through `act2.addInfection()`/`adjustInfectionLoad()`.

### What is not guaranteed today

- **Prop steam is not directionally correct.** `createRisingPoints()` always
  advances particles along local `+Y`. `effectPosition()` uses an anchor's
  position but discards its rotation. A wall nozzle therefore still rises
  vertically.
- **Most relevant shipped GLBs have no `FX_STEAM_00`/liquid outlet transform.**
  They currently rely on normalized bounding-box positions, which are useful
  fallbacks but cannot identify a particular nozzle or opening.
- **Prop FX is usually continuously ambient.** It has on/off modes, but no shared
  timed burst, proximity, hit, or destruction trigger controller.
- **Prop-attached particles have no gameplay volume.** The procedural geothermal
  vent is the exception; visible prop steam/spores/liquids are generally cosmetic.
- **Liquids are split across systems.** Static puddle props, prop water/bubbles,
  room drips, dynamic toxic puddles, tracks, and ambient vents do not share a
  common substance or gameplay contract.
- **Destruction has bespoke hooks, not an emitter lifecycle.** The prop root is
  removed, but `breakScatterProp()` does not explicitly unregister/dispose its
  registered prop FX before removal. Persistent post-break leaks also lack a
  stable generic identity/lifetime contract.
- **Interaction state is persisted locally, but generic emitter state/events are
  not yet defined for co-op.** A guest must not independently roll burst timing,
  healing charges, infection, or destruction spill results.

So the direct answer is: steam bursts are still displayed, and floor vents point
up correctly, but pipe/prop emissions are not yet guaranteed to originate from
the exact outlet or travel in its authored direction. Interaction toggles exist;
general proximity triggers and general damage/infect/heal payloads do not.

## Design rules

1. **One source of truth:** emitter state owns active/telegraph/cooldown/spent/
   destroyed state. VFX, sound, light, and gameplay read it.
2. **Simulation before presentation:** exposure and cooldowns update from bounded
   simulation delta. A disabled particle quality setting must never disable or
   alter a hazard.
3. **Readable before harmful:** damaging/infecting emissions require a telegraph,
   an obvious active phase, and a safe gap or deliberate interaction.
4. **Healing is finite:** healing emissions are interaction-triggered or charged;
   proximity alone must not provide an unlimited AFK heal.
5. **Authored transforms win:** an asset outlet transform wins over profile
   fallback; the fallback is explicit and testable, never silently guessed from
   a mesh name at runtime.
6. **Stable identity:** use the prop's stable scatter/dressing key plus emitter
   index. Destruction children use deterministic derived IDs.
7. **Host resolves shared world state:** the host owns activation, charges,
   destruction outcomes, and persistent spawned pools. Each client applies
   exposure only to its own player from the replicated state.
8. **No critical soft locks:** objective-critical props remain protected, and
   emitter destruction cannot remove required interactions without a fallback.

## Unified emitter contract

Add `src/worldEmitters.js` for pure definitions/state transitions and
`src/worldEmitterRuntime.js` for ThreeGame integration.

```js
{
  id: 'primary',
  substance: 'steam',

  source: {
    anchor: 'FX_EMITTER_00',
    fallbackBounds: [0.82, 0.68, 0.52],
    fallbackDirection: [1, 0.15, 0],
    radius: 0.16
  },

  trigger: {
    kind: 'cycle', // ambient | cycle | proximity | interaction | damage | destruction
    range: 3.25,
    telegraph: 0.65,
    active: 1.1,
    cooldown: [5, 9],
    startsEnabled: true,
    charges: null
  },

  volume: {
    shape: 'capsule', // sphere | capsule | cone | pool
    length: 2.4,
    radius: 0.45,
    tickInterval: 0.5
  },

  payload: [
    { kind: 'damage', amount: 1, reason: 'steam-burn' }
  ],

  presentation: {
    effect: 'steam_jet',
    color: 0xdff6ff,
    sound: 'steam_burst',
    light: 0xffaa44
  },

  onDestroy: {
    kind: 'rupture_then_stop',
    duration: 1.5,
    payloadScale: 1.5,
    spawnPool: null
  }
}
```

Profiles live beside `PROP_FX_PROFILES` in a new closed
`PROP_EMITTER_PROFILES` catalogue, keyed by the exact visible model type. Do not
infer gameplay from strings such as `pipe`, `green`, or `slime`; those names may
select an audit candidate but never silently make a prop harmful.

### Source transforms and direction

Adopt this asset contract:

- `FX_EMITTER_00`, `FX_EMITTER_01`, ... are full transforms for jets, sprays,
  drips, spores, sparks, and leaks.
- The transform origin is the opening from which the material emerges.
- The transform's local **+Y axis points out of the opening**. This preserves the
  existing particle convention and lets the whole effect group inherit outlet
  rotation.
- `FX_LIQUID_SURFACE_00` marks a contained liquid surface; local +Y is its normal.
- `FX_POOL_ORIGIN_00` marks where a destroyed container deposits a floor pool.
- Existing `FX_STEAM_00`, `FX_WATER_SURFACE`, `FX_BUBBLE_VOLUME`, and
  `FX_SPORES_00` remain supported aliases during migration.

Runtime resolution order:

1. exact numbered authored transform,
2. legacy authored transform,
3. profile `fallbackBounds` plus `fallbackDirection`,
4. reject the gameplay emitter in development with a visible audit warning if a
   harmful profile has neither a valid transform nor an explicit fallback.

Update `effectPosition()` into transform resolution returning position **and
quaternion** relative to the prop root. Rotate the particle object/jet geometry
from local +Y into that quaternion. The hazard capsule/cone uses the same
resolved transform, proving VFX and gameplay agree.

### Trigger semantics

| Trigger | Starts when | Stops/resets | Intended use |
|---|---|---|---|
| `ambient` | emitter enabled | interaction/destruction | harmless drips, bubbles, low vapor |
| `cycle` | deterministic phase reaches telegraph/active | active duration expires | pressure steam, frost jets, geysers |
| `proximity` | eligible actor enters range | active duration or exit grace | spore vents, defensive sprayers |
| `interaction` | player successfully uses prop | duration, charge spent, or toggled off | valves, decon, healing mist |
| `damage` | prop crosses a configured HP threshold | duration/cooldown | cracked tanks and damaged pipes |
| `destruction` | `breakScatterProp()` commits | duration/TTL | rupture blast and spill |

Triggers may be combined only as an explicit `any`/`all` group. Example: a
manifold cycles while working, but interaction toggles `working`; a specimen tank
leaks only after damage below 50% and spills when destroyed.

Proximity activation uses hysteresis (`enterRange`, `exitRange`) to avoid rapid
edge flicker. Cycle phases derive from stable emitter ID and world seed, never
`Math.random()` per client or frame.

### Payload semantics

Implement these first:

| Payload | Runtime route | Rule |
|---|---|---|
| `damage` | `game.takeDamage(amount, reason, sourceX, sourceZ)` | respects armor, shields, i-frames, containment, difficulty |
| `infect` | `game.act2.addInfection(amount)` through a new guarded helper | works without requiring fake HP damage; no-op outside Act 2 unless design opts into latent infection |
| `heal` | `game.healPlayer(amount)` | charges/cooldown required; Queen's Milk behavior remains intact |
| `poison` | existing `playerPoisonTimer` through helper | refreshes duration; does not stack every frame |
| `cleanse` | new guarded reduction helper | finite interaction reward; cannot push below zero |

Add `ThreeGame.applyWorldEmitterPayload(emitter, target)` as the only adapter from
the pure system into player/game APIs. It returns whether anything changed and
emits one telemetry event. Do not call `takeDamage()` merely to add infection:
i-frames, shields, and zero HP damage would otherwise make infection behavior
ambiguous.

Payloads are ticked once per declared interval. A compound steam-spore plume may
deal damage and infection on the same accepted tick, but presentation feedback is
deduplicated per emitter/tick.

## Initial authored catalog

Start deliberately small, validate readability, then expand.

| Family / examples | Trigger | Payload | Destruction behavior |
|---|---|---|---|
| `prop_pipe_rupture`, `geo_steam_manifold_actuator` | cycle while enabled; interaction toggles manifold | 1 steam damage / 0.6s | 1.5s stronger rupture, then stop |
| `prop_icey_frost_vent`, `prop_icey_frost_manifold`, `evac_cryo_hypergolic_manifold` | cycle or damage-threshold | 1 cryo damage; later player slow/freeze when such a status exists | cold burst, short inert coolant pool |
| `fungal_spore_vent`, `hive_pulmonary_bellows`, `tallow_spore_cradle` | proximity with telegraph or slow cycle | infection + poison refresh; low/no direct damage | spore burst and temporary bio pool |
| `decon_exosuit_scrubber_station`, `prop_decon_eyewash_shower_station` | interaction, finite charge/cooldown | cleanse; small heal only where authored | disable/stop, no harmful spill |
| `tallow_vaccine_alembic`, `suture_flesh_mending_bath` | existing one-shot interaction | existing heal, optionally cleanse | contaminated pool only if destroyed before use |
| `life_water_still`, `life_cistern_tank`, `camp_water_barrel`, `life_sink_row` | ambient cosmetic; interaction only if explicitly added | none | clean water pool, no damage |
| `prop_specimen_tank`, `vass_hybrid_embryo_incubator`, `vass_hybrid_blood_synthesizer` | ambient contained liquid; leak below HP threshold | infection/poison only after leak | bio pool with bounded TTL |
| `tallow_irrigation_sluice_gate` | interaction toggles flow | none for clean/nutrient flow in first pass | stop and deposit cosmetic wet pool |
| `evac_preflight_fuel_umbilical` | damage threshold | burning/damage only after leak | ignition burst only when destroyed by qualifying fire damage; otherwise fuel pool |
| severed spline pipe/vein/vine | destruction of spline | pipe damage, vein infection, vine poison as explicitly profiled | emitter belongs to severed end and expires/unloads with chunk |

Do **not** make all visible green liquid infectious or all steam damaging. Use
presentation variants to distinguish: harmless vapor is thin/slow, hazards have
a telegraph color/light and forceful directional motion, healing/cleanse emissions
use a stable interaction prompt and finite charge indicator.

## Liquid and slime model

Treat a liquid as two related pieces:

- an **emitter** (drip, leak, spray, pour) with a source transform and trigger;
- a **surface volume** (contained surface or floor pool) with substance,
  footprint radius/polygon, payload, lifetime, and track surface.

Add a bounded `WorldPoolSystem` rather than growing more one-off arrays. It owns:

```js
{
  id, sourceId, substance,
  x, y, z, radius,
  payload, tickInterval,
  createdAt, expiresAt,
  trackSurface: 'water' | 'slime' | 'blood' | 'oil' | null,
  active: true
}
```

Migrate `dynamicPuddles` behind this API first while preserving
`isInBioSlime()` and `getTrackSurfaceAt()` adapters. Static scatter puddles remain
data-authored surfaces, but gain optional explicit pool profiles. Environmental
ceiling drips stay cosmetic until a corresponding pool/source is authored.

Pool growth is discrete and capped: a leak may grow through a small set of radii,
not allocate new meshes every tick. Cap active transient pools per mounted chunk;
replace/merge the oldest compatible nearby pool when at capacity.

## Destruction lifecycle

`breakScatterProp()` should perform this order exactly once:

1. mark/broadcast the prop break using its stable ID;
2. ask `WorldEmitterSystem.destroySource(sourceId, context)` for deterministic
   rupture/spill child descriptors;
3. run existing bespoke `onDestroy` and critical-service handling through an
   adapter during migration;
4. explicitly unregister and dispose `world3dRoot.userData.propFx` and
   `propExperience`;
5. fracture/hide/remove the visual and collider;
6. register any post-break transient emitter/pool on the chunk/world layer, not
   under the removed prop root;
7. spawn deterministic drops; and
8. replicate the committed destruction result.

`onDestroy.kind` options:

- `stop`: immediately shut down and dispose.
- `burst_then_stop`: one cosmetic burst, no gameplay.
- `rupture_then_stop`: directional timed hazard, then dispose.
- `spill`: create a floor pool and dispose the source.
- `rupture_and_spill`: timed jet plus pool.
- `persist`: transfer a stable leak to the chunk until repaired or run reset.

Post-break child IDs are `${sourceId}:destroyed:jet:0` and
`${sourceId}:destroyed:pool:0`. Replayed network events and chunk remounts therefore
cannot duplicate them.

If a prop was spent before destruction, its destruction profile receives that
state. An emptied healing bath must not spill a full healing or infectious pool.

## Interaction, proximity, and targeting

- Extend `applyPropInteractionState()` to notify the emitter system after the
  interaction result is committed.
- Interaction profiles may return `emitterAction` (`enable`, `disable`, `pulse`,
  `consumeCharge`) instead of reaching into particle APIs.
- Add emitter-bearing props to the existing priority interaction candidate path;
  do not create a separate E-key scan.
- Prompt copy describes risk: `VENT STEAM`, `SEAL LEAK`, `PURGE SPORES`,
  `RUN DECON`, `SIPHON MED-GEL`.
- Proximity emitters inspect local/remote actor positions only for activation
  presentation. The host commits activation state. Each owning client checks its
  player against the replicated hazard volume and applies local vitals through
  the existing networked player-health paths.
- Destruction and hit triggers reuse existing prop HP and damage entry points.

## Co-op and persistence contract

Add shared-world event types with versioned payloads:

- `emitter-action-request` (guest interaction request),
- `emitter-state` (host activation/phase/charges),
- `emitter-destroyed-result` (derived rupture/pool descriptors), and
- `pool-state` only for persistent or long-lived pools.

Short deterministic cycle emitters need only replicate enabled state and a host
epoch/phase seed, not every burst. The host validates interactions and charges.
Damage, infection, and healing are not broadcast as visual events; the affected
player follows the existing player-vitals synchronization contract.

Persist only state that outlives a chunk mount:

- enabled/mode and remaining charges for stable prop IDs,
- destroyed source IDs,
- persistent repairable leak/pool state.

Ordinary timed bursts and short pools are reconstructed from host state or allowed
to expire; they do not enter the save.

## Implementation slices

### Slice 1 — Direction and lifecycle correctness

- Add transform-aware emitter resolution to `src/propFx.js`.
- Support numbered/legacy anchors and explicit fallback directions.
- Rotate steam/spore/spark/drip motion with the resolved source transform.
- Dispose/unregister prop FX and experience during `breakScatterProp()`.
- Add an asset-audit script/report listing harmful candidates without authored
  emitter transforms.
- Author outlet transforms for the initial pipe/manifold/vent vertical slice.

**Exit:** the debug view draws outlet origin, +Y arrow, and hazard shape; a wall
pipe emits outward, a floor vent upward, and a rotated prop stays aligned.

### Slice 2 — Pure trigger and payload engine

- Add `worldEmitters.js` state transitions and profile validation.
- Add deterministic ambient/cycle/proximity/interaction/damage/destruction
  triggers.
- Add the single ThreeGame payload adapter for damage/infect/heal/poison/cleanse.
- Convert geothermal vent damage to the common payload vocabulary while keeping
  the optimized ambient renderer.

**Exit:** particle quality off yields identical gameplay timings/results.

### Slice 3 — Props and destruction

- Wire the initial authored catalog.
- Route existing prop interactions through `emitterAction`.
- Add deterministic destruction results and teardown order.
- Convert severed pipe/vein/vine effects to transferred child emitters.

**Exit:** toggle, approach, shoot, and destroy each vertical-slice prop with no
orphan effects, duplicate payloads, or lost post-break leak.

### Slice 4 — Pools and slime/liquid unification

- Add `WorldPoolSystem` and migrate dynamic toxic puddles behind it.
- Connect track surfaces and `isInBioSlime()` through compatibility adapters.
- Add clean water, coolant, bio-slime, med-fluid, and fuel profiles.
- Add bounded merging, TTL, chunk unload, and cleanup.

**Exit:** pools look, affect the player, leave tracks, expire, and unload through
one contract.

### Slice 5 — Co-op, persistence, balance, and accessibility

- Add host validation/state events and replay dedupe.
- Persist enabled/charges/destroyed/persistent-leak state.
- Add color-independent telegraphs (shape, sound, pulse cadence).
- Tune cooldowns, radii, and effect amounts on keyboard/controller/Steam Deck.

**Exit:** solo, host, and guest observe the same phase/source/destruction state;
joining late does not duplicate a charge, heal, pool, or rupture.

## Verification plan

### Unit tests

- transform resolver preserves authored position and quaternion;
- fallback direction rotates +Y correctly for wall, ceiling, and floor outlets;
- trigger FSM covers telegraph/active/cooldown and proximity hysteresis;
- stable IDs produce deterministic phase and destruction child IDs;
- payload cadence cannot fire twice in one tick or from disabled/destroyed sources;
- healing charges cannot be consumed twice;
- infection works independently of HP damage/i-frames and clamps to Act 2 rules;
- destroyed/spent state selects the correct spill result;
- pool merge/cap/TTL cleanup and track-surface adapters;
- prop break explicitly unregisters/disposes FX once.

### Integration tests

- interaction toggles a manifold and its gameplay volume with the same state;
- proximity vent telegraphs before becoming harmful;
- damaging a tank below threshold starts a leak; destruction transfers it to a
  world pool after the prop root is gone;
- disabled/reduced/full FX quality produces identical payload logs;
- containment and closed-door path checks block directional hazard damage where
  appropriate;
- co-op guest action is host-validated and replicated once;
- late join/remount reconstructs enabled, spent, destroyed, and persistent leak
  state without duplicates.

### Manual proof matrix

For each initial catalog prop, capture from two rotations and one destruction:

| Check | Pass condition |
|---|---|
| origin | first visible particles touch the intended nozzle/opening/surface |
| direction | plume follows outlet +Y, including rotated wall props |
| telegraph | danger is readable before the first payload tick |
| volume | debug shape overlaps the visible plume/pool, not the whole prop |
| interaction | prompt/action changes both presentation and gameplay state |
| destruction | old effect stops; declared rupture/pool happens once |
| cleanup | no effect/light/controller remains registered after expiry/unload |
| co-op | host and guest see the same state and receive only their own exposure |

## Performance budgets

- No per-emitter material cloning for ordinary jets; batch/pool by presentation
  profile where practical.
- Broad phase uses mounted-chunk membership plus squared distance; shape checks
  run only for active nearby hazards.
- At most one payload check per active emitter per simulation tick and one accepted
  payload per target per declared interval.
- Retain fixed light pools; never toggle live light visibility per burst.
- Cap post-break transient emitters and pools per chunk, with deterministic merge
  or oldest-compatible replacement.

## Files expected to change

- `src/worldEmitters.js` (new: profiles, validation, pure FSM)
- `src/worldEmitterRuntime.js` (new: scene transforms, nearby volumes, adapters)
- `src/worldPools.js` (new in Slice 4)
- `src/propFx.js` (transform-aware presentation and legacy anchor support)
- `src/propInteractions.js` (declarative emitter actions/destruction migration)
- `src/ambientVentsAndFog.js` (shared trigger/payload vocabulary)
- `src/threeGame.js` (registration, update, payload adapter, teardown, networking)
- `src/runRelicEffects.js` and `src/trackField.js` (pool compatibility adapters)
- selected GLBs under `public/3d/runtime/new3ds/` (authored outlet transforms)
- focused Vitest files plus a small asset-emitter audit script/report

## Definition of done

- Every harmful or beneficial prop emission has an explicit source transform,
  direction, trigger, payload, tick interval, and destruction policy.
- Debug visualization proves the hazard volume follows the visible emission.
- Steam/frost/spores/liquid can be ambient, cyclic, proximity-, interaction-,
  damage-, or destruction-triggered as declared per prop.
- Damage, infection, healing, poison, and cleanse use existing game APIs through
  one tested adapter.
- Destroying a prop stops and disposes its attached FX exactly once, then creates
  only the explicitly authored deterministic rupture/pool outcome.
- Slime and other pools share lifetime, gameplay, track, cleanup, and co-op rules.
- Visual quality changes do not change gameplay.
- Solo, host, guest, late join, chunk unload/remount, save/load, and objective
  protection tests pass for the vertical slice.

## Recommended first implementation ticket

Implement Slice 1 for exactly three proof props:

1. `prop_pipe_rupture` — horizontal steam outlet,
2. `geo_steam_manifold_actuator` — interaction-gated angled outlet, and
3. `fungal_spore_vent` — upward organic outlet.

These three prove floor/wall orientation, authored versus fallback transforms,
interaction state, metal versus bio presentation, and correct destruction
teardown before gameplay payloads are enabled broadly.
