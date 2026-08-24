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
    alien_proto_crawler_A: { maxHp: 3, speed: 1.5 },
    alien_proto_spitter: { maxHp: 4, speed: 1.1 },
    sentinel_A: { maxHp: 4, speed: 1.6 },
    sentinel_B: { maxHp: 5, speed: 1.5 },
    boss_cybersnail: { maxHp: 15, speed: 1.5 },
    boss_cryosnail:  { maxHp: 40, speed: 1.1 },
    boss_sporesnail: { maxHp: 75, speed: 1.3 },
    boss_corrupted_scout: { maxHp: 14, speed: 1.65 },
    boss_corrupted_tank: { maxHp: 18, speed: 1.05 },
    boss_corrupted_engineer: { maxHp: 16, speed: 1.25 },
    fungal_spore_vent: { maxHp: 6, speed: 0.0 },
    mycelium_stalker: { maxHp: 5, speed: 2.2 },
    bio_charger: { maxHp: 8, speed: 2.5 },
    spore_mortar: { maxHp: 5, speed: 1.0 }
});

export const ALIEN_MUTATIONS = Object.freeze({
    SPORE_SNARE: { key: 'spore_snare', label: 'Volatile Spore-Snare', hpMult: 1.15, speedMult: 1.1 },
    ADAPTIVE_CARAPACE: { key: 'adaptive_carapace', label: 'Adaptive Cryo-Carapace', hpMult: 1.35, speedMult: 0.9 },
    TESLA_DRONE: { key: 'tesla_drone', label: 'Tesla Synapse Drone', hpMult: 1.2, speedMult: 1.25 }
});

// Returns { maxHp, speed } for a type, falling back to the provided base (the
// engine passes its live SNAIL_MAX_HP / SNAIL_MOVE_SPEED).
export function getEnemyStats(type, base = ENEMY_BASE, mutation = null) {
    const override = ENEMY_STATS[type];
    let maxHp = override?.maxHp ?? base.maxHp;
    let speed = override?.speed ?? base.speed;

    if (mutation && ALIEN_MUTATIONS[mutation]) {
        const mut = ALIEN_MUTATIONS[mutation];
        maxHp = Math.round(maxHp * mut.hpMult);
        speed *= mut.speedMult;
    }

    return { maxHp, speed };
}

export function rollAlienMutation(random = Math.random, depthTier = 0) {
    const chance = Math.min(0.8, 0.15 + depthTier * 0.15);
    if (random() > chance) return null;
    const keys = Object.keys(ALIEN_MUTATIONS);
    return keys[Math.floor(random() * keys.length)];
}
