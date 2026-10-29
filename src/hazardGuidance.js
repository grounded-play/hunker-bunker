// Every hazard answers three questions (docs/planning/definitive-first-
// expedition-improvement-program-2026-10-27.md §5): what is hurting you, what
// to do right now, and what gear or upgrade counters it for good. Toxin has
// its own module (toxinProtectionGuidance.js); oxygen and cold share this one,
// since cold in this game is an O2 drain multiplier.

function costText(cost = {}) {
    return ['tech', 'med', 'coin']
        .filter((key) => Number(cost[key]) > 0)
        .map((key) => `${cost[key]} ${key.toUpperCase()}`)
        .join(' · ');
}

function generatorAnswer({ level = 0, maxed = false, nextCost = null } = {}) {
    if (level <= 0) {
        const cost = costText(nextCost ?? {});
        return `REPAIR THE O₂ GENERATOR AT THE SHIP CONSOLE${cost ? ` (${cost})` : ''}`;
    }
    if (maxed) return `O₂ GENERATOR ${level} · FULL FIELD`;
    return `UPGRADE THE O₂ GENERATOR FOR A WIDER FIELD (LEVEL ${level})`;
}

/**
 * Guidance for draining oxygen outside the ship field, or cold in a cryo
 * biome (which drains the same reserve faster).
 *
 * @param {object} state
 * @param {'oxygen'|'cold'} state.kind
 * @param {string} [state.safeDirection] the live "go here" line, if any
 * @param {number} [state.generatorLevel]
 * @param {boolean} [state.generatorMaxed]
 * @param {object} [state.nextCost] next generator upgrade cost
 * @param {number} [state.drainMultiplier] gear and rest combined, e.g. 0.75 Pressure Seal
 * @param {boolean} [state.warmthPerk] Sister Martha's warmth (cold only)
 */
export function vitalHazardGuidance({
    kind = 'oxygen',
    safeDirection = '',
    generatorLevel = 0,
    generatorMaxed = false,
    nextCost = null,
    drainMultiplier = 1,
    warmthPerk = false
} = {}) {
    const immediate = safeDirection || 'RETURN TO THE PRESSURIZED SHIP FIELD';
    // Rest alone trims drain 10%; protection starts at the gear tier (the
    // Pressure Seal is 25%), below that the generator is still the answer.
    const cut = Math.round((1 - (Number(drainMultiplier) || 1)) * 100);
    const gear = cut >= 20 ? `O₂ DRAIN CUT ${cut}%` : null;
    const warmth = kind === 'cold' && warmthPerk ? 'TALLOW WARMTH ACTIVE · 20% LESS DRAIN' : null;
    const protection = [gear, warmth].filter(Boolean);
    const answer = generatorAnswer({ level: generatorLevel, maxed: generatorMaxed, nextCost });
    const what = kind === 'cold' ? 'COLD DRAINS YOUR O₂ FASTER' : 'OUTSIDE THE SHIP FIELD';
    return Object.freeze({
        state: protection.length ? 'active' : (generatorLevel > 0 ? 'ready' : 'missing'),
        detail: protection.length ? `${immediate} · ${protection.join(' · ')}` : `${immediate} · ${answer}`,
        prompt: `> ${what}: ${immediate}. ${protection.length ? protection.join('. ') : `FOR GOOD: ${answer}`}.`
    });
}

/** Act 2 hazard walls: 1 HP every 2.5 s nearby, until the keycard bypasses them. */
export function hazardWallGuidance() {
    return Object.freeze({
        state: 'missing',
        detail: 'STEP AWAY FROM THE HAZARD WALL · SUBSTATION KEYCARD SHUTS IT OFF',
        prompt: '> HAZARD WALL DISCHARGE: STEP AWAY NOW. FOR GOOD: THE SUBSTATION KEYCARD (REACTOR VENTING CAMP QUEST) BYPASSES EVERY HAZARD WALL.'
    });
}
