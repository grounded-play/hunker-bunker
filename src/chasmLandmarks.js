/**
 * Landmarks rising out of the chasm (N64 world pass, lane F, round 2:
 * docs/planning/n64-architectural-level-design-overhaul-2026-10-10.md §9.10).
 *
 * Every doc in the pass puts one rule first: a place needs a dominant
 * silhouette. The chunk world had none, and a live survey found maze chunks
 * are about 40% canyon void. So each chunk with void raises one landmark out
 * of it, 7-8 m above the rim, a few cells off a ledge so it is framed from
 * the walkable edge: a lattice radio mast in the bunker, a frozen spire in
 * cryo, a giant rib arch in bio. It stands only on void cells, so the grid,
 * pathing and collision never change; the void mask hides its base, so it
 * reads as rising from the depths.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CHASM_LANDMARK = Object.freeze({
    /** Cells of solid void required on every side (its footprint fits inside). */
    clearance: 2,
    /** Cells kept clear of the chunk edge. */
    border: 4,
    /** Distance to the nearest walkable cell, in cells: framed, not touching. */
    minReach: 3,
    maxReach: 8,
    /** The reach it prefers. */
    idealReach: 4.5,
    /** Up to this many per chunk, at least `spacing` cells apart: one per
     * chunk was often outside the isometric camera's ~25 m frame. */
    perChunk: 6,
    spacing: 10,
    /** Height above the rim (metres). Taller ones north of the player ran
     * off the top of the isometric frame. */
    top: Object.freeze({ mast: 8.2, spire: 8.0, arch: 7.0 })
});

const VOID = 'X';
const WALKABLE = new Set(['.', 'O']);

function hash(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
}

// Every valid site in the chunk with its score (lower is better).
function scoredSites(grid, chunkX, chunkY) {
    const size = grid?.length ?? 0;
    const { clearance, border, minReach, maxReach, idealReach } = CHASM_LANDMARK;
    const sites = [];
    for (let y = border; y < size - border; y += 1) {
        for (let x = border; x < size - border; x += 1) {
            if (grid[y][x] !== VOID) continue;
            let solid = true;
            for (let dy = -clearance; dy <= clearance && solid; dy += 1) {
                for (let dx = -clearance; dx <= clearance; dx += 1) {
                    if (grid[y + dy]?.[x + dx] !== VOID) {
                        solid = false;
                        break;
                    }
                }
            }
            if (!solid) continue;
            let reach = Infinity;
            let toward = null;
            for (let dy = -maxReach; dy <= maxReach; dy += 1) {
                for (let dx = -maxReach; dx <= maxReach; dx += 1) {
                    if (!WALKABLE.has(grid[y + dy]?.[x + dx])) continue;
                    const distance = Math.hypot(dx, dy);
                    if (distance < reach) {
                        reach = distance;
                        toward = [dx, dy];
                    }
                }
            }
            if (reach < minReach || reach > maxReach) continue;
            const score = Math.abs(reach - idealReach) + hash(chunkX * 7 + x, chunkY * 13 + y, 0x51) * 1.5;
            sites.push({ x, y, score, facing: Math.atan2(toward[1], toward[0]) });
        }
    }
    return sites.sort((a, b) => a.score - b.score);
}

/**
 * The chunk's landmark sites, best first: up to CHASM_LANDMARK.perChunk,
 * each a void cell inside solid void a few cells off a ledge, at least
 * `spacing` cells apart, with the angle (radians about Y, 0 = +x, grid y as
 * z) that faces the ledge it is seen from. Empty when no ledge looks across
 * void. Deterministic per chunk; never changes the grid.
 */
export function pickChasmLandmarkSites(grid, { chunkX = 0, chunkY = 0 } = {}) {
    const chosen = [];
    for (const site of scoredSites(grid, chunkX, chunkY)) {
        if (chosen.length >= CHASM_LANDMARK.perChunk) break;
        if (chosen.some((other) => Math.hypot(other.x - site.x, other.y - site.y) < CHASM_LANDMARK.spacing)) continue;
        chosen.push({ x: site.x, y: site.y, facing: site.facing });
    }
    return chosen;
}

/** The chunk's best landmark site, or null. */
export function pickChasmLandmarkSite(grid, options = {}) {
    return pickChasmLandmarkSites(grid, options)[0] ?? null;
}

/** The district's landmark form. */
export function chasmLandmarkForm(biome) {
    return biome === 'cryo' ? 'spire' : biome === 'bio' ? 'arch' : 'mast';
}

const UP = new THREE.Vector3(0, 1, 0);

// A cylinder from a to b.
function beam(a, b, radius, segments = 5) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), segments, 1);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
    geometry.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    return geometry;
}

function placed(geometry, [x, y, z], rotation = [0, 0, 0]) {
    geometry.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]);
    return geometry.translate(x, y, z);
}

// A lattice radio mast: four tapering legs, X bracing, a platform, an antenna
// and a red beacon.
function mastParts() {
    const body = [];
    const glow = [];
    const halfAt = (y) => THREE.MathUtils.lerp(1.3, 0.45, (y + 10) / 19);
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    for (const [cx, cz] of corners) {
        body.push(beam([cx * halfAt(-10), -10, cz * halfAt(-10)], [cx * halfAt(9), 9, cz * halfAt(9)], 0.09));
    }
    for (let y = -7.5; y < 9; y += 2.5) {
        const y1 = Math.min(9, y + 2.5);
        for (let i = 0; i < 4; i += 1) {
            const [ax, az] = corners[i];
            const [bx, bz] = corners[(i + 1) % 4];
            body.push(beam([ax * halfAt(y), y, az * halfAt(y)], [bx * halfAt(y1), y1, bz * halfAt(y1)], 0.04, 4));
            body.push(beam([bx * halfAt(y), y, bz * halfAt(y)], [ax * halfAt(y1), y1, az * halfAt(y1)], 0.04, 4));
        }
    }
    body.push(placed(new THREE.BoxGeometry(1.7, 0.12, 1.7), [0, 6, 0]));
    body.push(beam([0, 9, 0], [0, 11.6, 0], 0.06));
    glow.push(placed(new THREE.SphereGeometry(0.18, 8, 6), [0, 11.75, 0]));
    for (const [cx, cz] of corners) glow.push(placed(new THREE.BoxGeometry(0.16, 0.1, 0.16), [cx * 0.78, 6.1, cz * 0.78]));
    return { body, glow };
}

// A frozen spire with three shards breaking from its flank and ice crystals.
function spireParts() {
    const body = [placed(new THREE.ConeGeometry(1.45, 21.5, 7), [0, 0.75, 0])];
    const glow = [];
    for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * Math.PI * 2 + 0.4;
        const tilt = 0.32 + i * 0.05;
        const shard = new THREE.ConeGeometry(0.45, 6 - i, 5);
        shard.rotateZ(-tilt).rotateY(angle);
        body.push(shard.translate(Math.cos(angle) * 1.0, 1.5 + i * 1.6, -Math.sin(angle) * 1.0));
    }
    for (let i = 0; i < 4; i += 1) {
        const angle = i * 1.7;
        glow.push(placed(new THREE.OctahedronGeometry(0.22, 0), [Math.cos(angle) * 0.75, 3 + i * 1.8, Math.sin(angle) * 0.75]));
    }
    return { body, glow };
}

// A giant rib arch out of the depths: two ribs and pustules along them.
function archParts() {
    const body = [];
    const glow = [];
    // Thick ribs: thin ones vanished against the dark bio floor.
    for (const [offset, peak, radius] of [[-0.8, 10.5, 0.46], [0.8, 8.6, 0.38]]) {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.95, -7, offset),
            new THREE.Vector3(-1.9, peak * 0.4, offset * 1.1),
            new THREE.Vector3(-0.6, peak * 0.92, offset * 0.8),
            new THREE.Vector3(0.4, peak, offset * 0.6),
            new THREE.Vector3(1.6, peak * 0.6, offset),
            new THREE.Vector3(1.95, -7, offset * 1.2)
        ]);
        body.push(new THREE.TubeGeometry(curve, 40, radius, 7, false));
        for (let k = 1; k < 6; k += 1) {
            const point = curve.getPointAt(0.18 + k * 0.11);
            glow.push(placed(new THREE.SphereGeometry(0.22 + (k % 2) * 0.08, 7, 5), [point.x, point.y + radius * 0.6, point.z]));
        }
    }
    return { body, glow };
}

// Marks every vertex of a part as body (0) or glow (1).
function marked(geometries, glow) {
    return geometries.map((geometry) => {
        const flat = geometry.toNonIndexed();
        flat.setAttribute('hbGlow', new THREE.Float32BufferAttribute(new Float32Array(flat.getAttribute('position').count).fill(glow), 1));
        return flat;
    });
}

/**
 * The form's geometry, built once and shared: base deep in the chasm (the
 * void mask hides it), top CHASM_LANDMARK.top above the rim, footprint inside
 * the clearance. One material draws it all: `hbGlow` marks the lit parts.
 */
export function createChasmLandmarkGeometry(form) {
    const { body, glow } = form === 'spire' ? spireParts() : form === 'arch' ? archParts() : mastParts();
    const merged = mergeGeometries([...marked(body, 0), ...marked(glow, 1)]);
    merged.computeBoundingBox();
    // Built tall, then brought down to a height the isometric frame holds.
    const top = CHASM_LANDMARK.top[form] ?? CHASM_LANDMARK.top.mast;
    merged.scale(1, top / merged.boundingBox.max.y, 1);
    merged.computeVertexNormals();
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
}

/** On unless `hb_landmarks=0` is stored. */
export function isChasmLandmarksEnabled(storage = globalThis.localStorage) {
    try {
        return storage?.getItem?.('hb_landmarks') !== '0';
    } catch {
        return true;
    }
}

/**
 * The yaw that turns a form toward the ledge at `facing` (grid angle, x
 * east, y south): the arch spans across the line of sight, so its face is
 * what the ledge sees.
 */
export function chasmLandmarkYaw(facing) {
    return Math.PI / 2 - facing;
}

const MAP_LABELS = Object.freeze({ mast: 'RADIO MAST', spire: 'ICE SPIRE', arch: 'RIB ARCH' });

/**
 * The tactical map's entry for a chunk's chief landmark. This camera frames
 * a landmark only within about 12 m, so the map is where it is seen from
 * afar: a top-down game's landmark lives on its map.
 */
export function chasmLandmarkMapEntry(form, x, z) {
    return { id: `chasm_${x},${z}`, x, z, label: MAP_LABELS[form] ?? MAP_LABELS.mast, type: `chasm_${form}` };
}

const LANDMARK_LOOK = Object.freeze({
    mast: { color: 0x3c444c, metalness: 0.7, roughness: 0.45, emissive: 0x000000, glow: [1.6, 0.25, 0.15] },
    spire: { color: 0xbfd8ea, metalness: 0.05, roughness: 0.2, emissive: 0x0e2230, glow: [0.4, 1.1, 1.4], flatShading: true },
    // Bone, light enough to read against the dark bio floor.
    arch: { color: 0x7a6e5c, metalness: 0.1, roughness: 0.55, emissive: 0x141a0c, glow: [0.55, 1.3, 0.3] }
});

/**
 * The form's one material: a lit body, and its `hbGlow` parts (beacon,
 * crystals, pustules) drawn dark and emissive in the district's colour, so a
 * chunk's landmarks of one form are one draw.
 */
export function createChasmLandmarkMaterial(form) {
    const look = LANDMARK_LOOK[form] ?? LANDMARK_LOOK.mast;
    const material = new THREE.MeshStandardMaterial({
        color: look.color,
        metalness: look.metalness,
        roughness: look.roughness,
        emissive: look.emissive,
        flatShading: Boolean(look.flatShading)
    });
    const glowColor = new THREE.Color(...look.glow);
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uGlowColor = { value: glowColor };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute float hbGlow;\nvarying float vHbGlow;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHbGlow = hbGlow;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vHbGlow;\nuniform vec3 uGlowColor;')
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                diffuseColor.rgb *= 1.0 - vHbGlow * 0.9;
                totalEmissiveRadiance += uGlowColor * vHbGlow * 2.0;`);
    };
    material.customProgramCacheKey = () => `hb-chasm-landmark-${form}`;
    return material;
}
