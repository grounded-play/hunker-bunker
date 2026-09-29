// Ring 1 High-Stakes Reward Cache for Sprint 47 Lane 3
// (docs/planning/gameplay-feature-review-2026-09-24.md, Track B).
//
// Previews a synergy component before commitment, demands an explicit operational
// cost (escalated hostile wave, local O2 siphon, or containment lockdown), and can
// be freely walked away from without penalty. Pure logic, testable without THREE.js.

import { mixRunEntropy } from './runEntropy.js';
import { grantRunDrop } from './statusEffects.js';

export const REWARD_CACHE_COSTS = Object.freeze({
    ESCALATED_WAVE: 'escalated_wave',
    O2_SIPHON: 'o2_siphon',
    LOCKDOWN: 'lockdown'
});

export const SYNERGY_CACHE_DROPS = Object.freeze([
    'cryo_rime',
    'shatter_engine',
    'caustic_payload',
    'bio_vampirism'
]);

export const REWARD_CACHE_COST_CONFIGS = Object.freeze({
    [REWARD_CACHE_COSTS.ESCALATED_WAVE]: Object.freeze({
        type: 'escalated_wave',
        labelKey: 'ui.cache.cost.escalated_wave',
        waveCount: 3,
        enemyType: 'crawler'
    }),
    [REWARD_CACHE_COSTS.O2_SIPHON]: Object.freeze({
        type: 'o2_siphon',
        labelKey: 'ui.cache.cost.o2_siphon',
        o2Drain: 25
    }),
    [REWARD_CACHE_COSTS.LOCKDOWN]: Object.freeze({
        type: 'lockdown',
        labelKey: 'ui.cache.cost.lockdown',
        durationSeconds: 12
    })
});

export const REWARD_CACHE_I18N_KEYS = Object.freeze({
    title: 'ui.cache.title',
    preview: 'ui.cache.preview',
    riskCost: 'ui.cache.risk_cost',
    openPrompt: 'ui.cache.open_prompt',
    walkAway: 'ui.cache.walk_away',
    reportOpened: 'ui.cache.report.opened'
});

/**
 * Plans a deterministic high-stakes reward cache for Ring 1.
 *
 * Intelligently prioritizes offering the partner item if the player already has
 * one component of a synergy chain, ensuring runs can reliably test synergies.
 *
 * @param {object} args
 * @param {number} args.expeditionSeed - Seed for deterministic roll
 * @param {number} [args.ring=1] - Ring tier
 * @param {Array<string|object>} [args.equippedDrops=[]] - Currently equipped items
 * @returns {object} Authored reward cache definition
 */
export function planRewardCache({ expeditionSeed = 0, ring = 1, equippedDrops = [] } = {}) {
    const seed = Number(expeditionSeed) >>> 0;
    const equippedIds = new Set(
        equippedDrops.map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean)
    );

    // Synergy completion logic: if player has half a chain, offer the complementary half
    let dropId;
    if (equippedIds.has('cryo_rime') && !equippedIds.has('shatter_engine')) {
        dropId = 'shatter_engine';
    } else if (equippedIds.has('shatter_engine') && !equippedIds.has('cryo_rime')) {
        dropId = 'cryo_rime';
    } else if (equippedIds.has('caustic_payload') && !equippedIds.has('bio_vampirism')) {
        dropId = 'bio_vampirism';
    } else if (equippedIds.has('bio_vampirism') && !equippedIds.has('caustic_payload')) {
        dropId = 'caustic_payload';
    } else {
        // Roll from unequipped synergy components
        const eligible = SYNERGY_CACHE_DROPS.filter((id) => !equippedIds.has(id));
        const pool = eligible.length > 0 ? eligible : SYNERGY_CACHE_DROPS;
        const dropRoll = mixRunEntropy(seed, 0x53594e52, 1);
        dropId = pool[dropRoll % pool.length];
    }

    // Cost selection
    const costRoll = mixRunEntropy(seed, 0x434f5354, 2);
    const costTypes = Object.values(REWARD_CACHE_COSTS);
    const costType = costTypes[costRoll % costTypes.length];
    const costConfig = REWARD_CACHE_COST_CONFIGS[costType];

    return {
        id: `ring_${ring}_reward_cache`,
        ring,
        dropId,
        dropNameKey: `ui.relics.${dropId}.name`,
        costType,
        costConfig,
        state: 'sealed',
        previewed: true,
        coords: Object.freeze({ x: 12.5, z: -10.5 })
    };
}

/**
 * Validates whether the cache can be opened given the player's current vital state.
 */
export function canOpenRewardCache(cacheState, { currentO2 = 100, isPlayerDead = false } = {}) {
    if (!cacheState || cacheState.state !== 'sealed') return false;
    if (isPlayerDead) return false;
    if (cacheState.costType === REWARD_CACHE_COSTS.O2_SIPHON && currentO2 <= 15) {
        return false; // Prevent instant suicide on siphon
    }
    return true;
}

/**
 * Claims the high-stakes cache, applying the operational cost and granting the reward drop.
 *
 * @param {object} cacheState - The cache instance
 * @param {object} game - The ThreeGame instance or mock
 * @returns {object} Outcome summary { success, dropId, costType, costApplied }
 */
export function claimRewardCache(cacheState, game) {
    if (!cacheState || cacheState.state !== 'sealed' || !game) {
        return { success: false, reason: 'invalid_or_not_sealed' };
    }

    const { costType, costConfig, dropId } = cacheState;
    let costApplied = false;

    // 1. Enforce the operational cost
    if (costType === REWARD_CACHE_COSTS.O2_SIPHON) {
        if (game.playerVitals) {
            const drain = costConfig?.o2Drain ?? 25;
            game.playerVitals.o2 = Math.max(5, (game.playerVitals.o2 ?? 100) - drain);
            game.emitO2State?.();
            costApplied = true;
        }
    } else if (costType === REWARD_CACHE_COSTS.ESCALATED_WAVE) {
        if (typeof game.spawnRewardCacheDefenders === 'function') {
            game.spawnRewardCacheDefenders(cacheState);
            costApplied = true;
        } else {
            costApplied = true;
        }
    } else if (costType === REWARD_CACHE_COSTS.LOCKDOWN) {
        if (typeof game.triggerLockdown === 'function') {
            game.triggerLockdown(costConfig?.durationSeconds ?? 12);
            costApplied = true;
        } else {
            costApplied = true;
        }
    }

    // 2. Grant the previewed item through contract
    const granted = grantRunDrop(game, dropId);

    // 3. Mark state as opened
    cacheState.state = 'opened';

    // 4. Dispatch report item for the expedition debrief
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('expedition-report-item', {
            detail: {
                // 'discovery' is the shared report kind for a component found.
                kind: 'discovery',
                labelKey: 'ui.cache.report.opened',
                params: { dropId, dropKey: cacheState.dropNameKey ?? `ui.relics.${dropId}.name` }
            }
        }));
    }

    return {
        success: true,
        granted,
        dropId,
        costType,
        costApplied
    };
}

/**
 * Refuses or walks away from the cache without incurring costs or gaining items.
 */
export function walkAwayFromRewardCache(cacheState) {
    if (!cacheState || cacheState.state !== 'sealed') return false;
    cacheState.state = 'refused';
    return true;
}
