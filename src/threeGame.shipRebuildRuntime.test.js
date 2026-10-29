import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCarryState } from './carrySystem.js';
import { ensureQaShipRebuildModules } from './shipRebuild.js';
import { ThreeGame } from './threeGame.js';

function browserStub() {
    const browser = new EventTarget();
    browser.AudioManager = { play: vi.fn() };
    browser.hbLog = vi.fn();
    vi.stubGlobal('window', browser);
}

function gameStub() {
    return {
        carryState: createCarryState('run-rebuild'),
        player: { position: { x: 0, y: 0, z: 0 } },
        getActiveShip: () => ({ tileX: 10, tileZ: 12 }),
        getBuiltGoalKeys: () => new Set(['o2Bubble']),
        getShipRebuildSourcePositions: () => ({
            o2Bubble: { x: 30, z: 40 },
            hullExpansion: { x: 50, z: 60 },
            radarNode: { x: 70, z: 80 },
            reactorCompressor: { x: 90, z: 100 }
        }),
        getFirstNightBasePlan: ThreeGame.prototype.getFirstNightBasePlan,
        getCampO2Plan: ThreeGame.prototype.getCampO2Plan,
        getShipRebuildPlan: ThreeGame.prototype.getShipRebuildPlan,
        getAvailableCarryInstallSocket: ThreeGame.prototype.getAvailableCarryInstallSocket,
        reconcileCarryObjectVisuals: vi.fn(),
        reconcileInstalledBaseModuleVisuals: vi.fn(),
        syncMissionCargoMapLandmarks: vi.fn(),
        syncBunkerCot: vi.fn(),
        showBunkerLine: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        triggerCameraShake: vi.fn()
    };
}

describe('ship rebuild runtime', () => {
    beforeEach(() => browserStub());

    it('stages unlocked ring cargo once and installs it at a dedicated ship socket', () => {
        const game = gameStub();
        const staged = ThreeGame.prototype.updateShipRebuildRecovery.call(game, 1);
        expect(staged.addedCargo.map(({ definitionId }) => definitionId)).toEqual([
            'camp_o2_generator_core', 'ship_navigation_core'
        ]);
        expect(ThreeGame.prototype.updateShipRebuildRecovery.call(game, 1).addedCargo).toEqual([]);

        const navigation = game.carryState.worldObjects.find(({ definitionId }) => definitionId === 'ship_navigation_core');
        game.getNearestCarryObject = ThreeGame.prototype.getNearestCarryObject;
        expect(ThreeGame.prototype.beginCarryObject.call(game, navigation.instanceId)).toBe(true);
        const socket = game.getAvailableCarryInstallSocket(game.carryState.carried);
        expect(socket.id).toBe('escape-craft-navigation');
        game.player.position.x = socket.transform.x;
        game.player.position.z = socket.transform.z;
        expect(ThreeGame.prototype.installCurrentCarryObject.call(game)).toBe(true);
        expect(game.carryState.installed).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'ship_navigation_core', socketId: 'escape-craft-navigation' })
        ]));
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('ESCAPE CRAFT 1/3'));
    });

    it('blocks abstract ship builds until their matching physical module is installed', () => {
        const game = gameStub();
        game.bank = {
            getState: () => ({ o2GeneratorLevel: 0, unlocks: { o2Bubble: true, hullExpansion: false } }),
            getO2GeneratorLevel: () => 0,
            canAfford: vi.fn(() => true),
            spend: vi.fn(),
            upgradeO2Generator: vi.fn()
        };
        game.getShipGoalAssemblyStatus = ThreeGame.prototype.getShipGoalAssemblyStatus;
        game.getEffectiveCost = ThreeGame.prototype.getEffectiveCost;
        game.formatResourceCost = vi.fn(() => '10 TECH');
        game.renderConsoleBanking = vi.fn();
        game.getO2GeneratorState = () => ({ level: 0, nextUpgrade: { cost: { tech: 10 } } });

        expect(ThreeGame.prototype.attemptGoalUnlock.call(game, null, {
            goalKey: 'hullExpansion', prereqKey: 'o2Bubble'
        })).toBe(false);
        expect(game.bank.spend).not.toHaveBeenCalled();
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('STELLAR NAVIGATION CORE REQUIRED'));

        expect(ThreeGame.prototype.attemptO2GeneratorUpgrade.call(game, null)).toBe(false);
        expect(game.bank.upgradeO2Generator).not.toHaveBeenCalled();
        expect(window.hbLog).toHaveBeenCalledWith(
            'PROGRESSION', 'warn', 'o2-generator-upgrade-result',
            expect.objectContaining({
                ok: false,
                reason: 'module_required',
                levelBefore: 0,
                levelAfter: 0,
                assembly: expect.objectContaining({
                    ready: false,
                    installed: false,
                    definitionId: 'camp_o2_generator_core',
                    socketId: 'camp-o2-generator'
                })
            })
        );
        expect(ThreeGame.prototype.getO2GeneratorButtonState.call(game, {
            level: 0, maxed: false, nextUpgrade: { cost: { tech: 10 } }
        })).toMatchObject({ enabled: false, label: 'INSTALL CAMP O2 GENERATOR CORE' });

        const treeState = ThreeGame.prototype.getUnifiedNodeState.call(game, {
            purchase: { kind: 'o2gen' },
            costsPerLevel: [{ tech: 10 }],
            maxLevel: 3,
            desc: 'Repair generator.'
        }, game.bank.getState());
        expect(treeState).toMatchObject({
            available: false,
            gateText: 'INSTALL CAMP O2 GENERATOR CORE'
        });
    });

    it('makes a debug assembly grant truthful and immediately repair-eligible', () => {
        const game = gameStub();
        let state = {
            o2GeneratorLevel: 0,
            tech: 999999,
            med: 999999,
            ammo: 999999,
            coin: 999999,
            unlocks: { o2Bubble: false }
        };
        game.bank = {
            getState: () => state,
            getO2GeneratorLevel: () => state.o2GeneratorLevel,
            canAfford: vi.fn(() => true),
            upgradeO2Generator: vi.fn(() => {
                state = { ...state, o2GeneratorLevel: 1, tech: state.tech - 10, med: state.med - 5, coin: state.coin - 5 };
                return { level: 1, radius: 8, refillRate: 4 };
            })
        };
        game.getShipGoalAssemblyStatus = ThreeGame.prototype.getShipGoalAssemblyStatus;
        game.getEffectiveCost = ThreeGame.prototype.getEffectiveCost;
        game.formatResourceCost = vi.fn(() => '10 TECH / 5 MED / 5 COIN');
        game.getO2GeneratorState = () => ({
            level: state.o2GeneratorLevel,
            maxed: false,
            nextUpgrade: state.o2GeneratorLevel === 0
                ? { level: 1, cost: { tech: 10, med: 5, coin: 5 } }
                : { level: 2, cost: { tech: 20 } }
        });
        game.closeConsoleModal = vi.fn();
        game.syncPersistentUpgrades = vi.fn();
        game.ensureO2BubbleVisualState = vi.fn();
        game.emitO2State = vi.fn();
        game.renderConsoleBanking = vi.fn();
        game.renderO2GeneratorModal = vi.fn();

        const grant = ensureQaShipRebuildModules(game.carryState);
        expect(grant.installedModules).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'camp_o2_generator_core', socketId: 'camp-o2-generator' }),
            expect.objectContaining({ definitionId: 'ship_navigation_core', socketId: 'escape-craft-navigation' }),
            expect.objectContaining({ definitionId: 'ship_comms_array', socketId: 'escape-craft-comms' }),
            expect.objectContaining({ definitionId: 'ship_engine_manifold', socketId: 'escape-craft-engine' })
        ]));
        expect(game.getShipGoalAssemblyStatus('o2Bubble')).toMatchObject({ ready: true, installed: true });

        const treeState = ThreeGame.prototype.getUnifiedNodeState.call(game, {
            purchase: { kind: 'o2gen' },
            costsPerLevel: [{ tech: 10, med: 5, coin: 5 }],
            maxLevel: 3,
            desc: 'Repair generator.'
        }, state);
        expect(treeState).toMatchObject({ available: true, gateText: '' });
        expect(ThreeGame.prototype.attemptO2GeneratorUpgrade.call(game, null)).toBe(true);
        expect(window.hbLog).toHaveBeenCalledWith(
            'PROGRESSION', 'info', 'o2-generator-upgrade-result',
            expect.objectContaining({
                ok: true,
                reason: 'repair_completed',
                levelBefore: 0,
                levelAfter: 1,
                cost: { tech: 10, med: 5, coin: 5 },
                balanceBefore: expect.objectContaining({ tech: 999999 }),
                balanceAfter: expect.objectContaining({ tech: 999989 }),
                assembly: expect.objectContaining({ ready: true, installed: true })
            })
        );
    });

    it('makes installed life-support and engine GLBs actionable with per-instance cooldowns', () => {
        const game = gameStub();
        game.getInstalledBaseModuleWorldPosition = ThreeGame.prototype.getInstalledBaseModuleWorldPosition;
        game.adjustOxygen = ThreeGame.prototype.adjustOxygen;
        game.emitO2State = vi.fn();
        game.installedBaseModuleVisuals = new Map();
        game.playerVitals = { o2: 40, maxO2: 100 };
        game.carryState.installed = [
            {
                instanceId: 'life-1', definitionId: 'ship_life_support_core',
                transform: { x: 0, z: 0, yaw: 0 }, socketId: 'ship-bay-life'
            },
            {
                instanceId: 'engine-1', definitionId: 'ship_engine_manifold',
                transform: { x: 2, z: 0, yaw: 0 }, socketId: 'ship-bay-engine'
            }
        ];

        expect(ThreeGame.prototype.interactWithInstalledShipModule.call(game, 'life-1', 10)).toBe(true);
        expect(game.playerVitals.o2).toBe(80);
        expect(ThreeGame.prototype.interactWithInstalledShipModule.call(game, 'life-1', 11)).toBe(false);
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('RECHARGING'));

        game.player.position.x = 2;
        game.fieldWeaponRunState = {
            runId: 'run-rebuild', worldDrops: [],
            equipped: { profileId: 'flamethrower', ammoType: 'fuel-tanks', ammoInWeapon: 20, reserveAmmo: 200 }
        };
        game.syncEquippedFieldWeapon = vi.fn();
        game.dashCooldownTimer = 0.8;
        expect(ThreeGame.prototype.interactWithInstalledShipModule.call(game, 'engine-1', 10)).toBe(true);
        expect(game.fieldWeaponRunState.equipped.reserveAmmo).toBe(230);
        expect(game.dashCooldownTimer).toBe(0);
        expect(game.syncEquippedFieldWeapon).toHaveBeenCalledWith({ announce: false });
    });
});
