// ── Enemy archetype stats (data) ──────────────────────────────
// doc 11 §3.4 content pipeline: lift the per-type HP/speed overrides out of
// threeGame's createScatterInstance into data. Behaviour-preserving — these are
// the exact values that were hardcoded. The base (snail) HP/speed stays sourced
// from threeGame's SNAIL_* constants and is passed in, so there's no drift.

export const ENEMY_BASE = Object.freeze({ maxHp: 2, speed: 1.2 });

export const ENEMY_STATS = Object.freeze({
    cryosnail:       { maxHp: 4,  speed: 0.9 },
    sporesnail:      { maxHp: 3,  speed: 1.4 },
    alien_proto_crawler: { maxHp: 3, speed: 1.5 },
    alien_proto_spitter: { maxHp: 4, speed: 1.1 },
    boss_cybersnail: { maxHp: 20, speed: 1.5 },
    boss_cryosnail:  { maxHp: 40, speed: 1.1 },
    boss_sporesnail: { maxHp: 75, speed: 1.3 },
    boss_corrupted_scout: { maxHp: 14, speed: 1.65 },
    boss_corrupted_tank: { maxHp: 18, speed: 1.05 },
    boss_corrupted_engineer: { maxHp: 16, speed: 1.25 }
});

// Returns { maxHp, speed } for a type, falling back to the provided base (the
// engine passes its live SNAIL_MAX_HP / SNAIL_MOVE_SPEED).
export function getEnemyStats(type, base = ENEMY_BASE) {
    const override = ENEMY_STATS[type];
    return {
        maxHp: override?.maxHp ?? base.maxHp,
        speed: override?.speed ?? base.speed
    };
}
