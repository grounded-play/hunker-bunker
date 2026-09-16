export function resetRunResourceTelemetry(state) {
    state.collectedCount = 0;
    state.collectedValue = 0;
    state.debugGrantedResources = { tech: 0, coin: 0, med: 0, ammo: 0, shells: 0 };
    return state;
}

export function recordCollectedPickup(state, { value = 1 } = {}) {
    state.collectedCount = Math.max(0, Math.floor(Number(state.collectedCount) || 0)) + 1;
    state.collectedValue = Math.max(0, Number(state.collectedValue) || 0) + Math.max(0, Number(value) || 1);
    return state;
}

export function recordDebugResourceGrant(state, resources = {}) {
    const current = state.debugGrantedResources ?? {};
    state.debugGrantedResources = Object.fromEntries(
        ['tech', 'coin', 'med', 'ammo', 'shells'].map((key) => [
            key,
            Math.max(0, Number(current[key]) || 0) + Math.max(0, Number(resources[key]) || 0)
        ])
    );
    return state;
}

export function buildRunResourceTelemetry(state = {}, bankState = {}) {
    const pickupsCollected = Math.max(0, Math.floor(Number(state.collectedCount) || 0));
    const bankBalance = Object.fromEntries(
        ['med', 'tech', 'coin'].map((key) => [key, Math.max(0, Number(bankState[key]) || 0)])
    );
    return {
        totalPickups: pickupsCollected,
        pickupsCollected,
        pickupValueCollected: Math.max(0, Number(state.collectedValue) || 0),
        salvageBanked: bankBalance.med + bankBalance.tech + bankBalance.coin,
        bankBalance,
        debugGrantedResources: { ...(state.debugGrantedResources ?? {}) }
    };
}
