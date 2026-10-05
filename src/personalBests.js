// Personal bests per leaderboard (Archive → RECORDS, Game Over "NEW PERSONAL
// BEST"). Uses the server's own rules (server/leaderboardScoring.js): a run
// counts only if the backend would rank it, and each board's score is the one
// Steam would receive, so the local best never disagrees with the board.
// Saved under an hb_ key, so it rides the save code and Steam Cloud.
import { STEAM_LEADERBOARD_DEFS, validateRunScorePayload } from '../server/leaderboardScoring.js';

export const PERSONAL_BESTS_STORAGE_KEY = 'hb_personal_bests_v1';

function isBetter(board, score, previous) {
    if (!(score > 0)) return false;
    if (!previous) return true;
    return STEAM_LEADERBOARD_DEFS[board]?.sortmethod === 'Ascending' ? score < previous.score : score > previous.score;
}

export function createPersonalBests({ storage = null, now = () => Date.now() } = {}) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const read = () => {
        try {
            const parsed = JSON.parse(store?.getItem(PERSONAL_BESTS_STORAGE_KEY) ?? 'null');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    };
    return {
        getState: read,
        /** @returns {{ improved: string[] }} boards whose best this run beat */
        recordRun(payload) {
            const verdict = validateRunScorePayload(payload);
            if (!verdict.ok) return { improved: [] };
            const bests = read();
            const improved = [];
            for (const target of verdict.canonicalTargets) {
                if (!isBetter(target.name, target.score, bests[target.name])) continue;
                bests[target.name] = { score: target.score, at: now(), classType: payload.classType };
                improved.push(target.name);
            }
            if (improved.length) {
                try { store?.setItem(PERSONAL_BESTS_STORAGE_KEY, JSON.stringify(bests)); } catch { /* best effort */ }
            }
            return { improved };
        }
    };
}

export const personalBests = createPersonalBests();
