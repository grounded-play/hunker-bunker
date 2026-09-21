// End-of-run score. The trusted backend recomputes this exact formula
// (server/leaderboardScoring.js recomputeRunScore) with zero tolerance, so
// every input must be one the run payload also carries -- in particular the
// time bonus uses the payload's runMs, never a second Date.now() read.
// server/runPayloadContract.test.js pins the two together.
export function computeRunScore({ stats = {}, missionStatus = null, depositedResources = {}, runMs = 0 } = {}) {
    const extracted = missionStatus === 'extracted';
    const elapsedMinutes = Math.max(0, Number(runMs) || 0) / 60000;
    let score = 0;

    if (extracted) score += 500;
    score += Math.floor((stats.depthTier ?? 0) * (stats.distanceTravelled ?? 0) * 0.08);

    const r = depositedResources ?? {};
    score += ((r.tech ?? 0) * 10) + ((r.coin ?? 0) * 5) + ((r.med ?? 0) * 3);
    score += (stats.snailsKilled ?? 0) * 40;

    if (extracted) {
        score += 200;
        if (stats.fullHealthAtEnd) score += 100;
    }

    if (elapsedMinutes < 15) {
        score += Math.max(0, Math.min(300, Math.floor((15 - elapsedMinutes) * 50)));
    }
    if (stats.hadNearDeath) score += 100;

    return Math.floor(score);
}
