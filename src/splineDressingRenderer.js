import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildPrismTubeGeometry, buildTerminationCollarGeometry } from './splineGeometry.js';

const splineMaterialCache = new Map();

/**
 * Creates bespoke procedural textures for each sector theme.
 * @param {string} key
 * @returns {THREE.CanvasTexture|null}
 */
function createBespokeSplineTexture(key) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
        return null;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        if (key === 'bio') {
            // Bio: Deep glistening dark plum with branching crimson/purple veins & amber nodes
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, 512, 512);

            // Capillary web
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#831843';
            for (let i = 0; i < 18; i += 1) {
                ctx.beginPath();
                ctx.moveTo(0, i * 28);
                ctx.bezierCurveTo(150, (i + 1) * 25, 350, (i - 1) * 30, 512, i * 28);
                ctx.stroke();
            }

            // Glistening veins
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#e11d48';
            for (let i = 0; i < 8; i += 1) {
                ctx.beginPath();
                ctx.moveTo(0, i * 64 + 10);
                ctx.bezierCurveTo(180, i * 64 + 50, 320, i * 64 - 30, 512, i * 64 + 20);
                ctx.stroke();
            }

            // Amber lymph nodes
            ctx.fillStyle = '#f59e0b';
            for (let i = 0; i < 12; i += 1) {
                ctx.beginPath();
                ctx.arc((i * 47) % 512, (i * 73) % 512, 6 + (i % 5), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (key === 'cryo') {
            // Cryo: Pale cyan coolant hose with silver insulation bands and frost patina
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(0, 0, 512, 512);

            // Metallic spiral foil bands
            ctx.fillStyle = '#94a3b8';
            for (let y = 0; y < 512; y += 48) {
                ctx.fillRect(0, y, 512, 12);
            }

            // Frost crystallization bloom
            ctx.fillStyle = 'rgba(224, 242, 254, 0.45)';
            for (let i = 0; i < 24; i += 1) {
                ctx.beginPath();
                ctx.arc((i * 37) % 512, (i * 83) % 512, 14 + (i % 8), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (key === 'camp') {
            // Camp: Twisted natural hemp cordage with moss lichen spots & friction tape
            ctx.fillStyle = '#78350f';
            ctx.fillRect(0, 0, 512, 512);

            // 3-strand rope twist lines
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#b45309';
            for (let y = 0; y < 512; y += 16) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y + 24);
                ctx.stroke();
            }

            // Friction tape patches
            ctx.fillStyle = '#1c1917';
            for (let i = 0; i < 6; i += 1) {
                ctx.fillRect((i * 90) % 512, (i * 70) % 512, 40, 20);
            }

            // Lichen / moss spots
            ctx.fillStyle = '#65a30d';
            for (let i = 0; i < 14; i += 1) {
                ctx.beginPath();
                ctx.arc((i * 53) % 512, (i * 61) % 512, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Bunker: Industrial dark rubber with safety yellow & black hazard stripes
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 512, 512);

            // Diagonal hazard chevrons in upper band
            ctx.fillStyle = '#eab308';
            for (let x = -512; x < 1024; x += 64) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 32, 0);
                ctx.lineTo(x + 160, 256);
                ctx.lineTo(x + 128, 256);
                ctx.closePath();
                ctx.fill();
            }

            // Corrugated rubber ridges in lower band
            ctx.fillStyle = '#0f172a';
            for (let y = 256; y < 512; y += 16) {
                ctx.fillRect(0, y, 512, 6);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    } catch {
        return null;
    }
}

/**
 * Returns a shared MeshStandardMaterial tailored for sector themes.
 * @param {string} theme
 * @returns {THREE.MeshStandardMaterial}
 */
export function getSplineMaterial(theme = 'bunker') {
    const key = theme?.split('-')?.[0] ?? 'bunker';
    if (splineMaterialCache.has(key)) return splineMaterialCache.get(key);

    let color = 0x334155; // Bunker gunmetal
    let roughness = 0.65;
    let metalness = 0.5;

    if (key === 'cryo') {
        color = 0x64748b; // Frosted steel / pale zinc
        roughness = 0.45;
        metalness = 0.6;
    } else if (key === 'bio') {
        color = 0x111827; // Glossy wet black latex / chitin
        roughness = 0.22;
        metalness = 0.18;
    } else if (key === 'camp') {
        color = 0x574332; // Weathered copper / hemp rope
        roughness = 0.85;
        metalness = 0.25;
    }

    const bespokeTexture = createBespokeSplineTexture(key);

    const material = new THREE.MeshStandardMaterial({
        color: bespokeTexture ? 0xffffff : color,
        map: bespokeTexture,
        roughness,
        metalness
    });
    material.name = `splineMat:${key}`;

    splineMaterialCache.set(key, material);
    return material;
}

/**
 * Merges a list of spline definitions into a single THREE.Mesh using at most 1 draw call,
 * with optional extraction of cuttable sub-meshes so they can be severed independently.
 *
 * @param {Array<object>} splineManifest  List of splines and collars from splineRouter
 * @param {object} [options]
 * @param {string} [options.theme='bunker']
 * @param {Function} [options.onCuttableMesh=null] Callback (cuttableMesh, splineItem) => void
 * @returns {THREE.Mesh|null}
 */
export function buildChunkSplinesMesh(splineManifest, { theme = 'bunker', onCuttableMesh = null } = {}) {
    if (!splineManifest || splineManifest.length === 0) return null;

    const staticGeometries = [];
    const material = getSplineMaterial(theme);

    for (const item of splineManifest) {
        // Individual cuttable mesh branch
        if (item.cuttable && typeof onCuttableMesh === 'function') {
            const cuttableGeoms = [];
            if (item.points && item.points.length >= 2) {
                const geom = buildPrismTubeGeometry(item.points, {
                    radius: item.radius ?? 0.035,
                    sides: item.sides ?? 4,
                    vAtlasOffset: item.vAtlasOffset ?? 0.0,
                    vAtlasScale: item.vAtlasScale ?? 0.25,
                    vRepeat: 1.0
                });
                if (geom) cuttableGeoms.push(geom);
            }
            for (const collar of item.collars ?? []) {
                const collarGeom = buildTerminationCollarGeometry(collar.pos, collar.normal, {
                    radius: collar.radius ?? item.radius ?? 0.035,
                    sides: collar.sides ?? 6,
                    vAtlasOffset: collar.vAtlasOffset ?? 0.75,
                    vAtlasScale: collar.vAtlasScale ?? 0.25
                });
                if (collarGeom) cuttableGeoms.push(collarGeom);
            }

            if (cuttableGeoms.length > 0) {
                const mergedCuttableGeom = cuttableGeoms.length === 1 ? cuttableGeoms[0] : mergeGeometries(cuttableGeoms, false);
                if (mergedCuttableGeom) {
                    const cuttableMesh = new THREE.Mesh(mergedCuttableGeom, material);
                    cuttableMesh.name = `cuttable-spline-${item.id}`;
                    cuttableMesh.castShadow = true;
                    cuttableMesh.receiveShadow = true;
                    cuttableMesh.userData = {
                        isSplineDressing: true,
                        isCuttableSpline: true,
                        splineId: item.id
                    };
                    onCuttableMesh(cuttableMesh, item);
                }
            }
            continue;
        }

        // Static merged branch
        if (item.category === 'termination_collar') {
            const collarGeom = buildTerminationCollarGeometry(item.pos, item.normal, {
                radius: item.radius ?? 0.035,
                sides: item.sides ?? 6,
                vAtlasOffset: item.vAtlasOffset ?? 0.75,
                vAtlasScale: item.vAtlasScale ?? 0.25
            });
            if (collarGeom) staticGeometries.push(collarGeom);
            continue;
        }

        if (item.points && item.points.length >= 2) {
            const geom = buildPrismTubeGeometry(item.points, {
                radius: item.radius ?? 0.035,
                sides: item.sides ?? 4,
                vAtlasOffset: item.vAtlasOffset ?? 0.0,
                vAtlasScale: item.vAtlasScale ?? 0.25,
                vRepeat: 1.0
            });
            if (geom) staticGeometries.push(geom);
        }

        // Generate any attached end collars for clean physical terminations
        for (const collar of item.collars ?? []) {
            const collarGeom = buildTerminationCollarGeometry(collar.pos, collar.normal, {
                radius: collar.radius ?? item.radius ?? 0.035,
                sides: collar.sides ?? 6,
                vAtlasOffset: collar.vAtlasOffset ?? 0.75,
                vAtlasScale: collar.vAtlasScale ?? 0.25
            });
            if (collarGeom) staticGeometries.push(collarGeom);
        }
    }

    if (staticGeometries.length === 0) return null;

    const mergedGeometry = staticGeometries.length === 1 ? staticGeometries[0] : mergeGeometries(staticGeometries, false);

    // Free intermediate unmerged CPU buffers immediately
    for (const geom of staticGeometries) {
        if (geom !== mergedGeometry) geom.dispose();
    }

    if (!mergedGeometry) return null;

    const mesh = new THREE.Mesh(mergedGeometry, material);
    mesh.name = 'chunk-splines-batch';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
        isSplineDressing: true,
        blocking: false,
        destructible: false,
        splineCount: splineManifest.length
    };

    return mesh;
}

/**
 * Cleanly disposes a spline mesh's GPU buffer geometry on chunk unload.
 * @param {THREE.Mesh} mesh
 */
export function disposeSplineMesh(mesh) {
    if (!mesh) return;
    if (mesh.geometry) {
        mesh.geometry.dispose();
    }
    if (mesh.parent) {
        mesh.parent.remove(mesh);
    }
}
