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
        bootstrapFirstNightBaseRecovery: ThreeGame.prototype.bootstrapFirstNightBaseRecovery,
        reconcileCarryObjectVisuals: vi.fn(),
        syncBunkerCot: vi.fn(),
        showBunkerLine: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        triggerCameraShake: vi.fn()
    };
}

describe('physical first-night cargo runtime', () => {
    beforeEach(() => browserStub());

    it('bootstraps the cot beside the incomplete berth, and the seal parts once it is in', () => {
        const game = baseGame();
        const result = ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        expect(result.addedCot).toBe(true);
        expect(game.carryState.worldObjects).toEqual([
            expect.objectContaining({ definitionId: 'cot_bed', modelType: 'carry_field_cot_folded' })
        ]);
        expect(game.carryState.installed.some(({ definitionId }) => definitionId === 'cot_bed')).toBe(false);

        ThreeGame.prototype.beginCarryObject.call(game, game.carryState.worldObjects[0].instanceId);
        const socket = game.getFirstNightBasePlan().installSocket.transform;
        game.player.position.x = socket.x;
        game.player.position.z = socket.z;
        expect(ThreeGame.prototype.installCurrentCarryObject.call(game)).toBe(true);
        expect(game.carryState.worldObjects).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'hull_patch_panel', modelType: 'crash_hull_panels' }),
            expect.objectContaining({ definitionId: 'door_seal_kit', modelType: 'mod_pressure_seal' })
        ]));
        expect(game.showBunkerLine).toHaveBeenLastCalledWith(expect.stringContaining('2 BERTH MODULES STILL MISSING'));
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

    it('auto-installs cot bed when dropped directly in or near the bed socket zone', () => {
        const game = baseGame();
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        const cotId = game.carryState.worldObjects[0].instanceId;
        ThreeGame.prototype.beginCarryObject.call(game, cotId);

        const socket = game.getFirstNightBasePlan().installSocket.transform;
        game.player.position.x = socket.x;
        game.player.position.z = socket.z;
        game.installCurrentCarryObject = vi.fn(ThreeGame.prototype.installCurrentCarryObject.bind(game));
        game.syncBedInstallSocketVisual = vi.fn();

        expect(ThreeGame.prototype.dropCurrentCarryObject.call(game)).toBe(true);
        expect(game.installCurrentCarryObject).toHaveBeenCalled();
        expect(game.carryState.installed).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'cot_bed', socketId: 'ship-sleep-bay' })
        ]));
    });

    it('auto-snaps loose cargo into matching socket when sitting inside the socket zone', () => {
        const game = baseGame();
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        const socket = game.getFirstNightBasePlan().installSocket.transform;
        // Position cot on ground within the socket area
        game.carryState.worldObjects[0].worldPosition = { x: socket.x, z: socket.z };
        game.syncBedInstallSocketVisual = vi.fn();

        ThreeGame.prototype.checkLooseCarryObjectSnapToSockets.call(game);
        expect(game.carryState.installed).toEqual(expect.arrayContaining([
            expect.objectContaining({ definitionId: 'cot_bed', socketId: 'ship-sleep-bay' })
        ]));
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('INSTALLED IN ZONE — YOU ARE SET!'));
    });

    it('updates carry and drop interaction prompts based on socket proximity', () => {
        const game = baseGame();
        game.isGameplayInputActive = () => true;
        game.getNearestCarryObject = ThreeGame.prototype.getNearestCarryObject;
        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);

        // Standing near loose cot
        game.player.position.x = 5;
        game.player.position.z = 2;
        ThreeGame.prototype.updateCarryInteractionPrompt.call(game);
        expect(game._carryPromptLabel).toBe('[E] LIFT EXPEDITION RECOVERY COT · BOTH HANDS');

        // Carried away from socket
        ThreeGame.prototype.beginCarryObject.call(game, game.carryState.worldObjects[0].instanceId);
        ThreeGame.prototype.updateCarryInteractionPrompt.call(game);
        expect(game._carryPromptLabel).toBe('[E] SET EXPEDITION RECOVERY COT DOWN');

        // Carried near socket
        const socket = game.getFirstNightBasePlan().installSocket.transform;
        game.player.position.x = socket.x;
        game.player.position.z = socket.z;
        ThreeGame.prototype.updateCarryInteractionPrompt.call(game);
        expect(game._carryPromptLabel).toBe('[E] PLACE EXPEDITION RECOVERY COT (INSTALL)');
    });

    it('syncs glowing bed install socket visibility until the bed is installed', () => {
        const game = baseGame();
        game.performanceProfile = 'gameplay';
        game.scene = { add: vi.fn() };
        game.getTerrainHeightAt = () => 0;

        ThreeGame.prototype.bootstrapFirstNightBaseRecovery.call(game);
        ThreeGame.prototype.setupBedInstallSocketVisual.call(game);
        expect(game.bedInstallSocketVisual).toBeDefined();
        expect(game.bedInstallSocketVisual.visible).toBe(true);

        // Now install the cot
        const cotId = game.carryState.worldObjects[0].instanceId;
        ThreeGame.prototype.beginCarryObject.call(game, cotId);
        const socket = game.getFirstNightBasePlan().installSocket.transform;
        game.player.position.x = socket.x;
        game.player.position.z = socket.z;
        ThreeGame.prototype.installCurrentCarryObject.call(game);

        ThreeGame.prototype.syncBedInstallSocketVisual.call(game);
        expect(game.bedInstallSocketVisual.visible).toBe(false);
    });
});
