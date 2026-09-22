// Score -> grade bands for the end-of-run rating. Shared by ThreeGame's
// getRunRating() (Game Over screen) and the Deployment Briefing's Daily Ops
// goals panel, so the targets a player is shown are the ones they're graded on.
export const RUN_GRADE_BANDS = Object.freeze([
    Object.freeze({ grade: 'S', minScore: 2000, label: 'EXEMPLARY FIELD PERFORMANCE' }),
    Object.freeze({ grade: 'A', minScore: 1500, label: 'MISSION SUCCESSFUL' }),
    Object.freeze({ grade: 'B', minScore: 1000, label: 'PARTIAL SUCCESS' }),
    Object.freeze({ grade: 'C', minScore: 500, label: 'MISSION FAILED — DATA RECOVERED' }),
    Object.freeze({ grade: 'D', minScore: 0, label: 'AGENT LOST — MINIMAL TELEMETRY' })
]);

export function getRunRating(score) {
    const band = RUN_GRADE_BANDS.find((entry) => score >= entry.minScore) ?? RUN_GRADE_BANDS.at(-1);
    return { grade: band.grade, label: band.label };
}
