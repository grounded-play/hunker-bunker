/**
 * The fatigue ladder: what pushing on without sleep costs, and what it buys.
 *
 * Keyed to EXPEDITIONS SINCE SLEEP, not to seconds elapsed inside a run. The
 * clock in this game only moves when the player chooses to sleep (see
 * dayCycle.js), so fatigue is the counterweight: resting costs a day, and days
 * are what story deadlines are made of, while not resting costs the body.
 * A within-run stamina bar could not express that trade -- it resets every run,
 * and "never slept" would be unreachable.
 *
 *   RESTED -> ALERT -> STRAINED -> RAGGED -> LONG DARK
 *      ^                              |
 *      +---- sleep clears the ladder --+ but sleeping from RAGGED or worse
 *            leaves a scar that outlives the rest.
 *
 * Every stage past baseline pays for its penalty with an upside, so staying
 * awake is a gamble rather than pure self-harm, and fatigue reads as one more
 * lever in the run strategy instead of the only one.
 *
 * Pure module: no DOM, no Three.js, no storage. The caller owns persistence and
 * presentation -- same contract as dayCycle.js, and the reason both are
 * unit-testable. Modifier keys deliberately match the loadout modifier bus
 * (src/loadout.js) so fatigue composes with equipment instead of special-casing.
 */

export const FATIGUE_VERSION = 1;

/** Storage key. Separate from hb_day_cycle: resting and scarring are different facts. */
export const FATIGUE_STATE_KEY = 'hb_fatigue';

const MAX_EXPEDITIONS_TRACKED = 99;
const MAX_SCAR_SEVERITY = 3;

/**
 * The ladder. `minExpeditions` is the number of expeditions since the last
 * sleep at which the stage begins; the last entry covers everything beyond.
 */
export const FATIGUE_STAGES = Object.freeze([
    Object.freeze({
        id: 'RESTED',
        minExpeditions: 0,
        label: 'RESTED',
        blurb: 'Slept. Clear-headed.',
        modifiers: Object.freeze({ healingMultiplier: 1.25, oxygenDrainMultiplier: 0.9 })
    }),
    Object.freeze({
        id: 'ALERT',
        minExpeditions: 1,
        label: 'ALERT',
        blurb: 'One expedition deep. Baseline.',
        modifiers: Object.freeze({})
    }),
    Object.freeze({
        id: 'STRAINED',
        minExpeditions: 2,
        label: 'STRAINED',
        blurb: 'Hands not quite steady. Working harder for the same haul.',
        modifiers: Object.freeze({
            healingMultiplier: 0.85,
            swayMultiplier: 1.15,
            salvageValueMultiplier: 1.1
        })
    }),
    Object.freeze({
        id: 'RAGGED',
        minExpeditions: 3,
        label: 'RAGGED',
        blurb: 'Running on reserves. Seeing more than you should.',
        modifiers: Object.freeze({
            healingMultiplier: 0.75,
            moveSpeedMultiplier: 0.92,
            oxygenDrainMultiplier: 1.12,
            swayMultiplier: 1.3,
            relicRarityTierBonus: 1,
            scrapMagnetRadiusBonus: 1
        })
    }),
    Object.freeze({
        id: 'LONG_DARK',
        minExpeditions: 4,
        label: 'THE LONG DARK',
        blurb: 'Past exhaustion. The hive reads you as something already dead.',
        modifiers: Object.freeze({
            healingMultiplier: 0.6,
            moveSpeedMultiplier: 0.88,
            oxygenDrainMultiplier: 1.2,
            maxHealthBonus: -1,
            swayMultiplier: 1.5,
            relicRarityTierBonus: 2,
            salvageValueMultiplier: 1.25,
            hiddenRoomDetectionRange: 3
        })
    })
]);

/** The stage at which sleeping starts leaving scars. */
const SCAR_THRESHOLD_STAGE = 'RAGGED';

/**
 * Scars persist for the playthrough. Treatment walks severity down one tier and
 * stops at 1: a treated scar is quieter, never absent. BLUNTED is the one that
 * cannot be treated at all -- the tell that a campaign has been run into the
 * ground, and the reason the other three are worth treating early.
 */
export const FATIGUE_SCARS = Object.freeze([
    Object.freeze({
        id: 'TREMOR',
        label: 'TREMOR',
        blurb: 'The reticle never fully settles.',
        treatable: true,
        perSeverity: Object.freeze({ swayMultiplier: 1.12 })
    }),
    Object.freeze({
        id: 'NIGHT_TERRORS',
        label: 'NIGHT TERRORS',
        blurb: 'Rest restores less than it should.',
        treatable: true,
        perSeverity: Object.freeze({ healingMultiplier: 0.94 })
    }),
    Object.freeze({
        id: 'HYPERVIGILANCE',
        label: 'HYPERVIGILANCE',
        blurb: 'You see everything. You cannot stand still.',
        treatable: true,
        perSeverity: Object.freeze({ healingMultiplier: 0.9, hiddenRoomDetectionRange: 2 })
    }),
    Object.freeze({
        id: 'BLUNTED',
        label: 'BLUNTED',
        blurb: 'Nothing lands the way it used to. Nothing frightens you either.',
        treatable: false,
        perSeverity: Object.freeze({ healingMultiplier: 0.88, oxygenDrainMultiplier: 1.05 })
    })
]);

const SCAR_BY_ID = new Map(FATIGUE_SCARS.map((scar) => [scar.id, scar]));

// Order scars are acquired in, so a campaign degrades legibly rather than
// handing out a random condition the player cannot plan around.
const SCAR_ORDER = Object.freeze(['TREMOR', 'HYPERVIGILANCE', 'NIGHT_TERRORS', 'BLUNTED']);

function clampInt(value, min, max, fallback = min) {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

export function createFatigueState() {
    return {
        version: FATIGUE_VERSION,
        expeditionsSinceSleep: 0,
        scars: []
    };
}

export function normalizeFatigueState(raw) {
    const base = createFatigueState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

    const scars = [];
    const seen = new Set();
    for (const entry of Array.isArray(raw.scars) ? raw.scars : []) {
        const id = entry?.id;
        // Unknown ids are dropped: a renamed or removed scar would otherwise
        // linger in a save forever and apply modifiers nothing can explain.
        if (!SCAR_BY_ID.has(id) || seen.has(id)) continue;
        seen.add(id);
        scars.push({ id, severity: clampInt(entry.severity, 1, MAX_SCAR_SEVERITY, 1) });
    }

    return {
        ...base,
        expeditionsSinceSleep: clampInt(raw.expeditionsSinceSleep, 0, MAX_EXPEDITIONS_TRACKED, 0),
        scars
    };
}

export function getFatigueStage(state) {
    const count = normalizeFatigueState(state).expeditionsSinceSleep;
    let stage = FATIGUE_STAGES[0];
    for (const candidate of FATIGUE_STAGES) {
        if (count >= candidate.minExpeditions) stage = candidate;
    }
    return stage;
}

/**
 * Composed modifiers for the current stage plus every scar. Multipliers
 * multiply and bonuses add, matching how src/loadout.js composes equipment, so
 * a caller can merge this into the same bus without a second code path.
 */
export function fatigueModifiers(state) {
    const normalized = normalizeFatigueState(state);
    const out = {
        healingMultiplier: 1,
        moveSpeedMultiplier: 1,
        oxygenDrainMultiplier: 1,
        salvageValueMultiplier: 1,
        swayMultiplier: 1,
        maxHealthBonus: 0,
        relicRarityTierBonus: 0,
        scrapMagnetRadiusBonus: 0,
        hiddenRoomDetectionRange: 0
    };

    const apply = (source, times = 1) => {
        for (const [key, value] of Object.entries(source ?? {})) {
            if (!(key in out)) continue;
            if (key.endsWith('Multiplier')) out[key] *= value ** times;
            else out[key] += value * times;
        }
    };

    apply(getFatigueStage(normalized).modifiers);
    for (const scar of normalized.scars) {
        apply(SCAR_BY_ID.get(scar.id)?.perSeverity, scar.severity);
    }

    // Round the float drift out of repeated multiplication so UI and tests see
    // stable numbers rather than 0.7499999999999999.
    for (const key of Object.keys(out)) {
        out[key] = Math.round(out[key] * 1000) / 1000;
    }
    return out;
}

/**
 * One expedition ended. Called for extraction AND for death: dying is not rest,
 * so it advances the ladder. It deliberately does not advance the campaign day
 * -- only sleeping does that.
 */
export function recordExpedition(state) {
    const normalized = normalizeFatigueState(state);
    return {
        ...normalized,
        expeditionsSinceSleep: Math.min(MAX_EXPEDITIONS_TRACKED, normalized.expeditionsSinceSleep + 1)
    };
}

function nextScarFor(scars) {
    const bySeverity = new Map(scars.map((scar) => [scar.id, scar.severity]));
    // Take the first unacquired scar in order; once all are held, deepen the
    // earliest one that can still get worse.
    for (const id of SCAR_ORDER) {
        if (!bySeverity.has(id)) return id;
    }
    for (const id of SCAR_ORDER) {
        if ((bySeverity.get(id) ?? MAX_SCAR_SEVERITY) < MAX_SCAR_SEVERITY) return id;
    }
    return null;
}

/**
 * Sleep. Clears the wake ladder; if the player slept from RAGGED or worse, it
 * also leaves (or deepens) a scar. Returns the scar id gained so the caller can
 * tell the player what last night cost them.
 */
export function restoreOnSleep(state) {
    const normalized = normalizeFatigueState(state);
    const stageIndex = FATIGUE_STAGES.indexOf(getFatigueStage(normalized));
    const thresholdIndex = FATIGUE_STAGES.findIndex((stage) => stage.id === SCAR_THRESHOLD_STAGE);
    const scarred = stageIndex >= thresholdIndex;

    let scars = normalized.scars.map((scar) => ({ ...scar }));
    let gainedScar = null;
    if (scarred) {
        const id = nextScarFor(scars);
        if (id) {
            const existing = scars.find((scar) => scar.id === id);
            if (existing) existing.severity = Math.min(MAX_SCAR_SEVERITY, existing.severity + 1);
            else scars.push({ id, severity: 1 });
            gainedScar = id;
        }
    }

    return {
        state: { ...normalized, expeditionsSinceSleep: 0, scars },
        gainedScar
    };
}

/**
 * Treat a scar. Lowers severity by one tier with a floor of 1 -- treatment
 * quiets a scar, it never removes it -- and refuses outright on the untreatable
 * one.
 */
export function treatScar(state, scarId) {
    const normalized = normalizeFatigueState(state);
    const definition = SCAR_BY_ID.get(scarId);
    const held = normalized.scars.find((scar) => scar.id === scarId);
    if (!definition || !held || definition.treatable === false || held.severity <= 1) {
        return { state: normalized, treated: false };
    }
    return {
        state: {
            ...normalized,
            scars: normalized.scars.map((scar) => (
                scar.id === scarId ? { ...scar, severity: scar.severity - 1 } : { ...scar }
            ))
        },
        treated: true
    };
}

/**
 * Merge fatigue into the loadout modifier bus so every downstream read of
 * `loadoutMods.X` picks fatigue up through the existing code path rather than a
 * parallel one.
 *
 * `maxHealthBonus` is deliberately NOT merged. The consumer clamps that key with
 * Math.max(0, ...) because equipment only ever grants hearts; folding a negative
 * in there would silently vanish whenever the player carries no health mod. The
 * caller applies the heart penalty explicitly, with a floor, at the max-HP site.
 */
export const FATIGUE_BUS_EXCLUDED_KEYS = Object.freeze(['maxHealthBonus']);

export function composeFatigueIntoLoadoutMods(baseMods, state) {
    const fatigue = fatigueModifiers(state);
    const merged = { ...(baseMods ?? {}) };
    for (const [key, value] of Object.entries(fatigue)) {
        if (FATIGUE_BUS_EXCLUDED_KEYS.includes(key)) continue;
        if (key.endsWith('Multiplier')) merged[key] = (Number(merged[key]) || 1) * value;
        else merged[key] = (Number(merged[key]) || 0) + value;
    }
    return merged;
}

/** The heart penalty the bus cannot carry. Never positive. */
export function fatigueMaxHealthPenalty(state) {
    return Math.min(0, fatigueModifiers(state).maxHealthBonus);
}

/**
 * What sprinting costs at this stage.
 *
 * Sprint is never taken away (design doc §2.4): deleting a core verb for most
 * of a run reads as a broken build, while pricing it leaves the player holding
 * the decision. Exhaustion therefore makes the same sprint burn more oxygen and
 * carry slightly less speed -- and `speedBonusScale` scales only the BONUS, so
 * a sprinting operator is never slower than one who is walking.
 */
export function sprintPricing(state) {
    const stage = getFatigueStage(state).id;
    switch (stage) {
        case 'STRAINED': return { o2DrainMultiplier: 1.15, speedBonusScale: 0.97 };
        case 'RAGGED': return { o2DrainMultiplier: 1.35, speedBonusScale: 0.92 };
        case 'LONG_DARK': return { o2DrainMultiplier: 1.6, speedBonusScale: 0.85 };
        default: return { o2DrainMultiplier: 1, speedBonusScale: 1 };
    }
}

/**
 * The operator's standing condition, for the Homebase dossier line.
 *
 * Scars only -- not the wake ladder. The ladder is a property of the current
 * expedition and is already on the HUD; this line is what the operator carries
 * between runs, which is the part a player plans around.
 *
 * Returns null when there is nothing to report, so the caller can fall back to
 * its own localized "nominal" string rather than this module inventing copy.
 */
export function describeScars(state) {
    const scars = normalizeFatigueState(state).scars;
    if (scars.length === 0) return null;
    return scars
        .map((scar) => {
            const label = SCAR_BY_ID.get(scar.id)?.label ?? scar.id;
            return scar.severity > 1 ? `${label} x${scar.severity}` : label;
        })
        .join(' / ');
}

/** Shells a camp medic charges per tier of treatment. */
export const SCAR_TREATMENT_COST = 45;

/**
 * The scar a medic would work on next, or null when there is nothing to do.
 *
 * Picks the worst treatable scar, so a player who can only afford one session
 * gets the one that is hurting most. BLUNTED is never returned -- it is the
 * untreatable end state, and offering it would promise a cure that does not
 * exist.
 */
export function nextTreatableScar(state) {
    const scars = normalizeFatigueState(state).scars
        .filter((scar) => SCAR_BY_ID.get(scar.id)?.treatable !== false && scar.severity > 1)
        .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
    return scars[0] ?? null;
}
