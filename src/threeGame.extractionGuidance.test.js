import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

let originalWindow;
let registrySpy;
let dispatchedEvents;

function stubWindow() {
    registrySpy = {
        trackObjective: vi.fn(),
        resolveObjective: vi.fn()
    };
    dispatchedEvents = [];
    globalThis.window = {
        dispatchEvent: (e) => {
            dispatchedEvents.push(e);
            return true;
        },
        objectiveRegistry: registrySpy
    };
}

describe('activateExtractionGuidance & extraction objective lifecycle', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('tracks mission:extraction with priority 1 and ship airlock coordinates', () => {
        const fakeThis = {
            crashedShips: [{ type: 'SCOUT', tileX: 12.5, tileZ: 18.2 }],
            playerType: 'SCOUT',
            showBunkerLine: vi.fn()
        };
        ThreeGame.prototype.activateExtractionGuidance.call(fakeThis, 'objective_complete');

        expect(registrySpy.trackObjective).toHaveBeenCalledWith({
            id: 'mission:extraction',
            source: 'mission',
            label: 'RETURN TO SHIP FOR EXTRACTION',
            priority: 1,
            compass: { x: 12.5, z: 18.2 }
        });
        expect(fakeThis.showBunkerLine).toHaveBeenCalledWith(
            'OBJECTIVE COMPLETE. EXTRACTION AIRLOCK ARMED. RETURN TO SHIP.'
        );
        expect(dispatchedEvents.some((e) => e.type === 'extraction-ready')).toBe(true);
    });

    it('displays sector purged alert when activated due to all milestone bosses slain', () => {
        const fakeThis = {
            crashedShips: [{ type: 'SCOUT', tileX: 0, tileZ: 0 }],
            showBunkerLine: vi.fn()
        };
        ThreeGame.prototype.activateExtractionGuidance.call(fakeThis, 'sector_purged');

        expect(fakeThis.showBunkerLine).toHaveBeenCalledWith(
            'SECTOR PURGED. EXTRACTION AIRLOCK ACTIVE. RETURN TO SHIP.'
        );
    });

    it('announces the purge once per run, however many bosses fall after it', () => {
        const fakeThis = { crashedShips: [{ type: 'SCOUT', tileX: 0, tileZ: 0 }], showBunkerLine: vi.fn() };
        ThreeGame.prototype.activateExtractionGuidance.call(fakeThis, 'sector_purged');
        ThreeGame.prototype.activateExtractionGuidance.call(fakeThis, 'sector_purged');
        expect(fakeThis.showBunkerLine).toHaveBeenCalledTimes(1);
        expect(registrySpy.trackObjective).toHaveBeenCalledTimes(1);
    });

    it('points at the player\'s own ship when several are down', () => {
        const fakeThis = {
            crashedShips: [{ type: 'TANK', tileX: 1, tileZ: 1 }, { type: 'SCOUT', tileX: 30, tileZ: 40 }],
            playerType: 'SCOUT',
            showBunkerLine: vi.fn()
        };
        ThreeGame.prototype.activateExtractionGuidance.call(fakeThis, 'objective_complete');
        expect(registrySpy.trackObjective.mock.calls[0][0].compass).toEqual({ x: 30, z: 40 });
    });

    it('registers extraction landmark in explorationTracker if present', () => {
        const registerLandmark = vi.fn();
        const fakeThis = {
            crashedShips: [{ type: 'SCOUT', tileX: 50, tileZ: 50 }],
            explorationTracker: { registerLandmark },
            showBunkerLine: vi.fn()
        };
        ThreeGame.prototype.activateExtractionGuidance.call(fakeThis, 'objective_complete');

        expect(registerLandmark).toHaveBeenCalledWith('extraction_airlock', {
            x: 50,
            z: 50,
            label: 'EXTRACTION AIRLOCK',
            type: 'objective'
        });
    });

    it('clears mission:extraction when clearMission is called', () => {
        const fakeThis = { missionState: { type: 'elimination', status: 'objective_complete' } };
        ThreeGame.prototype.clearMission.call(fakeThis);

        expect(registrySpy.resolveObjective).toHaveBeenCalledWith('mission:active', 'abandoned');
        expect(registrySpy.resolveObjective).toHaveBeenCalledWith('mission:extraction', 'abandoned');
    });

    it('resolves mission:extraction as complete when handleExtraction extracts', () => {
        const fakeThis = {
            missionState: { status: 'elevator_ready' },
            bank: { deposit: vi.fn() },
            runDepositedResources: { tech: 0, med: 0, coin: 0 },
            getSessionInventory: () => ({ health: 1, weapon: 2, coin: 3 }),
            getRunStats: () => ({})
        };
        ThreeGame.prototype.handleExtraction.call(fakeThis, { skipElevator: true });

        expect(registrySpy.resolveObjective).toHaveBeenCalledWith('mission:extraction', 'complete');
    });
});
