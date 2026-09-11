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

// One reference value per material keeps every camp and reputation state
// on the same side of the spread. Affinity improves quotes, never inverts them.
export const CAMP_RESOURCE_VALUES = Object.freeze({ tech: 30, coin: 8, med: 30 });

export function getCampTrades(campRecord, playerType) {
    const { id: campId, level, bond } = normalizeCampStats(campRecord);
    if (!Object.hasOwn(CAMP_AFFINITIES, campId)) return [];
    const favor = (level / 3 + bond / 5 + (hasCampAffinity(campId, playerType) ? 1 : 0)) / 3;
    const sellPrice = (resource) => Math.max(1, Math.floor(CAMP_RESOURCE_VALUES[resource] * (0.75 + 0.20 * favor)));
    const buyPrice = (resource) => Math.ceil(CAMP_RESOURCE_VALUES[resource] * (1.35 - 0.30 * favor));
    const sell = (id, label, resource) => ({ id, label, give: { [resource]: 1 }, receive: { shells: sellPrice(resource) } });
    const buy = (id, label, resource, quantity = 1) => ({ id, label, give: { shells: buyPrice(resource) * quantity }, receive: { [resource]: quantity } });
    if (campId === 'camp_meridian') return [
        sell('sell_tech', 'SELL TECH MODULE', 'tech'),
        buy('buy_coin', 'BUY 5 COIN', 'coin', 5)
    ];
    if (campId === 'camp_tallow') return [
        sell('sell_med', 'SELL BIO-VACCINE', 'med'),
        buy('buy_med', 'BUY STABILIZING MED', 'med')
    ];
    return [
        sell('sell_coin', 'SELL 1 COIN', 'coin'),
        buy('buy_tech', 'BUY SPARE TECH PART', 'tech')
    ];
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

// docs/faction-verb-matrix.md — one signature active verb per camp, on top
// of the passive getCampVerbEffects buff. Each carries the dimensions the
// master plan asks every faction verb to have: cost, cooldown, and a
// failure/exploit rule (see canActivateCampVerb / isCampVerbDegraded).
// Visual/audio feedback and the ending-consequence weighting from the
// design doc are not implemented here — this is the mechanical gate only.
export const CAMP_ACTIVE_VERBS = Object.freeze({
    camp_meridian: Object.freeze({
        id: 'route_intel',
        label: 'ROUTE INTEL',
        description: 'Reveal one ring\'s mission-blocker location and a shortest-path ping.',
        cost: Object.freeze({ tech: 1 }),
        cooldownSeconds: 0,
        oncePerRing: true
    }),
    camp_tallow: Object.freeze({
        id: 'triage',
        label: 'TRIAGE',
        description: 'Cure one stage of infection progress, or fully heal.',
        cost: Object.freeze({ med: 1 }),
        cooldownSeconds: 90
    }),
    camp_vesper: Object.freeze({
        id: 'field_resupply',
        label: 'FIELD RESUPPLY',
        description: 'Instant ammo-to-full plus one bonus turret charge.',
        cost: Object.freeze({ coin: 1 }),
        cooldownSeconds: 120,
        oncePerBossEncounter: true
    })
});

export function getCampActiveVerb(campId) {
    return CAMP_ACTIVE_VERBS[campId] ?? null;
}

/**
 * @param {string} campId
 * @param {Object} context
 * @param {Object} context.bankState
 * @param {number} [context.nowSeconds]
 * @param {number} [context.lastUsedAtSeconds] - when this camp's verb was last activated
 * @param {number} [context.ring] - current ring, for oncePerRing verbs
 * @param {Set<number>} [context.usedRings] - rings already pinged this run
 * @param {boolean} [context.bossEncounterActive]
 * @param {boolean} [context.usedThisBossEncounter]
 * @param {number} [context.humanityDecayMultiplier] - current passive value from getCampVerbEffects
 */
export function canActivateCampVerb(campId, context = {}) {
    const verb = getCampActiveVerb(campId);
    if (!verb) return { allowed: false, reason: 'no_verb_for_camp' };

    if (!canApplyTrade({ give: verb.cost, receive: {} }, context.bankState)) {
        return { allowed: false, reason: 'insufficient_resources' };
    }

    if (Number.isFinite(verb.cooldownSeconds) && verb.cooldownSeconds > 0
        && Number.isFinite(context.lastUsedAtSeconds) && Number.isFinite(context.nowSeconds)) {
        const remaining = verb.cooldownSeconds - (context.nowSeconds - context.lastUsedAtSeconds);
        if (remaining > 0) return { allowed: false, reason: 'on_cooldown', remainingSeconds: remaining };
    }

    if (verb.oncePerRing && context.usedRings?.has(context.ring)) {
        return { allowed: false, reason: 'ring_already_pinged' };
    }

    if (verb.oncePerBossEncounter && context.bossEncounterActive && context.usedThisBossEncounter) {
        return { allowed: false, reason: 'already_used_this_encounter' };
    }

    // Tallow: no free stacking once the passive stabilize_cover buff is
    // already at its own floor (getCampVerbEffects's 0.45 minimum).
    if (campId === 'camp_tallow' && (context.humanityDecayMultiplier ?? 1) <= 0.45) {
        return { allowed: false, reason: 'already_at_humanity_floor' };
    }

    return { allowed: true, reason: null };
}

// Meridian's failure/exploit rule: mechanically usable even if the camp has
// been robbed, but the result should read as untrustworthy intel rather
// than a hard block -- a robbed informant can still talk, just not well.
export function isCampVerbDegraded(campId, campStatus) {
    return campId === 'camp_meridian' && campStatus === 'robbed';
}

// docs/sprint-22-systems-breakdown/03-factions-and-hives.md — "select a
// minimal but unmistakable aftermath matrix" and give the player a single
// disposition + reason instead of raw suspicion/status/level numbers.
// Priority order matters: several of these signals can be true at once for
// the same camp record (e.g. status 'robbed' while also suspicion >= 50),
// and only the most narratively severe one should read to the player.
export const CAMP_AFTERMATH_FORTIFIED_LEVEL = 2;
const CAMP_AFTERMATH_LOCKDOWN_SUSPICION = 50;
const CAMP_STATUS_VALUES = Object.freeze(['alive', 'robbed', 'culled', 'recruited', 'turned']);

export const CAMP_AFTERMATH_DISPOSITIONS = Object.freeze([
    'culled',
    'turned',
    'outed',
    'robbed',
    'recruited',
    'fortified',
    'alive'
]);

const CAMP_AFTERMATH_LABELS = Object.freeze({
    culled: 'DESTROYED',
    turned: 'TURNED',
    outed: 'LOCKED DOWN',
    robbed: 'ROBBED',
    recruited: 'RECRUITED',
    fortified: 'FORTIFIED',
    alive: 'ALIVE'
});

const CAMP_AFTERMATH_REASONS = Object.freeze({
    culled: 'Nothing left standing here — you saw to that.',
    turned: 'Spore exposure finished the job. They answer to the Queen now.',
    outed: 'They know what you are carrying. Gates are shut, and they are watching.',
    robbed: 'You took from them once. They have not forgotten.',
    recruited: "They're hidden in your hold now, waiting on the launch.",
    fortified: 'Your shells built these walls — the camp can hold its ground.',
    alive: 'Untouched by you so far.'
});

function normalizeCampStatusValue(status) {
    return CAMP_STATUS_VALUES.includes(status) ? status : 'alive';
}

/**
 * Resolves the single player-facing "aftermath" disposition for a camp from
 * whatever combination of status/suspicion/level/knowsPlayerInfected the
 * record currently carries. Pure and read-only -- callers own applying the
 * result to rendering, audio, or interaction gates.
 */
export function getCampAftermathDisposition(campRecord = {}) {
    const status = normalizeCampStatusValue(campRecord.status);
    const level = Math.max(0, Math.min(3, Math.floor(Number(campRecord.level) || 0)));
    const suspicion = Math.max(0, Math.min(100, Math.floor(Number(campRecord.suspicion) || 0)));
    const knowsPlayerInfected = Boolean(campRecord.knowsPlayerInfected);

    if (status === 'culled') return 'culled';
    if (status === 'turned') return 'turned';
    if (knowsPlayerInfected || suspicion >= CAMP_AFTERMATH_LOCKDOWN_SUSPICION) return 'outed';
    if (status === 'robbed') return 'robbed';
    if (status === 'recruited') return 'recruited';
    if (level >= CAMP_AFTERMATH_FORTIFIED_LEVEL) return 'fortified';
    return 'alive';
}

export function getCampAftermathReason(disposition) {
    return CAMP_AFTERMATH_REASONS[disposition] ?? CAMP_AFTERMATH_REASONS.alive;
}

export function getCampAftermathSummary(campRecord = {}) {
    const disposition = getCampAftermathDisposition(campRecord);
    return {
        disposition,
        label: CAMP_AFTERMATH_LABELS[disposition] ?? CAMP_AFTERMATH_LABELS.alive,
        reason: getCampAftermathReason(disposition)
    };
}

function validTradeAmounts(amounts) {
    return amounts && typeof amounts === 'object' && !Array.isArray(amounts)
        && Object.entries(amounts).every(([key, amount]) =>
            ['tech', 'coin', 'med', 'ammo', 'shells'].includes(key)
            && Number.isSafeInteger(amount) && amount >= 0);
}

export function canApplyTrade(trade, bankState) {
    if (!trade || !bankState || !validTradeAmounts(trade.give) || !validTradeAmounts(trade.receive ?? {})) return false;
    return Object.entries(trade.give).every(([key, amount]) => (bankState[key] ?? 0) >= amount);
}

export function applyTrade(trade, bankManager) {
    if (!bankManager || !canApplyTrade(trade, bankManager.getState())) return false;
    if (typeof bankManager.exchange === 'function') {
        return bankManager.exchange(trade.give, trade.receive ?? {});
    }

    // Direct mutation fallback for test mocks and minimal bank managers
    for (const [key, amt] of Object.entries(trade.give)) {
        if (key === 'shells') {
            if (typeof bankManager.spendShells === 'function') {
                bankManager.spendShells(amt);
            } else if (bankManager.state) {
                bankManager.state.shells = (bankManager.state.shells ?? 0) - amt;
            }
        } else if (bankManager.state) {
            bankManager.state[key] = (bankManager.state[key] ?? 0) - amt;
        }
    }
    for (const [key, amt] of Object.entries(trade.receive ?? {})) {
        if (key === 'shells') {
            if (typeof bankManager.addShells === 'function') {
                bankManager.addShells(amt);
            } else if (bankManager.state) {
                bankManager.state.shells = (bankManager.state.shells ?? 0) + amt;
            }
        } else if (bankManager.state) {
            bankManager.state[key] = (bankManager.state[key] ?? 0) + amt;
        }
    }
    bankManager.save?.();
    return true;
}

