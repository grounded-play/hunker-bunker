/**
 * Interiors and sub-levels as bounded play planes behind a portal.
 *
 * Entering a structure or dropping through a hole swaps the active plane;
 * leaving swaps back. A plane is its own chunk space with its own lighting and
 * its own camera treatment.
 *
 * Deliberately NOT seamless interiors. Seamless needs occlusion culling, portal
 * rendering and a camera that solves for every doorway. A swapped plane needs a
 * door, a fade and a stack -- and it extends the cave/mothership transition the
 * game already ships rather than introducing a second world model.
 *
 * Pure: the caller owns geometry, fades and persistence.
 */

export const PLANE_KINDS = Object.freeze({
    SURFACE: 'surface',     // the open world
    INTERIOR: 'interior',   // inside a structure, same elevation
    SUBLEVEL: 'sublevel'    // below, reached by hole/stairs/ladder
});

/**
 * Camera treatment per plane. Sub-levels pull in and shorten the far plane:
 * it sells confinement AND makes a sub-level cheaper to render than the surface
 * it hangs off, which is what lets them exist at all.
 */
export const PLANE_CAMERA = Object.freeze({
    [PLANE_KINDS.SURFACE]: Object.freeze({ distance: 3.65, lift: 1.55, far: 160, ceilingFade: false }),
    [PLANE_KINDS.INTERIOR]: Object.freeze({ distance: 3.1, lift: 1.9, far: 60, ceilingFade: true }),
    [PLANE_KINDS.SUBLEVEL]: Object.freeze({ distance: 2.7, lift: 1.7, far: 42, ceilingFade: true })
});

/** How deep the stack may go. A stack without a bound is a way to lose a player. */
export const MAX_PLANE_DEPTH = 3;

export function createPlaneStack() {
    return {
        // The surface is always the floor of the stack and is never popped.
        stack: [Object.freeze({ id: 'surface', kind: PLANE_KINDS.SURFACE, returnTo: null })],
        transitioning: false
    };
}

/**
 * Mark a transition in flight.
 *
 * `transitioning` was previously declared and checked but never set by anything
 * -- a guard that does not guard. A portal transition plays a fade, and during
 * that fade a second trigger volume can easily fire; without this the player
 * ends up two planes deep from one doorway.
 */
export function beginTransition(state) {
    const current = { ...createPlaneStack(), ...state };
    if (current.transitioning) return { state: current, began: false };
    return { state: { ...current, transitioning: true }, began: true };
}

export function endTransition(state) {
    const current = { ...createPlaneStack(), ...state };
    return { state: { ...current, transitioning: false } };
}

export function activePlane(state) {
    const stack = state?.stack;
    return Array.isArray(stack) && stack.length ? stack[stack.length - 1] : null;
}

export function planeDepth(state) {
    return Math.max(0, (state?.stack?.length ?? 1) - 1);
}

export function cameraForPlane(state) {
    return PLANE_CAMERA[activePlane(state)?.kind ?? PLANE_KINDS.SURFACE];
}

/**
 * Enter a plane through a portal.
 *
 * `returnTo` records where the player came from, so leaving puts them back at
 * the door rather than at the plane's origin -- stepping out of a building and
 * appearing somewhere else is the classic portal bug.
 */
export function enterPlane(state, { id, kind, returnTo }) {
    const current = { ...createPlaneStack(), ...state };
    if (current.transitioning) return { state: current, entered: false, reason: 'already transitioning' };
    if (!id || !Object.values(PLANE_KINDS).includes(kind)) {
        return { state: current, entered: false, reason: 'invalid plane' };
    }
    // SURFACE is the floor of the stack, not something you enter. Pushing a
    // second one made leaveable "surfaces" that are not the real world, and the
    // camera would then treat the open world as an interior.
    if (kind === PLANE_KINDS.SURFACE) {
        return { state: current, entered: false, reason: 'surface cannot be entered' };
    }
    if (planeDepth(current) >= MAX_PLANE_DEPTH) {
        return { state: current, entered: false, reason: 'max depth' };
    }
    if (current.stack.some((p) => p.id === id)) {
        // Re-entering a plane already in the stack would make leaving ambiguous.
        return { state: current, entered: false, reason: 'already in stack' };
    }
    const plane = Object.freeze({ id, kind, returnTo: returnTo ?? null });
    return {
        state: { ...current, stack: [...current.stack, plane] },
        entered: true,
        plane,
        camera: PLANE_CAMERA[kind]
    };
}

/** Leave the current plane, returning to the one beneath and to the door used. */
export function leavePlane(state) {
    const current = { ...createPlaneStack(), ...state };
    if (current.transitioning) return { state: current, left: false, reason: 'already transitioning' };
    if (planeDepth(current) === 0) {
        // The surface is the floor of the stack. Popping it would leave the
        // player standing in no world at all.
        return { state: current, left: false, reason: 'already on the surface' };
    }
    const leaving = current.stack[current.stack.length - 1];
    const stack = current.stack.slice(0, -1);
    return {
        state: { ...current, stack },
        left: true,
        returnTo: leaving.returnTo,
        plane: stack[stack.length - 1],
        camera: PLANE_CAMERA[stack[stack.length - 1].kind]
    };
}

/**
 * Should this object be faded out to keep the player visible?
 *
 * A hard cull pops as the camera moves; a fade reads as a deliberate cutaway.
 * Only geometry ABOVE the player and between them and the camera qualifies --
 * fading a wall the player is standing behind would expose the world outside.
 */
export function ceilingFadeAlpha(state, { objectY, playerY, betweenCameraAndPlayer }, {
    headroom = 0.4, minAlpha = 0.12
} = {}) {
    if (!cameraForPlane(state)?.ceilingFade) return 1;
    if (!betweenCameraAndPlayer) return 1;
    const above = Number(objectY) - Number(playerY);
    if (!(above > headroom)) return 1;
    // Fade in over a short band so a roof edge does not snap to transparent.
    const t = Math.min(1, (above - headroom) / 1.2);
    return Math.max(minAlpha, 1 - t);
}
