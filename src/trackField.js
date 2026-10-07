// Footprints and trails (Sprint 52, owner 2026-10-07: "I want to leave
// footprints as we walk that fade and change based on if we walked on water,
// blood, ice, etc ... enemies leave slime trails too").
//
// Everything that marks the floor -- operator boots, squadmates, enemy slime,
// claws -- goes into one pooled field: two instanced meshes (boot prints and
// round smears), each a ring of slots, so a step costs a few array writes, not
// a new mesh, geometry and material as the old wet prints and snail trails did.
import * as THREE from 'three';

// How each surface marks the floor: colour, opacity, seconds to fade.
export const TRACK_SURFACES = Object.freeze({
    dust: Object.freeze({ color: 0x6f6a60, alpha: 0.24, life: 14 }),
    snow: Object.freeze({ color: 0xe6eef6, alpha: 0.5, life: 60 }),
    water: Object.freeze({ color: 0x2f3d45, alpha: 0.42, life: 22 }),
    blood: Object.freeze({ color: 0x7a0f0f, alpha: 0.58, life: 28 }),
    slime: Object.freeze({ color: 0x4fd06a, alpha: 0.46, life: 24 }),
    oil: Object.freeze({ color: 0x0c0c0d, alpha: 0.56, life: 30 })
});

// Wet surfaces load the boots: the next steps carry them, fading.
export const CARRIED_SURFACES = Object.freeze(new Set(['water', 'blood', 'slime', 'oil']));
export const BOOT_CARRY_DECAY = 0.86;
export const BOOT_CARRY_MIN = 0.17;

/**
 * The boots after a step. `underfoot` is what the step landed in (a carried
 * surface, 'snow', or null for plain floor). Returns { surface, strength } for
 * the print this step leaves, and the boots' state for the next one.
 */
export function stepBoots(boots, underfoot) {
    if (underfoot && CARRIED_SURFACES.has(underfoot)) {
        const next = { surface: underfoot, strength: 1 };
        return { print: { ...next }, boots: next };
    }
    if (boots?.surface && boots.strength * BOOT_CARRY_DECAY >= BOOT_CARRY_MIN) {
        const next = { surface: boots.surface, strength: boots.strength * BOOT_CARRY_DECAY };
        return { print: { ...next }, boots: next };
    }
    return { print: { surface: underfoot === 'snow' ? 'snow' : 'dust', strength: 1 }, boots: null };
}

/** Opacity of a mark `age` seconds old: full, then easing out over its life. */
export function trackAlpha(baseAlpha, age, life) {
    if (!(age >= 0) || !(life > 0) || age >= life) return 0;
    const t = age / life;
    return baseAlpha * (t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
}

// What a snail's slime looks like, by type.
export function slimeColorFor(type = '') {
    if (type.includes('cryo')) return 0xa3e2ff;
    if (type.includes('spore')) return 0x55ff55;
    return 0x2fb8e0;
}

function soleTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(16, 22, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, 52, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function smearTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return null;
    const glow = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

// A per-instance opacity on top of three's per-instance colour.
function withInstanceAlpha(material) {
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute float instanceAlpha;\nvarying float vInstanceAlpha;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceAlpha = instanceAlpha;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vInstanceAlpha;')
            .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vInstanceAlpha;');
    };
    material.customProgramCacheKey = () => 'track-field-instance-alpha';
    return material;
}

class TrackLayer {
    constructor({ width, depth, capacity, texture, name }) {
        const geometry = new THREE.PlaneGeometry(width, depth);
        geometry.rotateX(-Math.PI / 2);
        const material = withInstanceAlpha(new THREE.MeshBasicMaterial({
            map: texture ?? null,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        }));
        this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
        this.mesh.name = name;
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 19;
        this.mesh.userData.isTrackField = true;
        this.alpha = new Float32Array(capacity);
        this.mesh.geometry.setAttribute('instanceAlpha', new THREE.InstancedBufferAttribute(this.alpha, 1));
        this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        this.capacity = capacity;
        this.next = 0;
        this.born = new Float64Array(capacity).fill(-Infinity);
        this.life = new Float32Array(capacity);
        this.base = new Float32Array(capacity);
        this.live = 0;
        const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, hidden);
        this.mesh.instanceMatrix.needsUpdate = true;
        this._matrix = new THREE.Matrix4();
        this._quat = new THREE.Quaternion();
        this._pos = new THREE.Vector3();
        this._scale = new THREE.Vector3();
        this._euler = new THREE.Euler();
        this._color = new THREE.Color();
    }

    add({ x, z, yaw = 0, scale = 1, stretch = 1, color, alpha, life, now }) {
        const slot = this.next;
        this.next = (this.next + 1) % this.capacity;
        this._euler.set(0, yaw, 0);
        this._quat.setFromEuler(this._euler);
        this._pos.set(x, 0.043, z);
        this._scale.set(scale, 1, scale * stretch);
        this._matrix.compose(this._pos, this._quat, this._scale);
        this.mesh.setMatrixAt(slot, this._matrix);
        this.mesh.setColorAt(slot, this._color.setHex(color));
        this.born[slot] = now;
        this.life[slot] = life;
        this.base[slot] = alpha;
        this.alpha[slot] = alpha;
        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor.needsUpdate = true;
        this.mesh.geometry.attributes.instanceAlpha.needsUpdate = true;
        return slot;
    }

    update(now) {
        let live = 0;
        for (let i = 0; i < this.capacity; i++) {
            if (this.base[i] <= 0) continue;
            const alpha = trackAlpha(this.base[i], now - this.born[i], this.life[i]);
            this.alpha[i] = alpha;
            if (alpha <= 0) this.base[i] = 0;
            else live += 1;
        }
        this.live = live;
        this.mesh.geometry.attributes.instanceAlpha.needsUpdate = true;
        return live;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.map?.dispose?.();
        this.mesh.material.dispose();
    }
}

export function createTrackField({ printCapacity = 360, smearCapacity = 320 } = {}) {
    const prints = new TrackLayer({ width: 0.17, depth: 0.3, capacity: printCapacity, texture: soleTexture(), name: 'track-field:prints' });
    const smears = new TrackLayer({ width: 0.5, depth: 0.5, capacity: smearCapacity, texture: smearTexture(), name: 'track-field:smears' });
    const group = new THREE.Group();
    group.name = 'track-field';
    group.userData.isTrackField = true;
    group.add(prints.mesh, smears.mesh);
    let side = 1;

    return {
        group,
        prints,
        smears,
        /** One boot print, offset to alternate feet along the walking direction. */
        addPrint({ x, z, dirX = 0, dirZ = 1, surface = 'dust', strength = 1, color = null, now, scale = 1 }) {
            const look = TRACK_SURFACES[surface] ?? TRACK_SURFACES.dust;
            const len = Math.hypot(dirX, dirZ) || 1;
            const fx = dirX / len;
            const fz = dirZ / len;
            side = -side;
            return prints.add({
                x: x - fx * 0.12 + -fz * side * 0.12,
                z: z - fz * 0.12 + fx * side * 0.12,
                yaw: Math.atan2(fx, fz),
                scale,
                color: color ?? look.color,
                alpha: look.alpha * strength,
                life: look.life,
                now
            });
        },
        /** A smear: slime, a boss's wake; stretched along its direction if given. */
        addSmear({ x, z, dirX = 0, dirZ = 0, size = 1, color, alpha = 0.45, life = 6, now }) {
            const moving = Math.hypot(dirX, dirZ) > 1e-6;
            return smears.add({ x, z, yaw: moving ? Math.atan2(dirX, dirZ) : 0, scale: size * (moving ? 0.7 : 1), stretch: moving ? 1.9 : 1, color, alpha, life, now });
        },
        update(now) {
            return prints.update(now) + smears.update(now);
        },
        dispose() {
            prints.dispose();
            smears.dispose();
            group.removeFromParent();
        }
    };
}

// What a floor prop leaves on boots, by its type (null: nothing).
export function trackSurfaceForType(type) {
    const id = String(type ?? '');
    if (!id) return null;
    if (id.includes('blood')) return 'blood';
    if (id.includes('grease') || id.includes('oil')) return 'oil';
    if (id.includes('slime') || id.includes('bio_sample_spill')) return 'slime';
    if (id.includes('puddle') || id.includes('fluid_seep')) return 'water';
    return null;
}
