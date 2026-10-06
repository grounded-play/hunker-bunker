import { CHUNK_SIZE } from './tileCatalog.js';
import { planInterior, ROOM_GRAMMAR_VERSION } from './roomGrammar.js';
import { carveLine, portalPoint, constrainBorderSockets, addWallShell } from './architecturalMaze.js';

const SIDES = { north: 'n', east: 'e', south: 's', west: 'w' };

// Converts local grammar geometry into the existing final chunk contract.
// No shared RNG consumption and no overlapping authored reservations permitted:
// the caller must run authored-site resolution before selecting this fallback.
export function buildGrammarRoomChunk({ seed, chunkX = 0, chunkY = 0,
    chunkSize = CHUNK_SIZE, openings = {}, tier = 'standard',
    areaId = 'industrial', role = null, theme = null } = {}) {
    if (chunkSize !== CHUNK_SIZE || !Number.isInteger(chunkX) || !Number.isInteger(chunkY)) {
        throw new Error('Grammar adapter requires current chunk dimensions and integer coordinates');
    }
    const active = Object.entries(SIDES).filter(([side]) => openings[side]?.open);
    if (!active.length) return null;
    for (const [side] of active) {
        if (!Number.isInteger(openings[side].offset) || openings[side].offset < 0
            || openings[side].offset >= Math.floor(chunkSize / 2)) throw new Error('Invalid chunk portal offset');
    }
    const chunkKey = `${chunkX},${chunkY}`;
    const id = `grammar:${ROOM_GRAMMAR_VERSION}:${seed}:${chunkKey}`;
    const plan = planInterior({ seed, areaId, roomId: id, tier,
        sockets: active.map(([, side]) => ({ side, width: 3, offset: 7 })) });
    const ox = Math.floor((chunkSize - plan.width) / 2), oy = Math.floor((chunkSize - plan.height) / 2);
    const translate = p => ({ ...p, x: p.x + ox, y: p.y + oy });
    const grid = Array.from({ length: chunkSize }, () => Array(chunkSize).fill('X'));
    for (let y = 0; y < plan.height; y += 1) for (let x = 0; x < plan.width; x += 1) grid[oy + y][ox + x] = plan.grid[y][x];
    const doors = plan.doors.map(d => ({ ...d, id: `${id}:door:${d.side}`, neighborIndex: null,
        cells: d.cells.map(translate), approach: translate(d.approach) }));
    for (const [side, short] of active) {
        const portal = portalPoint(chunkSize, side, openings[side].offset);
        const door = doors.find(d => d.side === short).cells[1];
        // Doglegs stay outside the room shell until the declared doorway.
        const vertical = side === 'north' || side === 'south';
        const gutter = vertical
            ? { x: portal.x, y: side === 'north' ? oy - 3 : oy + plan.height + 2 }
            : { x: side === 'west' ? ox - 3 : ox + plan.width + 2, y: portal.y };
        const turn = vertical ? { x: door.x, y: gutter.y } : { x: gutter.x, y: door.y };
        carveLine(grid, portal, gutter, 1);
        carveLine(grid, gutter, turn, 1);
        carveLine(grid, turn, door, 1);
    }
    constrainBorderSockets(grid, openings);
    addWallShell(grid);
    for (const door of doors) for (const p of door.cells) grid[p.y][p.x] = 'D';
    const interior = [], wallCells = [];
    for (let y = oy; y < oy + plan.height; y += 1) for (let x = ox; x < ox + plan.width; x += 1) {
        if (grid[y][x] === '.') interior.push({ x, y });
        if (grid[y][x] === '#') wallCells.push({ x, y });
    }
    const anchors = plan.anchors.map(p => ({ ...translate(p), id: `${id}:anchor:${p.role}` }));
    const reserved = plan.reservedCells.map(cell => { const [x, y] = cell.split(',').map(Number); return translate({ x, y }); });
    const assignedRole = role ?? (
        plan.profile === 'cryo-medical' || plan.profile === 'medical' ? 'medical'
        : plan.profile === 'biomech' ? 'nest'
        : plan.profile === 'industrial' ? 'engineering'
        : 'generic'
    );
    const assignedTheme = theme ?? (
        plan.profile === 'cryo-medical' || plan.profile === 'medical' ? 'cryo'
        : plan.profile === 'biomech' ? 'bio'
        : plan.profile === 'industrial' ? 'bunker-utility'
        : null
    );
    const room = { id, chunkKey, role: assignedRole, theme: assignedTheme, sizeClass: tier === 'major' ? 'large' : 'standard',
        footprint: interior, interior, wallCells, bounds: { left: ox, top: oy, right: ox + plan.width - 1, bottom: oy + plan.height - 1 },
        doors, navigation: { doorLanes: doors.flatMap(d => d.cells), primaryRoute: reserved, reserved },
        populationBudget: { signature: 1, large: 1, small: 3, pickup: 1, enemy: 0 },
        gate: null, placements: [], encounter: null,
        grammar: { version: plan.generatorVersion, motif: plan.diagnostics.motif,
            modules: plan.modules.map(translate), anchors } };
    return { version: 1, chunkKey, generatorId: 'grammar-room', grid, rooms: [room], anchors,
        zones: [], sockets: structuredClone(openings), wayfindingMarkers: [],
        diagnostics: { ...plan.diagnostics, architecturalMode: 'grammar-room', discardedGenerationCount: 0,
            canyonCellCount: grid.flat().filter(c => c === 'X').length } };
}
