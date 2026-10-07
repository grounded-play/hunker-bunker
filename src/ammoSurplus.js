// Session 2026-10-06 (solo, 27 min): half of all pickups are ammo, and most
// were collected at a full mag, so they were simply lost while tech and coin
// for the Foundry stayed scarce. Rounds that do not fit are salvaged as tech
// (the bank's scrap): one per four wasted rounds, at least one per pickup.
export const AMMO_ROUNDS_PER_SURPLUS_TECH = 4;

export function resolveAmmoPickup(current, amount, capacity) {
    const have = Math.max(0, Math.floor(Number(current) || 0));
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    const cap = Math.max(0, Math.floor(Number(capacity) || 0));
    const ammo = Math.min(cap, have + gained);
    const wasted = have + gained - ammo;
    const surplusTech = wasted > 0 ? Math.max(1, Math.round(wasted / AMMO_ROUNDS_PER_SURPLUS_TECH)) : 0;
    return { ammo, wasted, surplusTech };
}
