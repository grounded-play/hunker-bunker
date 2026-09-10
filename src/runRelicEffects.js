// Whole-heart armor keeps fractional protection as credit, not invisible rounding.
export function applyCarapaceProtection(damage, credit = 0, active = false) {
    const incoming = Math.max(0, Math.round(Number(damage) || 0));
    if (!active || incoming === 0) return { damage: incoming, credit, absorbed: 0 };
    const budget = Math.max(0, Math.min(0.999999, Number(credit) || 0)) + incoming * 0.3;
    const absorbed = Math.min(incoming, Math.floor(budget + 1e-9));
    return { damage: incoming - absorbed, credit: Math.max(0, budget - absorbed), absorbed };
}

export function isInBioSlime(position, scatter = [], puddles = []) {
    if (!position) return false;
    for (const sprite of scatter) {
        if (sprite.userData?.type !== 'scatter_slime_puddle' || !sprite.visible) continue;
        if (Math.abs(sprite.position.y - position.y) > 1.5) continue;
        const radius = Math.max(0.42, Math.max(sprite.userData.baseScaleX ?? sprite.scale?.x ?? 0.5,
            sprite.userData.baseScaleY ?? sprite.scale?.y ?? 0.5) * 0.42);
        if (Math.hypot(position.x - sprite.position.x, position.z - sprite.position.z) <= radius) return true;
    }
    return puddles.some((puddle) => puddle?.active && Math.abs((puddle.y ?? 0) - position.y) <= 1.5
        && Math.hypot(position.x - puddle.x, position.z - puddle.z) <= puddle.radius);
}
