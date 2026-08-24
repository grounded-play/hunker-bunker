// XP feedback lifecycle (Sprint 29 plan §6), Lane A.
//
// The reported symptom was "the green XP box is always visible". The element
// (.season-pass-toast, riding .achievement-toast) does carry a 4.2s auto
// dismiss, so the box is not stuck -- XP simply fires faster than toasts
// expire, and the stack saturates. The fix is therefore aggregation first:
// collapse a run of gains into one burst, then show that burst once.

export function createXpAggregator({ windowMs = 900, now = () => Date.now() } = {}) {
    let burst = null;

    function add(amount) {
        const at = now();
        if (!burst || at - burst.startedAt > windowMs) {
            burst = { amount: 0, events: 0, startedAt: at };
        }
        burst.amount += amount;
        burst.events += 1;
        return { ...burst };
    }

    function cancel() {
        burst = null;
    }

    function isPending() {
        return burst !== null;
    }

    // Hand the accumulated burst to the caller exactly once. Returning null on
    // an empty flush is what keeps a stray timer from re-showing a burst that
    // has already been presented (§6: no duplicate sound on repeat updates).
    function flushPending() {
        if (!burst) return null;
        const flushed = { ...burst };
        burst = null;
        return flushed;
    }

    return { add, cancel, isPending, flushPending };
}

// Lane C owns these sounds; Lane A only chooses which one the event deserves.
// Names come from scripts/generate-plan-sfx.js.
export function selectXpSound({ leveledUp = false, bonus = false } = {}) {
    if (leveledUp) return 'xp_levelup';
    if (bonus) return 'xp_bonus';
    return 'xp_tick';
}
