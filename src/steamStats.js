export const STEAM_STAT_DEFS = Object.freeze({
    total_deaths: Object.freeze({
        apiName: 'total_deaths',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.totalDeaths',
        read: (achievementState) => achievementState?.stats?.totalDeaths
    }),
    longest_run_seconds: Object.freeze({
        apiName: 'longest_run_seconds',
        type: 'INT',
        setBy: 'Client',
        source: 'floor(achievementState.stats.maxRunMs / 1000)',
        read: (achievementState) => {
            const runMs = achievementState?.stats?.maxRunMs;
            return runMs === undefined ? undefined : Math.floor(Number(runMs) / 1000);
        }
    })
});

export function buildSteamStatUpdates(achievementState) {
    return Object.values(STEAM_STAT_DEFS)
        .map((definition) => ({
            apiName: definition.apiName,
            value: Number(definition.read(achievementState))
        }))
        .filter((update) => Number.isFinite(update.value))
        .map((update) => ({
            ...update,
            value: Math.max(0, Math.floor(update.value))
        }));
}

export function syncSteamStats(achievementState, setStat) {
    if (typeof setStat !== 'function') return [];
    const updates = buildSteamStatUpdates(achievementState);
    for (const update of updates) setStat(update.apiName, update.value);
    return updates;
}
