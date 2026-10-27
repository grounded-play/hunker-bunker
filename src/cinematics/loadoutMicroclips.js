import { DEFAULT_ARCHETYPES } from '../data/classArsenal.js';
import { SHIPPED_LOADOUT_CLIPS } from './shippedLoadoutClips.js';

function normalizeClass(playerType) {
    const value = String(playerType ?? 'scout').toLowerCase();
    return value === 'tank' || value === 'engineer' ? value : 'scout';
}

function safeId(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

/** Resolve approved inserts for the class/loadout, omitting missing assets. */
export function loadoutMicroclipBases(loadoutManager, playerType, shipped = SHIPPED_LOADOUT_CLIPS) {
    const cls = normalizeClass(playerType);
    const loadout = loadoutManager?.getClassLoadout?.(cls)
        ?? loadoutManager?.state?.perClass?.[cls]
        ?? {};
    const weapon = loadout.weaponSkinId || `frame:${loadout.archetypeId || DEFAULT_ARCHETYPES[cls]}`;
    const badge = loadoutManager?.getEquippedDecalId?.()
        ?? loadoutManager?.state?.suit?.decalId
        ?? null;
    const charm = loadout.charmId ?? null;
    const candidates = [
        `loadout-${cls}-weapon-${safeId(weapon)}`,
        badge ? `loadout-${cls}-badge-${safeId(badge)}` : null,
        charm ? `loadout-${cls}-charm-${safeId(charm)}` : null
    ];
    return candidates.filter((id) => id && shipped.has(id)).map((id) => `loadout/${id}`);
}

