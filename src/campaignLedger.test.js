import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LEDGER_STORAGE_KEY, createCampaignLedger } from './campaignLedger.js';

function storage() {
    const data = new Map();
    return {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key)
    };
}

describe('campaign ledger', () => {
    it('tracks campaign-only run totals and deepest tier', () => {
        const store = storage();
        const ledger = createCampaignLedger({ storage: store, now: () => 42 });

        ledger.recordRun({ outcome: 'death', depthTier: 2 });
        expect(ledger.recordRun({ outcome: 'victory', depthTier: 1 })).toEqual({
            startedAt: 42,
            runs: 2,
            deaths: 1,
            victories: 1,
            deepestDepthTier: 2
        });
        expect(store.getItem(CAMPAIGN_LEDGER_STORAGE_KEY)).not.toBeNull();
    });
});
