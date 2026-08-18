// Universal turn-based encounter state machine for wild enemies and camp NPCs/leaders.

export const ENCOUNTER_CATEGORIES = Object.freeze({
    SNAIL: 'snail',
    BIOLOGICAL: 'biological',
    MECHANICAL: 'mechanical',
    CAMP_NPC: 'camp_npc',
    HIVE_LEADER: 'hive_leader'
});

export const CATEGORY_ACTION_LABELS = Object.freeze({
    snail: { fight: 'FIGHT', talk: 'TALK', flee: 'FLEE' },
    biological: { fight: 'FIGHT', talk: 'PACIFY', flee: 'FLEE' },
    mechanical: { fight: 'FIGHT', talk: 'HACK', flee: 'FLEE' },
    camp_npc: { fight: 'DUEL', talk: 'TALK', flee: 'LEAVE', custom: 'RECRUIT' },
    hive_leader: { fight: 'COMMUNE', talk: 'TALK', flee: 'LEAVE', custom: 'BOND' }
});

export function getEntityCategory(type) {
    if (['cybersnail', 'cryosnail', 'sporesnail'].includes(type)) return ENCOUNTER_CATEGORIES.SNAIL;
    if (['sentinel', 'drone'].includes(type)) return ENCOUNTER_CATEGORIES.MECHANICAL;
    if (['camp_meridian', 'camp_tallow', 'camp_vesper', 'scientist', 'camp_npc'].includes(type)) return ENCOUNTER_CATEGORIES.CAMP_NPC;
    if (['hive_suture', 'hive_relay', 'hive_carapace', 'hive_leader'].includes(type)) return ENCOUNTER_CATEGORIES.HIVE_LEADER;
    return ENCOUNTER_CATEGORIES.BIOLOGICAL;
}

export function createUniversalEncounter({
    entityType,
    name = '',
    entityHp = 10,
    maxHp = 10,
    isNpc = false
}) {
    const category = getEntityCategory(entityType);
    const actionLabels = CATEGORY_ACTION_LABELS[category] || CATEGORY_ACTION_LABELS.biological;

    return {
        entityType,
        snailType: entityType,
        category,
        name: name || entityType.toUpperCase(),
        isNpc,
        hp: entityHp,
        snailHp: entityHp,
        maxHp,
        snailMaxHp: maxHp,
        resolve: 0,
        resolveMax: 100,
        actionLabels,
        outcome: null
    };
}

export function resolveEncounterAction(state, action, { playerDamage = 1, counterDamage = 1, infectionStage = null, rollFn = Math.random } = {}) {
    if (!state || state.outcome) return { state, log: 'Encounter resolved.' };

    if (action === 'flee' || action === 'leave') {
        return {
            state: { ...state, outcome: 'fled' },
            log: 'YOU WITHDRAW FROM THE ENCOUNTER.'
        };
    }

    if (action === 'fight' || action === 'duel') {
        const hp = Math.max(0, state.hp - playerDamage);
        const died = hp <= 0;
        const playerDamageTaken = died ? 0 : counterDamage;

        return {
            state: {
                ...state,
                hp,
                snailHp: hp,
                outcome: died ? 'fight_win' : null
            },
            playerDamageTaken,
            snailDamageTaken: state.hp - hp,
            log: died ? `YOU STRIKE. ${state.name} DEFEATED.` : `YOU STRIKE. -${state.hp - hp} HP. COUNTER: -${playerDamageTaken} HP.`
        };
    }

    if (action === 'talk' || action === 'pacify' || action === 'hack') {
        const isAlien = Boolean(infectionStage) && infectionStage !== 'cured';
        const backfireChance = isAlien ? 0.08 : (state.category === ENCOUNTER_CATEGORIES.MECHANICAL ? 0.3 : 0.35);
        const backfired = rollFn() < backfireChance;

        if (backfired) {
            return {
                state,
                backfired: true,
                playerDamageTaken: counterDamage,
                log: state.category === ENCOUNTER_CATEGORIES.MECHANICAL
                    ? 'HACK REJECTED! ELECTRICAL COUNTER-SHOCK.'
                    : `${state.name} REJECTS YOUR ADVANCE AND COUNTERS!`
            };
        }

        const gain = isAlien ? 35 : (state.isNpc ? 50 : 20);
        const resolve = Math.min(state.resolveMax, state.resolve + gain);
        const resolved = resolve >= state.resolveMax;

        let outcome = null;
        if (resolved) {
            if (state.category === ENCOUNTER_CATEGORIES.SNAIL) outcome = 'befriend';
            else if (state.category === ENCOUNTER_CATEGORIES.MECHANICAL) outcome = 'reprogrammed';
            else if (state.isNpc) outcome = 'dialogue_complete';
            else outcome = 'pacified';
        }

        return {
            state: {
                ...state,
                resolve,
                outcome
            },
            resolveGained: gain,
            log: resolved
                ? `${state.name} IS NOW FULLY PACIFIED/WON OVER!`
                : `${state.name} HESITATES. RESOLVE +${gain}.`
        };
    }

    if (action === 'custom' || action === 'recruit') {
        return {
            state: { ...state, resolve: state.resolveMax, outcome: 'recruited' },
            log: `${state.name} HAS JOINED YOUR CAUSE!`
        };
    }

    return { state, log: 'No effect.' };
}
