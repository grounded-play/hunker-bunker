export const CAMPAIGN_LEDGER_STORAGE_KEY = 'hb_campaign_ledger_v1';

export const EMPTY_CAMPAIGN_LEDGER = Object.freeze({
    startedAt: 0,
    runs: 0,
    deaths: 0,
    victories: 0,
    deepestDepthTier: 0
});

function normalize(raw = {}) {
    return {
        startedAt: Math.max(0, Number(raw.startedAt) || 0),
        runs: Math.max(0, Math.floor(Number(raw.runs) || 0)),
        deaths: Math.max(0, Math.floor(Number(raw.deaths) || 0)),
        victories: Math.max(0, Math.floor(Number(raw.victories) || 0)),
        deepestDepthTier: Math.max(0, Math.floor(Number(raw.deepestDepthTier) || 0))
    };
}

export function createCampaignLedger({ storage = null, now = () => Date.now() } = {}) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    return {
        getState() {
            try {
                const parsed = JSON.parse(store?.getItem(CAMPAIGN_LEDGER_STORAGE_KEY) ?? 'null');
                return normalize(parsed ?? EMPTY_CAMPAIGN_LEDGER);
            } catch {
                return normalize(EMPTY_CAMPAIGN_LEDGER);
            }
        },

        recordRun({ outcome = 'death', depthTier = 0 } = {}) {
            const previous = this.getState();
            const next = {
                ...previous,
                startedAt: previous.startedAt || now(),
                runs: previous.runs + 1,
                deaths: previous.deaths + (outcome === 'death' ? 1 : 0),
                victories: previous.victories + (outcome === 'victory' ? 1 : 0),
                deepestDepthTier: Math.max(previous.deepestDepthTier, Math.max(0, Math.floor(Number(depthTier) || 0)))
            };
            try { store?.setItem(CAMPAIGN_LEDGER_STORAGE_KEY, JSON.stringify(next)); } catch { /* best effort */ }
            return next;
        }
    };
}

export const campaignLedger = createCampaignLedger();
