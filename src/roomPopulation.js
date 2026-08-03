function cellKey(cell) {
    return `${cell.x},${cell.y}`;
}

function normalizeCount(value, fallback = 0) {
    if (Number.isFinite(value)) return { min: Math.max(0, value), max: Math.max(0, value) };
    return {
        min: Math.max(0, Number(value?.min) || fallback),
        max: Math.max(0, Number(value?.max) || Number(value?.min) || fallback)
    };
}

export function normalizePopulationBudget(budget = {}) {
    return {
        signature: Math.max(1, Number(budget.signature) || 1),
        large: normalizeCount(budget.large, 1),
        small: normalizeCount(budget.small, 3),
        pickup: normalizeCount(budget.pickup, 0),
        enemy: normalizeCount(
            budget.enemy ?? { min: budget.enemyMin, max: budget.enemyMax },
            0
        )
    };
}

function pickCandidate(candidates, random) {
    if (candidates.length === 0) return null;
    return candidates.splice(Math.floor(random() * candidates.length), 1)[0];
}

function propFrom(list, random, fallback) {
    const source = Array.isArray(list) && list.length > 0 ? list : [fallback];
    return source[Math.floor(random() * source.length)];
}

export function planRoomPopulation(room, grid, random) {
    const budget = normalizePopulationBudget(room.populationBudget);
    const reserved = new Set((room.navigation?.doorLanes ?? []).map(cellKey));
    const candidates = (room.interior ?? []).filter(({ x, y }) => (
        grid?.[y]?.[x] === '.' && !reserved.has(`${x},${y}`)
    ));
    const placements = [];
    const theme = room.themeConfig ?? {};

    const reservePlacement = (kind, type, blocking = false) => {
        const cell = pickCandidate(candidates, random);
        if (!cell) return false;
        reserved.add(cellKey(cell));
        placements.push({
            id: `${room.id}:placement:${placements.length}`,
            roomId: room.id,
            x: cell.x,
            y: cell.y,
            kind,
            type,
            blocking
        });
        return true;
    };

    reservePlacement('signature', propFrom(theme.signatureProps, random, 'prop_bunker_supplies'), true);
    if (theme.ambientProps?.length > 0) {
        reservePlacement('ambient', propFrom(theme.ambientProps, random), false);
    }
    for (let index = 0; index < budget.large.min; index += 1) {
        reservePlacement('large', propFrom(theme.largeProps, random, 'prop_conduit_hub'), true);
    }
    for (let index = 0; index < budget.small.min; index += 1) {
        reservePlacement('small', propFrom(theme.smallProps, random, 'scatter_gravel'), false);
    }
    for (let index = 0; index < budget.pickup.min; index += 1) {
        reservePlacement('pickup', 'room-biased', false);
    }

    const signaturePlaced = placements.some((placement) => placement.kind === 'signature');

    if (theme.rareProps?.length > 0 && random() < 0.15) {
        reservePlacement('rare', propFrom(theme.rareProps, random), false);
    }

    return {
        roomId: room.id,
        budget,
        reserved: [...reserved],
        placements,
        signaturePlaced,
        degraded: !signaturePlaced || placements.filter((p) => p.kind === 'large').length < budget.large.min
    };
}

export function planChunkRoomPopulation(rooms, grid, random) {
    return (rooms ?? []).map((room) => planRoomPopulation(room, grid, random));
}
