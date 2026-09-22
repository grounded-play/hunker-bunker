# Equipment Effects and Visual Socket Plan

Status: proposed, not implemented · Date: 2026-09-21 · Owner: gameplay + character art

## Outcome

Make pre-run equipment readable and mechanically real in every supported run:

- **Charms are always weapon-mounted.** They hang from the active weapon in the Armory, gameplay, and replicated player presentation.
- **Wearable overclocks are always operator-mounted.** Ballast Plating belongs on the chest, the Scrap Furnace on the back, the Archivist Lens near the helmet, and so on. They must never be parented to the weapon.
- **Both categories contribute a distinct run effect.** The equipped charm supplies one weapon-flavoured attunement and each equipped overclock supplies its authored suit/utility trade-off.
- Effects and visuals work for Scout, Tank, and Engineer in Solo, Daily Ops, Co-op, and PvP, with explicit PvP normalization where needed.

## Current-state findings

1. `LoadoutManager` already stores `charmId`, `mod1Id`, and `mod2Id` per class and resolves 16 overclock definitions through `getActiveModifiers()`.
2. In `armoryScene.js`, `charmSocket`, `mod1Socket`, and `mod2Socket` are all children of `weaponPivot`. This is why Ballast Plating appears on the gun.
3. Gameplay weapon construction already mounts charms through a named `CharmSocket`, but wearable overclocks are not attached to the operator overlay.
4. Overclock effect coverage is incomplete. The original 4140–4147 set is substantially consumed by `threeGame.js`; many 4160–4167 fields are declared but have no runtime consumer.
5. Charms 4130–4139 are currently tradable/marketable cosmetics. Adding direct power without changing entitlement rules would create paid power and conflict with the existing earned-function policy.

## Equipment contract

### Slot ownership

| Slot | State | Visual owner | Gameplay owner | Scope |
| --- | --- | --- | --- | --- |
| Weapon charm | `perClass.*.charmId` | active weapon `CharmSocket` | charm attunement resolver | per class |
| Overclock A | `perClass.*.mod1Id` | operator wearable socket | modifier resolver | per class |
| Overclock B | `perClass.*.mod2Id` | operator wearable socket | modifier resolver | per class |

The renderer must not infer placement from item ID. Catalog metadata is the source of truth:

```js
{
  itemdefid: '4160',
  family: 'overclock',
  mount: 'operator.chest_center',
  effectId: 'ballast_plating',
  stackingGroup: 'armor'
}
```

### Operator wearable sockets

Add normalized, class-independent logical sockets and resolve them to each rig's real bones:

| Logical socket | Typical bone/fallback | Example equipment |
| --- | --- | --- |
| `chest_center` | `Spine2` → `Spine1` → torso root | Ballast Plating, Pressure Seal |
| `back_upper` | `Spine2` rear offset | Scrap Furnace, Shard Conduit |
| `helmet_side` | `Head` side offset | Archivist Lens, Echo Transceiver |
| `shoulder_left/right` | shoulder bone → upper torso | Kinetic Bushing, Cryo Capacitor |
| `waist_back` | `Hips` rear offset | Deep Anchor, Duplicate Refiner |
| `forearm_left/right` | forearm bone → hand | Queen's Bane, Flux Overdrive |

Each class receives a calibration table containing position, rotation, scale, and optional mesh variant. Missing bones use a visible torso fallback and produce a development warning; equipment must never silently jump to the weapon.

## Effect architecture

### One resolver, one immutable run snapshot

Replace scattered item-ID switches with an equipment definition registry:

- `src/data/equipmentDefinitions.js`: visual mount, effect ID, numerical tuning, stacking group, mode policy, UI copy.
- `src/equipmentEffects.js`: pure composition of base stats + charm + overclock A + overclock B.
- `LoadoutManager.getActiveEquipmentSnapshot(classId, mode)`: returns IDs, derived modifiers, triggered abilities, and presentation metadata.
- Deployment captures this snapshot once. A run does not mutate because the player edits another class loadout or inventory refreshes.
- Solo, Daily, Co-op, and PvP all consume the same snapshot contract. Multiplayer sends equipped IDs and a schema/version hash; each client derives approved effects locally rather than trusting arbitrary client stat payloads.

### Overclock completion

Retain the authored trade-offs and wire every declared field to a tested runtime consumer:

- Ballast Plating: max health initialization and movement penalty.
- Scrap Furnace: destructible-prop salvage hook and fire-rate penalty.
- Queen's Bane: boss/non-boss outgoing damage routing.
- Archivist Lens: lore reward hook and initial magazine-size penalty.
- Shard Conduit: relic roll tier adjustment and maximum oxygen penalty.
- Duplicate Refiner: duplicate-relic conversion and salvage-value penalty.
- Pressure Seal: oxygen drain and healing received.
- Deep Anchor: ring-crossing oxygen cost and elite spawn consequence.

The 4140–4147 effects receive the same audit so shield timing, gas resistance, low-health speed, hidden-room pings, penetration, cryo duration, magnetism, and dash refund operate in every applicable mode.

### Charm power identities

Charms remain gun-mounted and grant smaller, weapon-centric effects so they complement rather than replace overclocks. Initial tuning targets:

| Charm | Proposed attunement |
| --- | --- |
| Mini Cryo-Core | consecutive hits build a brief slow; cryo weapons reach it faster |
| Spent 50-Cal Casing | first shot after reload gains stagger/armor chip |
| Sporesnail Pearl | precision kills release a small anti-spore cleansing pulse |
| Trench Whistle | reload after a kill gives a short handling/reload bonus |
| Glitched RAM Card | every Nth hit repeats a reduced-damage echo packet |
| Geodetic Compass | damage gently biases nearby loot/route pings toward the current objective |
| Mini Drone Bobble | sustained hits mark one target for a modest follow-up damage bonus |
| Amber Bio-Flask | kills bank a small amount of recoverable healing, capped per encounter |
| Dark Matter Singularity | critical/weak-point kills create a short, low-force pickup/enemy pull |
| Golden Sub-Bunker Key | first elite/chest interaction per sector yields a bonus salvage cache |

Final numbers must be data-driven. Every charm gets: trigger, cooldown/cap, PvP policy, telemetry event, HUD feedback, and deterministic tests.

## Economy and fairness gate

This gate must be resolved before charm effects ship.

**Recommended:** separate visual ownership from gameplay attunement. A tradable charm can always be displayed, but its matching gameplay attunement is unlocked through an earnable, non-tradable achievement/progression grant available to every player. Equipping the visual selects an already-earned attunement; it never buys the effect.

Simpler alternative: make charms 4130–4139 non-tradable/non-marketable and grant them only through gameplay, matching overclocks. Do not ship direct power on the current marketplace entitlement alone.

PvP uses one of two explicit policies per definition: `normalized` (fixed competitive value) or `disabled`. No effect may fall through to an accidental PvE value.

## Visual implementation

1. Create `operatorEquipmentSockets.js` with bone discovery, per-class calibration, model normalization, replacement/disposal, and fallback behavior.
2. Extend `createPlayer3dOverlay()` with two wearable equipment roots and `setWearableOverclock(slot, id)`.
3. Move Armory `mod1Socket`/`mod2Socket` off `weaponPivot` and bind them to the operator overlay. Keep only `charmSocket` on the weapon.
4. Use the same socket service for the Armory, Homebase operator preview, local gameplay operator, remote co-op/PvP operators, victory/debrief presentation, and any fallback full-body preview.
5. Replicate equipped charm/overclock IDs with player appearance state. Late join and class swap must rebuild both effects and visuals.
6. Add small idle emissions/status lights by effect definition, but keep collision, aiming, and hitboxes unchanged.

## Armory and in-run UI

- Rename the overclock bays to **SUIT OVERCLOCK A/B** and show a body-location badge such as `CHEST`, `BACK`, or `HELMET`.
- Selecting an overclock highlights its operator socket; selecting a charm highlights and gently rotates the gun.
- The active-effect panel shows all three contributions: charm, overclock A, overclock B, including upside, downside, and mode status.
- Deployment summary repeats the three effects so the player knows what enters the run.
- Gameplay HUD shows compact cooldown/charge feedback only for triggered charm effects; passive effects do not occupy permanent HUD space.

## Delivery sequence

### Phase 1 — Contracts and regression fixtures

- Add the equipment definition registry and migration-safe snapshot format.
- Add catalog validation: charms require weapon mounts; overclocks require operator mounts and effect definitions.
- Preserve existing saves and strip invalid/duplicate slot combinations safely.

### Phase 2 — Correct visual ownership

- Implement wearable operator sockets for all three base classes.
- Fix Ballast Plating first as the vertical slice: chest-mounted in Armory, local gameplay, and one remote-player fixture.
- Move the remaining overclock models using catalog mount metadata.
- Confirm all ten charms remain on each weapon archetype using existing charm calibration.

### Phase 3 — Complete overclock runtime effects

- Wire 4160–4167, audit 4140–4147, and add modifier-consumer coverage.
- Capture an immutable deployment snapshot and apply it identically across run modes.

### Phase 4 — Charm attunements

- Resolve the economy gate.
- Implement the ten effects in small batches with combat telemetry and HUD feedback.
- Add PvP normalization/disable behavior per charm.

### Phase 5 — Multiplayer and presentation parity

- Replicate loadout IDs and version hash.
- Verify local/remote visuals, reconnection, late join, class swap, spectating, and debrief.
- Verify Daily Ops uses the selected class loadout and does not silently fall back to Scout.

## Acceptance criteria

- Ballast Plating is visibly chest-mounted and never appears on a weapon.
- Every overclock has a declared operator socket and appears correctly on Scout, Tank, and Engineer.
- Every charm appears on Talon, Talon-C, Siege-Breaker, and Tesla-Lock weapon families.
- Equipping any charm or overclock changes the derived run snapshot and produces its documented effect.
- All 16 overclock modifier fields have a real runtime consumer or are removed from the definition.
- Solo, Daily Ops, Co-op host/client, and PvP pass the same equipment matrix; PvP behavior is explicit.
- Remote players and late joiners show the correct worn modules and weapon charm.
- No paid entitlement grants gameplay power without the earnable-attunement gate.
- Save migration, ownership reconciliation, class switching, unequip, and duplicate stacking are covered by unit tests.
- Automated visual captures cover each class with chest, back, head, and waist mounts plus every weapon family with a charm.

## Verification matrix

- Unit: definition validation, modifier composition, stacking, cooldowns, mode policy, save migration.
- Runtime integration: health, movement, oxygen, healing, damage routing, fire rate, clip size, loot, relic, ring crossing, and every charm trigger.
- Rendering: socket resolution and transform snapshots for three classes; GLB load/disposal tests.
- E2E: equip → Armory preview → deploy → effect fires → return → persistence.
- Multiplayer: authoritative ID validation, late join, reconnect, remote rendering, PvP normalization.
- Build gates: `npm test`, `npm run i18n:audit`, `npm run steam:claims:check`, `npm run build`, targeted Playwright visual suite.

