import * as THREE from 'three';

/**
 * Fast catenary approximation (parabolic sag under uniform gravitational field).
 *
 * For sag << span, the error vs true cosh() catenary is < 1.5%, which is visually
 * indistinguishable and runs in O(N) with zero hyperbolic math.
 *
 * @param {THREE.Vector3|number[]} p0  Start coordinate
 * @param {THREE.Vector3|number[]} p1  End coordinate
 * @param {number} [sag=0.25]          Downward sag in meters at center
 * @param {number} [segments=6]        Number of tubular segments
 * @returns {THREE.Vector3[]}
 */
export function evaluateCatenaryPoints(p0, p1, sag = 0.25, segments = 6) {
    const start = Array.isArray(p0) ? new THREE.Vector3(...p0) : p0.clone();
    const end = Array.isArray(p1) ? new THREE.Vector3(...p1) : p1.clone();
    const segs = Math.max(2, Math.floor(segments));
    const points = [];

    for (let i = 0; i <= segs; i += 1) {
        const t = i / segs;
        // Linear baseline
        const x = THREE.MathUtils.lerp(start.x, end.x, t);
        const z = THREE.MathUtils.lerp(start.z, end.z, t);
        // Parabolic sag (4 * sag * t * (1 - t) peaks at t=0.5 with value `sag`)
        const linearY = THREE.MathUtils.lerp(start.y, end.y, t);
        const droop = 4 * sag * t * (1 - t);
        const y = linearY - droop;

        points.push(new THREE.Vector3(x, y, z));
    }
    return points;
}

/**
 * Rounds 90-degree orthogonal Manhattan corners with circular arc fillets.
 *
 * @param {Array<THREE.Vector3|number[]>} rawWaypoints  Path corners [p0, p1, p2, ...]
 * @param {number} [filletRadius=0.12]                  Corner curve radius in meters
 * @param {number} [filletSegments=3]                   Subdivision per rounded corner
 * @returns {THREE.Vector3[]}
 */
export function evaluateFilletedManhattanPoints(rawWaypoints, filletRadius = 0.12, filletSegments = 3) {
    if (!rawWaypoints || rawWaypoints.length < 2) return [];
    const waypoints = rawWaypoints.map((p) => Array.isArray(p) ? new THREE.Vector3(...p) : p.clone());
    if (waypoints.length === 2) return waypoints;

    const result = [waypoints[0].clone()];
    const segs = Math.max(1, Math.floor(filletSegments));

    for (let i = 1; i < waypoints.length - 1; i += 1) {
        const prev = waypoints[i - 1];
        const curr = waypoints[i];
        const next = waypoints[i + 1];

        const dPrev = new THREE.Vector3().subVectors(prev, curr);
        const dNext = new THREE.Vector3().subVectors(next, curr);
        const lenPrev = dPrev.length();
        const lenNext = dNext.length();

        // If segments are too short for the desired fillet radius, clamp to half the leg
        const maxR = Math.min(lenPrev * 0.45, lenNext * 0.45, filletRadius);

        if (maxR < 0.01 || lenPrev < 1e-4 || lenNext < 1e-4) {
            result.push(curr.clone());
            continue;
        }

        dPrev.normalize();
        dNext.normalize();

        const startPt = new THREE.Vector3().copy(curr).addScaledVector(dPrev, maxR);
        const endPt = new THREE.Vector3().copy(curr).addScaledVector(dNext, maxR);

        // Quadratic bezier approximation of the 90-degree corner
        for (let j = 0; j <= segs; j += 1) {
            const t = j / segs;
            const oneMinusT = 1 - t;
            // B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P_curr + t^2 * P_end
            const px = (oneMinusT * oneMinusT * startPt.x) + (2 * oneMinusT * t * curr.x) + (t * t * endPt.x);
            const py = (oneMinusT * oneMinusT * startPt.y) + (2 * oneMinusT * t * curr.y) + (t * t * endPt.y);
            const pz = (oneMinusT * oneMinusT * startPt.z) + (2 * oneMinusT * t * curr.z) + (t * t * endPt.z);
            result.push(new THREE.Vector3(px, py, pz));
        }
    }

    result.push(waypoints[waypoints.length - 1].clone());
    return result;
}

/**
 * Computes Rotation Minimizing Frames (Parallel Transport Frames) along a 3D path.
 *
 * Prevents gimbal flip, pinching, and unnatural twisting that occurs with standard
 * Frenet-Serret frames on vertical rises (T = [0, 1, 0]).
 *
 * @param {THREE.Vector3[]} points  Path points
 * @returns {Array<{ position: THREE.Vector3, tangent: THREE.Vector3, normal: THREE.Vector3, binormal: THREE.Vector3 }>}
 */
export function computeParallelTransportFrames(points) {
    const count = points.length;
    if (count < 2) return [];

    const frames = new Array(count);
    const tangents = new Array(count);

    // 1. Calculate normalized tangents
    for (let i = 0; i < count; i += 1) {
        if (i === 0) {
            tangents[0] = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
        } else if (i === count - 1) {
            tangents[count - 1] = new THREE.Vector3().subVectors(points[count - 1], points[count - 2]).normalize();
        } else {
            tangents[i] = new THREE.Vector3().subVectors(points[i + 1], points[i - 1]).normalize();
        }
        if (tangents[i].lengthSq() < 1e-6) tangents[i].set(0, 0, 1);
    }

    // 2. Initialize first frame (i = 0) with world UP reference
    const t0 = tangents[0];
    let up = new THREE.Vector3(0, 1, 0);
    // If tangent is parallel to world UP, pick world FORWARD
    if (Math.abs(t0.dot(up)) > 0.95) {
        up.set(0, 0, 1);
    }
    const r0 = new THREE.Vector3().crossVectors(t0, up).normalize();
    const s0 = new THREE.Vector3().crossVectors(t0, r0).normalize();

    frames[0] = {
        position: points[0],
        tangent: t0,
        normal: r0,
        binormal: s0
    };

    // 3. Propagate frames using Householder double reflection
    for (let i = 0; i < count - 1; i += 1) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const t1 = tangents[i];
        const t2 = tangents[i + 1];
        const r1 = frames[i].normal;

        const v1 = new THREE.Vector3().subVectors(p2, p1);
        const c1 = v1.lengthSq();

        let r2;
        if (c1 > 1e-8) {
            const r1L = r1.clone().addScaledVector(v1, -2 / c1 * v1.dot(r1));
            const t1L = t1.clone().addScaledVector(v1, -2 / c1 * v1.dot(t1));
            const v2 = new THREE.Vector3().subVectors(t2, t1L);
            const c2 = v2.lengthSq();
            if (c2 > 1e-8) {
                r2 = r1L.clone().addScaledVector(v2, -2 / c2 * v2.dot(r1L));
            } else {
                r2 = r1L;
            }
        } else {
            r2 = r1.clone();
        }

        r2.normalize();
        const s2 = new THREE.Vector3().crossVectors(t2, r2).normalize();

        frames[i + 1] = {
            position: points[i + 1],
            tangent: t2,
            normal: r2,
            binormal: s2
        };
    }

    return frames;
}

/**
 * Builds an ultra-low-poly prismatic tube geometry (3 to 6-sided) along a 3D path.
 *
 * Attributes generated:
 * - position: Float32Array
 * - normal: Float32Array (smooth cylinder normals)
 * - uv: Float32Array (u: 0..1 around perimeter; v: atlas-band mapped along length)
 *
 * @param {THREE.Vector3[]} points
 * @param {object} [options]
 * @param {number} [options.radius=0.035]       Tube radius in meters
 * @param {number} [options.sides=4]            Number of polygon sides (3: rope/cable, 4: conduit, 6: pipe)
 * @param {number} [options.vAtlasOffset=0.0]   Vertical offset in texture atlas (0.0 to 1.0)
 * @param {number} [options.vAtlasScale=0.25]   Height of texture band in atlas (e.g. 0.25 for 4 bands)
 * @param {number} [options.vRepeat=1.0]        Texture repeats per meter of tube length
 * @param {number} [options.layer]              Texture-array layer: when set, v runs unbroken along
 *                                              the tube and every vertex carries `splineLayer`
 * @returns {THREE.BufferGeometry|null}
 */
export function buildPrismTubeGeometry(points, {
    radius = 0.035,
    sides = 4,
    vAtlasOffset = 0.0,
    vAtlasScale = 0.25,
    vRepeat = 1.0,
    layer = null
} = {}) {
    if (!points || points.length < 2) return null;

    const frames = computeParallelTransportFrames(points);
    if (frames.length < 2) return null;

    const ringCount = frames.length;
    const sideCount = Math.max(3, Math.min(12, Math.floor(sides)));
    // (sideCount + 1) vertices per ring so UV.u wraps cleanly from 0.0 to 1.0
    const ringVerts = sideCount + 1;
    const totalVerts = ringCount * ringVerts;
    const totalIndices = (ringCount - 1) * sideCount * 6;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = (totalVerts < 65536) ? new Uint16Array(totalIndices) : new Uint32Array(totalIndices);

    // Compute cumulative arc length along path
    const arcLengths = new Float32Array(ringCount);
    arcLengths[0] = 0;
    for (let i = 1; i < ringCount; i += 1) {
        arcLengths[i] = arcLengths[i - 1] + frames[i].position.distanceTo(frames[i - 1].position);
    }

    let vIdx = 0;
    let uvIdx = 0;

    for (let i = 0; i < ringCount; i += 1) {
        const frame = frames[i];
        const center = frame.position;
        const R = frame.normal;
        const S = frame.binormal;
        const vLength = arcLengths[i] * vRepeat;
        // Array layers repeat on their own, so v runs on unbroken (a wrapped
        // atlas v smears a whole band across the wrapping quad).
        const vCoord = Number.isFinite(layer) ? vLength : vAtlasOffset + (vLength % 1.0) * vAtlasScale;

        for (let j = 0; j <= sideCount; j += 1) {
            const uFrac = j / sideCount;
            const angle = uFrac * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Unit normal on circle
            const nx = (R.x * cos) + (S.x * sin);
            const ny = (R.y * cos) + (S.y * sin);
            const nz = (R.z * cos) + (S.z * sin);

            positions[vIdx] = center.x + nx * radius;
            positions[vIdx + 1] = center.y + ny * radius;
            positions[vIdx + 2] = center.z + nz * radius;

            normals[vIdx] = nx;
            normals[vIdx + 1] = ny;
            normals[vIdx + 2] = nz;

            uvs[uvIdx] = uFrac;
            uvs[uvIdx + 1] = vCoord;

            vIdx += 3;
            uvIdx += 2;
        }
    }

    // Build index buffer quads
    let iIdx = 0;
    for (let i = 0; i < ringCount - 1; i += 1) {
        const ringA = i * ringVerts;
        const ringB = (i + 1) * ringVerts;

        for (let j = 0; j < sideCount; j += 1) {
            const a = ringA + j;
            const b = ringA + j + 1;
            const c = ringB + j + 1;
            const d = ringB + j;

            // Two triangles per quad: (a, d, c) and (a, c, b)
            indices[iIdx] = a;
            indices[iIdx + 1] = d;
            indices[iIdx + 2] = c;
            indices[iIdx + 3] = a;
            indices[iIdx + 4] = c;
            indices[iIdx + 5] = b;

            iIdx += 6;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (Number.isFinite(layer)) geometry.setAttribute('splineLayer', new THREE.BufferAttribute(new Float32Array(totalVerts).fill(layer), 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    return geometry;
}

/**
 * Builds a low-poly beveled mounting flange/collar geometry where a pipe/wire terminates
 * on a wall, floor, or ceiling surface.
 *
 * @param {THREE.Vector3|number[]} pos      Surface contact point
 * @param {THREE.Vector3|number[]} normal   Outward surface normal
 * @param {object} [options]
 * @param {number} [options.radius=0.035]   Inner pipe radius
 * @param {number} [options.sides=6]        Number of radial sides (default 6 for hex flange)
 * @param {number} [options.vAtlasOffset=0.75]
 * @param {number} [options.vAtlasScale=0.25]
 * @param {number} [options.layer]           Texture-array layer (see buildPrismTubeGeometry)
 * @returns {THREE.BufferGeometry|null}
 */
export function buildTerminationCollarGeometry(pos, normal, {
    radius = 0.035,
    sides = 6,
    vAtlasOffset = 0.75,
    vAtlasScale = 0.25,
    layer = null
} = {}) {
    const center = Array.isArray(pos) ? new THREE.Vector3(...pos) : pos.clone();
    const N = Array.isArray(normal) ? new THREE.Vector3(...normal).normalize() : normal.clone().normalize();
    if (N.lengthSq() < 1e-6) N.set(0, 1, 0);

    let up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(N.dot(up)) > 0.95) up.set(0, 0, 1);
    const U = new THREE.Vector3().crossVectors(N, up).normalize();
    const V = new THREE.Vector3().crossVectors(N, U).normalize();

    const sideCount = Math.max(3, Math.min(12, Math.floor(sides)));
    const ringVerts = sideCount + 1;
    const ringCount = 3;
    const totalVerts = ringCount * ringVerts;
    const totalIndices = (ringCount - 1) * sideCount * 6;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = (totalVerts < 65536) ? new Uint16Array(totalIndices) : new Uint32Array(totalIndices);

    const profile = [
        { r: radius * 1.8, d: 0.002, v: 0.0 },
        { r: radius * 1.45, d: 0.024, v: 0.5 },
        { r: radius * 1.05, d: 0.024, v: 1.0 }
    ];

    let vIdx = 0;
    let uvIdx = 0;

    for (let i = 0; i < ringCount; i += 1) {
        const ring = profile[i];
        const ringCenter = center.clone().addScaledVector(N, ring.d);
        const vCoord = Number.isFinite(layer) ? ring.v * 0.25 : vAtlasOffset + ring.v * vAtlasScale;

        for (let j = 0; j <= sideCount; j += 1) {
            const uFrac = j / sideCount;
            const angle = uFrac * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const radial = new THREE.Vector3()
                .addScaledVector(U, cos)
                .addScaledVector(V, sin);

            const p = ringCenter.clone().addScaledVector(radial, ring.r);

            positions[vIdx] = p.x;
            positions[vIdx + 1] = p.y;
            positions[vIdx + 2] = p.z;

            const norm = (i === 2)
                ? N.clone()
                : radial.clone().addScaledVector(N, 0.5).normalize();

            normals[vIdx] = norm.x;
            normals[vIdx + 1] = norm.y;
            normals[vIdx + 2] = norm.z;

            uvs[uvIdx] = uFrac;
            uvs[uvIdx + 1] = vCoord;

            vIdx += 3;
            uvIdx += 2;
        }
    }

    let iIdx = 0;
    for (let i = 0; i < ringCount - 1; i += 1) {
        const ringA = i * ringVerts;
        const ringB = (i + 1) * ringVerts;

        for (let j = 0; j < sideCount; j += 1) {
            const a = ringA + j;
            const b = ringA + j + 1;
            const c = ringB + j + 1;
            const d = ringB + j;

            indices[iIdx] = a;
            indices[iIdx + 1] = d;
            indices[iIdx + 2] = c;
            indices[iIdx + 3] = a;
            indices[iIdx + 4] = c;
            indices[iIdx + 5] = b;

            iIdx += 6;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (Number.isFinite(layer)) geometry.setAttribute('splineLayer', new THREE.BufferAttribute(new Float32Array(totalVerts).fill(layer), 1));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    return geometry;
}
