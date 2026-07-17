// ── The Bunker Tree ───────────────────────────────────────────
// Progression used to live on three disconnected surfaces: the per-class
// skill tree (real row/col topology), the COMBAT MATRIX weapon cards, and
// the ship-system cards (O2 generator, site goals, tier-2 installs). This
// module is an ADAPTER, not a rewrite: it normalizes all three into one
// node graph so a single tree UI can render them, while every purchase
// still delegates to the existing BankManager paths and every storage key
// stays exactly as it was (the save-compat comments in bank.js are
// load-bearing).
//
// Nodes carry structure only — no affordability or unlock state. The
// renderer (threeGame) computes state through the same bank methods the
// old surfaces used, so behavior is provably unchanged.

import {
    CLASS_SKILL_TREES,
    WEAPON_UPGRADE_ORDER,
    WEAPON_UPGRADES_CONFIG,
    GOAL_ORDER,
    GOAL_COSTS,
    GOAL_LEVEL2_COSTS,
    O2_GENERATOR_UPGRADES,
    TIER2_UPGRADE_ORDER,
    TIER2_UPGRADE_CONFIGS
} from './bank.js';

export const TREE_BRANCHES = Object.freeze(['class', 'combat', 'ship']);

export const TREE_BRANCH_LABELS = Object.freeze({
    class: 'CLASS PROTOCOLS',
    combat: 'COMBAT MATRIX',
    ship: 'SHIP SYSTEMS'
});

export const TREE_GRAPH_COLUMNS = 7;

const GOAL_LABELS = Object.freeze({
    o2Bubble: 'O₂ BUBBLE',
    hullExpansion: 'HULL MATRIX',
    radarNode: 'RADAR NODE',
    reactorCompressor: 'REACTOR CORE'
});

const GOAL_DESCS = Object.freeze({
    o2Bubble: 'Repair the O₂ generator field around the ship.',
    hullExpansion: 'Expand the hull bay. Unlocks deeper storage and tier-2 installs.',
    radarNode: 'Raise the scanner mast in the CRYO sector.',
    reactorCompressor: 'Install the reactor compressor in the BIO sector.'
});

const CLASS_GRAPH_SLOTS = Object.freeze([
    Object.freeze({ row: 1, col: 2 }),
    Object.freeze({ row: 3, col: 1 }),
    Object.freeze({ row: 3, col: 3 }),
    Object.freeze({ row: 7, col: 2 }),
    Object.freeze({ row: 13, col: 1 }),
    Object.freeze({ row: 13, col: 3 })
]);

const COMBAT_GRAPH_SLOTS = Object.freeze({
    ammoCapacity: Object.freeze({ row: 1, col: 4, graphPrereqs: Object.freeze([]) }),
    shotSpeed: Object.freeze({ row: 3, col: 4, graphPrereqs: Object.freeze(['weapon_ammoCapacity']) }),
    ammoRefill: Object.freeze({ row: 5, col: 3, graphPrereqs: Object.freeze(['weapon_ammoCapacity', 'goal_o2Bubble']) }),
    shotDamage: Object.freeze({ row: 7, col: 4, graphPrereqs: Object.freeze(['weapon_shotSpeed', 'goal_hullExpansion']) }),
    shotAmount: Object.freeze({ row: 9, col: 4, graphPrereqs: Object.freeze(['weapon_shotDamage']) })
});

const GOAL_GRAPH_SLOTS = Object.freeze({
    o2Bubble: Object.freeze({ row: 3, col: 6, graphPrereqs: Object.freeze(['ship_o2_generator']) }),
    hullExpansion: Object.freeze({ row: 5, col: 6, graphPrereqs: Object.freeze(['goal_o2Bubble']) }),
    radarNode: Object.freeze({ row: 9, col: 6, graphPrereqs: Object.freeze(['goal_hullExpansion', 'weapon_ammoRefill']) }),
    reactorCompressor: Object.freeze({ row: 11, col: 6, graphPrereqs: Object.freeze(['goal_radarNode', 'weapon_shotAmount']) })
});

const TIER2_GRAPH_SLOTS = Object.freeze({
    suitThermal: Object.freeze({ row: 7, col: 7, graphPrereqs: Object.freeze(['goal_o2Bubble']) }),
    deconFilters: Object.freeze({ row: 13, col: 5, graphPrereqs: Object.freeze(['goal_reactorCompressor']) }),
    stimCache: Object.freeze({ row: 13, col: 7, graphPrereqs: Object.freeze(['goal_reactorCompressor']) })
});

function getClassSpecialUnlockId(nodes = []) {
    return nodes.find((node) => node.id.endsWith('_special_unlock'))?.id ?? null;
}

function normalizeGraphPrereqs(prereqs = [], ...extra) {
    return [...new Set([...prereqs, ...extra].filter(Boolean))];
}

function classBranchNodes(playerClass) {
    const tree = CLASS_SKILL_TREES[playerClass] ?? [];
    return tree.map((node, index) => {
        const slot = CLASS_GRAPH_SLOTS[index] ?? { row: 15 + index * 2, col: 2 };
        const hardGraphPrereqs = node.prereqMode === 'any' ? [] : [...(node.prereqs ?? [])];
        if (node.requiredGoal) hardGraphPrereqs.push(`goal_${node.requiredGoal}`);
        if (node.requiredO2Level) hardGraphPrereqs.push('ship_o2_generator');
        return {
            id: node.id,
            branch: 'class',
            label: node.label,
            desc: node.desc,
            cost: node.cost,
            prereqs: [...(node.prereqs ?? [])],
            prereqMode: node.prereqMode ?? 'all',
            graphPrereqs: normalizeGraphPrereqs(hardGraphPrereqs),
            graphAnyPrereqs: node.prereqMode === 'any' ? [...(node.prereqs ?? [])] : [],
            requiredGoal: node.requiredGoal ?? null,
            requiredO2Level: node.requiredO2Level ?? null,
            row: slot.row,
            col: slot.col,
            legacyRow: node.row,
            legacyCol: node.col,
            purchase: { kind: 'skill', key: node.id }
        };
    });
}

function combatBranchNodes(playerClassNodes = []) {
    const classSpecialUnlockId = getClassSpecialUnlockId(playerClassNodes);
    return WEAPON_UPGRADE_ORDER.map((key, i) => {
        const cfg = WEAPON_UPGRADES_CONFIG[key] ?? {};
        const slot = COMBAT_GRAPH_SLOTS[key] ?? { row: 5 + i * 2, col: 4, graphPrereqs: [] };
        const graphPrereqs = key === 'shotAmount'
            ? normalizeGraphPrereqs(slot.graphPrereqs, classSpecialUnlockId)
            : normalizeGraphPrereqs(slot.graphPrereqs);
        return {
            id: `weapon_${key}`,
            branch: 'combat',
            label: cfg.label ?? key.toUpperCase(),
            descPerLevel: cfg.desc ?? null,
            desc: cfg.desc?.[0] ?? '',
            cost: cfg.costs?.[0] ?? null,
            costsPerLevel: cfg.costs ?? null,
            maxLevel: cfg.maxLevel ?? 1,
            prereqs: [],
            graphPrereqs,
            graphAnyPrereqs: [],
            row: slot.row,
            col: slot.col,
            purchase: { kind: 'weapon', key }
        };
    });
}

// Ship branch: the O2 generator chain roots it, the site goals chain off it
// in GOAL_ORDER (mirroring the Base-tab card prereqs verbatim), and the
// tier-2 installs hang off the goals their configs already require.
function shipBranchNodes() {
    const nodes = [];

    nodes.push({
        id: 'ship_o2_generator',
        branch: 'ship',
        label: 'O₂ GENERATOR',
        desc: 'Field radius and refill rate. Each level widens the safe zone.',
        cost: O2_GENERATOR_UPGRADES[0]?.cost ?? null,
        costsPerLevel: O2_GENERATOR_UPGRADES.map((u) => u.cost),
        maxLevel: O2_GENERATOR_UPGRADES.length,
        prereqs: [],
        graphPrereqs: [],
        graphAnyPrereqs: [],
        row: 1,
        col: 6,
        purchase: { kind: 'o2gen', key: 'o2Generator' }
    });

    GOAL_ORDER.forEach((goalKey, i) => {
        const prev = i === 0 ? null : GOAL_ORDER[i - 1];
        const slot = GOAL_GRAPH_SLOTS[goalKey] ?? { row: 3 + i * 2, col: 6, graphPrereqs: prev ? [`goal_${prev}`] : [] };
        nodes.push({
            id: `goal_${goalKey}`,
            branch: 'ship',
            label: GOAL_LABELS[goalKey] ?? goalKey.toUpperCase(),
            desc: GOAL_DESCS[goalKey] ?? '',
            cost: GOAL_COSTS[goalKey] ?? null,
            level2Cost: GOAL_LEVEL2_COSTS[goalKey] ?? null,
            maxLevel: GOAL_LEVEL2_COSTS[goalKey] ? 2 : 1,
            prereqs: prev ? [`goal_${prev}`] : [],
            graphPrereqs: normalizeGraphPrereqs(slot.graphPrereqs),
            graphAnyPrereqs: [],
            row: slot.row,
            col: slot.col,
            purchase: { kind: 'goal', key: goalKey, prereqKey: prev }
        });
    });

    TIER2_UPGRADE_ORDER.forEach((key, i) => {
        const cfg = TIER2_UPGRADE_CONFIGS[key] ?? {};
        const slot = TIER2_GRAPH_SLOTS[key] ?? {
            row: 13,
            col: 5 + i,
            graphPrereqs: cfg.prereq ? [`goal_${cfg.prereq}`] : []
        };
        nodes.push({
            id: `tier2_${key}`,
            branch: 'ship',
            label: cfg.label ?? key.toUpperCase(),
            desc: cfg.desc ?? '',
            cost: cfg.cost ?? null,
            maxLevel: 1,
            prereqs: cfg.prereq ? [`goal_${cfg.prereq}`] : [],
            graphPrereqs: normalizeGraphPrereqs(slot.graphPrereqs),
            graphAnyPrereqs: [],
            row: slot.row,
            col: slot.col,
            purchase: { kind: 'tier2', key }
        });
    });

    return nodes;
}

export function buildUnifiedSkillTree({ playerClass = 'SCOUT' } = {}) {
    const cls = String(playerClass ?? 'SCOUT').toUpperCase();
    const resolvedClass = CLASS_SKILL_TREES[cls] ? cls : 'SCOUT';
    const classNodes = classBranchNodes(resolvedClass);
    const combatNodes = combatBranchNodes(classNodes);
    const shipNodes = shipBranchNodes();
    const branches = {
        class: { key: 'class', label: TREE_BRANCH_LABELS.class, nodes: classNodes },
        combat: { key: 'combat', label: TREE_BRANCH_LABELS.combat, nodes: combatNodes },
        ship: { key: 'ship', label: TREE_BRANCH_LABELS.ship, nodes: shipNodes }
    };
    const nodes = TREE_BRANCHES.flatMap((branch) => branches[branch]?.nodes ?? []);
    return {
        playerClass: resolvedClass,
        branches,
        nodes,
        graph: {
            columns: TREE_GRAPH_COLUMNS,
            rows: Math.max(...nodes.map((node) => node.row)),
            connectors: getTreeConnectors(nodes)
        }
    };
}

export function getAllTreeNodes(tree) {
    if (Array.isArray(tree?.nodes)) return tree.nodes;
    return TREE_BRANCHES.flatMap((branch) => tree.branches[branch]?.nodes ?? []);
}

export function getTreeConnectors(nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const connectors = [];
    for (const node of nodes) {
        const edges = [
            ...(node.graphPrereqs ?? []).map((id) => ({ id, mode: 'all' })),
            ...(node.graphAnyPrereqs ?? []).map((id) => ({ id, mode: 'any' }))
        ];
        for (const { id: prereqId, mode } of edges) {
            const parent = byId.get(prereqId);
            if (!parent) continue;
            const colGap = node.col - parent.col;
            let type;
            if (colGap === 0) type = 'down';
            else if (colGap < 0) type = 'down-left';
            else type = 'down-right';
            connectors.push({
                type,
                mode,
                parentId: parent.id,
                childId: node.id,
                parentRow: parent.row,
                parentCol: parent.col,
                childRow: node.row,
                childCol: node.col
            });
        }
    }
    return connectors;
}

export function getBranchConnectors(nodes) {
    return getTreeConnectors(nodes);
}
