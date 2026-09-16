const FILMS = Object.freeze({
    boss_cybersnail: 'int_13_a_snail_blocks_the_hallway',
    boss_cryosnail: 'int_26_absolute_zero_has_a_shell',
    boss_sporesnail: 'int_27_the_bloom_that_hunts'
});

// One claim for one encounter, independent of film aliases. Radar and reactor
// deliberately share a species/film but remain two distinct encounters.
export function createMilestonePresentationGate() {
    let activeRun;
    const claimed = new Set();
    const latestByGoal = new Map();
    return {
        claim(detail = {}, runId) {
            if (activeRun !== runId) {
                activeRun = runId;
                claimed.clear();
                latestByGoal.clear();
            }
            const type = String(detail.type ?? '');
            const videoBase = FILMS[type];
            if (!videoBase) return null;
            const goal = detail.goalKey ?? detail.milestoneId ?? type;
            const identity = detail.encounterId ?? latestByGoal.get(goal) ?? detail.milestoneId ?? goal;
            latestByGoal.set(goal, identity);
            if (claimed.has(identity)) return null;
            claimed.add(identity);
            // The O2 director has already shown the boss film. Keep the warning
            // HUD/event, but do not enqueue its second legacy alias.
            if (detail.presentationHandled === true) return null;
            return { eventId: `boss_encounter_${type.replace(/^boss_/, '')}`, videoBase };
        }
    };
}
