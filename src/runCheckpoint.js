// docs/sprint28plan.md Lane D (save/recovery floor-raising). This is
// deliberately NOT a full save-state/resume system -- it does not
// reconstruct world/enemy state. Its only job is closing one specific gap:
// today, a crash/force-quit/tab-close mid-run (as opposed to a normal
// in-game death, which src/blackBox.js already handles gracefully via
// handleDeath()) loses that run's progress with zero record at all, not
// even a salvage recap.
//
// ThreeGame periodically writes a lightweight snapshot here (position,
// depth, class, salvage-so-far) during a live run, and clears it on every
// graceful way a run can end (death, extraction, a fresh "NEW RUN"). If a
// snapshot is still present at next boot, that's proof the previous session
// never reached a graceful end -- main.js's boot sequence converts it into
// a normal src/blackBox.js death-stain entry (cause: 'crash-recovered'),
// so the *existing*, already-shipped black-box recovery flow (walk to the
// marker, recover salvage, patrol-risk) is the only recovery UX a player
// ever sees, whether they died or crashed.
const STORAGE_KEY = 'hb_run_checkpoint_v1';

function cloneSalvage(salvage = {}) {
    return {
        tech: Math.max(0, Math.floor(Number(salvage.tech) || 0)),
        coin: Math.max(0, Math.floor(Number(salvage.coin) || 0)),
        med: Math.max(0, Math.floor(Number(salvage.med) || 0))
    };
}

export function createRunCheckpointStorage({ storage = null, storageKey = STORAGE_KEY } = {}) {
    return {
        storage,
        storageKey,

        save({ x = 0, z = 0, depth = 0, classType = 'SCOUT', salvage = {} } = {}) {
            if (!this.storage) return null;
            const normalized = {
                x: Number.isFinite(x) ? x : 0,
                z: Number.isFinite(z) ? z : 0,
                depth: Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 0,
                classType: typeof classType === 'string' ? classType : 'SCOUT',
                salvage: cloneSalvage(salvage)
            };
            try {
                this.storage.setItem(this.storageKey, JSON.stringify(normalized));
            } catch {
                // localStorage may be unavailable; run continues without checkpointing.
            }
            return normalized;
        },

        load() {
            if (!this.storage) return null;
            try {
                const raw = this.storage.getItem(this.storageKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return null;
                return {
                    x: Number.isFinite(parsed.x) ? parsed.x : 0,
                    z: Number.isFinite(parsed.z) ? parsed.z : 0,
                    depth: Number.isFinite(parsed.depth) ? Math.max(0, Math.floor(parsed.depth)) : 0,
                    classType: typeof parsed.classType === 'string' ? parsed.classType : 'SCOUT',
                    salvage: cloneSalvage(parsed.salvage)
                };
            } catch {
                return null;
            }
        },

        clear() {
            try {
                this.storage?.removeItem(this.storageKey);
            } catch {
                // best effort
            }
        }
    };
}

// A checkpoint with zero salvage isn't worth converting into a black box --
// there's nothing recoverable, so boot-time recovery should just clear it
// silently rather than spawning an empty marker.
export function hasRecoverableSalvage(checkpoint) {
    if (!checkpoint) return false;
    const salvage = checkpoint.salvage ?? {};
    return (salvage.tech ?? 0) > 0 || (salvage.coin ?? 0) > 0 || (salvage.med ?? 0) > 0;
}

export const runCheckpointStore = createRunCheckpointStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : null
});
