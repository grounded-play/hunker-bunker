import { describe, expect, it } from 'vitest';
import {
    PLANE_KINDS, MAX_PLANE_DEPTH,
    createPlaneStack, activePlane, planeDepth, cameraForPlane,
    enterPlane, leavePlane, ceilingFadeAlpha, beginTransition, endTransition
} from './portalPlanes.js';

const enterInterior = (s, id = 'hab_01') =>
    enterPlane(s, { id, kind: PLANE_KINDS.INTERIOR, returnTo: { x: 4, z: 9 } }).state;

describe('plane stack', () => {
    it('starts on the surface', () => {
        const s = createPlaneStack();
        expect(activePlane(s).kind).toBe(PLANE_KINDS.SURFACE);
        expect(planeDepth(s)).toBe(0);
    });

    it('enters and leaves, returning to the door rather than the origin', () => {
        // Stepping out of a building and appearing somewhere else is the
        // classic portal bug.
        const inside = enterPlane(createPlaneStack(), {
            id: 'hab_01', kind: PLANE_KINDS.INTERIOR, returnTo: { x: 4, z: 9 }
        });
        expect(inside.entered).toBe(true);
        const out = leavePlane(inside.state);
        expect(out.returnTo).toEqual({ x: 4, z: 9 });
        expect(out.plane.kind).toBe(PLANE_KINDS.SURFACE);
    });

    it('nests interior then sub-level', () => {
        let s = enterInterior(createPlaneStack());
        s = enterPlane(s, { id: 'cellar', kind: PLANE_KINDS.SUBLEVEL, returnTo: { x: 1, z: 1 } }).state;
        expect(planeDepth(s)).toBe(2);
        expect(activePlane(s).kind).toBe(PLANE_KINDS.SUBLEVEL);
    });

    it('never pops the surface, which would leave the player in no world', () => {
        const out = leavePlane(createPlaneStack());
        expect(out.left).toBe(false);
        expect(activePlane(out.state).kind).toBe(PLANE_KINDS.SURFACE);
    });

    it('bounds the stack, since an unbounded one is a way to lose a player', () => {
        let s = createPlaneStack();
        for (let i = 0; i < MAX_PLANE_DEPTH + 2; i += 1) {
            s = enterPlane(s, { id: `p${i}`, kind: PLANE_KINDS.SUBLEVEL, returnTo: null }).state;
        }
        expect(planeDepth(s)).toBe(MAX_PLANE_DEPTH);
    });

    it('refuses re-entering a plane already in the stack', () => {
        // Otherwise leaving becomes ambiguous: which copy do you return to?
        const s = enterInterior(createPlaneStack());
        expect(enterPlane(s, { id: 'hab_01', kind: PLANE_KINDS.SUBLEVEL, returnTo: null }).entered).toBe(false);
    });

    it('rejects a malformed plane rather than pushing it', () => {
        const s = createPlaneStack();
        expect(enterPlane(s, { id: '', kind: PLANE_KINDS.INTERIOR }).entered).toBe(false);
        expect(enterPlane(s, { id: 'x', kind: 'nonsense' }).entered).toBe(false);
    });
});

describe('camera per plane', () => {
    it('pulls in and shortens the far plane as you descend', () => {
        const surface = cameraForPlane(createPlaneStack());
        const inside = cameraForPlane(enterInterior(createPlaneStack()));
        expect(inside.distance).toBeLessThan(surface.distance);
        expect(inside.far).toBeLessThan(surface.far);
    });

    it('only enables ceiling fade where there is a ceiling', () => {
        expect(cameraForPlane(createPlaneStack()).ceilingFade).toBe(false);
        expect(cameraForPlane(enterInterior(createPlaneStack())).ceilingFade).toBe(true);
    });
});

describe('ceiling fade', () => {
    const inside = enterInterior(createPlaneStack());

    it('is inert on the surface, which has no roof to hide behind', () => {
        expect(ceilingFadeAlpha(createPlaneStack(), {
            objectY: 5, playerY: 0, betweenCameraAndPlayer: true
        })).toBe(1);
    });

    it('fades geometry above the player and in the way', () => {
        expect(ceilingFadeAlpha(inside, {
            objectY: 3, playerY: 0, betweenCameraAndPlayer: true
        })).toBeLessThan(1);
    });

    it('leaves walls the player stands behind alone', () => {
        // Fading those would expose the world outside the structure.
        expect(ceilingFadeAlpha(inside, {
            objectY: 3, playerY: 0, betweenCameraAndPlayer: false
        })).toBe(1);
    });

    it('does not fade anything at or below head height', () => {
        expect(ceilingFadeAlpha(inside, {
            objectY: 0.2, playerY: 0, betweenCameraAndPlayer: true
        })).toBe(1);
    });

    it('never fades fully, so a roof stays readable as a roof', () => {
        expect(ceilingFadeAlpha(inside, {
            objectY: 40, playerY: 0, betweenCameraAndPlayer: true
        })).toBeGreaterThan(0);
    });

    it('ramps rather than snapping, so a roof edge does not pop', () => {
        const near = ceilingFadeAlpha(inside, { objectY: 0.6, playerY: 0, betweenCameraAndPlayer: true });
        const far = ceilingFadeAlpha(inside, { objectY: 1.4, playerY: 0, betweenCameraAndPlayer: true });
        expect(near).toBeGreaterThan(far);
    });
});

describe('transition guard (regressions)', () => {
    it('refuses to enter while a transition is in flight', () => {
        // transitioning was declared and checked but nothing ever set it -- a
        // guard that does not guard. A portal fade is long enough for a second
        // trigger volume to fire and put the player two planes deep from one
        // doorway.
        const mid = beginTransition(createPlaneStack()).state;
        expect(enterPlane(mid, { id: 'hab', kind: PLANE_KINDS.INTERIOR }).entered).toBe(false);
    });

    it('refuses to leave while a transition is in flight', () => {
        const inside = enterInterior(createPlaneStack());
        const mid = beginTransition(inside).state;
        expect(leavePlane(mid).left).toBe(false);
    });

    it('will not begin a second transition over a live one', () => {
        const first = beginTransition(createPlaneStack());
        expect(beginTransition(first.state).began).toBe(false);
    });

    it('clears on end, so the stack is usable again', () => {
        const cleared = endTransition(beginTransition(createPlaneStack()).state).state;
        expect(enterPlane(cleared, { id: 'hab', kind: PLANE_KINDS.INTERIOR }).entered).toBe(true);
    });
});

describe('surface is not enterable (regression)', () => {
    it('refuses to push a second surface onto the stack', () => {
        // A pushed surface is a leaveable "world" that is not the real one, and
        // the camera would then treat the open world as an interior.
        const r = enterPlane(createPlaneStack(), { id: 'surface2', kind: PLANE_KINDS.SURFACE });
        expect(r.entered).toBe(false);
        expect(r.reason).toBe('surface cannot be entered');
    });
});
