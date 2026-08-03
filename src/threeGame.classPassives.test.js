import { describe, expect, it, beforeEach, afterEach } from 'vitest';
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
