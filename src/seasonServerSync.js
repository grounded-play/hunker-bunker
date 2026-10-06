// Steam builds: the Dossier is a mirror of the backend's season ledger
// (docs/planning/season-server-progress-plan-2026-10-06.md). Every verb the
// game already uses (beginRun, recordEvent, settleRun, recordActivity,
// completeOnboarding, claim) goes to the backend; its answer replaces the
// local copy, which stays in localStorage only for display. Event offsets are
// measured from the moment this client started the run, and the backend
// bounds them by the real time it has seen pass.
//
// Unreachable backend: actions wait in an outbox and replay in order on the
// next call. Supply bundles come back as bankable; they are deposited into the
// game's own bank (deduplicated by receipt id) and then acked.

export const SEASON_OUTBOX_KEY = 'hb_season_outbox';
export const SEASON_SYNCED_KEY = 'hb_season_server_synced';

const noAward = (source) => ({ xpAwarded: 0, source, tiersCrossed: [] });

function isTransient(result) {
    if (!result) return true;
    if (result.ok) return false;
    const status = Number(result.status);
    return !status || status >= 500 || status === 401 || status === 429
        || ['steam_backend_unreachable', 'steam_backend_timeout', 'steam_session_unavailable', 'fetch_unavailable'].includes(result.reason);
}

export function createSeasonServerSync({ api, manager, bank, storage, clock = () => Date.now() }) {
    let run = null;
    const runIds = new Map();
    let flushing = Promise.resolve();

    const readOutbox = () => {
        try {
            const items = JSON.parse(storage?.getItem(SEASON_OUTBOX_KEY) ?? '[]');
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    };
    const writeOutbox = (items) => {
        try {
            if (items.length) storage?.setItem(SEASON_OUTBOX_KEY, JSON.stringify(items.slice(-200)));
            else storage?.removeItem?.(SEASON_OUTBOX_KEY);
        } catch { /* display-only cache */ }
    };

    async function bankAndAck(bankable = []) {
        const receiptIds = [];
        for (const { receiptId, reward } of bankable) {
            const deposit = bank?.depositSeasonReward?.({ tech: reward.tech ?? 0, coin: reward.coin ?? 0, med: reward.med ?? 0 }, receiptId);
            if (deposit?.ok) receiptIds.push(receiptId);
        }
        if (!receiptIds.length) return;
        const acked = await api.seasonAction('ack', { receiptIds }).catch(() => null);
        if (acked?.state) manager.save(acked.state);
    }

    async function apply(result) {
        if (result?.state) manager.save(result.state);
        if (result?.bankable?.length) await bankAndAck(result.bankable);
    }

    function awardOf(result, source) {
        const award = result?.award;
        return award ? { xpAwarded: award.xpAwarded ?? 0, source, tiersCrossed: award.tiersCrossed ?? [] } : noAward(source);
    }

    // Send queued actions in order; stop at the first one the backend could not
    // take. Returns the result of the item tagged `want`, if it went through.
    function flush(want = null) {
        flushing = flushing.catch(() => {}).then(async () => {
            let wanted = null;
            let outbox = readOutbox();
            while (outbox.length) {
                const item = outbox[0];
                const body = { ...item.body };
                if (item.localRunId && item.verb !== 'begin') {
                    const runId = runIds.get(item.localRunId);
                    if (!runId) {
                        // Its run never started on the server: nothing to attach it to.
                        outbox = outbox.slice(1);
                        writeOutbox(outbox);
                        continue;
                    }
                    body.runId = runId;
                }
                const result = await api.seasonAction(item.verb, body).catch(() => null);
                if (isTransient(result)) break;
                if (item.verb === 'begin' && result?.runId) runIds.set(item.localRunId, result.runId);
                outbox = outbox.slice(1);
                writeOutbox(outbox);
                await apply(result);
                if (item.tag === want) wanted = result;
            }
            return wanted;
        });
        return flushing;
    }

    function enqueue(verb, body, { localRunId = null } = {}) {
        const tag = `${verb}:${clock()}:${Math.random().toString(36).slice(2)}`;
        writeOutbox([...readOutbox(), { tag, verb, body, localRunId }]);
        return flush(tag);
    }

    return {
        active: true,

        async beginRun(localRunId, initialDepth = 0) {
            run = { localRunId: String(localRunId), startedAt: clock() };
            await enqueue('begin', { initialDepth }, { localRunId: run.localRunId });
            return true;
        },

        async recordEvent({ runId, kind, id, tier, crossing = false } = {}) {
            if (!run || String(runId) !== run.localRunId) return noAward(kind);
            const result = await enqueue('event', { kind, id, tier, crossing: Boolean(crossing), atMs: clock() - run.startedAt }, { localRunId: run.localRunId });
            return awardOf(result, kind);
        },

        async settleRun(runId, outcome) {
            if (!run || String(runId) !== run.localRunId) return noAward('settlement');
            const localRunId = run.localRunId;
            const atMs = clock() - run.startedAt;
            run = null;
            const result = await enqueue('settle', { outcome, atMs }, { localRunId });
            return awardOf(result, 'settlement');
        },

        async recordActivity(id) {
            return awardOf(await enqueue('activity', { id }), 'activity');
        },

        async completeOnboarding(stage, target = null) {
            return awardOf(await enqueue('activity', { onboarding: stage, target }), 'onboarding');
        },

        async claim(tier, track, { selectedChoice = null } = {}) {
            const result = await enqueue('claim', { tier, track, selectedChoice });
            return result?.reward ? { ...result.reward } : null;
        },

        // Pull the backend's ledger. The first time on this machine, offer the
        // pre-server local progress for a one-time import (testers only; the
        // backend clamps it and refuses everyone else).
        async sync() {
            await flush();
            let remote = await api.getSeasonState().catch(() => null);
            if (isTransient(remote)) return { ok: false, offline: true };
            if (!storage?.getItem(SEASON_SYNCED_KEY)) {
                const local = manager.state;
                if (local?.xp > 0 && remote.state?.xp === 0 && !remote.imported) {
                    const imported = await api.seasonAction('import', { state: {
                        seasonId: local.seasonId, version: local.version, xp: local.xp,
                        directives: local.directives, receipts: local.receipts, onboarding: local.onboarding,
                        fragments: local.fragments, events: (local.events ?? []).filter((key) => String(key).startsWith('activity:'))
                    } }).catch(() => null);
                    if (isTransient(imported)) return { ok: false, offline: true };
                    if (imported?.state) remote = imported;
                }
                try { storage?.setItem(SEASON_SYNCED_KEY, '1'); } catch { /* display-only cache */ }
            }
            await apply(remote);
            return { ok: true };
        },

        pendingCount: () => readOutbox().length
    };
}
