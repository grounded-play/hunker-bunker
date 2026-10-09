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
export function planRoomSplineDressing(room, grid, { placements = [], reserved = [], dressingItems = [] } = {}) {
    if (!room || !grid || !room.interior?.length) return [];

    const random = seededRandom(stableHash(`${room.id ?? 'room'}:splines:v2`));
    const reservedSet = reserved instanceof Set ? reserved : new Set(reserved);
    const splines = [];

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

            const wx = item.x + (lx * cos - lz * sin);
            const wy = baseY + ly;
            const wz = item.y + (lx * sin + lz * cos);

            const wnx = nx * cos - nz * sin;
            const wny = ny;
            const wnz = nx * sin + nz * cos;

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

            sA.connected = true;
            sB.connected = true;

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

    // 3. Orphan Sockets (Route to nearest perimeter wall with a clean termination collar)
    for (const sock of activeSockets) {
        if (sock.connected) continue;
        sock.connected = true;

        const leadOut = sock.worldPos.clone().addScaledVector(sock.worldNorm, 0.38);
        const wallTarget = leadOut.clone();
        wallTarget.y = 0.25; // drop to baseboard

        const waypoints = [sock.worldPos.clone(), leadOut, wallTarget];
        const points = evaluateFilletedManhattanPoints(waypoints, 0.12, 3);
        const normalOut = new THREE.Vector3(0, 1, 0);

        splines.push({
            id: `${room.id}:orphan:${sock.socket.id}`,
            category: 'socket_escape',
            type: sock.socket.type,
            points,
            radius: sock.socket.radius,
            sides: sock.socket.sides,
            vAtlasOffset: sock.socket.vAtlasOffset ?? vAtlasOffset,
            vAtlasScale: 0.25,
            collars: [
                { pos: wallTarget, normal: normalOut, radius: sock.socket.radius, sides: 6 }
            ]
        });
    }

    // 4. Gather Decal & Model Anchors from Dressing Items
    const wallAnchors = [];
    const floorAnchors = [];

    for (const item of dressingItems) {
        if (item.layer === 'wallDecal') {
            const h = item.height ?? 1.25;
            const norm = item.normal
                ? new THREE.Vector3(item.normal.x, 0, item.normal.z).normalize()
                : new THREE.Vector3(0, 0, 1);
            wallAnchors.push({
                type: item.type,
                layer: 'wallDecal',
                pos: new THREE.Vector3(item.x, h, item.y),
                normal: norm
            });
        } else if (item.layer === 'wallProp') {
            const h = item.mountY ?? 1.35;
            const yaw = item.yaw ?? 0;
            const norm = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
            wallAnchors.push({
                type: item.type,
                layer: 'wallProp',
                pos: new THREE.Vector3(item.x, h, item.y),
                normal: norm
            });
        } else if (item.layer === 'floorDecal' && (item.type.includes('grate') || item.type.includes('spill') || item.type.includes('burn'))) {
            floorAnchors.push({
                type: item.type,
                layer: 'floorDecal',
                pos: new THREE.Vector3(item.x, 0.02, item.y),
                normal: new THREE.Vector3(0, 1, 0)
            });
        }
    }

    // 5. Wall-Crawling Vine-Wires ("Lines vines crawling walls into decals and models")
    const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const cell of room.interior) {
        bounds.minX = Math.min(bounds.minX, cell.x);
        bounds.maxX = Math.max(bounds.maxX, cell.x);
        bounds.minZ = Math.min(bounds.minZ, cell.y);
        bounds.maxZ = Math.max(bounds.maxZ, cell.y);
    }

    // Find horizontal and vertical perimeter wall runs
    const wallRuns = [];
    // North wall runs: grid[z - 1][x] === '#'
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        let runStart = null;
        for (let x = bounds.minX; x <= bounds.maxX + 1; x += 1) {
            const isFloor = grid[z]?.[x] === '.';
            const isWall = grid[z - 1]?.[x] === '#';
            const isDoor = reservedSet.has(keyOf(x, z));

            if (isFloor && isWall && !isDoor) {
                if (runStart === null) runStart = x;
            } else {
                if (runStart !== null && (x - runStart) >= 3) {
                    wallRuns.push({
                        axis: 'x',
                        start: runStart,
                        end: x,
                        fixed: z,
                        wallNormal: new THREE.Vector3(0, 0, 1),
                        wallOffset: new THREE.Vector3(0, 0, 0.08)
                    });
                }
                runStart = null;
            }
        }
    }

    // For each qualified wall run, generate organic crawling vine-cables
    wallRuns.forEach((run, runIndex) => {
        const runLen = run.end - run.start;
        const seedVal = runIndex * 13.37;

        // Origin: look for a wall anchor near the start, else start on wall with collar
        const nearStartAnchor = wallAnchors.find((a) => Math.abs(a.pos.x - run.start) <= 1.5 && Math.abs(a.pos.z - run.fixed) <= 1.2);
        const nearEndAnchor = floorAnchors.find((a) => Math.abs(a.pos.x - run.end) <= 1.5 && Math.abs(a.pos.z - run.fixed) <= 1.2)
            || wallAnchors.find((a) => Math.abs(a.pos.x - run.end) <= 1.5 && Math.abs(a.pos.z - run.fixed) <= 1.2);

        const startHeight = nearStartAnchor?.pos?.y ?? (0.6 + random() * 0.9);
        const endHeight = nearEndAnchor?.pos?.y ?? (nearEndAnchor ? 0.02 : 0.25 + random() * 0.4);

        const p0 = nearStartAnchor
            ? nearStartAnchor.pos.clone()
            : new THREE.Vector3(run.start + 0.2, startHeight, run.fixed).add(run.wallOffset);

        const pEnd = nearEndAnchor
            ? nearEndAnchor.pos.clone()
            : new THREE.Vector3(run.end - 0.2, endHeight, run.fixed).add(run.wallOffset);

        const segmentCount = Math.max(4, Math.floor(runLen * 2));
        const vinePoints = [p0];
        const collars = [];

        // If starting on a bare wall without a model/decal, attach a clean flanged collar
        if (!nearStartAnchor) {
            collars.push({ pos: p0.clone(), normal: run.wallNormal.clone(), radius: baseRadius, sides: 6 });
        }

        for (let s = 1; s < segmentCount; s += 1) {
            const t = s / segmentCount;
            const x = THREE.MathUtils.lerp(p0.x, pEnd.x, t);
            const z = THREE.MathUtils.lerp(p0.z, pEnd.z, t);

            // Organic height undulation crawling up and down the wall
            const linearY = THREE.MathUtils.lerp(startHeight, endHeight, t);
            const undulation = Math.sin(t * Math.PI * 2.2 + seedVal) * undulationAmp;
            const y = Math.max(0.12, Math.min(2.25, linearY + undulation));

            vinePoints.push(new THREE.Vector3(x, y, z));
        }

        vinePoints.push(pEnd);

        // If ending on bare wall/floor, attach a clean flanged collar
        if (!nearEndAnchor) {
            const endNorm = (endHeight <= 0.15) ? new THREE.Vector3(0, 1, 0) : run.wallNormal.clone();
            collars.push({ pos: pEnd.clone(), normal: endNorm, radius: baseRadius, sides: 6 });
        }

        const cutIdx = Math.floor(vinePoints.length / 2);
        const cutPoint = vinePoints[cutIdx];
        const isReachable = cutPoint.y <= 1.85;

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
            cuttable: isReachable,
            cutPoint: isReachable ? cutPoint.clone() : null,
            cuttableType,
            hp: 15
        });

        // 6. Branching Tendril ("splitting vines creeping toward floor/vents")
        if (runLen >= 4 && random() < 0.7) {
            const branchStart = vinePoints[Math.floor(segmentCount * 0.45)].clone();
            const branchEnd = new THREE.Vector3(
                branchStart.x + (random() - 0.5) * 1.2,
                0.03, // creeps down to floor
                run.fixed + 0.15
            );
            const branchMid = new THREE.Vector3(
                (branchStart.x + branchEnd.x) * 0.5,
                branchStart.y * 0.4,
                run.fixed + 0.1
            );
            const branchPoints = [branchStart, branchMid, branchEnd];
            const branchRadius = baseRadius * 0.65;

            splines.push({
                id: `${room.id}:vine_branch:${runIndex}`,
                category: 'wall_vine_branch',
                type: conduitKind,
                points: branchPoints,
                radius: branchRadius,
                sides: 3,
                vAtlasOffset,
                vAtlasScale: 0.25,
                collars: [
                    { pos: branchEnd.clone(), normal: new THREE.Vector3(0, 1, 0), radius: branchRadius, sides: 6 }
                ],
                cuttable: true,
                cutPoint: branchMid.clone(),
                cuttableType,
                hp: 10
            });
        }
    });

    // 7. Ambient Overhead Swags (Across ceiling span, clearance Y >= 2.15m)
    const spanX = bounds.maxX - bounds.minX;
    const spanZ = bounds.maxZ - bounds.minZ;

    if (spanX >= 4 || spanZ >= 4) {
        const swagCount = Math.min(3, 1 + Math.floor(random() * 2));
        for (let s = 0; s < swagCount; s += 1) {
            const zRatio = 0.25 + 0.5 * (s / Math.max(1, swagCount - 1));
            const midZ = bounds.minZ + (spanZ * zRatio);

            const p0 = new THREE.Vector3(bounds.minX + 0.1, 2.45, midZ);
            const p1 = new THREE.Vector3(bounds.maxX + 0.9, 2.45, midZ + (random() - 0.5) * 1.5);

            const span = p0.distanceTo(p1);
            const sag = Math.min(0.25, span * 0.035 + 0.05);
            const points = evaluateCatenaryPoints(p0, p1, sag, 6);

            const isRope = themeFamily === 'camp';
            splines.push({
                id: `${room.id}:overhead:${s}`,
                category: 'overhead_swag',
                type: isRope ? 'rope' : 'cable',
                points,
                radius: isRope ? 0.022 : 0.018,
                sides: 3,
                vAtlasOffset: isRope ? 0.0 : 0.25,
                vAtlasScale: 0.25,
                collars: [
                    { pos: p0.clone(), normal: new THREE.Vector3(1, 0, 0), radius: 0.02, sides: 6 },
                    { pos: p1.clone(), normal: new THREE.Vector3(-1, 0, 0), radius: 0.02, sides: 6 }
                ]
            });
        }
    }

    return splines;
}
