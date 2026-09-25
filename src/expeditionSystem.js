import { EXPEDITION_EVENT_IDS, selectDeploymentEvent } from './expeditionEvents.js';
import { mixRunEntropy } from './runEntropy.js';

export const EXPEDITION_CONDITIONS = Object.freeze([
    Object.freeze({
        id: 'glacial_gale',
        name: 'Glacial Gale',
        tagline: 'SUB-ZERO BLIZZARD // CRYO BURSTS',
        description: 'Severe sub-zero squalls. Defeated cryo hostiles detonate in localized frost shockwaves. Ice slicks form in non-bunker corridors.',
        biomeFocus: 'cryo',
        scrapMultiplier: 1.0,
        threatTier: 1,
        weatherVisual: 'blizzard',
        playerEffect: 'ice_skate',
        enemyModifier: 'cryo_death_burst'
    }),
    Object.freeze({
        id: 'spore_bloom',
        name: 'Spore Bloom',
        tagline: 'HIGH TOXIC HUMIDITY // BIO SURGE',
        description: 'Dense spore mist blankets the sector. Bio-snails yield +35% organic salvage; ambient spore clouds drift through unsealed halls.',
        biomeFocus: 'bio',
        scrapMultiplier: 1.35,
        threatTier: 2,
        weatherVisual: 'spore_fog',
        playerEffect: 'poison_resist_drain',
        enemyModifier: 'spore_cloud_trail'
    }),
    Object.freeze({
        id: 'bio_resin_surge',
        name: 'Bio-Resin Surge',
        tagline: 'HIVE HIGH TIDE // RUNNER SWARMS',
        description: 'Accelerated alien incubation. Fast swarmers stalk hive perimeters; bio-nodes yield +50% resin biomass.',
        biomeFocus: 'bio',
        scrapMultiplier: 1.25,
        threatTier: 2,
        weatherVisual: 'resin_mist',
        playerEffect: 'slime_slow',
        enemyModifier: 'swarm_haste'
    }),
    Object.freeze({
        id: 'geothermal_arc',
        name: 'Geothermal Arc',
        tagline: 'GRID OVERLOAD // ELECTRICAL VENTING',
        description: 'Thermal conduits overload and arc across damaged bulkhead walls. Scrap and component salvage increased by +50%.',
        biomeFocus: 'active',
        scrapMultiplier: 1.5,
        threatTier: 3,
        weatherVisual: 'arc_flicker',
        playerEffect: 'shield_surge',
        enemyModifier: 'shock_retaliation'
    }),
    Object.freeze({
        id: 'subzero_stillness',
        name: 'Sub-Zero Stillness',
        tagline: 'EERIE SILENCE // ELITE STALKERS',
        description: 'Deadly stillness settling over the sector. Low standard patrol density, but aggressive mutated elite variants stalk the routes.',
        biomeFocus: 'all',
        scrapMultiplier: 1.15,
        threatTier: 3,
        weatherVisual: 'clear_frost',
        playerEffect: 'stealth_bonus',
        enemyModifier: 'elite_density'
    })
]);

export const EXPEDITION_BOUNTIES = Object.freeze([
    Object.freeze({ id: 'salvage_run', label: 'Extract 120+ Scrap from Deep Corridors', rewardBonus: 60 }),
    Object.freeze({ id: 'eliminate_elite', label: 'Eliminate a Mutated Sector Stalker', rewardBonus: 80 }),
    Object.freeze({ id: 'scout_compound', label: 'Infiltrate and Map an Outlying Compound', rewardBonus: 75 }),
    Object.freeze({ id: 'clearing_breach', label: 'Smash 6 Structural Wall Dividers', rewardBonus: 50 })
]);

// The numeric knobs each condition turns. Keyed by condition id instead of
// stored on the profile: a profile persists in the campaign save, and a saved
// expedition should pick up retuning rather than freeze the old numbers.
//
// `player` keys ride the same loadoutMods bus as equipment and fatigue
// (Multiplier keys multiply, everything else adds). `world` keys feed the
// spawn/salvage sites that already take run-card biases.
export const EXPEDITION_CONDITION_EFFECTS = Object.freeze({
    glacial_gale: Object.freeze({
        player: Object.freeze({ moveSpeedMultiplier: 1.04, oxygenDrainMultiplier: 1.1, cryoDurationMultiplier: 1.25 }),
        world: Object.freeze({ enemyDensityMultiplier: 1, enemySpeedMultiplier: 0.92, eliteChanceMultiplier: 1 })
    }),
    spore_bloom: Object.freeze({
        player: Object.freeze({ oxygenDrainMultiplier: 1.12 }),
        world: Object.freeze({ enemyDensityMultiplier: 1.1, enemySpeedMultiplier: 1, eliteChanceMultiplier: 1 })
    }),
    bio_resin_surge: Object.freeze({
        player: Object.freeze({ moveSpeedMultiplier: 0.95 }),
        world: Object.freeze({ enemyDensityMultiplier: 1.15, enemySpeedMultiplier: 1.18, eliteChanceMultiplier: 1, resinYieldMultiplier: 1.5 })
    }),
    geothermal_arc: Object.freeze({
        player: Object.freeze({ shieldRechargeDelayMultiplier: 0.8 }),
        world: Object.freeze({ enemyDensityMultiplier: 1, enemySpeedMultiplier: 1, eliteChanceMultiplier: 1 })
    }),
    subzero_stillness: Object.freeze({
        player: Object.freeze({ hiddenRoomDetectionRange: 2 }),
        world: Object.freeze({ enemyDensityMultiplier: 0.65, enemySpeedMultiplier: 1, eliteChanceMultiplier: 2.5 })
    })
});

const NEUTRAL_WORLD_EFFECTS = Object.freeze({
    enemyDensityMultiplier: 1,
    enemySpeedMultiplier: 1,
    eliteChanceMultiplier: 1,
    salvageMultiplier: 1,
    resinYieldMultiplier: 1
});

/**
 * What one kill does under the deployment's condition, beyond the numbers:
 * the moment-to-moment signature that makes a Glacial Gale run feel unlike a
 * Geothermal Arc run. Bosses keep their authored deaths.
 *
 * `roll` is the caller's uniform draw for chance-based effects.
 */
export function planExpeditionDeathEffect(profile, { type, isBoss = false, roll = 0 } = {}) {
    if (isBoss) return null;
    switch (profile?.condition?.id) {
        case 'glacial_gale':
            // Cryo hostiles burst into a frost ring that locks their pack.
            return type === 'cryosnail'
                ? { kind: 'frost_ring', radius: 2.6, freezeSeconds: 1.2, color: 0x9fe8ff }
                : null;
        case 'spore_bloom':
            // Spore-fat bio snails split open with extra organic salvage.
            return type === 'sporesnail'
                ? { kind: 'spore_cache', dropType: 'coin', count: 1, color: 0x9dff6a }
                : null;
        case 'geothermal_arc':
            // Overloaded hostiles sometimes discharge into whoever is closest;
            // the condition's shield surge is what makes this survivable.
            return roll < 0.25
                ? { kind: 'arc_discharge', radius: 1.3, playerDamage: 1, color: 0x7df2ff }
                : null;
        default:
            return null;
    }
}

/**
 * The resolved effects of a profile's condition. A missing or unknown
 * profile (multiplayer, fixed-seed runs, a save from a newer build) is
 * neutral rather than an error, so every consumer can call this blindly.
 */
export function getExpeditionEffects(profile) {
    const conditionId = profile?.condition?.id ?? null;
    const condition = EXPEDITION_CONDITIONS.find((entry) => entry.id === conditionId) ?? null;
    const effects = condition ? EXPEDITION_CONDITION_EFFECTS[condition.id] : null;
    if (!condition || !effects) {
        return { conditionId: null, player: {}, world: { ...NEUTRAL_WORLD_EFFECTS } };
    }
    return {
        conditionId: condition.id,
        player: { ...effects.player },
        world: { ...NEUTRAL_WORLD_EFFECTS, ...effects.world, salvageMultiplier: condition.scrapMultiplier }
    };
}

/** Same merge contract as composeFatigueIntoLoadoutMods. */
export function composeExpeditionIntoLoadoutMods(baseMods, profile) {
    const merged = { ...(baseMods ?? {}) };
    for (const [key, value] of Object.entries(getExpeditionEffects(profile).player)) {
        if (key.endsWith('Multiplier')) merged[key] = (Number(merged[key]) || 1) * value;
        else merged[key] = (Number(merged[key]) || 0) + value;
    }
    return merged;
}

/**
 * Scales a whole-number salvage payout. The fractional part is paid out as a
 * chance of one more unit, so a x1.35 condition averages 1.35 per pickup
 * without ever handing the bank a fractional coin.
 */
export function scaleExpeditionSalvage(amount, multiplier, roll) {
    const base = Math.max(0, Number(amount) || 0);
    const factor = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
    if (factor === 1) return base;
    const scaled = base * factor;
    const whole = Math.floor(scaled);
    return whole + ((Number(roll) || 0) < scaled - whole ? 1 : 0);
}

/**
 * Maps a uniform [0, 1) roll so a threshold test `roll < chance` passes with
 * probability chance x multiplier. The caller still draws exactly one value
 * from its seeded stream, so chunk scatter stays reproducible.
 */
export function scaleExpeditionEliteRoll(roll, eliteChanceMultiplier) {
    const factor = Number.isFinite(eliteChanceMultiplier) && eliteChanceMultiplier > 0 ? eliteChanceMultiplier : 1;
    return (Number(roll) || 0) / factor;
}

export function deriveExpeditionSeed(campaignSeed, expeditionIndex = 0) {
    return mixRunEntropy(campaignSeed, 0x45585044, (expeditionIndex >>> 0) + 1);
}

export function createExpeditionProfile(campaignSeed, expeditionIndex = 0) {
    const requestedIndex = Math.floor(Number(expeditionIndex));
    const normIndex = Number.isSafeInteger(requestedIndex) && requestedIndex >= 0 ? requestedIndex : 0;
    const seed = deriveExpeditionSeed(Number(campaignSeed) >>> 0, normIndex);
    
    // Deterministic selection based on expedition seed
    const conditionIndex = ((seed ^ 0xa5a5a5a5) >>> 0) % EXPEDITION_CONDITIONS.length;
    const condition = EXPEDITION_CONDITIONS[conditionIndex];
    
    const bountyIndex = ((seed ^ 0x5b5b5b5b) >>> 0) % EXPEDITION_BOUNTIES.length;
    const bounty = EXPEDITION_BOUNTIES[bountyIndex];

    const threatIndex = Math.min(5, 1 + Math.floor(normIndex / 3));

    // Dynamic obstacle roll: determines which corridor gates/rockfalls are active this deployment
    const obstacleKey = ((seed >>> 16) ^ 0x7c7c) % 4;

    return {
        expeditionIndex: normIndex,
        expeditionSeed: seed,
        campaignSeed: Number(campaignSeed) >>> 0,
        condition,
        bounty,
        threatIndex,
        obstacleKey,
        eventId: selectDeploymentEvent({ expeditionSeed: seed }),
        title: `EXPEDITION ${normIndex + 1} — ${condition.name.toUpperCase()}`,
        briefing: `${condition.tagline} · THREAT LEVEL ${threatIndex}`
    };
}

/**
 * The next deployment's profile, given the one before it. The seed still
 * decides, but a condition that would repeat the previous deployment's is
 * moved on (the Sprint 46 probe saw the same weather twice running in two of
 * three campaigns), and the event never repeats. Saved profiles keep what was
 * chosen (normalizeExpeditionProfile).
 */
export function continueExpeditionProfile(campaignSeed, expeditionIndex, previous = null) {
    const profile = createExpeditionProfile(campaignSeed, expeditionIndex);
    let condition = profile.condition;
    if (previous?.condition?.id && previous.condition.id === condition.id) {
        const index = EXPEDITION_CONDITIONS.indexOf(condition);
        const shift = 1 + (profile.expeditionSeed % (EXPEDITION_CONDITIONS.length - 1));
        condition = EXPEDITION_CONDITIONS[(index + shift) % EXPEDITION_CONDITIONS.length];
    }
    return {
        ...profile,
        condition,
        eventId: selectDeploymentEvent({ expeditionSeed: profile.expeditionSeed, previousEventId: previous?.eventId ?? null }),
        title: `EXPEDITION ${profile.expeditionIndex + 1} — ${condition.name.toUpperCase()}`,
        briefing: `${condition.tagline} · THREAT LEVEL ${profile.threatIndex}`
    };
}

// Imported profiles may predate current tuning. Retain a valid deployment's
// selected condition and bounty, while repairing its identity and refreshing
// catalog text/numbers. A profile from another campaign cannot supply weather.
export function normalizeExpeditionProfile(raw, campaignSeed, expeditionIndex) {
    const generated = createExpeditionProfile(campaignSeed, expeditionIndex);
    if (!raw || Array.isArray(raw) || raw.campaignSeed !== generated.campaignSeed
        || raw.expeditionIndex !== generated.expeditionIndex
        || raw.expeditionSeed !== generated.expeditionSeed) return generated;
    const condition = EXPEDITION_CONDITIONS.find((entry) => entry.id === raw.condition?.id) ?? generated.condition;
    const bounty = EXPEDITION_BOUNTIES.find((entry) => entry.id === raw.bounty?.id) ?? generated.bounty;
    return {
        ...generated,
        condition,
        bounty,
        eventId: EXPEDITION_EVENT_IDS.includes(raw.eventId) ? raw.eventId : generated.eventId,
        title: `EXPEDITION ${generated.expeditionIndex + 1} — ${condition.name.toUpperCase()}`,
        briefing: `${condition.tagline} · THREAT LEVEL ${generated.threatIndex}`
    };
}

const OBSTACLE_WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);

function countWalkableComponents(grid) {
    const height = grid.length;
    const width = grid[0]?.length ?? 0;
    const seen = new Uint8Array(width * height);
    let components = 0;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (seen[y * width + x] || !OBSTACLE_WALKABLE.has(grid[y][x])) continue;
            components += 1;
            const stack = [y * width + x];
            seen[y * width + x] = 1;
            while (stack.length) {
                const index = stack.pop();
                const cx = index % width;
                const cy = (index - cx) / width;
                for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    const next = ny * width + nx;
                    if (seen[next] || !OBSTACLE_WALKABLE.has(grid[ny][nx])) continue;
                    seen[next] = 1;
                    stack.push(next);
                }
            }
        }
    }
    return components;
}

function hashChunkKey(chunkKey) {
    let hash = 0x811c9dc5;
    for (const char of String(chunkKey)) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
    return hash >>> 0;
}

/**
 * This deployment's rockfalls in one corridor chunk: 2x2 rubble piles that
 * close a lane the last expedition walked. Deterministic in (expedition seed,
 * chunk), so an evicted chunk rebuilds with the same rubble, and a pile is
 * only accepted when every walkable region the chunk had stays in one piece:
 * rubble reroutes the player, it never seals a door, a room or a portal off.
 *
 * @param {string[][]|string[]} grid chunk tile grid ('.' floor, '#' wall)
 * @param {{ expeditionSeed: number, chunkKey: string, protectedCells?: Set<string>,
 *           chance?: number, maxPiles?: number, attempts?: number }} options
 * @returns {{ x: number, y: number }[]} cells to turn into rubble
 */
export function planExpeditionObstacles(grid, {
    expeditionSeed,
    chunkKey,
    protectedCells = new Set(),
    chance = 0.22,
    maxPiles = 2,
    attempts = 14
} = {}) {
    const height = grid?.length ?? 0;
    const width = grid?.[0]?.length ?? 0;
    if (!height || !width) return [];
    let state = mixRunEntropy(Number(expeditionSeed) >>> 0, hashChunkKey(chunkKey), 0x524f434b);
    const random = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
    if (random() >= chance) return [];
    const working = Array.from({ length: height }, (_, y) => [...grid[y]]);
    const baseline = countWalkableComponents(working);
    const candidates = [];
    for (let y = 2; y < height - 3; y += 1) {
        for (let x = 2; x < width - 3; x += 1) {
            const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
            if (cells.every(([cx, cy]) => working[cy][cx] === '.' && !protectedCells.has(`${cx},${cy}`))) {
                candidates.push({ x, y });
            }
        }
    }
    const blocked = [];
    for (let attempt = 0; attempt < attempts && candidates.length && blocked.length < maxPiles * 4; attempt += 1) {
        const pick = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
        const cells = [[pick.x, pick.y], [pick.x + 1, pick.y], [pick.x, pick.y + 1], [pick.x + 1, pick.y + 1]];
        if (cells.some(([cx, cy]) => working[cy][cx] !== '.')) continue;
        for (const [cx, cy] of cells) working[cy][cx] = '#';
        if (countWalkableComponents(working) === baseline) {
            for (const [x, y] of cells) blocked.push({ x, y });
        } else {
            for (const [cx, cy] of cells) working[cy][cx] = '.';
        }
    }
    return blocked;
}

// How each condition colours the world: a fog tint, an ambient light tint
// and an intensity multiplier. Pure in (condition, time) so the arc flicker
// is reproducible; applied over the sky/day-night result every frame.
const ATMOSPHERES = Object.freeze({
    glacial_gale: Object.freeze({ fog: 0xbfe6ff, fogStrength: 0.28, ambient: 0xcfeaff, ambientStrength: 0.25, intensity: 0.95 }),
    spore_bloom: Object.freeze({ fog: 0x5fd07a, fogStrength: 0.34, ambient: 0x8dffb0, ambientStrength: 0.35, intensity: 1 }),
    bio_resin_surge: Object.freeze({ fog: 0x9a7a3a, fogStrength: 0.22, ambient: 0xffd9a0, ambientStrength: 0.18, intensity: 1 }),
    geothermal_arc: Object.freeze({ fog: 0x3a5a7a, fogStrength: 0.15, ambient: 0x9fdcff, ambientStrength: 0.2, intensity: 1, flicker: true }),
    subzero_stillness: Object.freeze({ fog: 0xe6f2ff, fogStrength: 0.2, ambient: 0xdde8f5, ambientStrength: 0.15, intensity: 0.9 })
});

/**
 * @returns {{ fog: number, fogStrength: number, ambient: number, ambientStrength: number,
 *             intensity: number, sparking: boolean } | null}
 */
export function expeditionAtmosphere(conditionId, timeSeconds = 0) {
    const atmosphere = ATMOSPHERES[conditionId];
    if (!atmosphere) return null;
    let intensity = atmosphere.intensity;
    let sparking = false;
    if (atmosphere.flicker) {
        // Two incommensurate waves line up a few times a minute: the grid
        // browns out for a beat, then snaps back.
        const surge = Math.sin(timeSeconds * 1.7) * Math.sin(timeSeconds * 0.61 + 1.3);
        if (surge > 0.82) {
            sparking = true;
            intensity *= 0.55 + 0.25 * Math.abs(Math.sin(timeSeconds * 37));
        }
    }
    return { ...atmosphere, intensity, sparking };
}
