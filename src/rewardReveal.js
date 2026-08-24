// Season-pass reward reveal (Sprint 29 plan §7), Lane A.
//
// The 3D preview itself belongs to Lane B. This module owns the shell around
// it and declares the interface between them, so the reveal can ship and be
// tested against an honest "preview unavailable" state before any turntable
// exists.

/**
 * Mount a 3D preview of a reward into `container`.
 *
 * Lane B replaces this stub with the real turntable. The contract it must keep:
 *   - `ready` always resolves, never rejects -- a failed preview is a state the
 *     shell renders, not an exception it has to catch.
 *   - resolves `{ ok: true }` or `{ ok: false, reason }`.
 *   - `dispose()` releases GPU resources and is safe to call more than once.
 */
export function mountRewardPreview() {
    let disposed = false;
    return {
        ready: Promise.resolve({ ok: false, reason: 'preview-not-implemented' }),
        dispose() {
            if (disposed) return;
            disposed = true;
        }
    };
}
