/**
 * Asset Museum exhibits for the spline conduits (procedural-spline plan,
 * Phase 4 review): a small three-walled bay per area, dressed by the real
 * router (src/splineRouter.js) and drawn with the real conduit material, so
 * the gallery shows exactly what a room of that area gets: wall runs with
 * their collars, a swag between brackets (with work bulbs in camps), the
 * area's finish and the sway.
 */
import * as THREE from 'three';
import { planRoomSplineDressing } from './splineRouter.js';
import { buildChunkSplinesMesh } from './splineDressingRenderer.js';

export const CONDUIT_EXHIBITS = Object.freeze([
    Object.freeze({ label: 'BUNKER WIRE', area: 'bunker', theme: 'bunker-standard' }),
    Object.freeze({ label: 'CRYO COOLANT PIPE', area: 'cryo', theme: 'cryo-vault' }),
    Object.freeze({ label: 'HIVE VEIN', area: 'bio', theme: 'bio-flesh' }),
    Object.freeze({ label: 'CAMP VINE AND ROPE', area: 'camp', theme: 'camp-tallow' })
]);

// A 5-wide, 3-deep bay open to the south (the museum's viewing side).
const GRID = Object.freeze(['#######', '#.....#', '#.....#', '#.....#', '.......']);
const INTERIOR = Object.freeze(Array.from({ length: 3 }, (_, row) => Array.from({ length: 5 }, (__, column) => ({ x: column + 1, y: row + 1 }))).flat());
const WALL_HEIGHT = 2.7;
let wallMaterial = null;

/** The bay for one room theme, centred on the origin, floor at y = 0. */
export function createConduitExhibit(theme) {
    const group = new THREE.Group();
    group.name = `ConduitExhibit:${theme}`;
    const centre = { x: 3, z: 2.5 };
    wallMaterial ??= new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.85, metalness: 0.2 });
    const wall = new THREE.BoxGeometry(1, WALL_HEIGHT, 1);
    GRID.forEach((row, y) => [...row].forEach((tile, x) => {
        if (tile !== '#') return;
        const block = new THREE.Mesh(wall, wallMaterial);
        block.position.set(x - centre.x, WALL_HEIGHT / 2, y - centre.z);
        block.userData.isConduitExhibitWall = true;
        group.add(block);
    }));
    const splines = planRoomSplineDressing({ id: `museum:${theme}`, theme, interior: INTERIOR }, GRID.map((row) => [...row]));
    const offset = new THREE.Vector3(-centre.x, 0, -centre.z);
    const moved = splines.map((item) => ({
        ...item,
        points: item.points?.map((point) => point.clone().add(offset)),
        collars: item.collars?.map((collar) => ({ ...collar, pos: collar.pos.clone().add(offset) })),
        bulbs: item.bulbs?.map((bulb) => bulb.clone().add(offset))
    }));
    const mesh = buildChunkSplinesMesh(moved);
    if (mesh) group.add(mesh);
    return group;
}
