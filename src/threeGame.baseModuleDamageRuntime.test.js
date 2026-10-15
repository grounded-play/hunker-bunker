import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { evaluateRoomSealGraph } from './baseSealGraph.js';

function installed() {
    return [
        { instanceId: 'floor', definitionId: 'floor_plate_1x1', x: 0, z: 0 },
        { instanceId: 'ceiling', definitionId: 'ceiling_panel_1x1', x: 0, z: 0 },
        { instanceId: 'north', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'north' },
        { instanceId: 'south', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'south' },
        { instanceId: 'wall-1', definitionId: 'hull_patch_panel', x: 0, z: 0, side: 'west', transform: { x: 0, z: 0, yaw: 0 } },
        { instanceId: 'door-1', definitionId: 'door_seal_kit', x: 0, z: 0, side: 'east', transform: { x: 0, z: 0, yaw: 0 }, isOpen: false },
        { instanceId: 'o2', definitionId: 'o2_regulator', x: 0, z: 0 },
        { instanceId: 'bed', definitionId: 'cot_bed', x: 0, z: 0 }
    ];
}

function gameStub() {
    return {
        carryState: { runId: 'run-a', carried: null, worldObjects: [], installed: installed() },
        player: { position: { x: 0, z: 0 } },
        baseAtmosphereSeal: {},
        installedBaseModuleVisuals: new Map(),
        _installedBaseVisualLoadTokens: new Map(),
        getInstalledBaseModuleWorldPosition: ThreeGame.prototype.getInstalledBaseModuleWorldPosition,
        blocksInstalledBaseModulePosition: ThreeGame.prototype.blocksInstalledBaseModulePosition,
        reconcileInstalledBaseModuleVisuals: vi.fn(),
        spawnDamagePip: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        triggerCameraShake: vi.fn(),
        showBunkerLine: vi.fn(),
        bank: { spendShells: vi.fn(() => true) }
    };
}

describe('installed base module damage runtime', () => {
    beforeEach(() => {
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
        vi.stubGlobal('window', {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn(), playMetalStress: vi.fn() }
        });
    });

    it('turns weapon damage into a real cabin breach and repairs the same module', () => {
        const game = gameStub();
        expect(evaluateRoomSealGraph({ modules: game.carryState.installed, defaultSafeBubble: null }).isEnclosed).toBe(true);
        expect(ThreeGame.prototype.damageInstalledBaseModule.call(game, 'wall-1', 999)).toBe(true);
        expect(game.carryState.installed.find(({ instanceId }) => instanceId === 'wall-1').isDestroyed).toBe(true);
        expect(evaluateRoomSealGraph({ modules: game.carryState.installed, defaultSafeBubble: null }).isEnclosed).toBe(false);
        expect(game.baseAtmosphereSeal).toBeNull();

        expect(ThreeGame.prototype.repairInstalledBaseModule.call(game, 'wall-1')).toBe(true);
        expect(game.bank.spendShells).toHaveBeenCalledWith(12);
        expect(game.carryState.installed.find(({ instanceId }) => instanceId === 'wall-1')).toMatchObject({
            isDestroyed: false, condition: 1, damageState: 'intact'
        });
        expect(evaluateRoomSealGraph({ modules: game.carryState.installed, defaultSafeBubble: null }).isEnclosed).toBe(true);
    });

    it('sweeps projectiles against installed wall and door edges', () => {
        const game = gameStub();
        const projectile = { isEnemy: false, mesh: { position: { x: 1, z: 0 } } };
        const hit = ThreeGame.prototype.checkProjectileInstalledBaseModuleHit.call(game, projectile, { x: -1, z: 0 });
        expect(['wall-1', 'door-1']).toContain(hit.instanceId);
    });

    it('exposes nearby damaged modules as contextual shell repairs', () => {
        const game = gameStub();
        ThreeGame.prototype.damageInstalledBaseModule.call(game, 'door-1', 30);
        const nearest = ThreeGame.prototype.getNearestDamagedBaseModule.call(game);
        expect(nearest).toMatchObject({ module: expect.objectContaining({ instanceId: 'door-1' }) });
        expect(nearest.cost).toBeGreaterThan(0);
    });

    it('cycles the authored pressure door between blocking/sealed and passable/leaking states', () => {
        const game = gameStub();
        expect(game.blocksInstalledBaseModulePosition(0.5, 0, 0.2)).toBe(true);
        expect(ThreeGame.prototype.toggleInstalledBaseDoor.call(game, 'door-1')).toBe(true);
        expect(game.carryState.installed.find(({ instanceId }) => instanceId === 'door-1').isOpen).toBe(true);
        expect(game.blocksInstalledBaseModulePosition(0.5, 0, 0.2)).toBe(false);
        expect(evaluateRoomSealGraph({ modules: game.carryState.installed, defaultSafeBubble: null }).leaks)
            .toEqual(expect.arrayContaining([expect.objectContaining({ type: 'open_door', side: 'east' })]));
        expect(ThreeGame.prototype.toggleInstalledBaseDoor.call(game, 'door-1')).toBe(true);
        expect(game.blocksInstalledBaseModulePosition(0.5, 0, 0.2)).toBe(true);
    });
});
