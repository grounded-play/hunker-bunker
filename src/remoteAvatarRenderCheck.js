// Does a squadmate's 3D body actually show? QA 2026-10-28 (Deck + PC, PvP and
// co-op): each side saw only the other's shadow. The overlay had loaded
// (remote-avatar-3d-ready) and hidden the sprite, so nothing on screen said
// the player was there. A body whose colour pass draws nothing still casts
// its shadow (the shadow pass uses its own depth material), which is what a
// program that failed to link looks like; that never reproduced on the dev
// RTX, so the game now checks in the field, logs what it found, and brings the
// sprite back rather than leave an invisible player.
//
// facts: {
//   drawn: boolean           colour pass drew a mesh since the check armed
//   meshes: number           meshes in the overlay
//   programs: Array<boolean|null>  LINK_STATUS per material (null: no program yet)
//   height: number           world bounding-box height of the body
//   offset: number           horizontal distance of the body from its player
// }
export const REMOTE_AVATAR_HEIGHT_RANGE = Object.freeze([0.4, 6]);
export const REMOTE_AVATAR_MAX_OFFSET = 2;

export function remoteAvatarRenderProblems(facts = {}) {
    const problems = [];
    if (!(facts.meshes > 0)) problems.push('no-meshes');
    if (facts.drawn === false) problems.push('not-drawn');
    const programs = Array.isArray(facts.programs) ? facts.programs : [];
    if (programs.some((linked) => linked === false)) problems.push('program-not-linked');
    if (programs.length > 0 && programs.every((linked) => linked === null)) problems.push('no-program');
    const [minHeight, maxHeight] = REMOTE_AVATAR_HEIGHT_RANGE;
    if (!Number.isFinite(facts.height) || facts.height < minHeight || facts.height > maxHeight) problems.push('bad-size');
    if (!Number.isFinite(facts.offset) || facts.offset > REMOTE_AVATAR_MAX_OFFSET) problems.push('off-body');
    return problems;
}
