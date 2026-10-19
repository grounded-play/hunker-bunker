import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { SECTOR_ZERO_PHASES } from './sectorZeroTutorial.js';

describe('ThreeGame Sector Zero Integration', () => {
    let priorWindow;
    let priorCustomEvent;

    beforeEach(() => {
        priorWindow = globalThis.window;
        priorCustomEvent = globalThis.CustomEvent;
        globalThis.window = new EventTarget();
        globalThis.CustomEvent ??= class CustomEvent extends Event {
            constructor(type, options = {}) {
                super(type);
                this.detail = options.detail;
            }
        };
    });

    afterEach(() => {
        if (priorWindow === undefined) delete globalThis.window;
        else globalThis.window = priorWindow;
        if (priorCustomEvent === undefined) delete globalThis.CustomEvent;
        else globalThis.CustomEvent = priorCustomEvent;
    });

    function createMockGame() {
        const game = Object.create(ThreeGame.prototype);
        game.sectorZeroTutorial = null;
        game._sectorZeroListenersBound = false;
        game.totalDistanceTravelled = 0;
        game._sectorZeroMovedDistance = 0;
        game._sectorZeroMovedMs = 0;
        game.scatterSprites = [];
        return game;
    }

    it('initializes and starts Sector 0 tutorial via startSectorZeroTutorial', () => {
        const game = createMockGame();
        const initialPhase = game.startSectorZeroTutorial();
        expect(initialPhase).toBe(SECTOR_ZERO_PHASES.BOOT);
        expect(game.sectorZeroTutorial).toBeDefined();
        expect(game.sectorZeroTutorial.isActive).toBe(true);
        expect(game.sectorZeroTutorial.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.BOOT);
    });

    it('listens for dispatched window events and advances phases', () => {
        const game = createMockGame();
        game.startSectorZeroTutorial();

        // Boot -> Weapon
        window.dispatchEvent(new CustomEvent('player-moved', { detail: { distance: 3.5, movedMs: 2500 } }));
        expect(game.sectorZeroTutorial.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.WEAPON);

        // Weapon -> Salvage
        window.dispatchEvent(new CustomEvent('weapon-equipped', { detail: {} }));
        window.dispatchEvent(new CustomEvent('barrier-shot', { detail: {} }));
        expect(game.sectorZeroTutorial.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.SALVAGE);

        // Salvage -> Combat
        window.dispatchEvent(new CustomEvent('salvage-collected', { detail: {} }));
        window.dispatchEvent(new CustomEvent('console-deposited', { detail: { scrap: 15 } }));
        expect(game.sectorZeroTutorial.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.COMBAT);

        // Combat -> Departure
        window.dispatchEvent(new CustomEvent('enemy-killed', { detail: { type: 'alien_proto_crawler' } }));
        expect(game.sectorZeroTutorial.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.DEPARTURE);

        // Departure -> Complete
        window.dispatchEvent(new CustomEvent('gate-crossed', { detail: {} }));
        expect(game.sectorZeroTutorial.getCurrentPhase()).toBe(SECTOR_ZERO_PHASES.COMPLETE);
        expect(game.sectorZeroTutorial.isActive).toBe(false);
    });

    it('turns each phase into a live world action and holds the exit until combat clears', () => {
        const game = createMockGame();
        game.fieldWeaponRunState = { runId: 'tutorial-run' };
        game.bunkerBlastDoorState = { open: true, y: -2.4, targetY: -2.4 };
        game.bunkerBlastDoorGroup = { position: { y: -2.4 } };
        game.spawnFieldWeaponDrop = vi.fn(() => ({}));
        const enemy = { userData: { hp: 3, maxHp: 3, speed: 1.5, attackCooldown: 0 } };
        game.spawnEnemyInstance = vi.fn(() => enemy);
        game.openBunkerBlastDoor = vi.fn();

        game.startSectorZeroTutorial();
        expect(game.bunkerBlastDoorState).toMatchObject({ open: false, y: 1.4, targetY: 1.4 });

        game.sectorZeroTutorial.handleEvent('player-moved', { distance: 3.1 });
        expect(game.spawnFieldWeaponDrop).toHaveBeenCalledWith(
            'mk1_sidearm', 4.35, 10.4,
            expect.objectContaining({ ammoInWeapon: 12, reserveAmmo: 36 })
        );
        game.sectorZeroTutorial.handleEvent('field-weapon-equipped');
        game.sectorZeroTutorial.handleEvent('obstacle-destroyed', { obstacleId: 'jammed_hydraulic_cable' });
        game.sectorZeroTutorial.handleEvent('salvage-collected', { amount: 10 });
        game.sectorZeroTutorial.handleEvent('console-deposited', { scrap: 10 });

        expect(game.spawnEnemyInstance).toHaveBeenCalledWith('alien_proto_crawler', 9, 5.25);
        expect(enemy.userData).toMatchObject({
            hp: 1,
            maxHp: 1,
            speed: 0.72,
            attackCooldown: 2.5,
            isSectorZeroTutorialEnemy: true
        });
        expect(game.openBunkerBlastDoor).not.toHaveBeenCalled();
        game.sectorZeroTutorial.handleEvent('enemy-killed', { type: 'alien_proto_crawler' });
        expect(game.openBunkerBlastDoor).toHaveBeenCalledOnce();
    });

    it('skips into a viable run with a sidearm, 25 tech and an open gate', () => {
        const game = createMockGame();
        game.player = { position: { x: 4, z: 8 } };
        game.fieldWeaponRunState = { runId: 'tutorial-run', equipped: null, worldDrops: [] };
        const sidearm = { instanceId: 'skip-sidearm', profileId: 'mk1_sidearm' };
        game.spawnFieldWeaponDrop = vi.fn(() => sidearm);
        game.interactWithFieldWeaponDrop = vi.fn(() => true);
        game.addScrap = vi.fn(() => true);
        game.openBunkerBlastDoor = vi.fn();
        game.showBunkerLine = vi.fn();
        const completed = vi.fn();
        window.addEventListener('sector-zero-completed', completed);

        game.startSectorZeroTutorial();
        expect(game.skipSectorZeroTutorial()).toBe(true);

        expect(game.spawnFieldWeaponDrop).toHaveBeenCalledWith(
            'mk1_sidearm', 4, 8,
            expect.objectContaining({ ammoInWeapon: 12, reserveAmmo: 36 })
        );
        expect(game.interactWithFieldWeaponDrop).toHaveBeenCalledWith('skip-sidearm');
        expect(game.addScrap).toHaveBeenCalledWith(25);
        expect(game.openBunkerBlastDoor).toHaveBeenCalledOnce();
        expect(completed).toHaveBeenCalledOnce();
        expect(completed.mock.calls[0][0].detail).toMatchObject({ skipped: true });
        expect(game.skipSectorZeroTutorial()).toBe(false);
    });

    it('keeps ambient expedition systems disabled until Sector 0 resolves', () => {
        const game = createMockGame();
        game.armArrivalIncident = vi.fn();
        game.armExpeditionEvent = vi.fn();
        game.setSectorZeroOnboardingPending(true);

        expect(game.isSectorZeroOnboardingActive()).toBe(true);
        expect(game.snailsEnabled).toBe(false);
        game.startSectorZeroTutorial();
        expect(game.isSectorZeroOnboardingActive()).toBe(true);

        game.sectorZeroTutorial._finish({ skipped: true });
        expect(game.isSectorZeroOnboardingActive()).toBe(false);
        expect(game.snailsEnabled).toBe(true);
        expect(game.armArrivalIncident).toHaveBeenCalledOnce();
        expect(game.armExpeditionEvent).toHaveBeenCalledOnce();
    });

    it('rejects a Sector 0 first frame staged in the showroom or without the origin chunk', () => {
        const game = createMockGame();
        game.performanceProfile = 'gameplay';
        game.chunkSize = 49;
        game.player = { position: { x: 4925, z: 4925 } };
        game.chunkMeshes = new Map([['100,100', {}]]);
        game.pendingChunkMounts = [];

        expect(() => game.validatePreparedDeployment({ expectedSectorZero: true }))
            .toThrow(/player staged in chunk 100,100/);

        game.player.position = { x: 9, z: 9 };
        expect(() => game.validatePreparedDeployment({ expectedSectorZero: true }))
            .toThrow(/origin chunk was not mounted/);

        game.chunkMeshes.set('0,0', {});
        expect(game.validatePreparedDeployment({ expectedSectorZero: true }))
            .toMatchObject({ chunkX: 0, chunkY: 0 });
    });
});
