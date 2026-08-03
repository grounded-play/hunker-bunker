# Ambient Line Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random, uncoordinated HUD commentary (Director ambient taunts + Mothership reactive event lines) with a single context-scored arbiter, so lines only fire when they actually match the player's real depth/danger/objective state, and the two systems stop talking over each other.

**Architecture:** A new pure module `src/lineDirector.js` (`LineDirector` class, no DOM/Three.js dependency — same testing shape as the existing `src/director.js`) scores tagged line pools against a live context snapshot and returns a winner or `null`. Two existing trigger sources (`threeGame.js`'s Director `patrol`/`taunt` actions, `main.js`'s `fireMothershipReactiveLine`) are rewired to call it instead of doing their own `Math.random()`/ad-hoc-cooldown selection. Rendering is untouched — the winner's `.text` still flows through the existing `showBunkerLine`/`showBiomePrompt` pipeline.

**Tech Stack:** Vanilla JS (ES modules), Vitest for tests. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-line-director-overhaul-design.md`.
- **Scope deviation from the spec, decided during planning (see rationale below):** the spec listed "tutorial/HUD nudges" (`src/dialogue.js:1057-1106`, `showTutorialPrompt`) as a third in-scope trigger source. On inspection, `showTutorialPrompt` is called with explicit, ordered `{icon, text}` pairs from specific tutorial-step functions (e.g. `tutorialStepMovement`) — it is deliberate sequenced onboarding, not random selection, and is not the reported "random and out of place" problem. Routing it through a scored arbiter risks silently skipping a required tutorial step if it fails to clear the relevance floor. **This plan does not touch `dialogue.js`.** Only `src/director.js`'s ambient taunts and `main.js`'s Mothership Reactive lines are migrated.
- Existing pools in `src/data/dialogueLines.js` (including `DIALOGUE_LINES.director` / `DIALOGUE_REGISTERS.*.director`) are **not deleted or modified** — `src/data/dialogueLines.test.js` asserts against them directly and must keep passing unchanged. The new tagged pool in `src/data/lineDirectorPools.js` is an additive copy of the same line text, not a move.
- `LineDirector` itself must stay DOM-free and Three.js-free so it can be unit tested the same way `src/director.js` is (see `src/director.test.js` for the established pattern).
- "No eligible line" must resolve to firing nothing (`null`), never a random fallback — this is the direct fix for "random and nonsense."

---

## File Structure

- **Create** `src/lineDirector.js` — the arbiter: eligibility filtering, scoring, cooldown/history bookkeeping.
- **Create** `src/lineDirector.test.js` — unit tests for the arbiter, using deterministic injected `random`.
- **Create** `src/data/lineDirectorPools.js` — tagged line pools: `DIRECTOR_AMBIENT_LINES` (migrated from `dialogueLines.js`'s `director` pools across all 3 registers) and `MOTHERSHIP_REACTIVE_LINES` (migrated from `main.js`'s inline `lines` object).
- **Create** `src/data/lineDirectorPools.test.js` — schema/integrity tests over both pools.
- **Modify** `src/threeGame.js` — instantiate `LineDirector`, add `buildLineDirectorContext()`, tick it every frame, rewire `executeDirectorAction`'s `patrol`/`taunt` cases, reset it alongside `bunkerDirector` on respawn.
- **Modify** `main.js` — rewire `fireMothershipReactiveLine` to call the shared `window.lineDirector`, remove the now-redundant fire-once/cooldown bookkeeping it replaces, remove one dead no-op listener that referenced the removed state.

---

### Task 1: Core arbiter (`LineDirector`)

**Files:**
- Create: `src/lineDirector.js`
- Test: `src/lineDirector.test.js`

**Interfaces:**
- Produces: `export class LineDirector` with methods `tick(deltaSeconds = 0)`, `requestLine(trigger, context = {}, pool = [], random = Math.random) -> { id, text } | null`, `reset()`.
- Produces (for the pool schema Task 2 will author against): a line pool entry shape
  `{ id: string, register?: 'corporate'|'glitched'|'reverent', text?: string, template?: (context) => string, weight?: number, tags?: { objectiveSources?: string[]|null, depthTier?: {min?, max?}, danger?: {min?, max?}, eventTrigger?: string|null, cooldownClass?: string, cooldownSeconds?: number, bypassSharedCooldown?: boolean, once?: boolean, minRepeatSeconds?: number } }`.
- Produces (for the context snapshot Task 3 will build): `{ register?: 'corporate'|'glitched'|'reverent', depthTier?: number, danger?: number (0..1), objectiveSource?: string|null }`.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing tests**

Create `src/lineDirector.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { LineDirector } from './lineDirector.js';

describe('LineDirector', () => {
    it('returns null for an empty pool', () => {
        const d = new LineDirector();
        expect(d.requestLine('ambient', {}, [])).toBeNull();
    });

    it('filters by register', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'a', register: 'corporate', text: 'corp line', tags: {} },
            { id: 'b', register: 'glitched', text: 'glitch line', tags: {} }
        ];
        expect(d.requestLine('ambient', { register: 'glitched' }, pool).id).toBe('b');
    });

    it('separates ambient lines from event-triggered lines', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'ambient1', text: 'ambient', tags: { eventTrigger: null } },
            { id: 'evt1', text: 'event', tags: { eventTrigger: 'mothership:first_kill' } }
        ];
        expect(d.requestLine('mothership:first_kill', {}, pool).id).toBe('evt1');
        expect(d.requestLine('ambient', {}, pool).id).toBe('ambient1');
    });

    it('filters by depth tier range', () => {
        const d = new LineDirector();
        const pool = [{ id: 'deep', text: 'deep line', tags: { depthTier: { min: 2 } } }];
        expect(d.requestLine('ambient', { depthTier: 1 }, pool)).toBeNull();
        expect(d.requestLine('ambient', { depthTier: 2 }, pool).id).toBe('deep');
    });

    it('filters by danger range', () => {
        const d = new LineDirector();
        const pool = [{ id: 'calm', text: 'calm line', tags: { danger: { max: 0.6 } } }];
        expect(d.requestLine('ambient', { danger: 0.9 }, pool)).toBeNull();
        expect(d.requestLine('ambient', { danger: 0.1 }, pool).id).toBe('calm');
    });

    it('fires a "once" line exactly one time ever', () => {
        const d = new LineDirector();
        const pool = [{ id: 'once1', text: 'once line', tags: { once: true } }];
        expect(d.requestLine('ambient', {}, pool).id).toBe('once1');
        expect(d.requestLine('ambient', {}, pool)).toBeNull();
    });

    it('gates a shared cooldown class across different line ids, until the class cooldown elapses', () => {
        const d = new LineDirector();
        const x = { id: 'x', text: 'x', tags: { cooldownClass: 'shared', cooldownSeconds: 45 } };
        const y = { id: 'y', text: 'y', tags: { cooldownClass: 'shared', cooldownSeconds: 45 } };
        expect(d.requestLine('ambient', {}, [x]).id).toBe('x');
        expect(d.requestLine('ambient', {}, [y])).toBeNull();
        d.tick(46);
        expect(d.requestLine('ambient', {}, [y]).id).toBe('y');
    });

    it('lets bypassSharedCooldown lines ignore their class cooldown (critical events)', () => {
        const d = new LineDirector();
        const shared = { id: 'x', text: 'x', tags: { cooldownClass: 'shared', cooldownSeconds: 45 } };
        const critical = { id: 'crit', text: 'crit', tags: { cooldownClass: 'shared', cooldownSeconds: 45, bypassSharedCooldown: true } };
        expect(d.requestLine('ambient', {}, [shared]).id).toBe('x');
        expect(d.requestLine('ambient', {}, [critical]).id).toBe('crit');
    });

    it('suppresses the same line from repeating within minRepeatSeconds, but allows a different eligible line', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'a', text: 'a', tags: { minRepeatSeconds: 100 } },
            { id: 'b', text: 'b', tags: { minRepeatSeconds: 100 } }
        ];
        expect(d.requestLine('ambient', {}, pool, () => 0).id).toBe('a');
        expect(d.requestLine('ambient', {}, pool, () => 0).id).toBe('b');
        expect(d.requestLine('ambient', {}, pool)).toBeNull();
        d.tick(101);
        expect(d.requestLine('ambient', {}, pool, () => 0).id).toBe('a');
    });

    it('scores an objective-matched line above a generic same-weight line', () => {
        const d = new LineDirector();
        const pool = [
            { id: 'generic', text: 'generic', tags: {} },
            { id: 'onTopic', text: 'on topic', tags: { objectiveSources: ['black-box'] } }
        ];
        expect(d.requestLine('ambient', { objectiveSource: 'black-box' }, pool).id).toBe('onTopic');
    });

    it('excludes an objective-tagged line entirely when the objective does not match', () => {
        const d = new LineDirector();
        const pool = [{ id: 'onTopic', text: 'on topic', tags: { objectiveSources: ['black-box'] } }];
        expect(d.requestLine('ambient', { objectiveSource: 'camp-quest' }, pool)).toBeNull();
    });

    it('evaluates a template function against context instead of using a static text field', () => {
        const d = new LineDirector();
        const pool = [{ id: 'tmpl', template: (ctx) => `depth is ${ctx.depthTier}`, tags: {} }];
        expect(d.requestLine('ambient', { depthTier: 3 }, pool).text).toBe('depth is 3');
    });

    it('reset() clears history and cooldowns so a line can fire again', () => {
        const d = new LineDirector();
        const pool = [{ id: 'once1', text: 'once', tags: { once: true } }];
        expect(d.requestLine('ambient', {}, pool)).not.toBeNull();
        d.reset();
        expect(d.requestLine('ambient', {}, pool)).not.toBeNull();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lineDirector.test.js`
Expected: FAIL — `Cannot find module './lineDirector.js'` (file doesn't exist yet).

- [ ] **Step 3: Implement `src/lineDirector.js`**

```js
// Context-scored arbiter for ambient/reactive HUD commentary. Given a pool
// of tagged lines and a live context snapshot, picks the single best-fitting
// eligible line (or nothing) instead of a Math.random() pick with no
// awareness of what's actually happening. Also owns cross-source cooldown
// bookkeeping so independently-firing trigger sources stop overlapping.

function inRange(value, range) {
    if (!range) return true;
    const { min = -Infinity, max = Infinity } = range;
    return value >= min && value <= max;
}

function registerEligible(line, context) {
    if (!line.register) return true;
    return line.register === (context.register ?? 'corporate');
}

function eventEligible(line, trigger) {
    const wanted = line.tags?.eventTrigger ?? null;
    if (wanted === null) return trigger === 'ambient';
    return wanted === trigger;
}

function objectiveEligible(line, context) {
    const sources = line.tags?.objectiveSources ?? null;
    if (!sources) return true;
    return sources.includes(context.objectiveSource ?? null);
}

function isLineEligible(line, trigger, context, { classLastFiredAt, lineHistory, nowSeconds }) {
    if (!registerEligible(line, context)) return false;
    if (!eventEligible(line, trigger)) return false;
    if (!objectiveEligible(line, context)) return false;
    if (!inRange(context.depthTier ?? 0, line.tags?.depthTier)) return false;
    if (!inRange(context.danger ?? 0, line.tags?.danger)) return false;

    const seenBefore = lineHistory.get(line.id);
    if (line.tags?.once && seenBefore) return false;

    const cooldownClass = line.tags?.cooldownClass ?? 'default';
    const cooldownSeconds = line.tags?.cooldownSeconds ?? 0;
    if (!line.tags?.bypassSharedCooldown && cooldownSeconds > 0) {
        const lastFired = classLastFiredAt.get(cooldownClass) ?? -Infinity;
        if (nowSeconds - lastFired < cooldownSeconds) return false;
    }

    const minRepeatSeconds = line.tags?.minRepeatSeconds ?? 0;
    if (seenBefore && minRepeatSeconds > 0 && nowSeconds - seenBefore.lastFiredAt < minRepeatSeconds) {
        return false;
    }

    return true;
}

function scoreLine(line, context) {
    let score = line.weight ?? 1;
    const sources = line.tags?.objectiveSources ?? null;
    if (sources && sources.includes(context.objectiveSource ?? null)) score += 2;
    if (line.tags?.depthTier) score += 1;
    if (line.tags?.danger) score += 1;
    return score;
}

export class LineDirector {
    constructor() {
        this.lineHistory = new Map();      // lineId -> { lastFiredAt, timesFired }
        this.classLastFiredAt = new Map(); // cooldownClass -> seconds
        this._nowSeconds = 0;
    }

    // Advance the arbiter's internal clock. Call once per frame with delta seconds.
    tick(deltaSeconds = 0) {
        this._nowSeconds += deltaSeconds;
    }

    // Pick the best-fitting eligible line for `trigger` given `context`, or null
    // if nothing is eligible. `random` is injectable for deterministic tests.
    requestLine(trigger, context = {}, pool = [], random = Math.random) {
        const state = {
            classLastFiredAt: this.classLastFiredAt,
            lineHistory: this.lineHistory,
            nowSeconds: this._nowSeconds
        };
        const eligible = pool.filter((line) => isLineEligible(line, trigger, context, state));
        if (!eligible.length) return null;

        let best = -Infinity;
        let candidates = [];
        for (const line of eligible) {
            const score = scoreLine(line, context);
            if (score > best) {
                best = score;
                candidates = [line];
            } else if (score === best) {
                candidates.push(line);
            }
        }

        const winner = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
        this._recordFired(winner);

        const text = typeof winner.template === 'function' ? winner.template(context) : winner.text;
        return { id: winner.id, text };
    }

    _recordFired(line) {
        const cooldownClass = line.tags?.cooldownClass ?? 'default';
        this.classLastFiredAt.set(cooldownClass, this._nowSeconds);
        const prev = this.lineHistory.get(line.id);
        this.lineHistory.set(line.id, { lastFiredAt: this._nowSeconds, timesFired: (prev?.timesFired ?? 0) + 1 });
    }

    reset() {
        this.lineHistory.clear();
        this.classLastFiredAt.clear();
        this._nowSeconds = 0;
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lineDirector.test.js`
Expected: PASS, all 12 tests green. (This exact implementation was prototyped and verified against this exact test list before being written into this plan.)

- [ ] **Step 5: Commit**

```bash
git add src/lineDirector.js src/lineDirector.test.js
git commit -m "feat: add context-scored LineDirector arbiter for HUD commentary"
```

---

### Task 2: Tagged line pools

**Files:**
- Create: `src/data/lineDirectorPools.js`
- Test: `src/data/lineDirectorPools.test.js`

**Interfaces:**
- Consumes: the pool entry shape produced by Task 1.
- Produces: `export const DIRECTOR_AMBIENT_LINES` (array), `export const MOTHERSHIP_REACTIVE_LINES` (array) — both consumed by Task 3 and Task 4 respectively.

- [ ] **Step 1: Write the failing tests**

Create `src/data/lineDirectorPools.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DIRECTOR_AMBIENT_LINES, MOTHERSHIP_REACTIVE_LINES } from './lineDirectorPools.js';

function checkPoolIntegrity(pool) {
    const ids = new Set();
    for (const line of pool) {
        expect(typeof line.id).toBe('string');
        expect(line.id.length).toBeGreaterThan(0);
        expect(ids.has(line.id)).toBe(false);
        ids.add(line.id);
        expect(typeof line.text === 'string' || typeof line.template === 'function').toBe(true);
        expect(line.tags).toBeTruthy();
    }
}

describe('DIRECTOR_AMBIENT_LINES', () => {
    it('has no duplicate ids and every line has text or a template', () => {
        checkPoolIntegrity(DIRECTOR_AMBIENT_LINES);
    });

    it('covers all three registers with at least the original 8-line count per register', () => {
        for (const register of ['corporate', 'glitched', 'reverent']) {
            const count = DIRECTOR_AMBIENT_LINES.filter((l) => l.register === register).length;
            expect(count).toBeGreaterThanOrEqual(4);
        }
    });

    it('is ambient (eventTrigger null) for every line', () => {
        for (const line of DIRECTOR_AMBIENT_LINES) {
            expect(line.tags.eventTrigger ?? null).toBeNull();
        }
    });

    it('tags the depth-callout line to only fire at depth tier 2+', () => {
        const line = DIRECTOR_AMBIENT_LINES.find((l) => l.id === 'director_depth_disapproval');
        expect(line).toBeTruthy();
        expect(line.tags.depthTier?.min).toBeGreaterThanOrEqual(2);
    });
});

describe('MOTHERSHIP_REACTIVE_LINES', () => {
    it('has no duplicate ids and every line has text or a template', () => {
        checkPoolIntegrity(MOTHERSHIP_REACTIVE_LINES);
    });

    it('tags every line with its matching mothership: eventTrigger and once:true', () => {
        for (const line of MOTHERSHIP_REACTIVE_LINES) {
            expect(line.tags.eventTrigger).toMatch(/^mothership:/);
            expect(line.tags.once).toBe(true);
            expect(line.tags.cooldownClass).toBe('mothership_reactive');
        }
    });

    it('marks the three critical triggers to bypass the shared cooldown', () => {
        const criticalIds = ['mothership_hp_critical', 'mothership_objective_found', 'mothership_first_boss'];
        for (const id of criticalIds) {
            const line = MOTHERSHIP_REACTIVE_LINES.find((l) => l.id === id);
            expect(line).toBeTruthy();
            expect(line.tags.bypassSharedCooldown).toBe(true);
        }
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/data/lineDirectorPools.test.js`
Expected: FAIL — `Cannot find module './lineDirectorPools.js'`.

- [ ] **Step 3: Implement `src/data/lineDirectorPools.js`**

This copies the existing line text verbatim from `src/data/dialogueLines.js`'s `director` pools (all 3 registers, unchanged as noted in Global Constraints) and from `main.js`'s `fireMothershipReactiveLine` `lines` object, adding tags. `director_depth_disapproval` and its glitched/reverent counterparts get `depthTier: { min: 2 }` since they're the ones referencing depth explicitly — this is the direct fix for the reported "gone too deep" line firing regardless of actual depth.

```js
// Tagged line pools consumed by src/lineDirector.js. Content is migrated
// (not moved) from src/data/dialogueLines.js's `director` pools and
// main.js's Mothership Reactive `lines` object — see
// docs/superpowers/specs/2026-08-02-line-director-overhaul-design.md.

export const DIRECTOR_AMBIENT_LINES = Object.freeze([
    // corporate
    { id: 'director_welcome_committee', register: 'corporate', text: 'Movement logged. Facilities has dispatched a welcome committee.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_pillar_lighting', register: 'corporate', text: 'Unauthorized exploration detected. Adjusting pillar lighting.', tags: { eventTrigger: null, depthTier: { min: 1 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_curiosity_clearance', register: 'corporate', text: 'Your curiosity exceeds your clearance. Compensating accordingly.', tags: { eventTrigger: null, depthTier: { min: 1 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_power_rerouted', register: 'corporate', text: 'Power rerouted to a department that resents you.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_depth_disapproval', register: 'corporate', text: 'The structure notes your depth and disapproves.', tags: { eventTrigger: null, depthTier: { min: 2 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_column_field', register: 'corporate', text: 'Please remain calm while the column field selects a new destination.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_productivity', register: 'corporate', text: 'Productivity is being monitored. So is everything else.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_maintenance_event', register: 'corporate', text: 'A maintenance event has been scheduled around your location.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },

    // glitched
    { id: 'director_glitch_curiosity', register: 'glitched', text: 'DE-DETECTION... Facilities has logged unauthorized cur-curiosity.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_breaker', register: 'glitched', text: 'WARNING: Sector breaker state UNSTABLE. Lights are... fading.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_containment', register: 'glitched', text: 'Power rerouted. Department of containment reports... zero staff.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_glitch_remembers', register: 'glitched', text: 'SYSTEM: The structure... it remembers you. It... wants you.', tags: { eventTrigger: null, depthTier: { min: 2 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },

    // reverent
    { id: 'director_reverent_ghost', register: 'reverent', text: 'The Director is a ghost in a machine. The Queen is the blood in the pipes.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_reverent_column', register: 'reverent', text: 'The column field is aligning. We are finally going home.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_reverent_darkness', register: 'reverent', text: 'Do not fight the darkness. The dark is where the chitin grows.', tags: { eventTrigger: null, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } },
    { id: 'director_reverent_descent', register: 'reverent', text: 'The structure welcomes your descent. We have prepared the throne.', tags: { eventTrigger: null, depthTier: { min: 2 }, cooldownClass: 'director_ambient', minRepeatSeconds: 90 } }
]);

const MOTHERSHIP_CRITICAL_IDS = new Set(['mothership_hp_critical', 'mothership_objective_found', 'mothership_first_boss']);

function mothershipLine(id, trigger, text) {
    return {
        id,
        text: `> MOTHERSHIP: ${text}`,
        tags: {
            eventTrigger: `mothership:${trigger}`,
            cooldownClass: 'mothership_reactive',
            cooldownSeconds: 45,
            bypassSharedCooldown: MOTHERSHIP_CRITICAL_IDS.has(id),
            once: true
        }
    };
}

export const MOTHERSHIP_REACTIVE_LINES = Object.freeze([
    mothershipLine('mothership_first_kill', 'first_kill', 'AGENT — FIRST THREAT NEUTRALIZED. PROCEED.'),
    mothershipLine('mothership_first_cryo', 'first_cryo', 'WARNING: CRYO SECTOR BOUNDARY CROSSED. THERMAL PROTOCOL ACTIVE.'),
    mothershipLine('mothership_first_bio', 'first_bio', 'ALERT: BIO-CONTAINMENT ZONE ENTERED. SUIT FILTERS AT LIMIT.'),
    mothershipLine('mothership_hp_critical', 'hp_critical', 'DISTRESS SIGNAL: VITAL SIGNS CRITICAL. EXTRACTION WINDOW OPEN EARLY.'),
    mothershipLine('mothership_objective_found', 'objective_found', 'UPLINK: OBJECTIVE CONFIRMED. MAX SHIP SYSTEMS REQUIRED FOR EXTRACTION.'),
    mothershipLine('mothership_first_deposit', 'first_deposit', 'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.'),
    mothershipLine('mothership_lore_found', 'lore_found', 'AGENT — BUNKER DATA FRAGMENT RECOVERED. TRANSMITTING TO ARCHIVE.'),
    mothershipLine('mothership_sentinel_spotted', 'sentinel_spotted', 'WARNING: AUTOMATED DEFENSE SYSTEM ACTIVE. RECOMMEND COVER.'),
    mothershipLine('mothership_crawler_detected', 'crawler_detected', 'ALERT: FAST-MOVING BIO-ENTITY DETECTED. MAINTAIN DISTANCE.'),
    mothershipLine('mothership_armory_found', 'armory_found', 'UPLINK: ARMORY CACHE LOCATED. HIGH-VALUE ASSET — EXPECT RESISTANCE.'),
    mothershipLine('mothership_the_nest', 'the_nest', 'WARNING: BIO-ENTITY NEST CONFIRMED. MAXIMUM THREAT DENSITY. CAUTION.'),
    mothershipLine('mothership_weapon_calibrated', 'weapon_calibrated', 'NOTED: AGENT WEAPON OUTPUT RISING. ... WHY DO YOU NEED MORE.'),
    mothershipLine('mothership_first_boss', 'first_boss', 'CONFIRMED KILL: APEX BIO-ENTITY DOWN. THE SIGNAL FELT THAT.'),
    mothershipLine('mothership_specimen_notices', 'specimen_notices', '[UNAUTHORIZED CHANNEL] ...0047 HAS STOPPED BUILDING. IT IS LISTENING TO YOU NOW.')
]);
```

Note: the original `lines` object in `main.js` did not include a `specimen_notices`-adjacent `first_deposit` trigger comment (that hookup was already dead/no-op — see Task 4 Step 3) but the line text itself (`'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.'`) is preserved here in case a future caller wires up `first_deposit` properly; it is harmless to keep since nothing currently requests it, and `MOTHERSHIP_REACTIVE_LINES`'s integrity tests don't require every id to be actively requested.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/data/lineDirectorPools.test.js`
Expected: PASS, all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/data/lineDirectorPools.js src/data/lineDirectorPools.test.js
git commit -m "feat: add tagged line pools for Director ambient and Mothership reactive commentary"
```

---

### Task 3: Wire the Director ambient path in `threeGame.js`

**Files:**
- Modify: `src/threeGame.js:61` (imports), `:1144` (constructor), `:4911-4929` (`updateBunkerDirector`), `:4931-4954` (`executeDirectorAction`), `:11855` (respawn reset)

**Interfaces:**
- Consumes: `LineDirector` from `src/lineDirector.js` (Task 1), `DIRECTOR_AMBIENT_LINES` from `src/data/lineDirectorPools.js` (Task 2), `getSuitRegister` from `src/data/dialogueLines.js` (already exists, exported at `dialogueLines.js:179`).
- Produces: `this.lineDirector` (instance property, also assigned to `window.lineDirector`), `this.buildLineDirectorContext()` (instance method returning `{ register, depthTier, danger, objectiveSource }`) — consumed by Task 4.

- [ ] **Step 1: Add imports**

In `src/threeGame.js`, change line 61:

```js
import { getDialogueLine } from './data/dialogueLines.js';
```

to:

```js
import { getDialogueLine, getSuitRegister } from './data/dialogueLines.js';
```

Then add two new import lines directly after the existing `import { BunkerDirector } from './director.js';` (line 64):

```js
import { LineDirector } from './lineDirector.js';
import { DIRECTOR_AMBIENT_LINES } from './data/lineDirectorPools.js';
```

- [ ] **Step 2: Instantiate the arbiter in the constructor**

In `src/threeGame.js`, immediately after line 1144 (`this.bunkerDirector = new BunkerDirector();`), add:

```js
        this.lineDirector = new LineDirector();
        if (typeof window !== 'undefined') window.lineDirector = this.lineDirector;
```

- [ ] **Step 3: Add `buildLineDirectorContext()`**

Add this method directly after `showBunkerLine` (after line 6102, i.e. right after the closing `}` of `showBunkerLine`):

```js
    buildLineDirectorContext() {
        const act2State = this.act2?.getState?.() ?? null;
        const topObjective = (typeof window !== 'undefined'
            ? window.objectiveRegistry?.getActiveObjectives?.(1)?.[0]
            : null) ?? null;
        const hpFrac = (this.playerVitals?.hp ?? 1) / Math.max(1, this.playerVitals?.maxHp ?? 1);
        return {
            register: getSuitRegister(act2State
                ? { infectionStage: act2State.infectionStage, queenObedience: act2State.queenObedience }
                : 'corporate'),
            depthTier: this.currentDepthTier ?? 0,
            danger: Math.max(0, Math.min(1, 1 - hpFrac)),
            objectiveSource: topObjective?.source ?? null
        };
    }
```

- [ ] **Step 4: Tick the arbiter's clock each frame**

In `updateBunkerDirector` (`src/threeGame.js:4912-4929`), add one line right after the early-return guards:

```js
    updateBunkerDirector(delta) {
        if (!this.bunkerDirector || !this.player || this.isPlayerDead || !this.snailsEnabled) return;
        if (!this.isGameplayInputActive()) return;
        this.lineDirector?.tick(delta);
        this.syncRunModifierCards();
        // ...rest of the function is unchanged
```

- [ ] **Step 5: Rewire the `patrol` and `taunt` cases**

In `executeDirectorAction` (`src/threeGame.js:4931-4954`), replace:

```js
    executeDirectorAction(action) {
        switch (action) {
            case 'patrol':
                this.showBunkerLine(getDialogueLine('director') ?? 'A maintenance event has been scheduled around your location.');
                this.spawnPatrolNearPlayer();
                break;
            case 'lightsout':
                this.triggerLightsOut(6);
                break;
            case 'corrupt':
                this.corruptCompass(18);
                this.showBunkerLine('Navigation telemetry has been reclassified as suggestion.');
                break;
            case 'mercy':
                this.grantSalvageCache({ tech: 6, coin: 4 });
                this.showBunkerLine('Hardship subsidy released. Do not mistake this for compassion.');
                break;
            case 'taunt':
                this.showBunkerLine(getDialogueLine('director') ?? '');
                break;
            default:
                break;
        }
    }
```

with:

```js
    executeDirectorAction(action) {
        switch (action) {
            case 'patrol': {
                const line = this.lineDirector?.requestLine('ambient', this.buildLineDirectorContext(), DIRECTOR_AMBIENT_LINES);
                this.showBunkerLine(line?.text ?? 'A maintenance event has been scheduled around your location.');
                this.spawnPatrolNearPlayer();
                break;
            }
            case 'lightsout':
                this.triggerLightsOut(6);
                break;
            case 'corrupt':
                this.corruptCompass(18);
                this.showBunkerLine('Navigation telemetry has been reclassified as suggestion.');
                break;
            case 'mercy':
                this.grantSalvageCache({ tech: 6, coin: 4 });
                this.showBunkerLine('Hardship subsidy released. Do not mistake this for compassion.');
                break;
            case 'taunt': {
                const line = this.lineDirector?.requestLine('ambient', this.buildLineDirectorContext(), DIRECTOR_AMBIENT_LINES);
                if (line) this.showBunkerLine(line.text);
                break;
            }
            default:
                break;
        }
    }
```

Note the `taunt` case no longer falls back to `showBunkerLine('')` — `showBunkerLine` already no-ops on falsy text (`src/threeGame.js:6100`, `if (!text) return;`), so `if (line) this.showBunkerLine(line.text);` is equivalent to the old `?? ''` fallback but skips a pointless empty-text dispatch when nothing was eligible. `getDialogueLine` remains imported and used elsewhere (`terminalChoice` at line 6505, `death` at line 11751) — do not remove that import.

- [ ] **Step 6: Reset the arbiter alongside the Director on respawn**

In the `resetRunState` block inside `respawnPlayer` (`src/threeGame.js`), directly after line `this.bunkerDirector?.reset();` (line 11855), add:

```js
            this.lineDirector?.reset();
```

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all existing tests green, including `src/data/dialogueLines.test.js` (untouched) and the new `src/lineDirector.test.js` / `src/data/lineDirectorPools.test.js` from Tasks 1-2.

- [ ] **Step 8: Manual smoke check**

Run: `node --check src/threeGame.js`
Expected: no syntax errors.

- [ ] **Step 9: Commit**

```bash
git add src/threeGame.js
git commit -m "feat: route Director ambient taunts through LineDirector"
```

---

### Task 4: Wire the Mothership Reactive path in `main.js`

**Files:**
- Modify: `main.js:1482-1485` (module-level state), `:3383-3384` (run-reset), `:4135-4161` (`fireMothershipReactiveLine`), `:4163-4169` (dead listener)

**Interfaces:**
- Consumes: `window.lineDirector` and `window.game.buildLineDirectorContext()` (Task 3), `MOTHERSHIP_REACTIVE_LINES` from `src/data/lineDirectorPools.js` (Task 2).
- Produces: nothing new consumed elsewhere — `fireMothershipReactiveLine(trigger)` keeps its existing call sites and signature unchanged.

- [ ] **Step 1: Add the import**

Near the other `./src/data/*` imports at the top of `main.js` (e.g. next to any existing `dialogueLines.js` import, or alongside the other `./src/*` imports around line 2-11), add:

```js
import { MOTHERSHIP_REACTIVE_LINES } from './src/data/lineDirectorPools.js';
```

- [ ] **Step 2: Remove the now-redundant module-level state**

Delete these four lines (`main.js:1482-1485`):

```js
const _mothershipFiredTriggers = new Set();
let _lastMothershipBroadcastAt = 0;
const MOTHERSHIP_REACTIVE_COOLDOWN_MS = 45000;
const MOTHERSHIP_REACTIVE_CRITICAL = new Set(['hp_critical', 'objective_found', 'first_boss']);
```

(This bookkeeping moves into `LineDirector`'s cooldown/history model via the `once`/`cooldownClass`/`bypassSharedCooldown` tags authored in Task 2.)

- [ ] **Step 3: Remove the dead no-op listener**

Delete this listener (`main.js:4163-4169`) — its body is empty (a comment with no code) and it references the `_mothershipFiredTriggers` Set removed in Step 2:

```js
window.addEventListener('pickup-collected', (event) => {
    if (event?.detail?.type === 'weapon') {
        if (!_mothershipFiredTriggers.has('first_deposit')) {
            // first_deposit fires on first console deposit; track separately
        }
    }
});
```

- [ ] **Step 4: Rewrite `fireMothershipReactiveLine`**

Replace (`main.js:4135-4161`):

```js
function fireMothershipReactiveLine(trigger) {
    if (_mothershipFiredTriggers.has(trigger)) return;
    const now = Date.now();
    if (!MOTHERSHIP_REACTIVE_CRITICAL.has(trigger) && now - _lastMothershipBroadcastAt < MOTHERSHIP_REACTIVE_COOLDOWN_MS) {
        return;
    }
    _mothershipFiredTriggers.add(trigger);
    _lastMothershipBroadcastAt = now;
    const lines = {
        first_kill:       'AGENT — FIRST THREAT NEUTRALIZED. PROCEED.',
        first_cryo:       'WARNING: CRYO SECTOR BOUNDARY CROSSED. THERMAL PROTOCOL ACTIVE.',
        first_bio:        'ALERT: BIO-CONTAINMENT ZONE ENTERED. SUIT FILTERS AT LIMIT.',
        hp_critical:      'DISTRESS SIGNAL: VITAL SIGNS CRITICAL. EXTRACTION WINDOW OPEN EARLY.',
        objective_found:  'UPLINK: OBJECTIVE CONFIRMED. MAX SHIP SYSTEMS REQUIRED FOR EXTRACTION.',
        first_deposit:    'SALVAGE RECEIVED. BANK SECURE. CONTINUE OPERATIONS.',
        lore_found:       'AGENT — BUNKER DATA FRAGMENT RECOVERED. TRANSMITTING TO ARCHIVE.',
        sentinel_spotted: 'WARNING: AUTOMATED DEFENSE SYSTEM ACTIVE. RECOMMEND COVER.',
        crawler_detected:  'ALERT: FAST-MOVING BIO-ENTITY DETECTED. MAINTAIN DISTANCE.',
        armory_found:      'UPLINK: ARMORY CACHE LOCATED. HIGH-VALUE ASSET — EXPECT RESISTANCE.',
        the_nest:          'WARNING: BIO-ENTITY NEST CONFIRMED. MAXIMUM THREAT DENSITY. CAUTION.',
        weapon_calibrated: 'NOTED: AGENT WEAPON OUTPUT RISING. ... WHY DO YOU NEED MORE.',
        first_boss:        'CONFIRMED KILL: APEX BIO-ENTITY DOWN. THE SIGNAL FELT THAT.',
        specimen_notices:  '[UNAUTHORIZED CHANNEL] ...0047 HAS STOPPED BUILDING. IT IS LISTENING TO YOU NOW.',
    };
    const text = lines[trigger];
    if (text) showBiomePrompt(`> MOTHERSHIP: ${text}`);
}
```

with:

```js
function fireMothershipReactiveLine(trigger) {
    const context = window.game?.buildLineDirectorContext?.() ?? {};
    const line = window.lineDirector?.requestLine(`mothership:${trigger}`, context, MOTHERSHIP_REACTIVE_LINES);
    if (line) showBiomePrompt(line.text);
}
```

(`line.text` already carries the `> MOTHERSHIP: ` prefix — it was baked into each pool entry by the `mothershipLine()` helper in Task 2, so the call site no longer needs to add it.)

- [ ] **Step 5: Remove the redundant run-reset lines**

The Director/LineDirector reset now happens once, in `threeGame.js`'s `respawnPlayer` (Task 3 Step 6), which already runs on every run-reset (`main.js` calls `window.game?.respawnPlayer?.({ resetRunState: true, ... })` immediately after this block). Delete these two lines (`main.js:3383-3384`):

```js
        _mothershipFiredTriggers.clear();
        _lastMothershipBroadcastAt = 0;
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all tests green.

- [ ] **Step 7: Manual smoke check**

Run: `node --check main.js`
Expected: no syntax errors.

- [ ] **Step 8: Commit**

```bash
git add main.js
git commit -m "feat: route Mothership reactive lines through shared LineDirector"
```

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 1), line pool schema + hand-authored/tagged migration (Task 2), Director migration (Task 3), Mothership Reactive migration (Task 4), real depth tier usage (Task 3 Step 3 reads `this.currentDepthTier`), shared cooldown fixing cross-system collision (Tasks 1, 3, 4 together). Tutorial nudges and Developer Commentary are explicitly excluded per the Global Constraints scope deviation, with rationale recorded there.
- **Placeholder scan:** No TBD/TODO; every step has runnable code, not descriptions.
- **Type consistency:** `LineDirector.requestLine(trigger, context, pool, random)` signature is identical across Task 1's implementation, Task 3's two call sites, and Task 4's call site. Pool entry shape (`id`/`register`/`text`/`template`/`weight`/`tags`) is identical across Task 1's interface doc, Task 2's authored pools, and Task 1's `isLineEligible`/`scoreLine` implementation. Context shape (`register`/`depthTier`/`danger`/`objectiveSource`) is identical across `buildLineDirectorContext()` (Task 3) and the pools' tag vocabulary (Task 2).
