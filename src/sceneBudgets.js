// Scene submission budgets per platform (docs/planning/definitive-first-
// expedition-improvement-program-2026-10-27.md P0-B). The October 27 logs
// were CPU-bound with tiny GPU times: frames slowed with what the scene
// submitted, not with the GPU. Checked on the frame-breakdown cadence and
// logged as PERF scene-budget-exceeded, so every uploaded session says
// whether the scene stayed inside them.
//
// Measured 2026-10-27 (PvE, PC 2304x1440): 16 visible chunks, 567 draw calls
// median (1,078 peak), up to 4.06 M triangles, 216 shader programs.
export const SCENE_BUDGETS = Object.freeze({
    deck: Object.freeze({ visibleChunks: 9, drawCalls: 450, triangles: 1_500_000, programs: 160 }),
    pc: Object.freeze({ visibleChunks: 9, drawCalls: 900, triangles: 3_000_000, programs: 220 })
});

/** Each budget the snapshot breaks, as { key, value, limit }. */
export function evaluateSceneBudget(snapshot = {}, { isSteamDeck = false } = {}) {
    const budget = isSteamDeck ? SCENE_BUDGETS.deck : SCENE_BUDGETS.pc;
    const overages = [];
    for (const [key, limit] of Object.entries(budget)) {
        const value = Number(snapshot?.[key]);
        if (Number.isFinite(value) && value > limit) overages.push({ key, value, limit });
    }
    return overages;
}
