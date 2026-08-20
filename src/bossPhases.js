// ── Boss phase framework ──────────────────────────────────────
// The teardown's verdict on bosses was "HP walls with one pattern." This is
// the cure: a pure, data-driven phase machine. A boss definition declares
// phases by HP threshold; each phase carries attack cadences, add waves, and
// weakpoint windows (the only times the boss takes full damage — decisions
// instead of sponge). The runtime (threeGame) owns sprites, projectiles, and
// spawning; this module owns WHEN things happen and never touches THREE.
//
// First consumer: the queen fight (Sector Zero). The three biome bosses
// migrate onto this in a later pass (wave-4 Codex lane note).

// def shape:
// {
//   key: 'queen',
//   maxHp: 120,
//   armoredDamageMult: 0.25,     // damage taken outside weakpoint windows
//   phases: [{
//     key: 'brood',              // phase name (drives copy + telegraphs)
//     until: 0.66,               // active while hpFrac > until
//     attackCooldown: 4.5,       // seconds between attack events
//     attack: 'spore_lob',       // runtime interprets attack keys
//     addWave: { every: 9, type: 'alien_proto_crawler', count: 2, max: 4 },
//     weakpoint: { every: 11, duration: 3.5 }
//   }, ...]
// }

export function createBossFight(def) {
    if (!def || !Array.isArray(def.phases) || def.phases.length === 0) return null;
    return {
        def,
        hp: def.maxHp,
        maxHp: def.maxHp,
        phaseIndex: 0,
        elapsed: 0,
        attackTimer: def.phases[0].attackCooldown ?? 4,
        addTimer: def.phases[0].addWave?.every ?? Infinity,
        weakpointTimer: def.phases[0].weakpoint?.every ?? Infinity,
        weakpointOpenFor: 0,
        defeated: false
    };
}

export function currentPhase(fight) {
    return fight.def.phases[fight.phaseIndex];
}

export function isWeakpointOpen(fight) {
    return fight.weakpointOpenFor > 0;
}

// Apply player damage. Outside a weakpoint window the boss is armored
// (armoredDamageMult). Returns the damage actually dealt.
//
// Damage is always a whole number: armor/weakpoint multipliers produce
// fractional values (e.g. 1 base * 0.25 armor = 0.25) that must not leak
// into fight.hp or the on-screen damage pip. Any positive raw amount still
// deals at least 1 — armor chips the boss, it doesn't zero the hit out.
export function applyBossDamage(fight, amount = 0) {
    if (fight.defeated || amount <= 0) return 0;
    const mult = isWeakpointOpen(fight) ? 1 : (fight.def.armoredDamageMult ?? 1);
    const raw = amount * mult;
    const dealt = raw > 0 ? Math.max(1, Math.round(raw)) : 0;
    fight.hp = Math.max(0, fight.hp - dealt);
    if (fight.hp <= 0) fight.defeated = true;
    return dealt;
}

function phaseIndexForHp(def, hpFrac) {
    for (let i = 0; i < def.phases.length; i += 1) {
        const until = def.phases[i].until ?? 0;
        if (hpFrac > until) return i;
    }
    return def.phases.length - 1;
}

// Advance timers by delta. Returns an ordered list of events for the runtime:
//   { type: 'phase',            phase }        — phase transition (telegraph it)
//   { type: 'attack',           attack, phase }
//   { type: 'adds',             addType, count, phase }
//   { type: 'weakpoint-open',   duration, phase }
//   { type: 'weakpoint-close',  phase }
//   { type: 'defeated' }
export function tickBossFight(fight, delta, { activeAdds = 0 } = {}) {
    const events = [];
    if (fight.defeated) {
        if (!fight._defeatEmitted) {
            fight._defeatEmitted = true;
            events.push({ type: 'defeated' });
        }
        return events;
    }

    fight.elapsed += delta;

    // Phase transitions come from HP, not time — the player drives the fight.
    const nextIndex = phaseIndexForHp(fight.def, fight.hp / fight.maxHp);
    if (nextIndex !== fight.phaseIndex) {
        fight.phaseIndex = nextIndex;
        const phase = currentPhase(fight);
        fight.attackTimer = phase.attackCooldown ?? 4;
        fight.addTimer = phase.addWave?.every ?? Infinity;
        fight.weakpointTimer = phase.weakpoint?.every ?? Infinity;
        // A phase change slams any open window shut: new stance, new armor.
        if (fight.weakpointOpenFor > 0) {
            fight.weakpointOpenFor = 0;
            events.push({ type: 'weakpoint-close', phase: phase.key });
        }
        events.push({ type: 'phase', phase: phase.key });
    }

    const phase = currentPhase(fight);

    if (fight.weakpointOpenFor > 0) {
        fight.weakpointOpenFor -= delta;
        if (fight.weakpointOpenFor <= 0) {
            fight.weakpointOpenFor = 0;
            events.push({ type: 'weakpoint-close', phase: phase.key });
        }
    } else if (phase.weakpoint) {
        fight.weakpointTimer -= delta;
        if (fight.weakpointTimer <= 0) {
            fight.weakpointTimer = phase.weakpoint.every;
            fight.weakpointOpenFor = phase.weakpoint.duration;
            events.push({ type: 'weakpoint-open', duration: phase.weakpoint.duration, phase: phase.key });
        }
    }

    fight.attackTimer -= delta;
    if (fight.attackTimer <= 0) {
        fight.attackTimer = phase.attackCooldown ?? 4;
        events.push({ type: 'attack', attack: phase.attack, phase: phase.key });
    }

    if (phase.addWave) {
        fight.addTimer -= delta;
        if (fight.addTimer <= 0) {
            fight.addTimer = phase.addWave.every;
            const room = Math.max(0, (phase.addWave.max ?? Infinity) - activeAdds);
            const count = Math.min(phase.addWave.count ?? 1, room);
            if (count > 0) {
                events.push({ type: 'adds', addType: phase.addWave.type, count, phase: phase.key });
            }
        }
    }

    return events;
}

// ── The Queen (Sector Zero) ───────────────────────────────────
// Fought only on the defiance path, at the cave the player crawled out of.
// Armored except during VENT windows; each phase escalates the brood.
export const QUEEN_FIGHT_DEF = Object.freeze({
    key: 'queen',
    maxHp: 120,
    armoredDamageMult: 0.25,
    phases: [
        Object.freeze({
            key: 'brood',
            until: 0.66,
            attackCooldown: 4.5,
            attack: 'spore_lob',
            addWave: Object.freeze({ every: 9, type: 'alien_proto_crawler', count: 2, max: 4 }),
            weakpoint: Object.freeze({ every: 11, duration: 3.5 })
        }),
        Object.freeze({
            key: 'fury',
            until: 0.33,
            attackCooldown: 3.2,
            attack: 'shockwave_slam',
            addWave: Object.freeze({ every: 8, type: 'alien_proto_spitter', count: 2, max: 4 }),
            weakpoint: Object.freeze({ every: 9, duration: 3.0 })
        }),
        Object.freeze({
            key: 'desperation',
            until: 0,
            attackCooldown: 2.4,
            attack: 'spore_lob',
            addWave: Object.freeze({ every: 7, type: 'alien_proto_crawler', count: 3, max: 6 }),
            weakpoint: Object.freeze({ every: 7, duration: 4.0 })
        })
    ]
});

export const QUEEN_PHASE_LINES = Object.freeze({
    brood: 'QUEEN: YOU RAISE A DRILL TO YOUR OWN MOTHER.',
    fury: 'QUEEN: I CARRIED YOU. I CARRIED ALL OF YOU.',
    desperation: 'QUEEN: THE COLD BOX COULD NOT HOLD ME. YOU WILL NOT EITHER.'
});

// ── The BIO-biome sporesnail world boss ───────────────────────
// Sprint 22 B1 (docs/sprint-22-systems-breakdown/07-engineering-combat-boss-phases.md):
// the first non-Queen boss converted onto this framework, chosen from real
// data (scripts/combat-encounter-report.js) rather than a guess -- of the
// non-Queen bosses, this one has the highest HP by a wide margin, the
// longest idealized time-to-kill, and its only mechanic (spawning two
// passive minions on a flat cooldown) deals zero direct damage, so an
// unusually long fight never directly threatens the player.
//
// Deliberately NOT a Queen clone (docs/sprint-22-systems-breakdown/
// 07-engineering-combat-boss-phases.md: "Do not copy the Queen definition
// wholesale"): two phases, not three, and armor is kept much gentler
// (0.6 vs. the Queen's 0.25) specifically because that same doc names
// "armor making low-damage classes ineffective" as a regression risk this
// pass has no human playtest to justify overriding. Phase one matches the
// boss's pre-existing unphased cadence (6.5s / 2 adds) exactly, so the
// first half of the fight doesn't change feel at all; phase two (at or
// below 45% hp) is the only new escalation: faster adds and a weak-point
// window, giving the second half of an otherwise flat, long fight some
// variety instead of repeating phase one to the end.
//
// This boss has no attack of its own (see above), so 'attack' events carry
// nothing runtime-side interprets -- attackCooldown still has to be set for
// tickBossFight's internal timers, so it's aligned to each phase's addWave
// cadence and the runtime side simply ignores the 'attack' event type for
// this fight (see threeGame.js's handleSporesnailFightEvent).
export const SPORESNAIL_FIGHT_DEF = Object.freeze({
    key: 'sporesnail',
    maxHp: 75,
    armoredDamageMult: 0.6,
    phases: [
        Object.freeze({
            key: 'hive-mind',
            until: 0.45,
            attackCooldown: 6.5,
            attack: null,
            addWave: Object.freeze({ every: 6.5, type: 'sporesnail', count: 2, max: 4 })
        }),
        Object.freeze({
            key: 'bloom-frenzy',
            until: 0,
            attackCooldown: 4.5,
            attack: null,
            addWave: Object.freeze({ every: 4.5, type: 'sporesnail', count: 3, max: 6 }),
            weakpoint: Object.freeze({ every: 9, duration: 3.5 })
        })
    ]
});

// ── Ordinary enemy stagger/armor/weakpoint grammar (Sprint 28 Lane C) ─
// Extends the boss armor/weakpoint grammar to ordinary enemies with a
// lighter posture/stagger mechanic. Sustained damage breaks poise to trigger
// an exposed weakpoint window where the enemy is incapacitated and takes
// increased damage.
//
// Def shape:
// {
//   type: 'cryosnail',
//   armoredDamageMult: 0.5,     // damage taken while armor is intact (default 1)
//   staggerThreshold: 2,        // raw damage accumulated to trigger stagger
//   staggerDuration: 2.5,       // seconds the weakpoint window stays open
//   weakpointDamageMult: 1.5,   // bonus multiplier during stagger window
//   staggerColor: 0xffe066      // weakpoint highlight tint (golden)
// }

export function createEnemyStaggerState(def) {
    if (!def) return null;
    return {
        def,
        poise: 0,
        staggered: false,
        staggerTimer: 0,
        defeated: false
    };
}

export function isStaggered(state) {
    return Boolean(state && state.staggered && state.staggerTimer > 0);
}

// Apply player damage against an enemy with stagger/armor state.
// Outside stagger windows, damage is reduced by armoredDamageMult and
// accumulates poise towards staggerThreshold.
// When poise reaches or exceeds staggerThreshold, the enemy enters a
// staggered weakpoint state for staggerDuration and takes weakpointDamageMult.
// Returns an object: { dealt: number, triggeredStagger: boolean, isWeakpoint: boolean }
export function applyStaggerDamage(state, amount = 0) {
    if (!state || amount <= 0 || state.defeated) {
        return { dealt: 0, triggeredStagger: false, isWeakpoint: false };
    }
    const def = state.def;
    const staggered = isStaggered(state);

    if (staggered) {
        const mult = def.weakpointDamageMult ?? 1.5;
        const raw = amount * mult;
        const dealt = raw > 0 ? Math.max(1, Math.round(raw)) : 0;
        return { dealt, triggeredStagger: false, isWeakpoint: true };
    }

    // Armored state
    const mult = def.armoredDamageMult ?? 1.0;
    const raw = amount * mult;
    const dealt = raw > 0 ? Math.max(1, Math.round(raw)) : 0;

    state.poise = (state.poise || 0) + amount;
    let triggeredStagger = false;
    if (state.poise >= (def.staggerThreshold ?? 2)) {
        state.staggered = true;
        state.staggerTimer = def.staggerDuration ?? 2.0;
        state.poise = 0;
        triggeredStagger = true;
    }

    return { dealt, triggeredStagger, isWeakpoint: false };
}

// Advance stagger timer by delta. Returns list of events:
//   { type: 'stagger-end' }
export function tickStaggerState(state, delta) {
    if (!state) return [];
    const events = [];
    if (state.staggered) {
        state.staggerTimer -= delta;
        if (state.staggerTimer <= 0) {
            state.staggered = false;
            state.staggerTimer = 0;
            state.poise = 0;
            events.push({ type: 'stagger-end' });
        }
    }
    return events;
}

export const CRYOSNAIL_STAGGER_DEF = Object.freeze({
    type: 'cryosnail',
    armoredDamageMult: 0.5,
    staggerThreshold: 2,
    staggerDuration: 2.5,
    weakpointDamageMult: 1.5,
    staggerColor: 0xffe066
});

export const BIO_CHARGER_STAGGER_DEF = Object.freeze({
    type: 'bio_charger',
    armoredDamageMult: 0.6,
    staggerThreshold: 3,
    staggerDuration: 2.0,
    weakpointDamageMult: 1.5,
    staggerColor: 0xffe066
});

export const SENTINEL_STAGGER_DEF = Object.freeze({
    type: 'sentinel',
    armoredDamageMult: 0.5,
    staggerThreshold: 2,
    staggerDuration: 3.0,
    weakpointDamageMult: 1.5,
    staggerColor: 0xffe066
});

export const ENEMY_STAGGER_DEFS = Object.freeze({
    cryosnail: CRYOSNAIL_STAGGER_DEF,
    bio_charger: BIO_CHARGER_STAGGER_DEF,
    sentinel: SENTINEL_STAGGER_DEF
});
