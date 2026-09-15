const FIELD_WEAPON_PROFILES = Object.freeze({
    mk1_sidearm: Object.freeze({ label: 'MARK-I SIDEARM', spreads: [0], damageMultiplier: 1.1, lifetimeMultiplier: 0.9, cooldownMultiplier: 1.05 }),
    pulse_carbine: Object.freeze({ label: 'PULSE CARBINE', spreads: [0], damageMultiplier: 0.78, lifetimeMultiplier: 1.15, cooldownMultiplier: 0.68 }),
    scatter_rep: Object.freeze({ label: 'SCATTER REPEATER', spreads: [-0.18, 0, 0.18], damageMultiplier: 0.5, lifetimeMultiplier: 0.55, cooldownMultiplier: 1.5 }),
    rail_marksman: Object.freeze({ label: 'RAIL MARKSMAN', spreads: [0], damageMultiplier: 2.1, lifetimeMultiplier: 1.65, cooldownMultiplier: 2.0 }),
    neon_smg: Object.freeze({ label: 'NEON SMG', spreads: [-0.035, 0.035], damageMultiplier: 0.42, lifetimeMultiplier: 0.75, cooldownMultiplier: 0.48 }),
    cryo_lance: Object.freeze({ label: 'CRYO LANCE', spreads: [0], damageMultiplier: 1.25, lifetimeMultiplier: 1.45, cooldownMultiplier: 1.35 })
});

// Fabricated guns change actual projectile damage/range/cadence in the current
// run. Cosmetic finishes never select this profile or change these values.
export function getFieldWeaponProfile(id, fabricated = false) {
    const profile = FIELD_WEAPON_PROFILES[id];
    return fabricated && profile ? { id, ...profile } : null;
}
