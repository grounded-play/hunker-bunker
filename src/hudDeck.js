// Which popup cards the docked HUD deck shows (Sprint 52). The deck has a
// height cap so popups never run down over the mission stack; a card that
// does not fit whole waits its turn instead of being cut off at the cap
// (playthrough 2026-10-07: "the second one is having its lower part cropped").
// Cards stay in order: once one waits, every card behind it waits too.
export function planDeckVisibility(heights, available, { gap = 0 } = {}) {
    let used = 0;
    let open = true;
    return heights.map((height, index) => {
        const needed = (index === 0 ? 0 : gap) + Math.max(0, height);
        if (index === 0) {
            used = needed;
            return true;
        }
        if (open && used + needed <= available) {
            used += needed;
            return true;
        }
        open = false;
        return false;
    });
}
