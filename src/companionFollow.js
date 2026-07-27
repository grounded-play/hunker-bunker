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
