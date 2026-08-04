import { describe, expect, it, beforeEach } from 'vitest';
import { BankManager as Bank, BASE_TURRET_UPGRADES, BASE_TURRET_REPAIR_COST } from './bank.js';
import { ThreeGame } from './threeGame.js';

describe('Base Defense Turret & Crash Site Centering', () => {
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            _data: {},
            getItem(key) { return this._data[key] || null; },
            setItem(key, val) { this._data[key] = String(val); },
            removeItem(key) { delete this._data[key]; }
        };
    });

    it('defines base turret upgrades with progressive damage, range, and max HP', () => {
        expect(BASE_TURRET_UPGRADES).toHaveLength(3);
        expect(BASE_TURRET_UPGRADES[0]).toMatchObject({ level: 1, damage: 4, range: 7, maxHp: 100 });
        expect(BASE_TURRET_UPGRADES[1]).toMatchObject({ level: 2, damage: 7, range: 9, maxHp: 150 });
        expect(BASE_TURRET_UPGRADES[2]).toMatchObject({ level: 3, damage: 12, range: 11, maxHp: 200 });
        expect(BASE_TURRET_REPAIR_COST).toEqual({ tech: 10, coin: 5 });
    });

    it('initializes base turret bank state and handles upgrades and repairs', () => {
        const bank = new Bank({ storage: mockStorage });
        expect(bank.isBaseTurretUnlocked()).toBe(false);
        expect(bank.getBaseTurretLevel()).toBe(1);
        expect(bank.getBaseTurretHp()).toBe(100);
        expect(bank.getBaseTurretMaxHp()).toBe(100);

        // Cannot upgrade without resources
        expect(bank.canUpgradeBaseTurret()).toBe(false);
        expect(bank.upgradeBaseTurret()).toBe(false);

        // Add resources for upgrade level 2 (cost: tech 30, coin 10)
        bank.state.tech = 50;
        bank.state.coin = 20;
        expect(bank.canUpgradeBaseTurret()).toBe(true);
        expect(bank.upgradeBaseTurret()).toBe(true);
        expect(bank.getBaseTurretLevel()).toBe(2);
        expect(bank.getBaseTurretMaxHp()).toBe(150);
        expect(bank.getBaseTurretHp()).toBe(150);

        // Cannot repair when already at max HP
        expect(bank.canRepairBaseTurret()).toBe(false);

        // Damage turret and verify repair
        bank.setBaseTurretHp(50);
        expect(bank.getBaseTurretHp()).toBe(50);
        expect(bank.canRepairBaseTurret()).toBe(true);
        expect(bank.repairBaseTurret()).toBe(true);
        expect(bank.getBaseTurretHp()).toBe(150);
    });

    it('places base defense turret near the north blast door (tile 9, 4.8)', () => {
        const fakeScene = { add: () => {} };
        const game = {
            scene: fakeScene,
            bank: new Bank({ storage: mockStorage }),
            setupBaseDefenseTurret: ThreeGame.prototype.setupBaseDefenseTurret,
            updateBaseTurretVisuals: ThreeGame.prototype.updateBaseTurretVisuals
        };

        game.setupBaseDefenseTurret();

        expect(game.baseDefenseTurretGroup).toBeDefined();
        expect(game.baseDefenseTurretGroup.position.x).toBe(9);
        expect(game.baseDefenseTurretGroup.position.z).toBe(4.8);
        expect(game.baseDefenseTurretState).toMatchObject({ tileX: 9, tileZ: 4.8 });
    });

    it('deploys base turret automatically when O2 generator or base item is repaired', () => {
        const fakeScene = { add: () => {} };
        const bank = new Bank({ storage: mockStorage });
        const game = {
            scene: fakeScene,
            bank,
            setupBaseDefenseTurret: ThreeGame.prototype.setupBaseDefenseTurret,
            updateBaseTurretVisuals: ThreeGame.prototype.updateBaseTurretVisuals
        };

        game.setupBaseDefenseTurret();
        expect(game.baseDefenseTurretState.active).toBe(false);

        // Manually trigger base item repair handler
        game._onBaseItemRepaired();

        expect(bank.isBaseTurretUnlocked()).toBe(true);
        expect(game.baseDefenseTurretState.active).toBe(true);
        expect(game.baseDefenseTurretGroup.visible).toBe(true);
    });

    it('targets and damages enemies within range during updateBaseDefenseTurret', () => {
        const fakeEnemy = {
            position: { x: 9, z: 6 },
            userData: { type: 'cybersnail', hp: 20, maxHp: 20, burstTriggered: false }
        };
        const fakeScene = { add: () => {}, remove: () => {} };
        const bank = new Bank({ storage: mockStorage });
        bank.unlockBaseTurret();

        const game = {
            scene: fakeScene,
            bank,
            baseDefenseTurretGroup: { visible: true },
            baseDefenseTurretHead: { rotation: { y: 0 } },
            baseDefenseTurretEyeMat: { color: { set: () => {} } },
            baseDefenseTurretLight: { visible: true },
            baseDefenseTurretState: { active: true, cooldown: 0 },
            scatterSprites: [fakeEnemy],
            isEnemyType: ThreeGame.prototype.isEnemyType,
            applyPlayerDamageToEnemy(target, amount) { target.userData.hp -= amount; },
            updateBaseTurretVisuals: ThreeGame.prototype.updateBaseTurretVisuals,
            updateBaseDefenseTurret: ThreeGame.prototype.updateBaseDefenseTurret,
            spawnBaseTurretLaser: () => {}
        };

        game.updateBaseDefenseTurret(0.1);

        // Enemy should have taken Level 1 turret damage (4 HP)
        expect(fakeEnemy.userData.hp).toBe(16);
    });

    it('persists a destroyed turret at zero HP until it is repaired', () => {
        const bank = new Bank({ storage: mockStorage });
        bank.unlockBaseTurret();
        bank.setBaseTurretHp(0);

        const reloaded = new Bank({ storage: mockStorage });
        expect(reloaded.isBaseTurretUnlocked()).toBe(true);
        expect(reloaded.getBaseTurretHp()).toBe(0);
    });

    it('lets nearby hostiles target and damage the deployed turret', () => {
        const bank = new Bank({ storage: mockStorage });
        bank.unlockBaseTurret();
        const game = {
            bank,
            player: null,
            baseDefenseTurretState: { active: true, tileX: 9, tileZ: 4.8 },
            updateBaseTurretVisuals() {},
            damageBaseTurret: ThreeGame.prototype.damageBaseTurret
        };
        const enemy = {
            position: { x: 9, z: 5.5 },
            userData: { type: 'cybersnail' }
        };

        const target = ThreeGame.prototype.selectSnailTarget.call(game, enemy, null);
        expect(target).toMatchObject({ type: 'base-turret', goalX: 9, goalZ: 4.8 });

        expect(game.damageBaseTurret(2, 'cybersnail')).toBe(true);
        expect(bank.getBaseTurretHp()).toBe(98);
    });
});
