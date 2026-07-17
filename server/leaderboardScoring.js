export const STEAM_LEADERBOARD_DEFS = Object.freeze({
    best_run_score: Object.freeze({
        name: 'best_run_score',
        sortmethod: 'Descending',
        displaytype: 'Numeric',
        scoreMethod: 'KeepBest'
    }),
    daily_ops_score: Object.freeze({
        name: 'daily_ops_score',
        sortmethod: 'Descending',
        displaytype: 'Numeric',
        scoreMethod: 'KeepBest'
    }),
    fastest_extraction_ms: Object.freeze({
        name: 'fastest_extraction_ms',
        sortmethod: 'Ascending',
        displaytype: 'Milliseconds',
        scoreMethod: 'KeepBest'
    }),
    deepest_depth_score: Object.freeze({
        name: 'deepest_depth_score',
        sortmethod: 'Descending',
        displaytype: 'Numeric',
        scoreMethod: 'KeepBest'
    }),
    survival_time_seconds: Object.freeze({
        name: 'survival_time_seconds',
        sortmethod: 'Descending',
        displaytype: 'Seconds',
        scoreMethod: 'KeepBest'
    })
});

const MAX_RUN_MS = 6 * 60 * 60 * 1000;
const MAX_SCORE_DELTA = 0;

function toInteger(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.floor(numeric));
}

function toBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

function getRunMs(payload = {}) {
    return toInteger(payload.run?.runMs);
}

function normalizeResources(resources = {}) {
    return {
        tech: toInteger(resources.tech),
        coin: toInteger(resources.coin),
        med: toInteger(resources.med)
    };
}

export function recomputeRunScore(payload = {}) {
    const stats = payload.stats ?? {};
    const mission = payload.mission ?? {};
    const resources = normalizeResources(payload.depositedResources);
    const runMs = getRunMs(payload);
    const elapsedMinutes = runMs / 60000;
    const extracted = payload.outcome === 'victory' || mission.status === 'extracted';

    let score = 0;
    if (extracted) score += 500;

    score += Math.floor(toInteger(stats.depthTier) * toInteger(stats.distanceTravelled) * 0.08);
    score += (resources.tech * 10) + (resources.coin * 5) + (resources.med * 3);
    score += toInteger(stats.snailsKilled) * 40;

    if (extracted) {
        score += 200;
        if (toBoolean(stats.fullHealthAtEnd)) score += 100;
    }

    if (elapsedMinutes < 15) {
        score += Math.max(0, Math.min(300, Math.floor((15 - elapsedMinutes) * 50)));
    }
    if (toBoolean(stats.hadNearDeath)) score += 100;

    return Math.floor(score);
}

export function buildCanonicalLeaderboardTargets(payload = {}) {
    const score = recomputeRunScore(payload);
    const runMs = getRunMs(payload);
    const depthTier = toInteger(payload.stats?.depthTier);
    const distanceTravelled = toInteger(payload.stats?.distanceTravelled);
    const isVictory = payload.outcome === 'victory';
    const isDailyOps = Boolean(payload.run?.dailyOps?.date);

    const targets = [
        {
            name: STEAM_LEADERBOARD_DEFS.best_run_score.name,
            score,
            scoreMethod: STEAM_LEADERBOARD_DEFS.best_run_score.scoreMethod
        },
        {
            name: STEAM_LEADERBOARD_DEFS.survival_time_seconds.name,
            score: Math.floor(runMs / 1000),
            scoreMethod: STEAM_LEADERBOARD_DEFS.survival_time_seconds.scoreMethod
        },
        {
            name: STEAM_LEADERBOARD_DEFS.deepest_depth_score.name,
            score: (depthTier * 100000) + distanceTravelled,
            scoreMethod: STEAM_LEADERBOARD_DEFS.deepest_depth_score.scoreMethod
        }
    ];

    if (isDailyOps) {
        targets.push({
            name: STEAM_LEADERBOARD_DEFS.daily_ops_score.name,
            score,
            scoreMethod: STEAM_LEADERBOARD_DEFS.daily_ops_score.scoreMethod
        });
    }

    if (isVictory) {
        targets.push({
            name: STEAM_LEADERBOARD_DEFS.fastest_extraction_ms.name,
            score: runMs,
            scoreMethod: STEAM_LEADERBOARD_DEFS.fastest_extraction_ms.scoreMethod
        });
    }

    return targets;
}

export function validateRunScorePayload(payload = {}) {
    const errors = [];
    if (!payload || typeof payload !== 'object') {
        return { ok: false, errors: ['payload_missing'] };
    }

    if (Number(payload.schemaVersion) !== 1) errors.push('unsupported_schema');
    if (!String(payload.runId ?? '').startsWith('hb:')) errors.push('invalid_run_id');
    if (!['SCOUT', 'TANK', 'ENGINEER'].includes(payload.classType)) errors.push('invalid_class_type');
    if (!['victory', 'death'].includes(payload.outcome)) errors.push('invalid_outcome');

    const runMs = getRunMs(payload);
    if (runMs <= 0) errors.push('invalid_run_duration');
    if (runMs > MAX_RUN_MS) errors.push('run_duration_too_long');

    const submittedScore = toInteger(payload.score);
    const recomputedScore = recomputeRunScore(payload);
    if (Math.abs(submittedScore - recomputedScore) > MAX_SCORE_DELTA) {
        errors.push('score_mismatch');
    }

    if (payload.outcome === 'death' && payload.mission?.status === 'extracted') {
        errors.push('death_marked_extracted');
    }

    if (payload.outcome === 'victory' && payload.mission?.status && payload.mission.status !== 'extracted') {
        errors.push('victory_without_extraction');
    }

    return {
        ok: errors.length === 0,
        errors,
        recomputedScore,
        canonicalTargets: buildCanonicalLeaderboardTargets(payload)
    };
}
