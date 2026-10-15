/**
 * Pure swept-cone targeting for short-range flame weapons.
 *
 * Targets may expose x/z directly or through a Three.js-style `position`.
 * The resolver intentionally does not know about walls; runtime callers can
 * reject returned hits with their existing world raycaster.
 */
export function resolveSweptConeHits({
    origin = { x: 0, z: 0 },
    direction = { x: 0, z: 1 },
    range = 6.5,
    halfAngle = 0.38,
    targets = []
} = {}) {
    const length = Math.hypot(Number(direction?.x) || 0, Number(direction?.z) || 0);
    if (!(length > 0) || !(range > 0) || !(halfAngle >= 0)) return [];
    const dirX = direction.x / length;
    const dirZ = direction.z / length;
    const cosLimit = Math.cos(halfAngle);

    return targets.flatMap((target, index) => {
        const x = Number(target?.position?.x ?? target?.x);
        const z = Number(target?.position?.z ?? target?.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) return [];
        const dx = x - (Number(origin?.x) || 0);
        const dz = z - (Number(origin?.z) || 0);
        const distance = Math.hypot(dx, dz);
        const radius = Math.max(0, Number(target?.radius ?? target?.userData?.collisionRadius) || 0);
        if (distance - radius > range) return [];
        const cosine = distance > 0 ? ((dx * dirX) + (dz * dirZ)) / distance : 1;
        // A target's footprint slightly widens the acceptable edge of the
        // cone, preventing a visible flame lick from missing a large body.
        const angularAllowance = distance > 0 ? Math.asin(Math.min(1, radius / distance)) : 0;
        if (cosine < Math.cos(Math.min(Math.PI, halfAngle + angularAllowance))) return [];
        return [{ target, index, x, z, distance, cosine: Math.max(cosLimit, cosine) }];
    }).sort((a, b) => (a.distance - b.distance) || (a.index - b.index));
}
