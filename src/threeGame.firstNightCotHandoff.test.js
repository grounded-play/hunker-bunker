import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCarryState } from './carrySystem.js';
import { ensureFirstNightBaseState } from './firstNightBase.js';
import { ThreeGame } from './threeGame.js';

beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), AudioManager: { play: vi.fn() } });
    vi.stubGlobal('CustomEvent', class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    });
});

afterEach(() => vi.unstubAllGlobals());

function recoveryState() {
    return ensureFirstNightBaseState(createCarryState('run-cot'), { shipX: 0, shipZ: 0 }).state;
}

describe('camp-authored first-night cot handoff', () => {
    it('stages the cot at the nearest living camp and advertises the handoff there', () => {
        const near = { id: 'camp_tallow', label: 'Camp Tallow', status: 'alive', pos: { x: 20, z: 0 }, isWithinInteractRange: () => true };
        const far = { id: 'camp_meridian', label: 'Camp Meridian', status: 'alive', pos: { x: 70, z: 0 }, isWithinInteractRange: () => false };
        const game = {
            carryState: recoveryState(),
            camps: [far, near],
            companions: [],
            getActiveShip: () => ({ tileX: 0, tileZ: 0 }),
            getCampRecord: (id) => ({ id, status: 'alive' }),
            reconcileCarryObjectVisuals: vi.fn(),
            syncMissionCargoMapLandmarks: vi.fn()
        };

        const staged = ThreeGame.prototype.stageFirstNightCotCampHandoff.call(game);
        expect(staged).toMatchObject({
            definitionId: 'cot_bed',
            handoff: { type: 'camp-cot', campId: 'camp_tallow', status: 'reserved' }
        });
        expect(ThreeGame.prototype.getActionableCampAt.call({
            ...game,
            isAct2Active: () => false
        }, near.pos.x, near.pos.z, 'dormant')).toMatchObject({
            action: 'cot-handoff',
            camp: near,
            object: { instanceId: staged.instanceId }
        });
    });

    it('prevents taking reserved camp cargo, then releases the same object for carrying', () => {
        const camp = { id: 'camp_meridian', label: 'Camp Meridian', status: 'alive', pos: { x: 10, z: 10 } };
        const game = {
            carryState: recoveryState(),
            camps: [camp],
            player: { position: { x: 7.8, z: 12.6 } },
            getActiveShip: () => ({ tileX: 0, tileZ: 0 }),
            getCampRecord: () => ({ status: 'alive' }),
            reconcileCarryObjectVisuals: vi.fn(),
            syncMissionCargoMapLandmarks: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            showBunkerLine: vi.fn()
        };
        const staged = ThreeGame.prototype.stageFirstNightCotCampHandoff.call(game);
        expect(ThreeGame.prototype.getNearestCarryObject.call(game)).toBeNull();
        expect(ThreeGame.prototype.beginCarryObject.call(game, staged.instanceId)).toBe(false);
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('SPEAK TO THE SURVIVORS'));

        expect(ThreeGame.prototype.claimFirstNightCotHandoff.call(game, camp)).toBe(true);
        expect(game.carryState.worldObjects.find(({ instanceId }) => instanceId === staged.instanceId)?.handoff.status).toBe('released');
        expect(ThreeGame.prototype.getNearestCarryObject.call(game)?.object.instanceId).toBe(staged.instanceId);
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('CARRY IT TO THE SHIP SLEEP BERTH'));
    });

    it('releases a reserved cot for salvage if its camp no longer survives', () => {
        const camp = { id: 'camp_vesper', label: 'Camp Vesper', status: 'alive', pos: { x: 14, z: 4 } };
        let status = 'alive';
        const game = {
            carryState: recoveryState(),
            camps: [camp],
            getActiveShip: () => ({ tileX: 0, tileZ: 0 }),
            getCampRecord: () => ({ status }),
            reconcileCarryObjectVisuals: vi.fn(),
            syncMissionCargoMapLandmarks: vi.fn()
        };
        const staged = ThreeGame.prototype.stageFirstNightCotCampHandoff.call(game);
        expect(staged.handoff.status).toBe('reserved');

        status = 'culled';
        const salvaged = ThreeGame.prototype.stageFirstNightCotCampHandoff.call(game);
        expect(salvaged).toMatchObject({
            instanceId: staged.instanceId,
            handoff: { campId: 'camp_vesper', status: 'released' }
        });
    });
});
