# Ambient Line Director: Unifying and Contextualizing HUD Commentary — Design

**Date:** 2026-08-02
**Status:** Approved for implementation
**Scope:** Director ambient taunts, Mothership Reactive event lines, and ad-hoc
HUD-stack nudges. Developer Commentary (opt-in dev toggle) and DialogueManager's
scripted onboarding/milestone sequences are explicitly out of scope.

## Problem

Player-reported symptom: HUD commentary ("You've gone too deep"-style lines)
feels random, nonsensical, and out of place.

Investigation found the cause is architectural, not a content-quality problem.
Five independent systems currently write into the same
`.hud-notification-stack` DOM element with no shared coordination:

1. **BunkerDirector** (`src/director.js`, `dialogueLines.js`) — fires on a
   ~16s timer (`threeGame.js:4911-4928`), picking `Math.random()` over a
   static 8-line pool (`dialogueLines.js:51-60`) whenever a probability roll
   succeeds. The roll is weighted by `depth`, but that value
   (`getActiveO2GeneratorDistance()`, `threeGame.js:4922`) is actually
   distance-from-base, not real cave/maze depth — and even when the roll
   fires, line *selection* ignores depth, danger, objective, and every other
   piece of live state. A line like "The structure notes your depth and
   disapproves" can print while the player is standing next to the ship.
2. **Mothership Reactive** (`main.js:4135-4161`) — event-triggered, fixed
   one-line-per-event, 45s global cooldown, fire-once-per-run.
3. **Tutorial/HUD nudges** (`src/dialogue.js:1057-1106`) — push into the same
   stack independently of the above two.
4. **Developer Commentary** (`main.js:2471-2525`) — opt-in dev/meta layer,
   off by default. Out of scope.
5. **DialogueManager scripted sequences** (`src/dialogue.js`) — ordered
   onboarding/milestone dialogue, not random. Out of scope.

Systems 1-3 have no shared cooldown or priority model, so a Director taunt
about one thing can fire seconds after a Mothership line about something
else entirely — nothing arbitrates who "owns" the player's attention.

## Goal

Replace systems 1-3 with a single **Line Director** arbiter that selects
lines by scoring them against live game context (current objective, real
depth tier, danger level, narrative register, recent events) instead of
picking randomly, and that owns cooldown/dedup across all three trigger
sources so they stop colliding.

## Architecture

```
game tick (every ~4s) OR discrete event (kill, biome-enter, low-O2, ...)
    -> LineDirector.requestLine(trigger, extraContext)
        -> buildContextSnapshot()
        -> pool.filter(eligible: tag match + not on cooldown)
        -> score each candidate, pick highest (or none)
        -> showBunkerLine(winner.text) / showBiomePrompt(...)   [existing render pipeline, unchanged]
        -> recordFired(winner)  [cooldown + last-N history]
```

`LineDirector` is a new pure-ish module, `src/lineDirector.js`, mirroring the
existing `director.js` style (small, testable, no DOM/Three.js access —
game code calls it and forwards the result to the existing render
functions). It does not replace `showBunkerLine`/`showBiomePrompt`/
`renderRadioTransmission` — those keep doing exactly what they do today.

### Context snapshot

Built fresh on each `requestLine` call from state that already exists:

- **Objective** — `window.objectiveRegistry` current highest-priority
  active objective (id, source, type).
- **Depth tier** — `this.currentDepthTier` (0-3, `getDepthTier(chunkX, chunkY)`,
  `threeGame.js:695-701`, already tracked and named via
  `DEPTH_TIER_NAMES` in `src/data/loot.js:6`). This *already exists* and is
  more honest than Director's current distance-from-base proxy — no new
  tracking needs to be built, the Line Director just reads it.
- **Distance from base** — kept as its own situational signal
  (`getActiveO2GeneratorDistance()`), no longer mislabeled as "depth."
- **Danger** — player hp%, nearby-hostile count, seconds since last damage.
- **Register** — `corporate`/`glitched`/`reverent`, derived the same way
  `getSuitRegister()` does today (`dialogueLines.js:179-189`) from
  `infectionStage`/`queenObedience`.
- **Recent events** — small ring buffer of the last few notable events
  (kill, discovery, extraction start, etc.) for anti-repeat and
  event-triggered eligibility.

### Line pool schema

New file `src/data/lineDirectorPools.js` absorbs the ambient/reactive
content currently split across `dialogueLines.js`'s director/lowO2/etc.
pools and the inline Mothership object (`main.js:4143-4158`). Scripted
DialogueManager content is untouched and stays in `dialogue.js`.

```js
{
  id: 'director_depth_disapproval',
  register: 'corporate',
  text: 'The structure notes your depth and disapproves.',   // hand-authored (default)
  // OR: template: (ctx) => `You are deep in the ${ctx.depthTierName}. The structure disapproves.`
  tags: {
    objectiveTypes: ['explore', null],  // null = applies regardless of objective
    depthTier: { min: 2 },              // DEEP or ABYSS only
    danger: { max: 0.6 },               // not mid-firefight
    eventTrigger: null,                 // ambient, not event-bound
    cooldownClass: 'director_ambient'
  },
  weight: 1
}
```

Most lines stay hand-authored `text` with tags (preserves existing voice and
quality — this is a one-time tagging pass over ~21 pools + 13 Mothership
lines, not a rewrite). A small number of high-value slots (objective
nudges, depth callouts) use `template` for precision, per the "mix of both"
direction. Cooldown classes (`director_ambient`, `mothership_reactive`,
`tutorial_nudge`, etc.) let related lines share a cooldown bucket without
needing one global cooldown for everything.

### Scoring

```
score = objectiveMatchWeight(line, ctx)
      + situationalMatchWeight(line, ctx)   // depth/danger/register fit
      - repeatPenalty(line, ctx.recentHistory)
```

Highest score wins, provided it clears a minimum relevance floor **and**
its `cooldownClass` isn't currently on cooldown. If no candidate clears the
floor, `requestLine` returns nothing and nothing fires — the Director does
not fall back to a random line. Silence is preferred over noise; this is
the direct fix for "random and nonsense."

### Migration of trigger sources

- **Director timer** (`threeGame.js:4911-4928`): keeps its own cadence/roll
  for *whether* to request a line at all (should the ambient system speak
  right now?), but calls `LineDirector.requestLine('ambient', {...})`
  instead of directly calling `getDialogueLine('director')` +
  `showBunkerLine`.
- **Mothership Reactive** (`main.js:4135-4161`): each event call site
  becomes `LineDirector.requestLine('mothership:<event>', {...})`; the
  45s/once-per-run logic folds into the shared cooldown/history model.
- **Tutorial/HUD nudges** (`dialogue.js:1057-1106`): same pattern, own
  `cooldownClass`.

Because all three route through one arbiter with shared history, two
systems can no longer talk over each other seconds apart — that was the
literal "out of place" complaint.

### Out of scope

- Rendering/DOM (`renderRadioTransmission`, `.hud-notification-stack`,
  card styling) — unchanged.
- Developer Commentary — separate opt-in dev layer.
- DialogueManager scripted onboarding/milestones — deliberate and ordered,
  not the reported problem.
- Boss/queen-fight dialogue, camp NPC dialogue — not part of the ambient
  commentary complaint.

## Testing

- **Pool integrity test**: every line has valid tags, a valid register, a
  unique id; every `template` is a function; no `cooldownClass` typos
  (checked against a known-class list).
- **Scoring unit tests** against synthetic context snapshots — e.g.
  low-danger + ABYSS + no recent objective progress selects a depth/explore
  line over a combat line; mid-firefight selects (or suppresses in favor
  of) a danger-appropriate line regardless of depth; a line fired within
  its cooldown window is excluded from candidates.
- **Repeat-suppression test**: same line id does not fire twice within its
  cooldown/history window.
- No new e2e/DOM coverage required — `LineDirector` is pure selection logic,
  testable without Three.js or the DOM, same testing shape as the existing
  `director.js` (`director.test.js` pattern).
