// ── The Bunker Director (cohesion brain) ──────────────────────
// doc 11 §3.1/§4.A: Hunker Bunker already has every pressure INPUT (hp, O2,
// depth, time-since-threat) and every LEVER (spawn patrol, lights-out, corrupt
// compass, mercy salvage, taunt) — they just fired ad-hoc. This module routes
// them through one brain so the bunker *reacts* to the player's greed and
// struggle, turning "procedural generation" into "something is watching me."
//
// The decision is a pure, testable function; the class only adds cadence +
// per-action cooldowns. threeGame maps the returned action id onto its levers.

export const DIRECTOR_ACTIONS = Object.freeze(['patrol', 'lightsout', 'corrupt', 'mercy', 'taunt']);

const ACTION_COOLDOWNS = Object.freeze({
    patrol: 28,
    lightsout: 42,
    corrupt: 46,
    mercy: 70,
    taunt: 13
});

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Pure decision: given a run-state snapshot, what should the bunker do?
// Returns one of DIRECTOR_ACTIONS or 'none'. `random` is injectable for tests.
//
// snapshot: {
//   hpFrac, o2Frac, depth, inSafeField,
//   secondsSinceThreat, secondsElapsed, threatGap, patrolBias
// }
export function chooseDirectorAction(snapshot = {}, random = Math.random) {
    const {
        hpFrac = 1,
        depth = 0,
        inSafeField = false,
        secondsSinceThreat = 999,
        secondsElapsed = 0,
        threatGap = 16,
        patrolBias = false
    } = snapshot;

    // The base/O2 field is sanctuary — the bunker never harasses you there.
    if (inSafeField) return 'none';

    // Struggling (Left 4 Dead-style "ease"): never pile on, occasionally throw a bone.
    if (hpFrac <= 0.34) {
        return random() < 0.3 ? 'mercy' : 'none';
    }

    // Recently pressured → let the moment breathe (rare taunt only).
    if (secondsSinceThreat < threatGap) {
        return random() < 0.12 ? 'taunt' : 'none';
    }

    // Healthy + quiet → escalate with depth (greed) and run length.
    const escalation = clamp01(depth / 40) * 0.6 + clamp01(secondsElapsed / 240) * 0.4; // 0..1
    const r = random();
    const patrolP = 0.4 + 0.18 * escalation + (patrolBias ? 0.18 : 0);
    if (r < patrolP) return 'patrol';
    if (r < patrolP + 0.22) return 'taunt';
    return 'none';
}

export class BunkerDirector {
    constructor({ cadence = 16, threatGap = 16 } = {}) {
        this.baseCadence = cadence;
        this.threatGap = threatGap;
        this.reset();
    }

    reset() {
        this._sinceThreat = 999;   // start "quiet" so the first beat can fire after cadence
        this._sinceEval = 0;
        this._elapsed = 0;
        this._cooldowns = {};
    }

    // Call whenever the player is threatened (took damage, boss spawned) so the
    // director eases off right after combat.
    notifyThreat() {
        this._sinceThreat = 0;
    }

    // Advance time and, on the cadence boundary, maybe return an action to execute
    // (or null). `patrolBias` (from the patrol-surge run modifier) tightens cadence
    // and biases toward patrols.
    tick(dt = 0, snapshot = {}, random = Math.random) {
        this._sinceThreat += dt;
        this._sinceEval += dt;
        this._elapsed += dt;

        const cadence = snapshot.patrolBias ? this.baseCadence * 0.7 : this.baseCadence;
        if (this._sinceEval < cadence) return null;
        this._sinceEval = 0;

        const action = chooseDirectorAction({
            ...snapshot,
            secondsSinceThreat: this._sinceThreat,
            secondsElapsed: this._elapsed,
            threatGap: this.threatGap
        }, random);
        if (!action || action === 'none') return null;

        const cd = ACTION_COOLDOWNS[action] ?? 20;
        if (this._elapsed - (this._cooldowns[action] ?? -1e9) < cd) return null;
        this._cooldowns[action] = this._elapsed;

        // Hostile levers count as a threat so the director breathes afterward.
        if (action === 'patrol' || action === 'lightsout' || action === 'corrupt') {
            this._sinceThreat = 0;
        }
        return action;
    }
}
