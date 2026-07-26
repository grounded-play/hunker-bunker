/**
 * Leaderboard UI Frontend Implementation
 * Extracted from main.js for modular UI architecture.
 */

export function formatLeaderboardScore(board, score) {
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

export function setGameOverLeaderboardState(statusText, entries = [], { board = 'best_run_score', selfSteamId = null, type = 'retrieving' } = {}) {
    const statusEl = document.getElementById('go-leaderboard-status');
    const listEl = document.getElementById('go-leaderboard-list');
    if (statusEl) {
        statusEl.textContent = statusText;
        statusEl.className = `go-leaderboard-status go-leaderboard-status--${type}`;
    }
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'go-leaderboard-row go-leaderboard-row--empty';
        empty.textContent = 'NO RANKS AVAILABLE';
        listEl.appendChild(empty);
        return;
    }

    for (const entry of entries) {
        if (entry.separator) {
            const sep = document.createElement('div');
            sep.className = 'go-leaderboard-row go-leaderboard-row--separator';
            sep.textContent = '...';
            listEl.appendChild(sep);
            continue;
        }

        const row = document.createElement('div');
        const isSelf = selfSteamId && String(entry.steamId64) === String(selfSteamId);
        row.className = `go-leaderboard-row${isSelf ? ' player-self' : ''}`;

        const rank = document.createElement('span');
        rank.className = 'go-leaderboard-rank';
        rank.textContent = `#${Number(entry.rank) || '-'}`;

        const name = document.createElement('span');
        name.className = 'go-leaderboard-name';
        name.textContent = entry.persona || 'Agent';

        const score = document.createElement('span');
        score.className = 'go-leaderboard-score';
        score.textContent = formatLeaderboardScore(board, Number(entry.score) || 0);

        row.append(rank, name, score);
        listEl.appendChild(row);
    }
}

export async function renderGameOverLeaderboard(payload = {}) {
    const board = getGameOverLeaderboardBoard(payload);
    const label = getGameOverLeaderboardLabel(board);
    setGameOverLeaderboardState(`RETRIEVING ${label}...`, [], { board, type: 'retrieving' });

    if (!window.electronAPI?.getSteamLeaderboard) {
        setGameOverLeaderboardState('LEADERBOARD OFFLINE - SCORE BANKED LOCALLY', [], { board, type: 'offline' });
        return;
    }

    try {
        const [result, identity] = await Promise.all([
            window.electronAPI.getSteamLeaderboard(board, 'Global', 10),
            window.electronAPI.getSteamIdentity?.().catch(() => null)
        ]);

        if (!result?.ok) {
            setGameOverLeaderboardState('LEADERBOARD OFFLINE - SCORE BANKED LOCALLY', [], { board, type: 'offline' });
            return;
        }

        const selfSteamId = identity?.steamId64 ?? (result.mock ? '76561198000000000' : null);
        const status = result.mock ? `${label} - DEV MOCK` : `${label} - GLOBAL TOP 10`;
        const type = result.mock ? 'mock' : 'live';

        let entries = result.entries ?? [];

        // Fetch exact player rank if player is not in top 10
        const hasSelf = entries.some(entry => selfSteamId && String(entry.steamId64) === String(selfSteamId));
        if (!hasSelf && selfSteamId) {
            try {
                const aroundResult = await window.electronAPI.getSteamLeaderboard(board, 'AroundUser', 1);
                if (aroundResult?.ok && aroundResult.entries?.length) {
                    const selfEntry = aroundResult.entries.find(entry => String(entry.steamId64) === String(selfSteamId));
                    if (selfEntry) {
                        entries = [...entries];
                        entries.push({ separator: true });
                        entries.push(selfEntry);
                    }
                }
            } catch (err) {
                console.warn('[steam] failed to fetch player leaderboard rank:', err);
            }
        }

        setGameOverLeaderboardState(status, entries, { board, selfSteamId, type });
    } catch {
        setGameOverLeaderboardState('LEADERBOARD OFFLINE - SCORE BANKED LOCALLY', [], { board, type: 'offline' });
    }
}
