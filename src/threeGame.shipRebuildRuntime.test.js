import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCarryState } from './carrySystem.js';
import { ThreeGame } from './threeGame.js';

function browserStub() {
    const browser = new EventTarget();
    browser.AudioManager = { play: vi.fn() };
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
            'ship_life_support_core', 'ship_navigation_core'
        ]);
        expect(ThreeGame.prototype.updateShipRebuildRecovery.call(game, 1).addedCargo).toEqual([]);

        const navigation = game.carryState.worldObjects.find(({ definitionId }) => definitionId === 'ship_navigation_core');
        game.getNearestCarryObject = ThreeGame.prototype.getNearestCarryObject;
        expect(ThreeGame.prototype.beginCarryObject.call(game, navigation.instanceId)).toBe(true);
        const socket = game.getAvailableCarryInstallSocket(game.carryState.carried);
        expect(socket.id).toBe('ship-bay-core');
        game.player.position.x = socket.transform.x;
        game.player.position.z = socket.transform.z;
        expect(ThreeGame.prototype.installCurrentCarryObject.call(game)).toBe(true);
        expect(game.carryState.installed).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'ship_navigation_core', socketId: 'ship-bay-core' })
        ]));
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('SHIP REBUILD 1/4'));
    });

    it('blocks abstract ship builds until their matching physical module is installed', () => {
        const game = gameStub();
        game.bank = {
            getState: () => ({ o2GeneratorLevel: 0, unlocks: { o2Bubble: true, hullExpansion: false } }),
            canAfford: vi.fn(() => true),
            spend: vi.fn(),
            upgradeO2Generator: vi.fn()
        };
        game.getShipGoalAssemblyStatus = ThreeGame.prototype.getShipGoalAssemblyStatus;
        game.renderConsoleBanking = vi.fn();
        game.getO2GeneratorState = () => ({ level: 0, nextUpgrade: { cost: { tech: 10 } } });

        expect(ThreeGame.prototype.attemptGoalUnlock.call(game, null, {
            goalKey: 'hullExpansion', prereqKey: 'o2Bubble'
        })).toBe(false);
        expect(game.bank.spend).not.toHaveBeenCalled();
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('STELLAR NAVIGATION CORE REQUIRED'));

        expect(ThreeGame.prototype.attemptO2GeneratorUpgrade.call(game, null)).toBe(false);
        expect(game.bank.upgradeO2Generator).not.toHaveBeenCalled();
        expect(ThreeGame.prototype.getO2GeneratorButtonState.call(game, {
            level: 0, maxed: false, nextUpgrade: { cost: { tech: 10 } }
        })).toMatchObject({ enabled: false, label: 'INSTALL SHIP LIFE-SUPPORT SYSTEM' });
    });
});
