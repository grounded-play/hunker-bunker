import { getBaseModuleDefinition } from './data/baseModules.js';

export const BASE_REBUILD_STORAGE_KEY = 'hb_base_rebuild_v1';

function storageOrNull(storage) {
    if (storage) return storage;
    try { return globalThis.localStorage ?? null; } catch { return null; }
}

function sanitizeInstalledModule(module) {
    if (!module?.instanceId || !getBaseModuleDefinition(module.definitionId)) return null;
    const transform = module.transform && Number.isFinite(module.transform.x) && Number.isFinite(module.transform.z)
        ? {
            x: module.transform.x,
            z: module.transform.z,
            yaw: Number.isFinite(module.transform.yaw) ? module.transform.yaw : 0
        }
        : null;
    return {
        ...module,
        instanceId: String(module.instanceId),
        definitionId: String(module.definitionId),
        ...(Number.isFinite(module.x) ? { x: module.x } : {}),
        ...(Number.isFinite(module.z) ? { z: module.z } : {}),
        transform
    };
}

export function loadInstalledBaseModules(storage = null) {
    const target = storageOrNull(storage);
    if (!target?.getItem) return [];
    try {
        const raw = JSON.parse(target.getItem(BASE_REBUILD_STORAGE_KEY) ?? '{}');
        const seen = new Set();
        return (Array.isArray(raw.installed) ? raw.installed : []).flatMap((module) => {
            const clean = sanitizeInstalledModule(module);
            if (!clean || seen.has(clean.instanceId)) return [];
            seen.add(clean.instanceId);
            return [clean];
        });
    } catch {
        return [];
    }
}

export function saveInstalledBaseModules(installed, storage = null) {
    const target = storageOrNull(storage);
    if (!target?.setItem) return false;
    const clean = [];
    const seen = new Set();
    for (const module of installed ?? []) {
        const entry = sanitizeInstalledModule(module);
        if (!entry || seen.has(entry.instanceId)) continue;
        seen.add(entry.instanceId);
        clean.push(entry);
    }
    try {
        target.setItem(BASE_REBUILD_STORAGE_KEY, JSON.stringify({ version: 1, installed: clean }));
        return true;
    } catch {
        return false;
    }
}
