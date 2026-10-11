/**
 * Chunk walls that stop being cubes (N64 world pass, lane B slice 1:
 * docs/planning/n64-architectural-level-design-overhaul-2026-10-10.md §9.7).
 *
 * Every standing wall cell used to draw the same 1 x 2.8 x 1 box at a height
 * rolled per cell, so a diagonal became a staircase of cubes, a lone pillar a
 * crate, and the skyline noise. Now:
 *
 *   - every exposed outer corner of a wall cell (both sides around it open
 *     onto floor) is cut at 45 degrees by WALL_CHAMFER. A lone pillar becomes
 *     an octagonal column, the free end of a run gets two cut corners, and a
 *     diagonal staircase of cells reads as a faceted diagonal wall;
 *   - heights come from quantised value noise over world cells, inside each
 *     landform's old range, so neighbours share a height and change in steps.
 *
 * Draw calls do not change. Every wall shares one octagonal prism whose cut
 * corners know which corner they belong to (hbCorner); a per-instance mask
 * (hbCornerCut) says which corners stay cut, and the vertex shader moves the
 * others back out to the square. A cell with no exposed corner draws the old
 * box. Only what is drawn changes: grid, collision, pathing and radar still
 * see square cells (the cut is an owner-accepted 0.3 m, decision D4).
 */
import * as THREE from 'three';

/** How far each exposed corner is cut back along both faces (metres). */
export const WALL_CHAMFER = 0.3;

/** Mask bits, one per corner. Grid y runs with world +z, so north is -z. */
export const CORNER_BIT = Object.freeze({ NE: 1, NW: 2, SW: 4, SE: 8 });

// Corner index (1-4, matching CORNER_BIT order) -> the square's corner point.
const CORNER_POINTS = Object.freeze([null, [0.5, -0.5], [-0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]);

/**
 * On unless `hb_wall_autotile=0` is stored: the switch back to the per-cell
 * boxes, for A/B captures and as a kill switch.
 */
export function isWallAutotileEnabled(storage = globalThis.localStorage) {
    try {
        return storage?.getItem?.('hb_wall_autotile') !== '0';
    } catch {
        return true;
    }
}

/**
 * Which of a wall cell's corners are cut. `isSolid(x, y)` answers for the
 * neighbouring grid cells: true where a wall stands. Cells the caller cannot
 * see should answer true, so an unknown neighbour never cuts a corner open.
 */
export function wallCornerCutMask(isSolid, x, y) {
    const north = !isSolid(x, y - 1);
    const east = !isSolid(x + 1, y);
    const south = !isSolid(x, y + 1);
    const west = !isSolid(x - 1, y);
    return (north && east ? CORNER_BIT.NE : 0)
        | (north && west ? CORNER_BIT.NW : 0)
        | (south && west ? CORNER_BIT.SW : 0)
        | (south && east ? CORNER_BIT.SE : 0);
}

/**
 * The shared wall prism, centred like the old BoxGeometry(1, height, 1): x/z
 * in [-0.5, 0.5], y in [-height/2, height/2]. An octagon in plan with every
 * corner cut; each vertex of a cut carries hbCorner (1 NE, 2 NW, 3 SW, 4 SE),
 * all others 0. Flat-shaded sides and top, no bottom (it stands on the floor).
 *
 * `heightSegments` and `widthSegments` split the sides into rows and columns
 * (chamfer facets stay one column) for walls the vertex shader bends, such as
 * the organic bio walls; every sample of a chamfer belongs to its corner, and
 * the top fans over every rim sample so a bent top never cracks.
 */
export function createCornerCutWallGeometry({ height = 2.8, cut = WALL_CHAMFER, heightSegments = 1, widthSegments = 1 } = {}) {
    const h = 0.5;
    // Round the cell, each cut's two points in walking order.
    const ring = [
        [h - cut, -h, 1], [h, -h + cut, 1],
        [h, h - cut, 4], [h - cut, h, 4],
        [-h + cut, h, 3], [-h, h - cut, 3],
        [-h, -h + cut, 2], [-h + cut, -h, 2]
    ];
    const bottom = -height / 2;
    const top = height / 2;
    const positions = [];
    const normals = [];
    const uvs = [];
    const corners = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    // Pushes a triangle wound counter-clockwise as seen from `normal`'s side.
    const triangle = (vertices, normal) => {
        a.set(vertices[0][0], vertices[0][1], vertices[0][2]);
        b.set(vertices[1][0], vertices[1][1], vertices[1][2]);
        c.set(vertices[2][0], vertices[2][1], vertices[2][2]);
        const facing = b.sub(a).cross(c.sub(a)).dot(normal);
        const order = facing >= 0 ? [0, 1, 2] : [0, 2, 1];
        for (const i of order) {
            const [x, y, z, u, v, corner] = vertices[i];
            positions.push(x, y, z);
            normals.push(normal.x, normal.y, normal.z);
            uvs.push(u, v);
            corners.push(corner);
        }
    };

    const rim = [];
    let along = 0;
    for (let i = 0; i < ring.length; i += 1) {
        const [x0, z0, c0] = ring[i];
        const [x1, z1, c1] = ring[(i + 1) % ring.length];
        const length = Math.hypot(x1 - x0, z1 - z0);
        const normal = new THREE.Vector3(z1 - z0, 0, x0 - x1).normalize();
        // The ring is convex around the origin: point the normal away from it.
        if (normal.x * (x0 + x1) + normal.z * (z0 + z1) < 0) normal.negate();
        const chamfer = c0 === c1;
        const columns = chamfer ? 1 : Math.max(1, widthSegments);
        const rows = Math.max(1, heightSegments);
        const sample = (column, row) => {
            const s = column / columns;
            const corner = column === 0 ? c0 : column === columns ? c1 : (chamfer ? c0 : 0);
            return [x0 + (x1 - x0) * s, bottom + (top - bottom) * (row / rows), z0 + (z1 - z0) * s,
                along + length * s, row / rows, corner];
        };
        for (let column = 0; column < columns; column += 1) {
            rim.push(sample(column, rows));
            for (let row = 0; row < rows; row += 1) {
                const quad = [sample(column, row), sample(column + 1, row), sample(column + 1, row + 1), sample(column, row + 1)];
                triangle([quad[0], quad[1], quad[2]], normal);
                triangle([quad[0], quad[2], quad[3]], normal);
            }
        }
        along += length;
    }

    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < rim.length; i += 1) {
        const [x0, , z0, , , c0] = rim[i];
        const [x1, , z1, , , c1] = rim[(i + 1) % rim.length];
        triangle([
            [0, top, 0, 0.5, 0.5, 0],
            [x0, top, z0, x0 + 0.5, z0 + 0.5, c0],
            [x1, top, z1, x1 + 0.5, z1 + 0.5, c1]
        ], up);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('hbCorner', new THREE.Float32BufferAttribute(corners, 1));
    // Bounds of the full square, which is what most cells draw.
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-h, bottom, -h), new THREE.Vector3(h, top, h));
    geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
    return geometry;
}

/**
 * What the vertex shader does, on the CPU: the geometry's positions with
 * every corner not in `mask` moved back out to the square. For tests and
 * anything that needs a cell's real outline.
 */
export function cornerCutPositions(geometry, mask) {
    const position = geometry.getAttribute('position');
    const corner = geometry.getAttribute('hbCorner');
    const out = new Float32Array(position.array);
    for (let i = 0; i < position.count; i += 1) {
        const index = corner.getX(i);
        if (index < 0.5 || mask & (1 << (index - 1))) continue;
        const [x, z] = CORNER_POINTS[index];
        out[i * 3] = x;
        out[i * 3 + 2] = z;
    }
    return out;
}

const CORNER_CUT_DECLARATIONS = `
attribute float hbCorner;
attribute float hbCornerCut;
`;

/**
 * Instance masks are stored offset by this, and the shader acts only on values
 * at or above it. A mesh drawn with the wall material but without these
 * attributes reads whatever generic value WebGL holds at that location (three
 * leaves 1 there for a missing vertex colour), never 16 or more, so it stays
 * exactly as it was.
 */
export const CORNER_CUT_ACTIVE = 16;

// Mirrors cornerCutPositions.
const CORNER_CUT_VERTEX = `
if ( hbCorner > 0.5 && hbCornerCut > ${CORNER_CUT_ACTIVE - 0.5} ) {
    float hbCornerBit = exp2( hbCorner - 1.0 );
    float hbCornerMask = hbCornerCut - ${CORNER_CUT_ACTIVE.toFixed(1)};
    if ( mod( floor( hbCornerMask / hbCornerBit + 0.001 ), 2.0 ) < 0.5 ) {
        transformed.x = ( hbCorner < 1.5 || hbCorner > 3.5 ) ? 0.5 : -0.5;
        transformed.z = hbCorner < 2.5 ? -0.5 : 0.5;
    }
}
`;

/** How far organic walls bend, at most (metres, per axis). */
export const ORGANIC_WALL_BEND = 0.13;

// Bio walls (the biomech/giger skin, the rock kit) bend by a smooth noise
// field over world position, scaled by how far into bio the wall stands.
// World position only, so a point two neighbouring walls share moves the
// same way for both and runs stay watertight; only corner-cut instances
// (hbCornerCut in the active range) bend. Collision is untouched.
function organicVertex({ start, end }) {
    return `
#ifdef USE_INSTANCING
    vec4 hbOrganicWorld = modelMatrix * instanceMatrix * vec4( transformed, 1.0 );
#else
    vec4 hbOrganicWorld = modelMatrix * vec4( transformed, 1.0 );
#endif
float hbBio = smoothstep( ${start.toFixed(1)}, ${end.toFixed(1)}, length( hbOrganicWorld.xz - uShipWorldPos ) );
if ( hbBio > 0.0 && hbCornerCut > ${CORNER_CUT_ACTIVE - 0.5} ) {
    vec3 hbP = hbOrganicWorld.xyz * vec3( 1.1, 0.7, 1.1 );
    vec2 hbBend = vec2(
        sin( hbP.x * 1.7 + hbP.y * 2.3 + sin( hbP.z * 1.3 ) ) + sin( hbP.z * 2.9 - hbP.y * 1.1 ),
        sin( hbP.z * 1.9 + hbP.y * 1.7 + sin( hbP.x * 1.1 ) ) + sin( hbP.x * 2.3 + hbP.y * 0.9 )
    ) * 0.5;
    transformed.xz += hbBend * ${ORGANIC_WALL_BEND.toFixed(3)} * hbBio;
}
`;
}

/**
 * Patches a vertex shader (standard or depth) to draw the cell's real
 * outline. With `organic: { start, end }` (distances from the ship where bio
 * begins and is full), bio walls also bend; the shader then needs the
 * uShipWorldPos uniform.
 */
export function patchCornerCutVertexShader(vertexShader, { organic = null } = {}) {
    if (vertexShader.includes('attribute float hbCornerCut;')) return vertexShader;
    const declarations = organic && !vertexShader.includes('uniform vec2 uShipWorldPos;')
        ? `${CORNER_CUT_DECLARATIONS}uniform vec2 uShipWorldPos;\n`
        : CORNER_CUT_DECLARATIONS;
    return vertexShader
        .replace('#include <common>', `#include <common>${declarations}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>${CORNER_CUT_VERTEX}${organic ? organicVertex(organic) : ''}`);
}

/**
 * The shadow pass's depth material, cutting corners (and, with `organic`,
 * bending bio walls) like the wall itself. `shipWorldPos` returns the ship's
 * position (a Vector2), read when the material compiles.
 */
export function createCornerCutDepthMaterial({ organic = null, shipWorldPos = null } = {}) {
    const material = new THREE.MeshDepthMaterial();
    material.name = 'wall-corner-cut-depth';
    material.onBeforeCompile = (shader) => {
        if (organic) shader.uniforms.uShipWorldPos = { value: shipWorldPos?.() ?? new THREE.Vector2() };
        shader.vertexShader = patchCornerCutVertexShader(shader.vertexShader, { organic });
    };
    material.customProgramCacheKey = () => `hb-wall-corner-cut-depth${organic ? '-organic' : ''}`;
    return material;
}

/**
 * A pool's own copy of the shared prism (it is tiny) carrying the per-instance
 * corner masks (stored offset by CORNER_CUT_ACTIVE), so the pool can dispose it without touching anyone else's
 * buffers.
 */
export function createCornerCutPoolGeometry(shared, masks) {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv', 'hbCorner']) {
        geometry.setAttribute(name, shared.getAttribute(name).clone());
    }
    const stored = Float32Array.from(masks, (mask) => mask + CORNER_CUT_ACTIVE);
    geometry.setAttribute('hbCornerCut', new THREE.InstancedBufferAttribute(stored, 1));
    geometry.boundingBox = shared.boundingBox.clone();
    geometry.boundingSphere = shared.boundingSphere.clone();
    geometry.userData.ownedByWallPool = true;
    return geometry;
}

// ── Coherent wall heights ──────────────────────────────────────────────

// Bands per landform, as the old per-cell roll had them: [share of cells,
// low, high]. A band with low === high is a single height.
const HEIGHT_BANDS = Object.freeze({
    maze: [[0.28, 0.60, 0.78], [0.38, 0.82, 0.98], [0.26, 1.0, 1.0], [0.08, 1.08, 1.26]],
    canyon: [[1, 1.2, 1.55]],
    ruins: [[0.62, 0.58, 0.84], [0.38, 0.88, 1.10]],
    field: [[1, 0.72, 1.08]],
    crater: [[1, 0.88, 1.28]]
});

/**
 * Height steps: 0.2 of the 2.8 m wall, about 0.56 m, over a field that
 * changes every nine cells or so. Smaller, more frequent steps (0.34 m every
 * five cells) read as a jagged crenellation once frost caps lit every edge;
 * N64 walls hold a height for a long run and change boldly.
 */
export const WALL_HEIGHT_STEP = 0.2;
const NOISE_CELL = 9;

function latticeValue(ix, iz) {
    let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

function valueNoise(x, z) {
    const gx = x / NOISE_CELL;
    const gz = z / NOISE_CELL;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    const north = latticeValue(ix, iz) * (1 - sx) + latticeValue(ix + 1, iz) * sx;
    const south = latticeValue(ix, iz + 1) * (1 - sx) + latticeValue(ix + 1, iz + 1) * sx;
    return north * (1 - sz) + south * sz;
}

/**
 * The wall's height as a multiple of the standard 2.8 m, for a standing wall
 * of `landform` at world cell (worldX, worldZ). Landforms without bands keep
 * the standard height.
 */
export function wallHeightScale(landform, worldX, worldZ) {
    const bands = HEIGHT_BANDS[landform];
    if (!bands) return 1;
    // Bilinear noise crowds the middle; stretch it so the outer bands occur.
    const n = Math.min(0.999999, Math.max(0, (valueNoise(worldX, worldZ) - 0.5) * 1.7 + 0.5));
    let start = 0;
    for (let i = 0; i < bands.length; i += 1) {
        const [share, low, high] = bands[i];
        if (n < start + share || i === bands.length - 1) {
            const t = Math.min(1, Math.max(0, (n - start) / share));
            const raw = low + (high - low) * t;
            // One grid of heights for every band, so neighbouring bands never
            // differ by a sliver; clamped to the landform's whole range.
            const stepped = Math.round(raw / WALL_HEIGHT_STEP) * WALL_HEIGHT_STEP;
            const floor = Math.min(...bands.map((band) => band[1]));
            const ceiling = Math.max(...bands.map((band) => band[2]));
            return Math.round(Math.min(ceiling, Math.max(floor, stepped)) * 1000) / 1000;
        }
        start += share;
    }
    return 1;
}

// ── Light painted into the walls (lane B slice 2, item 3) ──────────────

/**
 * Wall fragment shading, inserted after the wall shader has blended
 * finalWallColor (inside its USE_MAP block, where cryoMix, bioMix and the
 * grunge samples exist). The N64 lesson: light painted into the
 * architecture.
 *   - Sides: a bright lip along the top edge, so a run's silhouette reads
 *     crisply from the isometric camera. Side UVs run 0 at the base to 1 at
 *     the top (box and corner-cut prism alike) and walls stand on y = 0, so
 *     the top is vWorldPos.y / v.
 *   - Tops, which the camera looks down on: frost settles on cryo walls and
 *     growth creeps over bio walls, each where its grunge map gathers.
 */
export const WALL_LIGHT_SHAPE_FRAGMENT = `
                    if ( abs( vWorldNormal.y ) <= 0.5 ) {
                        float hbWallV = clamp( vMapUv.y, 0.001, 1.0 );
                        float hbFromTop = vWorldPos.y / hbWallV - vWorldPos.y;
                        float hbLip = 1.0 - smoothstep( 0.03, 0.1, hbFromTop );
                        finalWallColor = mix( finalWallColor, finalWallColor * 1.45 + vec3( 0.03 ), hbLip * 0.85 );
                    } else if ( vWorldNormal.y > 0.5 ) {
                        float hbFrost = smoothstep( 0.32, 0.62, cryoWallGrunge.g + cryoWallGrunge.r * 0.4 ) * cryoMix * ( 1.0 - bioMix );
                        finalWallColor = mix( finalWallColor, vec3( 0.78, 0.86, 0.94 ), hbFrost * 0.8 );
                        float hbGrowth = smoothstep( 0.3, 0.7, bioWallGrunge.g ) * bioMix;
                        finalWallColor = mix( finalWallColor, vec3( 0.13, 0.2, 0.1 ), hbGrowth * 0.55 );
                    }
`;

// ── Wall-top dressing (lane B slice 2, item 2) ─────────────────────────

/** Cells per pipe stretch along a run. */
const PIPE_STRETCH = 5;

/**
 * What stands on top of one wall cell, in the cell's frame (x east, z south,
 * metres from its centre; tops are where the isometric camera looks):
 *   - bunker and cryo: pipes laid along straight runs (`runAxis` 'x' or 'z')
 *     in stretches of PIPE_STRETCH cells, keeping one side per run so they
 *     read as one conduit, sometimes doubled; elsewhere an occasional hatch;
 *   - bio: a few nodules, growth breaking through.
 * Deterministic per world cell.
 */
export function planWallTopDressing({ worldX, worldZ, runAxis = null, biome = 'active' }) {
    const items = [];
    const cellRoll = latticeValue(worldX * 3 + 101, worldZ * 7 - 53);
    if (biome === 'bio') {
        if (cellRoll >= 0.16) return items;
        const count = 1 + Math.floor(latticeValue(worldX + 7, worldZ - 11) * 2);
        for (let k = 0; k < count; k += 1) {
            items.push({
                type: 'nodule',
                x: (latticeValue(worldX * 11 + k, worldZ + 3) - 0.5) * 0.6,
                z: (latticeValue(worldX + 5, worldZ * 13 + k) - 0.5) * 0.6,
                size: 0.1 + latticeValue(worldX - k, worldZ * 5) * 0.14
            });
        }
        return items;
    }
    if (runAxis === 'x' || runAxis === 'z') {
        const line = runAxis === 'x' ? worldZ : worldX;
        const position = runAxis === 'x' ? worldX : worldZ;
        const stretch = Math.floor(position / PIPE_STRETCH);
        const salt = runAxis === 'x' ? 17 : 29;
        if (latticeValue(line * 13 + salt, stretch) < 0.3) {
            const side = latticeValue(line + salt, 991) < 0.5 ? -1 : 1;
            items.push({ type: 'pipe', axis: runAxis, offset: side * 0.24, radius: 0.07 });
            if (latticeValue(line * 5 + salt, stretch + 401) < 0.3) {
                items.push({ type: 'pipe', axis: runAxis, offset: -side * 0.17, radius: 0.05 });
            }
            return items;
        }
    }
    if (cellRoll < 0.07) {
        items.push({
            type: 'hatch',
            size: 0.42 + latticeValue(worldX + 31, worldZ - 7) * 0.16,
            rotation: latticeValue(worldX - 3, worldZ + 19) < 0.5 ? 0 : Math.PI / 2
        });
    }
    return items;
}
