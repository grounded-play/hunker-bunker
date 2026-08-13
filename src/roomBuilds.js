import { CHUNK_SIZE } from './tileCatalog.js';
import {
    carveLine,
    portalPoint,
    constrainBorderSockets,
    stampRoomThresholds,
    addWallShell
} from './architecturalMaze.js';
import { ROOM_BUILD_CATALOG, ROOM_BUILD_VERSION } from './data/roomBuilds.js';

// Sprint 23 Phase 3 / Lane B — pure validate/rotate/select/stamp API over
// the authored-room data in src/data/roomBuilds.js. No Three.js/DOM/random
// side effects except the one seeded `random` argument `stampRoomBuild`
// takes for connector bending, matching the rest of this pipeline's contract.

export { ROOM_BUILD_CATALOG, ROOM_BUILD_VERSION };

const LONG_TO_SHORT_SIDE = Object.freeze({ north: 'n', south: 's', west: 'w', east: 'e' });
const CLOCKWISE_SIDE = Object.freeze({ n: 'e', e: 's', s: 'w', w: 'n' });

function rotatePatternClockwise(pattern) {
    const height = pattern.length;
    const width = pattern[0].length;
    const rotated = [];
    for (let x = 0; x < width; x += 1) {
        let row = '';
        for (let y = height - 1; y >= 0; y -= 1) row += pattern[y][x];
        rotated.push(row);
    }
    return rotated;
}

// One 90-degree-clockwise point transform, shared by every coordinate-
// bearing field so none of them can drift out of sync with the pattern
// rotation above.
function rotatePoint({ x, y }, height) {
    return { x: height - 1 - y, y: x };
}

function rotateRect({ x, y, w, h }, height) {
    const corners = [
        rotatePoint({ x, y }, height),
        rotatePoint({ x: x + w - 1, y }, height),
        rotatePoint({ x, y: y + h - 1 }, height),
        rotatePoint({ x: x + w - 1, y: y + h - 1 }, height)
    ];
    const minX = Math.min(...corners.map((c) => c.x));
    const maxX = Math.max(...corners.map((c) => c.x));
    const minY = Math.min(...corners.map((c) => c.y));
    const maxY = Math.max(...corners.map((c) => c.y));
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function rotatePointList(list, height) {
    return list.map((entry) => ({ ...entry, ...rotatePoint(entry, height) }));
}

function rotateRectList(list, height) {
    return list.map((entry) => ({ ...entry, ...rotateRect(entry, height) }));
}

function rotateBounds(bounds, height) {
    const rotated = rotateRect(
        { x: bounds.minX, y: bounds.minY, w: bounds.maxX - bounds.minX + 1, h: bounds.maxY - bounds.minY + 1 },
        height
    );
    return { minX: rotated.x, minY: rotated.y, maxX: rotated.x + rotated.w - 1, maxY: rotated.y + rotated.h - 1 };
}

function rotateOnce(build) {
    const height = build.pattern.length;
    return Object.freeze({
        ...build,
        pattern: rotatePatternClockwise(build.pattern),
        rotation: ((build.rotation ?? 0) + 1) % 4,
        sockets: build.sockets.map((socket) => ({ ...socket, side: CLOCKWISE_SIDE[socket.side] })),
        structuralAnchors: rotatePointList(build.structuralAnchors, height),
        interactionAnchors: rotatePointList(build.interactionAnchors, height),
        rewardAnchors: rotatePointList(build.rewardAnchors, height),
        loreAnchors: rotatePointList(build.loreAnchors, height),
        coverZones: rotateRectList(build.coverZones, height),
        encounterZones: rotateRectList(build.encounterZones, height),
        hazardZones: rotateRectList(build.hazardZones, height),
        quietZones: rotateRectList(build.quietZones, height),
        containmentBounds: rotateBounds(build.containmentBounds, height)
    });
}

/**
 * Rotates a room build `steps` quarter-turns clockwise from its canonical
 * (catalog) orientation. `steps` is always applied from the unrotated build,
 * not accumulated — pass the catalog entry, not a previously rotated one.
 */
export function rotateRoomBuild(build, steps = 0) {
    if (build.rotationPolicy !== 'cardinal') {
        throw new Error(`rotateRoomBuild: unsupported rotationPolicy "${build.rotationPolicy}" for "${build.id}"`);
    }
    const normalizedSteps = ((steps % 4) + 4) % 4;
    let current = build;
    for (let i = 0; i < normalizedSteps; i += 1) current = rotateOnce(current);
    return current;
}

function isFloor(pattern, x, y) {
    return pattern[y]?.[x] === '.';
}

function floorCells(pattern) {
    const cells = [];
    for (let y = 0; y < pattern.length; y += 1) {
        for (let x = 0; x < pattern[y].length; x += 1) {
            if (pattern[y][x] === '.') cells.push({ x, y });
        }
    }
    return cells;
}

function isFullyConnected(pattern) {
    const cells = floorCells(pattern);
    if (cells.length === 0) return false;
    const key = (x, y) => `${x},${y}`;
    const seen = new Set([key(cells[0].x, cells[0].y)]);
    const stack = [cells[0]];
    while (stack.length > 0) {
        const { x, y } = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (!isFloor(pattern, nx, ny) || seen.has(key(nx, ny))) continue;
            seen.add(key(nx, ny));
            stack.push({ x: nx, y: ny });
        }
    }
    return seen.size === cells.length;
}

// structuralAnchors mark where the build's own obstruction geometry
// (machinery islands, partitions, pillars) sits — those cells are meant to
// be walls, not floor. Every other anchor type marks somewhere the player
// or an interaction actually resolves, so those must be real floor.
function wallAnchorsOf(build) {
    return build.structuralAnchors;
}

function floorAnchorsOf(build) {
    return [...build.interactionAnchors, ...build.rewardAnchors, ...build.loreAnchors];
}

/**
 * Classifies floor-cell area into the plan's Small/Medium/Large room-size
 * contract, calibrated to this catalog's own footprint range (98-209 floor
 * cells) rather than the plan's illustrative example, which used a much
 * larger multi-chunk footprint.
 */
export function classifyRoomBuildSize(build) {
    const area = floorCells(build.pattern).length;
    if (area < 110) return 'small';
    if (area < 170) return 'medium';
    return 'large';
}

/**
 * Validates a room build's internal consistency: well-formed pattern,
 * guaranteed floor connectivity (no authored or rotated pocket can seal
 * itself off), every anchor lands on real floor inside bounds, at least one
 * required socket, and the build's own declared `contentBudget` is actually
 * satisfied by its declared anchors/zones (the plan's "a room that cannot
 * satisfy its minimum structural budget is rejected" contract, checked as
 * self-consistency since these builds are authored, not generated).
 */
export function validateRoomBuild(build) {
    const errors = [];
    const height = build.pattern?.length ?? 0;
    const width = build.pattern?.[0]?.length ?? 0;

    if (!height || !width || build.pattern.some((row) => row.length !== width)) {
        errors.push('pattern is missing or not rectangular');
        return errors;
    }
    if (build.pattern.some((row) => [...row].some((char) => char !== '.' && char !== '#'))) {
        errors.push('pattern contains characters other than "." or "#"');
    }
    if (!isFullyConnected(build.pattern)) {
        errors.push('floor cells are not fully connected — an obstruction seals off a pocket');
    }
    if (!build.sockets?.some((socket) => socket.required)) {
        errors.push('build has no required socket');
    }
    for (const point of wallAnchorsOf(build)) {
        if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) {
            errors.push(`structural anchor "${point.id}" is outside the pattern bounds`);
        } else if (isFloor(build.pattern, point.x, point.y)) {
            errors.push(`structural anchor "${point.id}" should mark obstruction geometry ("#") but sits on floor`);
        }
    }
    for (const point of floorAnchorsOf(build)) {
        if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) {
            errors.push(`anchor "${point.id}" is outside the pattern bounds`);
        } else if (!isFloor(build.pattern, point.x, point.y)) {
            errors.push(`anchor "${point.id}" does not sit on floor`);
        }
    }

    const activityZones = build.encounterZones.length + build.interactionAnchors.length;
    if (build.structuralAnchors.length < build.contentBudget.structuralLarge) {
        errors.push('structuralAnchors does not satisfy contentBudget.structuralLarge');
    }
    if (activityZones < build.contentBudget.activityZones) {
        errors.push('encounterZones+interactionAnchors does not satisfy contentBudget.activityZones');
    }
    if (build.rewardAnchors.length < build.contentBudget.pickupsMin) {
        errors.push('rewardAnchors does not satisfy contentBudget.pickupsMin');
    }

    return errors;
}

/**
 * The room's declared approach point: two cells inward from its primary
 * required socket, centered on the cross axis. This is where procedural
 * connectors from any active chunk-edge opening terminate — deliberately
 * near the entrance rather than at the deep objective anchor, so a
 * connector can never need to carve through an authored structural
 * obstruction to reach it. Authoring margins (`rectRoomPattern` requires
 * every obstruction to stay clear of the edges) are what make this safe;
 * `roomBuilds.test.js` asserts it holds for every catalog entry.
 */
export function computeApproachPoint(build) {
    const width = build.pattern[0].length;
    const height = build.pattern.length;
    const socket = build.sockets.find((candidate) => candidate.required) ?? build.sockets[0];
    const inset = 2;
    switch (socket.side) {
        case 'n': return { x: Math.floor(width / 2), y: inset };
        case 's': return { x: Math.floor(width / 2), y: height - 1 - inset };
        case 'w': return { x: inset, y: Math.floor(height / 2) };
        case 'e': return { x: width - 1 - inset, y: Math.floor(height / 2) };
        default: return { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    }
}

/**
 * Deterministically selects one compatible build from the catalog for a
 * ring-manifest requirement. Pure function of its inputs — same
 * catalog/filters/roll always picks the same build.
 */
export function selectRoomBuild(catalog, { family, tier = null, biome = null, roles = null, roll = 0 } = {}) {
    const candidates = catalog.filter((build) => (
        build.family === family
        && (tier == null || build.tierEligibility.includes(tier))
        && (biome == null || build.biomeEligibility.includes(biome))
        && (roles == null || roles.every((role) => build.roles.includes(role)))
    ));
    if (candidates.length === 0) return null;
    const index = Math.min(candidates.length - 1, Math.floor(roll * candidates.length));
    return candidates[index];
}

/**
 * Stamps one authored room build into a chunk-sized grid, reusing
 * architecturalMaze.js's border-socket/door-threshold/wall-shell pipeline
 * so authored and procedural rooms plug into the exact same connector
 * contract. Returns the same `{grid, room}` shape
 * `generateArchitecturalMazeChunk` does, so it is a drop-in alternative
 * producer for `chunkStructure.js`.
 */
export function stampRoomBuild(build, random, { size = CHUNK_SIZE, openings = {} } = {}) {
    const grid = Array.from({ length: size }, () => Array(size).fill('X'));
    const height = build.pattern.length;
    const width = build.pattern[0].length;
    if (width > size - 6 || height > size - 6) {
        throw new Error(`stampRoomBuild: "${build.id}" (${width}x${height}) does not fit a ${size}-cell chunk with border margin`);
    }
    const originX = Math.floor((size - width) / 2);
    const originY = Math.floor((size - height) / 2);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const char = build.pattern[y][x];
            if (char === '.' || char === '#') grid[originY + y][originX + x] = char;
        }
    }
    const bounds = { left: originX, right: originX + width - 1, top: originY, bottom: originY + height - 1 };

    // Connect each exterior portal to the room's own boundary on the
    // matching side via an L-bend: first along the portal's own edge to
    // line up with the room's cross-axis center, then straight in to the
    // boundary — never past it. A portal's chunk-edge offset is
    // independent of where this particular room's footprint was centered,
    // so a direct line (skipping the bend) would usually miss the room
    // entirely. Every build's authored obstructions keep a margin from all
    // four pattern edges (checked by roomBuilds.test.js), so stopping
    // exactly at the boundary can never carve through one; only
    // `stampRoomThresholds` below decides where the actual door lands,
    // from whichever boundary cells this pass turned to floor.
    const crossCenterX = Math.round((bounds.left + bounds.right) / 2);
    const crossCenterY = Math.round((bounds.top + bounds.bottom) / 2);
    const activePortals = Object.entries(openings).filter(([, opening]) => opening?.open);
    const skippedSides = [];
    for (const [longSide, opening] of activePortals) {
        const shortSide = LONG_TO_SHORT_SIDE[longSide];
        if (!build.sockets.some((socket) => socket.side === shortSide)) {
            skippedSides.push(longSide);
            continue;
        }
        const portal = portalPoint(size, longSide, opening.offset);
        const boundaryPoint = shortSide === 'n' ? { x: crossCenterX, y: bounds.top }
            : shortSide === 's' ? { x: crossCenterX, y: bounds.bottom }
            : shortSide === 'w' ? { x: bounds.left, y: crossCenterY }
            : { x: bounds.right, y: crossCenterY };
        const bend = shortSide === 'n' || shortSide === 's'
            ? { x: crossCenterX, y: portal.y }
            : { x: portal.x, y: crossCenterY };
        carveLine(grid, portal, bend, 1);
        carveLine(grid, bend, boundaryPoint, 1);
    }
    // `random` is accepted (not yet used) to keep this signature composable
    // with generateArchitecturalMazeChunk's; Phase 4 connector presentation
    // variance is expected to consume it.

    constrainBorderSockets(grid, openings);
    const rawDoors = stampRoomThresholds(grid, bounds);
    addWallShell(grid);

    const interior = [];
    for (let y = bounds.top; y <= bounds.bottom; y += 1) {
        for (let x = bounds.left; x <= bounds.right; x += 1) {
            if (grid[y][x] === '.') interior.push({ x, y });
        }
    }

    const doors = rawDoors.map((door, index) => ({
        id: `door:${index}:${door.side}`,
        side: door.side,
        cells: door.cells.map((cell) => ({ ...cell })),
        // Matches the socket this threshold was cut for, when one of the
        // build's declared sockets faces the same side — lets callers tell
        // an authored, build-declared threshold apart from an incidental one.
        socketId: build.sockets.find((socket) => socket.side === door.side)?.id ?? null
    }));

    return { grid, bounds, origin: { x: originX, y: originY }, interior, doors, skippedSides };
}

function translatePoint(point, origin) {
    return { ...point, x: origin.x + point.x, y: origin.y + point.y };
}

// Every consumer of a translated rect (`roomEncounters.js`'s
// `isPointInBounds`, `roomContainment.js`'s `isPointInBounds`, and
// `getActiveContainmentZones()`'s direct `zones.push(quiet)`) reads
// `zone.bounds ?? zone` and then falls back through `minX/left/x` and
// `maxX/right/(x+width)` — never `w`/`h`. A rect carrying only `{x,y,w,h}`
// silently resolves to an unbounded box (`maxX`/`maxY` stay `undefined`),
// so every translated zone gets an explicit `bounds` object too, not just
// its own `x`/`y`/`w`/`h`.
function rectBounds(x, y, w, h) {
    return { minX: x, minY: y, maxX: x + w - 1, maxY: y + h - 1 };
}

function translateRect(rect, origin, extra = {}) {
    const x = origin.x + rect.x;
    const y = origin.y + rect.y;
    return { ...rect, ...extra, x, y, bounds: rectBounds(x, y, rect.w, rect.h) };
}

/**
 * Produces a room instance in the same shape threeGame.js's existing
 * `roomInstances` consumers already expect (`id`, `chunkKey`, `interior`,
 * `doors`, `navigation`, `populationBudget`, ...), extended with the
 * Phase 3 anchor/zone/containment fields Lane C's
 * `roomEncounters.js`/`roomContainment.js`/`roomContent.js` read. World
 * coordinates are chunk-local (add `chunkX*chunkSize, chunkY*chunkSize` at
 * the render layer, same convention `roomGeometry.js` already uses) —
 * `roomContent.js`'s `resolveAnchorWorldPosition` does exactly that
 * translation from `chunkX`/`chunkY` plus a local anchor.
 *
 * `ring`/`tier` must be passed by the caller (the manifest/placement layer
 * knows which tier a build was actually placed at; a build's own
 * `tierEligibility` is a list of *candidates*, not a placement decision) —
 * `roomEncounters.js`'s `planRoomEncounter` gates spawns on `room.ring` and
 * silently defaults to ring 1 (always-unlocked) without it.
 */
export function buildRoomInstanceFromBuild(build, stamped, { chunkX = 0, chunkY = 0, ring = null, tier = null } = {}) {
    const chunkKey = `${chunkX},${chunkY}`;
    const origin = stamped.origin;
    const resolvedRing = ring ?? tier ?? null;
    return {
        id: `authored-room:${build.id}:${chunkKey}`,
        chunkKey,
        chunkX,
        chunkY,
        buildId: build.id,
        family: build.family,
        role: build.roles[0] ?? 'generic',
        ring: resolvedRing,
        tier: resolvedRing,
        theme: null,
        sizeClass: classifyRoomBuildSize(build),
        bounds: stamped.bounds,
        interior: stamped.interior,
        wallCells: [],
        doors: stamped.doors,
        navigation: { doorLanes: stamped.doors.flatMap((door) => door.cells), primaryRoute: [], reserved: [] },
        populationBudget: {
            signature: build.contentBudget.structuralLarge,
            large: build.contentBudget.structuralLarge,
            small: build.contentBudget.activityZones,
            pickup: build.contentBudget.pickupsMin,
            enemy: build.contentBudget.enemiesMax
        },
        // roomEncounters.js reads room.contentBudget?.enemiesMax directly
        // (not populationBudget.enemy.max, which is a plain number here,
        // not an object) — expose the build's own budget shape verbatim so
        // that lookup actually resolves instead of silently falling back
        // to its generic default of 4.
        contentBudget: { ...build.contentBudget },
        gate: null,
        placements: [],
        encounter: null,
        structuralAnchors: build.structuralAnchors.map((a) => translatePoint(a, origin)),
        interactionAnchors: build.interactionAnchors.map((a) => translatePoint(a, origin)),
        rewardAnchors: build.rewardAnchors.map((a) => translatePoint(a, origin)),
        loreAnchors: build.loreAnchors.map((a) => translatePoint(a, origin)),
        coverZones: build.coverZones.map((z) => translateRect(z, origin)),
        encounterZones: build.encounterZones.map((z) => translateRect(z, origin)),
        hazardZones: build.hazardZones.map((z) => translateRect(z, origin, { isHazard: true })),
        // isQuiet/type:'quiet' matter here specifically because
        // getActiveContainmentZones() pushes each quiet zone as its own
        // standalone entry (`zones.push(quiet)`), so isCellInSafeZone must
        // recognize it directly rather than only via a parent room wrapper.
        quietZones: build.quietZones.map((z) => translateRect(z, origin, { isQuiet: true, type: 'quiet' })),
        safeZone: build.safeZone,
        // isCellInSafeZone/getActiveContainmentZones (src/roomContainment.js,
        // src/threeGame.js) check `entry.isSafe`, not `entry.safeZone` —
        // both names are kept so this room's own semantic-role callers
        // (roomBuilds.test.js, chunkStructure.js) and Lane C's containment
        // callers each find the property they actually read.
        isSafe: build.safeZone,
        containmentBounds: {
            minX: origin.x + build.containmentBounds.minX,
            minY: origin.y + build.containmentBounds.minY,
            maxX: origin.x + build.containmentBounds.maxX,
            maxY: origin.y + build.containmentBounds.maxY
        },
        compassAnchors: build.compassAnchors,
        presentationVariant: build.presentationVariants[0] ?? null,
        stateVariant: 'dormant'
    };
}
