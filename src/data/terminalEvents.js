// ── Terminal Choice Events (T5) ───────────────────────────────
// Data-driven tradeoff events the bunker terminals can present (vs. plain
// lore/shop). The first slice of the src/data/* content pipeline: a frozen,
// read-only catalog imported by threeGame.js, accessed via the helpers below.
// Each choice's `effect(game)` calls guarded game methods so the catalog stays
// pure and side-effects live behind the game's narrow API (see T6).
//
// Schema: { id, title, body, weight, biomeTags?, choices:[{ label, tone?, effect(game) }] }
// `tone`: 'risk' marks a choice that helps now but creates future danger.

export const TERMINAL_EVENTS = Object.freeze([
    {
        id: 'o2_reroute',
        title: 'AUXILIARY LIFE SUPPORT BYPASS',
        body: 'Facilities mainframe offers oxygen replenishment. Diverting the security grid to life support will be noticed.',
        weight: 3,
        biomeTags: ['active', 'cryo', 'bio'],
        choices: [
            {
                label: 'RESTORE OXYGEN — alerts a patrol',
                tone: 'risk',
                effect: (game) => {
                    game?.adjustOxygen?.(45);
                    game?.spawnPatrolNearPlayer?.();
                    return 'Oxygen restored. Security dispatch inbound.';
                }
            },
            {
                label: 'LEAVE IT SEALED',
                effect: (game) => {
                    game?.showBunkerLine?.('Request withdrawn. Suffocation remains on schedule.');
                    return 'Bypass declined.';
                }
            }
        ]
    },
    {
        id: 'map_upload',
        title: 'MAPPED TELEMETRY UPLOAD',
        body: 'Pull the sector mapping database. The scanning array will degrade while it reindexes.',
        weight: 2,
        biomeTags: ['active', 'cryo', 'bio'],
        choices: [
            {
                label: 'DOWNLOAD RADAR DATA — corrupts compass 60s',
                tone: 'risk',
                effect: (game) => {
                    game?.revealNearbyExits?.();
                    game?.corruptCompass?.(60);
                    return 'Routes revealed. Compass telemetry degraded.';
                }
            },
            {
                label: 'CANCEL UPLOAD',
                effect: () => 'Upload cancelled.'
            }
        ]
    },
    {
        id: 'loot_cache',
        title: 'UNCLAIMED ASSET LOCKER',
        body: 'A bonded salvage locker can be force-opened. Doing so trips the sector lighting breaker.',
        weight: 2,
        biomeTags: ['active', 'cryo', 'bio'],
        choices: [
            {
                label: 'FORCE OPEN — triggers lights-out',
                tone: 'risk',
                effect: (game) => {
                    game?.grantSalvageCache?.({ tech: 12, coin: 8 });
                    game?.triggerLightsOut?.(8);
                    return 'Locker emptied. Breaker tripped — running dark.';
                }
            },
            {
                label: 'WALK AWAY',
                effect: () => 'Locker left bonded.'
            }
        ]
    }
]);

export function getTerminalEventById(id) {
    return TERMINAL_EVENTS.find((e) => e.id === id) ?? null;
}

// Weighted pick over events (optionally filtered by biome). `random` injectable.
export function pickTerminalEvent(random = Math.random, { biome = null } = {}) {
    const pool = biome
        ? TERMINAL_EVENTS.filter((e) => !e.biomeTags || e.biomeTags.includes(biome))
        : TERMINAL_EVENTS.slice();
    if (!pool.length) return null;
    const total = pool.reduce((s, e) => s + (e.weight ?? 1), 0);
    let roll = random() * total;
    for (const event of pool) {
        const w = event.weight ?? 1;
        if (roll < w) return event;
        roll -= w;
    }
    return pool[pool.length - 1];
}
