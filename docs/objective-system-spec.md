# Objective System Spec — One Grammar for Every Goal

Date: 2026-07-17. Status: **design, not yet implemented.**
Wave-6 Claude lane item 6 (`docs/sprint-19-wave6-punch-list-lane-split.md`)
and `docs/things-we-missed.md` §6 both call for this before any more
objective surfaces get built. Camp Bonding Quests (shipped 2026-07-16)
is the proof-of-concept this generalizes.

## The problem, concretely

The game currently runs **five independent objective systems**, each with
its own events, HUD element, and priority logic:

| System | State lives in | HUD element | Events | Compass |
| --- | --- | --- | --- | --- |
| Loop step (next action) | derived per-frame (`updateLoopStepCue`) | `#loop-step-hud` | `loop-step-changed` | no |
| Missions (eliminate/retrieve/survey) | `game.missionState` | `#mission-progress-hud` | `mission-kill-progress`, ad-hoc | no |
| Black box recovery | `blackBoxStore` + `_blackBoxMarkerActive` | prompt + toast | `black-box-recovered` | yes (own branch) |
| Camp bonding quests | `act2.questFlags` + `game._activeCampQuest` | `#camp-quest-hud` | `camp-quest-progress/-complete` | yes (own branch) |
| Lore collection | `_readLoreKeys` / `loreDrops` / localStorage ledger | none in-run | `lore-terminal-read`, `lore-drop-collected` | yes (own branch, 2026-07-17) |

Each new system so far has added: a new single-line HUD element, new event
names, a new `getRadarCompassState()` branch, and new show/hide calls in
`main.js`'s phase transitions. That's the "objective systems are
multiplying" risk `things-we-missed.md` flags — the game is becoming
objective-rich faster than the UI language is becoming objective-literate.

## What stays (non-goals)

- **`#loop-step-hud` stays exactly as is.** It's the one frame-derived,
  can't-go-stale element and it answers a different question ("what
  should I do next?") than a tracker ("how far along is X?"). It is the
  fallback voice of the system, not a client of it.
- **No storage migration.** `act2.questFlags`, `blackBoxStore`,
  `missionState` all keep their current persistence. The framework is a
  *presentation contract*, not a data migration — the camp-quest work
  proved the adapter pattern works (`skillTree.js` did the same for
  three progression systems).
- **No new priority meta-system for modals/toasts.** This spec covers
  tracked objectives only, not the notification deck.

## The contract

One shape, dispatched by any system that wants tracked-objective UI:

```js
window.dispatchEvent(new CustomEvent('objective-tracked', { detail: {
    id: 'camp_quest:reactor_venting',   // stable within the run
    source: 'camp-quest',               // camp-quest | mission | black-box | lore | tutorial | boss
    label: 'REACTOR VENTING',           // display line
    current: 1, target: 3,              // counter (target 1 = binary)
    priority: 40,                       // see ladder below
    compass: { x, z } | null,           // world target, null = no pointer
    steps: [                            // optional children (checklist)
        { label: 'VALVE A', done: true },
        { label: 'VALVE B', done: false }
    ]
} }));
window.dispatchEvent(new CustomEvent('objective-resolved', { detail: {
    id, outcome: 'complete' | 'failed' | 'abandoned'
} }));
```

A tiny registry in `main.js` (mirroring the notification-deck pattern)
holds active objectives, renders the tracker, and answers "which single
objective owns the compass right now."

### Priority ladder (lower wins, matching the compass's existing order)

| Band | Source | Rationale |
| --- | --- | --- |
| 10 | story-critical (black box, cave finale, foundry) | run-defining |
| 20 | boss encounter warnings | active threat |
| 30 | missions | player-accepted contract |
| 40 | camp/hive quests | opt-in side content |
| 50 | lore proximity | ambient nudge |
| 90 | tutorial steps | replaced by anything real |

`getRadarCompassState()`'s hand-rolled branch chain collapses to: iterate
active objectives by priority, first one with a `compass` target wins.
The existing branches migrate one at a time (see rollout), each migration
deleting a bespoke branch.

### The tracker HUD

Replace nothing initially; add `#objective-tracker` in
`.hud-mission-stack` rendering the top **two** active objectives (by
priority) as `LABEL: current/target`, with child steps as a checklist
under the first when present. `#mission-progress-hud` and
`#camp-quest-hud` become thin adapters (dispatching into the registry)
and are deleted once their sources migrate. Amber family, same as
`#mission-progress-hud` today — the punch list's "this corner already
has too many accent colors" finding stands.

## Rollout order (each step shippable alone)

1. Registry + `#objective-tracker` + camp quests migrated (they already
   emit progress events with `{current, target}` — smallest delta).
2. Missions migrated (`missionState` writes → dispatches).
3. Black box (gains a live "guard alive" child step — closing the §3b
   "one-shot toast context loss" gap for free).
4. Lore proximity (compass only, no tracker line).
5. Delete the bespoke compass branches + `#camp-quest-hud` +
   `#mission-progress-hud`.
6. Tutorial steps adopt the contract last (they're currently outside the
   deck entirely).

## Test plan

- Unit: registry ordering/replacement/resolution (pure, no DOM).
- Unit: compass-owner selection across priorities.
- E2E: one spec accepting a camp quest and asserting the tracker line +
  compass mode, replacing the current `#camp-quest-hud` assertions in
  `tests/e2e/camp-quests.spec.js` at step 1.
