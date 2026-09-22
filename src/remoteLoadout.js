import { ARCHETYPE_SKINS, CLASS_ARCHETYPES, DEFAULT_ARCHETYPES, isChassisSupportedForClass } from './loadout.js';
import { EQUIPMENT_SCHEMA_VERSION, getEquipmentDefinition } from './data/equipmentDefinitions.js';

function normalizeClassId(classId) {
    const value = String(classId || 'SCOUT').toLowerCase();
    return value === 'tank' || value === 'engineer' ? value : 'scout';
}

export function resolveRemoteEquipmentVisuals(classId, raw = {}) {
    const cls = normalizeClassId(classId);
    const schemaVersion = Number(raw?.schemaVersion) || 0;
    const equipment = schemaVersion === EQUIPMENT_SCHEMA_VERSION ? raw : {};
    const allowedArchetypes = CLASS_ARCHETYPES[cls] ?? [DEFAULT_ARCHETYPES[cls]];
    const requestedArchetype = String(equipment?.weaponArchetypeId ?? '');
    const weaponArchetypeId = allowedArchetypes.includes(requestedArchetype)
        ? requestedArchetype
        : DEFAULT_ARCHETYPES[cls];
    const requestedSkin = equipment?.weaponSkinId == null ? null : String(equipment.weaponSkinId);
    const weaponSkinId = requestedSkin && (ARCHETYPE_SKINS[weaponArchetypeId] ?? []).includes(requestedSkin)
        ? requestedSkin
        : null;
    const requestedCharm = equipment?.charmId == null ? null : String(equipment.charmId);
    const charmId = getEquipmentDefinition(requestedCharm)?.family === 'charm' ? requestedCharm : null;
    const overclockIds = [...(Array.isArray(equipment?.overclockIds) ? equipment.overclockIds : [])]
        .slice(0, 2)
        .map((id) => String(id))
        .filter((id) => getEquipmentDefinition(id)?.family === 'overclock');
    while (overclockIds.length < 2) overclockIds.push(null);
    const requestedChassis = raw?.chassisSkinId == null ? null : String(raw.chassisSkinId);

    return Object.freeze({
        schemaVersion,
        weaponArchetypeId,
        weaponSkinId,
        charmId,
        overclockIds: Object.freeze(overclockIds),
        chassisSkinId: requestedChassis && isChassisSupportedForClass(cls, requestedChassis)
            ? requestedChassis
            : null
    });
}

export function remoteEquipmentSignature(visuals) {
    return JSON.stringify([
        visuals?.weaponArchetypeId ?? null,
        visuals?.weaponSkinId ?? null,
        visuals?.charmId ?? null,
        ...(visuals?.overclockIds ?? []),
        visuals?.chassisSkinId ?? null
    ]);
}
