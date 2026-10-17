import { afterEach, beforeEach, describe, it, expect } from 'vitest';
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
});
