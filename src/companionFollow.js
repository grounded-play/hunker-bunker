// Pure trailing-position math for companion follow AI. threeGame.js's
// updateCompanions uses this to find where a companion should be heading
// each frame; all THREE/scene-graph work stays in threeGame.js.

export function computeTrailPosition(playerPos, facingDir, trailDistance) {
    const len = Math.hypot(facingDir.dirX, facingDir.dirZ);
    const [dx, dz] = len > 0.0001 ? [facingDir.dirX / len, facingDir.dirZ / len] : [0, 1];
    return {
        x: playerPos.x - dx * trailDistance,
        z: playerPos.z - dz * trailDistance
    };
}

// The direction a follower trails behind: where the player is walking, not
// where they aim. Aim swings with every mouse or stick movement, and a trail
// point placed behind the aim orbits the player, so the companion ran loops
// around them instead of walking with them (QA 2026-10-27). The heading only
// changes while the player actually moves, and eases toward the new direction.
export function updateFollowHeading(previous, playerPos, lastPlayerPos, { minStep = 0.01, blend = 0.25 } = {}) {
    const fallback = previous ?? { dirX: 0, dirZ: 1 };
    if (!lastPlayerPos) return { heading: fallback, moving: false };
    const dx = playerPos.x - lastPlayerPos.x;
    const dz = playerPos.z - lastPlayerPos.z;
    const step = Math.hypot(dx, dz);
    if (step < minStep) return { heading: fallback, moving: false };
    const mixX = fallback.dirX * (1 - blend) + (dx / step) * blend;
    const mixZ = fallback.dirZ * (1 - blend) + (dz / step) * blend;
    const len = Math.hypot(mixX, mixZ);
    return {
        heading: len > 0.0001 ? { dirX: mixX / len, dirZ: mixZ / len } : { dirX: dx / step, dirZ: dz / step },
        moving: true
    };
}

// A follower close enough to a player who has stopped holds its ground rather
// than shuffling to an exact point (it idles instead of walking in place).
export function shouldHoldFollow(companionPos, playerPos, playerMoving, holdRadius = 3.2) {
    if (playerMoving) return false;
    return Math.hypot(companionPos.x - playerPos.x, companionPos.z - playerPos.z) <= holdRadius;
}
