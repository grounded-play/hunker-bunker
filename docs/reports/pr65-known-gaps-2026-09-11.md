# PR #65 — known gaps, expanded

The four items listed as gaps on
[PR #65](https://github.com/grounded-play/hunker-bunker/pull/65), with the
detail needed to act on them. Ordered by what would actually hurt.

None of these block the code being correct. Three are incomplete *player
experience* around correct mechanics; one is missing verification.

---

## 1. Nothing here has been watched running

**The only item worth holding a merge for.**

### What is actually proven

| Claim | Evidence |
| --- | --- |
| The fracture produces valid chunks | Real `cyber-snail.glb`: 29,999 triangles in, 29,999 out across 8 chunks, offsets spread across the body |
| Chunk balance is sane | Largest chunk 22% after Lloyd relaxation, down from 39% |
| Chunks move under physics | Unit test steps the sim and asserts the debris field drifts downrange |
| Props resolve their model and spawn debris | Unit test via `world3dRoot` |
| Gore off still breaks crates | Unit test |
| Tina dies on hit four, not hit one | Unit test on the pure state machine |

### What is not proven

**How any of it looks.** Chunk count, tumble rate, how long debris lingers, whether
a shattered crate reads as "destroyed" or as "visual noise", whether Tina coming
apart lands as shocking or as comic. No test can answer those.

### Why it has not been checked

`tests/e2e/enemy-gibs.spec.js` exists and is committed deliberately unrun. All
three tests die in the shared boot helper at `tests/e2e/helpers.js:120`
("run-start flow did not reach gameplay") **before any assertion runs**. This is
not specific to that spec: `gameplay-aim-cursor.spec.js`, untouched by this
work, fails at the identical line on the same tree. The helper cannot currently
reach gameplay for any gameplay spec.

That is pre-existing infrastructure breakage, not something this PR introduced,
but the consequence lands here.

### What to do

Two minutes in a real session: start a run, shoot a prop, shoot Tina.

Tuning knobs, all at the top of `src/enemyGibs.js`:

| Constant | Current | Raise if | Lower if |
| --- | --- | --- | --- |
| `GIB_CHUNK_COUNT` | 8 | breaks read as too chunky/simple | debris reads as noise, or frame cost shows |
| `GIB_LIFETIME` | 2.6s | debris vanishes before it is noticed | corpses clutter the floor mid-fight |
| `LLOYD_PASSES` | 4 | chunks are unevenly sized | the one-time fracture cost matters more than balance |

The separate, larger job is repairing the boot helper, which would unblock the
whole gameplay e2e suite, not just this spec.

---

## 2. Ending locks are invisible to players

### The problem

Killing Mayor Tina permanently closes three endings. **Nothing tells the player
that happened.** A consequence the player cannot perceive is indistinguishable
from a bug: they reach an ending, wonder why another was unreachable, and have
no way to learn it was a choice they made hours earlier.

This is worse than having no consequence system, because the mechanic is
working perfectly and silently.

### What exists already

`applyLinchpinResolution` dispatches `story-linchpin-resolved` with
`{ id, resolution, locksEndings }`, and each resolution carries a `codexNote`
id (`linchpin_tina_killed`, `linchpin_tina_joined`). Nothing listens.

### What to build

Smallest honest version: a codex or dossier entry, written after the fact, that
names the choice and what it closed. Not a warning beforehand — the choice
should stay irreversible and uncomfortable — but a record the player can find.

The `narrative.*` catalog and seven-locale pipeline already exist, so the copy
is translatable the moment it is written.

---

## 3. The alien hive quest does not exist

The `joined` resolution is fully implemented: it applies `-30` humanity, drops
every camp bond by 2, and locks `CLEAN_ESCAPE` and `SCORCHED_SKY`. **Nothing in
the game can trigger it.**

So the Tina linchpin currently offers one real branch (kill her) and one branch
reachable only from a debug console. The system is not wrong, it is half-wired,
and the half that is missing is the more interesting one.

This is the largest piece of remaining work and is genuinely a design job, not
an implementation one.

---

## 4. Prop destructibility audit

### Scope, measured

Nine sites create scatter instances in `threeGame.js`. Exactly one sets
`isDestructibleProp: true`. That sounds alarming and mostly is not:

| Line | Creates | Destructible | Correct? |
| --- | --- | --- | --- |
| 25380 | general props | ✅ | yes |
| 25344 | floor overlay types (decals) | ❌ | **yes** — a floor decal has nothing to break |
| 25473 | `lore_terminal` | ❌ | **yes** — objective-critical, see below |
| 25499 | crawlers | ❌ | yes — enemies, different path |
| 25546 | sentinels | ❌ | yes — enemies |
| 25654 | `boss_sporesnail` | ❌ | yes — enemies |
| 25432 | `bunker_junk*` | ❌ | **candidate** — it is literally junk |
| 25300, 25719 | no type guard found | ❌ | **needs eyes** |

So the real audit is three sites, not eight.

### The hazard that makes this worth doing carefully

`lore_terminal` being indestructible is not an oversight, it is load-bearing. If
a player can destroy an objective terminal, a run can be soft-locked with no
feedback and no recovery. **The correct outcome of this audit may well be
"leave most of it alone."**

Anything flipped on needs a rule: a prop that an objective can point at must
never be destructible. Worth encoding as a test that walks the objective
registry and asserts none of its target types are destructible, so the next
person to flip a flag cannot break it silently.

---

## Suggested order

1. **Watch it run** (2 minutes, unblocks confidence in everything above)
2. **Prop audit** (small, and mostly confirms existing behaviour)
3. **Surface the locks** (small, makes an already-working mechanic legible)
4. **The hive quest** (large, design-led)

The boot-helper repair sits outside this list but would make item 1 permanent
rather than manual.
