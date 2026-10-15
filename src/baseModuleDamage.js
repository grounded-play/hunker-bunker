const DURABILITY = Object.freeze({
    hull_patch_panel: 90,
    door_seal_kit: 120
});

export function getBaseModuleDurability(definitionId) {
    return DURABILITY[definitionId] ?? null;
}

export function damageBaseModule(modules, instanceId, amount) {
    const damage = Math.max(0, Number(amount) || 0);
    const index = (modules ?? []).findIndex((module) => module.instanceId === instanceId);
    if (index < 0 || damage <= 0) return { ok: false, reason: 'invalid-target', modules, module: null, destroyed: false };
    const current = modules[index];
    const maximum = getBaseModuleDurability(current.definitionId);
    if (!maximum || current.isDestroyed) return { ok: false, reason: 'not-damageable', modules, module: current, destroyed: false };
    const durability = Math.max(0, (Number.isFinite(current.durability) ? current.durability : maximum) - damage);
    const next = {
        ...current,
        durability,
        maxDurability: maximum,
        condition: durability / maximum,
        isDestroyed: durability <= 0,
        damageState: durability <= 0 ? 'breached' : durability < maximum * 0.5 ? 'damaged' : 'intact'
    };
    const nextModules = [...modules];
    nextModules[index] = next;
    return { ok: true, modules: nextModules, module: next, destroyed: next.isDestroyed };
}

export function baseModuleRepairCost(module) {
    const maximum = getBaseModuleDurability(module?.definitionId);
    if (!maximum) return 0;
    const durability = Number.isFinite(module?.durability) ? module.durability : maximum;
    const missing = Math.max(0, Math.min(maximum, maximum - durability));
    return missing > 0 ? Math.max(3, Math.ceil((missing / maximum) * 12)) : 0;
}

export function repairBaseModule(modules, instanceId) {
    const index = (modules ?? []).findIndex((module) => module.instanceId === instanceId);
    if (index < 0) return { ok: false, reason: 'missing-module', modules, module: null, cost: 0 };
    const current = modules[index];
    const maximum = getBaseModuleDurability(current.definitionId);
    const cost = baseModuleRepairCost(current);
    if (!maximum || cost <= 0) return { ok: false, reason: 'not-damaged', modules, module: current, cost: 0 };
    const next = {
        ...current,
        durability: maximum,
        maxDurability: maximum,
        condition: 1,
        isDestroyed: false,
        damageState: 'intact'
    };
    const nextModules = [...modules];
    nextModules[index] = next;
    return { ok: true, modules: nextModules, module: next, cost };
}
