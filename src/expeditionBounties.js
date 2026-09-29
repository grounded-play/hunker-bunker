// Expedition bounties that actually pay.
//
// Every deployment rolled a bounty (EXPEDITION_BOUNTIES) and the briefing card
// announced it, but nothing tracked it, completed it or paid its rewardBonus:
// a promise made on every deploy and never kept. This module owns progress and
// payout; the runtime reports the four events that move it. Completion makes
// a bounty ready, but a successful extraction is what secures its payout.
//
// Targets are set to the game's real scale. The old copy asked for "120+
// scrap", while a 12-minute Steam Deck session collected three pickups.
import { EXPEDITION_BOUNTIES } from './expeditionSystem.js';

export const BOUNTY_OBJECTIVES = Object.freeze({
    // Salvage pickups (med, tech, coin) recovered this deployment.
    salvage_run: Object.freeze({ metric: 'salvage', target: 8 }),
    // An elite-promoted hostile killed.
    eliminate_elite: Object.freeze({ metric: 'eliteKill', target: 1 }),
    // Distinct rooms walked in one camp or hive compound.
    scout_compound: Object.freeze({ metric: 'compoundRoom', target: 3 }),
    // Walls brought down by the player.
    clearing_breach: Object.freeze({ metric: 'wallSmashed', target: 6 })
});

/**
 * The expedition catalogue's existing rewardBonus is a shell payout. It used
 * to be briefing-only, so keeping the unit here makes the economic contract
 * explicit instead of silently inventing a conversion rate.
 */
export function bountyShellReward(bountyId) {
    const bonus = EXPEDITION_BOUNTIES.find((entry) => entry.id === bountyId)?.rewardBonus ?? 0;
    return Number.isSafeInteger(bonus) && bonus > 0 ? bonus : 0;
}

/** A stable, campaign-only receipt key for an extraction-secured bounty. */
export function bountyReceiptId(profile = {}) {
    if (!profile || typeof profile !== 'object') return null;
    const campaignSeed = Number(profile.campaignSeed);
    const expeditionSeed = Number(profile.expeditionSeed);
    const bountyId = String(profile.bounty?.id ?? '');
    if (!Number.isInteger(campaignSeed) || campaignSeed < 0
        || !Number.isInteger(expeditionSeed) || expeditionSeed < 0
        || !BOUNTY_OBJECTIVES[bountyId]) return null;
    return `expedition-bounty:v1:${campaignSeed >>> 0}:${expeditionSeed >>> 0}:${bountyId}`;
}

/**
 * Fixed-seed and multiplayer profiles use the expedition visual rules but
 * must never advance a local campaign economy. A valid campaign identity is
 * therefore required before the runtime creates a trackable bounty.
 */
export function isCampaignBountyProfile({ profile, campaignWorldSeed, runEntropy, fixedRunEntropy = false, isMultiplayer = false } = {}) {
    if (fixedRunEntropy || isMultiplayer || !bountyReceiptId(profile)) return false;
    const campaignSeed = Number(profile?.campaignSeed);
    return Number.isInteger(campaignWorldSeed)
        && Number.isInteger(runEntropy)
        && (campaignWorldSeed >>> 0) === (campaignSeed >>> 0)
        && (runEntropy >>> 0) === (campaignSeed >>> 0);
}

export function createBountyProgress(bountyId) {
    const objective = BOUNTY_OBJECTIVES[bountyId];
    if (!objective) return null;
    return {
        bountyId,
        metric: objective.metric,
        target: objective.target,
        progress: 0,
        completed: false,
        settled: false,
        // compoundRoom counts distinct rooms per compound; the best compound
        // is the progress.
        compoundRooms: {}
    };
}

/**
 * Apply one event. Returns { state, advanced, completedNow }. Pure: the input
 * is not mutated, and a completed bounty never moves again.
 */
export function recordBountyEvent(state, event = {}) {
    if (!state || state.completed || event.metric !== state.metric) return { state, advanced: false, completedNow: false };
    let progress = state.progress;
    let compoundRooms = state.compoundRooms;
    if (state.metric === 'compoundRoom') {
        const siteId = String(event.siteId ?? '');
        const roomKey = String(event.roomKey ?? '');
        if (!siteId || !roomKey) return { state, advanced: false, completedNow: false };
        const rooms = new Set(compoundRooms[siteId] ?? []);
        if (rooms.has(roomKey)) return { state, advanced: false, completedNow: false };
        rooms.add(roomKey);
        compoundRooms = { ...compoundRooms, [siteId]: [...rooms] };
        progress = Math.max(progress, rooms.size);
    } else {
        const amount = Number.isFinite(event.amount) ? Math.max(0, event.amount) : 1;
        if (amount <= 0) return { state, advanced: false, completedNow: false };
        progress = state.progress + amount;
    }
    progress = Math.min(state.target, progress);
    if (progress === state.progress && compoundRooms === state.compoundRooms) return { state, advanced: false, completedNow: false };
    const completed = progress >= state.target;
    return {
        state: { ...state, progress, compoundRooms, completed },
        advanced: progress !== state.progress,
        completedNow: completed
    };
}
