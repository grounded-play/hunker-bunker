export const STEAM_RUN_SCORE_FINALIZED_EVENT = 'steam-run-score-finalized';
export const STEAM_INVENTORY_REFRESH_REQUESTED_EVENT = 'steam-inventory-refresh-requested';
export const STEAM_ITEM_GRANT_REQUESTED_EVENT = 'steam-item-grant-requested';
export const STEAM_MARKET_STATUS_REQUESTED_EVENT = 'steam-market-status-requested';

const CLASS_IDS = Object.freeze(['SCOUT', 'TANK', 'ENGINEER']);

function clampInteger(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.floor(numeric));
}

function normalizeClassType(value) {
    const normalized = String(value ?? '').trim().toUpperCase();
    return CLASS_IDS.includes(normalized) ? normalized : 'SCOUT';
}

function normalizeResourceCounts(resources = {}) {
    return {
        tech: clampInteger(resources.tech),
        coin: clampInteger(resources.coin),
        med: clampInteger(resources.med)
    };
}

function buildLeaderboardTargets({ score, runMs, isVictory, isDailyOps, depthTier, distanceTravelled }) {
    const targets = [
        {
            name: 'best_run_score',
            score,
            keep: 'best'
        },
        {
            name: 'survival_time_seconds',
            score: Math.floor(runMs / 1000),
            keep: 'best'
        },
        {
            name: 'deepest_depth_score',
            score: (depthTier * 100000) + distanceTravelled,
            keep: 'best'
        }
    ];

    if (isDailyOps) {
        targets.push({
            name: 'daily_ops_score',
            score,
            keep: 'best'
        });
    }

    if (isVictory) {
        targets.push({
            name: 'fastest_extraction_ms',
            score: runMs,
            keep: 'best'
        });
    }

    return targets;
}

export function buildSteamRunScorePayload({
    stats = {},
    score = 0,
    rating = {},
    classType = 'SCOUT',
    runStartTime = Date.now(),
    endedAt = Date.now(),
    isVictory = false,
    deathReason = null,
    isDailyOps = false,
    dailyOpsDate = null,
    seed = null,
    runCards = [],
    depositedResources = {},
    gameVersion = null,
    multiplayer = {},
    exploration = {},
    trades = {}
} = {}) {
    const normalizedScore = clampInteger(score);
    const startedAt = clampInteger(runStartTime, endedAt);
    const endedAtMs = clampInteger(endedAt, Date.now());
    const runMs = Math.max(0, endedAtMs - startedAt);
    const normalizedClass = normalizeClassType(classType);
    const depthTier = clampInteger(stats.depthTier);
    const distanceTravelled = clampInteger(stats.distanceTravelled);
    const victory = Boolean(isVictory);
    const dailyOps = Boolean(isDailyOps);

    return {
        schemaVersion: 1,
        runId: [
            'hb',
            startedAt,
            endedAtMs,
            normalizedClass,
            seed ?? 'no-seed'
        ].join(':'),
        gameVersion: gameVersion ? String(gameVersion) : null,
        classType: normalizedClass,
        outcome: victory ? 'victory' : 'death',
        deathReason: victory ? null : String(deathReason ?? 'unknown'),
        mission: {
            type: stats.missionType ?? null,
            status: stats.missionStatus ?? null,
            label: stats.missionLabel ?? ''
        },
        score: normalizedScore,
        rating: {
            grade: String(rating.grade ?? ''),
            label: String(rating.label ?? '')
        },
        run: {
            startedAt,
            endedAt: endedAtMs,
            runMs,
            seed: seed ?? null,
            cards: Array.isArray(runCards)
                ? runCards.map((card) => ({
                    id: card?.id ?? null,
                    label: card?.label ?? ''
                }))
                : [],
            dailyOps: dailyOps
                ? { date: dailyOpsDate ?? null }
                : null
        },
        multiplayer: {
            isMultiplayer: Boolean(multiplayer.isMultiplayer),
            mode: multiplayer.mode ? String(multiplayer.mode) : null,
            roomCode: multiplayer.roomCode ? String(multiplayer.roomCode) : null,
            peersCount: clampInteger(multiplayer.peersCount),
            tradesCompleted: clampInteger(multiplayer.tradesCompleted),
            rivalKills: clampInteger(multiplayer.rivalKills),
            squadRevives: clampInteger(multiplayer.squadRevives)
        },
        exploration: {
            breadcrumbsCount: clampInteger(exploration.breadcrumbsCount),
            trailDistanceMeters: Number(exploration.trailDistanceMeters) || 0,
            sectorsDiscovered: clampInteger(exploration.sectorsDiscovered)
        },
        trades: {
            completedCount: clampInteger(trades.completedCount),
            shellsTraded: clampInteger(trades.shellsTraded),
            ammoTraded: clampInteger(trades.ammoTraded),
            medkitsTraded: clampInteger(trades.medkitsTraded),
            o2Traded: clampInteger(trades.o2Traded)
        },
        stats: {
            distanceTravelled,
            totalPickups: clampInteger(stats.totalPickups),
            generatorLevel: clampInteger(stats.generatorLevel),
            depthTier,
            depthTierName: stats.depthTierName ?? '',
            biomeKey: stats.biomeKey ?? null,
            biomeLabel: stats.biomeLabel ?? '',
            snailsKilled: clampInteger(stats.snailsKilled),
            hadNearDeath: Boolean(stats.hadNearDeath),
            fullHealthAtEnd: Boolean(stats.fullHealthAtEnd)
        },
        depositedResources: normalizeResourceCounts(depositedResources),
        leaderboardTargets: buildLeaderboardTargets({
            score: normalizedScore,
            runMs,
            isVictory: victory,
            isDailyOps: dailyOps,
            depthTier,
            distanceTravelled
        })
    };
}

export function dispatchSteamRunScoreFinalized(payload, target = globalThis?.window) {
    if (!target || typeof target.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') {
        return false;
    }

    target.dispatchEvent(new CustomEvent(STEAM_RUN_SCORE_FINALIZED_EVENT, {
        detail: payload
    }));
    return true;
}
