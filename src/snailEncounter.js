// Pure turn-based state machine for the snail-diplomacy encounter
// (docs/superpowers/specs/2026-07-26-snail-diplomacy-encounter-design.md).
// No DOM, no THREE — threeGame.js drives this and renders the result.

export const SNAIL_ENCOUNTER_CONSTANTS = Object.freeze({
    FIGHT_PLAYER_DAMAGE: 1,
    SNAIL_COUNTER_DAMAGE: 1,
    RESOLVE_MAX: 100,
    TALK_GAIN_ALIEN: 35,
    TALK_GAIN_HUMAN: 12,
    BACKFIRE_CHANCE_HUMAN: 0.4,
    BACKFIRE_CHANCE_ALIEN: 0.05
});

export function createEncounter({ snailType, snailHp, snailMaxHp }) {
    return {
        snailType,
        snailHp,
        snailMaxHp,
        resolve: 0,
        resolveMax: SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX,
        outcome: null
    };
}

export function resolveFight(state, { playerDamage, snailDamage }) {
    if (state.outcome) return { state, playerDamageTaken: 0, snailDamageTaken: 0 };

    const snailHp = Math.max(0, state.snailHp - Math.max(0, playerDamage));
    const snailDamageTaken = state.snailHp - snailHp;
    const died = snailHp <= 0;
    const playerDamageTaken = died ? 0 : Math.max(0, snailDamage);

    return {
        state: {
            ...state,
            snailHp,
            outcome: died ? 'fight_win' : state.outcome
        },
        playerDamageTaken,
        snailDamageTaken
    };
}

export function resolveTalk(state, { infectionStage, rollFn = Math.random }) {
    if (state.outcome) return { state, resolveGained: 0, backfired: false };

    const isAlienAligned = Boolean(infectionStage) && infectionStage !== 'cured';
    const backfireChance = isAlienAligned
        ? SNAIL_ENCOUNTER_CONSTANTS.BACKFIRE_CHANCE_ALIEN
        : SNAIL_ENCOUNTER_CONSTANTS.BACKFIRE_CHANCE_HUMAN;
    const backfired = rollFn() < backfireChance;

    if (backfired) {
        return { state, resolveGained: 0, backfired: true };
    }

    const gain = isAlienAligned
        ? SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_ALIEN
        : SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_HUMAN;
    const resolve = Math.min(state.resolveMax, state.resolve + gain);
    const befriended = resolve >= state.resolveMax;

    return {
        state: {
            ...state,
            resolve,
            outcome: befriended ? 'befriend' : state.outcome
        },
        resolveGained: gain,
        backfired: false
    };
}

export function resolveFlee(state) {
    return { state: { ...state, outcome: 'fled' } };
}
