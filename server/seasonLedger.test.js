import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeasonLedger, seasonGrantRequestId } from './seasonLedger.js';

// docs/planning/season-server-progress-plan-2026-10-06.md
const STEAM_ID = '76561198000000077';
const SEC = 1000;

function harness({ importAllowed = () => false } = {}) {
    let clock = Date.parse('2026-10-06T12:00:00Z'); // season week 4
    const docs = new Map();
    const grants = [];
    const grant = vi.fn(async (request) => {
        grants.push(request);
        return { ok: true, granted: [{ itemId: `i${grants.length}`, itemdefid: request.itemdefid, quantity: request.quantity }] };
    });
    const ledger = createSeasonLedger({
        now: () => clock,
        grant,
        getDoc: (scope) => (docs.has(scope) ? JSON.parse(JSON.stringify(docs.get(scope))) : null),
        saveDoc: async (scope, value, { expectedRevision }) => {
            const current = docs.get(scope);
            if ((current?.revision ?? 0) !== expectedRevision) throw new Error('report_checkpoint_conflict');
            docs.set(scope, { ...JSON.parse(JSON.stringify(value)), revision: expectedRevision + 1 });
        },
        importAllowed
    });
    return { ledger, grants, grant, advance: (ms) => { clock += ms; }, docs };
}

describe('server season ledger', () => {
    beforeEach(() => {
        for (const key of Object.keys(process.env)) if (key.startsWith('HB_SEASON_')) delete process.env[key];
    });
    afterEach(() => { vi.restoreAllMocks(); });

    it('awards a real objective inside a server-issued run and remembers it', async () => {
        const { ledger, advance } = harness();
        const { runId } = await ledger.beginRun(STEAM_ID);
        expect(runId).toMatch(/^season-run:/);
        advance(25 * SEC);
        const result = await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'mission:1', atMs: 25 * SEC });
        // 50 for the room plus the one-time 1,000 onboarding bonus.
        expect(result).toMatchObject({ accepted: true, award: { xpAwarded: 1050 } });
        expect(ledger.state(STEAM_ID).state.xp).toBe(1050);
    });

    it('refuses events the server clock cannot account for', async () => {
        const { ledger, advance } = harness();
        const { runId } = await ledger.beginRun(STEAM_ID);
        advance(10 * SEC);
        expect(await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'a', atMs: 10 * SEC }))
            .toMatchObject({ accepted: false, reason: 'too_early_in_run' });
        expect(await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'a', atMs: 90 * SEC }))
            .toMatchObject({ accepted: false, reason: 'implausible_time' });
        expect(await ledger.recordEvent(STEAM_ID, { runId: 'season-run:made-up', kind: 'objective', id: 'a', atMs: 5 * SEC }))
            .toMatchObject({ accepted: false, reason: 'unknown_run' });
        expect(ledger.state(STEAM_ID).state.xp).toBe(0);
    });

    it('spaces XP-earning events and refuses a scripted burst', async () => {
        const { ledger, advance } = harness();
        const { runId } = await ledger.beginRun(STEAM_ID);
        advance(60 * SEC);
        expect((await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'a', atMs: 30 * SEC })).accepted).toBe(true);
        expect(await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'b', atMs: 35 * SEC }))
            .toMatchObject({ accepted: false, reason: 'xp_too_soon' });
        expect((await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'c', atMs: 50 * SEC })).accepted).toBe(true);
    });

    it('caps XP per week', async () => {
        process.env.HB_SEASON_WEEKLY_XP_CAP = '1080';
        const { ledger, advance } = harness();
        const { runId } = await ledger.beginRun(STEAM_ID);
        advance(120 * SEC);
        expect((await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'a', atMs: 30 * SEC })).accepted).toBe(true);
        expect(await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'b', atMs: 60 * SEC }))
            .toMatchObject({ accepted: false, reason: 'weekly_xp_cap' });
    });

    it('pays the extraction bonus and fragment only for a run long enough to be real, and grants the fragment once', async () => {
        const quick = harness();
        let run = (await quick.ledger.beginRun(STEAM_ID)).runId;
        quick.advance(120 * SEC);
        for (const [i, at] of [[1, 30], [2, 50], [3, 70]]) await quick.ledger.recordEvent(STEAM_ID, { runId: run, kind: 'objective', id: `o${i}`, atMs: at * SEC });
        expect(await quick.ledger.settleRun(STEAM_ID, { runId: run, outcome: 'extracted', atMs: 110 * SEC }))
            .toMatchObject({ outcome: 'abandoned', award: { xpAwarded: 0 } });
        expect(quick.grants.filter((g) => g.itemdefid === 1000)).toHaveLength(0);

        const real = harness();
        run = (await real.ledger.beginRun(STEAM_ID)).runId;
        real.advance(240 * SEC);
        for (const [i, at] of [[1, 30], [2, 50], [3, 70]]) await real.ledger.recordEvent(STEAM_ID, { runId: run, kind: 'objective', id: `o${i}`, atMs: at * SEC });
        const settled = await real.ledger.settleRun(STEAM_ID, { runId: run, outcome: 'extracted', atMs: 230 * SEC });
        expect(settled).toMatchObject({ outcome: 'extracted', award: { xpAwarded: 300 } });
        const fragmentGrants = real.grants.filter((g) => g.itemdefid === 1000);
        expect(fragmentGrants).toHaveLength(1);
        expect(fragmentGrants[0]).toMatchObject({ steamId: STEAM_ID, quantity: 1, source: 'season' });
        expect(fragmentGrants[0].requestId).toBe(seasonGrantRequestId(STEAM_ID, `deep-crust-beta-1:fragment:common:${run}`));
        await real.ledger.state(STEAM_ID);
        await real.ledger.beginRun(STEAM_ID);
        expect(real.grants.filter((g) => g.itemdefid === 1000)).toHaveLength(1);
    });

    it('grants a rank\'s item when the server ledger reaches it, and leaves supply bundles for the client bank', async () => {
        const { ledger, advance, grants } = harness();
        const { runId } = await ledger.beginRun(STEAM_ID);
        advance(600 * SEC);
        // 1,050 + 4 x 50 + depth 250 = 1,500 -> rank 1.
        await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: 'o1', atMs: 30 * SEC });
        for (const [i, at] of [[2, 60], [3, 90], [4, 120], [5, 150]]) await ledger.recordEvent(STEAM_ID, { runId, kind: 'objective', id: `o${i}`, atMs: at * SEC });
        const crossed = await ledger.recordEvent(STEAM_ID, { runId, kind: 'depth', id: 'depth:1', tier: 1, crossing: true, atMs: 180 * SEC });
        expect(crossed.state.xp).toBe(1500);
        expect(grants.map((g) => g.itemdefid)).toContain(4120);
        expect(crossed.delivered).toEqual(expect.arrayContaining([expect.objectContaining({ itemdefid: 4120 })]));
        const bundles = crossed.bankable;
        expect(bundles.map((b) => b.reward.kind)).toEqual(['supply_bundle']);

        const acked = await ledger.ack(STEAM_ID, { receiptIds: bundles.map((b) => b.receiptId) });
        expect(acked.bankable).toEqual([]);
        expect(grants.filter((g) => g.itemdefid === 4120)).toHaveLength(1);
    });

    it('never grants the premium track without a verified entitlement', async () => {
        const { ledger } = harness();
        expect(await ledger.claim(STEAM_ID, { tier: 3, track: 'premium' })).toMatchObject({ accepted: false, reason: 'not_claimable' });
    });

    it('imports a tester\'s local progress once, clamped, and grants what it unlocked', async () => {
        const { ledger, grants } = harness({ importAllowed: (id) => id === STEAM_ID });
        const local = {
            seasonId: 'deep-crust-beta-1', version: 1, xp: 19300, events: ['activity:fabrication:1', 'r:objective:x'], runs: {}, activeRunId: null,
            directives: { 'week:1:objectives': 99, 'week:9:objectives': 8 },
            receipts: { 'rank:2:free': { id: 'deep-crust-beta-1:rank:2:free', status: 'confirmed', reward: { kind: 'supply_bundle', tech: 5, coin: 2, med: 1 } } },
            onboarding: { objective: true }, pinnedTarget: null, fragments: { common: 50, rareWeeks: [1, 2] }
        };
        const result = await ledger.importLocal(STEAM_ID, { state: local });
        expect(result).toMatchObject({ accepted: true, imported: true });
        expect(result.state).toMatchObject({ xp: 19300, directives: { 'week:1:objectives': 8 }, fragments: { common: 12 } });
        expect(result.state.directives['week:9:objectives']).toBeUndefined();
        // Ranks 1, 3, 6, 9 and 12 carry free-track items; supply ranks were banked already.
        expect(grants.map((g) => g.itemdefid).sort()).toEqual([1000, 4100, 4120, 4122, 4130, 4132].sort());
        expect(grants.find((g) => g.itemdefid === 1000).quantity).toBe(12);
        expect(result.bankable.map((b) => b.receiptId)).not.toContain('deep-crust-beta-1:rank:2:free');

        expect(await ledger.importLocal(STEAM_ID, { state: local })).toMatchObject({ accepted: false, reason: 'ledger_not_empty' });
    });

    it('refuses an import from an account that is not a tester', async () => {
        const { ledger } = harness();
        const local = { seasonId: 'deep-crust-beta-1', version: 1, xp: 45000, directives: {}, receipts: {}, fragments: {} };
        expect(await ledger.importLocal(STEAM_ID, { state: local })).toMatchObject({ accepted: false, reason: 'import_not_allowed' });
        expect(ledger.state(STEAM_ID).state.xp).toBe(0);
    });
});
