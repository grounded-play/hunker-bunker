# The arching storyline — how the endings interweave

Written against the shipped state machine, not aspirationally. Every number
here is read from `src/act2.js`.

## The question the whole game asks

**Four seats leave the ice. You occupy one.**

```
ACT2_MANIFEST_SEATS_MAX = 4
seatsUsed = 1 (you) + humans + aliens + (queen ? 2 : 0) + (egg ? 1 : 0)
```

Three seats to allocate, and eight things that want them:

| Claimant | Seats | Gate |
| --- | ---: | --- |
| Meridian / Tallow / Vesper (human camps) | 1 each | camp `recruited`, bond ≥ 4 |
| Suture / Relay / Carapace (alien hives) | 1 each | hive `bonded` → `aboard` |
| The Queen | **2** | `queenStatus: 'aboard'` |
| An egg | 1 | requires Nahl aboard (`egg_requires_nahl`) |

The Queen costing **two of your three** is the spine of the story. Taking her
means at most one other passenger. Everything else is a consequence of that one
number.

## The mirror

The cast is deliberately symmetrical, and this is what makes interweaving
possible rather than a branch list:

| Human camp | Leader | Alien hive | Leader | Hive quest flag |
| --- | --- | --- | --- | --- |
| Meridian | Overseer Kaelen | Suture | Nahl | `host_mercy` |
| Tallow | Sister Martha | Relay | Vey | `false_clearance` |
| Vesper | Commander Briggs | Carapace | Rhun | `guard_oath` |

Every leader has a four-stage dialogue tree, all authored and localized. The
hive flags already drive hive status (`threeGame.js:13517`).

## The five arcs

Endings are not five separate branches. They are five **resolutions of the seat
question**, and most of the game's choices push you along one axis or the other.

### 1. The clean break — `CLEAN_ESCAPE`
`queenGone && eggsDestroyed && allHumanRecruited && (!humansKnow || cured)`

All three camps recruited fills every seat with humans. Requires you to be
either uninfected or cured, and unexposed. **The most seat-expensive ending and
the most fragile** — one camp culled or robbed kills it permanently.

### 2. The exodus — `ALIEN_EXODUS`
`aliensAboard >= 3 && queenGone`

The mirror of the clean break: all three hives, no queen. Requires every hive
quest done.

### 3. The full brood — `FULL_BROOD`
`queenAboard && eggsAboard && allCulled && obedience >= MAX`

Queen (2 seats) plus egg (1) fills your three exactly. **No survivor of either
faction can come.** Requires all camps culled — the only ending that demands
active destruction.

### 4. The smuggle — `MOTHERSHIP_INFECTION`
`playerLatentInfected && allHumanRecruited && !humansKnow && aliensAboard === 0 && !queenAboard`

Looks identical to the clean break from the outside. The difference is entirely
in what *you* are. This is the stealth arc, and the `humanity` meter is its
timer.

### 5. Everything else — `MIXED_CREW`, `OUTED_ESCAPE`, and the failures
The catch-all and the partial failures. `MIXED_CREW` is the floor and is never
lockable.

## Where linchpins fit

The arcs above are reachable by accumulation — bond up three camps, or do three
hive quests. Accumulation alone makes a game of bookkeeping. **Linchpins are the
turns that cannot be un-taken**, and they exist to make an arc *cost* something
rather than merely take time.

The pattern, established by Mayor Tina:

1. A moment with two readings, both defensible.
2. An irreversible resolution recorded in `hb_act2_v1`.
3. Deltas to `humanity` and camp bond — never new state.
4. A set of endings closed, skipped by the cascade thereafter.
5. A codex entry written afterwards so the player can account for it.

### Shipped

| Linchpin | Resolutions | Closes |
| --- | --- | --- |
| `mayor_tina` | `killed` / `joined` | the alien arcs / the clean arcs |

### Wired in this pass

| Linchpin | Resolutions | Closes | Backed by |
| --- | --- | --- | --- |
| `scientist_specimen` | `proved` / `dismissed` | `dismissed` closes `ALIEN_EXODUS` | Okonkwo-Vass stages 2–3, already authored |
| `queen_offer` | `accepted` / `refused` | `refused` closes `FULL_BROOD`; `accepted` closes `CLEAN_ESCAPE` | the queen/obedience state |

Okonkwo-Vass already asks, in shipped dialogue: *"DON'T KILL ONE. TALK TO ONE.
PROVE ME RIGHT."* That request had no mechanical consequence. Refusing it — by
killing the specimen she asked you to spare — is the moment the alien arc stops
being available, because the one human who would have vouched for them saw you
do it.

## The reachability guarantee

Enough closed doors could leave nothing. `MIXED_CREW` is permanently unlockable
and `storyLinchpins.test.js` enumerates every combination of resolutions to
prove at least one ending survives. **This must hold as linchpins are added.**

## Gaps worth closing next

- **Camps are thinner than hives.** Each hive has a named leader, a four-stage
  tree and a signature quest flag. Camps have the tree but their quests are
  generic (`REACTOR VENTING`, `SPORE CLEANSING`) and carry no state beyond bond.
- **`humansKnow` has one source.** The stealth arc's central variable is barely
  driven, so `MOTHERSHIP_INFECTION` is reachable almost by default rather than
  by playing carefully.
- **No ending is foreshadowed in-run.** The player cannot see the seat count
  filling. A manifest readout would turn the spine of the game from an
  end-of-run surprise into an ongoing decision.
