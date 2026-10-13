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

    it('bootstraps one folded cot beside the wreck and a sealed berth without a sleep anchor', () => {
        const game = baseGame();
        const result = ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        expect(result.addedCot).toBe(true);
        expect(game.carryState.worldObjects).toEqual([
            expect.objectContaining({ definitionId: 'cot_bed', modelType: 'carry_field_cot_folded' })
        ]);
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

    it('allows bunker sleep only after the installed cot completes the oxygenated berth', () => {
        const game = baseGame();
        game.dayState = createDayState();
        game.canRestAt = ThreeGame.prototype.canRestAt;
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        const site = { id: 'bunker_cot', ...game.getFirstNightBasePlan().installSocket.transform };
        expect(game.canRestAt(site)).toMatchObject({ allowed: false, reason: 'lacks-installed-bed' });

        const cotId = game.carryState.worldObjects[0].instanceId;
        ThreeGame.prototype.beginCarryObject.call(game, cotId);
        game.player.position.x = site.x;
        game.player.position.z = site.z;
        ThreeGame.prototype.installCurrentCarryObject.call(game);
        expect(game.canRestAt(site)).toMatchObject({ allowed: true, nextDay: 2 });
    });
});
