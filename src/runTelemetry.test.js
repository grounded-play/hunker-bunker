import { describe, expect, it } from 'vitest';
import { buildRunResourceTelemetry, recordCollectedPickup, recordDebugResourceGrant, resetRunResourceTelemetry } from './runTelemetry.js';

describe('run resource telemetry', () => {
    it('counts one accepted pickup once and does not change when bank balance is spent', () => {
        const state = {};
        resetRunResourceTelemetry(state);
        recordCollectedPickup(state, { value: 4 });
        const beforeSpend = buildRunResourceTelemetry(state, { tech: 10, coin: 2, med: 1 });
        const afterSpend = buildRunResourceTelemetry(state, { tech: 3, coin: 2, med: 1 });
        expect(beforeSpend).toMatchObject({ totalPickups: 1, pickupsCollected: 1, pickupValueCollected: 4, salvageBanked: 13 });
        expect(afterSpend).toMatchObject({ totalPickups: 1, pickupsCollected: 1, pickupValueCollected: 4, salvageBanked: 6 });
    });

    it('keeps debug grants distinct from both pickup count and bank balance', () => {
        const state = {};
        resetRunResourceTelemetry(state);
        recordDebugResourceGrant(state, { tech: 99, ammo: 10 });
        expect(buildRunResourceTelemetry(state, { tech: 99 })).toMatchObject({
            totalPickups: 0,
            pickupValueCollected: 0,
            salvageBanked: 99,
            debugGrantedResources: { tech: 99, ammo: 10 }
        });
    });
});
