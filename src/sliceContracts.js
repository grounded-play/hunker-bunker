// Cross-lane contracts for the Sprint 47 Ring 1 slice
// (docs/planning/gameplay-feature-review-2026-09-24.md, lane extension).
//
// Lane 2 (encounters) and Lane 3 (builds) own their modules; Lane 1's events
// call them through this registry so no lane imports a file another lane has
// not shipped yet. Each lane registers its implementation at module load:
//
//   registerSliceContract('spawnEncounterRecipe', (game, recipeId, origin, { seed }) => handle)
//   registerSliceContract('grantRunDrop', (game, dropId) => boolean)
//
// An unregistered contract is reported, never faked: the caller gets
// { available: false } and must degrade honestly.

export const SLICE_CONTRACTS = Object.freeze(['spawnEncounterRecipe', 'grantRunDrop']);

const registry = new Map();

export function registerSliceContract(name, implementation) {
    if (!SLICE_CONTRACTS.includes(name) || typeof implementation !== 'function') return false;
    registry.set(name, implementation);
    return true;
}

export function clearSliceContract(name) {
    registry.delete(name);
}

export function hasSliceContract(name) {
    return registry.has(name);
}

/** Call a contract. { available: false } when no lane has registered it yet. */
export function callSliceContract(name, ...args) {
    const implementation = registry.get(name);
    if (!implementation) return { available: false, value: null };
    return { available: true, value: implementation(...args) };
}

export function missingSliceContracts() {
    return SLICE_CONTRACTS.filter((name) => !registry.has(name));
}
