import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { createCarryState } from './carrySystem.js';
import { createDayState } from './dayCycle.js';

function browserStub() {
    const browser = new EventTarget();
    browser.AudioManager = { play: vi.fn() };
    vi.stubGlobal('window', browser);
}

function baseGame() {
    return {
        carryState: createCarryState('run-test'),
        carryObjectVisuals: new Map(),
        carriedObjectVisual: null,
        _carryVisualLoadTokens: new Map(),
        player: { position: { x: 0, y: 0, z: 0 } },
        aimDirX: 1,
        aimDirZ: 0,
        scatterSprites: [],
        getActiveShip: () => ({ tileX: 0, tileZ: 0 }),
        getFirstNightBasePlan: ThreeGame.prototype.getFirstNightBasePlan,
        reconcileCarryObjectVisuals: vi.fn(),
        syncBunkerCot: vi.fn(),
        showBunkerLine: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        triggerCameraShake: vi.fn()
    };
}

describe('physical first-night cargo runtime', () => {
    beforeEach(() => browserStub());

    it('bootstraps three physical recovery pieces beside the incomplete berth', () => {
        const game = baseGame();
        const result = ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        expect(result.addedCot).toBe(true);
        expect(game.carryState.worldObjects).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'cot_bed', modelType: 'carry_field_cot_folded' }),
            expect.objectContaining({ definitionId: 'hull_patch_panel', modelType: 'crash_hull_panels' }),
            expect.objectContaining({ definitionId: 'door_seal_kit', modelType: 'mod_pressure_seal' })
        ]));
        expect(game.carryState.installed.some(({ definitionId }) => definitionId === 'cot_bed')).toBe(false);
    });

    it('lifts with both hands, safely drops, then installs at the ship socket', () => {
        const game = baseGame();
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        const cotId = game.carryState.worldObjects[0].instanceId;
        game.player.position.x = 5;
        game.player.position.z = 2;
        game.getNearestCarryObject = ThreeGame.prototype.getNearestCarryObject;
        expect(ThreeGame.prototype.beginCarryObject.call(game, cotId)).toBe(true);
        expect(game.carryState.carried?.definitionId).toBe('cot_bed');

        game.getTileType = () => '.';
        game.findSafeCarryDropPosition = ThreeGame.prototype.findSafeCarryDropPosition;
        game.reconcileCarryObjectVisuals = vi.fn();
        expect(ThreeGame.prototype.dropCurrentCarryObject.call(game)).toBe(true);
        expect(game.carryState.carried).toBeNull();

        expect(ThreeGame.prototype.beginCarryObject.call(game, cotId)).toBe(true);
        const socket = game.getFirstNightBasePlan().installSocket.transform;
        game.player.position.x = socket.x;
        game.player.position.z = socket.z;
        expect(ThreeGame.prototype.installCurrentCarryObject.call(game)).toBe(true);
        expect(game.carryState.installed).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'cot_bed', socketId: 'ship-sleep-bay', x: socket.x, z: socket.z })
        ]));
    });

    it('allows bunker sleep only after the cot, wall patch, and door seal complete the berth', () => {
        const game = baseGame();
        game.dayState = createDayState();
        game.canRestAt = ThreeGame.prototype.canRestAt;
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        const site = { id: 'bunker_cot', ...game.getFirstNightBasePlan().installSocket.transform };
        expect(game.canRestAt(site)).toMatchObject({ allowed: false, reason: 'unsealed:missing_wall' });

        const cotId = game.carryState.worldObjects[0].instanceId;
        ThreeGame.prototype.beginCarryObject.call(game, cotId);
        game.player.position.x = site.x;
        game.player.position.z = site.z;
        ThreeGame.prototype.installCurrentCarryObject.call(game);
        expect(game.canRestAt(site)).toMatchObject({ allowed: false, reason: 'unsealed:missing_wall' });

        for (const definitionId of ['hull_patch_panel', 'door_seal_kit']) {
            const object = game.carryState.worldObjects.find((entry) => entry.definitionId === definitionId);
            ThreeGame.prototype.beginCarryObject.call(game, object.instanceId);
            ThreeGame.prototype.installCurrentCarryObject.call(game);
        }
        expect(game.canRestAt(site)).toMatchObject({ allowed: true, nextDay: 2 });
    });

    it('disables sprint and dodge while carrying a heavy module', () => {
        const game = baseGame();
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        const cotId = game.carryState.worldObjects[0].instanceId;
        ThreeGame.prototype.beginCarryObject.call(game, cotId);
        game.isGameplayInputActive = () => true;
        game.playerVitals = { o2: 100 };
        game.sprinting = true;
        ThreeGame.prototype.updateSprintState.call(game, 0.016);
        expect(game._sprintMoveSpeedMult).toBe(1);
        expect(ThreeGame.prototype.triggerGameplayDash.call(game)).toBe(false);
        expect(game.showBunkerLine).toHaveBeenLastCalledWith('HANDS FULL — SET CARGO DOWN BEFORE DODGING.');
    });

    it('stagger-drops heavy cargo after a landed directional hit', () => {
        const game = baseGame();
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        ThreeGame.prototype.beginCarryObject.call(game, game.carryState.worldObjects[0].instanceId);
        Object.assign(game, {
            performanceProfile: 'gameplay',
            playerType: 'SCOUT',
            playerVitals: { hp: 3, maxHp: 3 },
            playerShieldMax: 0,
            playerShieldHp: 0,
            runOverclocks: [],
            runRelics: [],
            scatterSprites: [],
            dynamicPuddles: [],
            getActiveContainmentZones: () => [],
            getActiveDoors: () => [],
            emergencyDropCarriedObject: vi.fn(() => ({ worldPosition: { x: 0.5, z: 0.5 } })),
            emitHealthState: vi.fn(),
            markCombatActivity: vi.fn(),
            showDirectionalHitIndicator: vi.fn()
        });
        expect(ThreeGame.prototype.takeDamage.call(game, 1, 'crawler', 2, 2)).toBe(true);
        expect(game.emergencyDropCarriedObject).toHaveBeenCalledWith('damage-stagger');
        expect(game.showBunkerLine).toHaveBeenLastCalledWith('IMPACT STAGGER — HEAVY CARGO DROPPED AT YOUR FEET.');
    });
});
