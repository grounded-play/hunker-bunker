# G3 renderer, identity and breach integration

Implements the next slice of the [room grammar plan](../planning/sprint-49-room-grammar-and-run-variety.md).
Integrates the previously uncommitted dressing hit-target/renderer work, then adds
versioned identity, support removal and grammar-specific wall classification.

## Behavior

- Eligible physical dressing uses existing scatter damage targets; blocking
  furniture retains collision. Breaking a prop hides all of its mesh instances,
  removes its hit/collision owner and leaves neighboring instances intact.
- Breaks during model loading remain hidden when the model arrives. Late results
  for unloaded chunks dispose instance buffers. Failed later model loads release
  already-created batches and remove orphan hit targets. Shared geometry/materials
  are never disposed by individual object destruction (Three.js skill ownership rule).
- Identity v2 uses room ID, layer, type and exact local placement/mount height.
  Reordering or inserting another decoration does not renumber physical objects.
  Layout generation remains v1: this change does not reroll layouts or RNG streams.
- Existing ordinal break records migrate when their unchanged v1 plan mounts.
  Co-op retains legacy ordinal wire keys until peers negotiate an identity version.
  Future content changes must retain a compatible legacy plan until unvisited old
  ordinal records can migrate; the new ID format alone cannot reconstruct old layouts.
- Dressing uses the pre-destruction grid saved in chunk metadata. A wall breach
  therefore does not change random-stream consumption and reshuffle surviving props
  when the room mounts again. Support loss hides attached fixtures and decals,
  including breaks while their models load, and removes their collision owners.
- Grammar module bounds override the old neighbor-floor heuristic: every cell
  inside a thick module breaches to interior floor. Outer shell cells keep the
  existing exterior-ground behavior; no arbitrary canyon excavation is added.
  Existing wall destruction updates the collision grid, hides wall instances,
  invalidates room/template caches and persists/replays destroyed tile keys.
- Repeated prop breaks do not reroll drops. Dense dressing defaults to no loot;
  ordinary preexisting prop rewards and explicitly supplied remote drop plans remain.

## Verification

Full-suite checkpoint before final load-failure/reward hardening: 579 files /
5,099 tests passed. Focused tests cover stable IDs/migration, multiple meshes,
neighbor isolation, late loads, shared-asset ownership, failed-load cleanup,
support removal, unchanged remount identities, duplicate breaks, no extra loot,
thick-module floor classification and destroyed-grid replay. Scoped lint and
documentation checks are also required before commit.
After final hardening, six focused files / 17 tests passed; scoped ESLint,
documentation audit and whitespace checks passed.

No browser visual, installed-build, physical Deck or mixed-version co-op acceptance
is claimed. The room grammar remains opt-in.

## Remaining work

- [ ] Host-authoritative partial-HP reconciliation, co-op identity negotiation,
  late-join and unloaded-chunk pickup-delivery acceptance.
- [ ] Generalized critical-service wreck/recovery behavior for future functional
  setpieces; current pilot module reservations do not contain required services.
- [ ] Finished key-art maintenance hall, including art/camera review and matched
  destruction-window profiling against Thursday's 152 ms p95 baseline.
- [ ] Broader area profiles, cathedral coverage, camps and start variants.
