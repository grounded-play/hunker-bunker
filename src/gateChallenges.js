// Per-campaign challenges on the road to each ring gate. The gate itself
// stays a fixed landmark (mazeExpedition.js RING_BLOCKER_FEATURES: the bridge
// is always ring 2); what changes between campaigns is how that gate is held
// and how hard its approach is. Deterministic in the world plan's seed, so a
// campaign keeps its challenges across every deployment and reload.
import { mixRunEntropy } from './runEntropy.js';

export const GATE_CHALLENGES = Object.freeze({
    // An elite anchor waits in the gate chunk until the crossing is opened.
    ELITE_WARDEN: 'elite_warden',
    // Rubble chokes the approach: every approach chunk takes extra piles.
    COLLAPSED_APPROACH: 'collapsed_approach',
    // The approach crawls with hostiles: spawn density well above the ring's.
    INFESTED_APPROACH: 'infested_approach',
    // The gate's grid is dead: the whole approach runs dark.
    BLACKOUT: 'blackout'
});

export const GATE_CHALLENGE_TUNING = Object.freeze({
    infestedDensityMultiplier: 1.7,
    blackoutLightMultiplier: 0.55,
    collapsedMaxPiles: 4
});

function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

/**
 * One challenge per ring gate. The four challenges are dealt without
 * replacement while there are gates left to cover them, so a campaign never
 * stacks the same trick on every gate.
 *
 * @returns {{ crossingId: string, ring: number, challenge: string,
 *             gateChunkKey: string, approachChunkKeys: string[] }[]}
 */
export function planGateChallenges(worldPlan) {
    const crossings = [...(worldPlan?.ringCrossings ?? [])]
        .filter((crossing) => typeof crossing.chunkKey === 'string')
        .sort((a, b) => a.ring - b.ring);
    if (!crossings.length) return [];
    const random = seededRandom(mixRunEntropy(Number(worldPlan.seed) >>> 0, 0x47415445, 1));
    const deck = [];
    const spine = worldPlan.topology?.spineChunkKeys ?? [];
    return crossings.map((crossing) => {
        if (!deck.length) deck.push(...Object.values(GATE_CHALLENGES));
        const challenge = deck.splice(Math.floor(random() * deck.length), 1)[0];
        // The approach is the gate chunk plus its spine neighbours: the stretch
        // every carrier walks to reach the threshold from either side.
        const index = spine.indexOf(crossing.chunkKey);
        const approachChunkKeys = [crossing.chunkKey];
        if (index > 0) approachChunkKeys.push(spine[index - 1]);
        if (index >= 0 && index < spine.length - 1) approachChunkKeys.push(spine[index + 1]);
        return {
            crossingId: crossing.id,
            ring: crossing.ring,
            challenge,
            gateChunkKey: crossing.chunkKey,
            approachChunkKeys: [...new Set(approachChunkKeys)]
        };
    });
}
