const SIDE_ORIENTATION = Object.freeze({
    n: 'horizontal',
    s: 'horizontal',
    e: 'vertical',
    w: 'vertical'
});

function doorChanceForRoom(room) {
    if (room.role === 'security') return 1;
    if (['medical', 'story', 'reward', 'cryo-lab'].includes(room.role)) return 0.82;
    if (['utility', 'engineering', 'storage'].includes(room.role)) return 0.62;
    if (['camp', 'nest', 'hive'].includes(room.role)) return 0.72;
    return 0.34;
}

export function planProceduralDoors(rooms, random, { tutorial = false, forceAtLeastOne = false } = {}) {
    const records = [];
    const occupied = new Set();
    for (const room of rooms ?? []) {
        for (const doorway of room.doors ?? []) {
            const center = doorway.cells?.[Math.floor(doorway.cells.length / 2)];
            if (!center) continue;
            const key = `${center.x},${center.y}`;
            if (occupied.has(key) || random() > doorChanceForRoom(room)) continue;
            occupied.add(key);
            records.push({
                id: doorway.id,
                roomId: room.id,
                chunkKey: room.chunkKey,
                localX: center.x,
                localY: center.y,
                cells: doorway.cells.map((cell) => ({ x: cell.x, y: cell.y })),
                side: doorway.side,
                orientation: SIDE_ORIENTATION[doorway.side],
                style: room.themeConfig?.doorStyle ?? 'bunker',
                state: 'closed',
                lock: null,
                hp: tutorial ? 3 : 6,
                maxHp: tutorial ? 3 : 6,
                autoClose: false
            });
        }
    }
    if (forceAtLeastOne && records.length === 0) {
        const room = (rooms ?? []).find((candidate) => candidate.doors?.length);
        const doorway = room?.doors?.[0];
        const center = doorway?.cells?.[Math.floor((doorway.cells?.length ?? 1) / 2)];
        if (room && doorway && center) {
            records.push({
                id: doorway.id,
                roomId: room.id,
                chunkKey: room.chunkKey,
                localX: center.x,
                localY: center.y,
                cells: doorway.cells.map((cell) => ({ x: cell.x, y: cell.y })),
                side: doorway.side,
                orientation: SIDE_ORIENTATION[doorway.side],
                style: room.themeConfig?.doorStyle ?? 'bunker',
                state: 'closed',
                lock: null,
                hp: tutorial ? 3 : 6,
                maxHp: tutorial ? 3 : 6,
                autoClose: false
            });
        }
    }
    return records;
}

export function stampDoorRecords(grid, records) {
    for (const door of records ?? []) {
        const cells = door.cells?.length
            ? door.cells
            : [{ x: door.localX, y: door.localY }];
        for (const cell of cells) {
            if (grid?.[cell.y]?.[cell.x] === '.') {
                grid[cell.y][cell.x] = 'D';
            }
        }
    }
    return grid;
}

export function transitionDoorState(door, action, unlocked = true) {
    if (!door) return null;
    if (door.state === 'destroyed') return door;
    if (door.lock && !unlocked) return { ...door, state: 'locked' };
    if (action === 'destroy') return { ...door, state: 'destroyed', hp: 0 };
    if (action === 'open' || (action === 'toggle' && door.state !== 'open')) {
        return { ...door, state: 'open' };
    }
    if (action === 'close' || action === 'toggle') return { ...door, state: 'closed' };
    return door;
}

export function serializeDoorStates(states) {
    return [...(states?.values?.() ?? [])].map((door) => ({ ...door }));
}

export function restoreDoorStates(records) {
    return new Map((records ?? []).map((door) => [door.id, { ...door }]));
}
