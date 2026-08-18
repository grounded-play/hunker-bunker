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
    const parsedSignature = budget.signature == null ? 1 : Number(budget.signature);
    return {
        signature: Number.isFinite(parsedSignature) ? Math.max(0, Math.floor(parsedSignature)) : 1,
        large: normalizeCount(budget.large, 1),
        small: normalizeCount(budget.small, 3),
        pickup: normalizeCount(budget.pickup, 0),
        enemy: normalizeCount(
            budget.enemy ?? { min: budget.enemyMin, max: budget.enemyMax },
            0
        )
    };
}

function anchorCell(anchor) {
    const x = anchor?.localX ?? anchor?.x;
    const y = anchor?.localZ ?? anchor?.y ?? anchor?.z;
    if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
    return { x, y };
}

function isCellOnGrid(cell, grid) {
    return Boolean(cell && grid?.[cell.y]?.[cell.x] != null);
}

function wallAdjacency(cell, grid) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .reduce((count, [dx, dy]) => count + (grid?.[cell.y + dy]?.[cell.x + dx] === '#' ? 1 : 0), 0);
}

function findCellWallNormal(cell, grid) {
    if (!cell || !grid) return null;
    if (grid?.[cell.y - 1]?.[cell.x] === '#') return { x: 0, z: 1 };
    if (grid?.[cell.y + 1]?.[cell.x] === '#') return { x: 0, z: -1 };
    if (grid?.[cell.y]?.[cell.x - 1] === '#') return { x: 1, z: 0 };
    if (grid?.[cell.y]?.[cell.x + 1] === '#') return { x: -1, z: 0 };
    return null;
}

function pickCandidate(candidates, random, grid, center) {
    if (candidates.length === 0) return null;
    // Props belong at the perimeter: keep the room center open for the player,
    // ship consoles, mission fixtures, and readable combat lanes. Randomness
    // only breaks ties between equally wall-adjacent cells.
    const scored = candidates.map((cell) => ({
        cell,
        score: wallAdjacency(cell, grid) * 100
            + Math.hypot(cell.x - center.x, cell.y - center.y)
            + random() * 0.01
    })).sort((a, b) => b.score - a.score);
    const selected = scored[0].cell;
    candidates.splice(candidates.indexOf(selected), 1);
    return selected;
}

function propFrom(list, random, fallback) {
    const source = Array.isArray(list) && list.length > 0 ? list : [fallback];
    return source[Math.floor(random() * source.length)];
}

export function planRoomPopulation(room, grid, random) {
    const budget = normalizePopulationBudget(room.populationBudget);
    const doorLanes = room.navigation?.doorLanes ?? [];
    const fixtureCells = room.navigation?.reserved ?? [];
    const reserved = new Set([...doorLanes, ...fixtureCells].map(cellKey));
    for (const fixture of fixtureCells) {
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) reserved.add(`${fixture.x + dx},${fixture.y + dy}`);
        }
    }

    const structuralAnchors = room.structuralAnchors
        ?? room.roomBuild?.structuralAnchors
        ?? room.contentPlan?.structural
        ?? [];
    const contentAnchorGroups = [
        structuralAnchors,
        room.interactionAnchors,
        room.rewardAnchors,
        room.loreAnchors,
        room.roomBuild?.interactionAnchors,
        room.roomBuild?.rewardAnchors,
        room.roomBuild?.loreAnchors,
        room.contentPlan?.structural,
        room.contentPlan?.interactions,
        room.contentPlan?.rewards,
        room.contentPlan?.lore,
        room.contentPlan?.questProps
    ];
    for (const anchors of contentAnchorGroups) {
        for (const anchor of anchors ?? []) {
            const cell = anchorCell(anchor);
            if (isCellOnGrid(cell, grid)) reserved.add(cellKey(cell));
        }
    }

    const rawInterior = room.interior ?? [];
    const roomCenter = rawInterior.length > 0 ? {
        x: rawInterior.reduce((sum, cell) => sum + cell.x, 0) / rawInterior.length,
        y: rawInterior.reduce((sum, cell) => sum + cell.y, 0) / rawInterior.length
    } : { x: 0, y: 0 };
    const candidates = (room.interior ?? []).filter(({ x, y }) => (
        grid?.[y]?.[x] === '.'
        && !reserved.has(`${x},${y}`)
        && Math.hypot(x - roomCenter.x, y - roomCenter.y) >= 0.75
    ));
    const placements = [];
    const theme = room.themeConfig ?? {};
    const center = roomCenter;
    const propLimit = room.role === 'medical' || room.role === 'cryo-lab' ? 3 : 2;

    const reservePlacement = (kind, type, blocking = false) => {
        if (placements.length >= 3) return false;
        if (kind !== 'pickup' && placements.filter((placement) => placement.kind !== 'pickup').length >= propLimit) return false;
        const cell = pickCandidate(candidates, random, grid, center);
        if (!cell) return false;
        reserved.add(cellKey(cell));
        const wallNormal = findCellWallNormal(cell, grid);
        placements.push({
            id: `${room.id}:placement:${placements.length}`,
            roomId: room.id,
            x: cell.x,
            y: cell.y,
            kind,
            type,
            blocking,
            wallNormal
        });
        return true;
    };

    // Authored structures deliberately may sit on '#' obstruction cells: the
    // stamped obstruction supplies collision while this placement supplies
    // its visible machinery/partition. Floor-only validation erases it.
    const placedAnchorCells = new Set();
    for (const anchor of structuralAnchors) {
        const cell = anchorCell(anchor);
        if (!isCellOnGrid(cell, grid) || placedAnchorCells.has(cellKey(cell))) continue;
        placedAnchorCells.add(cellKey(cell));
        reserved.add(cellKey(cell));
        placements.push({
            id: `${room.id}:structural:${placements.length}`,
            roomId: room.id,
            anchorId: anchor.id ?? null,
            x: cell.x,
            y: cell.y,
            kind: 'structural',
            type: anchor.type ?? 'structural_partition',
            blocking: anchor.blocking !== false
        });
    }

    const typedContentGroups = [
        {
            kind: 'interaction',
            anchors: room.interactionAnchors ?? room.roomBuild?.interactionAnchors ?? room.contentPlan?.interactions ?? [],
            defaultType: 'console',
            defaultBlocking: false
        },
        {
            kind: 'reward',
            anchors: room.rewardAnchors ?? room.roomBuild?.rewardAnchors ?? room.contentPlan?.rewards ?? [],
            defaultType: 'prop_bunker_supplies',
            defaultBlocking: true
        },
        {
            kind: 'lore',
            anchors: room.loreAnchors ?? room.roomBuild?.loreAnchors ?? room.contentPlan?.lore ?? [],
            defaultType: 'lore_terminal',
            defaultBlocking: true
        }
    ];

    for (const group of typedContentGroups) {
        for (const anchor of group.anchors) {
            if (!anchor?.type) continue;
            const cell = anchorCell(anchor);
            if (!isCellOnGrid(cell, grid) || placedAnchorCells.has(cellKey(cell))) continue;
            placedAnchorCells.add(cellKey(cell));
            reserved.add(cellKey(cell));
            placements.push({
                id: `${room.id}:${group.kind}:${placements.length}`,
                roomId: room.id,
                anchorId: anchor.id ?? null,
                x: cell.x,
                y: cell.y,
                kind: group.kind,
                type: anchor.type ?? group.defaultType,
                blocking: anchor.blocking !== false && (anchor.blocking === true || group.defaultBlocking)
            });
        }
    }

    if (room.role === 'medical' || room.role === 'cryo-lab') {
        const medicalProps = [...new Set([
            ...(theme.signatureProps ?? []),
            ...(theme.largeProps ?? [])
        ])].slice(0, 3);
        while (medicalProps.length < 3) {
            medicalProps.push(['prop_medical_bed', 'prop_diagnostic_console', 'prop_surgical_cart'][medicalProps.length]);
        }
        if (budget.signature > 0) {
            medicalProps.forEach((type, index) => reservePlacement(index === 0 ? 'signature' : 'large', type, true));
        } else {
            medicalProps.slice(0, Math.min(3, budget.large.min)).forEach((type) => reservePlacement('large', type, true));
        }
    } else {
        if (budget.signature > 0) {
            reservePlacement('signature', propFrom(theme.signatureProps, random, 'prop_bunker_supplies'), true);
        }
        if (['reward', 'storage', 'security'].includes(room.role)) {
            reservePlacement('ammo-cache', 'prop_bunker_supplies', true);
        } else if (budget.large.min > 0 && theme.largeProps?.length) {
            reservePlacement('large', propFrom(theme.largeProps, random, 'prop_conduit_hub'), true);
        }
    }
    if (budget.pickup.min > 0) reservePlacement('pickup', 'room-biased', false);

    const signaturePlaced = placements.some((placement) => placement.kind === 'signature');

    return {
        roomId: room.id,
        budget,
        reserved: [...reserved],
        placements,
        signaturePlaced,
        degraded: budget.signature > 0 && !signaturePlaced
    };
}

export function planChunkRoomPopulation(rooms, grid, random) {
    return (rooms ?? []).map((room) => planRoomPopulation(room, grid, random));
}
