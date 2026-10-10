import * as THREE from 'three';
import { getPropSockets } from './data/propSockets.js';
import { evaluateCatenaryPoints, evaluateFilletedManhattanPoints } from './splineGeometry.js';

function stableHash(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
}

function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const keyOf = (x, y) => `${x},${y}`;

/**
 * Plans procedural 3D splines (pipes, cables, veins, vines) for a room.
 *
 * Systems planned:
 * 1. Socket Interconnections: connects matching sockets on hero machinery.
 * 2. Decal & Model Connectors: routes conduits between wall vents, grilles, and junction boxes.
 * 3. Wall-Crawling Vine-Wires: organic cables/veins crawling bulkheads with sinusoidal height undulation and tendril branches.
 * 4. Ambient Overhead Swags: catenary droops above player clearance (Y >= 2.15m).
 * 5. Clean Physical Terminations: flanged escutcheon collars whenever a wire enters a bare wall/floor.
 *
 * @param {object} room             { id, theme, interior: [{x, y}] }
 * @param {string[][]} grid         '#' wall, '.' floor
 * @param {object} [options]
 * @param {Array<object>} [options.placements=[]]     Placed props with { type, x, y, yaw }
 * @param {Iterable<string>} [options.reserved]       "x,y" cells to keep clear (door aprons)
 * @param {Array<object>} [options.dressingItems=[]]  Room dressing items (wallDecals, wallProps, floorDecals)
 * @returns {Array<object>} Manifest of spline runs and collars
 */
const READABLE_SCALE = 1.9;
const WALL_GAP = 0.02;
const WALL_DIRECTIONS = Object.freeze([[0, -1], [0, 1], [-1, 0], [1, 0]]);
const MAX_CRAWLERS_PER_ROOM = 4;
const SWAG_BRACKET_HEIGHT = 2.42;
const SWAG_MAX_SAG = 0.2;
const MIN_SIDES = 6;
// Below this a conduit is in the way of someone walking through a door.
const HEAD_CLEARANCE = 1.9;
const AREA_CONDUIT = Object.freeze({ bunker: 'wire', reward: 'wire', bio: 'vein', giger: 'vein', cryo: 'pipe', camp: 'vine' });

// How freely each point of a hanging span swings: its drop below the straight
// line between the span's ends, as a share of SWAG_MAX_SAG (0 at the ends).
function chordSway(points) {
    const lengths = [0];
    for (let i = 1; i < points.length; i += 1) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
    const total = lengths[lengths.length - 1] || 1;
    const first = points[0].y;
    const last = points[points.length - 1].y;
    return points.map((point, i) => {
        const chord = first + (last - first) * (lengths[i] / total);
        return Math.min(1, Math.max(0, (chord - point.y) / SWAG_MAX_SAG));
    });
}

export function planRoomSplineDressing(room, grid, { placements = [], reserved = [], dressingItems = [] } = {}) {
    if (!room || !grid || !room.interior?.length) return [];

    const random = seededRandom(stableHash(`${room.id ?? 'room'}:splines:v2`));
    const reservedSet = reserved instanceof Set ? reserved : new Set(reserved);
    const splines = [];

    // Door aprons: each door lane plus one cell around it, the same apron
    // room population keeps clear. No conduit crosses one below head height.
    const doorApron = new Set();
    for (const lane of room.navigation?.doorLanes ?? []) {
        for (let dz = -1; dz <= 1; dz += 1) {
            for (let dx = -1; dx <= 1; dx += 1) doorApron.add(keyOf(lane.x + dx, lane.y + dz));
        }
    }
    const blocksDoorway = (points) => {
        if (!doorApron.size) return false;
        for (let i = 1; i < points.length; i += 1) {
            const a = points[i - 1];
            const b = points[i];
            const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 0.05));
            for (let k = 0; k <= steps; k += 1) {
                const t = k / steps;
                if (a.y + (b.y - a.y) * t >= HEAD_CLEARANCE) continue;
                if (doorApron.has(keyOf(Math.round(a.x + (b.x - a.x) * t), Math.round(a.z + (b.z - a.z) * t)))) return true;
            }
        }
        return false;
    };

    // Localized theme conduit profile tuning
    const themeFamily = room.theme?.split('-')?.[0] ?? 'bunker';
    let conduitKind = 'wire';
    let baseRadius = 0.026;
    let baseSides = 4;
    let vAtlasOffset = 0.25;
    let cuttableType = 'spline_wire_bunker';
    let undulationAmp = 0.22;

    if (themeFamily === 'bio') {
        conduitKind = 'vein';
        baseRadius = 0.038;
        baseSides = 4;
        vAtlasOffset = 0.5; // bio trachea/vein band
        cuttableType = 'spline_vein_bio';
        undulationAmp = 0.38;
    } else if (themeFamily === 'cryo') {
        conduitKind = 'coolant_pipe';
        baseRadius = 0.045;
        baseSides = 6;
        vAtlasOffset = 0.75; // insulated metal/pipe band
        cuttableType = 'spline_pipe_cryo';
        undulationAmp = 0.16;
    } else if (themeFamily === 'camp') {
        conduitKind = 'vine';
        baseRadius = 0.022;
        baseSides = 3;
        vAtlasOffset = 0.0; // rope/vine band
        cuttableType = 'spline_vine_camp';
        undulationAmp = 0.32;
    }

    // 1. Gather sockets from placed props
    const activeSockets = [];
    for (const item of placements) {
        const sockets = getPropSockets(item.type);
        if (!sockets) continue;

        const yaw = item.yaw ?? 0;
        const cos = Math.cos(yaw);
        const sin = Math.sin(yaw);
        const baseY = item.mountY ?? 0;

        for (const sock of sockets) {
            const [lx, ly, lz] = sock.pos;
            const [nx, ny, nz] = sock.normal;

            // three.js rotation.y: x' = x cos + z sin, z' = -x sin + z cos.
            const wx = item.x + (lx * cos + lz * sin);
            const wy = baseY + ly;
            const wz = item.y + (-lx * sin + lz * cos);

            const wnx = nx * cos + nz * sin;
            const wny = ny;
            const wnz = -nx * sin + nz * cos;

            activeSockets.push({
                prop: item,
                socket: sock,
                worldPos: new THREE.Vector3(wx, wy, wz),
                worldNorm: new THREE.Vector3(wnx, wny, wnz).normalize(),
                connected: false
            });
        }
    }

    // 2. Socket Interconnections (Pair matching sockets of same type)
    for (let i = 0; i < activeSockets.length; i += 1) {
        const sA = activeSockets[i];
        if (sA.connected) continue;

        for (let j = i + 1; j < activeSockets.length; j += 1) {
            const sB = activeSockets[j];
            if (sB.connected) continue;
            if (sA.socket.type !== sB.socket.type) continue;
            if (sA.prop === sB.prop) continue;

            const dist = sA.worldPos.distanceTo(sB.worldPos);
            if (dist > 8.5) continue;

            const radius = Math.min(sA.socket.radius, sB.socket.radius);
            const sides = Math.max(sA.socket.sides, sB.socket.sides);
            const vOffset = sA.socket.vAtlasOffset ?? vAtlasOffset;

            if (sA.socket.type === 'cable' || sA.socket.type === 'trachea') {
                const sag = Math.min(0.35, dist * 0.08);
                const pStart = sA.worldPos.clone().addScaledVector(sA.worldNorm, 0.15);
                const pEnd = sB.worldPos.clone().addScaledVector(sB.worldNorm, 0.15);
                const points = [
                    sA.worldPos.clone(),
                    ...evaluateCatenaryPoints(pStart, pEnd, sag, 6),
                    sB.worldPos.clone()
                ];
                const sway = chordSway(points);
                // Across a doorway: leave both sockets to run to a wall instead.
                if (blocksDoorway(points)) continue;
                sA.connected = true;
                sB.connected = true;
                splines.push({
                    id: `${room.id}:sock:${sA.socket.id}_${sB.socket.id}`,
                    category: 'socket_connection',
                    type: sA.socket.type,
                    points,
                    radius,
                    sides,
                    vAtlasOffset: vOffset,
                    vAtlasScale: 0.25,
                    sway,
                    cuttable: true,
                    cutPoint: points[Math.floor(points.length / 2)],
                    cuttableType,
                    hp: 15
                });
            } else {
                const waypoints = [
                    sA.worldPos.clone(),
                    sA.worldPos.clone().addScaledVector(sA.worldNorm, 0.35),
                    new THREE.Vector3(sB.worldPos.x, 0.25, sA.worldPos.z),
                    sB.worldPos.clone().addScaledVector(sB.worldNorm, 0.35),
                    sB.worldPos.clone()
                ];
                const points = evaluateFilletedManhattanPoints(waypoints, 0.15, 3);
                if (blocksDoorway(points)) continue;
                sA.connected = true;
                sB.connected = true;
                splines.push({
                    id: `${room.id}:sock:${sA.socket.id}_${sB.socket.id}`,
                    category: 'socket_connection',
                    type: sA.socket.type,
                    points,
                    radius,
                    sides,
                    vAtlasOffset: vOffset,
                    vAtlasScale: 0.25,
                    cuttable: true,
                    cutPoint: points[Math.floor(points.length / 2)],
                    cuttableType,
                    hp: 20
                });
            }
            break;
        }
    }

    // Wall faces: every side of an interior cell that meets a wall. A conduit
    // hugging a face sits WALL_GAP proud of it, never out in the room.
    const isWallTile = (x, z) => grid[z]?.[x] === '#' || grid[z]?.[x] === 'W';
    // Offsets use the drawn radius (READABLE_SCALE) so thick runs never sink into the wall.
    const faceDistance = (radius) => 0.5 - radius * READABLE_SCALE - WALL_GAP;
    const faces = [];
    for (const cell of room.interior) {
        for (const [dx, dz] of WALL_DIRECTIONS) {
            if (isWallTile(cell.x + dx, cell.y + dz) && !doorApron.has(keyOf(cell.x, cell.y))) faces.push({ x: cell.x, z: cell.y, dx, dz });
        }
    }

    // 3. Orphan sockets run to the nearest wall face and end there at
    //    baseboard height under a collar.
    for (const sock of activeSockets) {
        if (sock.connected) continue;
        sock.connected = true;
        const radius = sock.socket.radius;
        const leadOut = sock.worldPos.clone().addScaledVector(sock.worldNorm, 0.3);
        // The nearest wall face whose run keeps clear of the doorways.
        const candidates = faces
            .map((face) => {
                const point = new THREE.Vector3(face.x + face.dx * faceDistance(radius), 0.25, face.z + face.dz * faceDistance(radius));
                return { point, face, distance: Math.hypot(point.x - sock.worldPos.x, point.z - sock.worldPos.z) };
            })
            .filter((candidate) => candidate.distance <= 6)
            .sort((a, b) => a.distance - b.distance);
        let best = null;
        let points = null;
        for (const candidate of candidates) {
            const atWall = new THREE.Vector3(candidate.point.x, Math.max(0.25, leadOut.y), candidate.point.z);
            const route = evaluateFilletedManhattanPoints([sock.worldPos.clone(), leadOut, atWall, candidate.point.clone()], 0.12, 3);
            if (blocksDoorway(route)) continue;
            best = candidate;
            points = route;
            break;
        }
        if (!best) continue;
        splines.push({
            id: `${room.id}:orphan:${sock.socket.id}`,
            category: 'socket_escape',
            type: sock.socket.type,
            points,
            radius,
            sides: sock.socket.sides,
            vAtlasOffset: sock.socket.vAtlasOffset ?? vAtlasOffset,
            vAtlasScale: 0.25,
            collars: [{ pos: best.point.clone(), normal: new THREE.Vector3(-best.face.dx, 0, -best.face.dz), radius, sides: 6 }]
        });
    }

    // 4. Anchors from the room's dressing: wall props and wall decals a run
    //    can start from, and floor grates or spills it can end in.
    const wallAnchors = [];
    const floorAnchors = [];
    for (const item of dressingItems) {
        if (item.layer === 'wallDecal') {
            wallAnchors.push({ pos: new THREE.Vector3(item.x, item.height ?? 1.25, item.y) });
        } else if (item.layer === 'wallProp') {
            wallAnchors.push({ pos: new THREE.Vector3(item.x, Math.max(0.4, (item.mountY ?? 0) + 0.6), item.y) });
        } else if (item.layer === 'floorDecal' && /grate|spill|burn/.test(item.type ?? '')) {
            floorAnchors.push({ pos: new THREE.Vector3(item.x, 0.02, item.y) });
        }
    }

    // 5. Straight runs of wall along all four sides, at least three cells long.
    const wallRuns = [];
    for (const [dx, dz] of WALL_DIRECTIONS) {
        const along = dx === 0 ? [1, 0] : [0, 1];
        const lines = new Map();
        for (const face of faces) {
            if (face.dx !== dx || face.dz !== dz || reservedSet.has(keyOf(face.x, face.z))) continue;
            const line = dx === 0 ? face.z : face.x;
            if (!lines.has(line)) lines.set(line, []);
            lines.get(line).push(dx === 0 ? face.x : face.z);
        }
        for (const [line, positions] of lines) {
            positions.sort((a, b) => a - b);
            let runStart = positions[0];
            for (let i = 1; i <= positions.length; i += 1) {
                if (i < positions.length && positions[i] === positions[i - 1] + 1) continue;
                const runEnd = positions[i - 1];
                if (runEnd - runStart + 1 >= 3) {
                    const cell = (k) => (dx === 0 ? { x: k, z: line } : { x: line, z: k });
                    wallRuns.push({ dir: [dx, dz], along, first: cell(runStart), length: runEnd - runStart + 1 });
                }
                if (i < positions.length) runStart = positions[i];
            }
        }
    }
    // A point on a run: `s` metres along it from its first cell's outer edge,
    // `radius` off the wall face, at height y.
    const onRun = (run, s, y, radius) => new THREE.Vector3(
        run.first.x + run.along[0] * (s - 0.5) + run.dir[0] * faceDistance(radius),
        y,
        run.first.z + run.along[1] * (s - 0.5) + run.dir[1] * faceDistance(radius)
    );
    const nearRun = (run, anchors, s) => anchors.find((anchor) => {
        const target = onRun(run, s, anchor.pos.y, baseRadius);
        return Math.hypot(anchor.pos.x - target.x, anchor.pos.z - target.z) <= 1.0;
    });

    // Vines and wires crawl some of the walls (more in the hive and camps).
    const crawlChance = themeFamily === 'bio' || themeFamily === 'camp' || themeFamily === 'giger' ? 0.8 : 0.5;
    let crawlers = 0;
    wallRuns.forEach((run, runIndex) => {
        if (crawlers >= MAX_CRAWLERS_PER_ROOM || random() > crawlChance) return;
        crawlers += 1;
        const startAnchor = nearRun(run, wallAnchors, 0.3);
        const endAnchor = nearRun(run, floorAnchors, run.length - 0.3) || nearRun(run, wallAnchors, run.length - 0.3);
        const startHeight = startAnchor?.pos.y ?? 0.6 + random() * 0.9;
        const endHeight = endAnchor?.pos.y ?? 0.25 + random() * 0.4;
        const segmentCount = Math.max(4, Math.floor(run.length * 2));
        const seedPhase = random() * Math.PI * 2;
        const vinePoints = [];
        for (let k = 0; k <= segmentCount; k += 1) {
            const t = k / segmentCount;
            const s = 0.3 + t * (run.length - 0.6);
            const linearY = THREE.MathUtils.lerp(startHeight, endHeight, t);
            const y = k === 0 || k === segmentCount
                ? linearY
                : Math.max(0.12, Math.min(2.25, linearY + Math.sin(t * Math.PI * 2.2 + seedPhase) * undulationAmp));
            vinePoints.push(onRun(run, s, y, baseRadius));
        }
        const wallNormal = new THREE.Vector3(-run.dir[0], 0, -run.dir[1]);
        const collars = [];
        if (!startAnchor) collars.push({ pos: vinePoints[0].clone(), normal: wallNormal.clone(), radius: baseRadius, sides: 6 });
        if (!endAnchor) collars.push({ pos: vinePoints[vinePoints.length - 1].clone(), normal: wallNormal.clone(), radius: baseRadius, sides: 6 });

        const cutPoint = vinePoints[Math.floor(vinePoints.length / 2)];
        const reachable = cutPoint.y <= 1.85;
        splines.push({
            id: `${room.id}:wall_vine:${runIndex}`,
            category: 'wall_crawling_vine',
            type: conduitKind,
            points: vinePoints,
            radius: baseRadius,
            sides: baseSides,
            vAtlasOffset,
            vAtlasScale: 0.25,
            collars,
            cuttable: reachable,
            cutPoint: reachable ? cutPoint.clone() : null,
            cuttableType,
            hp: 15
        });

        // 6. A tendril splits off and creeps down the wall to the floor.
        if (run.length >= 4 && random() < 0.7) {
            const branchStart = vinePoints[Math.floor(segmentCount * 0.45)].clone();
            const sAt = 0.3 + 0.45 * (run.length - 0.6) + (random() - 0.5) * 1.2;
            const branchRadius = baseRadius * 0.65;
            const branchEnd = onRun(run, Math.max(0.3, Math.min(run.length - 0.3, sAt)), 0.04, branchRadius);
            const branchMid = branchStart.clone().lerp(branchEnd, 0.5);
            branchMid.y = branchStart.y * 0.45;
            splines.push({
                id: `${room.id}:vine_branch:${runIndex}`,
                category: 'wall_vine_branch',
                type: conduitKind,
                points: [branchStart, branchMid, branchEnd],
                radius: branchRadius,
                sides: 3,
                vAtlasOffset,
                vAtlasScale: 0.25,
                collars: [{ pos: branchEnd.clone(), normal: new THREE.Vector3(0, 1, 0), radius: branchRadius, sides: 6 }],
                cuttable: true,
                cutPoint: branchMid.clone(),
                cuttableType,
                hp: 10
            });
        }
    });

    // 7. High swags: a cable (rope in camps) along the top of a long wall,
    //    sagging between brackets, well above head height.
    const swagRuns = wallRuns.filter((run) => run.length >= 4).sort(() => random() - 0.5).slice(0, Math.min(2, 1 + Math.floor(random() * 2)));
    swagRuns.forEach((run, swagIndex) => {
        const isRope = themeFamily === 'camp';
        const radius = isRope ? 0.022 : 0.018;
        const brackets = [];
        for (let s = 0.4; s <= run.length - 0.4 + 1e-6; s += 1.6 + random() * 0.6) brackets.push(onRun(run, s, SWAG_BRACKET_HEIGHT, radius));
        if (brackets.length < 2) return;
        const points = [brackets[0]];
        for (let i = 1; i < brackets.length; i += 1) {
            const span = brackets[i].distanceTo(brackets[i - 1]);
            const sag = Math.min(SWAG_MAX_SAG, span * 0.06 + 0.04);
            points.push(...evaluateCatenaryPoints(brackets[i - 1], brackets[i], sag, 6).slice(1));
        }
        const wallNormal = new THREE.Vector3(-run.dir[0], 0, -run.dir[1]);
        splines.push({
            id: `${room.id}:overhead:${swagIndex}`,
            category: 'overhead_swag',
            type: isRope ? 'rope' : 'cable',
            points,
            sway: points.map((point) => Math.min(1, Math.max(0, (SWAG_BRACKET_HEIGHT - point.y) / SWAG_MAX_SAG))),
            radius,
            sides: 3,
            vAtlasOffset: isRope ? 0.0 : 0.25,
            vAtlasScale: 0.25,
            collars: brackets.map((pos) => ({ pos: pos.clone().addScaledVector(wallNormal, -radius), normal: wallNormal.clone(), radius: 0.02, sides: 6 }))
        });
    });

    // Every run in a room wears that area's conduit: the bunker's taped cable,
    // the hive's sinew veins, cryo's frosted coolant pipe, the camp's vines.
    const areaLayer = AREA_CONDUIT[themeFamily] ?? 'wire';
    // Real-world radii (2-4 cm) draw as hairlines from the game camera, so
    // conduits are drawn at READABLE_SCALE with enough sides to read round.
    return splines.map((spline) => ({
        layerKind: areaLayer,
        ...spline,
        radius: (spline.radius ?? 0.035) * READABLE_SCALE,
        sides: Math.max(MIN_SIDES, spline.sides ?? 4),
        collars: spline.collars?.map((collar) => ({ ...collar, radius: (collar.radius ?? spline.radius ?? 0.035) * READABLE_SCALE }))
    }));
}
