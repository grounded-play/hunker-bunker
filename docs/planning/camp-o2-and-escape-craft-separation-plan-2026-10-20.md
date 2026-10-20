# Camp O2 and escape-craft separation plan

Date: 2026-10-20
Status: Phase 1 implemented; Phase 2 presentation foundation implemented
Evidence session: `logs/hunker-bunker-session-2026-10-20T17-10-20-694Z-mvgxvjyj-h61x.json`
Evidence build: `v2.4.17-beta-869a5c6ae2f5`

## Player-facing rule

The wreck, the camp, and the escape craft are three different things.

1. **Crash wreck:** arrival landmark, tutorial shelter, salvage source, and
   terminal. It is never repaired into the escape craft.
2. **Start camp:** the small safe home beside the wreck. It contains only the
   recovery bed and the camp O2 generator. The player repairs the generator
   here to make the local air bubble.
3. **Escape-craft yard:** a separate authored construction pad beyond the
   first hallway. The player carries three recovered flight systems to this
   one pad and watches a new craft become complete there.

No UI copy, socket ID, objective arrow, or installed-module transform may call
the camp generator a ship system or place an escape-craft part on the wreck.

## What the latest log proves

The four-minute Windows session stayed on generator level 0 despite a bank of
roughly two million of each resource. The O2 modal was opened and closed four
times, but there is no successful O2 upgrade or module-install record. The
player finished at `(8.79,10.84)`, beside the wreck/camp, while scans continued
to target `(17,29)`. This is consistent with the current source: O2 repair is
gated by `ship_life_support_core`, but its only compatible socket is generated
as `ship-bay-life` on the crashed ship. The other three escape parts are also
socketed around that same wreck even though their objective sites are spread
through the world.

The unarmed landing change did work: early fire attempts were rejected with
`no_weapon`, then firing succeeded after the staged weapon was picked up.

## Authored placement contract

Coordinates are world-space unless explicitly marked local.

### A. Start camp — origin chunk `(0,0)`

| Element | Position | Role |
| --- | --- | --- |
| Crash wreck | `(9,9)` | Landmark, terminal, salvage; never an assembly target |
| Recovery bed socket | `(2.5,14.5)` | Sleep/save/recovery |
| Camp O2 generator | `(12.5,9.5)` | Permanent local generator and O2 modal |
| Camp O2 core recovery | `(15,14)` | First heavy carry lesson |
| Camp O2 install socket | `(12.5,9.5)` | Accepts only the camp generator core |

The O2 core should be visually distinct from all flight parts and use camp
language everywhere: `CAMP O2 GENERATOR CORE`, `CAMP GENERATOR SOCKET`, and
`REPAIR CAMP O2`.

### B. Escape-craft yard — approach chunk `(0,-1)`

Add a second authored room north-east of the first supply/encounter room:

| Element | Chunk-local | World | Role |
| --- | --- | --- | --- |
| Yard bounds | `x 20..36, y 20..32` | `x 20..36, z -29..-17` | Protected construction set |
| Scaffold center | `(28,26)` | `(28,-23)` | New escape-craft chassis/pad |
| Navigation socket | `(24,27)` | `(24,-22)` | Stellar navigation core |
| Comms socket | `(28,22)` | `(28,-27)` | Sub-ether comms array |
| Engine socket | `(32,27)` | `(32,-22)` | Thermal thrust manifold |

A five-cell corridor connects the existing staging-room hub `(9,39)` to the
yard. The yard and corridor are protected from procedural holes, props, and
encounters. The existing first-hall enemy and supplies remain in the staging
room, so the opening combat/resource promise stays intact.

## Progression contract

### Camp survival track

1. Recover `camp_o2_generator_core` at `(15,14)`.
2. Carry it to the visible socket on the camp generator at `(12.5,9.5)`.
3. Installation enables the resource-funded O2 repair button.
4. Repairing level 0 → 1 activates the local safe-air bubble and completes
   `o2Bubble`.

This track does not increment escape-craft progress.

### Escape-craft track

The craft has exactly three install milestones, all at the yard:

1. `hullExpansion` → navigation core → west/cockpit socket.
2. `radarNode` → comms array → north/mast socket.
3. `reactorCompressor` → engine manifold → east/engine socket.

Progress reads `ESCAPE CRAFT 0/3` through `3/3`. Completion means the new
craft is physically assembled; it never changes the crash wreck into a healed
ship.

## State and save migration

- Introduce a camp-only O2 stage and remove O2 from `SHIP_REBUILD_STAGES`.
- Rename the remaining collection to an escape-craft plan in player-facing
  copy while retaining compatibility exports only where needed by old code.
- New saves use `camp_o2_generator_core@camp-o2-generator`.
- Legacy `ship_life_support_core@ship-bay-life` records migrate in place to
  the camp definition/socket and authored camp transform.
- Legacy installed navigation/comms/engine records retain identity and damage
  but migrate from wreck-relative transforms to their matching yard sockets.
- A debug `give all` grant installs one camp core plus the three yard parts in
  their production sockets; it must not fabricate a fourth ship part.

## Presentation and guidance

- Show the camp O2 socket whenever the core is not installed; pulse brighter
  while the core is carried.
- Show all unfilled yard sockets from first discovery, with the currently
  compatible socket highlighted while carrying a part.
- Scans route to: loose active cargo → its exact install socket while carried
  → camp generator repair console for O2 → escape yard for later milestones.
- Map labels use `CAMP O2` and `ESCAPE CRAFT YARD`, never a generic `SHIP` for
  both.
- The yard gets a persistent pad/scaffold silhouette before the first part and
  visibly gains the three installed systems.

## Implementation sequence

### Phase 1 — data and authoritative state (start now)

- Add authored camp and yard coordinates.
- Stamp and connectivity-test the yard/corridor.
- Split camp O2 from the three-part escape-craft state.
- Point compatible sockets at the camp generator and yard.
- Add legacy migration and update progress copy to `0/3`.

Implemented in the first pass: all five items above, including a connected
yard geometry invariant and production transforms for normal and QA state.

### Phase 2 — readable world presentation

- Add/dispose four socket holograms through the existing pooled-light path.
- Add the persistent escape-craft pad/scaffold and per-part installed visuals.
- Update prompts, modal gates, map labels, and scan guidance.

Started in the first pass: the camp and yard sockets now use the existing
holographic placement language; the yard has a persistent outlined pad; carry,
repair-gate, and progress copy distinguishes camp from escape craft; scans send
carried flight systems to the yard; and duplicate flight systems/healed art on
the wreck are suppressed. A bespoke evolving chassis remains follow-up art.

### Phase 3 — full-flow validation

- Automated: geometry connectivity, socket compatibility, migration,
  idempotent staging, O2 eligibility, `0/3 → 3/3`, save/reset persistence.
- Packaged PC: fresh save, carry/install camp core, repair O2, then carry all
  three flight parts to the yard. Require structured install records with
  site kind and exact socket position.

## Acceptance checklist

- The player can see where the O2 core goes before picking it up.
- Standing at the camp generator with the core permits installation.
- The O2 repair button names the missing camp core or succeeds; it never asks
  for a ship life-support system.
- The wreck has zero escape-craft install sockets.
- One separate pad contains exactly three flight-system sockets.
- Each part installs only in its matching yard socket.
- Guidance never routes a camp O2 task to the yard or a flight part to camp.
- Old saves preserve installed progress at the new authored locations.
