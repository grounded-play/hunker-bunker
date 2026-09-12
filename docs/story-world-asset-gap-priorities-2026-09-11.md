# Story and world asset gap priorities — 2026-09-11

## What is playable now

Mayor Tina and the three camp leaders are irreversible story linchpins. Tina's
secret resolves as `killed` or `joined`; Briggs, Martha, and Kaelen resolve from
the successful terminal choice made at their camp. All four persist in
`hb_act2_v1`, move humanity and camp trust, write a Codex aftermath entry, and
close ending routes without ever closing the `mixed_crew` fallback.

The leaders interweave with the ten existing endings instead of creating a
parallel ending system:

| Arc | Human resolution | Alien/hostile resolution | Most important closed roads |
| --- | --- | --- | --- |
| Mayor Tina | kill infiltrator | accept transformation | alien endings / clean break |
| Briggs's oath | recruit or warn | rob, cull, turn, or infect | genocide roads / clean escape |
| Martha's beacon | broadcast | silence | covert infection / clean escape and allied exodus |
| Kaelen's manifest | disclose | falsify | hidden cargo roads / clean escape |

Camp spaces now use the assets already in the build as stateful storytelling:
stores disappear after robbery, laundry and bedrolls disappear after evacuation
or turning, graves remain after a cull, and faction workstations disappear when
the camp has been stripped. This is a stronger immediate return than adding
more neutral clutter.

## Highest-value missing assets

1. **Three two-frame leader aftermath portraits** (human pact / hostile fate).
   The existing walk sheets work in the Codex but crop poorly as portraits.
   Target: `public/lore_portraits/{briggs,martha,kaelen}_{pact,broken}.webp`.
2. **Five bespoke ending frames** for the endings still represented only by
   achievement art: mothership infection, alien exodus, outed escape, failed
   carrier, and empty husk. These are the largest presentation gap because all
   ten endings are mechanically live.
3. **Camp state overlays**, one reusable sheet each for evacuated, robbed, and
   turned states. Prioritize footprint decals and silhouette changes over more
   free-standing props; the existing camps already have faction-specific sets.
4. **Leader-choice audio stingers and six short voiced aftermath lines.** One
   human and one hostile line per leader gives the new branches identity at a
   fraction of cinematic cost.
5. **Tina joined/killed aftermath stills.** Her current portrait and 3D secret
   cover the encounter, but not the long-term consequence shown in the Codex.

## Reuse before requesting more art

- Use the existing locked/unlocked achievement pairs in an ending gallery.
- Use faction signature props as close-up dialogue backplates: radio for
  Martha, shield rack for Briggs, repair rig for Kaelen.
- Recolor the existing camp beacon, cookfire, tents, graves, laundry, and
  bedrolls by persisted camp status; do not commission replacement camp kits.
- Reuse the turned NPC overlay for worker crowds before making three separate
  mutated civilian sets.

## Next implementation seams

- Give the camp choice modal a pre-confirmation warning naming the leader arc
  and candidate ending locks.
- Add an ending archive that shows discovered endings, locked silhouettes, and
  the Codex linchpin responsible for each known lock.
- Author one follow-up radio line per surviving leader after every later
  linchpin, so Tina and the camps comment on one another rather than reading as
  isolated quest chains.
