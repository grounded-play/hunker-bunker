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

export function isWallBackedPropType(type) {
    return type === 'prop_fungal_tendril_altar'
        || type === 'prop_flesh_steel_cradle'
        || type === 'prop_shrine_plinth_broken'
        || type === 'prop_biomech_sphincter_hatch_vent'
        || type === 'prop_biomech_tracheal_wall_pipe'
        || type === 'prop_decon_eyewash_shower_station'
        || type === 'prop_exhaust_blower_fan_hood'
        || type === 'prop_wall_cable_tray_swag'
        || type === 'prop_vertebral_cable_riser'
        || type === 'prop_oxygen_bottle_cascade_rack'
        || type === 'prop_pipe_organ_heat_exchanger'
        || type === 'prop_ceiling_crane_hoist';
}

function pickCandidate(candidates, random, grid, center, wallOnly = false) {
    if (candidates.length === 0) return null;
    // Props belong at the perimeter: keep the room center open for the player,
    // ship consoles, mission fixtures, and readable combat lanes. Wall-backed
    // props (like altars and cradles) strictly require an adjacent wall tile.
    let pool = wallOnly
        ? candidates.filter((cell) => findCellWallNormal(cell, grid) !== null)
        : candidates;
    if (pool.length === 0 && wallOnly) pool = candidates;
    const scored = pool.map((cell) => ({
        cell,
        score: wallAdjacency(cell, grid) * 100
            + Math.hypot(cell.x - center.x, cell.y - center.y)
            + random() * 0.01
    })).sort((a, b) => b.score - a.score);
    const selected = scored[0].cell;
    const indexInCandidates = candidates.indexOf(selected);
    if (indexInCandidates >= 0) candidates.splice(indexInCandidates, 1);
    return selected;
}

// Lived-in world M2 (docs/planning/sprint-49-lived-in-world-continuation.md):
// the key art ties each functional anchor to the floor with run-off, residue
// and service runs. Rules match anchor families by name, first match wins.
// Decals must stay inside threeGame's FLOOR_OVERLAY_TYPES (drawn flat); the
// rust/water/spore stains are wall decals and would stand upright.
export const GROUNDING_RULES = Object.freeze([
    {
        match: /cryo|coolant|oxygen|o2_|frost|icey|thermal|eyewash|decon/,
        decals: ['scatter_coolant_puddle', 'decal_frost_bloom_1', 'decal_condensation_run'],
        piece: 'prop_floor_drainage_sump_trough'
    },
    {
        match: /autopsy|dissection|surgical|medical|specimen|vital|diagnostic|triage/,
        decals: ['decal_bio_sample_spill', 'decal_fluid_seep'],
        piece: 'prop_floor_drainage_sump_trough'
    },
    {
        match: /biomech|flesh|hive|spore|fungal|alien|egg|incubator|umbilical|mycelium/,
        decals: ['scatter_slime_puddle', 'decal_spore_growth_patch', 'decal_fluid_seep'],
        piece: null
    },
    {
        match: /lectern|terminal|conduit|junction|console|fabricator|engineering|generator|tesla|cyber|exchanger|gantry/,
        decals: ['decal_grease_pool', 'scatter_cable_coil', 'decal_floor_grate_01'],
        piece: 'prop_floor_conduit_bridge'
    },
    {
        match: /votive|reliquary|shrine|saint|altar/,
        decals: ['decal_floor_medallion_01', 'decal_floor_medallion_02', 'decal_floor_medallion_03', 'decal_floor_medallion_04'],
        piece: null
    },
    {
        match: /supplies|ammo|locker|crate|drum|storage/,
        decals: ['decal_oil_spill_patch', 'scatter_bolts'],
        piece: null
    }
]);

/**
 * Lived-in world M3: a room's object budget from its usable floor instead of
 * the fixed five, clamp(floor(floorCells / 12) + 2, 3, 8). Off by default
 * (`planRoomPopulation(..., { areaBudget: true })`, behind
 * featureFlags.isAreaRoomDensityEnabled); it stays off until a paired Deck
 * capture shows presented p95 does not regress.
 */
export function areaRoomObjectLimit(floorCells) {
    const cells = Number.isFinite(floorCells) ? Math.max(0, floorCells) : 0;
    return Math.min(8, Math.max(3, Math.floor(cells / 12) + 2));
}

/** Flat grounding decals per room. They sit outside the five-object cap. */
export const GROUNDING_DECAL_LIMIT = 2;
const GROUNDED_ANCHOR_KINDS = ['signature', 'large', 'ammo-cache', 'structural', 'interaction', 'reward', 'lore'];

export function groundingRuleFor(type) {
    const name = String(type ?? '');
    return GROUNDING_RULES.find((rule) => rule.match.test(name)) ?? null;
}

// FNV-1a: grounding choices come from the room and anchor, not the shared RNG,
// so adding them never reshuffles anything planned after this room.
function stableHash(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
}

function propFrom(list, random, fallback) {
    const source = Array.isArray(list) && list.length > 0 ? list : [fallback];
    return source[Math.floor(random() * source.length)];
}

export function planRoomPopulation(room, grid, random, { grounding = true, areaBudget = false } = {}) {
    const budget = normalizePopulationBudget(room.populationBudget);
    const doorLanes = room.navigation?.doorLanes ?? [];
    const fixtureCells = room.navigation?.reserved ?? [];
    const reserved = new Set([...doorLanes, ...fixtureCells].map(cellKey));
    for (const door of doorLanes) {
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) reserved.add(`${door.x + dx},${door.y + dy}`);
        }
    }
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
    // Keep the authored gameplay anchors legible, then spend the remaining
    // budget on non-blocking edge dressing. Five is deliberate: the Thursday
    // Deck capture showed prop destruction on the worst frame window, so room
    // life comes from a bounded mix of one small prop, one decal and an
    // occasional rare landmark rather than an unbounded scatter pass.
    const floorCells = (room.interior ?? []).filter(({ x, y }) => grid?.[y]?.[x] === '.').length;
    const roomObjectLimit = areaBudget ? areaRoomObjectLimit(floorCells) : 5;
    const budgetedObjectCount = () => placements.filter((placement) => (
        placement.kind !== 'grounding-decal'
    )).length;

    const reservePlacement = (kind, type, blocking = false) => {
        if (kind !== 'signature' && budgetedObjectCount() >= roomObjectLimit) return false;
        const wallOnly = isWallBackedPropType(type);
        const cell = pickCandidate(candidates, random, grid, center, wallOnly);
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

    if (grounding) {
        // Ground anchors before optional edge dressing so a GLB service piece
        // spends the ambient portion of the five-object budget rather than
        // losing its slot to an unrelated small prop.
        const free = new Map(candidates.map((cell) => [cellKey(cell), cell]));
        const anchors = GROUNDED_ANCHOR_KINDS.flatMap((kind) => placements.filter((placement) => placement.kind === kind));
        let decals = 0;
        let pieceUsed = false;
        for (const anchor of anchors) {
            const rule = groundingRuleFor(anchor.type);
            if (!rule) continue;
            const hash = stableHash(`${room.id}:${anchor.x},${anchor.y}:${anchor.type}`);
            const take = (offset) => {
                const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]]
                    .map(([dx, dy]) => free.get(`${anchor.x + dx},${anchor.y + dy}`))
                    .filter(Boolean);
                if (beside.length === 0) return null;
                const cell = beside[(hash + offset) % beside.length];
                free.delete(cellKey(cell));
                const index = candidates.indexOf(cell);
                if (index >= 0) candidates.splice(index, 1);
                reserved.add(cellKey(cell));
                return cell;
            };
            if (decals < GROUNDING_DECAL_LIMIT && rule.decals.length) {
                const cell = take(0);
                if (cell) {
                    placements.push({
                        id: `${room.id}:grounding:${placements.length}`,
                        roomId: room.id,
                        anchorPlacementId: anchor.id,
                        x: cell.x,
                        y: cell.y,
                        kind: 'grounding-decal',
                        type: rule.decals[(hash >>> 8) % rule.decals.length],
                        blocking: false,
                        wallNormal: null
                    });
                    decals += 1;
                }
            }
            if (rule.piece && !pieceUsed && budgetedObjectCount() < roomObjectLimit) {
                const cell = take(3);
                if (cell) {
                    placements.push({
                        id: `${room.id}:grounding:${placements.length}`,
                        roomId: room.id,
                        anchorPlacementId: anchor.id,
                        x: cell.x,
                        y: cell.y,
                        kind: 'grounding',
                        type: rule.piece,
                        blocking: false,
                        wallNormal: null
                    });
                    pieceUsed = true;
                }
            }
        }
    }

    // The theme catalog has always carried small, ambient and rare pools, but
    // the population planner previously ignored all three. That left finished
    // props and environmental-story decals unused while rooms stopped after
    // two large objects. These additions never block navigation and retain the
    // same doorway apron, fixture reservation and center-lane exclusions.
    if (budget.small.min > 0 && theme.smallProps?.length) {
        reservePlacement('small', propFrom(theme.smallProps, random, 'scatter_bolts'), false);
    }
    if (theme.rareProps?.length && random() < 0.2) {
        reservePlacement('rare', propFrom(theme.rareProps, random, theme.rareProps[0]), false);
    }
    if (budget.small.min > 1 && theme.ambientProps?.length) {
        reservePlacement('ambient', propFrom(theme.ambientProps, random, theme.ambientProps[0]), false);
    }

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

export function planChunkRoomPopulation(rooms, grid, random, options = {}) {
    return (rooms ?? []).map((room) => planRoomPopulation(room, grid, random, options));
}
