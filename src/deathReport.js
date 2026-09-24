// What the results screen says about a death (Invisible Essentials Phase 3,
// docs/planning/invisible-essentials-2026-09-24.md).
//
// The runtime already records why the operator died (the damage `reason`),
// where the black box fell and what it holds, and which run drops were
// equipped. None of that reached the player. This turns those facts into
// report lines: the cause, what the build did, what is waiting in the field,
// and the one next action most worth taking. Pure; the expedition report
// renders the lines.

// Hostiles by the `reason` string takeDamage receives from their attacks.
export const ENEMY_NAME_KEYS = Object.freeze({
    cybersnail: 'ui.death.enemy.cybersnail',
    cryosnail: 'ui.death.enemy.cryosnail',
    sporesnail: 'ui.death.enemy.sporesnail',
    sentinel: 'ui.death.enemy.sentinel',
    crawler: 'ui.death.enemy.crawler',
    alien_proto_crawler: 'ui.death.enemy.alien_proto_crawler',
    alien_proto_spitter: 'ui.death.enemy.alien_proto_spitter',
    mycelium_stalker: 'ui.death.enemy.mycelium_stalker',
    bio_charger: 'ui.death.enemy.bio_charger',
    spore_mortar: 'ui.death.enemy.spore_mortar',
    fungal_spore_vent: 'ui.death.enemy.fungal_spore_vent',
    boss_cybersnail: 'ui.death.enemy.boss_cybersnail',
    boss_cryosnail: 'ui.death.enemy.boss_cryosnail',
    boss_sporesnail: 'ui.death.enemy.boss_sporesnail',
    boss_corrupted_scout: 'ui.death.enemy.boss_corrupted_scout',
    boss_corrupted_tank: 'ui.death.enemy.boss_corrupted_tank',
    boss_corrupted_engineer: 'ui.death.enemy.boss_corrupted_engineer',
    boss_queen: 'ui.death.enemy.boss_queen'
});

export const DEATH_CAUSE_KEYS = Object.freeze({
    enemy: 'ui.death.cause.enemy',
    projectile: 'ui.death.cause.projectile',
    boss_attack: 'ui.death.cause.boss_attack',
    o2: 'ui.death.cause.o2',
    fall: 'ui.death.cause.fall',
    hazard: 'ui.death.cause.hazard',
    turret: 'ui.death.cause.turret',
    backlash: 'ui.death.cause.backlash',
    ship: 'ui.death.cause.ship',
    squad: 'ui.death.cause.squad',
    abort: 'ui.death.cause.abort',
    unknown: 'ui.death.cause.unknown'
});

// Non-hostile reasons, by what the player should take from them.
const REASON_CAUSES = Object.freeze({
    'enemy-projectile': 'projectile',
    'queen-shockwave': 'boss_attack',
    'ground-slam': 'boss_attack',
    'frost-shockwave': 'boss_attack',
    'o2-depletion': 'o2',
    'pit-fall': 'fall',
    fall: 'fall',
    'hazard-zone': 'hazard',
    poison: 'hazard',
    'camp-turret': 'turret',
    'queens-milk-backlash': 'backlash',
    'ship-destroyed': 'ship',
    'squad-wipe': 'squad',
    'mission-abort': 'abort'
});

/** The report line for why the operator died. */
export function describeDeathCause(reason) {
    const enemyKey = ENEMY_NAME_KEYS[reason];
    if (enemyKey) return { key: DEATH_CAUSE_KEYS.enemy, params: { enemyKey } };
    const cause = REASON_CAUSES[reason] ?? 'unknown';
    return { key: DEATH_CAUSE_KEYS[cause] };
}

export const BUILD_LINE_KEYS = Object.freeze({
    cryo_shatter: 'ui.death.build.cryo_shatter',
    bio_predator: 'ui.death.build.bio_predator',
    equipped: 'ui.death.build.equipped',
    none: 'ui.death.build.none'
});

/**
 * What the build did this deployment. A synergy that actually fired is the
 * headline (the one that fired most); otherwise the equipped components are
 * listed; otherwise the report says there were none.
 */
export function summarizeBuild({ equippedDropIds = [], telemetry = {} } = {}) {
    const shatter = telemetry.cryo_shatter ?? {};
    const predator = telemetry.bio_predator ?? {};
    const fired = [
        (shatter.activations ?? 0) > 0 && {
            activations: shatter.activations,
            line: { key: BUILD_LINE_KEYS.cryo_shatter, params: { count: shatter.activations, damage: Math.round(shatter.damage ?? 0) } }
        },
        (predator.activations ?? 0) > 0 && {
            activations: predator.activations,
            line: { key: BUILD_LINE_KEYS.bio_predator, params: { count: predator.activations, o2: Math.round(predator.o2 ?? 0), hearts: predator.hearts ?? 0 } }
        }
    ].filter(Boolean).sort((a, b) => b.activations - a.activations);
    if (fired.length) return fired[0].line;
    const ids = [...new Set(equippedDropIds.filter(Boolean))];
    if (ids.length) return { key: BUILD_LINE_KEYS.equipped, params: { dropKeys: ids.map((id) => `ui.relics.${id}.name`), dropIds: ids } };
    return { key: BUILD_LINE_KEYS.none };
}

export const FIELD_LINE_KEYS = Object.freeze({
    black_box: 'ui.death.field.black_box',
    black_box_empty: 'ui.death.field.black_box_empty'
});

const SALVAGE_ORDER = Object.freeze(['tech', 'coin', 'med']);

/** Salvage entries with something in them, in a fixed order. */
export function salvageParts(salvage = {}) {
    return SALVAGE_ORDER
        .map((resource) => ({ resource, amount: Math.max(0, Math.floor(Number(salvage[resource]) || 0)) }))
        .filter((part) => part.amount > 0);
}

/** What was dropped in the field, and how far from the ship it lies. */
export function describeFieldLoss(blackBox, shipPosition = null) {
    if (!blackBox) return null;
    const parts = salvageParts(blackBox.salvage);
    const meters = shipPosition && Number.isFinite(blackBox.x) && Number.isFinite(blackBox.z)
        ? Math.round(Math.hypot(blackBox.x - shipPosition.x, blackBox.z - shipPosition.z))
        : null;
    if (!parts.length) return { key: FIELD_LINE_KEYS.black_box_empty };
    return { key: FIELD_LINE_KEYS.black_box, params: { meters: meters ?? 0 }, parts };
}

export const NEXT_ACTION_KEYS = Object.freeze({
    recover: 'ui.death.next.recover_black_box',
    build: 'ui.death.next.build_goal',
    lead: 'ui.death.next.follow_lead',
    redeploy: 'ui.death.next.redeploy'
});

/**
 * The single next action most worth taking: salvage waiting in the field
 * first (it is lost if the next run dies too), then a ship goal that can be
 * built now, then a lead from this deployment, else simply redeploy.
 */
export function chooseNextAction({ fieldLoss = null, nextGoalAffordable = false, goalNameKey = null, leadLabelKey = null } = {}) {
    if (fieldLoss?.parts?.length) return { key: NEXT_ACTION_KEYS.recover, params: { meters: fieldLoss.params?.meters ?? 0 } };
    if (nextGoalAffordable && goalNameKey) return { key: NEXT_ACTION_KEYS.build, params: { goalKey: goalNameKey } };
    if (leadLabelKey) return { key: NEXT_ACTION_KEYS.lead, params: { labelKey: leadLabelKey } };
    return { key: NEXT_ACTION_KEYS.redeploy };
}
