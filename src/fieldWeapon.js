// The guaranteed introductory fabrication changes the next deployment's shots.
// Cosmetic finishes never select this profile or change these values.
export function getFieldWeaponProfile(id, fabricated = false) {
    if (id !== 'scatter_rep' || !fabricated) return null;
    return { id, label: 'SCATTER REPEATER', spreads: [-0.18, 0, 0.18],
        damageMultiplier: 0.5, lifetimeMultiplier: 0.55, cooldownMultiplier: 1.5 };
}
