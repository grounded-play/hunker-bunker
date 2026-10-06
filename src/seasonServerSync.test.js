import { describe, expect, it, vi } from 'vitest';
import { createSeasonServerSync, SEASON_OUTBOX_KEY } from './seasonServerSync.js';
import { SeasonPassManager } from './seasonPass.js';
import { createSeasonLedger } from '../server/seasonLedger.js';

// The client mirror against the real server ledger, in-process: a Steam
// build's Dossier shows the backend's progress and the backend grants items.
const STEAM_ID = '76561198000000077';
const SEC = 1000;

function memoryStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map };
}

function world({ tester = false, localSave = null } = {}) {
    let clock = Date.parse('2026-10-06T12:00:00Z');
    const docs = new Map();
    const grants = [];
    const ledger = createSeasonLedger({
        now: () => clock,
        grant: async (request) => { grants.push(request); return { ok: true, granted: [{ itemdefid: request.itemdefid, quantity: request.quantity }] }; },
        getDoc: (scope) => (docs.has(scope) ? JSON.parse(JSON.stringify(docs.get(scope))) : null),
        saveDoc: async (scope, value, { expectedRevision }) => { docs.set(scope, { ...JSON.parse(JSON.stringify(value)), revision: expectedRevision + 1 }); },
        importAllowed: () => tester
    });
    let online = true;
    const verbs = { begin: 'beginRun', event: 'recordEvent', settle: 'settleRun', activity: 'recordActivity', claim: 'claim', ack: 'ack', import: 'importLocal' };
    const api = {
        getSeasonState: vi.fn(async () => (online ? ledger.state(STEAM_ID) : { ok: false, reason: 'steam_backend_unreachable' })),
        seasonAction: vi.fn(async (verb, body) => {
            if (!online) return { ok: false, reason: 'steam_backend_unreachable' };
            const result = await ledger[verbs[verb]](STEAM_ID, verb === 'import' ? body : body, { isDevMode: false });
            return result;
        })
    };
    const storage = memoryStorage(localSave ? { hb_season_deep_crust_beta_1_v1: JSON.stringify(localSave) } : {});
    const manager = new SeasonPassManager({ storage, now: () => clock });
    const bank = { receipts: new Set(), totals: { tech: 0, coin: 0, med: 0 },
        depositSeasonReward(amounts, id) {
            if (this.receipts.has(id)) return { ok: true, duplicate: true };
            this.receipts.add(id);
            for (const [k, v] of Object.entries(amounts)) this.totals[k] += v;
            return { ok: true };
        } };
    const sync = createSeasonServerSync({ api, manager, bank, storage, clock: () => clock });
    return { sync, manager, bank, grants, api, storage, advance: (ms) => { clock += ms; }, setOnline: (value) => { online = value; } };
}

describe('Dossier mirror of the server ledger', () => {
    it('shows server-awarded XP and grants the rank item through the backend', async () => {
        const w = world();
        await w.sync.beginRun('local:run-1');
        w.advance(30 * SEC);
        expect(await w.sync.recordEvent({ runId: 'local:run-1', kind: 'objective', id: 'o1' })).toMatchObject({ xpAwarded: 1050 });
        for (let i = 2; i <= 5; i += 1) {
            w.advance(20 * SEC);
            await w.sync.recordEvent({ runId: 'local:run-1', kind: 'objective', id: `o${i}` });
        }
        w.advance(20 * SEC);
        const crossed = await w.sync.recordEvent({ runId: 'local:run-1', kind: 'depth', id: 'depth:1', tier: 1, crossing: true });
        expect(crossed.tiersCrossed).toEqual([1]);
        expect(w.manager.state.xp).toBe(1500);
        expect(w.grants.map((g) => g.itemdefid)).toContain(4120);
        // The rank-1 patch is confirmed; the first-objective supplies were banked and acked.
        expect(w.manager.isClaimed(1, 'free')).toBe(true);
        expect(w.bank.totals).toEqual({ tech: 20, coin: 10, med: 5 });
        expect(Object.values(w.manager.state.receipts).every((r) => r.status === 'confirmed')).toBe(true);
    });

    it('keeps actions in an outbox while the backend is unreachable and replays them in order', async () => {
        const w = world();
        await w.sync.beginRun('local:run-2');
        w.setOnline(false);
        w.advance(30 * SEC);
        expect(await w.sync.recordEvent({ runId: 'local:run-2', kind: 'objective', id: 'o1' })).toMatchObject({ xpAwarded: 0 });
        expect(w.sync.pendingCount()).toBe(1);
        expect(JSON.parse(w.storage.getItem(SEASON_OUTBOX_KEY))[0]).toMatchObject({ verb: 'event' });
        w.setOnline(true);
        w.advance(5 * SEC);
        await w.sync.sync();
        expect(w.sync.pendingCount()).toBe(0);
        expect(w.manager.state.xp).toBe(1050);
    });

    it('ignores events from a run this client did not start', async () => {
        const w = world();
        await w.sync.beginRun('local:run-3');
        w.advance(30 * SEC);
        expect(await w.sync.recordEvent({ runId: 'local:other', kind: 'objective', id: 'o1' })).toMatchObject({ xpAwarded: 0 });
        expect(w.api.seasonAction).not.toHaveBeenCalledWith('event', expect.anything());
    });

    it('imports a tester\'s local progress on first sync and grants what it unlocked', async () => {
        const localSave = { seasonId: 'deep-crust-beta-1', version: 1, xp: 19300, events: [], runs: {}, activeRunId: null,
            directives: { 'week:1:objectives': 8 }, receipts: {}, onboarding: { objective: true }, pinnedTarget: null, fragments: { common: 3, rareWeeks: [] } };
        const w = world({ tester: true, localSave });
        await w.sync.sync();
        expect(w.manager.state.xp).toBe(19300);
        expect(w.grants.map((g) => g.itemdefid)).toEqual(expect.arrayContaining([4120, 4130, 4100, 4122, 4132, 1000]));
        // A second sync does not offer the import again.
        await w.sync.sync();
        expect(w.api.seasonAction.mock.calls.filter(([verb]) => verb === 'import')).toHaveLength(1);
    });

    it('shows the server ledger, not the old local save, for an account that cannot import', async () => {
        const localSave = { seasonId: 'deep-crust-beta-1', version: 1, xp: 45000, events: [], runs: {}, activeRunId: null,
            directives: {}, receipts: {}, onboarding: {}, pinnedTarget: null, fragments: { common: 0, rareWeeks: [] } };
        const w = world({ tester: false, localSave });
        await w.sync.sync();
        expect(w.manager.state.xp).toBe(0);
        expect(w.grants).toEqual([]);
    });
});
