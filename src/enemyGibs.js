import * as THREE from 'three';
import { isGoreEnabled } from './featureFlags.js';

/**
 * Enemy dismemberment.
 *
 * The enemy GLBs in public/3d/runtime are single-mesh photoscan blobs -- one
 * mesh, one primitive, no authored parts -- so there is nothing in them to pull
 * apart. Rather than hand-fracturing twenty models in Blender and shipping
 * twenty more GLBs (the Steam Deck load budget is already a tracked concern),
 * each model is fractured once at runtime, the first time that enemy type dies,
 * and the resulting chunks are cached for the rest of the session.
 *
 * The fracture is a spatial clustering of triangles: pick well-spread seed
 * points across the mesh, assign every triangle to its nearest seed, and emit
 * one geometry per cluster. That yields chunks that read as broken-off pieces
 * rather than sliced planes, needs no new art, and covers every enemy type --
 * including community skins and anything added later -- automatically.
 */

export const GIB_CHUNK_COUNT = 8;

/** Relaxation passes applied after seeding; see fractureGeometry. */
const LLOYD_PASSES = 4;

/** type -> chunk geometries. An empty array is a cached miss, not a retry. */
const gibCache = new Map();

export function clearGibCache() {
    for (const chunks of gibCache.values()) {
        for (const chunk of chunks) chunk.dispose?.();
    }
    gibCache.clear();
}

function triangleCentroid(pos, tri, out) {
    const i = tri * 9;
    out.set(
        (pos[i] + pos[i + 3] + pos[i + 6]) / 3,
        (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3,
        (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3
    );
    return out;
}

/**
 * Choose `count` triangle indices spread as widely as possible across the mesh,
 * by farthest-point sampling. Deterministic: no RNG, so the same model always
 * breaks the same way and the chunks can be cached and compared in tests.
 */
function pickSeeds(centroids, count) {
    const total = centroids.length;
    if (total === 0) return [];

    // Start from the triangle nearest the mesh centre so the first chunk is a
    // core piece rather than an arbitrary extremity.
    const mid = new THREE.Vector3();
    for (const c of centroids) mid.add(c);
    mid.divideScalar(total);

    let first = 0;
    let bestDist = Infinity;
    for (let i = 0; i < total; i++) {
        const d = centroids[i].distanceToSquared(mid);
        if (d < bestDist) {
            bestDist = d;
            first = i;
        }
    }

    const seeds = [first];
    const nearest = centroids.map((c) => c.distanceToSquared(centroids[first]));

    while (seeds.length < Math.min(count, total)) {
        let pick = -1;
        let picked = -1;
        for (let i = 0; i < total; i++) {
            if (nearest[i] > picked) {
                picked = nearest[i];
                pick = i;
            }
        }
        if (pick < 0) break;
        seeds.push(pick);
        for (let i = 0; i < total; i++) {
            const d = centroids[i].distanceToSquared(centroids[pick]);
            if (d < nearest[i]) nearest[i] = d;
        }
    }

    return seeds;
}

/**
 * Split `geometry` into at most `count` chunk geometries.
 *
 * Each chunk is recentred on its own centroid, with the offset back to the
 * corpse's local space stored on `userData.offset` -- chunks are flung
 * independently, so they must spin about themselves rather than orbit the
 * point of death.
 *
 * Returns [] for geometry with nothing to fracture.
 */
export function fractureGeometry(geometry, count = GIB_CHUNK_COUNT) {
    if (!geometry?.getAttribute) return [];

    const indexed = geometry.index ? geometry.toNonIndexed() : geometry;
    const posAttr = indexed.getAttribute('position');
    if (!posAttr || posAttr.count < 3) return [];

    const pos = posAttr.array;
    const triCount = Math.floor(posAttr.count / 3);
    if (triCount === 0) return [];

    const centroids = [];
    for (let t = 0; t < triCount; t++) {
        centroids.push(triangleCentroid(pos, t, new THREE.Vector3()));
    }

    const seedIndices = pickSeeds(centroids, count);
    if (seedIndices.length === 0) return [];

    // Farthest-point seeding alone parks every seed on an extremity, so the one
    // nearest the middle swallows the whole torso -- on the cyber-snail that was
    // 39% of the mesh in one chunk and 1% in another. A few Lloyd relaxation
    // passes pull the seeds toward the centres of what they actually captured,
    // which evens the chunks out without costing determinism.
    let seeds = seedIndices.map((i) => centroids[i].clone());
    let buckets = [];

    for (let pass = 0; pass <= LLOYD_PASSES; pass++) {
        buckets = seeds.map(() => []);
        for (let t = 0; t < triCount; t++) {
            let best = 0;
            let bestDist = Infinity;
            for (let s = 0; s < seeds.length; s++) {
                const d = centroids[t].distanceToSquared(seeds[s]);
                if (d < bestDist) {
                    bestDist = d;
                    best = s;
                }
            }
            buckets[best].push(t);
        }
        if (pass === LLOYD_PASSES) break;
        seeds = seeds.map((seed, s) => {
            const bucket = buckets[s];
            if (bucket.length === 0) return seed;
            const mean = new THREE.Vector3();
            for (const t of bucket) mean.add(centroids[t]);
            return mean.divideScalar(bucket.length);
        });
    }

    const normAttr = indexed.getAttribute('normal');
    const uvAttr = indexed.getAttribute('uv');
    const chunks = [];

    for (const bucket of buckets) {
        if (bucket.length === 0) continue;

        const verts = bucket.length * 3;
        const chunkPos = new Float32Array(verts * 3);
        const chunkNorm = normAttr ? new Float32Array(verts * 3) : null;
        const chunkUv = uvAttr ? new Float32Array(verts * 2) : null;

        const offset = new THREE.Vector3();
        for (const t of bucket) offset.add(centroids[t]);
        offset.divideScalar(bucket.length);

        let w = 0;
        for (const t of bucket) {
            for (let v = 0; v < 3; v++) {
                const src = t * 9 + v * 3;
                const dst = w * 3;
                chunkPos[dst] = pos[src] - offset.x;
                chunkPos[dst + 1] = pos[src + 1] - offset.y;
                chunkPos[dst + 2] = pos[src + 2] - offset.z;
                if (chunkNorm) {
                    const n = normAttr.array;
                    chunkNorm[dst] = n[src];
                    chunkNorm[dst + 1] = n[src + 1];
                    chunkNorm[dst + 2] = n[src + 2];
                }
                if (chunkUv) {
                    const u = uvAttr.array;
                    const su = t * 6 + v * 2;
                    chunkUv[w * 2] = u[su];
                    chunkUv[w * 2 + 1] = u[su + 1];
                }
                w += 1;
            }
        }

        const chunk = new THREE.BufferGeometry();
        chunk.setAttribute('position', new THREE.BufferAttribute(chunkPos, 3));
        if (chunkNorm) chunk.setAttribute('normal', new THREE.BufferAttribute(chunkNorm, 3));
        if (chunkUv) chunk.setAttribute('uv', new THREE.BufferAttribute(chunkUv, 2));
        chunk.userData.offset = offset;
        chunks.push(chunk);
    }

    return chunks;
}

/**
 * Collect a visual's meshes into one geometry expressed in the visual root's
 * local frame, plus a material to shade the chunks with.
 *
 * The GLB inside an enemy visual is normalised, yawed and rescaled by
 * createEnemy3dVisual, so raw mesh geometry is neither the right size nor the
 * right orientation. Each mesh is baked through its transform *relative to the
 * root* -- the root's own transform is deliberately excluded, because the gib
 * group re-applies it at spawn time and baking it here would apply it twice.
 */
export function extractGibSource(root) {
    if (!root?.traverse) return null;

    root.updateMatrixWorld(true);
    const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const positions = [];
    const normals = [];
    let material = null;
    let hasNormals = true;

    root.traverse((object) => {
        if (!object.isMesh || !object.geometry) return;
        const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry;
        const posAttr = geo.getAttribute('position');
        if (!posAttr) return;

        if (!material) {
            material = Array.isArray(object.material) ? object.material[0] : object.material;
        }

        const matrix = new THREE.Matrix4().multiplyMatrices(toLocal, object.matrixWorld);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
        const normAttr = geo.getAttribute('normal');
        if (!normAttr) hasNormals = false;

        const v = new THREE.Vector3();
        const n = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
            v.fromBufferAttribute(posAttr, i).applyMatrix4(matrix);
            positions.push(v.x, v.y, v.z);
            if (normAttr) {
                n.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize();
                normals.push(n.x, n.y, n.z);
            }
        }
    });

    if (positions.length < 9) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    if (hasNormals && normals.length === positions.length) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    } else {
        geometry.computeVertexNormals();
    }

    return { geometry, material };
}

/**
 * Chunks for one enemy type, fractured on first use.
 *
 * `sourceGeometry` is a thunk so the (possibly expensive) merge of the model's
 * geometry only happens on a cache miss. A model that yields nothing caches the
 * empty result: without that, every single death of an unfracturable type would
 * retry the whole walk.
 */
export function getGibChunks(type, sourceGeometry, count = GIB_CHUNK_COUNT) {
    if (!type) return [];
    const cached = gibCache.get(type);
    if (cached) return cached;

    let chunks = [];
    try {
        chunks = fractureGeometry(sourceGeometry?.(), count);
    } catch (err) {
        console.warn(`[enemy-gibs] fracture failed for ${type}`, err);
        chunks = [];
    }

    gibCache.set(type, chunks);
    return chunks;
}

// Matches threeGame's ballistic-debris tuning so gibs fall like the rest of
// the game's physical particles rather than on their own curve.
const GIB_GRAVITY = 7.0;
const GIB_DRAG = 2.2;
const GIB_BOUNCE = -0.45;
const GIB_LIFETIME = 2.6;

/** Shared across every chunk of every corpse -- interiors are all the same meat. */
let cutMaterial = null;
function getCutMaterial() {
    if (!cutMaterial) {
        cutMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a0d12,
            side: THREE.BackSide,
            transparent: true,
            opacity: 1
        });
    }
    return cutMaterial;
}

/**
 * Blow an enemy's 3D visual apart into physical chunks.
 *
 * Returns false when it declines (gore off, no visual, unfracturable model) so
 * the caller can fall through to the plain death burst. The corpse sprite is
 * NOT this function's business: it still drops separately and stays
 * collectable, so the shell economy is unaffected by anything here.
 */
export function spawnEnemyGibs(game, sprite, { direction = null, isBoss = false } = {}) {
    if (!isGoreEnabled()) return false;
    if (!game?.scene || !sprite) return false;

    const visual = sprite.userData?.enemy3dVisual;
    const root = visual?.root;
    if (!root) return false;

    const type = sprite.userData.modelVariant ?? sprite.userData.type;
    let source = null;
    const chunks = getGibChunks(type, () => {
        source = extractGibSource(root);
        return source?.geometry ?? null;
    });
    if (!chunks.length) return false;

    // Only resolve a material on the frame we actually spawn; the cached
    // chunk list may long outlive the visual it was fractured from.
    const baseMaterial = source?.material ?? findFirstMaterial(root);

    root.updateMatrixWorld(true);
    const group = new THREE.Group();
    group.position.setFromMatrixPosition(root.matrixWorld);
    group.quaternion.setFromRotationMatrix(root.matrixWorld);
    group.scale.setFromMatrixScale(root.matrixWorld);

    const pieces = [];
    const skinMaterial = baseMaterial?.clone?.() ?? new THREE.MeshBasicMaterial({ color: 0x6b7280 });
    skinMaterial.transparent = true;
    skinMaterial.side = THREE.FrontSide;
    skinMaterial.skinning = false;

    const dirX = direction?.x ?? 0;
    const dirZ = direction?.z ?? 0;
    const kick = isBoss ? 1.5 : 1.0;

    for (const chunk of chunks) {
        const holder = new THREE.Group();
        holder.position.copy(chunk.userData.offset);

        const skin = new THREE.Mesh(chunk, skinMaterial);
        skin.frustumCulled = false;
        skin.renderOrder = 26;
        holder.add(skin);

        // Second pass over the same geometry renders only the faces the
        // fracture exposed, so a chunk reads as meat inside rather than a
        // hollow shell you can see through.
        const cut = new THREE.Mesh(chunk, getCutMaterial());
        cut.frustumCulled = false;
        cut.renderOrder = 25;
        holder.add(cut);

        group.add(holder);

        const outward = chunk.userData.offset.clone().normalize();
        const spin = () => (Math.random() - 0.5) * 7;
        pieces.push({
            holder,
            vx: (outward.x * 1.6 + dirX * 1.1 + (Math.random() - 0.5) * 0.7) * kick,
            vy: (1.9 + Math.random() * 1.7) * kick,
            vz: (outward.z * 1.6 + dirZ * 1.1 + (Math.random() - 0.5) * 0.7) * kick,
            rx: spin(),
            ry: spin(),
            rz: spin()
        });
    }

    game.scene.add(group);

    const splat = makeGroundSplat(group.position, isBoss);
    if (splat) game.scene.add(splat);

    game.spawnTextureBurstEffect?.(group.position.x, group.position.z, {
        textureKey: 'fx_spark_burst',
        color: 0x8c1220,
        count: isBoss ? 5 : 3,
        baseScale: isBoss ? 0.9 : 0.55,
        duration: 0.45,
        speed: 0.3,
        rise: 0.2,
        opacity: 0.9,
        renderOrder: 30
    });

    const duration = GIB_LIFETIME;
    game.transientEffects?.push({
        mesh: group,
        age: 0,
        duration,
        update(delta) {
            this.age += delta;
            const t = Math.min(this.age / duration, 1);
            const dragMul = Math.exp(-GIB_DRAG * delta);
            for (const p of pieces) {
                p.vy -= GIB_GRAVITY * delta;
                p.vx *= dragMul;
                p.vz *= dragMul;
                p.holder.position.x += p.vx * delta;
                p.holder.position.y += p.vy * delta;
                p.holder.position.z += p.vz * delta;
                p.holder.rotation.x += p.rx * delta;
                p.holder.rotation.y += p.ry * delta;
                p.holder.rotation.z += p.rz * delta;
                if (p.holder.position.y <= 0.02) {
                    p.holder.position.y = 0.02;
                    p.vy *= GIB_BOUNCE;
                    p.vx *= 0.7;
                    p.vz *= 0.7;
                    p.rx *= 0.5;
                    p.ry *= 0.5;
                    p.rz *= 0.5;
                }
            }
            // Hold the pieces on the ground, then fade only at the very end.
            const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
            skinMaterial.opacity = Math.max(0, fade);
            if (splat) splat.material.opacity = Math.max(0, 0.55 * fade);
        },
        dispose() {
            // Chunk geometries are cached and shared between deaths -- dispose
            // the per-corpse materials only, never the geometry.
            skinMaterial.dispose();
            if (splat) {
                splat.geometry.dispose();
                splat.material.dispose();
                splat.parent?.remove(splat);
            }
        }
    });

    return true;
}

function findFirstMaterial(root) {
    let found = null;
    root.traverse((object) => {
        if (found || !object.isMesh || !object.material) return;
        found = Array.isArray(object.material) ? object.material[0] : object.material;
    });
    return found;
}

function makeGroundSplat(position, isBoss) {
    const size = isBoss ? 2.6 : 1.3;
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
        color: 0x5c0f16,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
    });
    const splat = new THREE.Mesh(geometry, material);
    splat.rotation.x = -Math.PI / 2;
    splat.position.set(position.x, 0.012, position.z);
    splat.renderOrder = 4;
    return splat;
}

/**
 * Fracture an enemy type ahead of time, so the first kill does not pay for it.
 *
 * The fracture costs ~100ms on a 30k-triangle model -- six frames, which is
 * very visible if it lands on the frame an enemy dies. This is called from the
 * 3D preload pass, which already walks every type on a background task with a
 * real delay between models, so the work lands somewhere nothing is watching.
 * Safe to call repeatedly: it is a cache fill and a no-op once warm.
 */
export function prewarmEnemyGibs(type, root) {
    if (!type || !root) return false;
    const chunks = getGibChunks(type, () => extractGibSource(root)?.geometry ?? null);
    return chunks.length > 0;
}
