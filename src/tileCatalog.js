// A catalog of authored 7x7 meta-tiles used by the WFC generator
// (src/wfcGenerator.js) to lay out a chunk's MAZE landform. See
// docs/superpowers/specs/2026-07-27-wfc-tile-maze-generation-design.md §1-2.

export const SOCKET = Object.freeze({ CLOSED: 'CLOSED', OPEN3: 'OPEN3' });

// Every bunker tile is an island in a canyon. Reading inward from any edge:
//
//   X  pit     1  the chasm floor; shared with the neighbouring tile
//   C  cliff   1  the vertical face rising out of the pit
//   O  ledge   3  open ground outside the bunker, at the cliff edge
//   #  wall    -  the authored core's own perimeter
//   .  room    -  the authored core's interior
//
// PLAINS tiles skip the pit and cliff entirely and are ledge all the way out,
// so neighbouring plains merge into continuous open exterior with no chasm.
//
// TILE_SIZE = ROOM_SIZE + 2*BAND_THICKNESS, and a lattice of N cells spans
// N*(TILE_SIZE-1)+1 — CHUNK_SIZE. Those numbers are locked together; changing
// one without the others silently corrupts world generation.
export const ROOM_SIZE = 7;
export const BAND_THICKNESS = 5;
export const TILE_SIZE = ROOM_SIZE + (BAND_THICKNESS * 2);
export const LATTICE = 3;
export const CHUNK_SIZE = (LATTICE * (TILE_SIZE - 1)) + 1;

export const GLYPH = Object.freeze({
    PIT: 'X', CLIFF: 'C', LEDGE: 'O', WALL: '#', FLOOR: '.'
});

// No wall band: every authored core carries its own perimeter, and that
// perimeter IS the bunker wall. Emitting one too would double the shell.
const BANDS_CANYON = [GLYPH.PIT, GLYPH.CLIFF, GLYPH.LEDGE, GLYPH.LEDGE, GLYPH.LEDGE];
const BANDS_PLAIN = [GLYPH.LEDGE, GLYPH.LEDGE, GLYPH.LEDGE, GLYPH.LEDGE, GLYPH.LEDGE];

const CAUSEWAY_START = Math.floor((TILE_SIZE - 3) / 2);
const CAUSEWAY_CELLS = [CAUSEWAY_START, CAUSEWAY_START + 1, CAUSEWAY_START + 2];

// Wraps an authored interior in its bands and cuts a 3-wide causeway out on
// every OPEN3 side. Without the causeway the shared edge lane would be
// unbroken pit: every tile would validate cleanly while being sealed off.
export function wrapWithBands(core, sockets, { plain = false } = {}) {
    const open = ['n', 'e', 's', 'w'].filter((d) => sockets?.[d] === SOCKET.OPEN3);

    // Closed on all four sides means unenterable, so it must hold no walkable
    // ledge — that is exactly the stranded pocket solid filler exists to avoid.
    if (open.length === 0) {
        return Array.from({ length: TILE_SIZE }, () => GLYPH.WALL.repeat(TILE_SIZE));
    }

    const bands = plain ? BANDS_PLAIN : BANDS_CANYON;
    const grid = [];
    for (let y = 0; y < TILE_SIZE; y += 1) {
        const row = [];
        for (let x = 0; x < TILE_SIZE; x += 1) {
            const depth = Math.min(x, y, TILE_SIZE - 1 - x, TILE_SIZE - 1 - y);
            row.push(depth < BAND_THICKNESS ? bands[depth] : core[y - BAND_THICKNESS][x - BAND_THICKNESS]);
        }
        grid.push(row);
    }
    for (const side of open) {
        for (const lane of CAUSEWAY_CELLS) {
            for (let d = 0; d < BAND_THICKNESS; d += 1) {
                const far = TILE_SIZE - 1 - d;
                if (side === 'n') grid[d][lane] = GLYPH.FLOOR;
                if (side === 's') grid[far][lane] = GLYPH.FLOOR;
                if (side === 'w') grid[lane][d] = GLYPH.FLOOR;
                if (side === 'e') grid[lane][far] = GLYPH.FLOOR;
            }
        }
    }
    return grid.map((r) => r.join(''));
}

export function defineTile(base) {
    const { core, anchors, plain, ...rest } = base;
    return {
        ...rest,
        ...(plain ? { plain: true } : {}),
        pattern: wrapWithBands(core, base.sockets, { plain }),
        ...(anchors ? { anchors: anchors.map((a) => ({ ...a, x: a.x + BAND_THICKNESS, y: a.y + BAND_THICKNESS })) } : {})
    };
}


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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
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
    core: [
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###',
        '###.###'
    ]
};


// ── Plains ──────────────────────────────────────────────────────────────
// NOT in TILE_CATALOG, deliberately. A plain's edge lane is ledge while every
// canyon tile's is pit, so the two can never satisfy validateLatticeSeams as
// neighbours — plains cannot be WFC tiles. They are exported for the landform
// layer (src/landforms.js chunk archetypes), which selects whole chunks rather
// than lattice cells and so is free of the seam constraint. wrapWithBands
// already supports them via { plain: true }.
// Open exterior: no pit, no cliff, no bunker shell. `plain: true` swaps the
// canyon bands for ledge all the way out, so adjacent plains merge into
// continuous ground you can simply walk across. Open on all four sides —
// a plain with a closed side would read as an invisible wall in open country.
export const PLAIN_OPEN_BASE = {
    id: 'plain-open',
    category: 'plain',
    plain: true,
    tutorial: false,
    weight: 0.55,
    roomRole: 'generic',
    decorationSet: 'cave',
    populationBudget: { large: 0, small: 2, pickup: 1, enemy: 1 },
    anchors: [{ id: 'center', x: 3, y: 3, kind: 'landmark', clearance: 2 }],
    sockets: { n: O, e: O, s: O, w: O },
    core: [
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......',
        '.......'
    ]
};

// Scattered rock on otherwise open ground, so plains do not all read alike.
export const PLAIN_SCATTER_BASE = {
    ...PLAIN_OPEN_BASE,
    id: 'plain-scatter',
    weight: 0.35,
    populationBudget: { large: 1, small: 2, pickup: 1, enemy: 1 },
    anchors: [{ id: 'center', x: 3, y: 3, kind: 'large-prop', clearance: 1 }],
    core: [
        '.......',
        '..#....',
        '.......',
        '....#..',
        '.......',
        '..#....',
        '.......'
    ]
};

export const TILE_CATALOG = Object.freeze([
    defineTile(SOLID_FILL),
    ...withRotations(defineTile(ROOM_ALCOVE_BASE), ['s', 'w', 'n', 'e']),
    ...withRotations(defineTile(ROOM_COMPACT_BASE), ['s', 'w', 'n', 'e']),
    ...withRotations(defineTile(ROOM_RECTANGLE_BASE), ['s', 'w', 'n', 'e']),
    ...withRotations(defineTile(ROOM_THROUGH_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(ROOM_BENT_BASE), ['ne', 'es', 'sw', 'wn']),
    ...withRotations(defineTile(ROOM_CORNER_BASE), ['ne', 'es', 'sw', 'wn']),
    ...withRotations(defineTile(ROOM_JUNCTION_BASE), ['nes', 'esw', 'swn', 'wne']),
    defineTile(ROOM_HUB),
    ...ROOM_ROLE_VARIANTS.flatMap((room) => withRotations(defineTile(room), ['s', 'w', 'n', 'e'])),
    ...withRotations(defineTile(CORRIDOR_STRAIGHT_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(CORRIDOR_NARROW_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(CORRIDOR_TURN_BASE), ['ne', 'es', 'sw', 'wn']),
    ...withRotations(defineTile(CORRIDOR_T_BASE), ['nes', 'esw', 'swn', 'wne']),
    defineTile(CORRIDOR_CROSS),
    ...withRotations(defineTile(CANYON_WALKWAY_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(CANYON_WALKWAY_BROAD_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(CANYON_WALKWAY_TURN_BASE), ['ne', 'es', 'sw', 'wn']),
    ...withRotations(defineTile(CANYON_SPLIT_BRIDGE_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(DEADEND_BASE), ['n', 'e', 's', 'w']),
    ...withRotations(defineTile(CANYON_IMPASSABLE_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(RAMP_BASE), ['n', 'e', 's', 'w']),
    ...withRotations(defineTile(BRIDGE_BASE), ['ns', 'ew']),
    ...withRotations(defineTile(LADDER_BASE), ['n', 'e', 's', 'w'])
]);
