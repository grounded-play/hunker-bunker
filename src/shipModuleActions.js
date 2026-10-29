export const SHIP_MODULE_ACTIONS = Object.freeze({
    camp_o2_generator_core: Object.freeze({
        id: 'oxygen-purge', label: 'PURGE CAMP O2', cooldownSeconds: 15, color: 0x38bdf8
    }),
    ship_life_support_core: Object.freeze({
        id: 'oxygen-purge', label: 'PURGE LIFE-SUPPORT RESERVE', cooldownSeconds: 15, color: 0x38bdf8
    }),
    ship_navigation_core: Object.freeze({
        id: 'route-lock', label: 'LOCK NAVIGATION ROUTE', cooldownSeconds: 12, color: 0x38bdf8
    }),
    ship_comms_array: Object.freeze({
        id: 'deep-scan', label: 'TRANSMIT DEEP SCAN', cooldownSeconds: 25, color: 0x22c55e
    }),
    ship_engine_manifold: Object.freeze({
        id: 'field-service', label: 'VENT MANIFOLD / SERVICE WEAPON', cooldownSeconds: 30, color: 0xf97316
    })
});

export function getShipModuleAction(definitionId) {
    return SHIP_MODULE_ACTIONS[definitionId] ?? null;
}

export function shipModuleActionCooldownRemaining(cooldowns, instanceId, nowSeconds = 0) {
    return Math.max(0, (Number(cooldowns?.get?.(instanceId)) || 0) - (Number(nowSeconds) || 0));
}

export function commitShipModuleActionCooldown(cooldowns, module, nowSeconds = 0) {
    const action = getShipModuleAction(module?.definitionId);
    if (!action || !module?.instanceId || !cooldowns?.set) return false;
    cooldowns.set(module.instanceId, (Number(nowSeconds) || 0) + action.cooldownSeconds);
    return true;
}
