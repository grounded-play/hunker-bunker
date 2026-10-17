export const BLACKJACK_DAY_PERKS_KEY = 'hb_blackjack_day_perks_v1';

const clampTier = (value) => Math.max(0, Math.floor(Number(value) || 0));
const clampDay = (value) => Math.max(1, Math.floor(Number(value) || 1));

export function normalizeBlackjackDayPerks(value = {}, day = 1) {
    const currentDay = clampDay(day);
    const highestTier = clampDay(value?.day) === currentDay ? clampTier(value?.highestTier) : 0;
    return {
        day: currentDay,
        highestTier,
        criticalChance: highestTier >= 1 ? 0.15 : 0,
        salvageMultiplier: highestTier >= 2 ? 1.10 : 1
    };
}

export function loadBlackjackDayPerks(storage = null, day = 1) {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
        return normalizeBlackjackDayPerks(JSON.parse(store?.getItem(BLACKJACK_DAY_PERKS_KEY) || '{}'), day);
    } catch {
        return normalizeBlackjackDayPerks({}, day);
    }
}

export function saveBlackjackDayPerks(perks, storage = null) {
    const normalized = normalizeBlackjackDayPerks(perks, perks?.day);
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
        store?.setItem(BLACKJACK_DAY_PERKS_KEY, JSON.stringify(normalized));
    } catch {
        // A storage failure must not cancel the live-session reward.
    }
    return normalized;
}

export function awardBlackjackTier(perks, tier, day = 1) {
    const current = normalizeBlackjackDayPerks(perks, day);
    const requestedTier = clampTier(tier);
    if (requestedTier <= current.highestTier) return { perks: current, granted: false, rewardId: null };
    const next = normalizeBlackjackDayPerks({ day: current.day, highestTier: requestedTier }, current.day);
    return {
        perks: next,
        granted: true,
        rewardId: current.highestTier < 1 && requestedTier >= 1
            ? 'cold_calculation'
            : current.highestTier < 2 && requestedTier >= 2
                ? 'salvage_yield'
                : null
    };
}

export function applyBlackjackCriticalDamage(damage, perks, rng = Math.random) {
    const baseDamage = Math.max(0, Number(damage) || 0);
    const critical = (Number(perks?.criticalChance) || 0) > 0 && rng() < perks.criticalChance;
    return { damage: critical ? baseDamage * 1.5 : baseDamage, critical };
}

export function applyBlackjackSalvageYield(value, perks) {
    return Math.max(0, Math.round((Number(value) || 0) * (Number(perks?.salvageMultiplier) || 1)));
}
