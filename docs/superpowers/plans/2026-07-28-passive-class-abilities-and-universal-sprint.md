# Passive Class Abilities & Universal Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-class, F-key-triggered, cooldown-gated "class ability" (SCOUT sprint burst / TANK brace / ENGINEER reroute) with always-on passives (SCOUT EVASIVE, TANK BULWARK, ENGINEER AUTO-TURRET), and add a standalone hold-to-sprint mechanic usable by every class.

**Architecture:** `CLASS_STATS` gains passive baseline fields instead of ability-trigger fields. A new pure-ish method `resolveClassPassiveStats()` (modeled on the existing `resolveFallDamage()` pattern) computes tiered passive values from skill-tree unlocks; three call sites assign its output onto `this`. The old `classAbility` state machine, its F-key/gamepad/pointerdown triggers, and every `classAbility.active`-gated bonus are deleted. A new `sprinting` boolean + `updateSprintState()` reuse the existing `_abilityMoveSpeedMult`/`_abilityO2DrainMult` hook points (renamed) already read by movement and O2-drain code. ENGINEER's turret reuses `spawnProjectile()`'s existing `isEnemy: false` player-projectile path and `isEnemyType()` targeting — no new collision system needed.

**Tech Stack:** Vanilla JS, Three.js, Vitest. No new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-passive-class-abilities-and-universal-sprint-design.md` — every numeric value below (1.6x/2.5x sprint, 50%/75%/100% slow-resist, -20%/-35% reload, 20%/30%/40% block chance, +1hp/60s regen, 20s/15s turret interval, 6s/9s duration, -25% fire interval) comes from that spec and must match exactly.
- Skill-tree node `id`, `cost`, `prereqs`, `prereqMode`, `requiredGoal`, `requiredO2Level`, `row`, `col` in `src/bank.js` are UNCHANGED — only `label`/`desc` strings change.
- Enemy "corrupted operator" ability telegraph text (`src/threeGame.js` ~line 4962-4996, `state.classType === 'SCOUT' ? 'BLINK' ...`) is OUT OF SCOPE — do not touch.
- The `dash` action (Space/ShiftLeft, `triggerGameplayDash`) is a separate, pre-existing mechanic — do not touch it.
- Follow the existing test pattern in `src/threeGame.damageRounding.test.js`: call `ThreeGame.prototype.<method>.call(fakeThis, ...)` with a minimal fake `this` object containing only the fields the method under test touches.
- Run `npx vitest run <file>` after every test-writing step, and `npm test` + `npx eslint <changed files>` at the end of every task.

---

### Task 1: `resolveClassPassiveStats()` + CLASS_STATS passive fields

**Files:**
- Modify: `src/threeGame.js:116-120` (CLASS_STATS)
- Modify: `src/threeGame.js` (add new method near `resolveFallDamage`, e.g. after line ~10862)
- Test: `src/threeGame.classPassives.test.js` (new)

**Interfaces:**
- Produces: `CLASS_STATS[type]` now has shape `{ moveSpeed, o2DrainMult, pickupMagnetRadius, projectileDamage, passiveName, passiveDescription }` (no more `abilityKey`/`abilityLabel`/`abilityCooldown`/`abilityDuration`/`unlockSkill`).
- Produces: `resolveClassPassiveStats(playerType)` — reads `this.bank`, returns `{ slowResistMult, reloadSpeedMult, blockChance, tankRegenEnabled, turretInterval, turretFireInterval, turretDuration }`. Called by Task 2 (`_initClassPassives`).

- [ ] **Step 1: Write the failing test**

Create `src/threeGame.classPassives.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeFakeBank(unlockedIds = []) {
    return { isSkillUnlocked: (id) => unlockedIds.includes(id) };
}

describe('resolveClassPassiveStats', () => {
    it('gives SCOUT base 50% slow-resist and -20% reload with no skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank([]) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBeCloseTo(0.5);
        expect(stats.reloadSpeedMult).toBeCloseTo(0.8);
    });

    it('bumps SCOUT slow-resist to 75% duration-mult 0.25 with scout_special_unlock', () => {
        const fakeThis = { bank: makeFakeBank(['scout_special_unlock']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBeCloseTo(0.25);
    });

    it('gives SCOUT full slow immunity (mult 0) with scout_special_upgrade_2', () => {
        const fakeThis = { bank: makeFakeBank(['scout_special_unlock', 'scout_special_upgrade_2']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBe(0);
    });

    it('gives SCOUT -35% reload with scout_special_upgrade_1', () => {
        const fakeThis = { bank: makeFakeBank(['scout_special_unlock', 'scout_special_upgrade_1']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.reloadSpeedMult).toBeCloseTo(0.65);
    });

    it('gives TANK base 20% block chance with no skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank([]) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'TANK');
        expect(stats.blockChance).toBeCloseTo(0.2);
        expect(stats.tankRegenEnabled).toBe(false);
    });

    it('bumps TANK block chance to 40% and enables regen with both upgrades', () => {
        const fakeThis = { bank: makeFakeBank(['tank_special_unlock', 'tank_special_upgrade_1', 'tank_special_upgrade_2']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'TANK');
        expect(stats.blockChance).toBeCloseTo(0.4);
        expect(stats.tankRegenEnabled).toBe(true);
    });

    it('gives ENGINEER base 20s interval / 6s duration / 1.2s fire interval with no skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank([]) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'ENGINEER');
        expect(stats.turretInterval).toBe(20);
        expect(stats.turretDuration).toBe(6);
        expect(stats.turretFireInterval).toBeCloseTo(1.2);
    });

    it('improves ENGINEER turret with all three skills unlocked', () => {
        const fakeThis = { bank: makeFakeBank(['engineer_special_unlock', 'engineer_special_upgrade_1', 'engineer_special_upgrade_2']) };
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'ENGINEER');
        expect(stats.turretDuration).toBe(9);
        expect(stats.turretFireInterval).toBeCloseTo(0.9);
        expect(stats.turretInterval).toBe(15);
    });

    it('returns safe neutral defaults with no bank attached', () => {
        const fakeThis = {};
        const stats = ThreeGame.prototype.resolveClassPassiveStats.call(fakeThis, 'SCOUT');
        expect(stats.slowResistMult).toBeCloseTo(0.5);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: FAIL — `resolveClassPassiveStats is not a function`.

- [ ] **Step 3: Replace CLASS_STATS**

Replace `src/threeGame.js:116-120`:

```js
const CLASS_STATS = {
    SCOUT:    { moveSpeed: 4.8, o2DrainMult: 1.25, pickupMagnetRadius: 4.2, projectileDamage: 1, passiveName: 'EVASIVE', passiveDescription: 'Reduced duration from enemy slow/freeze effects. Faster reload.' },
    TANK:     { moveSpeed: 2.6, o2DrainMult: 0.75, pickupMagnetRadius: 2.8, projectileDamage: 2, passiveName: 'BULWARK', passiveDescription: 'Chance to fully block incoming damage.' },
    ENGINEER: { moveSpeed: 3.6, o2DrainMult: 1.0,  pickupMagnetRadius: 3.4, projectileDamage: 1, passiveName: 'AUTO-TURRET', passiveDescription: 'Periodically deploys an automated turret that fires on nearby enemies.' }
};
```

- [ ] **Step 4: Add `resolveClassPassiveStats()`**

Add after `resolveFallDamage()` (near `src/threeGame.js:10862`):

```js
    resolveClassPassiveStats(playerType) {
        const bank = this.bank;
        const unlocked = (id) => Boolean(bank && bank.isSkillUnlocked && bank.isSkillUnlocked(id));
        const stats = {
            slowResistMult: 1.0,
            reloadSpeedMult: 1.0,
            blockChance: 0,
            tankRegenEnabled: false,
            turretInterval: 0,
            turretFireInterval: 0,
            turretDuration: 0
        };
        if (playerType === 'SCOUT') {
            stats.slowResistMult = 0.5;
            stats.reloadSpeedMult = 0.8;
            if (unlocked('scout_special_unlock')) stats.slowResistMult = 0.25;
            if (unlocked('scout_special_upgrade_1')) stats.reloadSpeedMult = 0.65;
            if (unlocked('scout_special_upgrade_2')) stats.slowResistMult = 0;
        } else if (playerType === 'TANK') {
            stats.blockChance = 0.2;
            if (unlocked('tank_special_unlock')) stats.blockChance = 0.3;
            if (unlocked('tank_special_upgrade_1')) stats.blockChance = 0.4;
            if (unlocked('tank_special_upgrade_2')) stats.tankRegenEnabled = true;
        } else if (playerType === 'ENGINEER') {
            stats.turretInterval = 20;
            stats.turretFireInterval = 1.2;
            stats.turretDuration = 6;
            if (unlocked('engineer_special_unlock')) stats.turretDuration = 9;
            if (unlocked('engineer_special_upgrade_1')) stats.turretFireInterval = 0.9;
            if (unlocked('engineer_special_upgrade_2')) stats.turretInterval = 15;
        }
        return stats;
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add src/threeGame.js src/threeGame.classPassives.test.js
git commit -m "feat(class): add resolveClassPassiveStats and passive CLASS_STATS fields"
```

---

### Task 2: Remove class-ability trigger system, add universal Sprint

**Files:**
- Modify: `src/threeGame.js` (multiple locations, listed below)
- Test: `src/threeGame.sprint.test.js` (new)

**Interfaces:**
- Consumes: `CLASS_STATS[type].passiveName/passiveDescription` (Task 1), `resolveClassPassiveStats()` (Task 1).
- Produces: `this.sprinting` (bool), `updateSprintState(delta)`, `_initClassPassives()` (replaces `_initClassAbility`), `getClassPassiveInfo()` (replaces `getClassAbilityInfo`). Consumed by Task 3/4/5 (`_initClassPassives` is where their runtime timers get reset) and Task 7 (main.js reads `getClassPassiveInfo`).

- [ ] **Step 1: Write the failing sprint test**

Create `src/threeGame.sprint.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('updateSprintState', () => {
    function makeFakeThis(overrides = {}) {
        return {
            sprinting: false,
            playerVitals: { o2: 100 },
            isGameplayInputActive: () => true,
            ...overrides
        };
    }

    it('applies 1.6x move / 2.5x O2-drain multipliers while sprinting with O2 available', () => {
        const fakeThis = makeFakeThis({ sprinting: true });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBeCloseTo(1.6);
        expect(fakeThis._sprintO2DrainMult).toBeCloseTo(2.5);
    });

    it('applies no multiplier when not sprinting', () => {
        const fakeThis = makeFakeThis({ sprinting: false });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBe(1.0);
        expect(fakeThis._sprintO2DrainMult).toBe(1.0);
    });

    it('stops applying the multiplier once O2 hits 0', () => {
        const fakeThis = makeFakeThis({ sprinting: true, playerVitals: { o2: 0 } });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBe(1.0);
    });

    it('does not apply the multiplier while gameplay input is inactive', () => {
        const fakeThis = makeFakeThis({ sprinting: true, isGameplayInputActive: () => false });
        ThreeGame.prototype.updateSprintState.call(fakeThis, 0.016);
        expect(fakeThis._sprintMoveSpeedMult).toBe(1.0);
    });
});

describe('setKeyState — sprint is hold-based, not a one-shot trigger', () => {
    function makeFakeThis() {
        return {
            keys: { up: false, down: false, left: false, right: false },
            sprinting: false,
            isGameplayInputActive: () => true,
            codeMatchesAction: ThreeGame.prototype.codeMatchesAction,
            bank: null
        };
    }

    it('sets sprinting true on press and false on release', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.setKeyState.call(fakeThis, 'ShiftLeft', true);
        expect(fakeThis.sprinting).toBe(true);
        ThreeGame.prototype.setKeyState.call(fakeThis, 'ShiftLeft', false);
        expect(fakeThis.sprinting).toBe(false);
    });
});

describe('setVirtualInputSprint — gamepad/touch hold state', () => {
    it('mirrors the active flag while gameplay input is active', () => {
        const fakeThis = { isGameplayInputActive: () => true };
        expect(ThreeGame.prototype.setVirtualInputSprint.call(fakeThis, true)).toBe(true);
        expect(fakeThis.sprinting).toBe(true);
        expect(ThreeGame.prototype.setVirtualInputSprint.call(fakeThis, false)).toBe(false);
        expect(fakeThis.sprinting).toBe(false);
    });

    it('forces sprinting false when gameplay input is inactive', () => {
        const fakeThis = { isGameplayInputActive: () => false };
        ThreeGame.prototype.setVirtualInputSprint.call(fakeThis, true);
        expect(fakeThis.sprinting).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.sprint.test.js`
Expected: FAIL — `updateSprintState is not a function`.

- [ ] **Step 3: Add sprint state fields to the constructor**

In `src/threeGame.js`, right after `this.pickupMagnetRadius = _initialStats.pickupMagnetRadius ?? PICKUP_MAGNET_RADIUS;` (line 727), add:

```js
        this.sprinting = false;
        this._sprintMoveSpeedMult = 1.0;
        this._sprintO2DrainMult = 1.0;
        this._wasSprinting = false;
```

- [ ] **Step 4: Add `updateSprintState(delta)`**

Add it next to the other `update*` methods (e.g. right before `updateVitals(delta)` at line 11707):

```js
    updateSprintState(delta) {
        const active = Boolean(this.sprinting) && this.isGameplayInputActive() && (this.playerVitals?.o2 ?? 0) > 0;
        this._sprintMoveSpeedMult = active ? 1.6 : 1.0;
        this._sprintO2DrainMult = active ? 2.5 : 1.0;
        if (active && !this._wasSprinting) {
            window.AudioManager?.play('fx_scout_sprint', { volume: 0.45, bus: 'sfx' });
        }
        this._wasSprinting = active;
    }
```

- [ ] **Step 5: Run test to verify it passes (sprint state + key handling only so far)**

Run: `npx vitest run src/threeGame.sprint.test.js`
Expected: still FAIL on the `setKeyState`/`setVirtualInputSprint` tests — those methods haven't been rewritten yet. Continue to the next steps.

- [ ] **Step 6: Rewrite `setKeyState` and `setVirtualInputSprint`, delete `triggerSprintBurst`**

Replace `src/threeGame.js:3601-3611` (`setKeyState`):

```js
    setKeyState(code, pressed) {
        if (!this.isGameplayInputActive() && pressed) return;
        if (this.codeMatchesAction(code, 'moveUp')) this.keys.up = pressed;
        if (this.codeMatchesAction(code, 'moveDown')) this.keys.down = pressed;
        if (this.codeMatchesAction(code, 'moveLeft')) this.keys.left = pressed;
        if (this.codeMatchesAction(code, 'moveRight')) this.keys.right = pressed;
        if (this.codeMatchesAction(code, 'sprint')) this.sprinting = pressed;
    }
```

Replace `src/threeGame.js:3631-3643` (`setVirtualInputSprint` and `triggerSprintBurst`) with just:

```js
    setVirtualInputSprint(active = false) {
        if (!this.isGameplayInputActive()) {
            this.sprinting = false;
            return false;
        }
        this.sprinting = Boolean(active);
        return this.sprinting;
    }
```

(`triggerSprintBurst` is deleted — nothing else calls it after this task.)

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/threeGame.sprint.test.js`
Expected: PASS (6 tests).

- [ ] **Step 8: Remove the F-key/gamepad ability trigger and the old classAbility system**

Delete the ability keydown block at `src/threeGame.js:3127-3131`:

```js
            if (this.codeMatchesAction(event.code, 'ability')) {
                event.preventDefault();
                debugLog.debug('INPUT', 'Action: CLASS ABILITY (Q/Space)');
                this.triggerGameplayAbility();
            }
```

Delete `triggerGameplayAbility()` (`src/threeGame.js:3362-3367`).

Replace `_initClassAbility()` (`src/threeGame.js:11251-11283`) with:

```js
    _initClassPassives() {
        Object.assign(this, this.resolveClassPassiveStats(this.playerType));
        this.turretCooldownTimer = this.turretInterval;
        this.turretActiveTimer = 0;
        this.tankRegenTimer = 0;
    }
```

(This intentionally does NOT reference the turret mesh yet — `despawnEngineerTurret()` doesn't exist until Task 5. Task 5 Step 4 extends this same method with the turret-despawn line once that method exists. Calling an undefined method here would throw on every class switch/run-reset between this task and Task 5.)

Delete `isSpecialAbilityUnlocked()`, `triggerClassAbility()`, and `updateClassAbility(delta)` in their entirety (originally at `src/threeGame.js:11285-11393`; Task 1's new method shifted this down by ~30 lines, so locate by the method signatures below rather than the raw line numbers). Their exact bodies to remove:

```js
    isSpecialAbilityUnlocked() {
        const stats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        return !stats.unlockSkill || this.bank?.isSkillUnlocked?.(stats.unlockSkill);
    }

    triggerClassAbility() {
        if (!this.isGameplayInputActive()) return;
        if (!this.isSpecialAbilityUnlocked()) {
            window.AudioManager?.play('ui_error', { volume: 0.32, playbackRate: 0.9, bus: 'sfx' });
            this.showBunkerLine('MOTHERSHIP: EXOSUIT SPECIAL OFFLINE. UNLOCK IN SKILL TREE [TAB].');
            return;
        }
        if (this.classAbility.cooldownRemaining > 0) {
            window.AudioManager?.play('ui_error', { volume: 0.3, playbackRate: 1.4, bus: 'sfx' });
            return;
        }
        this.classAbility.active = true;
        this.classAbility.activeTimer = 0;
        this.classAbility.cooldownRemaining = this.classAbility.cooldownMax;

        const abilityKey = CLASS_STATS[this.playerType]?.abilityKey ?? 'sprint';
        window.dispatchEvent(new CustomEvent('class-ability-activated', {
            detail: { ability: abilityKey, playerType: this.playerType }
        }));
        window.AudioManager?.play('ui_boot', { volume: 0.42, playbackRate: abilityKey === 'fortify' ? 0.72 : 1.15, bus: 'sfx' });

        if (abilityKey === 'sprint') {
            window.AudioManager?.play('fx_scout_sprint', { volume: 0.45, bus: 'sfx' });
            const videoSprite = new KeyedVideoSprite('/fx_scout_sprint.webm', {
                width: 2.2,
                height: 2.2,
                threshold: 0.05,
                edgeSoftness: 0.05,
                loop: false
            });
            const spriteObj = videoSprite.getSprite();
            if (spriteObj && this.player) {
                spriteObj.position.copy(this.player.position);
                spriteObj.position.y = 0.55;
                this.scene.add(spriteObj);
                this.transientEffects.push({
                    videoSprite,
                    spriteObj,
                    age: 0,
                    maxAge: 1.0,
                    update(dt) {
                        this.age += dt;
                    },
                    dispose() {
                        videoSprite.dispose();
                    }
                });
            }
        } else if (abilityKey === 'fortify') {
            window.AudioManager?.play('fx_tank_shockwave', { volume: 0.55, bus: 'sfx' });
        } else if (abilityKey === 'overclock') {
            window.AudioManager?.play('fx_engineer_turret', { volume: 0.48, bus: 'sfx' });
        }
    }

    updateClassAbility(delta) {
        // Tick cooldown
        if (this.classAbility.cooldownRemaining > 0) {
            this.classAbility.cooldownRemaining = Math.max(0, this.classAbility.cooldownRemaining - delta);
        }

        // Reset per-frame multipliers
        this._abilityMoveSpeedMult = 1.0;
        this._abilityImmune = false;
        this._abilityO2DrainMult = 1.0;
        this._abilityRefillMult = 1.0;

        const abilityKey = CLASS_STATS[this.playerType]?.abilityKey;
        if (this.classAbility.active) {
            this.classAbility.activeTimer += delta;
            if (this.classAbility.activeTimer >= this.classAbility.activeDuration) {
                this.classAbility.active = false;
                window.dispatchEvent(new CustomEvent('class-ability-ended', {
                    detail: { ability: CLASS_STATS[this.playerType]?.abilityKey }
                }));
            } else if (abilityKey === 'sprint') {
                this._abilityMoveSpeedMult = 3.0;
                this._abilityO2DrainMult = 4.0;
                // Spawn trail particle every ~6 frames
                if (this.player && Math.random() < 0.45) {
                    this._spawnSprintTrail();
                }
            } else if (abilityKey === 'fortify') {
                this._abilityImmune = true;
                this._abilityMoveSpeedMult = 0;
            } else if (abilityKey === 'overclock') {
                this._abilityO2DrainMult = 0.5;
                this._abilityRefillMult = 3.0;
            }
        }

        const activeProgress = this.classAbility.active
            ? (this.classAbility.activeTimer / this.classAbility.activeDuration)
            : 0;
        window.dispatchEvent(new CustomEvent('ability-cooldown-tick', {
            detail: {
                remaining: this.classAbility.cooldownRemaining,
                max: this.classAbility.cooldownMax,
                active: this.classAbility.active,
                activeProgress,
                ability: abilityKey
            }
        }));
    }
```

All three methods are deleted with nothing replacing them (the `classAbility` state object itself was already removed when `_initClassAbility()` was replaced with `_initClassPassives()` in the previous step, so nothing else references `this.classAbility` after this step).

Replace `getClassAbilityInfo()` with:

```js
    getClassPassiveInfo() {
        const stats = CLASS_STATS[this.playerType] ?? CLASS_STATS.ENGINEER;
        return { name: stats.passiveName, description: stats.passiveDescription };
    }
```

Rename the three `_initClassAbility()` call sites to `_initClassPassives()`: constructor (`src/threeGame.js:904`), `updatePlayerType()` (`src/threeGame.js:3888`), and the run-reset method (`src/threeGame.js:11065`).

Replace the call site at `src/threeGame.js:4513`:

```js
        this.updateSprintState(delta);
```

(was `this.updateClassAbility(delta);`)

- [ ] **Step 9: Remove the `classAbility.active`-gated dead bonuses**

In `fireWeaponAtCurrentAim()`, delete (`src/threeGame.js:3546-3548`):

```js
        if (this.playerType === 'ENGINEER' && this.bank && this.bank.isSkillUnlocked('engineer_special_upgrade_1') && this.classAbility.active) {
            fireCd /= 1.20;
        }
```

leaving `this.weaponFireCooldown = fireCd;` reading the unmodified `WEAPON_FIRE_COOLDOWN`.

In `spawnPlayerShot()`, delete the matching projectile-speed bonus (`src/threeGame.js:13532-13534`):

```js
        if (this.playerType === 'ENGINEER' && this.bank && this.bank.isSkillUnlocked('engineer_special_upgrade_1') && this.classAbility.active) {
            speed *= 1.20;
        }
```

In the radar-scan trigger, delete (`src/threeGame.js:11564-11566`):

```js
        if (this.playerType === 'ENGINEER' && this.bank.isSkillUnlocked('engineer_special_upgrade_2') && this.classAbility.active) {
            cdMax *= 0.5;
        }
```

In `updateVitals()`, delete the refill-mult bonus (`src/threeGame.js:11737-11739`):

```js
            if (this.playerType === 'TANK' && this.bank && this.bank.isSkillUnlocked('tank_special_upgrade_2') && this.classAbility.active) {
                refillRate *= 1.20;
            }
```

and simplify the line above it from:

```js
            let refillRate = generatorState.refillRate * refillMult
                * (this._abilityRefillMult ?? 1.0);
```

to:

```js
            let refillRate = generatorState.refillRate * refillMult;
```

- [ ] **Step 10: Rewire movement/O2 to the renamed sprint multipliers, remove `fortifyActive`**

In `updatePlayer()`, replace (`src/threeGame.js:11934-11935`):

```js
        const fortifyActive = this.classAbility?.active && CLASS_STATS[this.playerType]?.abilityKey === 'fortify';
        const isMoving = Boolean(moveAxisX || moveAxisZ) && !fortifyActive;
```

with:

```js
        const isMoving = Boolean(moveAxisX || moveAxisZ);
```

Replace the speed calculation (`src/threeGame.js:11944-11947`):

```js
            let speed = this.moveSpeed * (this._abilityMoveSpeedMult ?? 1.0);
            if (this.playerSlowTimer > 0 && !(this._abilityMoveSpeedMult > 1)) {
                speed *= 0.55;
            }
```

with:

```js
            let speed = this.moveSpeed * (this._sprintMoveSpeedMult ?? 1.0);
            if (this.playerSlowTimer > 0 && !(this._sprintMoveSpeedMult > 1)) {
                speed *= 0.55;
            }
            if (this._sprintMoveSpeedMult > 1 && Math.random() < 0.45) {
                this._spawnSprintTrail();
            }
```

In `updateVitals()`, replace the O2-drain multiplier read (`src/threeGame.js:11746`, inside the `drainRate` expression):

```js
                * (this._abilityO2DrainMult ?? 1.0)
```

with:

```js
                * (this._sprintO2DrainMult ?? 1.0)
```

In `takeDamage()`, delete the now-dead immunity check (`src/threeGame.js:10868`):

```js
        if (this._abilityImmune) return;
```

In the menu-showcase demo animation, replace (`src/threeGame.js:4423`):

```js
            this._abilityMoveSpeedMult = Math.max(this._abilityMoveSpeedMult ?? 1, 2.5);
```

with:

```js
            this._sprintMoveSpeedMult = Math.max(this._sprintMoveSpeedMult ?? 1, 2.5);
```

- [ ] **Step 11: Run the full test suite**

Run: `npm test`
Expected: PASS — no test previously covered `classAbility`/`triggerClassAbility`/`triggerSprintBurst` (confirmed absent from the repo before this plan), so no regressions are expected. `src/threeGame.sprint.test.js` and `src/threeGame.classPassives.test.js` pass.

- [ ] **Step 12: Lint**

Run: `npx eslint src/threeGame.js src/threeGame.sprint.test.js`
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add src/threeGame.js src/threeGame.sprint.test.js
git commit -m "feat(class): remove triggered class-ability system, add universal hold-to-sprint"
```

---

### Task 3: SCOUT passive — EVASIVE (slow-resist + reload speed)

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.classPassives.test.js`

**Interfaces:**
- Consumes: `this.slowResistMult`, `this.reloadSpeedMult` (set by `_initClassPassives`/`updatePlayerType` via Task 1+2).
- Produces: `applyPlayerSlow(duration)` — new shared helper other systems call instead of assigning `this.playerSlowTimer` directly.

- [ ] **Step 1: Write the failing tests**

Append to `src/threeGame.classPassives.test.js`:

```js
describe('applyPlayerSlow — SCOUT passive slow-resistance', () => {
    it('applies the full duration when slowResistMult is 1.0 (non-Scout default)', () => {
        const fakeThis = { slowResistMult: 1.0, playerSlowTimer: 0 };
        ThreeGame.prototype.applyPlayerSlow.call(fakeThis, 3.0);
        expect(fakeThis.playerSlowTimer).toBeCloseTo(3.0);
    });

    it('halves the duration for SCOUT base passive (slowResistMult 0.5)', () => {
        const fakeThis = { slowResistMult: 0.5, playerSlowTimer: 0 };
        ThreeGame.prototype.applyPlayerSlow.call(fakeThis, 3.0);
        expect(fakeThis.playerSlowTimer).toBeCloseTo(1.5);
    });

    it('applies zero duration once SCOUT has full immunity (slowResistMult 0)', () => {
        const fakeThis = { slowResistMult: 0, playerSlowTimer: 0 };
        ThreeGame.prototype.applyPlayerSlow.call(fakeThis, 2.5);
        expect(fakeThis.playerSlowTimer).toBe(0);
    });
});

describe('startReload — SCOUT passive reload speed', () => {
    function makeFakeThis(overrides = {}) {
        return {
            weaponReloading: false,
            weaponClipSize: 8,
            weaponClipAmmo: 2,
            reloadSpeedMult: 1.0,
            getAvailableAmmo: () => 10,
            emitWeaponClipState: () => {},
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { AudioManager: { play: () => {} } };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('uses the full WEAPON_RELOAD_DURATION when reloadSpeedMult is 1.0', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.startReload.call(fakeThis);
        expect(fakeThis.weaponReloadDuration).toBeCloseTo(1.25);
        expect(fakeThis.weaponReloadTimer).toBeCloseTo(1.25);
    });

    it('shortens reload duration for SCOUT (reloadSpeedMult 0.8)', () => {
        const fakeThis = makeFakeThis({ reloadSpeedMult: 0.8 });
        ThreeGame.prototype.startReload.call(fakeThis);
        expect(fakeThis.weaponReloadDuration).toBeCloseTo(1.0);
        expect(fakeThis.weaponReloadTimer).toBeCloseTo(1.0);
    });
});
```

Add `beforeEach`/`afterEach`/`describe` to the existing `import` line at the top of the file (change to `import { describe, expect, it, beforeEach, afterEach } from 'vitest';`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: FAIL — `applyPlayerSlow is not a function`; `weaponReloadDuration` undefined.

- [ ] **Step 3: Add `applyPlayerSlow()` and use it at all three slow-inflicting call sites**

Add near `updateSprintState` in `src/threeGame.js`:

```js
    applyPlayerSlow(duration) {
        this.playerSlowTimer = duration * (this.slowResistMult ?? 1.0);
    }
```

Replace the three direct assignments:

`src/threeGame.js:18982` — `this.playerSlowTimer = 3.0; // slowed for 3 seconds` → `this.applyPlayerSlow(3.0); // slowed for 3 seconds (SCOUT passive reduces this)`

`src/threeGame.js:19058` — `this.playerSlowTimer = 2.5; // Jam and slow` → `this.applyPlayerSlow(2.5); // Jam and slow (SCOUT passive reduces this)`

`src/threeGame.js:19111` — `this.playerSlowTimer = 2.5; // Cryosnail slows player on hit` → `this.applyPlayerSlow(2.5); // Cryosnail slows player on hit (SCOUT passive reduces this)`

- [ ] **Step 4: Add `weaponReloadDuration` field and use it in `startReload`/`emitWeaponClipState`**

In the constructor, next to `this.weaponReloadTimer = 0;` (`src/threeGame.js:844`), add:

```js
        this.weaponReloadDuration = WEAPON_RELOAD_DURATION;
```

Replace `startReload()`'s duration assignment (`src/threeGame.js:13460-13461`):

```js
        this.weaponReloading = true;
        this.weaponReloadTimer = WEAPON_RELOAD_DURATION;
```

with:

```js
        this.weaponReloading = true;
        this.weaponReloadDuration = WEAPON_RELOAD_DURATION * (this.reloadSpeedMult ?? 1.0);
        this.weaponReloadTimer = this.weaponReloadDuration;
```

Replace the progress calculation in `emitWeaponClipState()` (`src/threeGame.js:10489-10490`):

```js
        const reloadProgress = this.weaponReloading
            ? Math.max(0, Math.min(1, 1 - (this.weaponReloadTimer / WEAPON_RELOAD_DURATION)))
            : 0;
```

with:

```js
        const reloadProgress = this.weaponReloading
            ? Math.max(0, Math.min(1, 1 - (this.weaponReloadTimer / (this.weaponReloadDuration || WEAPON_RELOAD_DURATION))))
            : 0;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: PASS (all tests including the new ones).

- [ ] **Step 6: Run full suite + lint**

Run: `npm test && npx eslint src/threeGame.js src/threeGame.classPassives.test.js`
Expected: PASS, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/threeGame.js src/threeGame.classPassives.test.js
git commit -m "feat(scout): add EVASIVE passive — slow-resistance and reload speed"
```

---

### Task 4: TANK passive — BULWARK (block chance + regen)

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.classPassives.test.js`

**Interfaces:**
- Consumes: `this.blockChance`, `this.tankRegenEnabled` (Task 1/2).
- Produces: `updateTankRegen(delta)`, called from the main loop next to `updateSprintState`.

- [ ] **Step 1: Write the failing tests**

Append to `src/threeGame.classPassives.test.js`:

```js
describe('takeDamage — TANK BULWARK block chance', () => {
    function makeFakeThis(overrides = {}) {
        return {
            isPlayerDead: false,
            godMode: false,
            cinematicLock: false,
            isInPocket: false,
            iFrameTimer: 0,
            missionState: { status: 'active' },
            playerVitals: { hp: 3, maxHp: 3 },
            playerType: 'TANK',
            blockChance: 1.0,
            showDirectionalHitIndicator: () => {},
            triggerCameraShake: () => {},
            emitHealthState: () => {},
            handleDeath: () => {},
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: () => {}, AudioManager: { play: () => {} } };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('fully negates damage when blockChance is 1.0', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'hazard');
        expect(fakeThis.playerVitals.hp).toBe(3);
    });

    it('applies full damage when blockChance is 0', () => {
        const fakeThis = makeFakeThis({ blockChance: 0 });
        ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'hazard');
        expect(fakeThis.playerVitals.hp).toBe(1);
    });

    it('does not block for non-TANK classes even with a nonzero blockChance', () => {
        const fakeThis = makeFakeThis({ playerType: 'SCOUT', blockChance: 1.0 });
        ThreeGame.prototype.takeDamage.call(fakeThis, 1, 'hazard');
        expect(fakeThis.playerVitals.hp).toBe(2);
    });
});

describe('updateTankRegen — TANK passive regeneration', () => {
    function makeFakeThis(overrides = {}) {
        return {
            playerType: 'TANK',
            tankRegenEnabled: true,
            tankRegenTimer: 0,
            playerVitals: { hp: 1, maxHp: 3 },
            emitHealthState: () => {},
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: () => {} };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('heals +1 heart after 60s below max integrity', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.updateTankRegen.call(fakeThis, 60);
        expect(fakeThis.playerVitals.hp).toBe(2);
        expect(fakeThis.tankRegenTimer).toBe(0);
    });

    it('does nothing before 60s have elapsed', () => {
        const fakeThis = makeFakeThis();
        ThreeGame.prototype.updateTankRegen.call(fakeThis, 30);
        expect(fakeThis.playerVitals.hp).toBe(1);
    });

    it('does not heal above max integrity and resets the timer while at max', () => {
        const fakeThis = makeFakeThis({ playerVitals: { hp: 3, maxHp: 3 }, tankRegenTimer: 45 });
        ThreeGame.prototype.updateTankRegen.call(fakeThis, 20);
        expect(fakeThis.playerVitals.hp).toBe(3);
        expect(fakeThis.tankRegenTimer).toBe(0);
    });

    it('does nothing when tankRegenEnabled is false', () => {
        const fakeThis = makeFakeThis({ tankRegenEnabled: false });
        ThreeGame.prototype.updateTankRegen.call(fakeThis, 60);
        expect(fakeThis.playerVitals.hp).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: FAIL — block-chance tests fail (no such check in `takeDamage` yet), `updateTankRegen is not a function`.

- [ ] **Step 3: Add the block-chance check to `takeDamage()`**

In `src/threeGame.js`, right after the existing early-return guards and before `const previousHp = this.playerVitals.hp;` (i.e. immediately after the `if (this.missionState?.status === 'inactive') return;` line), add:

```js
        if (this.playerType === 'TANK' && Math.random() < (this.blockChance ?? 0)) {
            window.AudioManager?.play('fx_tank_shockwave', { volume: 0.4, bus: 'sfx' });
            window.dispatchEvent(new CustomEvent('player-blocked', { detail: { reason } }));
            return;
        }
```

- [ ] **Step 4: Add `updateTankRegen(delta)`**

Add next to `updateSprintState`:

```js
    updateTankRegen(delta) {
        if (this.playerType !== 'TANK' || !this.tankRegenEnabled) return;
        if (this.playerVitals.hp >= this.playerVitals.maxHp) {
            this.tankRegenTimer = 0;
            return;
        }
        this.tankRegenTimer = (this.tankRegenTimer ?? 0) + delta;
        if (this.tankRegenTimer >= 60) {
            this.tankRegenTimer = 0;
            this.playerVitals.hp = Math.min(this.playerVitals.maxHp, this.playerVitals.hp + 1);
            this.emitHealthState();
            window.dispatchEvent(new CustomEvent('player-regen', { detail: { hp: this.playerVitals.hp } }));
        }
    }
```

Wire it into the main loop next to the `updateSprintState` call (`src/threeGame.js:4513`):

```js
        this.updateSprintState(delta);
        this.updateTankRegen(delta);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: PASS.

- [ ] **Step 6: Run full suite + lint**

Run: `npm test && npx eslint src/threeGame.js src/threeGame.classPassives.test.js`
Expected: PASS, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/threeGame.js src/threeGame.classPassives.test.js
git commit -m "feat(tank): add BULWARK passive — block chance and passive regeneration"
```

---

### Task 5: ENGINEER passive — AUTO-TURRET

**Files:**
- Modify: `src/threeGame.js`
- Test: `src/threeGame.classPassives.test.js`

**Interfaces:**
- Consumes: `this.turretInterval`, `this.turretFireInterval`, `this.turretDuration` (Task 1/2), `spawnProjectile({x,z,vx,vz,ttl,damage,radius})` (existing, `isEnemy` defaults false), `isEnemyType(type)` (existing).
- Produces: `updateEngineerTurret(delta)`, `deployEngineerTurret()`, `despawnEngineerTurret()`, `fireEngineerTurret()`, `findNearestEnemyWithinRange(x, z, range)`. Dispatches `engineer-turret-tick` CustomEvent, consumed by Task 7 (main.js HUD).

- [ ] **Step 1: Write the failing tests**

Append to `src/threeGame.classPassives.test.js`:

```js
describe('findNearestEnemyWithinRange', () => {
    function makeSprite(x, z, type = 'cybersnail') {
        return { parent: {}, position: { x, z }, userData: { type } };
    }

    it('returns the closest enemy-type sprite within range', () => {
        const near = makeSprite(1, 0);
        const far = makeSprite(5, 0);
        const fakeThis = {
            scatterSprites: [far, near],
            isEnemyType: ThreeGame.prototype.isEnemyType
        };
        const result = ThreeGame.prototype.findNearestEnemyWithinRange.call(fakeThis, 0, 0, 8);
        expect(result).toBe(near);
    });

    it('ignores sprites outside the search range', () => {
        const tooFar = makeSprite(20, 0);
        const fakeThis = {
            scatterSprites: [tooFar],
            isEnemyType: ThreeGame.prototype.isEnemyType
        };
        expect(ThreeGame.prototype.findNearestEnemyWithinRange.call(fakeThis, 0, 0, 8)).toBeNull();
    });

    it('ignores non-enemy sprites', () => {
        const loot = makeSprite(1, 0, 'weapon_pickup');
        const fakeThis = {
            scatterSprites: [loot],
            isEnemyType: ThreeGame.prototype.isEnemyType
        };
        expect(ThreeGame.prototype.findNearestEnemyWithinRange.call(fakeThis, 0, 0, 8)).toBeNull();
    });
});

describe('fireEngineerTurret', () => {
    it('spawns a player-faction projectile aimed at the nearest enemy', () => {
        const shots = [];
        const fakeThis = {
            activeTurret: { mesh: { position: { x: 0, z: 0 } } },
            scatterSprites: [{ parent: {}, position: { x: 3, z: 4 }, userData: { type: 'cybersnail' } }],
            isEnemyType: ThreeGame.prototype.isEnemyType,
            findNearestEnemyWithinRange: ThreeGame.prototype.findNearestEnemyWithinRange,
            spawnProjectile: (opts) => shots.push(opts)
        };
        ThreeGame.prototype.fireEngineerTurret.call(fakeThis);
        expect(shots.length).toBe(1);
        expect(shots[0].isEnemy).not.toBe(true);
        expect(shots[0].vx).toBeCloseTo(shots[0].vz * (3 / 4), 2);
    });

    it('does not fire when there is no enemy in range', () => {
        const shots = [];
        const fakeThis = {
            activeTurret: { mesh: { position: { x: 0, z: 0 } } },
            scatterSprites: [],
            isEnemyType: ThreeGame.prototype.isEnemyType,
            findNearestEnemyWithinRange: ThreeGame.prototype.findNearestEnemyWithinRange,
            spawnProjectile: (opts) => shots.push(opts)
        };
        ThreeGame.prototype.fireEngineerTurret.call(fakeThis);
        expect(shots.length).toBe(0);
    });
});

describe('updateEngineerTurret — deploy/despawn cycle', () => {
    function makeFakeThis(overrides = {}) {
        return {
            playerType: 'ENGINEER',
            activeTurret: null,
            turretCooldownTimer: 20,
            turretInterval: 20,
            turretFireInterval: 1.2,
            turretDuration: 6,
            player: { position: { x: 0, z: 0 } },
            scene: { add: () => {} },
            scatterSprites: [],
            isEnemyType: ThreeGame.prototype.isEnemyType,
            findNearestEnemyWithinRange: ThreeGame.prototype.findNearestEnemyWithinRange,
            spawnProjectile: () => {},
            despawnEngineerTurret: ThreeGame.prototype.despawnEngineerTurret,
            deployEngineerTurret: ThreeGame.prototype.deployEngineerTurret,
            fireEngineerTurret: ThreeGame.prototype.fireEngineerTurret,
            ...overrides
        };
    }

    let originalWindow;
    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: () => {}, AudioManager: { play: () => {} } };
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('deploys a turret once the redeploy timer reaches 0', () => {
        const fakeThis = makeFakeThis({ turretCooldownTimer: 0.01 });
        ThreeGame.prototype.updateEngineerTurret.call(fakeThis, 0.02);
        expect(fakeThis.activeTurret).not.toBeNull();
    });

    it('does nothing for non-ENGINEER classes', () => {
        const fakeThis = makeFakeThis({ playerType: 'TANK', turretCooldownTimer: 0 });
        ThreeGame.prototype.updateEngineerTurret.call(fakeThis, 1);
        expect(fakeThis.activeTurret).toBeNull();
    });

    it('despawns the turret and resets the cooldown once its duration expires', () => {
        const fakeThis = makeFakeThis({
            activeTurret: { mesh: { position: { x: 0, z: 0 }, parent: null }, timer: 0.01, fireTimer: 5 }
        });
        ThreeGame.prototype.updateEngineerTurret.call(fakeThis, 0.02);
        expect(fakeThis.activeTurret).toBeNull();
        expect(fakeThis.turretCooldownTimer).toBe(20);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: FAIL — `findNearestEnemyWithinRange`/`fireEngineerTurret`/`updateEngineerTurret`/`deployEngineerTurret`/`despawnEngineerTurret` are not functions.

- [ ] **Step 3: Add the turret constants and runtime fields**

Near the other `PROJECTILE_*` constants (`src/threeGame.js:195-198`), add:

```js
const TURRET_RANGE = 8.0;
const TURRET_DAMAGE = 1;
```

In the constructor, next to the sprint fields added in Task 2, add:

```js
        this.activeTurret = null;
        this.turretCooldownTimer = 0;
```

- [ ] **Step 4: Add `findNearestEnemyWithinRange`, `deployEngineerTurret`, `despawnEngineerTurret`, `fireEngineerTurret`, `updateEngineerTurret`**

Add these next to `_spawnSprintTrail()`:

```js
    findNearestEnemyWithinRange(x, z, range) {
        let nearest = null;
        let nearestDist = range;
        for (const sprite of this.scatterSprites) {
            if (!sprite?.parent) continue;
            if (!this.isEnemyType(sprite.userData?.type)) continue;
            if (sprite.userData?.burstTriggered) continue;
            const dist = Math.hypot(sprite.position.x - x, sprite.position.z - z);
            if (dist <= nearestDist) {
                nearest = sprite;
                nearestDist = dist;
            }
        }
        return nearest;
    }

    deployEngineerTurret() {
        const color = PLAYER_COLORS[this.playerType] ?? 0xffe08f;
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.26, 0.18, 8),
            new THREE.MeshBasicMaterial({ color: 0x222222 })
        );
        const barrel = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.5, 6),
            new THREE.MeshBasicMaterial({ color })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.y = 0.2;
        const group = new THREE.Group();
        group.add(base, barrel);
        group.position.set(this.player.position.x, 0.3, this.player.position.z);
        this.scene.add(group);

        this.activeTurret = { mesh: group, timer: this.turretDuration, fireTimer: this.turretFireInterval };
        window.AudioManager?.play('fx_engineer_turret', { volume: 0.48, bus: 'sfx' });
    }

    despawnEngineerTurret() {
        if (!this.activeTurret) return;
        const mesh = this.activeTurret.mesh;
        mesh?.parent?.remove(mesh);
        mesh?.traverse?.((child) => {
            child.material?.dispose?.();
            child.geometry?.dispose?.();
        });
        this.activeTurret = null;
    }

    fireEngineerTurret() {
        if (!this.activeTurret?.mesh) return;
        const tx = this.activeTurret.mesh.position.x;
        const tz = this.activeTurret.mesh.position.z;
        const target = this.findNearestEnemyWithinRange(tx, tz, TURRET_RANGE);
        if (!target) return;
        const dx = target.position.x - tx;
        const dz = target.position.z - tz;
        const len = Math.hypot(dx, dz) || 1;
        this.spawnProjectile({
            x: tx,
            z: tz,
            vx: (dx / len) * PROJECTILE_SPEED,
            vz: (dz / len) * PROJECTILE_SPEED,
            ttl: PROJECTILE_TTL,
            damage: TURRET_DAMAGE,
            radius: PROJECTILE_RADIUS
        });
    }

    updateEngineerTurret(delta) {
        if (this.playerType !== 'ENGINEER') return;
        if (this.activeTurret) {
            this.activeTurret.timer -= delta;
            this.activeTurret.fireTimer -= delta;
            if (this.activeTurret.fireTimer <= 0) {
                this.activeTurret.fireTimer = this.turretFireInterval;
                this.fireEngineerTurret();
            }
            if (this.activeTurret.timer <= 0) {
                this.despawnEngineerTurret();
                this.turretCooldownTimer = this.turretInterval;
            }
            window.dispatchEvent(new CustomEvent('engineer-turret-tick', {
                detail: { remaining: Math.max(0, this.activeTurret?.timer ?? 0), max: this.turretDuration, active: Boolean(this.activeTurret) }
            }));
            return;
        }
        this.turretCooldownTimer = Math.max(0, (this.turretCooldownTimer ?? this.turretInterval) - delta);
        window.dispatchEvent(new CustomEvent('engineer-turret-tick', {
            detail: { remaining: this.turretCooldownTimer, max: this.turretInterval, active: false }
        }));
        if (this.turretCooldownTimer <= 0) {
            this.deployEngineerTurret();
        }
    }
```

Now that `despawnEngineerTurret()` exists, extend `_initClassPassives()` (added in Task 2) to reset any turret left over from a previous run/class — add one line so it reads:

```js
    _initClassPassives() {
        Object.assign(this, this.resolveClassPassiveStats(this.playerType));
        this.turretCooldownTimer = this.turretInterval;
        this.turretActiveTimer = 0;
        this.despawnEngineerTurret();
        this.tankRegenTimer = 0;
    }
```

Wire `updateEngineerTurret` into the main loop next to `updateTankRegen` (`src/threeGame.js:4513`):

```js
        this.updateSprintState(delta);
        this.updateTankRegen(delta);
        this.updateEngineerTurret(delta);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/threeGame.classPassives.test.js`
Expected: PASS.

- [ ] **Step 6: Run full suite + lint**

Run: `npm test && npx eslint src/threeGame.js src/threeGame.classPassives.test.js`
Expected: PASS, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/threeGame.js src/threeGame.classPassives.test.js
git commit -m "feat(engineer): add AUTO-TURRET passive"
```

---

### Task 6: Skill tree relabel (bank.js)

**Files:**
- Modify: `src/bank.js:38-178`

**Interfaces:**
- Consumes: nothing new — `id`/`cost`/`prereqs`/`prereqMode`/`requiredGoal`/`requiredO2Level`/`row`/`col` are unchanged; only `label`/`desc` strings change to match the values `resolveClassPassiveStats()` (Task 1) actually implements.

- [ ] **Step 1: Update SCOUT nodes**

In `src/bank.js`, replace the three SCOUT special-tree nodes' `label`/`desc` (ids/costs/prereqs/rows unchanged):

`scout_special_unlock` (`src/bank.js:38-46`):
```js
            label: 'EVASIVE INSTINCT',
            desc: 'EVASIVE passive strengthened: enemy slow/freeze effect duration reduced by 75% (up from 50%).',
```

`scout_special_upgrade_1` (`src/bank.js:48-56`, label `WINDRUNNER`):
```js
            desc: 'Reload speed bonus increased to -35% (from -20%).',
```

`scout_special_upgrade_2` (`src/bank.js:58-66`, label `FAST RECOVERY`):
```js
            desc: 'EVASIVE passive fully negates enemy slow/freeze effects.',
```

- [ ] **Step 2: Update TANK nodes**

`tank_special_unlock` (`src/bank.js:94-102`):
```js
            label: 'HARDENED BULWARK',
            desc: 'BULWARK passive strengthened: block chance increased to 30% (from 20%).',
```

`tank_special_upgrade_1` (`src/bank.js:104-112`, label `IRON WALL`):
```js
            desc: 'BULWARK block chance increased to 40%.',
```

`tank_special_upgrade_2` (`src/bank.js:114-122`, label `AEGIS GENERATION`):
```js
            desc: 'Passively regenerate +1 heart every 60s while below max suit integrity.',
```

- [ ] **Step 3: Update ENGINEER nodes**

`engineer_special_unlock` (`src/bank.js:150-158`):
```js
            label: 'TURRET PROTOCOL',
            desc: 'AUTO-TURRET passive strengthened: active duration increased to 9s (from 6s).',
```

`engineer_special_upgrade_1` (`src/bank.js:160-168`, label `SYSTEM OVERCLOCK`):
```js
            desc: 'AUTO-TURRET fires 25% faster.',
```

`engineer_special_upgrade_2` (`src/bank.js:170-178`, label `SAFETY STANDARDS`):
```js
            desc: 'AUTO-TURRET redeploy cooldown reduced to 15s (from 20s).',
```

- [ ] **Step 4: Run the skill tree nav test**

Run: `npx vitest run src/threeGame.skillTreeNav.test.js`
Expected: PASS (this test covers tree navigation/structure, not label text, so it should be unaffected — confirms `id`/`prereqs`/`row`/`col` weren't accidentally changed).

- [ ] **Step 5: Lint**

Run: `npx eslint src/bank.js`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/bank.js
git commit -m "docs(skilltree): relabel class-special nodes as passive-strength tiers"
```

---

### Task 7: HUD wiring (main.js, index.html, style.css)

**Files:**
- Modify: `main.js:867-917` (gamepad input), `main.js:4281-4365` (HUD events/label sync)
- Modify: `index.html:746-751`
- Modify: `style.css:6200-6216`, `style.css:9899-9929`

**Interfaces:**
- Consumes: `window.game.getClassPassiveInfo()` (Task 2), `engineer-turret-tick` CustomEvent (Task 5), `window.game.playerType`.

- [ ] **Step 1: Fix gamepad sprint to be hold-based, remove the dead ability trigger**

In `handleSteamGameplayInput()`, replace (`main.js:890-901`):

```js
    if (controller.ability && !prev.ability) {
        window.game?.triggerClassAbility?.();
    }
    if (controller.scan && !prev.scan) {
        window.game?.triggerRadarScan?.();
    }
    if (controller.pause && !prev.pause) {
        triggerControllerPauseAction();
    }
    if (controller.sprint && !prev.sprint) {
        window.game?.setVirtualInputSprint?.(true);
    }
```

with:

```js
    if (controller.scan && !prev.scan) {
        window.game?.triggerRadarScan?.();
    }
    if (controller.pause && !prev.pause) {
        triggerControllerPauseAction();
    }
    window.game?.setVirtualInputSprint?.(Boolean(controller.sprint));
```

Remove the now-unused `ability: Boolean(controller.ability),` line from the `updateControllerInputMemory` call (`main.js:908`).

- [ ] **Step 2: Remove the old ability HUD event listeners and pointerdown trigger**

Delete the pointerdown handler (`main.js:4281-4284`):

```js
document.getElementById('class-ability-panel')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.game?.triggerClassAbility?.();
});
```

Delete the three listeners `class-ability-activated`, `class-ability-ended`, `ability-cooldown-tick` (`main.js:4291-4329`).

- [ ] **Step 3: Add the `engineer-turret-tick` listener**

Add in their place:

```js
window.addEventListener('engineer-turret-tick', (event) => {
    const { remaining = 0, max = 1, active = false } = event?.detail ?? {};
    const bar = document.getElementById('ability-bar');
    const panel = document.getElementById('class-ability-panel');
    const clampedMax = Math.max(0.001, Number(max) || 0.001);
    const clampedRemaining = Math.max(0, Number(remaining) || 0);
    if (bar) {
        const fillPct = active
            ? (clampedRemaining / clampedMax)
            : 1 - (clampedRemaining / clampedMax);
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, fillPct))})`;
    }
    if (panel) {
        panel.classList.toggle('class-ability-panel--active', active);
        panel.classList.toggle('class-ability-panel--cooling', !active && clampedRemaining > 0);
        panel.classList.toggle('class-ability-panel--ready', !active && clampedRemaining <= 0);
    }
});
```

- [ ] **Step 4: Rewrite `syncAbilityPanelLabel` for the static passive readout**

Replace `syncAbilityPanelLabel()` (`main.js:4348-4364`):

```js
function syncAbilityPanelLabel() {
    const info = window.game?.getClassPassiveInfo?.();
    const name = info?.name ?? 'EVASIVE';
    const description = info?.description ?? '';
    const nameEl = document.getElementById('ability-name');
    if (nameEl) nameEl.textContent = name;
    const panel = document.getElementById('class-ability-panel');
    if (panel) {
        panel.title = description;
        const isEngineer = window.game?.playerType === 'ENGINEER';
        panel.classList.toggle('class-ability-panel--static', !isEngineer);
        if (!isEngineer) {
            panel.classList.remove('class-ability-panel--active', 'class-ability-panel--cooling', 'class-ability-panel--ready');
        }
    }
}
```

- [ ] **Step 5: Update index.html default markup**

In `index.html:746-751`, remove the now-inaccurate default title and text:

```html
          <div id="class-ability-panel" class="class-ability-panel" aria-live="polite" role="button" tabindex="-1">
            <span class="class-ability-panel__key" aria-hidden="true"><svg class="run-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="3" r="2.2" fill="currentColor" stroke="none"/><path d="M11 5 L8 11"/><path d="M10 8 L14 5.5" stroke-width="1.4"/><path d="M10 8 L6 10.5" stroke-width="1.4"/><path d="M8 11 L12 16 L16 18"/><path d="M8 11 L5 15 L2 13"/></svg></span>
            <span class="class-ability-panel__name" id="ability-name">PASSIVE</span>
            <div class="class-ability-panel__bar-track" aria-hidden="true">
              <div class="class-ability-panel__bar" id="ability-bar"></div>
            </div>
          </div>
```

(Removed the `role="button"`-implying `title="Sprint Burst [F]"` attribute since the panel is no longer clickable; `role="button"`/`tabindex="-1"` left as-is since they don't functionally matter once there's no pointerdown handler, and removing them isn't required by the spec.)

- [ ] **Step 6: CSS — static-passive bar hiding, remove dead ability-active-* rules**

In `style.css`, replace the locked-state rules at `style.css:6200-6216` with a static-passive rule (same selector nesting style):

```css
.class-ability-panel.class-ability-panel--static .class-ability-panel__bar-track {
  display: none;
}
```

Delete the three dead viewport rules at `style.css:9899-9929` (`#game-viewport.ability-active-sprint::after`, `#game-viewport.ability-active-fortify::after`, `#game-viewport.ability-active-overclock::after`) — nothing dispatches `class-ability-activated`/`ability-active-*` classes anymore after Task 2.

- [ ] **Step 7: Manual smoke test**

Run the dev server and, in the browser: switch between SCOUT/TANK/ENGINEER in the class select, confirm the bottom-HUD panel shows EVASIVE/BULWARK/AUTO-TURRET (hover shows the description tooltip); confirm the bar-track is hidden for SCOUT/TANK and animates (cooling → ready → active → cooling) for ENGINEER as a turret deploys; hold Shift/gamepad-sprint and confirm the player moves faster with a dust trail and faster O2 drain, for all three classes; release Shift and confirm speed/drain return to normal.

- [ ] **Step 8: Run full suite + lint**

Run: `npm test && npx eslint main.js`
Expected: PASS, no lint errors.

- [ ] **Step 9: Commit**

```bash
git add main.js index.html style.css
git commit -m "feat(hud): repurpose ability panel as passive readout, wire turret redeploy timer, fix gamepad sprint to hold-based"
```

---

### Task 8: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including every new/modified file from Tasks 1-7.

- [ ] **Step 2: Run lint across all touched files**

Run: `npx eslint src/threeGame.js src/bank.js main.js src/threeGame.sprint.test.js src/threeGame.classPassives.test.js`
Expected: no errors.

- [ ] **Step 3: Grep-verify no dangling references to the removed system**

Run: `grep -rn "classAbility\|triggerClassAbility\|triggerSprintBurst\|abilityKey\|abilityLabel\|abilityCooldown\|abilityDuration\|isSpecialAbilityUnlocked\|getClassAbilityInfo\|class-ability-activated\|class-ability-ended\|ability-cooldown-tick\|ability-active-" src/threeGame.js main.js index.html style.css src/bank.js`
Expected: no matches (confirms full removal — everything left is intentionally-named new code like `class-ability-panel` DOM id, which is kept per the design's "repurpose the HUD slot" decision).

- [ ] **Step 4: Report results to the user**

Summarize: tests passing, lint clean, grep clean, manual smoke test outcome from Task 7 Step 7.
