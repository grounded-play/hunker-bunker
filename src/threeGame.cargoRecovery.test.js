import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { addCarryObject, beginCarry, createCarryObject, createCarryState } from './carrySystem.js';

function missionObject() {
    return createCarryObject({
        instanceId: 'cargo-1',
        definitionId: 'hull_patch_panel',
        missionId: 'first-night-berth-seal',
        worldPosition: { x: 8, z: 9 },
        buildTags: ['wall', 'hull_patch'],
        runId: 'run-a'
    });
}

function gameStub() {
    const carryState = addCarryObject(createCarryState('run-a'), missionObject()).state;
    return {
        carryState,
        player: { position: { x: 0, y: 0, z: 0 } },
        _missionCargoAuditTimer: 0,
        _carryLandmarkIds: new Set(),
        carryObjectVisuals: new Map(),
        carriedObjectVisual: null,
        multiplayerLocalPlayerId: 'local',
        getFirstNightBasePlan: ThreeGame.prototype.getFirstNightBasePlan,
        getActiveShip: () => ({ tileX: 0, tileZ: 0 }),
        reconcileCarryObjectVisuals: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        showBunkerLine: vi.fn()
    };
}

describe('mission cargo recovery runtime', () => {
    beforeEach(() => {
        const browser = new EventTarget();
        browser.AudioManager = { play: vi.fn() };
        vi.stubGlobal('window', browser);
    });

    it('guides the compass to loose cargo and then its compatible install socket', () => {
        const game = gameStub();
        const loose = ThreeGame.prototype.getMissionCargoGuidance.call(game);
        expect(loose).toMatchObject({ id: 'cargo-1', x: 8, z: 9, mode: 'mission-cargo' });
        game.carryState = beginCarry(game.carryState, 'cargo-1', 'local').state;
        const held = ThreeGame.prototype.getMissionCargoGuidance.call(game);
        expect(held).toMatchObject({ id: 'cargo-1', mode: 'cargo-install' });
        expect(held.label).toContain('INSTALL CRASH-HULL PATCH PANEL');
    });

    it('recovers repeatedly invalid cargo and emits one visible feedback event', () => {
        const game = gameStub();
        game.carryState.worldObjects[0] = {
            ...game.carryState.worldObjects[0],
            worldPosition: { x: 999, z: 999 },
            lastSafePosition: { x: 4, z: 5 }
        };
        game.isSnailTileWalkable = (x) => x < 100;
        game.canOccupyPosition = (x) => x < 100;
        const update = () => ThreeGame.prototype.updateMissionCargoRecovery.call(game, 1);
        expect(update()).toEqual([]);
        expect(update()).toEqual([]);
        expect(update()[0]).toMatchObject({ worldPosition: { x: 4, z: 5 }, recoveryCount: 1 });
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('REACQUIRED'));
    });

    it('adds loose cargo to the tactical map and removes its stale landmark after pickup', () => {
        const landmarks = new Map();
        const game = gameStub();
        game.explorationTracker = {
            registerLandmark: (id, value) => landmarks.set(id, value),
            removeLandmark: (id) => landmarks.delete(id)
        };
        ThreeGame.prototype.syncMissionCargoMapLandmarks.call(game);
        expect(landmarks.get('mission-cargo:cargo-1')).toMatchObject({ x: 8, z: 9, revealOnMap: true });
        game.carryState = beginCarry(game.carryState, 'cargo-1', 'local').state;
        ThreeGame.prototype.syncMissionCargoMapLandmarks.call(game);
        expect(landmarks.size).toBe(0);
    });

    it('drops the same mission instance at a safe point when its carrier dies', () => {
        const game = gameStub();
        game.carryState = beginCarry(game.carryState, 'cargo-1', 'local').state;
        game.findSafeCarryDropPosition = () => ({ x: 2, z: 3 });
        const dropped = ThreeGame.prototype.emergencyDropCarriedObject.call(game, 'death:test');
        expect(dropped).toMatchObject({ instanceId: 'cargo-1', worldPosition: { x: 2, z: 3 } });
        expect(game.carryState.carried).toBeNull();
        expect(game.carryState.worldObjects).toHaveLength(1);
    });
});
