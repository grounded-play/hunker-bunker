const CAMP_AFFINITIES = Object.freeze({
    camp_meridian: 'ENGINEER',
    camp_tallow: 'SCOUT',
    camp_vesper: 'TANK'
});

const neutralRuntimeEffects = () => ({
    radar: { rangeMult: 1, cooldownMult: 1, compassHoldSeconds: 0 },
    humanityDecayMultiplier: 1,
    medkitInventory: 0,
    ammoReserve: 0,
    turretCooldownMult: 1,
    turretSuspicionGainMult: 1,
    turretPlacementFavor: false
});

function normalizeCampStats(campRecord = {}) {
    return {
        id: String(campRecord.id ?? ''),
        level: Math.max(0, Math.min(3, Math.floor(Number(campRecord.level) || 0))),
        bond: Math.max(0, Math.min(5, Math.floor(Number(campRecord.bond) || 0)))
    };
}

function hasCampAffinity(campId, playerType) {
    return CAMP_AFFINITIES[campId] === String(playerType ?? '').trim().toUpperCase();
}

export function getCampTrades(campRecord, playerType) {
    const { id: campId, level, bond } = normalizeCampStats(campRecord);

    // Class affinity modifier (20% bonus)
    let discount = 1.0;
    let bonus = 1.0;
    if (hasCampAffinity(campId, playerType)) {
        discount = 0.8;
        bonus = 1.2;
    }

    // Level and bond modifier
    // Every level / bond improves rates
    const levelFactor = 1.0 + level * 0.1;
    const bondFactor = 1.0 + bond * 0.05;
    const totalAffinity = bonus * levelFactor * bondFactor;
    const totalDiscount = discount / (levelFactor * bondFactor);

    if (campId === 'camp_meridian') {
        return [
            {
                id: 'sell_tech',
                label: 'SELL TECH MODULE',
                give: { tech: 1 },
                receive: { shells: Math.max(1, Math.round(30 * totalAffinity)) }
            },
            {
                id: 'buy_coin',
                label: 'BUY COIN RESERVES',
                give: { shells: Math.max(1, Math.round(40 * totalDiscount)) },
                receive: { coin: 5 }
            }
        ];
    } else if (campId === 'camp_tallow') {
        return [
            {
                id: 'sell_med',
                label: 'SELL BIO-VACCINES',
                give: { med: 1 },
                receive: { shells: Math.max(1, Math.round(30 * totalAffinity)) }
            },
            {
                id: 'buy_med',
                label: 'BUY STABILIZING MEDS',
                give: { shells: Math.max(1, Math.round(40 * totalDiscount)) },
                receive: { med: 1 }
            }
        ];
    } else { // camp_vesper
        return [
            {
                id: 'sell_coin',
                label: 'SELL AMMO CRATE (COINS)',
                give: { coin: 1 },
                receive: { shells: Math.max(1, Math.round(25 * totalAffinity)) }
            },
            {
                id: 'buy_tech',
                label: 'BUY SPARE TECH PARTS',
                give: { shells: Math.max(1, Math.round(50 * totalDiscount)) },
                receive: { tech: 1 }
            }
        ];
    }
}

export function getCampVerbEffects(campRecord = {}, playerType = 'SCOUT') {
    const { id: campId, level, bond } = normalizeCampStats(campRecord);
    const affinity = hasCampAffinity(campId, playerType);

    if (campId === 'camp_meridian') {
        return {
            campId,
            verb: 'radar_compass_boost',
            radar: {
                rangeMult: 1 + level * 0.08 + bond * 0.04 + (affinity ? 0.08 : 0),
                cooldownMult: Math.max(0.5, 1 - level * 0.04 - bond * 0.02 - (affinity ? 0.05 : 0)),
                compassHoldSeconds: level * 4 + bond * 2 + (affinity ? 4 : 0)
            }
        };
    }

    if (campId === 'camp_tallow') {
        return {
            campId,
            verb: 'stabilize_cover',
            humanityDecayMultiplier: Math.max(0.45, 1 - level * 0.08 - bond * 0.04 - (affinity ? 0.08 : 0)),
            medkitInventory: Math.max(0, level + Math.floor(bond / 2) + (affinity ? 1 : 0))
        };
    }

    if (campId === 'camp_vesper') {
        return {
            campId,
            verb: 'ammo_and_turret_favor',
            ammoReserve: Math.max(0, level * 2 + bond + (affinity ? 2 : 0)),
            turretCooldownMult: Math.max(0.55, 1 - level * 0.07 - bond * 0.03 - (affinity ? 0.08 : 0)),
            turretSuspicionGainMult: Math.max(0.5, 1 - bond * 0.05 - (affinity ? 0.1 : 0)),
            turretPlacementFavor: level >= 2 || bond >= 3 || affinity
        };
    }

    return { campId, verb: 'none' };
}

export function mergeCampVerbEffects(campRecords = [], playerType = 'SCOUT') {
    const merged = neutralRuntimeEffects();
    for (const record of Array.isArray(campRecords) ? campRecords : []) {
        const effects = getCampVerbEffects(record, playerType);
        if (effects.radar) {
            merged.radar.rangeMult = Math.max(merged.radar.rangeMult, effects.radar.rangeMult ?? 1);
            merged.radar.cooldownMult = Math.min(merged.radar.cooldownMult, effects.radar.cooldownMult ?? 1);
            merged.radar.compassHoldSeconds = Math.max(merged.radar.compassHoldSeconds, effects.radar.compassHoldSeconds ?? 0);
        }
        if (Number.isFinite(effects.humanityDecayMultiplier)) {
            merged.humanityDecayMultiplier = Math.min(merged.humanityDecayMultiplier, effects.humanityDecayMultiplier);
        }
        merged.medkitInventory += Math.max(0, Math.floor(effects.medkitInventory ?? 0));
        merged.ammoReserve += Math.max(0, Math.floor(effects.ammoReserve ?? 0));
        if (Number.isFinite(effects.turretCooldownMult)) {
            merged.turretCooldownMult = Math.min(merged.turretCooldownMult, effects.turretCooldownMult);
        }
        if (Number.isFinite(effects.turretSuspicionGainMult)) {
            merged.turretSuspicionGainMult = Math.min(merged.turretSuspicionGainMult, effects.turretSuspicionGainMult);
        }
        merged.turretPlacementFavor = merged.turretPlacementFavor || Boolean(effects.turretPlacementFavor);
    }
    return merged;
}

export function getAct2ClassPerks(playerType = 'SCOUT') {
    const key = String(playerType ?? '').trim().toUpperCase();
    if (key === 'SCOUT') {
        return {
            classType: 'SCOUT',
            turretDetectionRadiusMult: 0.72,
            turretSuspicionGainMult: 0.75,
            turretConeAngleMult: 0.75,
            shockGuardCharges: 0,
            canReprogramTurrets: false
        };
    }
    if (key === 'TANK') {
        return {
            classType: 'TANK',
            turretDetectionRadiusMult: 1,
            turretSuspicionGainMult: 1,
            turretConeAngleMult: 1,
            shockGuardCharges: 1,
            canReprogramTurrets: false
        };
    }
    return {
        classType: 'ENGINEER',
        turretDetectionRadiusMult: 1,
        turretSuspicionGainMult: 1,
        turretConeAngleMult: 1,
        shockGuardCharges: 0,
        canReprogramTurrets: true
    };
}

export function canApplyTrade(trade, bankState) {
    if (!trade || !bankState) return false;
    for (const [key, amt] of Object.entries(trade.give)) {
        if (key === 'shells') {
            if ((bankState.shells ?? 0) < amt) return false;
        } else {
            if ((bankState[key] ?? 0) < amt) return false;
        }
    }
    return true;
}

export function applyTrade(trade, bankManager) {
    if (!trade || !bankManager) return false;
    const state = bankManager.getState();
    if (!canApplyTrade(trade, state)) return false;

    // Deduct
    for (const [key, amt] of Object.entries(trade.give)) {
        if (key === 'shells') {
            bankManager.spendShells(amt);
        } else {
            bankManager.state[key] -= amt;
        }
    }
    // Add
    for (const [key, amt] of Object.entries(trade.receive)) {
        if (key === 'shells') {
            bankManager.addShells(amt);
        } else {
            bankManager.state[key] = (bankManager.state[key] ?? 0) + amt;
        }
    }
    bankManager.save();
    return true;
}
