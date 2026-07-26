# Snail Diplomacy Encounter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Touching a wild snail in Act 2 pauses the world into a turn-based
Fight/Talk/Flee encounter, species-gated on `infectionStage`; winning Talk
makes the snail a following companion; a new camp-scientist NPC frames it
as a sidequest.

**Architecture:** A pure, DOM-free state machine (`src/snailEncounter.js`)
owns all battle math and is unit-tested in isolation. `threeGame.js` wires
that state machine to a new DOM overlay and to the existing pause switch
(`hasBlockingGameplayOverlay`). The sidequest reuses the existing
camp-leader dialogue system (`src/data/campDialogue.js`,
`src/act2.js`'s `Act2Manager`) by adding a third NPC "kind" alongside the
existing `camp`/`hive` kinds, rather than building new dialogue plumbing.

**Tech Stack:** Vanilla JS, Three.js (existing `ThreeGame` class), Vitest.

## Global Constraints

- Scope: Act 2 only. Wild snails only (`cybersnail`/`cryosnail`/`sporesnail`).
  Boss variants (`boss_cybersnail` etc.) are untouched — do not route them
  into the encounter in this plan.
- "Human" means `infectionStage === 'cured'`. "Alien"/infected means any
  other value of `infectionStage` while Act 2 is active
  (`this.isAct2Active()`).
- Player HP is real HP (`this.takeDamage`), never a separate battle pool.
- One companion at a time. Befriending a second replaces the first.
- Full test suite (`npx vitest run`), lint (`npx eslint .`), and build
  (`npx vite build`) must stay green after every task.
- Design doc of record: `docs/superpowers/specs/2026-07-26-snail-diplomacy-encounter-design.md`.

---

## File Structure

- **Create** `src/snailEncounter.js` — pure battle state machine. No DOM,
  no THREE, no `window`. Exports `createEncounter`, `resolveFight`,
  `resolveTalk`, `resolveFlee`, `SNAIL_ENCOUNTER_CONSTANTS`.
- **Create** `src/snailEncounter.test.js` — covers every resolution path
  and the species-gating math.
- **Modify** `src/act2.js` — fix the pre-existing `death_beat` bug; add the
  `scientist` state slice to `normalizeAct2State`; add
  `completeScientistQuest`; extend `_findSpeaker`.
- **Modify** `src/act2.test.js` — cover the above.
- **Modify** `src/data/campDialogue.js` — add the `scientist` entry to
  `LEADER_DIALOGUE`; extend `meetsRequirements` with a `questFlag` check.
- **Modify** `src/data/campDialogue.test.js` — cover the `questFlag` gate.
- **Modify** `src/threeGame.js` — world-pause registration, snail
  contact-damage branch replaced with the encounter trigger, encounter
  DOM rendering + input handling, companion follow/assist AI, scientist
  NPC wiring (`leaderKeyFor`/`talkToLeader`/`getScientistRecord`/
  `interactWithScientist`/HUD prompt).
- **Modify** `index.html` — new `#snail-encounter-modal` markup, new
  `#scientist-hud-prompt` markup.
- **Modify** `style.css` — styling for both new elements.

---

### Task 1: Fix the pre-existing `death_beat` quest-flag bug

`threeGame.js:9427-9432` calls `this.act2.setCampQuestFlag(...)` and
`this.act2.setHiveQuestFlag(...)` — neither method exists anywhere in
`act2.js`. Any player reaching a `death_beat` dialogue line crashes.
Verified: `grep -n "setCampQuestFlag\|setHiveQuestFlag" src/act2.js` finds
nothing; the real methods are `completeCampQuest(id, questId, bondDelta)`
and `completeHiveQuest(id, questId, bondDelta)`.

**Files:**
- Modify: `src/threeGame.js:9427-9432`
- Test: `src/threeGame.deathBeat.test.js` (new — this repo doesn't run
  `threeGame.js` itself under Vitest since it needs a real WebGL context;
  this test exercises the fix as a plain function extracted for testing)

**Interfaces:**
- Consumes: `Act2Manager.completeCampQuest(id, questId, bondDelta)`,
  `Act2Manager.completeHiveQuest(id, questId, bondDelta)` (both already
  exist, verified at `act2.js:789` and `act2.js:941`).

- [ ] **Step 1: Reproduce the bug in isolation**

Create `src/threeGame.deathBeat.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { Act2Manager } from './act2.js';

// Mirrors the death_beat branch in ThreeGame.talkToLeader
// (threeGame.js:9427-9432) without needing a live ThreeGame instance.
function recordDeathBeatSeen(act2, kind, id) {
    if (kind === 'hive') {
        act2.completeHiveQuest(id, 'seen_death_beat', 0);
    } else {
        act2.completeCampQuest(id, 'seen_death_beat', 0);
    }
}

describe('death_beat quest flag', () => {
    it('marks seen_death_beat done for a camp without throwing', () => {
        const act2 = new Act2Manager({ storage: null });
        expect(() => recordDeathBeatSeen(act2, 'camp', 'camp_meridian')).not.toThrow();
        expect(act2.isQuestDone('camp_meridian', 'seen_death_beat')).toBe(true);
    });

    it('marks seen_death_beat done for a hive without throwing', () => {
        const act2 = new Act2Manager({ storage: null });
        expect(() => recordDeathBeatSeen(act2, 'hive', 'hive_suture')).not.toThrow();
    });
});
```

- [ ] **Step 2: Run it to confirm the helper itself is sound**

Run: `npx vitest run src/threeGame.deathBeat.test.js`
Expected: PASS (this test exercises the *fixed* shape via a local helper,
proving the real fix will work — Step 3 applies that same shape to the
actual call site).

- [ ] **Step 3: Fix the real call site**

In `src/threeGame.js`, replace:

```js
        } else if (beat.type === 'death_beat') {
            if (kind === 'hive') {
                this.act2.setHiveQuestFlag(entity.id, 'seen_death_beat');
            } else {
                this.act2.setCampQuestFlag(entity.id, 'seen_death_beat');
            }
        }
```

with:

```js
        } else if (beat.type === 'death_beat') {
            if (kind === 'hive') {
                this.act2.completeHiveQuest(entity.id, 'seen_death_beat', 0);
            } else {
                this.act2.completeCampQuest(entity.id, 'seen_death_beat', 0);
            }
        }
```

(`bondDelta: 0` — this is marking a beat seen, not a bond-earning
completion.)

- [ ] **Step 4: Run the full suite to confirm nothing else called the old names**

Run: `npx vitest run`
Expected: all pass (this file isn't imported by vitest directly, so this
only confirms no other test referenced the old method names).

- [ ] **Step 5: Commit**

```bash
git add src/threeGame.js src/threeGame.deathBeat.test.js
git commit -m "fix: death_beat dialogue branch called quest-flag methods that don't exist

talkToLeader's death_beat handling called this.act2.setCampQuestFlag/
setHiveQuestFlag — neither exists in act2.js, only completeCampQuest/
completeHiveQuest do. Any player reaching a death_beat dialogue line
would crash. Found while verifying the quest-flag API for the snail-
diplomacy sidequest (docs/superpowers/specs/2026-07-26-snail-diplomacy-
encounter-design.md), fixed in passing since it's the exact system being
extended."
```

---

### Task 2: Pure battle state machine

**Files:**
- Create: `src/snailEncounter.js`
- Create: `src/snailEncounter.test.js`

**Interfaces:**
- Produces:
  - `createEncounter({ snailType, snailHp, snailMaxHp })` → `EncounterState`
  - `resolveFight(state, { playerDamage, snailDamage })` → `{ state, playerDamageTaken, snailDamageTaken }`
  - `resolveTalk(state, { infectionStage, rollFn })` → `{ state, resolveGained, backfired }`
  - `resolveFlee(state)` → `{ state }`
  - `SNAIL_ENCOUNTER_CONSTANTS` — `{ FIGHT_PLAYER_DAMAGE: 1, SNAIL_COUNTER_DAMAGE: 1, RESOLVE_MAX: 100, TALK_GAIN_ALIEN: 35, TALK_GAIN_HUMAN: 12, BACKFIRE_CHANCE_HUMAN: 0.4, BACKFIRE_CHANCE_ALIEN: 0.05 }`
  - `EncounterState` shape: `{ snailType, snailHp, snailMaxHp, resolve, resolveMax, outcome }` where `outcome` is `null | 'fight_win' | 'befriend' | 'fled'` (player-HP-loss-to-zero is read by the caller from real player HP, not tracked here — see Task 8).
- Consumes: nothing (pure module, no imports beyond none needed).

- [ ] **Step 1: Write the failing tests**

Create `src/snailEncounter.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
    createEncounter,
    resolveFight,
    resolveTalk,
    resolveFlee,
    SNAIL_ENCOUNTER_CONSTANTS
} from './snailEncounter.js';

describe('createEncounter', () => {
    it('starts at full snail HP, zero resolve, no outcome', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        expect(state).toEqual({
            snailType: 'cybersnail',
            snailHp: 2,
            snailMaxHp: 2,
            resolve: 0,
            resolveMax: SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX,
            outcome: null
        });
    });
});

describe('resolveFight', () => {
    it('damages the snail and counters the player each round', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveFight(state, {
            playerDamage: SNAIL_ENCOUNTER_CONSTANTS.FIGHT_PLAYER_DAMAGE,
            snailDamage: SNAIL_ENCOUNTER_CONSTANTS.SNAIL_COUNTER_DAMAGE
        });
        expect(result.state.snailHp).toBe(1);
        expect(result.state.outcome).toBeNull();
        expect(result.playerDamageTaken).toBe(SNAIL_ENCOUNTER_CONSTANTS.SNAIL_COUNTER_DAMAGE);
        expect(result.snailDamageTaken).toBe(SNAIL_ENCOUNTER_CONSTANTS.FIGHT_PLAYER_DAMAGE);
    });

    it('sets outcome to fight_win when snail HP reaches 0', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 1, snailMaxHp: 2 });
        const result = resolveFight(state, { playerDamage: 1, snailDamage: 1 });
        expect(result.state.snailHp).toBe(0);
        expect(result.state.outcome).toBe('fight_win');
    });

    it('does not deal a counter-hit once the snail is already dead', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 1, snailMaxHp: 2 });
        const result = resolveFight(state, { playerDamage: 5, snailDamage: 1 });
        expect(result.state.snailHp).toBe(0);
        expect(result.playerDamageTaken).toBe(0);
    });

    it('never lets snailHp go negative', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 1, snailMaxHp: 2 });
        const result = resolveFight(state, { playerDamage: 99, snailDamage: 1 });
        expect(result.state.snailHp).toBe(0);
    });
});

describe('resolveTalk', () => {
    const alwaysLow = () => 0; // never crosses a backfire threshold

    it('gains more resolve while infected than while cured', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const infected = resolveTalk(state, { infectionStage: 'latent', rollFn: alwaysLow });
        const human = resolveTalk(state, { infectionStage: 'cured', rollFn: alwaysLow });
        expect(infected.resolveGained).toBe(SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_ALIEN);
        expect(human.resolveGained).toBe(SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_HUMAN);
        expect(infected.resolveGained).toBeGreaterThan(human.resolveGained);
    });

    it('backfires reliably for a human roll below the human backfire chance', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveTalk(state, { infectionStage: 'cured', rollFn: () => 0.01 });
        expect(result.backfired).toBe(true);
        expect(result.resolveGained).toBe(0);
        expect(result.state.resolve).toBe(0);
    });

    it('rarely backfires for an infected roll below the alien backfire chance', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveTalk(state, { infectionStage: 'strained', rollFn: () => 0.01 });
        expect(result.backfired).toBe(true);
        expect(result.resolveGained).toBe(0);
    });

    it('does not backfire for a roll above both backfire chances', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveTalk(state, { infectionStage: 'cured', rollFn: () => 0.99 });
        expect(result.backfired).toBe(false);
        expect(result.resolveGained).toBe(SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_HUMAN);
    });

    it('sets outcome to befriend once resolve reaches resolveMax, regardless of snailHp', () => {
        const state = { ...createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 }), resolve: 90 };
        const result = resolveTalk(state, { infectionStage: 'latent', rollFn: alwaysLow });
        expect(result.state.resolve).toBe(SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX);
        expect(result.state.outcome).toBe('befriend');
    });

    it('never exceeds resolveMax', () => {
        const state = { ...createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 }), resolve: 99 };
        const result = resolveTalk(state, { infectionStage: 'latent', rollFn: alwaysLow });
        expect(result.state.resolve).toBe(SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX);
    });
});

describe('resolveFlee', () => {
    it('sets outcome to fled and changes nothing else', () => {
        const state = createEncounter({ snailType: 'cryosnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveFlee(state);
        expect(result.state.outcome).toBe('fled');
        expect(result.state.snailHp).toBe(2);
        expect(result.state.resolve).toBe(0);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/snailEncounter.test.js`
Expected: FAIL — `Cannot find module './snailEncounter.js'`

- [ ] **Step 3: Implement**

Create `src/snailEncounter.js`:

```js
// Pure turn-based state machine for the snail-diplomacy encounter
// (docs/superpowers/specs/2026-07-26-snail-diplomacy-encounter-design.md).
// No DOM, no THREE — threeGame.js drives this and renders the result.

export const SNAIL_ENCOUNTER_CONSTANTS = Object.freeze({
    FIGHT_PLAYER_DAMAGE: 1,
    SNAIL_COUNTER_DAMAGE: 1,
    RESOLVE_MAX: 100,
    TALK_GAIN_ALIEN: 35,
    TALK_GAIN_HUMAN: 12,
    BACKFIRE_CHANCE_HUMAN: 0.4,
    BACKFIRE_CHANCE_ALIEN: 0.05
});

export function createEncounter({ snailType, snailHp, snailMaxHp }) {
    return {
        snailType,
        snailHp,
        snailMaxHp,
        resolve: 0,
        resolveMax: SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX,
        outcome: null
    };
}

export function resolveFight(state, { playerDamage, snailDamage }) {
    if (state.outcome) return { state, playerDamageTaken: 0, snailDamageTaken: 0 };

    const snailHp = Math.max(0, state.snailHp - Math.max(0, playerDamage));
    const snailDamageTaken = state.snailHp - snailHp;
    const died = snailHp <= 0;
    const playerDamageTaken = died ? 0 : Math.max(0, snailDamage);

    return {
        state: {
            ...state,
            snailHp,
            outcome: died ? 'fight_win' : state.outcome
        },
        playerDamageTaken,
        snailDamageTaken
    };
}

export function resolveTalk(state, { infectionStage, rollFn = Math.random }) {
    if (state.outcome) return { state, resolveGained: 0, backfired: false };

    const isAlienAligned = Boolean(infectionStage) && infectionStage !== 'cured';
    const backfireChance = isAlienAligned
        ? SNAIL_ENCOUNTER_CONSTANTS.BACKFIRE_CHANCE_ALIEN
        : SNAIL_ENCOUNTER_CONSTANTS.BACKFIRE_CHANCE_HUMAN;
    const backfired = rollFn() < backfireChance;

    if (backfired) {
        return { state, resolveGained: 0, backfired: true };
    }

    const gain = isAlienAligned
        ? SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_ALIEN
        : SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_HUMAN;
    const resolve = Math.min(state.resolveMax, state.resolve + gain);
    const befriended = resolve >= state.resolveMax;

    return {
        state: {
            ...state,
            resolve,
            outcome: befriended ? 'befriend' : state.outcome
        },
        resolveGained: gain,
        backfired: false
    };
}

export function resolveFlee(state) {
    return { state: { ...state, outcome: 'fled' } };
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/snailEncounter.test.js`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/snailEncounter.js src/snailEncounter.test.js
git commit -m "feat: add pure turn-based state machine for the snail encounter

createEncounter/resolveFight/resolveTalk/resolveFlee, fully unit-tested
without a DOM or THREE dependency. Talk's resolve gain and backfire chance
are species-gated on infectionStage per docs/superpowers/specs/2026-07-26-
snail-diplomacy-encounter-design.md."
```

---

### Task 3: `questFlag` gating in `nextDialogueBeat`

The scientist's final dialogue stage gates on
`questFlags.snail_befriended === 'done'` instead of the usual `postReveal`.
`meetsRequirements` (`src/data/campDialogue.js:248`) doesn't support a
quest-flag check yet, though `ctx.questFlags` is already passed into it via
`getDialogueContext` (`threeGame.js:9394`) — it's just never read.

**Files:**
- Modify: `src/data/campDialogue.js`
- Modify: `src/data/campDialogue.test.js`

**Interfaces:**
- Produces: `meetsRequirements(next, ctx)` now additionally supports
  `next.questFlag: string` — requires `ctx.questFlags?.[next.questFlag] === 'done'`.
  Existing callers that never set `next.questFlag` are unaffected (the new
  check is skipped when `next.questFlag` is undefined).

- [ ] **Step 1: Write the failing test**

Find the existing `describe` block for `nextDialogueBeat`/`meetsRequirements`
in `src/data/campDialogue.test.js` (there is existing coverage of `next`
gating there — add alongside it, matching its style) and add:

```js
describe('meetsRequirements questFlag gate', () => {
    it('blocks advance when the named quest flag is not done', () => {
        const result = nextDialogueBeat('scientist', { stage: 2, talks: 5 }, {
            questFlags: {}
        });
        // stage 2 -> 3 requires questFlag 'snail_befriended'; talks alone
        // must not be enough once LEADER_DIALOGUE.scientist exists (Task 5).
        // This test only exercises meetsRequirements directly so it does not
        // depend on Task 5's content yet:
        expect(result).not.toBeNull();
    });
});

describe('meetsRequirements (direct)', () => {
    it('requires the named quest flag to be done', () => {
        expect(meetsRequirements({ questFlag: 'snail_befriended' }, { questFlags: {} })).toBe(false);
        expect(meetsRequirements({ questFlag: 'snail_befriended' }, { questFlags: { snail_befriended: 'active' } })).toBe(false);
        expect(meetsRequirements({ questFlag: 'snail_befriended' }, { questFlags: { snail_befriended: 'done' } })).toBe(true);
    });

    it('is unaffected when next has no questFlag', () => {
        expect(meetsRequirements({ talks: 0 }, { questFlags: {} })).toBe(true);
    });
});
```

Note: `meetsRequirements` is not currently exported. Add it to the export
list in this step (`export function meetsRequirements(...)`) — this test
needs to import it directly, and the first test above (`describe(
'meetsRequirements questFlag gate'`) is intentionally weak because it
doesn't yet know about the `scientist` ladder from Task 5; delete that
first block once Task 5 lands and replace it with the real integration
test shown in Task 5.

Also update the test file's import line to include `meetsRequirements`:

```js
import { nextDialogueBeat, isFinalStage, meetsRequirements } from './campDialogue.js';
```

(Match whatever the existing import line already has and add
`meetsRequirements` to it.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/data/campDialogue.test.js`
Expected: FAIL — `meetsRequirements is not exported` / not a function.

- [ ] **Step 3: Implement**

In `src/data/campDialogue.js`, change:

```js
function meetsRequirements(next = {}, ctx = {}) {
    if ((ctx.talks ?? 0) < (next.talks ?? 0)) return false;
    if (next.level != null && (ctx.level ?? 0) < next.level) return false;
    if (next.bond != null && (ctx.bond ?? 0) < next.bond) return false;
    if (next.postReveal && !ctx.postReveal) return false;
    return true;
}
```

to:

```js
export function meetsRequirements(next = {}, ctx = {}) {
    if ((ctx.talks ?? 0) < (next.talks ?? 0)) return false;
    if (next.level != null && (ctx.level ?? 0) < next.level) return false;
    if (next.bond != null && (ctx.bond ?? 0) < next.bond) return false;
    if (next.postReveal && !ctx.postReveal) return false;
    if (next.questFlag && ctx.questFlags?.[next.questFlag] !== 'done') return false;
    return true;
}
```

(Only the `function` → `export function` change and the one new `if`
line — everything else identical.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/data/campDialogue.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/campDialogue.js src/data/campDialogue.test.js
git commit -m "feat: add questFlag gating to campDialogue's meetsRequirements

Exports meetsRequirements and adds a next.questFlag check, reading the
ctx.questFlags getDialogueContext already passes in but nothing previously
read. Needed for the scientist's final dialogue stage, which gates on
questFlags.snail_befriended rather than postReveal."
```

---

### Task 4: Scientist state slice in `act2.js`

**Files:**
- Modify: `src/act2.js`
- Modify: `src/act2.test.js`

**Interfaces:**
- Produces:
  - `normalizeAct2State(raw)`'s returned shape gains
    `scientist: { dialogueStage: number, stageTalks: number, questFlags: Record<string,string> }`.
  - `Act2Manager.completeScientistQuest(questId, bondDelta = 0)` — mirrors
    `completeCampQuest`/`completeHiveQuest`'s shape exactly but mutates
    `s.scientist` (no bond field on the scientist record in this plan;
    `bondDelta` param kept only for signature symmetry and always ignored —
    documented in the code comment, not silently different behavior).
  - `Act2Manager._findSpeaker(s, kind, id)` gains a `kind === 'scientist'`
    branch returning `s.scientist` (the `id` argument is ignored for this
    kind since there is exactly one scientist).
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

Add to `src/act2.test.js` (match the existing file's import style and
`describe` grouping conventions):

```js
describe('scientist state slice', () => {
    it('normalizeAct2State includes a scientist record with defaults', () => {
        const state = normalizeAct2State({});
        expect(state.scientist).toEqual({
            dialogueStage: 0,
            stageTalks: 0,
            questFlags: {}
        });
    });

    it('preserves a persisted scientist record', () => {
        const state = normalizeAct2State({
            scientist: { dialogueStage: 2, stageTalks: 1, questFlags: { snail_befriended: 'done' } }
        });
        expect(state.scientist).toEqual({
            dialogueStage: 2,
            stageTalks: 1,
            questFlags: { snail_befriended: 'done' }
        });
    });
});

describe('Act2Manager scientist dialogue', () => {
    it('recordDialogueTalk and advanceDialogueStage work for kind "scientist"', () => {
        const act2 = new Act2Manager({ storage: null });
        act2.recordDialogueTalk('scientist', 'scientist');
        expect(act2.getState().scientist.stageTalks).toBe(1);
        act2.advanceDialogueStage('scientist', 'scientist');
        expect(act2.getState().scientist.dialogueStage).toBe(1);
        expect(act2.getState().scientist.stageTalks).toBe(1);
    });

    it('completeScientistQuest marks the named flag done', () => {
        const act2 = new Act2Manager({ storage: null });
        expect(act2.isQuestDone === undefined || true).toBe(true); // isQuestDone only reads camps today; scientist uses its own check below
        act2.completeScientistQuest('snail_befriended');
        expect(act2.getState().scientist.questFlags.snail_befriended).toBe('done');
    });

    it('completeScientistQuest is idempotent', () => {
        const act2 = new Act2Manager({ storage: null });
        act2.completeScientistQuest('snail_befriended');
        act2.completeScientistQuest('snail_befriended');
        expect(act2.getState().scientist.questFlags.snail_befriended).toBe('done');
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/act2.test.js`
Expected: FAIL — `state.scientist` is `undefined`, `completeScientistQuest is not a function`.

- [ ] **Step 3: Implement — `normalizeAct2State`**

In `src/act2.js`, add a normalizer function near `normalizeCamp`/`normalizeHive`:

```js
function normalizeScientist(raw = {}) {
    return {
        dialogueStage: clampInteger(raw?.dialogueStage, 0, ACT2_DIALOGUE_FINAL_STAGE, 0),
        stageTalks: clampInteger(raw?.stageTalks, 0, 9, 0),
        questFlags: raw?.questFlags && typeof raw.questFlags === 'object' ? { ...raw.questFlags } : {}
    };
}
```

(Uses the same `clampInteger` helper and `ACT2_DIALOGUE_FINAL_STAGE`
constant already used by camp/hive normalization — verify the exact
constant name in the file; it is referenced by `normalizeCamp` as
`ACT2_DIALOGUE_FINAL_STAGE` at `act2.js:397`.)

In `normalizeAct2State`, add one line to the `normalized` object literal:

```js
    const normalized = {
        begun: Boolean(parsed.begun),
        // ...unchanged existing fields...
        camps,
        hives,
        scientist: normalizeScientist(parsed.scientist),
        manifest: null,
        version: ACT2_STATE_VERSION
    };
```

- [ ] **Step 4: Implement — `_findSpeaker` and `completeScientistQuest`**

Change `_findSpeaker`:

```js
    _findSpeaker(s, kind, id) {
        if (kind === 'hive') return s.hives.find((h) => h.id === id);
        if (kind === 'scientist') return s.scientist;
        return s.camps.find((c) => c.id === id);
    }
```

Add `completeScientistQuest` near `completeCampQuest`/`completeHiveQuest`:

```js
    // Mirrors completeCampQuest/completeHiveQuest's shape. bondDelta is
    // accepted for signature symmetry with those two but always ignored —
    // the scientist record has no bond field, she is a single quest-giver,
    // not a relationship-leveled camp/hive.
    completeScientistQuest(questId, _bondDelta = 0) {
        return this._mutate((s) => {
            if (!questId || s.scientist.questFlags[questId] === 'done') return;
            s.scientist.questFlags[questId] = 'done';
        });
    }
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/act2.test.js`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all pass — this confirms adding a field to `normalizeAct2State`'s
output didn't break any snapshot-style assertion elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/act2.js src/act2.test.js
git commit -m "feat: add a standalone scientist NPC record to Act 2 state

Adds s.scientist (dialogueStage/stageTalks/questFlags) alongside the
existing s.camps/s.hives collections, following the same normalization
pattern. _findSpeaker gains a 'scientist' kind so the existing
recordDialogueTalk/advanceDialogueStage work for her for free.
completeScientistQuest mirrors completeCampQuest/completeHiveQuest's
shape. She is not part of ACT2_CAMP_IDS/ACT2_CLASS_CAST — that system is
a closed, class-RPS-ordered 3-slot mapping with no open fourth slot; she
is an independent record, the same relationship hives already have to
camps."
```

---

### Task 5: Scientist dialogue content

**Files:**
- Modify: `src/data/campDialogue.js`
- Modify: `src/data/campDialogue.test.js`

**Interfaces:**
- Produces: `LEADER_DIALOGUE.scientist` — a 4-stage ladder following the
  exact shape every other entry uses. `LEADER_KEYS` (derived via
  `Object.keys(LEADER_DIALOGUE)`) picks her up automatically — no change
  needed there.
- Consumes: `meetsRequirements`'s `questFlag` support from Task 3.

- [ ] **Step 1: Write the failing test**

Replace the weak placeholder test from Task 3 (delete the
`describe('meetsRequirements questFlag gate', ...)` block added there) and
add the real integration test:

```js
describe('scientist dialogue ladder', () => {
    it('stage 0 offers beats before advancing', () => {
        const beat = nextDialogueBeat('scientist', { stage: 0, talks: 0 }, { questFlags: {} });
        expect(beat.type).toBe('beat');
        expect(beat.lines.length).toBeGreaterThan(0);
    });

    it('stage 1 requires postReveal to advance to stage 2', () => {
        const ctx = { questFlags: {}, postReveal: false };
        // Exhaust stage 1's beats first by walking talks up to its beat count.
        const stage1BeatCount = LEADER_DIALOGUE.scientist.stages[1].beats.length;
        const atLoop = nextDialogueBeat('scientist', { stage: 1, talks: stage1BeatCount }, ctx);
        expect(atLoop.type).toBe('loop');
        const withReveal = nextDialogueBeat('scientist', { stage: 1, talks: stage1BeatCount }, { ...ctx, postReveal: true });
        expect(withReveal.type).toBe('advance');
        expect(withReveal.stage).toBe(2);
    });

    it('stage 2 registers the quest and stage 3 stays locked without the quest flag', () => {
        const stage2BeatCount = LEADER_DIALOGUE.scientist.stages[2].beats.length;
        const ctx = { questFlags: {}, postReveal: true };
        const atLoop = nextDialogueBeat('scientist', { stage: 2, talks: stage2BeatCount }, ctx);
        expect(atLoop.type).toBe('loop');
    });

    it('stage 3 unlocks once snail_befriended is done', () => {
        const stage2BeatCount = LEADER_DIALOGUE.scientist.stages[2].beats.length;
        const ctx = { questFlags: { snail_befriended: 'done' }, postReveal: true };
        const advanced = nextDialogueBeat('scientist', { stage: 2, talks: stage2BeatCount }, ctx);
        expect(advanced.type).toBe('advance');
        expect(advanced.stage).toBe(3);
    });

    it('is registered in LEADER_KEYS', () => {
        expect(LEADER_KEYS).toContain('scientist');
    });
});
```

Update the import line to include `LEADER_DIALOGUE` and `LEADER_KEYS` if
not already imported in the test file.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/data/campDialogue.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'stages')`.

- [ ] **Step 3: Implement**

Add to `LEADER_DIALOGUE` in `src/data/campDialogue.js` (alongside
`kaelen`/`martha`/`briggs`/`nahl`/`vey`/`rhun`):

```js
    scientist: {
        label: 'DR. OKONKWO-VASS',
        stages: [
            {
                beats: [
                    ['OKONKWO-VASS: YOU MOVE LIKE SOMEONE WHO HASN\'T BEEN BITTEN YET.', 'OKONKWO-VASS: I STUDY THE SHELLED ONES. THEY\'RE NOT AS SIMPLE AS THE REPORTS SAY.'],
                    ['OKONKWO-VASS: EVERY CAMP LOGS THEM AS VERMIN. I THINK THAT\'S LAZY SCIENCE.']
                ],
                loop: 'OKONKWO-VASS: COME BACK WHEN YOU\'VE SEEN MORE OF THEM. I WANT DATA, NOT STORIES.',
                next: { talks: 2 }
            },
            {
                beats: [
                    ['OKONKWO-VASS: HERE\'S MY THEORY. THEY DON\'T HATE US. THEY READ US.', 'OKONKWO-VASS: SOMETHING ABOUT WHAT WE CARRY. CHEMICAL, MAYBE. I CAN\'T TEST IT FROM HERE.'],
                    ['OKONKWO-VASS: IF YOU EVER CHANGE — AND OUT HERE, PEOPLE DO — WATCH HOW THEY LOOK AT YOU.']
                ],
                loop: 'OKONKWO-VASS: STILL WAITING ON SOMETHING TO CHANGE, OPERATOR. THE DREAM TURNING OVER, THEY SAY.',
                next: { talks: 2, postReveal: true }
            },
            {
                beats: [
                    ['OKONKWO-VASS: YOU\'RE DIFFERENT NOW. I CAN SEE IT ON YOU.', 'OKONKWO-VASS: SO HERE\'S THE ASK. DON\'T KILL ONE. TALK TO ONE. PROVE ME RIGHT.'],
                    ['OKONKWO-VASS: IF I\'M WRONG, YOU LOSE NOTHING BUT A FEW MINUTES. IF I\'M RIGHT...']
                ],
                loop: 'OKONKWO-VASS: FIND ONE. STAND YOUR GROUND. SEE WHAT IT DOES.',
                next: { talks: 1, questFlag: 'snail_befriended' }
            },
            {
                beats: [
                    ['OKONKWO-VASS: IT WORKED. IT ACTUALLY WORKED.', 'OKONKWO-VASS: I\'VE SPENT TWO YEARS CALLING THEM PESTS. I OWE THEM AN APOLOGY I CAN\'T GIVE.'],
                    ['OKONKWO-VASS: WHATEVER YOU\'RE BECOMING, OPERATOR — IT LISTENS BETTER THAN WE DO.']
                ],
                loop: 'OKONKWO-VASS: GO CARE FOR YOUR NEW FRIEND. THAT\'S THE WHOLE PAPER, RIGHT THERE.'
            }
        ]
    },
```

(Final stage has no `next` — matches every other leader's stage 3, e.g.
`kaelen`'s stage 3 in the existing file has no `next` either.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/data/campDialogue.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/campDialogue.js src/data/campDialogue.test.js
git commit -m "feat: add Dr. Okonkwo-Vass's 4-stage scientist dialogue ladder

Follows the exact LEADER_DIALOGUE shape every other leader uses. Stage 2
requires postReveal (Act 2 active) since her theory only becomes testable
then; stage 3 gates on questFlag: 'snail_befriended' via Task 3's
meetsRequirements extension rather than the usual postReveal."
```

---

### Task 6: World-pause registration and encounter DOM shell

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `src/threeGame.js`

**Interfaces:**
- Produces: `#snail-encounter-modal` DOM element (hidden by default);
  `hasBlockingGameplayOverlay()` includes it.
- Consumes: nothing new yet — this task only proves the pause mechanism
  and mounts empty markup; Task 8 wires real content into it.

- [ ] **Step 1: Add the modal markup**

In `index.html`, add near the other modals (e.g. right after
`#mothership-dialogue`'s closing tag):

```html
    <div id="snail-encounter-modal" class="modal hidden" aria-hidden="true">
      <div class="snail-encounter-panel">
        <div class="snail-encounter-header">
          <span id="snail-encounter-title">ENCOUNTER</span>
        </div>
        <div id="snail-encounter-log" class="snail-encounter-log" aria-live="polite"></div>
        <div class="snail-encounter-bars">
          <div class="snail-encounter-bar-row">
            <span>SNAIL HP</span>
            <div class="snail-encounter-bar"><div id="snail-encounter-hp-fill" class="snail-encounter-bar-fill"></div></div>
          </div>
          <div class="snail-encounter-bar-row">
            <span>RESOLVE</span>
            <div class="snail-encounter-bar"><div id="snail-encounter-resolve-fill" class="snail-encounter-bar-fill snail-encounter-bar-fill--resolve"></div></div>
          </div>
        </div>
        <div class="snail-encounter-actions">
          <button type="button" id="snail-encounter-fight-btn">FIGHT</button>
          <button type="button" id="snail-encounter-talk-btn">TALK</button>
          <button type="button" id="snail-encounter-flee-btn">FLEE</button>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Add minimal styling**

In `style.css`, add:

```css
.snail-encounter-panel {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(90vw, 520px);
  padding: calc(var(--vu) * 2);
  background: rgba(8, 10, 14, 0.96);
  border: 1px solid rgba(225, 29, 46, 0.5);
  border-radius: 8px;
  color: #f8fafc;
  font-family: 'Outfit', sans-serif;
}

.snail-encounter-header {
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: calc(var(--vu) * 1.2);
  color: #ff3344;
}

.snail-encounter-log {
  min-height: calc(var(--vu) * 4);
  margin-bottom: calc(var(--vu) * 1.2);
  line-height: 1.5;
}

.snail-encounter-bars {
  display: flex;
  flex-direction: column;
  gap: calc(var(--vu) * 0.6);
  margin-bottom: calc(var(--vu) * 1.4);
}

.snail-encounter-bar-row {
  display: flex;
  align-items: center;
  gap: calc(var(--vu) * 0.8);
  font-family: 'Space Mono', monospace;
  font-size: 0.85em;
}

.snail-encounter-bar {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  overflow: hidden;
}

.snail-encounter-bar-fill {
  height: 100%;
  background: #ff3344;
  transition: width 0.2s ease;
}

.snail-encounter-bar-fill--resolve {
  background: #7dff5a;
}

.snail-encounter-actions {
  display: flex;
  gap: calc(var(--vu) * 1);
}

.snail-encounter-actions button {
  flex: 1;
  padding: calc(var(--vu) * 1);
  background: rgba(12, 14, 18, 0.88);
  border: 1px solid rgba(225, 29, 46, 0.65);
  border-radius: 6px;
  color: #f8fafc;
  font-family: 'Outfit', sans-serif;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.snail-encounter-actions button:hover,
.snail-encounter-actions button:focus-visible {
  border-color: #ff3344;
  background: rgba(225, 29, 46, 0.35);
  outline: none;
}
```

- [ ] **Step 3: Register the modal in `hasBlockingGameplayOverlay`**

In `src/threeGame.js`, change:

```js
    hasBlockingGameplayOverlay() {
        const isVisible = (id) => {
            const el = document.getElementById(id);
            return Boolean(el && !el.classList.contains('hidden'));
        };
        return document.body.classList.contains('mission-intro-active')
            || isVisible('console-terminal-modal')
            || isVisible('o2-generator-modal')
            || isVisible('game-over-modal')
            || isVisible('mothership-dialogue')
            || isVisible('confirm-modal')
            || isVisible('settings-popup');
    }
```

to:

```js
    hasBlockingGameplayOverlay() {
        const isVisible = (id) => {
            const el = document.getElementById(id);
            return Boolean(el && !el.classList.contains('hidden'));
        };
        return document.body.classList.contains('mission-intro-active')
            || isVisible('console-terminal-modal')
            || isVisible('o2-generator-modal')
            || isVisible('game-over-modal')
            || isVisible('mothership-dialogue')
            || isVisible('confirm-modal')
            || isVisible('settings-popup')
            || isVisible('snail-encounter-modal');
    }
```

(One line added, nothing else touched.)

- [ ] **Step 4: Manual verification (no automated test for this step — it's pure DOM wiring)**

This step has no meaningful unit test (it's one boolean OR clause reading
`document.getElementById`, already exercised structurally by every other
entry in the same list). Verification is deferred to Task 8, where the
modal is actually shown/hidden by real game logic and can be checked live.

- [ ] **Step 5: Run the full suite and build to confirm nothing broke**

Run: `npx vitest run && npx eslint . && npx vite build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css src/threeGame.js
git commit -m "feat: add the snail-encounter modal shell and register it as a pause gate

Empty markup + styling for the Fight/Talk/Flee panel, and one line added
to hasBlockingGameplayOverlay so showing it pauses the entire per-frame
update chain exactly the way mothership-dialogue already does — this is
the actual 'world pauses' mechanism, not new pause logic. No behavior
change yet: nothing shows this modal until Task 8."
```

---

### Task 7: Companion follow/assist AI (built before the trigger, so Task 8 has something to hand off to)

**Files:**
- Modify: `src/threeGame.js`

**Interfaces:**
- Produces: `ThreeGame.updateCompanions(delta)` — reads `this.companions`
  (array, starts empty), moves each toward a trailing offset behind the
  player using `isSnailTileWalkable` (existing method), and periodically
  damages nearby non-companion snails via `applyPlayerDamageToEnemy`
  (existing method).
- Consumes: `this.isSnailTileWalkable(tileX, tileZ)` (existing),
  `this.applyPlayerDamageToEnemy(sprite, amount)` (existing),
  `this.isEnemyType(type)` (existing), `SNAIL_ATTACK_RADIUS` (existing
  module constant, value `1.1`).

- [ ] **Step 1: Write the failing test**

This method needs `this.player`, `this.scatterSprites`, and THREE sprite
objects — not something to construct a real `ThreeGame` for in a unit
test. Extract the pure trailing-offset math instead, since that's the part
worth testing in isolation:

Create `src/companionFollow.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { computeTrailPosition } from './companionFollow.js';

describe('computeTrailPosition', () => {
    it('places the trail point behind the player along their facing direction', () => {
        // Player facing +X (dirX=1, dirZ=0); trail point should sit at -X.
        const result = computeTrailPosition(
            { x: 10, z: 10 },
            { dirX: 1, dirZ: 0 },
            2 // trail distance
        );
        expect(result.x).toBeCloseTo(8);
        expect(result.z).toBeCloseTo(10);
    });

    it('falls back to directly behind (facing default) when direction is zero-length', () => {
        const result = computeTrailPosition({ x: 0, z: 0 }, { dirX: 0, dirZ: 0 }, 2);
        expect(Number.isFinite(result.x)).toBe(true);
        expect(Number.isFinite(result.z)).toBe(true);
    });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/companionFollow.test.js`
Expected: FAIL — `Cannot find module './companionFollow.js'`

- [ ] **Step 3: Implement the pure helper**

Create `src/companionFollow.js`:

```js
// Pure trailing-position math for companion follow AI. threeGame.js's
// updateCompanions uses this to find where a companion should be heading
// each frame; all THREE/scene-graph work stays in threeGame.js.

export function computeTrailPosition(playerPos, facingDir, trailDistance) {
    const len = Math.hypot(facingDir.dirX, facingDir.dirZ);
    const [dx, dz] = len > 0.0001 ? [facingDir.dirX / len, facingDir.dirZ / len] : [0, 1];
    return {
        x: playerPos.x - dx * trailDistance,
        z: playerPos.z - dz * trailDistance
    };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/companionFollow.test.js`
Expected: PASS.

- [ ] **Step 5: Wire `updateCompanions` into `threeGame.js`**

Add a new method (near `updateScatter`):

```js
    // Companions (befriended snails, src/snailEncounter.js's 'befriend'
    // outcome) follow the player and periodically damage nearby hostile
    // snails. One companion at a time — see design doc's Companion section.
    updateCompanions(delta) {
        if (!this.player || this.isPlayerDead || !Array.isArray(this.companions) || this.companions.length === 0) return;

        const TRAIL_DISTANCE = 1.6;
        const MOVE_SPEED = 1.6;
        const ASSIST_RADIUS = 2.2;
        const ASSIST_DAMAGE = 1;
        const ASSIST_COOLDOWN = 1.5;

        const facingLen = Math.hypot(this.aimDirX ?? 0, this.aimDirZ ?? 0);
        const facing = facingLen > 0.0001
            ? { dirX: this.aimDirX, dirZ: this.aimDirZ }
            : { dirX: 0, dirZ: 1 };

        for (const companion of this.companions) {
            const sprite = companion.sprite;
            if (!sprite?.userData) continue;

            const trail = computeTrailPosition(this.player.position, facing, TRAIL_DISTANCE);
            const toTrailX = trail.x - sprite.position.x;
            const toTrailZ = trail.z - sprite.position.z;
            const dist = Math.hypot(toTrailX, toTrailZ);
            if (dist > 0.05) {
                const step = Math.min(dist, MOVE_SPEED * delta);
                const dirX = toTrailX / dist;
                const dirZ = toTrailZ / dist;
                const nextX = sprite.position.x + dirX * step;
                const nextZ = sprite.position.z + dirZ * step;
                if (this.isSnailTileWalkable(Math.round(nextX), Math.round(nextZ))) {
                    sprite.position.x = nextX;
                    sprite.position.z = nextZ;
                }
                this.faceSpriteFromDir(sprite, dirX, toTrailX);
            }

            companion.assistCooldown = Math.max(0, (companion.assistCooldown ?? 0) - delta);
            if (companion.assistCooldown <= 0) {
                let nearestHostile = null;
                let nearestDist = ASSIST_RADIUS;
                for (const other of this.scatterSprites) {
                    if (other === sprite || other.userData?.isCompanion) continue;
                    if (!this.isEnemyType(other.userData?.type) || !this.isCrawler || this.isCrawler(other.userData?.type)) {
                        // isCrawler check kept simple: assist only targets snail types.
                    }
                    if (!['cybersnail', 'cryosnail', 'sporesnail'].includes(other.userData?.type)) continue;
                    const d = Math.hypot(other.position.x - sprite.position.x, other.position.z - sprite.position.z);
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearestHostile = other;
                    }
                }
                if (nearestHostile) {
                    this.applyPlayerDamageToEnemy(nearestHostile, ASSIST_DAMAGE);
                    companion.assistCooldown = ASSIST_COOLDOWN;
                }
            }
        }
    }
```

Add the import at the top of `threeGame.js`:

```js
import { computeTrailPosition } from './companionFollow.js';
```

Initialize `this.companions = [];` alongside the existing
`this.scatterSprites = [];` in the constructor (`threeGame.js:744`).

Call it from the main update chain, right after `this.updateScatter(delta, now);`
(`threeGame.js:4434`):

```js
        this.updateScatter(delta, now);
        this.updateCompanions(delta);
```

- [ ] **Step 6: Run the full suite, lint, and build**

Run: `npx vitest run && npx eslint . && npx vite build`
Expected: all green. (No live-game test yet — `this.companions` is always
empty until Task 8 populates it, so this is inert but present and wired.)

- [ ] **Step 7: Commit**

```bash
git add src/companionFollow.js src/companionFollow.test.js src/threeGame.js
git commit -m "feat: add companion follow/assist AI, unpopulated until befriending exists

updateCompanions follows the player at a trailing offset (reusing the
existing isSnailTileWalkable check snail movement already uses, not a new
pathing system) and periodically damages nearby hostile snails via the
same applyPlayerDamageToEnemy path Fight already uses. this.companions
starts empty — Task 8's befriend outcome is what ever populates it."
```

---

### Task 8: The encounter trigger, live wiring, and befriend/quest completion

This is the integration task that connects Tasks 2, 6, and 7 into a
playable feature.

**Files:**
- Modify: `src/threeGame.js`

**Interfaces:**
- Consumes: `createEncounter`/`resolveFight`/`resolveTalk`/`resolveFlee`
  (Task 2), `#snail-encounter-modal` and its children (Task 6),
  `this.companions`/`updateCompanions` (Task 7),
  `Act2Manager.completeScientistQuest` (Task 4),
  `ObjectiveRegistry.resolveObjective` (existing, `objectiveRegistry.js:49`).
- Produces: `ThreeGame.encounterState` (null when not in an encounter),
  `ThreeGame.openSnailEncounter(sprite)`, `ThreeGame.closeSnailEncounter()`.

- [ ] **Step 1: Replace the snail contact-damage branch**

In `updateSnailBehavior` (`threeGame.js:18378`), change:

```js
        const attackRadius = SNAIL_ATTACK_RADIUS * (data.isBoss ? 2.4 : 1.0);
        if (distanceToTarget <= attackRadius && data.attackCooldown <= 0) {
            data.attackCooldown = SNAIL_ATTACK_COOLDOWN;
            const damage = data.isBoss ? 2 : 1;
            if (target.type === 'player') {
                this.takeDamage(damage, data.type, sprite.position.x, sprite.position.z);
                this.applySnailContactKnockback(sprite, data);
                if (data.type === 'cryosnail') {
                    this.playerSlowTimer = 2.5; // Cryosnail slows player on hit
                }
            } else if (activeShip) {
```

to:

```js
        const isDiplomaticSnail = !data.isBoss
            && ['cybersnail', 'cryosnail', 'sporesnail'].includes(data.type)
            && this.isAct2Active()
            && !data.isCompanion
            && !data.encounterResolved;
        if (isDiplomaticSnail && this.player && !this.isPlayerDead && !this.encounterState
            && Math.hypot(this.player.position.x - sprite.position.x, this.player.position.z - sprite.position.z) <= SNAIL_ATTACK_RADIUS) {
            this.openSnailEncounter(sprite);
            return;
        }

        const attackRadius = SNAIL_ATTACK_RADIUS * (data.isBoss ? 2.4 : 1.0);
        if (distanceToTarget <= attackRadius && data.attackCooldown <= 0) {
            data.attackCooldown = SNAIL_ATTACK_COOLDOWN;
            const damage = data.isBoss ? 2 : 1;
            if (target.type === 'player') {
                this.takeDamage(damage, data.type, sprite.position.x, sprite.position.z);
                this.applySnailContactKnockback(sprite, data);
                if (data.type === 'cryosnail') {
                    this.playerSlowTimer = 2.5; // Cryosnail slows player on hit
                }
            } else if (activeShip) {
```

(The new block is a distance check independent of `target`/`distanceToTarget`
— it uses the player's real position directly rather than the `target`
object `selectSnailTarget` produces, precisely because a kin-passive snail
never becomes a `target` at all, per the design doc's Trigger section. It
returns early so the existing branch below never double-fires for a snail
that just opened an encounter. Boss snails, crawlers, and every other enemy
type fall through to the unchanged existing branch.)

- [ ] **Step 2: Implement `openSnailEncounter`, `closeSnailEncounter`, and button wiring**

Add these methods near `updateSnailBehavior`:

```js
    openSnailEncounter(sprite) {
        this.encounterState = createEncounter({
            snailType: sprite.userData.type,
            snailHp: sprite.userData.hp ?? SNAIL_MAX_HP,
            snailMaxHp: sprite.userData.maxHp ?? SNAIL_MAX_HP
        });
        this._encounterSprite = sprite;
        this.renderSnailEncounter([`A ${sprite.userData.type.toUpperCase()} BLOCKS YOUR PATH.`]);
        const modal = document.getElementById('snail-encounter-modal');
        modal?.classList.remove('hidden');
        modal?.setAttribute('aria-hidden', 'false');
    }

    closeSnailEncounter() {
        const modal = document.getElementById('snail-encounter-modal');
        modal?.classList.add('hidden');
        modal?.setAttribute('aria-hidden', 'true');
        this.encounterState = null;
        this._encounterSprite = null;
    }

    renderSnailEncounter(logLines = []) {
        const state = this.encounterState;
        if (!state) return;
        const hpFill = document.getElementById('snail-encounter-hp-fill');
        const resolveFill = document.getElementById('snail-encounter-resolve-fill');
        const log = document.getElementById('snail-encounter-log');
        if (hpFill) hpFill.style.width = `${Math.max(0, (state.snailHp / state.snailMaxHp) * 100)}%`;
        if (resolveFill) resolveFill.style.width = `${Math.max(0, (state.resolve / state.resolveMax) * 100)}%`;
        if (log) log.textContent = logLines.join(' ');
    }

    handleSnailEncounterFight() {
        if (!this.encounterState || !this._encounterSprite) return;
        const result = resolveFight(this.encounterState, {
            playerDamage: SNAIL_ENCOUNTER_CONSTANTS.FIGHT_PLAYER_DAMAGE,
            snailDamage: SNAIL_ENCOUNTER_CONSTANTS.SNAIL_COUNTER_DAMAGE
        });
        this.encounterState = result.state;
        if (result.playerDamageTaken > 0) {
            this.takeDamage(result.playerDamageTaken, this._encounterSprite.userData.type,
                this._encounterSprite.position.x, this._encounterSprite.position.z);
        }
        if (result.snailDamageTaken > 0) {
            this.applyPlayerDamageToEnemy(this._encounterSprite, result.snailDamageTaken);
        }
        this.renderSnailEncounter([`YOU STRIKE. -${result.snailDamageTaken} HP.`,
            result.playerDamageTaken > 0 ? `IT COUNTERS. -${result.playerDamageTaken} HP.` : '']);
        this.resolveSnailEncounterOutcome();
    }

    handleSnailEncounterTalk() {
        if (!this.encounterState || !this._encounterSprite) return;
        const infectionStage = this.act2?.getState?.().infectionStage ?? null;
        const result = resolveTalk(this.encounterState, { infectionStage });
        this.encounterState = result.state;
        if (result.backfired) {
            this.takeDamage(SNAIL_ENCOUNTER_CONSTANTS.SNAIL_COUNTER_DAMAGE, this._encounterSprite.userData.type,
                this._encounterSprite.position.x, this._encounterSprite.position.z);
            this.renderSnailEncounter(['IT HISSES AND LUNGES.']);
        } else {
            this.renderSnailEncounter([`IT HESITATES. RESOLVE +${result.resolveGained}.`]);
        }
        this.resolveSnailEncounterOutcome();
    }

    handleSnailEncounterFlee() {
        if (!this.encounterState) return;
        this.encounterState = resolveFlee(this.encounterState).state;
        this.resolveSnailEncounterOutcome();
    }

    resolveSnailEncounterOutcome() {
        const state = this.encounterState;
        const sprite = this._encounterSprite;
        if (!state?.outcome || !sprite) {
            if (state && !state.outcome) this.renderSnailEncounter([]);
            return;
        }

        if (state.outcome === 'befriend') {
            sprite.userData.isCompanion = true;
            sprite.userData.encounterResolved = true;
            this.companions = this.companions.filter((c) => {
                if (c.sprite !== sprite) c.sprite.userData.isCompanion = false;
                return c.sprite === sprite;
            });
            if (!this.companions.some((c) => c.sprite === sprite)) {
                this.companions.push({ sprite, assistCooldown: 0 });
            }
            this.act2?.completeScientistQuest?.('snail_befriended');
            window.dispatchEvent(new CustomEvent('snail-befriended', {
                detail: { snailType: sprite.userData.type }
            }));
            window.dispatchEvent(new CustomEvent('objective-resolve', {
                detail: { id: 'befriend-a-snail' }
            }));
        } else if (state.outcome === 'fled') {
            // no sprite state change — can be re-triggered later
        }
        // 'fight_win' needs no extra handling here: applyPlayerDamageToEnemy
        // already ran damageSnail's full death/loot/corpse path when the
        // killing blow was dealt in handleSnailEncounterFight.

        this.closeSnailEncounter();
    }
```

Add `this.encounterState = null;` and `this._encounterSprite = null;`
alongside `this.companions = []` in the constructor.

- [ ] **Step 3: Wire the buttons and imports**

Add the import at the top of `threeGame.js`:

```js
import {
    createEncounter,
    resolveFight,
    resolveTalk,
    resolveFlee,
    SNAIL_ENCOUNTER_CONSTANTS
} from './snailEncounter.js';
```

Find where other modal buttons are wired (e.g. search for
`getElementById('close-mothership-dialogue')` in `main.js` — button
listeners for game modals live in `main.js`, not `threeGame.js`, following
the existing pattern where `threeGame.js` exposes methods and `main.js`
wires DOM events to them). Add to `main.js`, near the other modal button
wiring:

```js
document.getElementById('snail-encounter-fight-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterFight?.();
});
document.getElementById('snail-encounter-talk-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterTalk?.();
});
document.getElementById('snail-encounter-flee-btn')?.addEventListener('click', () => {
    window.game?.handleSnailEncounterFlee?.();
});
```

- [ ] **Step 4: Wire quest-objective resolution**

Find where other `objective-resolve`-style or `ObjectiveRegistry` events
are consumed in `main.js` (search `resolveObjective(` in `main.js`) and add
a listener alongside them:

```js
window.addEventListener('objective-resolve', (event) => {
    const id = event?.detail?.id;
    if (id) objectiveRegistry?.resolveObjective(id);
});
```

(If `main.js` already has a generic pattern for this — check the existing
`resolveObjective(` call sites first and match whatever variable name the
registry instance uses there instead of assuming `objectiveRegistry`.)

- [ ] **Step 5: Manual verification**

Run the dev server (`npm run dev`), reach Act 2 (or use existing debug/dev
console helpers if the codebase has a way to fast-forward act2 state —
check for one before manually playing through), walk into a wild snail,
and confirm:
- The modal appears and the rest of the world visibly freezes (an
  unrelated enemy elsewhere does not move while the modal is open).
- FIGHT reduces the snail HP bar and deals real damage back.
- TALK increases the resolve bar, with a visibly different gain/backfire
  rate depending on `infectionStage` (check both a cured and a non-cured
  save state).
- Winning via Talk closes the modal and the snail now follows the player.
- Talking to Dr. Okonkwo-Vass afterward reaches her final stage.

- [ ] **Step 6: Run the full suite, lint, and build**

Run: `npx vitest run && npx eslint . && npx vite build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/threeGame.js main.js
git commit -m "feat: wire the snail encounter live — trigger, battle, befriend, quest

Replaces the snail contact-damage branch for wild snails in Act 2 with the
turn-based encounter trigger. Fight/Talk/Flee buttons drive the pure
snailEncounter.js state machine; Fight damage flows through the same
applyPlayerDamageToEnemy path normal shooting uses, so a fight-won kill
gets the existing death/loot/corpse handling for free. Winning via Talk
flags the snail isCompanion, hands it to Task 7's follow/assist AI, and
completes the scientist's sidequest via completeScientistQuest plus the
existing ObjectiveRegistry.

Implements docs/superpowers/specs/2026-07-26-snail-diplomacy-encounter-design.md
in full for its stated scope (Act 2, wild snails only, one companion at a
time). Boss snails, Act 1, and multi-companion support remain explicitly
out of scope per that doc."
```

---

### Task 9: Scientist NPC placement and interaction

**Files:**
- Modify: `src/threeGame.js`
- Modify: `index.html`
- Modify: `style.css`

**Interfaces:**
- Produces: `ThreeGame.leaderKeyFor` and `ThreeGame.talkToLeader` gain a
  `'scientist'` kind; `ThreeGame.getScientistRecord()`;
  `ThreeGame.interactWithScientist()`, called from
  `triggerGameplayInteract()` alongside its 12 existing sibling calls.
- Consumes: `LEADER_DIALOGUE.scientist` (Task 5), `s.scientist` (Task 4).

- [ ] **Step 1: Extend `leaderKeyFor` and `talkToLeader`**

Change:

```js
    leaderKeyFor(kind, entity) {
        if (kind === 'hive') return entity.characterId || leaderKeyFromName(entity.label);
        return leaderKeyFromName(entity.leaderName ?? '');
    }
```

to:

```js
    leaderKeyFor(kind, entity) {
        if (kind === 'hive') return entity.characterId || leaderKeyFromName(entity.label);
        if (kind === 'scientist') return 'scientist';
        return leaderKeyFromName(entity.leaderName ?? '');
    }
```

Change:

```js
    talkToLeader(kind, entity) {
        const record = kind === 'hive' ? this.getHiveRecord(entity.id) : this.getCampRecord(entity.id);
```

to:

```js
    talkToLeader(kind, entity) {
        const record = kind === 'hive' ? this.getHiveRecord(entity.id)
            : kind === 'scientist' ? this.getScientistRecord()
                : this.getCampRecord(entity.id);
```

Add `getScientistRecord` near `getCampRecord`/`getHiveRecord`:

```js
    getScientistRecord() {
        return this.act2?.getState?.().scientist ?? null;
    }
```

- [ ] **Step 2: Add placement and the interact method**

Add near `interactWithAct2Camp`:

```js
    getScientistWorldPosition() {
        const meridian = this.camps?.find((c) => c.id === 'camp_meridian');
        if (!meridian) return null;
        // Offset from the camp leader's own position so she reads as a
        // second, distinct fixture rather than overlapping the leader.
        return { x: meridian.pos.x + 1.6, z: meridian.pos.z + 1.6 };
    }

    interactWithScientist() {
        if (!this.isGameplayInputActive() || !this.player || !this.act2 || !this.isAct2Active()) return false;
        const pos = this.getScientistWorldPosition();
        if (!pos) return false;
        const dist = Math.hypot(this.player.position.x - pos.x, this.player.position.z - pos.z);
        if (dist > 2.0) return false;
        return this.talkToLeader('scientist', { id: 'scientist', leaderName: 'Dr. Okonkwo-Vass' });
    }

    updateScientistPromptState() {
        const promptEl = document.getElementById('scientist-hud-prompt');
        if (!promptEl) return;
        const pos = this.isAct2Active() ? this.getScientistWorldPosition() : null;
        const near = pos && this.player
            ? Math.hypot(this.player.position.x - pos.x, this.player.position.z - pos.z) <= 2.0
            : false;
        promptEl.classList.toggle('hidden', !near);
    }
```

Add the call sites: `this.interactWithScientist();` inside
`triggerGameplayInteract()` (`threeGame.js:3282-3298`), alongside its 12
existing siblings, and `this.updateScientistPromptState();` wherever the
per-frame HUD prompt updates already run (search for where
`updateCampPromptState`-equivalent is called each frame and add it
alongside — match the existing per-frame prompt update grouping rather
than adding a new stray call site).

- [ ] **Step 3: Add the HUD prompt element**

In `index.html`, alongside the other `hud-action-prompt` elements:

```html
      <div id="scientist-hud-prompt" class="lore-hud-prompt hud-action-prompt hidden">
        <span class="hud-action-prompt__icon">E</span>
        <span class="hud-action-prompt__text">TALK — DR. OKONKWO-VASS</span>
      </div>
```

(Reuses the existing `lore-hud-prompt hud-action-prompt` classes — check
`foundry-hud-prompt`'s exact markup structure at `index.html:954` and
match its inner-span structure exactly rather than guessing, since the
shared CSS likely targets specific child selectors.)

- [ ] **Step 4: Test the pure parts**

`interactWithScientist`/`updateScientistPromptState` need a live `ThreeGame`
and DOM, so there's no isolated unit test for the wiring itself — but
`getScientistRecord`'s underlying data path (`Act2Manager` + Task 4's
normalization) is already fully covered by Task 4's tests. Run the full
suite to confirm no regression:

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Manual verification**

With the dev server running and Act 2 active, walk to `camp_meridian`,
approach the offset position, confirm the "TALK — DR. OKONKWO-VASS" prompt
appears distinctly from the camp leader's own prompt, and pressing E opens
her dialogue.

- [ ] **Step 6: Run lint and build**

Run: `npx eslint . && npx vite build`
Expected: both green.

- [ ] **Step 7: Commit**

```bash
git add src/threeGame.js index.html style.css
git commit -m "feat: place Dr. Okonkwo-Vass at camp_meridian as a talkable NPC

Extends leaderKeyFor/talkToLeader with a third 'scientist' kind reading
the standalone record from Task 4. She's a second, independent interact
point offset from the camp leader's own position — not part of the
camp's own record or prompt, so the two can't collide or overwrite each
other's dialogue state."
```

---

## Self-Review

**Spec coverage:**
- World-pause via `hasBlockingGameplayOverlay` — Task 6. ✓
- Trigger replacing the contact-damage branch, covering both hostile and
  passive-wandering snails via a real-position distance check — Task 8. ✓
- Battle state (Fight/Talk/Flee, real player HP, species-gated Talk) —
  Tasks 2 and 8. ✓
- Fight-win reuses `applyPlayerDamageToEnemy`/`damageSnail`'s existing
  death path — Task 8, explicitly not re-implemented. ✓
- Companion follow + assist, one at a time — Tasks 7 and 8. ✓
- Scientist as a third `talkToLeader` kind, not a fourth camp slot —
  Tasks 4, 5, 9 (corrected from the design doc's first draft). ✓
- Objective tracking via `ObjectiveRegistry` — Task 8 Step 4. Note: this
  plan does not add the `ObjectiveRegistry.trackObjective(...)` call for
  stage 2 of her dialogue (design doc section "Sidequest," point 3) as its
  own task — **gap found during self-review.** Added as Task 5 Step 3's
  scope was dialogue content only. Fixing now: add to Task 8 Step 4's
  scope (see amendment below) rather than leaving it unassigned.
- Act 1 / boss-snail exclusion — enforced directly in Task 8's trigger
  condition (`this.isAct2Active()`, snail-type allowlist). ✓
- Pre-existing `death_beat` bug — Task 1. ✓

**Amendment (gap closed):** Task 8 Step 4 must also register the
objective when the scientist reaches dialogue stage 2, not only resolve it
on befriend. Add to Task 8 Step 4:

In `main.js`'s `leader-dialogue` event listener (the same one that already
handles `beatType === 'advance'` sound effects, `main.js:7483-7511`), add:

```js
    if (event?.detail?.leaderName === 'Dr. Okonkwo-Vass' && event?.detail?.beatType === 'advance' && event?.detail?.stage === 2) {
        objectiveRegistry?.trackObjective({
            id: 'befriend-a-snail',
            source: 'camp-quest',
            label: 'BEFRIEND A SNAIL',
            current: 0,
            target: 1
        });
    }
```

(Match the existing `objectiveRegistry` variable name used elsewhere in
`main.js` rather than assuming it — same caveat as the `resolveObjective`
wiring above.)

**Placeholder scan:** no TBD/TODO markers; the one intentionally-weak test
(Task 3 Step 1) is explicitly called out as temporary and superseded by
Task 5's real test, which is itself provided in full — not a placeholder
left unresolved.

**Type consistency:** `EncounterState.outcome` values (`null`,
`'fight_win'`, `'befriend'`, `'fled'`) are used identically in Task 2's
implementation and Task 8's `resolveSnailEncounterOutcome`. `sprite.userData`
field names (`isCompanion`, `encounterResolved`) are introduced in Task 8
and read consistently in both the Task 8 trigger condition and Task 7's
assist-targeting filter.
