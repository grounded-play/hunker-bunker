import { getFieldWeaponProfile } from './fieldWeapon.js';

export const FIELD_AMMO_TYPES = Object.freeze({
    BALLISTIC: 'ballistic',
    SHELLS: 'shells',
    RAIL_CELLS: 'rail-cells',
    CRYO_CANISTERS: 'cryo-canisters',
    FUEL_TANKS: 'fuel-tanks'
});

export const FIELD_WEAPON_DROP_CATALOG = Object.freeze({
    mk1_sidearm: Object.freeze({ rarity: 'common', ammoType: FIELD_AMMO_TYPES.BALLISTIC, clipCapacity: 12, reserveCapacity: 72 }),
    pulse_carbine: Object.freeze({ rarity: 'uncommon', ammoType: FIELD_AMMO_TYPES.BALLISTIC, clipCapacity: 24, reserveCapacity: 120 }),
    scatter_rep: Object.freeze({ rarity: 'uncommon', ammoType: FIELD_AMMO_TYPES.SHELLS, clipCapacity: 6, reserveCapacity: 30 }),
    rail_marksman: Object.freeze({ rarity: 'rare', ammoType: FIELD_AMMO_TYPES.RAIL_CELLS, clipCapacity: 4, reserveCapacity: 16 }),
    neon_smg: Object.freeze({ rarity: 'rare', ammoType: FIELD_AMMO_TYPES.BALLISTIC, clipCapacity: 36, reserveCapacity: 144 }),
    cryo_lance: Object.freeze({ rarity: 'rare', ammoType: FIELD_AMMO_TYPES.CRYO_CANISTERS, clipCapacity: 5, reserveCapacity: 20 }),
    flamethrower: Object.freeze({
        rarity: 'rare',
        ammoType: FIELD_AMMO_TYPES.FUEL_TANKS,
        clipCapacity: 60,
        reserveCapacity: 240,
        modelType: 'weapon_flamethrower_m70',
        caseModelType: 'weapon_flamethrower_case',
        ammoModelType: 'weapon_fuel_canister_heavy'
    })
});

export function getFieldWeaponDropDefinition(profileId) {
    return FIELD_WEAPON_DROP_CATALOG[profileId] ?? null;
}

const clampAmmo = (value, capacity) => Math.min(capacity, Math.max(0, Math.floor(Number(value) || 0)));
const copyPosition = (position) => ({
    x: Number(position?.x) || 0,
    z: Number(position?.z) || 0
});

export function createFieldWeaponRunState(runId = null) {
    return { runId, equipped: null, worldDrops: [] };
}

export function createFieldWeaponDrop({
    instanceId,
    profileId,
    ammoInWeapon,
    reserveAmmo = 0,
    worldPosition,
    sourceEncounterId = null,
    runId = null,
    rarity = null
} = {}) {
    const definition = FIELD_WEAPON_DROP_CATALOG[profileId];
    const combatProfile = getFieldWeaponProfile(profileId, true);
    if (!instanceId || !definition || !combatProfile) return null;
    return {
        instanceId: String(instanceId),
        profileId,
        rarity: rarity ?? definition.rarity,
        ammoType: definition.ammoType,
        modelType: definition.modelType ?? null,
        caseModelType: definition.caseModelType ?? null,
        ammoModelType: definition.ammoModelType ?? null,
        ammoInWeapon: clampAmmo(ammoInWeapon ?? definition.clipCapacity, definition.clipCapacity),
        reserveAmmo: clampAmmo(reserveAmmo, definition.reserveCapacity),
        worldPosition: copyPosition(worldPosition),
        sourceEncounterId,
        runId
    };
}

export function addFieldWeaponDrop(state, drop) {
    if (!state || !drop || (drop.runId != null && drop.runId !== state.runId)) {
        return { ok: false, reason: 'wrong-run', state };
    }
    if (state.worldDrops.some((entry) => entry.instanceId === drop.instanceId)) {
        return { ok: false, reason: 'duplicate-instance', state };
    }
    return { ok: true, state: { ...state, worldDrops: [...state.worldDrops, { ...drop }] } };
}

/** Atomic one-slot swap. The old gun appears exactly where the selected gun was. */
export function swapFieldWeapon(state, instanceId) {
    const index = state?.worldDrops?.findIndex((drop) => drop.instanceId === instanceId) ?? -1;
    if (index < 0) return { ok: false, reason: 'missing-drop', state };
    const selected = state.worldDrops[index];
    if (selected.runId != null && selected.runId !== state.runId) {
        return { ok: false, reason: 'wrong-run', state };
    }
    const remaining = state.worldDrops.filter((_, dropIndex) => dropIndex !== index);
    const dropped = state.equipped
        ? { ...state.equipped, worldPosition: copyPosition(selected.worldPosition) }
        : null;
    if (dropped) remaining.push(dropped);
    const equipped = { ...selected };
    delete equipped.worldPosition;
    return {
        ok: true,
        equipped,
        dropped,
        state: { ...state, equipped, worldDrops: remaining }
    };
}

export function consumeFieldWeaponAmmo(state, amount = 1) {
    if (!state?.equipped) return { ok: false, reason: 'no-field-weapon', state };
    const cost = Math.max(1, Math.floor(Number(amount) || 1));
    if (state.equipped.ammoInWeapon < cost) return { ok: false, reason: 'empty', state };
    const equipped = { ...state.equipped, ammoInWeapon: state.equipped.ammoInWeapon - cost };
    return { ok: true, state: { ...state, equipped }, equipped };
}

export function reloadFieldWeapon(state) {
    if (!state?.equipped) return { ok: false, reason: 'no-field-weapon', state };
    const definition = FIELD_WEAPON_DROP_CATALOG[state.equipped.profileId];
    if (!definition) return { ok: false, reason: 'unknown-profile', state };
    const missing = definition.clipCapacity - state.equipped.ammoInWeapon;
    const loaded = Math.min(missing, state.equipped.reserveAmmo);
    if (loaded <= 0) return { ok: false, reason: missing <= 0 ? 'full' : 'no-reserve', state };
    const equipped = {
        ...state.equipped,
        ammoInWeapon: state.equipped.ammoInWeapon + loaded,
        reserveAmmo: state.equipped.reserveAmmo - loaded
    };
    return { ok: true, loaded, state: { ...state, equipped }, equipped };
}

export function resetFieldWeaponRunState(nextRunId = null) {
    return createFieldWeaponRunState(nextRunId);
}
