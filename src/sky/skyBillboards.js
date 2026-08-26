import * as THREE from 'three';

// A fixed pool of camera-facing quads on the sky dome.
//
// Serves two callers that look different but behave identically: the celestial
// bodies from skyState (suns, moons, planets, the derelict) and the animated
// transients (comets, meteors, the mothership transit). A transient is just a
// billboard whose texture happens to be a sprite sheet, so one pool covers
// both rather than two systems doing the same arithmetic.
//
// The pool is preallocated and never grows. Sky content churns every few
// seconds; allocating meshes on the frame a comet appears would stutter
// exactly when the player is looking at it.

const DEFAULT_CAPACITY = 12;

// Bodies sitting below the horizon are hidden rather than released, so they
// come back as they rise without reloading anything.
const HORIZON_EPSILON = -0.02;

function createSlot() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 1,
        depthWrite: false,
        // Same rule as the layer shells: transparent materials draw after all
        // opaque geometry, so without a depth test the sky paints over the
        // world it is supposed to sit behind.
        depthTest: true,
        fog: false,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData = { slotKey: null, sourceUrl: null };
    return mesh;
}

export function createSkyBillboardPool({
    textureLoader = new THREE.TextureLoader(),
    capacity = DEFAULT_CAPACITY
} = {}) {
    const group = new THREE.Group();
    group.name = 'skyBillboards';
    group.frustumCulled = false;

    const slots = [];
    for (let i = 0; i < capacity; i += 1) {
        const slot = createSlot();
        slots.push(slot);
        group.add(slot);
    }

    // Source textures are shared by url; each slot gets its own clone so it can
    // hold an independent offset/repeat. Two billboards showing different
    // frames of the same sheet would otherwise fight over the same object.
    const sourceCache = new Map();
    function textureForSlot(slot, url) {
        if (slot.userData.sourceUrl === url) return slot.material.map;
        let source = sourceCache.get(url);
        if (!source) {
            source = textureLoader.load(url);
            sourceCache.set(url, source);
        }
        const clone = source.clone ? source.clone() : source;
        clone.needsUpdate = true;
        slot.userData.sourceUrl = url;
        slot.material.map = clone;
        slot.material.needsUpdate = true;
        return clone;
    }

    // `radius` is the dome radius the billboards sit on, passed in so the pool
    // does not need to know how the rig is built.
    function sync(entries, radius) {
        const count = Math.min(entries.length, slots.length);

        for (let i = 0; i < count; i += 1) {
            const entry = entries[i];
            const slot = slots[i];
            const { direction } = entry;

            if (direction.y <= HORIZON_EPSILON) {
                slot.visible = false;
                continue;
            }

            const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
            slot.position.set(
                (direction.x / length) * radius,
                (direction.y / length) * radius,
                (direction.z / length) * radius
            );
            // The viewer sits at the dome centre, so facing the centre is the
            // same as facing the camera and costs no camera lookup.
            slot.lookAt(0, 0, 0);

            const size = entry.angularSize * radius * 2;
            slot.scale.set(size, size, 1);

            const texture = textureForSlot(slot, entry.url);
            if (entry.frameRect && texture) {
                texture.offset.set(entry.frameRect.offsetX, entry.frameRect.offsetY);
                texture.repeat.set(entry.frameRect.repeatX, entry.frameRect.repeatY);
            }

            slot.material.blending = entry.blend === 'additive'
                ? THREE.AdditiveBlending
                : THREE.NormalBlending;
            slot.material.opacity = entry.opacity ?? 1;
            slot.userData.slotKey = entry.key;
            slot.visible = true;
        }

        for (let i = count; i < slots.length; i += 1) {
            slots[i].visible = false;
        }
    }

    function dispose() {
        for (const slot of [...group.children]) {
            slot.geometry.dispose();
            slot.material.dispose();
            group.remove(slot);
        }
        for (const texture of sourceCache.values()) {
            texture.dispose?.();
        }
        sourceCache.clear();
        slots.length = 0;
    }

    return { group, sync, dispose };
}
