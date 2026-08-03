# Passive Class Abilities & Universal Sprint

Date: 2026-07-28

## Problem

Today each class (SCOUT/TANK/ENGINEER) has one on-demand, cooldown-gated
"class ability" triggered by the F key (or Shift, confusingly aliased to the
same trigger — see `triggerSprintBurst()` in `src/threeGame.js`). SCOUT's
ability is literally a timed speed burst called SPRINT BURST; TANK's is a
timed invuln+root (BRACE); ENGINEER's is a timed O2-efficiency buff
(REROUTE). There is no real, class-agnostic sprint — "sprint" input currently
just fires whatever the current class's timed special is.

This conflates two different things: (1) class identity, which should be
always-on and recognizable without pressing a button, and (2) sprinting,
which should be a universal movement option every class can use.

## Goals

- Every class gets an always-on passive trait instead of a triggered,
  cooldown-gated special.
- Every class can sprint (hold-to-move-faster), independent of class.
- Reuse existing mechanical hooks (`playerSlowTimer`, `weaponReloadTimer`,
  `takeDamage`) rather than inventing new systems, except where a class
  identity genuinely needs new behavior (ENGINEER's turret).
- Keep the existing 3-node-per-class skill tree shape/costs; repurpose node
  effects instead of restructuring the tree.

## Non-goals

- No new stamina resource — sprint draws on the existing O2 system.
- No change to enemy "corrupted operator" ability telegraphs (BLINK/etc.
  boss flavor text) — that system reads `state.classType` for flavor only
  and is unrelated to the player ability system being reworked here.
- The F-key "ability" input action is not deleted, just disconnected — it's
  reserved for a future consumable/ultimate, out of scope for this change.

## Universal Sprint

- New standalone mechanic on `Game`, independent of `classAbility`.
- Trigger: hold the existing `sprint` input binding (`ShiftLeft`/
  `ShiftRight` on keyboard; gamepad sprint button via
  `setVirtualInputSprint`). No cooldown, no fixed duration — starts when
  held, stops when released or when O2 reaches 0.
- Effect while active: move-speed multiplier `×1.6` applied on top of the
  class's own base `moveSpeed` (SCOUT/TANK/ENGINEER keep their relative
  speed ranking since this is multiplicative), and O2 drain multiplier
  `×2.5`.
- Replaces `triggerSprintBurst()` / the `setKeyState('sprint', ...)` call
  into `triggerClassAbility()`. `setVirtualInputSprint` and the keyboard
  handler instead set a `this.sprinting` boolean consumed by the existing
  move-speed and O2-drain calculations (same place `_abilityMoveSpeedMult`
  and `_abilityO2DrainMult` are currently read).
- VFX/SFX: the existing `fx_scout_sprint.webm` dust-trail sprite and
  `fx_scout_sprint` SFX now play for whichever class is sprinting
  (throttled the same way `_spawnSprintTrail()` already throttles it today),
  not gated by class or by `classAbility.active`.

## Class Passives

All three are active from level 0 (no unlock gate) and get stronger via
skill-tree tiers (see below). `CLASS_STATS` gains new baseline fields per
class (exact field names decided at implementation time) instead of
`abilityKey`/`abilityLabel`/`abilityCooldown`/`abilityDuration`.

### SCOUT — EVASIVE

- 50% reduction to the duration of `playerSlowTimer` effects inflicted by
  enemies (frost shockwave, cryosnail, ground slam, etc.) — halved, not
  immune.
- −20% reload duration (per-player override on `WEAPON_RELOAD_DURATION`).
- Rationale: agile, low-damage class — this rewards staying mobile and
  keeps them shooting through effects that would otherwise root them.

### TANK — BULWARK

- 20% chance per incoming hit (checked at the top of `takeDamage()`) to
  fully block the hit's damage. On block, show a "BLOCKED" floating-text
  cue reusing the existing damage-number UI, and skip the damage/heart
  loss entirely for that hit.
- Chance-based rather than a flat percentage reduction, since damage is
  dealt in whole hearts (1–2) and a flat % doesn't produce a meaningful
  effect at that granularity.

### ENGINEER — AUTO-TURRET

- Every 20s, automatically deploys a stationary turret at the player's
  current position. The turret fires at nearby enemies for 6s, then
  despawns, then the 20s timer restarts.
- Reuses the existing `fx_engineer_turret` SFX. Turret targeting/fire logic
  is modeled on the existing `camp-turret` enemy-turret code path (nearest
  enemy in range, periodic shot) rather than a new targeting system.
- Redeploy timer is the one passive with visible state, so it gets a small
  HUD indicator (see below) rather than being fully silent.

## Skill Tree Changes

Keep each class's existing 3-node shape, costs, prereqs, `requiredGoal`,
and `requiredO2Level` — only relabel/reword and change what each node does.
No node gates whether the passive is active; all nodes purely strengthen an
already-active passive.

| Node (former role) | New role |
|---|---|
| `scout_special_unlock` (was ability unlock) | Tier 1: slow-resist 50% → 75% |
| `scout_special_upgrade_1` (was +duration) | Tier 2a: additional reload speed |
| `scout_special_upgrade_2` (was −cooldown) | Tier 2b: full slow immunity (100%) |
| `tank_special_unlock` | Tier 1: block chance 20% → 30% |
| `tank_special_upgrade_1` (was +duration) | Tier 2a: block chance 30% → 40% |
| `tank_special_upgrade_2` (was refill boost) | Tier 2b: passive regen, +1 heart every 60s if below max |
| `engineer_special_unlock` | Tier 1: turret duration 6s → 9s |
| `engineer_special_upgrade_1` (was +fire rate) | Tier 2a: turret fire interval −25% |
| `engineer_special_upgrade_2` (was −scan cooldown) | Tier 2b: redeploy cooldown 20s → 15s |

Node `id`s, `cost`, `prereqs`, `prereqMode`, `requiredGoal`,
`requiredO2Level`, and `row`/`col` are unchanged — only `label`/`desc` and
the runtime effect they gate change. Exact numeric increments finalized
during implementation, following the pattern above (a modest bump per
tier, consistent with existing tier-2 costs of `{ tech: 80, coin: 20 }`).

## HUD & Events

- `class-ability-panel` stops being clickable — the `pointerdown` handler
  that calls `window.game.triggerClassAbility()` is removed, and
  `triggerClassAbility()` itself is removed along with `classAbility`
  state, `_initClassAbility()`, and `updateClassAbility()`.
- The panel is repurposed to a static readout of the current class's
  passive: name (EVASIVE/BULWARK/AUTO-TURRET) + short description, driven
  by `getClassAbilityInfo()` (kept, returning the new passive info instead
  of ability key/label).
- For ENGINEER only, the existing `ability-bar` fill element is reused to
  show the turret redeploy countdown (0 → 1 as the 20s timer approaches
  ready). For SCOUT/TANK the bar is hidden since there's nothing to count
  down.
- `class-ability-activated`, `class-ability-ended`, and
  `ability-cooldown-tick` custom events are removed, along with the
  `ability-active-${ability}` viewport CSS class hook in `main.js` that
  responded to them.
- The F-key `ability` input binding and its keydown handler
  (`this.codeMatchesAction(event.code, 'ability')` at
  `src/threeGame.js:3134`) are left mapped but disconnected — no handler
  action — reserved for a future ability.

## Testing

- Update/replace tests currently covering `triggerClassAbility`,
  `triggerSprintBurst`, `classAbility` state, and ability HUD events
  (`src/threeGame.destructibleWalls.test.js` and others as found) to cover
  the new passive behaviors and the standalone sprint flag instead.
- New coverage needed: sprint move-speed/O2-drain multipliers while held
  and released; SCOUT slow-duration reduction and reload-speed reduction;
  TANK block-chance damage negation; ENGINEER turret spawn/despawn timing
  and targeting.
