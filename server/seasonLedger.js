// Server-held Season progress (docs/planning/season-server-progress-plan-2026-10-06.md).
//
// The backend owns each Steam account's Dossier: XP, ranks, directives,
// fragments and claims. It runs the game's own rules (SeasonPassManager, the
// same class the client uses) over one stored JSON document per account, and
// adds what only a server can: server-issued runs stamped with server time,
// event offsets that can never exceed the time the server has seen pass,
// spacing and run-length floors, and a weekly XP cap. Item rewards are granted
// to Steam inventory with a deterministic requestId per receipt, so a retry
// never grants twice. Supply bundles are the game's own bank, so the client
// banks them and acks.
import { createHash, randomUUID } from 'node:crypto';
import { SeasonPassManager, STORAGE_KEY } from '../src/seasonPass.js';
import { SEASON_ONE, releasedSeasonWeeks, seasonDirectives } from '../src/data/seasonOneConfig.js';
import { getMicroTxnCheckpoint, saveMicroTxnCheckpoint } from './db.js';
import { grantItemToPlayer } from './steamGrant.js';

const envInt = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
};

export function seasonRules() {
    return {
        minXpGapMs: envInt('HB_SEASON_MIN_XP_GAP_MS', 15_000),
        firstObjectiveMs: envInt('HB_SEASON_FIRST_OBJECTIVE_MS', 20_000),
        firstDepthMs: envInt('HB_SEASON_FIRST_DEPTH_MS', 30_000),
        firstBossMs: envInt('HB_SEASON_FIRST_BOSS_MS', 60_000),
        maxBossesPerRun: envInt('HB_SEASON_MAX_BOSSES_PER_RUN', 3),
        minExtractionMs: envInt('HB_SEASON_MIN_EXTRACTION_MS', 180_000),
        runLifetimeMs: envInt('HB_SEASON_RUN_LIFETIME_MS', 3 * 60 * 60 * 1000),
        clockSkewMs: envInt('HB_SEASON_CLOCK_SKEW_MS', 5_000),
        weeklyXpCap: envInt('HB_SEASON_WEEKLY_XP_CAP', 12_000),
        dailyActivityCap: envInt('HB_SEASON_DAILY_ACTIVITY_CAP', 10),
        keepRuns: 20
    };
}

const copy = (value) => JSON.parse(JSON.stringify(value));
const scopeFor = (steamId) => `season.${SEASON_ONE.id}.${steamId}`;
const weekKey = (now) => String(Math.floor(now / 604_800_000));
const dayKey = (now) => String(Math.floor(now / 86_400_000));

// Steam AddItem's requestid is a uint64; one per receipt, stable forever.
export function seasonGrantRequestId(steamId, receiptId) {
    const identity = JSON.stringify(['hb-season-grant-v1', SEASON_ONE.id, String(steamId), String(receiptId)]);
    const value = createHash('sha256').update(identity).digest().readBigUInt64BE(0);
    return String(value || 1n);
}

function emptyServer() {
    return { runs: {}, weeks: {}, activityDays: {}, imported: false, audit: { accepted: 0, rejected: {} } };
}

function managerOver(state, now) {
    const cell = { value: state ? JSON.stringify(state) : null };
    const storage = {
        getItem: (key) => (key === STORAGE_KEY ? cell.value : null),
        setItem: (key, value) => { if (key === STORAGE_KEY) cell.value = value; }
    };
    return new SeasonPassManager({ storage, now: () => now });
}

function reject(server, reason) {
    server.audit.rejected[reason] = (server.audit.rejected[reason] ?? 0) + 1;
    return { ok: true, accepted: false, reason, award: { xpAwarded: 0, tiersCrossed: [] } };
}

// What the client mirrors: the game state, minus bookkeeping it never reads.
export function publicSeasonState(doc) {
    const state = copy(doc.state);
    state.events = state.events.filter((key) => key.startsWith('activity:'));
    return state;
}

function pruneRuns(doc, rules) {
    const settled = Object.entries(doc.server.runs)
        .filter(([, run]) => run.settled)
        .sort(([, a], [, b]) => b.startedAt - a.startedAt);
    for (const [runId] of settled.slice(rules.keepRuns)) {
        delete doc.server.runs[runId];
        delete doc.state.runs[runId];
    }
}

export function createSeasonLedger({
    now = () => Date.now(),
    grant = grantItemToPlayer,
    getDoc = getMicroTxnCheckpoint,
    saveDoc = saveMicroTxnCheckpoint,
    importAllowed = (steamId) => String(process.env.HB_SEASON_IMPORT_STEAM_IDS ?? process.env.HB_STEAM_SANDBOX_STEAM_IDS ?? '')
        .split(',').map((id) => id.trim()).includes(String(steamId))
} = {}) {
    const locks = new Map();

    function withAccount(steamId, action) {
        const previous = locks.get(steamId) ?? Promise.resolve();
        const next = previous.catch(() => {}).then(() => action());
        locks.set(steamId, next.finally(() => { if (locks.get(steamId) === next) locks.delete(steamId); }));
        return next;
    }

    function load(steamId) {
        const record = getDoc(scopeFor(steamId));
        const revision = record?.revision ?? 0;
        const doc = record?.doc ? copy(record.doc) : { state: null, server: emptyServer() };
        doc.server = { ...emptyServer(), ...doc.server };
        doc.state = managerOver(doc.state, now()).state;
        return { doc, revision };
    }

    async function save(steamId, doc, revision) {
        await saveDoc(scopeFor(steamId), { doc }, { expectedRevision: revision });
    }

    // Deliver every pending receipt the rules have created. Items go to Steam;
    // supply bundles stay pending until the client banks them and acks.
    async function settleDeliveries(steamId, doc, { isDevMode }) {
        const manager = managerOver(doc.state, now());
        const delivered = [];
        await manager.settleRewards(async (reward, receiptId) => {
            if (reward.kind !== 'item') return { ok: false, reason: 'client_bank' };
            const result = await grant({
                steamId,
                itemdefid: Number(reward.itemdefid),
                quantity: Number(reward.qty) || 1,
                isDevMode,
                source: 'season',
                mode: 'unique',
                requestId: seasonGrantRequestId(steamId, receiptId),
                tradeRestriction: !isDevMode
            });
            if (result?.ok) delivered.push({ receiptId, itemdefid: Number(reward.itemdefid), quantity: Number(reward.qty) || 1 });
            return { ok: Boolean(result?.ok), reason: result?.reason };
        });
        doc.state = manager.state;
        return delivered;
    }

    function bankable(doc) {
        return Object.values(doc.state.receipts)
            .filter((receipt) => receipt.status !== 'confirmed' && receipt.reward?.kind === 'supply_bundle')
            .map((receipt) => ({ receiptId: receipt.id, reward: copy(receipt.reward) }));
    }

    // Load, change, deliver, save. A conflicting write (another process won)
    // retries once on the fresh document.
    function transact(steamId, { isDevMode = false } = {}, change) {
        return withAccount(steamId, async () => {
            for (let attempt = 0; ; attempt += 1) {
                const { doc, revision } = load(steamId);
                const outcome = await change(doc) ?? {};
                const delivered = outcome.skipDelivery ? [] : await settleDeliveries(steamId, doc, { isDevMode });
                try {
                    await save(steamId, doc, revision);
                } catch (err) {
                    if (attempt === 0 && /conflict/.test(String(err?.message))) continue;
                    throw err;
                }
                const result = { ...outcome };
                delete result.skipDelivery;
                return { ok: true, ...result, delivered, bankable: bankable(doc), state: publicSeasonState(doc) };
            }
        });
    }

    // Try an XP-earning change on a copy; keep it only if the server rules pass.
    function evaluate(doc, rules, at, apply, { xpGapFrom = null } = {}) {
        const trial = managerOver(doc.state, at);
        const award = apply(trial);
        const xp = award?.xpAwarded ?? 0;
        if (xp > 0) {
            if (xpGapFrom && xpGapFrom.lastXpAtMs != null && xpGapFrom.atMs - xpGapFrom.lastXpAtMs < rules.minXpGapMs) {
                return { rejected: 'xp_too_soon' };
            }
            const week = weekKey(at);
            if ((doc.server.weeks[week] ?? 0) + xp > rules.weeklyXpCap) return { rejected: 'weekly_xp_cap' };
            doc.server.weeks[week] = (doc.server.weeks[week] ?? 0) + xp;
        }
        doc.state = trial.state;
        doc.server.audit.accepted += 1;
        return { award: award ?? { xpAwarded: 0, tiersCrossed: [] } };
    }

    function runAt(doc, rules, runId, atMs) {
        const run = doc.server.runs[runId];
        if (!run || run.settled) return { rejected: 'unknown_run' };
        const elapsed = now() - run.startedAt;
        if (elapsed > rules.runLifetimeMs) return { rejected: 'run_expired' };
        if (!Number.isSafeInteger(atMs) || atMs < run.lastAtMs || atMs > elapsed + rules.clockSkewMs) return { rejected: 'implausible_time' };
        return { run };
    }

    return {
        state(steamId) {
            const { doc } = load(steamId);
            return { ok: true, state: publicSeasonState(doc), bankable: bankable(doc), imported: doc.server.imported };
        },

        beginRun(steamId, { initialDepth = 0 } = {}, ctx = {}) {
            const rules = seasonRules();
            return transact(steamId, ctx, (doc) => {
                const runId = `season-run:${randomUUID()}`;
                const depth = Number.isInteger(initialDepth) && initialDepth >= 0 && initialDepth <= 3 ? initialDepth : 0;
                const manager = managerOver(doc.state, now());
                manager.beginRun(runId, depth);
                doc.state = manager.state;
                for (const run of Object.values(doc.server.runs)) if (!run.settled) run.settled = 'abandoned';
                doc.server.runs[runId] = { startedAt: now(), lastAtMs: 0, lastXpAtMs: null, bosses: 0, settled: null };
                pruneRuns(doc, rules);
                return { runId, skipDelivery: true };
            });
        },

        recordEvent(steamId, { runId, kind, id, tier, crossing = false, atMs } = {}, ctx = {}) {
            const rules = seasonRules();
            return transact(steamId, ctx, (doc) => {
                if (!['objective', 'depth', 'boss', 'activity'].includes(kind) || typeof id !== 'string' || !id || id.length > 120) {
                    return reject(doc.server, 'invalid_event');
                }
                const checked = runAt(doc, rules, runId, atMs);
                if (checked.rejected) return reject(doc.server, checked.rejected);
                const { run } = checked;
                const floor = { objective: rules.firstObjectiveMs, depth: rules.firstDepthMs, boss: rules.firstBossMs }[kind] ?? 0;
                if (atMs < floor) return reject(doc.server, 'too_early_in_run');
                if (kind === 'boss' && run.bosses >= rules.maxBossesPerRun) return reject(doc.server, 'boss_cap');
                const result = evaluate(doc, rules, now(),
                    (manager) => manager.recordEvent({ runId, kind, id, tier, crossing: Boolean(crossing) }),
                    { xpGapFrom: { atMs, lastXpAtMs: run.lastXpAtMs } });
                if (result.rejected) return reject(doc.server, result.rejected);
                run.lastAtMs = atMs;
                if (result.award.xpAwarded > 0) run.lastXpAtMs = atMs;
                if (kind === 'boss' && result.award.xpAwarded > 0) run.bosses += 1;
                return { accepted: true, award: result.award };
            });
        },

        settleRun(steamId, { runId, outcome, atMs } = {}, ctx = {}) {
            const rules = seasonRules();
            return transact(steamId, ctx, (doc) => {
                if (!['extracted', 'failed', 'abandoned'].includes(outcome)) return reject(doc.server, 'invalid_outcome');
                const checked = runAt(doc, rules, runId, atMs);
                if (checked.rejected) return reject(doc.server, checked.rejected);
                const { run } = checked;
                // A run too short to be a real expedition settles without the
                // extraction bonus or its fragment.
                const effective = outcome === 'extracted' && atMs < rules.minExtractionMs ? 'abandoned' : outcome;
                const result = evaluate(doc, rules, now(), (manager) => manager.settleRun(runId, effective));
                if (result.rejected) return reject(doc.server, result.rejected);
                run.settled = effective;
                run.lastAtMs = atMs;
                doc.state.events = doc.state.events.filter((key) => !key.startsWith(`${runId}:`));
                pruneRuns(doc, rules);
                return { accepted: true, outcome: effective, award: result.award };
            });
        },

        recordActivity(steamId, { id, onboarding, target = null } = {}, ctx = {}) {
            const rules = seasonRules();
            return transact(steamId, ctx, (doc) => {
                if (onboarding) {
                    if (!['target', 'fabricated', 'equipped'].includes(onboarding)) return reject(doc.server, 'invalid_onboarding');
                    const pinned = target && Number.isSafeInteger(Number(target.itemdefid)) ? { itemdefid: Number(target.itemdefid) } : null;
                    const result = evaluate(doc, rules, now(), (manager) => manager.completeOnboarding(onboarding, pinned));
                    if (result.rejected) return reject(doc.server, result.rejected);
                    return { accepted: true, award: result.award };
                }
                if (typeof id !== 'string' || !id || id.length > 120) return reject(doc.server, 'invalid_activity');
                const day = dayKey(now());
                if ((doc.server.activityDays[day] ?? 0) >= rules.dailyActivityCap) return reject(doc.server, 'activity_cap');
                const result = evaluate(doc, rules, now(), (manager) => manager.recordActivity(id));
                if (result.rejected) return reject(doc.server, result.rejected);
                doc.server.activityDays = { [day]: (doc.server.activityDays[day] ?? 0) + 1 };
                return { accepted: true, award: result.award };
            });
        },

        claim(steamId, { tier, track, selectedChoice = null } = {}, ctx = {}) {
            return transact(steamId, ctx, (doc) => {
                const manager = managerOver(doc.state, now());
                const reward = manager.claim(Number(tier), track, { selectedChoice: Number(selectedChoice) || null, ownedChoices: [] });
                doc.state = manager.state;
                return reward ? { accepted: true, reward } : reject(doc.server, 'not_claimable');
            });
        },

        ack(steamId, { receiptIds = [] } = {}, ctx = {}) {
            return transact(steamId, ctx, (doc) => {
                const manager = managerOver(doc.state, now());
                let acked = 0;
                for (const id of Array.isArray(receiptIds) ? receiptIds.slice(0, 100) : []) {
                    const receipt = Object.values(manager.state.receipts).find((entry) => entry.id === id);
                    if (receipt?.reward?.kind === 'supply_bundle' && manager.resolvePendingClaim(id)) acked += 1;
                }
                doc.state = manager.state;
                return { accepted: true, acked, skipDelivery: true };
            });
        },

        // One-time carry-over of a tester's pre-server local progress, clamped
        // to what the season's rules allow by now.
        importLocal(steamId, { state } = {}, ctx = {}) {
            return transact(steamId, ctx, (doc) => {
                if (!importAllowed(steamId)) return reject(doc.server, 'import_not_allowed');
                if (doc.server.imported || doc.state.xp > 0 || Object.keys(doc.server.runs).length) return reject(doc.server, 'ledger_not_empty');
                if (state?.seasonId !== SEASON_ONE.id || state.version !== SEASON_ONE.version || !Number.isSafeInteger(state.xp) || state.xp < 0) {
                    return reject(doc.server, 'invalid_import');
                }
                const weeks = releasedSeasonWeeks(now());
                const directives = {};
                for (const entry of seasonDirectives(weeks)) {
                    const value = Number(state.directives?.[entry.id]);
                    if (Number.isSafeInteger(value) && value > 0) directives[entry.id] = Math.min(value, entry.target);
                }
                const banked = {};
                for (const [key, receipt] of Object.entries(state.receipts ?? {})) {
                    // Supply bundles were banked locally already; items never
                    // reached Steam, so the server claims and grants them anew.
                    if (receipt?.status === 'confirmed' && receipt.reward?.kind === 'supply_bundle') banked[key] = copy(receipt);
                }
                const onboarding = {};
                for (const stage of ['objective', 'target', 'fabricated', 'equipped', 'usefulLoop']) if (state.onboarding?.[stage] === true) onboarding[stage] = true;
                doc.state = {
                    ...doc.state,
                    xp: Math.min(state.xp, 30 * SEASON_ONE.xpPerRank),
                    directives,
                    receipts: banked,
                    onboarding,
                    events: (state.events ?? []).filter((key) => typeof key === 'string' && key.startsWith('activity:')).slice(0, 200),
                    // Fragments earned locally never reached Steam. Rare ones
                    // re-trigger from the imported directives on the next
                    // directive progress; common ones become one grant now.
                    fragments: { common: Math.min(Number(state.fragments?.common) || 0, weeks * SEASON_ONE.commonPerWeek), rareWeeks: [] }
                };
                if (doc.state.fragments.common > 0) {
                    doc.state.receipts['fragment:common:import'] = {
                        id: `${SEASON_ONE.id}:fragment:common:import`, key: 'fragment:common:import', status: 'pending',
                        reward: { kind: 'item', itemdefid: 1000, qty: doc.state.fragments.common, label: 'Common Relic Fragment' }
                    };
                }
                doc.server.imported = true;
                return { accepted: true, imported: true };
            });
        }
    };
}
