// A catalog of authored 7x7 meta-tiles used by the WFC generator
// (src/wfcGenerator.js) to lay out a chunk's MAZE landform. See
// docs/superpowers/specs/2026-07-27-wfc-tile-maze-generation-design.md §1-2.

export const SOCKET = Object.freeze({ CLOSED: 'CLOSED', OPEN3: 'OPEN3' });
export const TILE_SIZE = 7;

const OPPOSITE = Object.freeze({ n: 's', s: 'n', e: 'w', w: 'e' });

export function oppositeSide(side) {
    return OPPOSITE[side];
}

// Rotates a TILE_SIZE x TILE_SIZE array of equal-length strings 90 degrees
// clockwise: rotated[i][j] = original[n-1-j][i].
export function rotatePatternCW(pattern) {
    const n = pattern.length;
    const rotated = [];
    for (let i = 0; i < n; i += 1) {
        let row = '';
        for (let j = 0; j < n; j += 1) {
            row += pattern[n - 1 - j][i];
        }
        rotated.push(row);
    }
    return rotated;
}

// A 90-degree clockwise rotation turns what faced west to face north, what
// faced north to face east, and so on around the compass.
export function rotateSocketsCW(sockets) {
    return { n: sockets.w, e: sockets.n, s: sockets.e, w: sockets.s };
}

export function rotateAnchorsCW(anchors) {
    if (!anchors) return undefined;
    return anchors.map((a) => ({
        ...a,
        x: (TILE_SIZE - 1) - a.y,
        y: a.x
    }));
}

export const ELEVATION_LAYER = Object.freeze({ GROUND: 'ground', ELEVATED: 'elevated' });

export function getTileSockets(tile, layer = ELEVATION_LAYER.GROUND) {
    if (tile.elevationSockets && tile.elevationSockets[layer]) {
        return tile.elevationSockets[layer];
    }
    if (layer === ELEVATION_LAYER.GROUND) {
        return tile.sockets;
    }
    return { n: SOCKET.CLOSED, e: SOCKET.CLOSED, s: SOCKET.CLOSED, w: SOCKET.CLOSED };
}

export function rotateElevationSocketsCW(elevationSockets) {
    if (!elevationSockets) return undefined;
    const res = {};
    for (const [layer, sockets] of Object.entries(elevationSockets)) {
        res[layer] = rotateSocketsCW(sockets);
    }
    return res;
}

function rotateTimes(tile, times) {
    let pattern = tile.pattern;
    let sockets = tile.sockets;
    let anchors = tile.anchors;
    let elevationSockets = tile.elevationSockets;
    for (let i = 0; i < times; i += 1) {
        pattern = rotatePatternCW(pattern);
        sockets = rotateSocketsCW(sockets);
        anchors = rotateAnchorsCW(anchors);
        elevationSockets = rotateElevationSocketsCW(elevationSockets);
    }
    return {
        ...tile,
        pattern,
        sockets,
        ...(anchors ? { anchors } : {}),
        ...(elevationSockets ? { elevationSockets } : {})
    };
}

// Expands one authored base tile into its rotations. `orientationIds` names
// each rotation (0, 90, 180, 270 CW) — pass fewer than 4 names to only keep
// that many distinct rotations (e.g. a straight corridor only needs 2).
function withRotations(base, orientationIds) {
    return orientationIds.map((idSuffix, index) => ({
        ...rotateTimes(base, index),
        id: `${base.id}-${idSuffix}`
    }));
}

const O = SOCKET.OPEN3;
const C = SOCKET.CLOSED;

// CLOSED on every side means nothing can ever open a door into this tile —
// any floor here would be a permanently sealed, unreachable pocket (a real
// bug this catalog used to have: a floor-filled "room-closed" tile broke
// the full-chunk reachability guarantee the moment WFC placed it). Solid
// rock filler has no floor to strand, so it's the only sound way to satisfy
// the "at least one tile CLOSED on all four sides" catalog requirement.
const SOLID_FILL = {
    id: 'solid-fill',
    category: 'solid',
    tutorial: true,
    weight: 0.6,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: C, e: C, s: C, w: C },
    pattern: [
        '#######',
        '#######',
        '#######',
        '#######',
        '#######',
        '#######',
        '#######'
    ]
};

const ROOM_ALCOVE_BASE = {
    id: 'room-alcove',
    category: 'room',
    tutorial: true,
    weight: 1,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 3, pickup: 1, enemy: 0 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 2 },
        { id: 'back-wall-a', x: 3, y: 1, kind: 'large-prop', clearance: 1 },
        { id: 'scatter-a', x: 1, y: 3, kind: 'small-prop', clearance: 0 },
        { id: 'scatter-b', x: 5, y: 3, kind: 'small-prop', clearance: 0 }
    ],
    sockets: { n: C, e: C, s: O, w: C },
    pattern: [
        '#######',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '##...##'
    ]
};

const ROOM_THROUGH_BASE = {
    id: 'room-through',
    category: 'room',
    tutorial: true,
    weight: 0.9,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 3, pickup: 1, enemy: 1 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 1 },
        { id: 'left-wall', x: 1, y: 3, kind: 'large-prop', clearance: 0 },
        { id: 'right-wall', x: 5, y: 3, kind: 'small-prop', clearance: 0 }
    ],
    sockets: { n: O, e: C, s: O, w: C },
    pattern: [
        '##...##',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '##...##'
    ]
};

const ROOM_COMPACT_BASE = {
    id: 'room-compact',
    category: 'room',
    tutorial: true,
    weight: 0.42,
    roomRole: 'utility',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 1, pickup: 1, enemy: 0 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 1 }
    ],
    sockets: { n: C, e: C, s: O, w: C },
    pattern: [
        '#######',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '##...##'
    ]
};

// A wide, shallow chamber. Rotations turn the same authored footprint into
// vertical long rooms, so successive WFC picks do not all read as squares.
const ROOM_RECTANGLE_BASE = {
    id: 'room-rectangle',
    category: 'room',
    tutorial: true,
    weight: 0.82,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 3, pickup: 1, enemy: 1 },
    anchors: [
        { id: 'center', x: 3, y: 4, kind: 'landmark', clearance: 1 },
        { id: 'wide-wall-left', x: 1, y: 3, kind: 'small-prop', clearance: 0 },
        { id: 'wide-wall-right', x: 5, y: 3, kind: 'small-prop', clearance: 0 }
    ],
    sockets: { n: C, e: C, s: O, w: C },
    pattern: [
        '#######',
        '#######',
        '#.....#',
        '#.....#',
        '#.....#',
        '#.....#',
        '##...##'
    ]
};

// A proper bent/L-shaped chamber rather than a square room with two doors.
// Its two broad wings make the turn happen inside the room footprint.
const ROOM_BENT_BASE = {
    id: 'room-bent',
    category: 'room',
    tutorial: false,
    weight: 0.72,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 4, pickup: 1, enemy: 1 },
    anchors: [
        { id: 'bend', x: 3, y: 3, kind: 'landmark', clearance: 1 },
        { id: 'north-wing', x: 3, y: 1, kind: 'small-prop', clearance: 0 },
        { id: 'east-wing', x: 5, y: 3, kind: 'small-prop', clearance: 0 }
    ],
    sockets: { n: O, e: O, s: C, w: C },
    pattern: [
        '##...##',
        '##...##',
        '##.....',
        '#......',
        '#......',
        '#...###',
        '#######'
    ]
};

const ROOM_CORNER_BASE = {
    id: 'room-corner',
    category: 'room',
    tutorial: true,
    weight: 0.75,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 3, pickup: 1, enemy: 1 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 1 },
        { id: 'closed-corner', x: 1, y: 5, kind: 'large-prop', clearance: 0 }
    ],
    sockets: { n: O, e: O, s: C, w: C },
    pattern: [
        '##...##',
        '#.....#',
        '#......',
        '#......',
        '#......',
        '#.....#',
        '#######'
    ]
};

const ROOM_JUNCTION_BASE = {
    id: 'room-junction',
    category: 'room',
    tutorial: false,
    weight: 0.5,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 4, pickup: 1, enemy: 2 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 1 },
        { id: 'closed-wall', x: 1, y: 3, kind: 'large-prop', clearance: 0 }
    ],
    sockets: { n: O, e: O, s: O, w: C },
    pattern: [
        '##...##',
        '#.....#',
        '#......',
        '#......',
        '#......',
        '#.....#',
        '##...##'
    ]
};

const ROOM_HUB = {
    id: 'room-hub',
    category: 'room',
    tutorial: false,
    weight: 0.28,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 1, small: 4, pickup: 1, enemy: 2 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 1 }
    ],
    sockets: { n: O, e: O, s: O, w: O },
    pattern: [
        '##...##',
        '#.....#',
        '.......',
        '.......',
        '.......',
        '#.....#',
        '##...##'
    ]
};

const ROOM_ROLE_VARIANTS = [
    {
        ...ROOM_ALCOVE_BASE,
        id: 'room-utility',
        tutorial: false,
        weight: 0.75,
        roomRole: 'utility',
        decorationSet: 'bunker'
    },
    {
        ...ROOM_ALCOVE_BASE,
        id: 'room-medical',
        tutorial: false,
        weight: 0.6,
        roomRole: 'medical',
        decorationSet: 'cryo',
        populationBudget: { large: 1, small: 2, pickup: 2, enemy: 0 }
    },
    {
        ...ROOM_ALCOVE_BASE,
        id: 'room-nest',
        tutorial: false,
        weight: 0.55,
        roomRole: 'nest',
        decorationSet: 'nest',
        populationBudget: { large: 1, small: 4, pickup: 1, enemy: 1 }
    },
    {
        ...ROOM_ALCOVE_BASE,
        id: 'room-camp-cache',
        tutorial: false,
        weight: 0.5,
        roomRole: 'camp',
        decorationSet: 'camp',
        populationBudget: { large: 1, small: 3, pickup: 2, enemy: 0 }
    }
];

const CORRIDOR_STRAIGHT_BASE = {
    id: 'corridor-straight',
    category: 'corridor-straight',
    tutorial: true,
    weight: 1.15,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: C, s: O, w: C },
    pattern: [
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##'
    ]
};

const CORRIDOR_TURN_BASE = {
    id: 'corridor-turn',
    category: 'corridor-turn',
    tutorial: true,
    weight: 1.2,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: O, s: C, w: C },
    pattern: [
        '##...##',
        '##...##',
        '##.....',
        '##.....',
        '##.....',
        '#######',
        '#######'
    ]
};

const CORRIDOR_NARROW_BASE = {
    id: 'corridor-narrow',
    category: 'corridor-straight',
    tutorial: true,
    // Narrow halls are punctuation, not the default. A previous 2.1 weight
    // made this one-cell waist dominate otherwise different WFC routes and
    // was the main reason generated sectors all felt alike.
    weight: 0.48,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: C, s: O, w: C },
    pattern: [
        '##...##',
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '##...##'
    ]
};

const CORRIDOR_T_BASE = {
    id: 'corridor-t',
    category: 'corridor-t',
    tutorial: false,
    weight: 0.6,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: O, s: O, w: C },
    pattern: [
        '##...##',
        '#.....#',
        '#......',
        '#......',
        '#......',
        '#.....#',
        '##...##'
    ]
};

const CORRIDOR_CROSS = {
    id: 'corridor-cross',
    category: 'corridor-cross',
    tutorial: false,
    weight: 0.4,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: O, s: O, w: O },
    pattern: [
        '##...##',
        '##...##',
        '.......',
        '.......',
        '.......',
        '##...##',
        '##...##'
    ]
};

const CANYON_WALKWAY_BASE = {
    id: 'canyon-walkway',
    category: 'canyon-walkway',
    tutorial: false,
    weight: 0.32,
    roomRole: 'generic',
    decorationSet: 'cave',
    populationBudget: { large: 0, small: 1, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: C, s: O, w: C },
    pattern: [
        '##...##',
        '##...##',
        '#X...X#',
        '#X...X#',
        '#X...X#',
        '##...##',
        '##...##'
    ]
};

const CANYON_WALKWAY_BROAD_BASE = {
    ...CANYON_WALKWAY_BASE,
    id: 'canyon-walkway-broad',
    weight: 0.22,
    pattern: [
        '##...##',
        '#.....#',
        '#X...X#',
        '#X...X#',
        '#X...X#',
        '#.....#',
        '##...##'
    ]
};

const CANYON_WALKWAY_TURN_BASE = {
    ...CANYON_WALKWAY_BASE,
    id: 'canyon-walkway-turn',
    weight: 0.24,
    sockets: { n: O, e: O, s: C, w: C },
    pattern: [
        '##...##',
        '##...##',
        '#X.....',
        '#X.....',
        '#X.....',
        '#######',
        '#######'
    ]
};

const CANYON_SPLIT_BRIDGE_BASE = {
    ...CANYON_WALKWAY_BASE,
    id: 'canyon-split-bridge',
    weight: 0.14,
    pattern: [
        '##...##',
        '#.....#',
        '#..X..#',
        '#..X..#',
        '#..X..#',
        '#.....#',
        '##...##'
    ]
};

const DEADEND_BASE = {
    id: 'deadend',
    category: 'deadend',
    tutorial: true,
    weight: 0.5,
    roomRole: 'reward',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 1, pickup: 1, enemy: 0 },
    anchors: [
        { id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 1 }
    ],
    sockets: { n: O, e: C, s: C, w: C },
    pattern: [
        '##...##',
        '##...##',
        '#######',
        '#######',
        '#######',
        '#######',
        '#######'
    ]
};

const CANYON_IMPASSABLE_BASE = {
    id: 'canyon-impassable',
    category: 'canyon-impassable',
    tutorial: false,
    weight: 0.5,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    // Its two OPEN3 sockets sit at opposite ends of a solid-wall interior —
    // they never connect to each other inside this tile (that's what makes
    // it genuinely impassable). wfcGenerator.js must never treat it as a
    // pass-through connector between two other cells.
    throughConnects: false,
    sockets: { n: O, e: C, s: O, w: C },
    elevationSockets: {
        ground: { n: O, e: C, s: O, w: C },
        elevated: { n: O, e: C, s: O, w: C }
    },
    pattern: [
        '##...##',
        '#######',
        '#######',
        '#######',
        '#######',
        '#######',
        '##...##'
    ]
};

const RAMP_BASE = {
    id: 'ramp',
    category: 'ramp',
    tutorial: false,
    weight: 0.5,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: C, s: O, w: C },
    elevationSockets: {
        ground: { n: O, e: C, s: C, w: C },
        elevated: { n: C, e: C, s: O, w: C }
    },
    pattern: [
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##'
    ]
};

const BRIDGE_BASE = {
    id: 'bridge',
    category: 'bridge',
    tutorial: false,
    weight: 0.4,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: C, s: O, w: C },
    elevationSockets: {
        ground: { n: C, e: C, s: C, w: C },
        elevated: { n: O, e: C, s: O, w: C }
    },
    pattern: [
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##',
        '##...##'
    ]
};

const LADDER_BASE = {
    id: 'ladder',
    category: 'ladder',
    tutorial: false,
    weight: 0.3,
    roomRole: 'generic',
    decorationSet: 'bunker',
    populationBudget: { large: 0, small: 0, pickup: 0, enemy: 0 },
    anchors: [],
    sockets: { n: O, e: C, s: O, w: C },
    elevationSockets: {
        ground: { n: O, e: C, s: C, w: C },
        elevated: { n: C, e: C, s: O, w: C }
    },
    pattern: [
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###'
    ]
};

export const TILE_CATALOG = Object.freeze([
    SOLID_FILL,
    ...withRotations(ROOM_ALCOVE_BASE, ['s', 'w', 'n', 'e']),
    ...withRotations(ROOM_COMPACT_BASE, ['s', 'w', 'n', 'e']),
    ...withRotations(ROOM_RECTANGLE_BASE, ['s', 'w', 'n', 'e']),
    ...withRotations(ROOM_THROUGH_BASE, ['ns', 'ew']),
    ...withRotations(ROOM_BENT_BASE, ['ne', 'es', 'sw', 'wn']),
    ...withRotations(ROOM_CORNER_BASE, ['ne', 'es', 'sw', 'wn']),
    ...withRotations(ROOM_JUNCTION_BASE, ['nes', 'esw', 'swn', 'wne']),
    ROOM_HUB,
    ...ROOM_ROLE_VARIANTS.flatMap((room) => withRotations(room, ['s', 'w', 'n', 'e'])),
    ...withRotations(CORRIDOR_STRAIGHT_BASE, ['ns', 'ew']),
    ...withRotations(CORRIDOR_NARROW_BASE, ['ns', 'ew']),
    ...withRotations(CORRIDOR_TURN_BASE, ['ne', 'es', 'sw', 'wn']),
    ...withRotations(CORRIDOR_T_BASE, ['nes', 'esw', 'swn', 'wne']),
    CORRIDOR_CROSS,
    ...withRotations(CANYON_WALKWAY_BASE, ['ns', 'ew']),
    ...withRotations(CANYON_WALKWAY_BROAD_BASE, ['ns', 'ew']),
    ...withRotations(CANYON_WALKWAY_TURN_BASE, ['ne', 'es', 'sw', 'wn']),
    ...withRotations(CANYON_SPLIT_BRIDGE_BASE, ['ns', 'ew']),
    ...withRotations(DEADEND_BASE, ['n', 'e', 's', 'w']),
    ...withRotations(CANYON_IMPASSABLE_BASE, ['ns', 'ew']),
    ...withRotations(RAMP_BASE, ['n', 'e', 's', 'w']),
    ...withRotations(BRIDGE_BASE, ['ns', 'ew']),
    ...withRotations(LADDER_BASE, ['n', 'e', 's', 'w'])
]);
