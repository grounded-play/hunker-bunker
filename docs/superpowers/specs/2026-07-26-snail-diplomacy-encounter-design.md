# Snail Diplomacy: Turn-Based Encounter, Companion, and Sidequest — Design

**Date:** 2026-07-26
**Status:** Approved for implementation
**Scope:** Act 2 only. Wild snails only (cybersnail/cryosnail/sporesnail).
Boss snail variants are an explicit, separate Phase 2 — not built here.

## Problem

Combat with snails is currently one shape only: shoot them, or get touched
and take damage (`updateSnailBehavior`, `threeGame.js:18378`). Act 2 already
tracks a real human/alien axis (`infectionStage`) and already has a passive,
silent expression of it — `isHiveKinPassive` makes wild snails stop
targeting the player once they've turned, with no interaction attached to
that fact at all. This adds an actual interactive expression of that
relationship: touching a snail opens a paused, turn-based encounter where
Fight is one option among several, Talk is real and species-gated, and a
won-over snail becomes a following companion. A new camp NPC gives this a
narrative frame and a completion condition.

## Scope boundary: why Act 2 only

`infectionStage` and camp `questFlags` are both part of `act2.js`'s state —
neither exists before Act 2 begins (`isAct2Active()` is false, camps carry
no quest-flag storage yet). Rather than invent parallel pre-Act-2
persistence for a feature whose entire premise is "human vs. alien,"
this ships as Act 2 content: in Act 1, snails behave exactly as they do
today. Once Act 2 begins, snail contact triggers the encounter, and
"human" specifically means `infectionStage === 'cured'` — you were
infected and chose to cure it — rather than "never infected." This is a
deliberate interpretation of "if we try as a human," made explicit here
rather than assumed silently.

## Trigger and world-pause

`hasBlockingGameplayOverlay()` (`threeGame.js:3584`) is the actual pause
switch already in this codebase: when it returns true, the entire
per-frame update chain — `updatePlayer`, `updateScatter`, `updateProjectiles`,
all of it — is skipped outright in the main loop (`threeGame.js:4396`),
not just player input. This is stronger than `inputEnabled` (which only
gates the player's own controls) and is exactly what "the world pauses"
requires. A new modal element id, `#snail-encounter-modal`, is added to
`hasBlockingGameplayOverlay`'s existing id list — one line, in the same
function that already lists `mothership-dialogue`, `game-over-modal`, etc.

**Replaces**, for snail types only, the existing contact-damage branch:

```js
// threeGame.js:18378, current:
const attackRadius = SNAIL_ATTACK_RADIUS * (data.isBoss ? 2.4 : 1.0);
if (distanceToTarget <= attackRadius && data.attackCooldown <= 0) {
    // ...instant takeDamage...
}
```

For non-boss snail types, when `isAct2Active()` and the sprite isn't
already flagged `encounterResolved` or `isCompanion`, reaching
`SNAIL_ATTACK_RADIUS` opens the encounter instead of dealing damage. This
single proximity check covers both cases the old attack-radius check
could not: a hostile snail closing in on a "human" player, *and* a
passively-wandering kin-recognized snail the player simply walks up to
(which today never becomes an attack target at all, since
`selectSnailTarget` excludes kin-passive snails from targeting entirely —
there would otherwise be no "touch" moment to hook for that case). Other
enemy types (sentinel, crawler, alien_proto_*, mycelium_stalker,
bio_charger) are untouched — this only intercepts snail types.

## Battle state

```js
this.encounterState = {
    sprite,              // the snail's THREE.Sprite — same instance, not a copy
    snailType,            // 'cybersnail' | 'cryosnail' | 'sporesnail'
    snailHp, snailMaxHp,
    resolve: 0, resolveMax: 100,
    turn: 'player',       // 'player' | 'snail' | 'resolved'
    outcome: null,        // null | 'fight_win' | 'befriend' | 'fled' | 'fight_loss'
    log: []                // last few battle lines for the overlay
};
```

Player HP is **not** duplicated into a battle-local pool — the encounter
reads and damages the player's real HP via the existing `takeDamage`.
Losing a fight costs real hearts, consistent with the game's existing
"shoot and get touched" stakes; there is no separate, consequence-free
battle-HP layer.

## Actions

**FIGHT.** Deals damage via `applyPlayerDamageToEnemy(sprite, amount)` —
the same entry point the projectile-hit path already uses
(`threeGame.js:13802`), so a fight-won kill falls through the exact
existing `damageSnail` death/loot/corpse pipeline rather than a new one.
The snail then counters via the existing `takeDamage(damage, data.type, ...)`
using its current contact-damage value (`data.isBoss ? 2 : 1` — always `1`
here since bosses are out of scope). `damageSnail` already sets
`shotByPlayer = true` on hit, which is exactly the flag
`isHiveKinPassive` already checks to permanently exclude a snail from
kinship — fighting a snail, even inside the encounter, correctly and for
free makes that specific snail unable to ever be kin-passive again.

**TALK.** Adds to `resolve` each round. Gain and backfire risk are
species-gated:

- `infectionStage` set and not `'cured'` (infected/alien path): large
  resolve gain per attempt, minimal backfire chance.
- `infectionStage === 'cured'` (human path): small resolve gain, real
  backfire chance — on backfire, the snail immediately counter-attacks
  (same damage as a Fight-round counter) instead of the player's turn
  producing any resolve gain. This is the mechanical shape of "likely to
  attack, but a snail can still be won over."

`resolve` reaching `resolveMax` ends the encounter as `befriend`
regardless of remaining `snailHp` — talking your way through does not
require winning a fight first.

**FLEE.** Ends the encounter immediately with `outcome: 'fled'`. The
snail is not flagged resolved and keeps whatever `aiMode` it had; nothing
about it changes, so it can trigger the encounter again later.

## Resolution

- `snailHp <= 0` → `fight_win`: normal death, already fully handled by
  `damageSnail`'s existing burst/loot/corpse path.
- `resolve >= resolveMax` → `befriend`: see Companion, below.
- Player HP hits 0 mid-encounter → the game's existing death handling
  takes over exactly as it does for any other damage source; the
  encounter does not special-case player death.
- `fled` → encounter closes, world unpauses, no state change to the snail.

## Companion (befriend outcome)

**One companion at a time in v1.** Befriending a second snail while one
is already active replaces it (the existing companion reverts to a normal
scatter sprite, released back to the wild) rather than stacking — there is
no existing multi-follower pattern anywhere in this codebase to build a
crowd system on, and inventing one is explicitly not this spec's job.

On `befriend`: `sprite.userData.isCompanion = true`, `encounterResolved =
true`; the sprite moves from being hunt-targetable to `this.companions`
(a new single-element-in-practice array, kept as an array for the natural
seam where multi-companion support could land later without a data-shape
change). A new `updateCompanions(delta)`, called alongside the existing
`updateScatter` in the main per-frame chain:

- **Follow:** seeks a trailing offset behind the player, reusing
  `isSnailTileWalkable` for movement validation — the same walkability
  check `updateSnailBehavior` already uses, not a new pathing system.
- **Assist:** when a hostile (non-companion, non-kin) snail or crawler
  comes within a small radius of the companion, the companion deals
  periodic damage to it via the same `applyPlayerDamageToEnemy` path Fight
  uses, on a cooldown timer.

`selectSnailTarget` only ever resolves to the player or the ship today —
snails do not target each other, so a companion needs no new exclusion
there. It does need excluding from the encounter trigger itself (a
companion can never re-enter its own encounter) and from
`isHiveKinPassive`'s targeting pool the same way any already-resolved
snail is.

## Sidequest: the camp scientist

**Correction from an earlier draft of this doc:** the three human camp
leaders are not interchangeable "slots" — `ACT2_CAMP_IDS` is a fixed
3-entry array (`camp_meridian`/`camp_tallow`/`camp_vesper`), each
deterministically mapped to one of exactly 3 class-based leader identities
via `ACT2_CLASS_CAST`/`getClassCampOrder` (`act2.js:35-98`), and the third
is always the boss/"inverted self" camp. There is no open fourth slot in
that system, and extending it would mean touching the class-RPS ordering,
world placement, and the 10-ending picker — all tightly coupled, tested,
working machinery this feature has no reason to touch.

The real precedent is **hives**: a second, independent record collection
(`s.hives`, separate from `s.camps`) that `talkToLeader(kind, entity)`
already branches on via its `kind` parameter
(`kind === 'hive' ? this.getHiveRecord(entity.id) : this.getCampRecord(entity.id)`,
`threeGame.js:9408`). The scientist becomes a **third kind**,
`'scientist'`, with her own single standalone record (there is exactly one
of her, so a single object, not an array-of-ids like camps/hives) living
on act2 state as `s.scientist = { dialogueStage: 0, stageTalks: 0,
questFlags: {} }`. `talkToLeader` gains a third branch reading/writing
that record instead of a camp or hive one. She still reuses
`LEADER_DIALOGUE`/`nextDialogueBeat`'s staged-dialogue *content* format
and `openBriefTransmission`'s rendering — those are genuinely
identity-agnostic — just not the camp-id/class-cast identity system.

**Placement:** she is a second, independent NPC fixture standing at
`camp_meridian`'s already-placed world position (read from the existing
camp instance, not a new placement/site system) — flavor only, her
dialogue and quest state are not stored on that camp's record. A separate
proximity check (mirroring the existing camp-leader TALK-prompt range
check) offers her interaction independent of whatever the camp leader
prompt is doing at the same location.

Four stages, following the established `next: {talks, level/bond/postReveal}`
gating convention:

1. Introduces her interest in whether snails can be reasoned with; gates
   on `talks`/camp `level` like the existing leaders' stage 1.
2. Explains her working theory and what she's observed changes a snail's
   receptiveness — an in-fiction nudge toward the infected/cured
   distinction, not a tutorial popup. Gates on `postReveal` (Act 2 active),
   since the mechanic she's describing doesn't exist before then.
3. **Registers the objective** (`ObjectiveRegistry.trackObjective({ id:
   'befriend-a-snail', source: 'camp-quest', label: 'BEFRIEND A SNAIL',
   current: 0, target: 1 })`) the moment this stage is reached. This is
   the moment the sidequest actually starts.
4. (Final, `DIALOGUE_FINAL_STAGE`.) Gates on a new
   `questFlags.snail_befriended === 'done'` on the scientist's own record,
   in place of the usual `postReveal`. Set via a new `completeScientistQuest
   (questId, bondDelta = 0)` on the `Act2` class, mirroring
   `completeCampQuest`/`completeHiveQuest`'s existing shape exactly
   (`act2.js:789`/`941`) but mutating `s.scientist` instead of an entry in
   `s.camps`/`s.hives` — the moment an encounter resolves to `befriend`,
   alongside `ObjectiveRegistry.resolveObjective('befriend-a-snail')`.
   **Correction:** an earlier draft of this doc said the reward was "a
   shells payout" — checked against real camp-quest completion call sites
   (`threeGame.js:9200`/`9675`) and that's not how any existing camp quest
   pays out; they only ever move bond/world-state, no currency grant sits
   alongside `completeCampQuest`. The scientist's quest follows that same
   real pattern: completion is the unlocked final dialogue stage itself
   (her last line(s), `isFinalStage` becoming true), not a currency payout
   that doesn't exist elsewhere in this system either.

The `befriend` resolution dispatches one event,
`window.dispatchEvent(new CustomEvent('snail-befriended', { detail: {...}
}))`, and both the objective-completion and the quest-flag-set are driven
from that single event, so the sidequest and the companion system don't
need to know about each other directly.

## Explicitly out of scope (this spec)

- Boss snail variants. Their existing scripted attacks (frost shockwave,
  minion spawns, wall-breaking) are real, tested, working content — a
  Phase 2 would adapt them into turn-based special-move options rather
  than discard them, but that reconciliation is substantial enough to earn
  its own design pass, not a bolt-on here.
- Act 1 availability (see Scope boundary, above).
- More than one simultaneous companion.
- Any new reward type, currency, or persistence system beyond what
  already exists (shells, `ObjectiveRegistry`, camp `questFlags`).

## Testing plan

- Pure logic extracted and unit-tested where possible: resolve-gain/
  backfire-chance calculation as a function of `infectionStage`, so the
  species-gating is testable without a DOM or a live scene.
- `isHiveKinPassive`/`selectSnailTarget` behavior around companions:
  a companion must never appear as a target for other snails' AI or for
  its own re-triggered encounter.
- `ObjectiveRegistry` integration: the quest reaches stage 3's tracked
  objective and resolves it on the `snail-befriended` event, matching the
  existing pattern other camp-quest objectives already use.
- Manual/visual: trigger an encounter as both infected and cured, confirm
  the world is actually paused (other enemies frozen, O2 not draining)
  by checking `hasBlockingGameplayOverlay()` returns true while the modal
  is open; confirm a companion follows and assists after befriending one.
