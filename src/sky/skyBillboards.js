import * as THREE from 'three';
import { createSkySpriteMaterial, updateSkySpriteMaterial, SPRITE_MODES } from './skySpriteMaterial.js';

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
    // The sprite material samples two atlas cells so slow bodies can cross-fade
    // between frames, and carries the procedural surface modes for the assets
    // that deliberately get no atlas at all.
    const material = createSkySpriteMaterial();
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

    // One texture per url, shared freely between slots. This used to need a
    // per-slot clone, because the frame window lived in texture.offset and two
    // billboards showing different frames of one atlas would fight over it.
    // The window now lives in the material, so the conflict cannot arise and
    // the clone is gone -- one upload per atlas instead of one per slot.
    const sourceCache = new Map();
    function textureForSlot(slot, url) {
        let texture = sourceCache.get(url);
        if (!texture) {
            texture = textureLoader.load(url);
            sourceCache.set(url, texture);
        }
        slot.userData.sourceUrl = url;
        return texture;
    }

    // `radius` is the dome radius the billboards sit on, passed in so the pool
    // does not need to know how the rig is built.
    function sync(entries, radius, elapsedSeconds = 0) {
        const count = Math.min(entries.length, slots.length);

        for (let i = 0; i < count; i += 1) {
            const entry = entries[i];
            const slot = slots[i];
            const { direction } = entry;

            if (direction.y <= HORIZON_EPSILON) {
                slot.visible = false;
                continue;
            }

            // Depth tier: nearer bodies ride a smaller shell so the sky has a
            // front-to-back read instead of everything pasted on one surface.
            const shell = radius * (entry.radiusScale ?? 1);
            const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
            slot.position.set(
                (direction.x / length) * shell,
                (direction.y / length) * shell,
                (direction.z / length) * shell
            );
            // The viewer sits at the dome centre, so facing the centre is the
            // same as facing the camera and costs no camera lookup.
            slot.lookAt(0, 0, 0);

            // Scale off the body's own shell, so a given angular size subtends
            // the same apparent size on every tier -- tiering must change depth,
            // not silently resize things.
            const size = entry.angularSize * shell * 2;
            slot.scale.set(size, size, 1);

            const texture = textureForSlot(slot, entry.url);
            // The frame window lives in the material, not on the texture: the
            // shader needs two windows at once, and a texture offset can only
            // express one.
            const fullFrame = { offsetX: 0, offsetY: 0, repeatX: 1, repeatY: 1 };
            updateSkySpriteMaterial(slot.material, {
                map: texture,
                rectA: entry.frameRect ?? fullFrame,
                rectB: entry.frameRectB ?? null,
                mix: entry.frameMix ?? 0,
                opacity: entry.opacity ?? 1,
                tint: entry.tint ?? { r: 1, g: 1, b: 1 },
                time: elapsedSeconds,
                additive: entry.blend === 'additive',
                mode: entry.spriteMode ?? SPRITE_MODES.NONE
            });

            slot.material.blending = entry.blend === 'additive'
                ? THREE.AdditiveBlending
                : THREE.NormalBlending;
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
