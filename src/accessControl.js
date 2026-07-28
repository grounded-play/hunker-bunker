export const ACCESS_REQUIREMENT_TYPES = Object.freeze([
    'power',
    'credential',
    'boss',
    'objective'
]);

export function createAccessState(raw = {}) {
    return {
        credentials: new Set(raw.credentials ?? []),
        poweredSystems: new Set(raw.poweredSystems ?? []),
        defeatedBosses: new Set(raw.defeatedBosses ?? []),
        completedObjectives: new Set(raw.completedObjectives ?? [])
    };
}

export function serializeAccessState(state) {
    return {
        credentials: [...(state?.credentials ?? [])],
        poweredSystems: [...(state?.poweredSystems ?? [])],
        defeatedBosses: [...(state?.defeatedBosses ?? [])],
        completedObjectives: [...(state?.completedObjectives ?? [])]
    };
}

export function isGateRequirementMet(requirement, state) {
    if (!requirement) return true;
    if (requirement.type === 'power') return state?.poweredSystems?.has(requirement.id) ?? false;
    if (requirement.type === 'credential') return state?.credentials?.has(requirement.id) ?? false;
    if (requirement.type === 'boss') return state?.defeatedBosses?.has(requirement.id) ?? false;
    if (requirement.type === 'objective') return state?.completedObjectives?.has(requirement.id) ?? false;
    return false;
}

export function grantAccess(state, requirement) {
    if (!requirement || !ACCESS_REQUIREMENT_TYPES.includes(requirement.type)) return false;
    const target = requirement.type === 'power'
        ? state.poweredSystems
        : requirement.type === 'credential'
            ? state.credentials
            : requirement.type === 'boss'
                ? state.defeatedBosses
                : state.completedObjectives;
    const previousSize = target.size;
    target.add(requirement.id);
    return target.size !== previousSize;
}
