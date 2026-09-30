export const SUIT_BLOOD_DRY_MS = 30_000;
export const SUIT_MAX_BLOOD = 8;
export const SUIT_MAX_SCUFFS = 8;

export function damageTierForVitals(hp, maxHp) {
    const resolvedHp = Math.max(0, Number(hp) || 0);
    const resolvedMax = Math.max(1, Number(maxHp) || 1);
    if (resolvedHp <= 0) return 3;
    const ratio = resolvedHp / resolvedMax;
    if (ratio <= 1 / 3) return 2;
    if (ratio <= 2 / 3) return 1;
    return 0;
}

export function bloodColorForDamageReason(reason = '') {
    const key = String(reason).toLowerCase();
    if (/(queen|spore|poison|bio|hive|caustic)/.test(key)) return 'alien';
    if (/(snail|crawler|frost|cyber|enemy|ground-slam)/.test(key)) return 'ichor';
    return 'human';
}

export function createSuitCondition(overrides = {}) {
    return {
        damageTier: 0,
        bloodCount: 0,
        bloodDryMs: 0,
        bloodColor: 'human',
        scuffCount: 0,
        scratchCount: 0,
        frost: 0,
        toxin: 0,
        inCombat: false,
        dead: false,
        lastJolt: null,
        ...overrides
    };
}

export function reduceSuitCondition(current, event = {}) {
    const state = createSuitCondition(current);
    switch (event.type) {
        case 'damage': {
            const tier = damageTierForVitals(event.hp, event.maxHp);
            state.damageTier = Math.max(state.damageTier, tier);
            state.scuffCount = Math.min(SUIT_MAX_SCUFFS, state.scuffCount + 1);
            state.lastJolt = event.direction ?? 'center';
            if (event.inCombat && event.goreEnabled !== false) {
                state.bloodCount = Math.min(SUIT_MAX_BLOOD, state.bloodCount + 1);
                state.bloodColor = bloodColorForDamageReason(event.reason);
                state.bloodDryMs = 0;
            }
            return state;
        }
        case 'combat':
            state.inCombat = Boolean(event.active);
            return state;
        case 'tick':
            if (!state.inCombat && state.bloodCount > 0) {
                state.bloodDryMs = Math.min(
                    SUIT_BLOOD_DRY_MS,
                    state.bloodDryMs + Math.max(0, Number(event.deltaMs) || 0)
                );
            }
            return state;
        case 'frost':
            state.frost = Math.max(0, Math.min(1, Number(event.intensity) || 0));
            return state;
        case 'toxin':
            state.toxin = Math.max(0, Math.min(1, Number(event.intensity) || 0));
            return state;
        case 'wash':
            state.bloodCount = 0;
            state.bloodDryMs = 0;
            state.toxin = 0;
            return state;
        case 'clear-blood':
            state.bloodCount = 0;
            state.bloodDryMs = 0;
            return state;
        case 'repair':
            if (state.damageTier > 0) {
                state.scratchCount = Math.min(SUIT_MAX_SCUFFS, state.scratchCount + 1);
            }
            state.damageTier = 0;
            return state;
        case 'death':
            state.dead = true;
            state.damageTier = 3;
            return state;
        case 'new-life':
            return createSuitCondition();
        default:
            return state;
    }
}

export function resolveSuitCondition(state, { visualPressure = 1 } = {}) {
    const pressure = Math.max(0, Math.min(1, Number(visualPressure) || 0));
    const dryProgress = state.bloodCount > 0
        ? Math.max(0, Math.min(1, state.bloodDryMs / SUIT_BLOOD_DRY_MS))
        : 0;
    return {
        damageTier: state.damageTier,
        overlays: {
            blood: (state.bloodCount / SUIT_MAX_BLOOD) * pressure,
            bloodDry: dryProgress,
            scuffs: (Math.min(SUIT_MAX_SCUFFS, state.scuffCount + state.scratchCount) / SUIT_MAX_SCUFFS) * pressure,
            frost: state.frost * pressure,
            toxin: state.toxin * pressure
        },
        lamps: {
            suit: state.dead || state.damageTier >= 2 ? 'red' : state.damageTier === 1 ? 'amber' : 'green',
            thermal: state.frost > 0 ? 'red' : 'green',
            toxin: state.toxin > 0 ? 'red' : 'green'
        },
        bloodColor: state.bloodColor,
        jolt: state.lastJolt,
        dead: state.dead
    };
}
