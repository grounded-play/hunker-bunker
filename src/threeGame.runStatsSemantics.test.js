import { afterEach, describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame run-stat semantics', () => {
    const previousWindow = globalThis.window;
    afterEach(() => { globalThis.window = previousWindow; });

    it('separates collected count/value, mutable bank balance and debug grants', () => {
        globalThis.window = {
            pickupCounterState: {
                collectedCount: 3,
                collectedValue: 8,
                debugGrantedResources: { tech: 999 }
            }
        };
        const game = {
            bank: { getState: () => ({ med: 2, tech: 4, coin: 1 }), getO2GeneratorLevel: () => 2 },
            totalDistanceTravelled: 12.6,
            maxDepthTierReached: 1,
            getDepthTierName: () => 'DEEP',
            currentBiomeKey: 'cryo',
            getBiomeLabel: () => 'CRYO',
            snailsKilledThisRun: 4,
            missionState: null,
            hadNearDeath: false
        };

        const stats = ThreeGame.prototype.getRunStats.call(game);
        expect(stats).toMatchObject({
            totalPickups: 3,
            pickupsCollected: 3,
            pickupValueCollected: 8,
            salvageBanked: 7,
            bankBalance: { med: 2, tech: 4, coin: 1 },
            debugGrantedResources: { tech: 999 }
        });
    });
});
