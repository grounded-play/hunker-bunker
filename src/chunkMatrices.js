// Hidden chunks skip the per-frame matrix pass (Sprint 52 perf). The long
// walk timed scene.updateMatrixWorld growing with loaded chunks -- 2.0 ms at
// 16 chunks, 5.2 ms at 33 -- because three.js walks every object in every
// loaded chunk each frame, shown or not, and a hidden chunk is drawn by
// nobody. Matrices are computed once at mount (so anything measuring a hidden
// chunk sees correct transforms), skipped while the chunk is hidden, and
// brought up to date on the first frame it is shown.
import { Object3D } from 'three';

// three.js passes `force = true` down the whole tree every frame (any object
// with matrixAutoUpdate marks itself dirty), so a hidden chunk skips whatever
// `force` says. Its first frame shown arrives forced and recomputes it all.
function updateMatrixWorldWhenShown(force) {
    if (this.visible === false) return;
    Object3D.prototype.updateMatrixWorld.call(this, force);
}

export function skipMatrixPassWhileHidden(group) {
    if (!group) return group;
    Object3D.prototype.updateMatrixWorld.call(group, true);
    group.updateMatrixWorld = updateMatrixWorldWhenShown;
    return group;
}
