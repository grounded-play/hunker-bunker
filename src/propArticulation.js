/**
 * Moving parts cut out of monolithic props (scripts/blender/articulation_recipes.py).
 *
 * Each part is a named HB_* node whose glTF extras say how it moves; three.js
 * loads those into `userData`:
 *   hinge: hb_axis, hb_open_angle (radians, rest -> open), hb_open_offset, hb_duration
 *   spin:  hb_axis, hb_speed (radians/second while working), hb_bob (travel along the axis)
 * The rest pose is closed / stopped. Axes and offsets are in the part's parent
 * space, so every pose is `axisAngle(axis, angle) * rest`.
 *
 * One controller per prop instance: toggle() opens or closes every hinge and
 * starts or stops every rotor; update() eases them and reports whether the
 * prop still needs frames, so a finished pose costs nothing.
 */
import * as THREE from 'three';

const SPIN_RAMP_SECONDS = 0.7;
const ease = (t) => t * t * (3 - 2 * t);

function axisOf(node) {
    const [x = 0, y = 1, z = 0] = node.userData.hb_axis ?? [];
    const axis = new THREE.Vector3(x, y, z);
    return axis.lengthSq() > 0 ? axis.normalize() : new THREE.Vector3(0, 1, 0);
}

function readPart(node) {
    const data = node.userData;
    const base = {
        node,
        axis: axisOf(node),
        restQuaternion: node.quaternion.clone(),
        restPosition: node.position.clone()
    };
    if (data.hb_motion === 'hinge') {
        const [ox = 0, oy = 0, oz = 0] = data.hb_open_offset ?? [];
        return {
            ...base,
            motion: 'hinge',
            openAngle: Number(data.hb_open_angle) || 0,
            openOffset: new THREE.Vector3(ox, oy, oz),
            duration: Math.max(0.05, Number(data.hb_duration) || 0.9),
            progress: 0
        };
    }
    if (data.hb_motion === 'spin') {
        return {
            ...base,
            motion: 'spin',
            speed: Number(data.hb_speed) || 0,
            bob: Number(data.hb_bob) || 0,
            angle: 0,
            drive: 0
        };
    }
    return null;
}

const scratchQuaternion = new THREE.Quaternion();

function poseHinge(part) {
    const s = ease(part.progress);
    part.node.quaternion.copy(scratchQuaternion.setFromAxisAngle(part.axis, part.openAngle * s).multiply(part.restQuaternion));
    part.node.position.copy(part.restPosition).addScaledVector(part.openOffset, s);
}

function poseSpin(part) {
    part.node.quaternion.copy(scratchQuaternion.setFromAxisAngle(part.axis, part.angle).multiply(part.restQuaternion));
    // The bit rides up and down once per turn, lowest at rest.
    const lift = part.bob * 0.5 * (1 - Math.cos(part.angle));
    part.node.position.copy(part.restPosition).addScaledVector(part.axis, -lift);
}

/** A controller for a prop's HB_* parts, or null when it has none. */
export function createPropArticulation(model) {
    const parts = [];
    model?.traverse?.((node) => {
        if (!node.userData?.hb_motion) return;
        const part = readPart(node);
        if (part) parts.push(part);
    });
    if (parts.length === 0) return null;
    const hinges = parts.filter((part) => part.motion === 'hinge');
    const rotors = parts.filter((part) => part.motion === 'spin');
    let open = false;
    let working = false;

    return {
        parts,
        kind: hinges.length ? 'hinge' : 'spin',
        get open() { return open; },
        get working() { return working; },
        get state() {
            if (hinges.length) {
                const settled = hinges.every((part) => part.progress === (open ? 1 : 0));
                if (settled) return open ? 'open' : 'closed';
                return open ? 'opening' : 'closing';
            }
            if (working) return 'working';
            return rotors.some((part) => part.drive > 0) ? 'stopping' : 'idle';
        },
        /** Open/close the hinges, start/stop the rotors. Returns the new target. */
        toggle() {
            if (hinges.length) open = !open;
            if (rotors.length) working = !working;
            return hinges.length ? open : working;
        },
        set({ open: nextOpen = open, working: nextWorking = working } = {}) {
            open = Boolean(nextOpen);
            working = Boolean(nextWorking);
        },
        /** True while something is still moving. */
        update(delta = 0) {
            const step = Math.min(Math.max(Number(delta) || 0, 0), 0.1);
            let moving = false;
            for (const part of hinges) {
                const target = open ? 1 : 0;
                if (part.progress === target) continue;
                const change = step / part.duration;
                part.progress = target > part.progress
                    ? Math.min(target, part.progress + change)
                    : Math.max(target, part.progress - change);
                poseHinge(part);
                moving = true;
            }
            for (const part of rotors) {
                const target = working ? 1 : 0;
                if (part.drive !== target) {
                    const change = step / SPIN_RAMP_SECONDS;
                    part.drive = target > part.drive ? Math.min(1, part.drive + change) : Math.max(0, part.drive - change);
                }
                if (part.drive > 0) {
                    part.angle = (part.angle + part.speed * part.drive * step) % (Math.PI * 2);
                    poseSpin(part);
                    moving = true;
                }
            }
            return moving;
        },
        /** Back to rest: closed and stopped. */
        reset() {
            open = false;
            working = false;
            for (const part of hinges) {
                part.progress = 0;
                poseHinge(part);
            }
            for (const part of rotors) {
                part.drive = 0;
                part.angle = 0;
                poseSpin(part);
            }
        }
    };
}
