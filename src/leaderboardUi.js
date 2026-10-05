import { t } from './i18n.js';
import { describeRunSubmitResult } from './steam/runSubmitQueue.js';
/**
 * Leaderboard UI Frontend Implementation
 * Extracted from main.js for modular UI architecture.
 */

// The board is read after this run's submit settles, so the run just played
// is in the list; capped so a slow uplink never leaves the panel spinning.
export const RUN_SUBMIT_WAIT_MS = 5000;

function waitForSubmission(submission, timeoutMs) {
    if (!submission) return Promise.resolve(null);
    let timer;
    return Promise.race([
        Promise.resolve(submission).catch(() => null),
        new Promise((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); })
    ]).finally(() => clearTimeout(timer));
}

export function formatLeaderboardScore(board, score) {
    if (board === 'fastest_extraction_ms') {
        const total = Math.max(0, Math.floor(Number(score) / 1000) || 0);
        return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
    }
    if (board === 'survival_time_seconds') {
        const mins = Math.floor(score / 60);
        const secs = score % 60;
        return `${mins}m ${secs}s`;
    }
    if (board === 'deepest_depth_score') {
        const tier = Math.floor(score / 100000);
        const depth = score % 100000;
        return `Tier ${tier} - ${depth}m`;
    }
    return String(score);
}

export function getGameOverLeaderboardBoard(payload = {}) {
    if (payload.run?.dailyOps?.date) return 'daily_ops_score';
    return 'best_run_score';
}

export function getGameOverLeaderboardLabel(board) {
    if (board === 'daily_ops_score') return 'DAILY OPS';
    if (board === 'survival_time_seconds') return 'SURVIVAL TIME';
    if (board === 'deepest_depth_score') return 'DEEPEST DEPTH';
    if (board === 'fastest_extraction_ms') return 'FASTEST EXTRACTION';
    return 'BEST RUN SCORE';
}

/**
 * One read of a Steam board, shared by the Game Over panel and Archive →
 * RECORDS. `scope` is Global, Friends or AroundUser. On Global, your own row
 * is pinned after a separator when you are outside the requested top.
 */
export async function fetchLeaderboard({ board, scope = 'Global', count = 10, api = globalThis.window?.electronAPI } = {}) {
    if (!api?.getSteamLeaderboard) return { state: 'offline', entries: [], selfSteamId: null };
    try {
        const [result, identity] = await Promise.all([
            api.getSteamLeaderboard(board, scope, count),
            api.getSteamIdentity?.().catch(() => null) ?? null
        ]);
        if (!result?.ok) return { state: 'offline', entries: [], selfSteamId: null };
        const selfSteamId = identity?.steamId64 ?? (result.mock ? '76561198000000000' : null);
        let entries = result.entries ?? [];
        const hasSelf = entries.some((entry) => selfSteamId && String(entry.steamId64) === String(selfSteamId));
        if (scope === 'Global' && !hasSelf && selfSteamId) {
            try {
                const around = await api.getSteamLeaderboard(board, 'AroundUser', 1);
                const selfEntry = around?.ok ? around.entries?.find((entry) => String(entry.steamId64) === String(selfSteamId)) : null;
                if (selfEntry) entries = [...entries, { separator: true }, selfEntry];
            } catch (err) {
                console.warn('[steam] failed to fetch player leaderboard rank:', err);
            }
        }
        return { state: result.mock ? 'mock' : 'live', entries, selfSteamId };
    } catch {
        return { state: 'offline', entries: [], selfSteamId: null };
    }
}

/** Board rows into `listEl`; `rowClass` prefixes every class name. */
export function renderLeaderboardRows(listEl, entries = [], { board = 'best_run_score', selfSteamId = null, rowClass = 'go-leaderboard' } = {}) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = `${rowClass}-row ${rowClass}-row--empty`;
        empty.textContent = t('ui.leaderboard.no_ranks');
        listEl.appendChild(empty);
        return;
    }
    for (const entry of entries) {
        if (entry.separator) {
            const sep = document.createElement('div');
            sep.className = `${rowClass}-row ${rowClass}-row--separator`;
            sep.textContent = '...';
            listEl.appendChild(sep);
            continue;
        }
        const row = document.createElement('div');
        const isSelf = selfSteamId && String(entry.steamId64) === String(selfSteamId);
        row.className = `${rowClass}-row${isSelf ? ' player-self' : ''}`;
        const rank = document.createElement('span');
        rank.className = `${rowClass}-rank`;
        rank.textContent = `#${Number(entry.rank) || '-'}`;
        const name = document.createElement('span');
        name.className = `${rowClass}-name`;
        name.textContent = entry.persona || t('ui.leaderboard.anonymous_agent');
        const score = document.createElement('span');
        score.className = `${rowClass}-score`;
        score.textContent = formatLeaderboardScore(board, Number(entry.score) || 0);
        row.append(rank, name, score);
        listEl.appendChild(row);
    }
}

export function setGameOverLeaderboardState(statusText, entries = [], { board = 'best_run_score', selfSteamId = null, type = 'retrieving' } = {}) {
    const statusEl = document.getElementById('go-leaderboard-status');
    const listEl = document.getElementById('go-leaderboard-list');
    if (statusEl) {
        statusEl.textContent = statusText;
        statusEl.className = `go-leaderboard-status go-leaderboard-status--${type}`;
    }
    renderLeaderboardRows(listEl, entries, { board, selfSteamId });
}

export async function renderGameOverLeaderboard(payload = {}, { submission = null, submitWaitMs = RUN_SUBMIT_WAIT_MS } = {}) {
    const board = getGameOverLeaderboardBoard(payload);
    const label = getGameOverLeaderboardLabel(board);

    if (!window.electronAPI?.getSteamLeaderboard) {
        setGameOverLeaderboardState('LEADERBOARD OFFLINE - SCORE BANKED LOCALLY', [], { board, type: 'offline' });
        return;
    }

    if (submission) setGameOverLeaderboardState(`UPLINKING SCORE TO ${label}...`, [], { board, type: 'retrieving' });
    const submitResult = await waitForSubmission(submission, submitWaitMs);
    const submitStatus = submitResult ? describeRunSubmitResult(submitResult) : null;
    setGameOverLeaderboardState(`RETRIEVING ${label}...`, [], { board, type: 'retrieving' });

    const offlineText = submitStatus && !submitResult.ok ? submitStatus.text : 'LEADERBOARD OFFLINE';
    const { state, entries, selfSteamId } = await fetchLeaderboard({ board, scope: 'Global', count: 10 });
    if (state === 'offline') {
        setGameOverLeaderboardState(offlineText, [], { board, type: 'offline' });
        return;
    }
    const baseStatus = state === 'mock' ? `${label} - DEV MOCK` : `${label} - GLOBAL TOP 10`;
    const status = submitStatus ? `${baseStatus} // ${submitStatus.text}` : baseStatus;
    const type = state === 'mock' ? 'mock' : (submitStatus && !submitResult.ok ? 'offline' : 'live');
    setGameOverLeaderboardState(status, entries, { board, selfSteamId, type });
}
