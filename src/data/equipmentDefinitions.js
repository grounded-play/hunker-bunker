export const EQUIPMENT_SCHEMA_VERSION = 1;

const mod = (id, name, mount, summary, modifiers) => Object.freeze({
    id, family: 'overclock', name, mount, summary, modifiers: Object.freeze(modifiers)
});
const charm = (id, name, summary, modifiers) => Object.freeze({
    id, family: 'charm', name, mount: 'weapon.charm', summary,
    attunement: true, modifiers: Object.freeze(modifiers)
});

export const EQUIPMENT_DEFINITIONS = Object.freeze({
    '4130': charm('4130', 'Mini Cryo-Core', 'Cryo effects last 5% longer.', { cryoDurationMultiplier: 1.05 }),
    '4131': charm('4131', 'Spent 50-Cal Casing', 'First impact after reload gains +1 pierce.', { reloadOpeningPierceBonus: 1 }),
    '4132': charm('4132', 'Sporesnail Pearl', 'Reduces spore and gas damage by 8%.', { gasDamageReduction: 0.08 }),
    '4133': charm('4133', 'Trench Whistle', 'Reloading after a kill grants 8% fire-rate handling.', { postKillReloadFireRateMultiplier: 0.92 }),
    '4134': charm('4134', 'Glitched RAM Card', 'Every eighth hit repeats a 20% echo packet.', { echoHitInterval: 8, echoDamageMultiplier: 0.20 }),
    '4135': charm('4135', 'Geodetic Compass', 'Detects hidden routes and caches within 10m.', { hiddenRoomDetectionRange: 10 }),
    '4136': charm('4136', 'Mini Drone Bobble', 'Sustained hits mark targets for 8% bonus damage.', { markedTargetDamageMultiplier: 1.08 }),
    '4137': charm('4137', 'Amber Bio-Flask', 'Healing received is increased by 10%.', { healingMultiplier: 1.10 }),
    '4138': charm('4138', 'Dark Matter Singularity', 'Pickup magnet radius increased by 12%.', { scrapMagnetRadiusBonus: 0.12 }),
    '4139': charm('4139', 'Golden Sub-Bunker Key', 'Salvage value increased by 10%.', { salvageValueMultiplier: 1.10 }),

    '4140': mod('4140', 'Cryo-Capacitor Overclock', 'operator.shoulder_left', '+8% cryo duration.', { cryoDurationMultiplier: 1.08 }),
    '4141': mod('4141', 'Magnetic Scavenger Coil', 'operator.waist_back', '+20% pickup magnet radius.', { scrapMagnetRadiusBonus: 0.20 }),
    '4142': mod('4142', 'Bio-Hazard Filter Vent', 'operator.chest_center', '-12% spore and gas damage.', { gasDamageReduction: 0.12 }),
    '4143': mod('4143', 'Kinetic Impact Bushing', 'operator.forearm_right', '+1 kinetic projectile pierce.', { kineticPierceBonus: 1 }),
    '4144': mod('4144', 'Thermal Heat Exchanger', 'operator.back_upper', 'Shield recharge delay reduced by 10%.', { shieldRechargeDelayMultiplier: 0.90 }),
    '4145': mod('4145', 'Echo-Location Transceiver', 'operator.helmet_side', 'Detects hidden routes within 15m.', { hiddenRoomDetectionRange: 15 }),
    '4146': mod('4146', 'Symbiotic Adrenaline Pump', 'operator.chest_center', '+15% speed below 25% health.', { lowHpSpeedBoostActive: true }),
    '4147': mod('4147', 'Zero-Point Flux Overdrive', 'operator.forearm_left', 'Five rapid kills refund Dash.', { dashRefundOnMultiKill: true }),
    '4160': mod('4160', 'Ballast Plating', 'operator.chest_center', '+2 max health; -15% movement speed.', { maxHealthBonus: 2, moveSpeedMultiplier: 0.85 }),
    '4161': mod('4161', 'Scrap Furnace', 'operator.back_upper', 'Props drop salvage; -10% fire rate.', { propsDropSalvage: true, fireRateMultiplier: 0.90 }),
    '4162': mod('4162', "Queen's Bane", 'operator.forearm_left', '+25% boss damage; -10% other damage.', { bossDamageMultiplier: 1.25, nonBossDamageMultiplier: 0.90 }),
    '4163': mod('4163', 'Archivist Lens', 'operator.helmet_side', 'Lore grants salvage; -1 magazine capacity.', { loreDropsGrantSalvage: true, clipSizeBonus: -1 }),
    '4164': mod('4164', 'Shard Conduit', 'operator.back_upper', '+1 relic rarity tier; -10% max O₂.', { relicRarityTierBonus: 1, maxOxygenMultiplier: 0.90 }),
    '4165': mod('4165', 'Duplicate Refiner', 'operator.waist_back', 'Duplicates become shards; -15% salvage value.', { duplicateRelicsToShards: true, salvageValueMultiplier: 0.85 }),
    '4166': mod('4166', 'Pressure Seal', 'operator.chest_center', '-25% O₂ drain; -40% healing received.', { oxygenDrainMultiplier: 0.75, healingMultiplier: 0.60 }),
    '4167': mod('4167', 'Deep Anchor', 'operator.waist_back', 'Ring crossings cost no O₂ but spawn an elite.', { ringCrossingFreeO2: true, ringCrossingSpawnsElite: true })
});

export function getEquipmentDefinition(id) {
    return id == null ? null : EQUIPMENT_DEFINITIONS[String(id)] ?? null;
}

export function getEquipmentStatus(id) {
    const definition = getEquipmentDefinition(id);
    if (!definition) return null;
    return {
        id: definition.id,
        family: definition.family,
        name: definition.name,
        mount: definition.mount.replace('operator.', '').replace('weapon.', '').replaceAll('_', ' ').toUpperCase(),
        summary: definition.summary,
        attunement: Boolean(definition.attunement)
    };
}

export function composeEquipmentModifiers(ids = []) {
    const result = {};
    for (const id of ids.filter(Boolean)) {
        const modifiers = getEquipmentDefinition(id)?.modifiers ?? {};
        for (const [key, value] of Object.entries(modifiers)) {
            if (typeof value === 'boolean') result[key] = Boolean(result[key]) || value;
            else if (key.endsWith('Multiplier')) result[key] = (result[key] ?? 1) * value;
            else if (key.endsWith('Range') || key.endsWith('Interval')) result[key] = Math.max(result[key] ?? 0, value);
            else result[key] = (result[key] ?? 0) + value;
        }
    }
    return result;
}
