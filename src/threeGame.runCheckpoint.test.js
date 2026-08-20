import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { runCheckpointStore } from './runCheckpoint.js';

// docs/sprint28plan.md Lane D: crash-recovery checkpoint wiring. Spies
// directly on the real runCheckpointStore singleton's methods (a plain
// object, not frozen) rather than touching real localStorage -- both this
// file and threeGame.js resolve the same module instance, so the spy is
// exactly what threeGame.js's own module-level `runCheckpointStore` calls.
// Same Function.prototype.call() pattern as the rest of this file's
// *.test.js suite (no live WebGL context here).
describe('run checkpoint (crash-recovery) wiring', () => {
    let saveSpy;
    let clearSpy;

    beforeEach(() => {
        saveSpy = vi.spyOn(runCheckpointStore, 'save').mockImplementation(() => {});
        clearSpy = vi.spyOn(runCheckpointStore, 'clear').mockImplementation(() => {});
    });

    afterEach(() => {
        saveSpy.mockRestore();
        clearSpy.mockRestore();
    });

    function makeFakeThis(overrides = {}) {
        return {
            isPlayerDead: false,
            player: { position: { x: 3, z: -7 } },
            maxDepthTierReached: 2,
            playerType: 'ENGINEER',
            getSessionInventory: () => ({ health: 1, ammo: 5, weapon: 2, coin: 4, total: 7 }),
            ...overrides
        };
    }

    describe('updateRunCheckpoint', () => {
        it('saves immediately on the very first call (timer starts ready, like other cooldowns in this file)', () => {
            const fakeThis = makeFakeThis();
            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 5);
            expect(saveSpy).toHaveBeenCalledTimes(1);
        });

        it('does not save again before the interval has elapsed', () => {
            const fakeThis = makeFakeThis();
            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 5); // primes the timer
            saveSpy.mockClear();

            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 5);
            expect(saveSpy).not.toHaveBeenCalled();
        });

        it('saves a snapshot once the interval elapses, from real session state', () => {
            const fakeThis = makeFakeThis();
            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 25);

            expect(saveSpy).toHaveBeenCalledWith({
                x: 3,
                z: -7,
                depth: 2,
                classType: 'ENGINEER',
                salvage: { tech: 2, coin: 4, med: 1 }
            });
        });

        it('does not save again until the interval elapses a second time', () => {
            const fakeThis = makeFakeThis();
            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 25);
            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 5);
            expect(saveSpy).toHaveBeenCalledTimes(1);

            ThreeGame.prototype.updateRunCheckpoint.call(fakeThis, 20);
            expect(saveSpy).toHaveBeenCalledTimes(2);
        });

        it('does nothing while dead or with no player (e.g. menu/mothership)', () => {
            ThreeGame.prototype.updateRunCheckpoint.call(makeFakeThis({ isPlayerDead: true }), 25);
            ThreeGame.prototype.updateRunCheckpoint.call(makeFakeThis({ player: null }), 25);
            expect(saveSpy).not.toHaveBeenCalled();
        });
    });

    describe('graceful-end clearing', () => {
        function makeDeathFakeThis(overrides = {}) {
            return {
                isPlayerDead: false,
                getSessionInventory: () => ({ health: 0, ammo: 0, weapon: 0, coin: 0, total: 0 }),
                closeConsoleModal: () => {},
                showBunkerLine: () => {},
                buildLineDirectorContext: () => ({ register: 'default' }),
                getDepthTierName: () => 'SHALLOW',
                maxDepthTierReached: 0,
                playerType: 'SCOUT',
                player: { position: { x: 0, z: 0 } },
                ...overrides
            };
        }

        let originalWindow;
        beforeEach(() => {
            originalWindow = globalThis.window;
            globalThis.window = { dispatchEvent: () => {}, CustomEvent: globalThis.CustomEvent };
        });
        afterEach(() => {
            globalThis.window = originalWindow;
        });

        it('handleDeath clears the checkpoint -- a real death is already gracefully recorded', () => {
            ThreeGame.prototype.handleDeath.call(makeDeathFakeThis(), 'hazard');
            expect(clearSpy).toHaveBeenCalled();
        });

        it('handleExtraction clears the checkpoint on a successful extraction', () => {
            const fakeThis = {
                missionState: { status: 'elevator_ready' },
                inputEnabled: true,
                getSessionInventory: () => ({ health: 0, ammo: 0, weapon: 0, coin: 0, total: 0 }),
                bank: { deposit: () => {} },
                runDepositedResources: { tech: 0, med: 0, coin: 0 },
                getRunStats: () => ({}),
                netSocket: null
            };
            ThreeGame.prototype.handleExtraction.call(fakeThis, { skipElevator: true });
            expect(clearSpy).toHaveBeenCalled();
        });
    });
});
