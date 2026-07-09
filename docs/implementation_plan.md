# Implementation Plan: Multi-Ending Narrative System and Faction Dynamics

This plan connects the narrative design in:

- `docs/story-arc-endings-design.md`
- `docs/expanded-universe-narrative-design.md`

to the current JavaScript/Three.js implementation. The goal is to evolve Act 2
from a forced cull ladder into a choice-driven faction state machine where
boarding the vessel evaluates a persistent story vector and plays the matching
ending cutscene. It also tracks the current playtest regression backlog so the
story work and the stabilization work stay in one place.

## Current Code Reconnaissance

### Camp State

Current owner: `src/act2.js`

- Persistent storage key: `hb_act2_v1`.
- `Act2Manager` loads, normalizes, saves, and mutates the Act 2 meta state.
- `normalizeCamp()` currently keeps: `id`, `x`, `z`, `level`, `aided`, `destroyed`.
- `normalizeAct2State()` currently keeps: `begun`, `uplinkSilenced`, `dishBuilt`, `departed`, `camps`, `version`.
- `src/threeGame.js` calls `this.act2.getState()` in `ensureAct2Camps()` and creates one `SurvivorCamp` per saved camp record.
- Camp coordinates are selected by `chooseCampPosition()` and persisted via `act2.setCampPosition(id, x, z)`.
- Camp visuals are implemented in `src/camp.js` with `setLevel()`, `setAided()`, and `setDestroyed()`.

### Forced Culling Loop

Current gate: `deriveAct2Phase()` in `src/act2.js`

Current ladder:

```text
dormant -> gestation -> dish -> camps_help -> camps_betray -> launch_ready -> departed
```

The forced cull requirement is here:

```js
if (!s.camps.every((c) => c.aided)) return 'camps_help';
if (!s.camps.every((c) => c.destroyed)) return 'camps_betray';
return 'launch_ready';
```

Current gameplay hook: `src/threeGame.js`

- `getActionableCampAt()` returns:
  - `support` during `dormant`
  - `aid` during `camps_help`
  - `cull` / `defense-active` during `camps_betray`
  - `board` during `launch_ready`
- `interactWithAct2Camp()` performs the mutation and side effects.
- Current defended cull is already valuable and should be reused:
  - `spawnCampDefenders(camp)` spawns `camp.level * 2` defenders.
  - `spawnCampCullLoot(camp)` grants level-scaled drops plus `level * 5` shells.
  - `act2.destroyCamp(camp.id)` marks the camp as destroyed.

### Dialogue and Cutscenes

Current owner: `main.js`

- `runMissionIntroSequence()` chooses between the human crash intro and Act 2 queen intro.
- `runAct2IntroSequence()` begins Act 2 and opens queen brief transmissions.
- `playClassIntroSequence()` plays the class GIF plus class launch video.
- `playCutsceneVideo(base)` plays `/cutscenes/{base}.webm` with poster and MP4 fallback support.
- `startCaveRevealSequence()` plays `cave-reveal`.
- `runAct2DepartureSequence()` currently always plays:

```js
await dialogueManager?.openBriefTransmission({ lines: [...ACT2_LINES.departed] });
await playCutsceneVideo('act3-departure');
await showActThreeTeaseCard();
returnToMainMenuFromRun({ doorKey: 'lose' });
```

There is no `ending-fullbrood.webm` trigger yet. The current "ending" is a
single Act 3 teaser after boarding.

### Save Pipeline

Current pattern:

- Persistent game records use the `hb_` prefix.
- `src/profile.js` exports and imports all `hb_*` records.
- `clearSaveData()` now clears only `hb_*` records for a new-game reset.
- `src/act2.js`, `src/arcState.js`, `src/bank.js`, `src/fabricator.js`,
  `src/codex.js`, `src/blackBox.js`, and `src/loadout.js` each own their
  own storage key and normalizer.

Act 2 should continue using `hb_act2_v1` unless we intentionally migrate to a
new key. The safer approach is to keep the key and bump the internal
`version` field to `2`, because existing export/import/reset already handles
the key.

### Video Compilation Script

Current owner: `scratch/generate_cave_scenes.js`

- Generates `public/cutscenes/cave-reveal.webm` and poster.
- Generates `public/cutscenes/act3-departure.webm` and poster.
- Uses a reusable in-browser `recordVideo(name, drawFrame, durationMs, posterT)`
  helper.
- Adding ending tracks is straightforward: add more `await recordVideo(...)`
  calls with names like `ending-cleanescape`.

The runtime can already play those assets with `playCutsceneVideo(base)` once
the ending picker returns the correct base name.

## Sprint 1: State Schema Upgrades

### Goals

Expand `hb_act2_v1` without breaking old saves. Old saves with only
`destroyed: true` must normalize into the new status model.

### New Constants in `src/act2.js`

```js
export const ACT2_CAMP_STATUSES = Object.freeze([
    'alive',
    'robbed',
    'culled',
    'recruited',
    'turned'
]);

export const ACT2_QUEEN_STATUSES = Object.freeze([
    'aboard',
    'rejected',
    'killed'
]);

export const ACT2_EGGS_STATUSES = Object.freeze([
    'aboard',
    'destroyed'
]);

export const ACT2_MAX_BOND = 5;
export const ACT2_RECRUIT_BOND_THRESHOLD = 4;
export const ACT2_MAX_OBEDIENCE = 3;
```

### New Normalized State Shape

```js
{
    begun: false,
    uplinkSilenced: false,
    dishBuilt: false,
    departed: false,
    queenObedience: 0,
    queenStatus: 'aboard',
    eggsStatus: 'aboard',
    camps: [
        {
            id: 'camp_meridian',
            x: null,
            z: null,
            level: 0,
            aided: false,
            bond: 0,
            status: 'alive',
            questFlags: {},

            // Temporary compatibility fields while threeGame/camp visuals
            // migrate away from destroyed/robbed/turned booleans.
            destroyed: false,
            robbed: false,
            turned: false
        }
    ],
    version: 2
}
```

### Backward Compatibility Rules

`normalizeCamp(raw, id)` should:

- Clamp `level` to `0..ACT2_CAMP_MAX_LEVEL`.
- Clamp `bond` to `0..ACT2_MAX_BOND`, defaulting to `0`.
- Convert old saves:
  - `raw.status` valid -> use it.
  - `raw.destroyed === true` -> `status: 'culled'`.
  - `raw.turned === true` -> `status: 'turned'`.
  - `raw.robbed === true` -> `status: 'robbed'`.
  - otherwise -> `status: 'alive'`.
- Continue deriving compatibility booleans:
  - `destroyed: status === 'culled'`
  - `robbed: status === 'robbed'`
  - `turned: status === 'turned'`

`normalizeAct2State(raw)` should:

- Default `queenObedience` to the count of culled camps for old saves, capped
  at `ACT2_MAX_OBEDIENCE`.
- Preserve the current FULL BROOD path for old completed saves:
  - if all camps normalize to `culled`, use `queenObedience: ACT2_MAX_OBEDIENCE`,
    `queenStatus: 'aboard'`, `eggsStatus: 'aboard'`.
- Default missing `queenStatus` to `'aboard'`.
- Default missing `eggsStatus` to `'aboard'`.

### New Reducer Methods

Add these pure-ish mutation methods to `Act2Manager`:

```js
recordQueenObedience(delta)
setQueenStatus(status)
setEggsStatus(status)
setCampStatus(id, status)
adjustCampBond(id, delta, reason = '')
completeCampQuest(id, questId, bondDelta = 1)
stealCamp(id)
cullCamp(id)
recruitCamp(id, { mode = 'human' } = {})
getEndingVector()
```

`destroyCamp(id)` should remain as a compatibility alias for `cullCamp(id)`
until every caller has migrated.

### Phase Gate Change

Replace the forced culling gate. Once all three camps have aided the vessel,
boarding is available regardless of camp statuses.

```js
if (!s.camps.every((c) => c.aided)) return 'camps_help';
return 'launch_ready';
```

1. Keep it in `ACT2_PHASES` for compatibility with old saves/tests.
2. Stop deriving into it from new state.
3. Let camp choice actions run during `launch_ready`.

## Sprint 1.5: Faction Class Mapping & In-World NPCs

### 1. Faction Class Mapping (Rock-Paper-Scissors Wheel)

Add helpers in `src/act2.js` to dynamically map camp roles based on player class:

```js
ACT2_CLASS_RPS_ORDER = {
    SCOUT: ['TANK', 'ENGINEER', 'SCOUT'],
    TANK: ['ENGINEER', 'SCOUT', 'TANK'],
    ENGINEER: ['SCOUT', 'TANK', 'ENGINEER']
};

getClassCampOrder(playerType) // returns camp_meridian, camp_tallow, camp_vesper in story order
getCampClassMapping(playerType) // maps each camp id to leader/class metadata
getBoardingCampId(playerType) // final self-class command camp
```

The first two camps are always the two classes the player is not. The third
camp is the player's class reflected back as an inverted command/boss camp.

### 2. In-World NPC Pathfinding & Animation loops

In `src/camp.js`, expand the `SurvivorCamp` class to manage an in-world NPC billboard sprite:

- **Initialization**:
  - Read `getCampClassMapping(playerType)` to determine the leader class and name.
  - Instantiate a Three.js `Sprite` using the leader's walk sheet (`public/martha_camp_walk.png`, etc.).
- **Ambient Walking Node Logic**:
  - Define local path nodes inside the camp bounds:
    ```js
    this.pathNodes = [
        { x: this.x - 2, z: this.z + 1, action: 'idle' },
        { x: this.x + 3, z: this.z - 2, action: 'interact_console' },
        { x: this.x - 1, z: this.z - 3, action: 'inspect_flora_or_armory' }
    ];
    this.currentNodeIndex = 0;
    this.targetNode = this.pathNodes[0];
    ```
  - In `update(dt)`, lerp the NPC's position towards `this.targetNode`.
  - Play corresponding walk frames depending on direction vector (`dx, dz`).
  - Upon arrival, trigger the node's `action` (e.g., weld sparks, crouch, or searchlight sweep) for `3000ms`, then select the next random node.

### 3. State Reactivity
- **Robbed State**:
  - Swap sheet to combat posture. Set target coordinate directly facing the player.
  - If player crosses camp bounds, toggle `isHostile = true` and target player.
- **Turned State**:
  - Swap visual textures/sprites to infected variants (`boss_corrupted_scout.png`, etc.).
  - Speed up pathfinding speed and add erratic jitter to displacement offsets.
  - Spawn green dust particles periodically using the standard particle manager.

### 4. Boss Encounter Integration
- In Act 2, if the player enters the Boss camp, trigger a boss transition sequence:
  1. Pan the camera to the camp leader.
  2. Play a brief transmission (e.g., Overseer Kaelen speaking with corrupted static).
  3. Swap the camp leader NPC sprite to the active Boss sprite and activate the Boss AI logic (e.g., spawning phantoms, floor grids, or charging).

## Sprint 2: Act 1 Quest and Barter Hooks

### Camp Terminal Interaction

Current Act 1 camp interaction is direct: press interact near a camp and spend
shells to support it. To support barter, quests, and story choices, introduce a
small camp terminal flow:

- In `src/threeGame.js`, change `getActionableCampAt()` during `dormant` from
  returning only `support` to returning `camp-terminal` when the player is near
  an alive camp.
- In `interactWithAct2Camp()`, dispatch:

```js
window.dispatchEvent(new CustomEvent('camp-terminal-open', {
    detail: {
        campId: camp.id,
        campLabel: camp.label,
        phase: this.act2.getPhase(),
        campState: this.act2.getState().camps.find((c) => c.id === camp.id),
        bank: this.bank?.getState?.()
    }
}));
```

- In `index.html`, add a lightweight modal/panel for camp actions.
- In `main.js`, listen for `camp-terminal-open`, render available choices, and
  call methods exposed on `window.game`.

This keeps Three.js world interaction responsible for proximity and visuals,
while `main.js` owns UI.

### Barter Logic

Add a pure helper module:

```text
src/campEconomy.js
```

Responsibilities:

- Define camp trade tables:
  - Meridian: shells/tech/coin emphasis.
  - Tallow: med/coin/rations flavor mapped onto current bank resources.
  - Vesper: shells/weapon/coin emphasis.
- Compute rates from:
  - `camp.level`
  - `camp.bond`
  - class affinity from `window.game.playerType`
- Return validation results rather than mutating directly:

```js
getCampTrades(camp, playerType)
canApplyTrade(trade, bankState)
applyTrade(trade, bankManager)
```

Initial implementation should use the existing bank resources (`tech`, `coin`,
`med`, `shells`) and avoid adding new currencies until the loop proves itself.

### Quest Registration

Add:

```text
src/data/campQuests.js
```

Suggested data shape:

```js
export const CAMP_QUESTS = Object.freeze({
    camp_meridian: [
        { id: 'reactor_venting', label: 'REACTOR VENTING', bond: 1 },
        { id: 'lost_probe', label: 'THE LOST PROBE', bond: 1 }
    ],
    camp_tallow: [
        { id: 'spore_cleansing', label: 'SPORE CLEANSING', bond: 1 },
        { id: 'lost_cultist', label: 'THE LOST CULTIST', bond: 1 }
    ],
    camp_vesper: [
        { id: 'armory_breach', label: 'ARMORY BREACH', bond: 1 },
        { id: 'bunker_holdout', label: 'BUNKER HOLDOUT', bond: 1 }
    ]
});
```

Quest completion should call:

```js
act2Manager.completeCampQuest(campId, questId, bondDelta);
```

The first version can implement quests as compact procedural objectives that
reuse existing game systems:

- Fetch: spawn a marked pickup near a hazard biome.
- Defend: reuse `spawnCampDefenders(camp)` but mark them as attackers.
- Escort: keep a survivor marker within range for a short route.
- Purge/repair: interact with a foundry/console-like object.

## Sprint 3: Act 2 Choice Branching

### Camp Choice Modal

During `launch_ready`, interacting with an alive/recruitable camp should open a
choice modal instead of immediately culling.

Available actions by status:

| Status | Available actions |
| --- | --- |
| `alive` | steal, cull, recruit human if bond >= 4, turn if bond >= 4 |
| `robbed` | cull only, hostile/no barter |
| `culled` | none |
| `recruited` | none |
| `turned` | none |

Boarding remains available at the final self-class command camp returned by
`getBoardingCampId(playerType)`. A future visual pass can create a distinct
vessel marker, but the command camp is now the authored endpoint.

### Stealing

State mutation:

```js
stealCamp(id) {
    // valid only for status alive
    // status -> robbed
    // queenObedience can stay neutral or -1, depending on tuning
}
```

Three.js side effects:

- Add `SurvivorCamp.setStatus('robbed')` or `setHostile(true)`.
- Change beacon color to red/orange.
- Disable barter and recruit options.
- Grant stockpile loot:
  - current camp cull loot is death loot; stealing should grant less than cull
    but more than barter.
  - use a new `spawnCampStealLoot(camp)` helper.

Gameplay consequence:

- Re-entering a robbed camp can spawn hostile defenders or turret fire.
- The ending picker treats robbed camps as not boarded and not clean.

### Culling

Keep the current implementation and rename it around the new language.

Current code to reuse:

- `spawnCampDefenders(camp)`
- `campDefendersAlive(camp.id)`
- `spawnCampCullLoot(camp)`
- `camp.setDestroyed(true)`

Changes:

- `act2.destroyCamp(camp.id)` -> `act2.cullCamp(camp.id)`.
- `cullCamp()` sets `status: 'culled'` and increments
  `queenObedience` by `1`.
- Dispatch a richer event:

```js
window.dispatchEvent(new CustomEvent('camp-choice-resolved', {
    detail: { campId, campLabel, action: 'cull', endingWeight: 'obedience' }
}));
```

### Recruiting Humans

State mutation:

```js
recruitCamp(id, { mode: 'human' })
```

Rules:

- Valid only when `camp.status === 'alive'`.
- Require `camp.bond >= ACT2_RECRUIT_BOND_THRESHOLD`.
- Set `status: 'recruited'`.
- Decrease `queenObedience` by `1`.

Three.js side effects:

- Camp beacon changes to hopeful cyan/green.
- Camp no longer offers barter or steal/cull actions.
- Optional: show a small vessel-section light for each recruited camp.

### Turning Survivors

State mutation:

```js
recruitCamp(id, { mode: 'turned' })
```

Rules:

- Valid only when `camp.status === 'alive'`.
- Require `camp.bond >= ACT2_RECRUIT_BOND_THRESHOLD`.
- Set `status: 'turned'`.
- Increase `queenObedience` by `1`.

Three.js side effects:

- Camp gets green infection visuals.
- Beacon color shifts to hive green/amber.
- Future pass can spawn passive hybrid NPCs near the vessel.

### Queen and Egg Branches

Add two late-game decision hooks before final boarding:

- Queen decision:
  - `queenStatus: 'aboard'`
  - `queenStatus: 'rejected'`
  - `queenStatus: 'killed'`
- Egg decision:
  - `eggsStatus: 'aboard'`
  - `eggsStatus: 'destroyed'`

Implementation path:

1. Add a boarding confirmation modal in `main.js`.
2. Before calling `act2.depart()`, render queen/egg choices unlocked by the
   current state.
3. For Sprint 3, default to current behavior:
   - queen aboard
   - eggs aboard
4. Sprint 4 adds queen fight/egg purge gameplay before allowing killed/destroyed
   states.

## Sprint 4: Ending Picker and Boarding Vector

### Ending IDs and Video Assets

Add to `src/act2.js` or a new `src/endings.js`:

```js
export const ACT2_ENDINGS = Object.freeze({
    FULL_BROOD: 'full_brood',
    CLEAN_ESCAPE: 'clean_escape',
    MIXED_CREW: 'mixed_crew',
    CARRIERS_BARGAIN: 'carriers_bargain',
    SCORCHED_SKY: 'scorched_sky'
});

export const ACT2_ENDING_CUTSCENES = Object.freeze({
    [ACT2_ENDINGS.FULL_BROOD]: 'ending-fullbrood',
    [ACT2_ENDINGS.CLEAN_ESCAPE]: 'ending-cleanescape',
    [ACT2_ENDINGS.MIXED_CREW]: 'ending-mixedcrew',
    [ACT2_ENDINGS.CARRIERS_BARGAIN]: 'ending-carriersbargain',
    [ACT2_ENDINGS.SCORCHED_SKY]: 'ending-scorchedsky'
});
```

Assets expected in `public/cutscenes/`:

- `ending-fullbrood.webm`
- `ending-cleanescape.webm`
- `ending-mixedcrew.webm`
- `ending-carriersbargain.webm`
- `ending-scorchedsky.webm`

Optional posters:

- `ending-fullbrood-poster.jpg`
- `ending-cleanescape-poster.jpg`
- `ending-mixedcrew-poster.jpg`
- `ending-carriersbargain-poster.jpg`
- `ending-scorchedsky-poster.jpg`

### Mathematical Decision Tree

The pure picker should read:

```text
Ending = f(queenObedience, camps, queenStatus, eggsStatus)
```

Suggested implementation:

```js
export function pickAct2Ending(rawState = DEFAULT_ACT2_STATE) {
    const state = normalizeAct2State(rawState);
    const camps = state.camps;
    const total = camps.length;
    const count = (status) => camps.filter((c) => c.status === status).length;

    const culled = count('culled');
    const recruited = count('recruited');
    const turned = count('turned');
    const robbed = count('robbed');
    const allCulled = culled === total;
    const allHumanRecruited = recruited === total;
    const anySurvivorsBoarded = recruited > 0 || turned > 0;
    const queenGone = state.queenStatus === 'rejected' || state.queenStatus === 'killed';
    const queenAboard = state.queenStatus === 'aboard';
    const eggsAboard = state.eggsStatus === 'aboard';
    const eggsDestroyed = state.eggsStatus === 'destroyed';

    if (
        queenAboard
        && eggsAboard
        && allCulled
        && state.queenObedience >= ACT2_MAX_OBEDIENCE
    ) {
        return ACT2_ENDINGS.FULL_BROOD;
    }

    if (queenGone && eggsDestroyed && allHumanRecruited) {
        return ACT2_ENDINGS.CLEAN_ESCAPE;
    }

    if (queenGone && eggsAboard && anySurvivorsBoarded) {
        return ACT2_ENDINGS.CARRIERS_BARGAIN;
    }

    if (queenGone && eggsDestroyed && allCulled) {
        return ACT2_ENDINGS.SCORCHED_SKY;
    }

    if (queenAboard && (turned > 0 || recruited > 0 || robbed > 0)) {
        return ACT2_ENDINGS.MIXED_CREW;
    }

    // Fallback: if the vector is valid but narratively messy, use mixed crew.
    return ACT2_ENDINGS.MIXED_CREW;
}
```

Note: The design mentions infection rate for CARRIER'S BARGAIN. The current
state vector does not have a durable infection meter. The first implementation
should use `queenGone + eggsAboard + anySurvivorsBoarded`; a later sprint can
add `infectionLevel` to the vector if we want stricter gating.

### Main.js Departure Hook

Change `runAct2DepartureSequence()` from a fixed `act3-departure` video to:

```js
const ending = pickAct2Ending(act2Manager.getState());
const videoBase = ACT2_ENDING_CUTSCENES[ending] ?? 'ending-mixedcrew';

await dialogueManager?.openBriefTransmission({
    playerType: game?.playerType ?? getSelectedHeroType(),
    lines: getAct2EndingLines(ending, act2Manager.getState())
});

await playCutsceneVideo(videoBase);
await showEndingTeaseCard(ending);
```

`act3-departure` can remain as the generic fallback during development until
the ending videos exist.

## Sprint 5: Video Pipeline

Update `scratch/generate_cave_scenes.js`:

- Keep `cave-reveal`.
- Keep `act3-departure` as a fallback/development scene.
- Add five ending recordings using the same `recordVideo()` helper.
- Use optional source PNGs in `public/`:
  - `ending_fullbrood_ship.png`
  - `ending_cleanescape_cabin.png`
  - `ending_mixedcrew_cabin.png`
  - `ending_carriersbargain_eggs.png`
  - `ending_scorchedsky_cockpit.png`

Update `public/cutscenes/README.md` with the ending asset list.

The runtime already supports absent videos without stalling; `playCutsceneVideo`
resolves if the asset cannot load. That means code can land before all final
video art is done.

## Sprint 6: Runtime Polish, UI Fixes, and Release Hygiene

### Goals

Stabilize the live playtest loop: fix the UI/input freezes, restore the missing
HUD state after resets, tighten the presentation, and make sure generated
artifacts never leak into source control.

### P0: Input, Reset, and State Integrity

- Fix the boss-defeat dialogue close path so clicking `X` always restores input
  and clears any cinematic lock. This should work the same whether the dialogue
  is a boss exit, a mission transmission, or a normal brief.
- Make the current objective HUD resilient across death/respawn and boss
  despawn cases. The display should re-derive from live state instead of staying
  blank after a reset edge case.
- Expand `blackBox` from a single active marker into a small collection of
  recoverable sub-objects so multiple boxes can be visible and tracked from the
  main screen.

### P1: Presentation and Interaction Fixes

- Chroma-key the egg area so the black matte disappears cleanly under the outer
  game overlay.
- Add distance feedback to the yellow radar arrow in the compass UI whenever it
  is in sync with a live target. Only hide the distance when the radar state is
  stale or out of sync.
- Bring the dialogue panels up to the standard HUD scale. The text boxes should
  feel like the rest of the terminal UI instead of a tiny inset panel.
- Make the fabricator reveal deterministic from a single resolved roll so the
  animated visualization, the rarity band, and the granted schematic always
  agree.
- Remove the stray crashed ship prop from the ground scene so only the intended
  fix ship remains.
- Keep the radar dish static when first built, then let the upgrade unlock the
  spinning animation.
- Overscan the class-intro GIF/WebM sequence so the 16:9 frame sits behind the
  outer overlay edge and hides seams.

### P2: Progression and Build System Tuning

- Make every constructed buildable object upgradable, not just the current goal
  chain.
- Add passive ammo refill to the combat loop and expose refill speed as an
  upgradeable stat.
- Rework the skill tree into one interwoven web instead of three separate
  branches. Higher tiers should require a minimum mix of prior nodes, plus
  actual build and upgrade progress, before they unlock.
- Lower the mothership announcement frequency and make the messages more
  legible by using larger type, clearer phrasing, and a stricter cooldown or
  priority budget.

### P3: CI/CD and Scratch Hygiene

- Audit the CI/CD path, especially the Lighthouse and PR workflows, so browser
  profile state does not break the pipeline.
- Clean up the accidentally generated Chrome scratch/profile artifacts. The
  current modified file is `scratch/chrome-profile/Local State`; the plan is to
  keep that kind of generated state out of commits going forward.
- Add or tighten ignore rules for scratch browser outputs and verify the repo
  still passes build and Lighthouse after the cleanup.

### Suggested Execution Order

1. Fix the boss-dialogue/input freeze first so the run remains controllable.
2. Restore the reset/respawn objective HUD and multi-box black box state.
3. Tackle the presentation bugs: eggs, compass distance, dialogue scale, and
   fabricator mismatch.
4. Clean up the world/art regressions: stray crashed ship, radar dish behavior,
   intro overscan, and mothership squawk tuning.
5. Rework the build/progression graph and the ammo regeneration upgrade path.
6. Finish with CI/CD and scratch hygiene, then re-run the full verification
   pass.

## Verification Plan

### Unit Tests

Update `src/act2.test.js`:

1. `normalizeAct2State` migrates old saves:
   - old `{ destroyed: true }` -> `status: 'culled'`.
   - missing `bond` -> `0`.
   - old full-cull save -> `queenObedience === ACT2_MAX_OBEDIENCE`.
2. `deriveAct2Phase` allows `launch_ready` after all camps are aided, even if
   no camps are culled.
3. `stealCamp`, `cullCamp`, `recruitCamp({ mode: 'human' })`, and
   `recruitCamp({ mode: 'turned' })` mutate exactly one camp and save.
4. `pickAct2Ending` returns:
   - FULL BROOD for all culled + queen/eggs aboard + max obedience.
   - CLEAN ESCAPE for all recruited + queen gone + eggs destroyed.
   - MIXED CREW for queen aboard + mixed recruited/turned/robbed state.
   - CARRIER'S BARGAIN for queen gone + eggs aboard + survivors boarded.
   - SCORCHED SKY for all culled + queen gone + eggs destroyed.

### Smoke Tests

Update `scratch/smoke_act2.js`:

- Existing full cull path should now verify `ending-fullbrood` is selected.
- Add seeded localStorage scenarios that skip gameplay and click board:
  - all recruited + queen killed + eggs destroyed -> clean escape.
  - one recruited + one turned + queen aboard -> mixed crew.
  - recruited survivors + queen killed + eggs aboard -> carrier's bargain.
  - all culled + queen killed + eggs destroyed -> scorched sky.

Update `scratch/smoke_camps.js`:

- Keep current support/O2 haven coverage.
- Keep defended cull coverage.
- Add:
  - stealing marks camp robbed and disables barter/recruit.
  - human recruit requires bond.
  - turned recruit requires bond and changes visual status.

### Manual Checks

- Fresh old save: no exceptions, camps show alive with level 0.
- Existing Act 2 save with all destroyed: still reaches FULL BROOD.
- New game reset clears `hb_act2_v1` through `clearSaveData()`.
- Export/import round-trips the new fields because `src/profile.js` snapshots
  all `hb_*` keys.
- Closing a boss-exit dialogue with `X` returns input immediately.
- The yellow compass arrow shows distance while its target is valid.
- The fabricator reveal matches the granted schematic and rarity every time.
- Resetting after a boss death keeps the objective HUD populated.
- Multiple black boxes can remain visible and recoverable from the main screen.
- `npm run lighthouse` still passes after the Chrome scratch cleanup.

### Build/Test Commands

```bash
npm run test -- src/act2.test.js src/camp.test.js
npm run build
npm run lighthouse
```

Optional smoke run:

```bash
npm run dev -- --host 127.0.0.1 --port 5199
node scratch/smoke_camps.js
node scratch/smoke_act2.js 5199
```

## Implementation Order

1. Add state constants, normalizers, reducers, and ending picker in `src/act2.js`.
2. Update `src/act2.test.js` for migration, phase, actions, and endings.
3. Add `SurvivorCamp.setStatus()` in `src/camp.js` and visual mappings for
   robbed/culled/recruited/turned.
4. Refactor `src/threeGame.js` camp interactions:
   - launch available after all aided.
   - optional choices available in `launch_ready`.
   - cull uses `cullCamp()`.
   - steal/recruit/turn call their new reducers.
5. Add camp terminal/choice UI in `index.html`, `style.css`, and `main.js`.
6. Replace fixed `act3-departure` ending with `pickAct2Ending()` and ending
   cutscene base mapping.
7. Extend `scratch/generate_cave_scenes.js` and `public/cutscenes/README.md`.
8. Run unit tests, build, then smoke tests.
9. Work through Sprint 6 in the suggested execution order above.
10. Re-run unit tests, build, smoke tests, and Lighthouse after the
    stabilization pass.

## Design Notes and Risks

- Keep state logic pure and tested. The ending picker should not touch DOM,
  audio, Three.js objects, or localStorage directly.
- Do not remove `destroyed` immediately. It is referenced in `src/threeGame.js`
  and `src/camp.js`; keep it as a compatibility projection until all visuals
  move to `status`.
- The biggest UX decision is how many choices to show at a camp. A modal is
  safer than cycling actions through one prompt because it prevents accidental
  culls.
- The current vessel boarding location is overloaded onto Camp Meridian. A
  later pass should make a dedicated `SurvivorVessel` world object so boarding
  does not compete with camp choices.
- The CARRIER'S BARGAIN infection requirement needs a real saved stat if it is
  meant to be more than flavor. Until then, eggs aboard + queen gone + survivors
  boarded is the cleanest deterministic vector.
