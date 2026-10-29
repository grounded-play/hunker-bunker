// What an install actually changed, as one line the player reads at the
// moment of installing (docs/planning/definitive-first-expedition-improvement-
// program-2026-10-27.md P1-E): where it went, where it sits on the suit, and
// the before -> after of each stat it moved. Built from the loadout's own
// modifier snapshot either side of the install, so every module and charm
// reports the same way.

const ratio = (label, toValue = (v) => v) => ({ label, kind: 'ratio', toValue });
const delta = (label, unit = '') => ({ label, kind: 'delta', unit });
const toggle = (label) => ({ label, kind: 'toggle' });

const STATS = Object.freeze({
    gasDamageReduction: ratio('TOXIN DAMAGE', (v) => 1 - v),
    oxygenDrainMultiplier: ratio('O₂ DRAIN'),
    maxOxygenMultiplier: ratio('MAX O₂'),
    healingMultiplier: ratio('HEALING RECEIVED'),
    moveSpeedMultiplier: ratio('MOVE SPEED'),
    fireRateMultiplier: ratio('FIRE RATE'),
    bossDamageMultiplier: ratio('BOSS DAMAGE'),
    nonBossDamageMultiplier: ratio('DAMAGE TO HOSTILES'),
    cryoDurationMultiplier: ratio('CRYO DURATION'),
    shieldRechargeDelayMultiplier: ratio('SHIELD RECHARGE DELAY'),
    salvageValueMultiplier: ratio('SALVAGE VALUE'),
    scrapMagnetRadiusBonus: ratio('PICKUP RADIUS', (v) => 1 + v),
    maxHealthBonus: delta('MAX HEALTH'),
    clipSizeBonus: delta('MAGAZINE'),
    kineticPierceBonus: delta('PIERCE'),
    relicRarityTierBonus: delta('RELIC TIER'),
    hiddenRoomDetectionRange: delta('HIDDEN-ROUTE SCAN', 'M'),
    lowHpSpeedBoostActive: toggle('LOW-HEALTH SPEED BURST'),
    dashRefundOnMultiKill: toggle('DASH REFUND ON 5 KILLS'),
    propsDropSalvage: toggle('PROPS DROP SALVAGE'),
    loreDropsGrantSalvage: toggle('LORE GRANTS SALVAGE'),
    duplicateRelicsToShards: toggle('DUPLICATES TO SHARDS'),
    ringCrossingFreeO2: toggle('FREE RING CROSSINGS'),
    ringCrossingSpawnsElite: toggle('ELITE ON EACH CROSSING')
});

const MOUNTS = Object.freeze({
    'operator.chest_center': 'CHEST',
    'operator.back_upper': 'BACK',
    'operator.waist_back': 'BELT',
    'operator.shoulder_left': 'LEFT SHOULDER',
    'operator.forearm_left': 'LEFT FOREARM',
    'operator.forearm_right': 'RIGHT FOREARM',
    'operator.helmet_side': 'HELMET',
    'weapon.charm': 'WEAPON CHARM MOUNT'
});

const fixed = (value) => Number(value).toFixed(2);

/** Each tracked stat that differs between two modifier snapshots. */
export function describeModifierChanges(before = {}, after = {}) {
    const changes = [];
    for (const [key, stat] of Object.entries(STATS)) {
        if (!(key in before) && !(key in after)) continue;
        if (stat.kind === 'toggle') {
            const from = Boolean(before[key]);
            const to = Boolean(after[key]);
            if (from !== to) changes.push(`${stat.label} ${from ? 'ON' : 'OFF'} → ${to ? 'ON' : 'OFF'}`);
            continue;
        }
        const neutral = stat.kind === 'ratio' && !key.endsWith('Reduction') && !key.endsWith('Bonus') ? 1 : 0;
        const rawFrom = Number(before[key] ?? neutral);
        const rawTo = Number(after[key] ?? neutral);
        if (!Number.isFinite(rawFrom) || !Number.isFinite(rawTo) || Math.abs(rawFrom - rawTo) < 1e-6) continue;
        if (stat.kind === 'ratio') {
            changes.push(`${stat.label} ${fixed(stat.toValue(rawFrom))} → ${fixed(stat.toValue(rawTo))}`);
        } else {
            changes.push(`${stat.label} ${rawFrom}${stat.unit} → ${rawTo}${stat.unit}`);
        }
    }
    return changes;
}

/** "> BIO-HAZARD FILTER VENT INSTALLED IN SUIT BAY A · CHEST · TOXIN DAMAGE 1.00 → 0.88" */
export function installFeedbackLine({ name = 'MODULE', slot = null, kind = 'mod', mount = null, changes = [] } = {}) {
    const where = kind === 'charm'
        ? 'ON THE WEAPON'
        : (slot === 1 ? 'IN SUIT BAY A' : slot === 2 ? 'IN SUIT BAY B' : 'ON THE SUIT');
    const parts = [`${String(name).toUpperCase()} INSTALLED ${where}`];
    const mounted = MOUNTS[mount];
    if (mounted && kind !== 'charm') parts.push(mounted);
    parts.push(...changes);
    return `> ${parts.join(' · ')}`;
}
