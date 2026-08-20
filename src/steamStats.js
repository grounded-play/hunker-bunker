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
    }),
    // Steamworks App Admin > Stats (App 4957040, docs/steamstorestatus.log)
    // already defines these 6 -- this file only had the first 2 wired,
    // leaving the rest dashboard-only with nothing ever writing to them.
    // The underlying counters were already tracked in achievementState.stats
    // this whole time (src/achievements.js), just never read here.
    total_kills: Object.freeze({
        apiName: 'total_kills',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.totalKills',
        read: (achievementState) => achievementState?.stats?.totalKills
    }),
    total_runs: Object.freeze({
        apiName: 'total_runs',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.runCount',
        read: (achievementState) => achievementState?.stats?.runCount
    }),
    total_victories: Object.freeze({
        apiName: 'total_victories',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.victories',
        read: (achievementState) => achievementState?.stats?.victories
    }),
    shells_collected: Object.freeze({
        apiName: 'shells_collected',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.shellsCollected',
        read: (achievementState) => achievementState?.stats?.shellsCollected
    }),
    // loreDropIds.length is the authoritative count once populated;
    // loreDrops is the legacy fallback counter -- same "either, whichever
    // is populated" pattern already used by the Archivist achievement
    // check above, kept consistent here rather than picking only one.
    lore_drops_collected: Object.freeze({
        apiName: 'lore_drops_collected',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.loreDropIds.length || achievementState.stats.loreDrops',
        read: (achievementState) => achievementState?.stats?.loreDropIds?.length || achievementState?.stats?.loreDrops
    }),
    max_hive_bond: Object.freeze({
        apiName: 'max_hive_bond',
        type: 'INT',
        setBy: 'Client',
        source: 'achievementState.stats.maxHiveBond',
        read: (achievementState) => achievementState?.stats?.maxHiveBond
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
