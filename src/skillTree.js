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

function classBranchNodes(playerClass) {
    const tree = CLASS_SKILL_TREES[playerClass] ?? [];
    return tree.map((node) => ({
        id: node.id,
        branch: 'class',
        label: node.label,
        desc: node.desc,
        cost: node.cost,
        prereqs: [...(node.prereqs ?? [])],
        requiredGoal: node.requiredGoal ?? null,
        requiredO2Level: node.requiredO2Level ?? null,
        row: node.row,
        col: node.col,
        purchase: { kind: 'skill', key: node.id }
    }));
}

// The five weapon upgrades are parallel (no prereqs today — inventing them
// would change behavior). Three-then-two layout keeps the branch readable.
const COMBAT_GRID = Object.freeze([
    { row: 1, col: 1 }, { row: 1, col: 3 }, { row: 1, col: 5 },
    { row: 3, col: 2 }, { row: 3, col: 4 }
]);

function combatBranchNodes() {
    return WEAPON_UPGRADE_ORDER.map((key, i) => {
        const cfg = WEAPON_UPGRADES_CONFIG[key] ?? {};
        const slot = COMBAT_GRID[i] ?? { row: 5, col: 3 };
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
        row: 1,
        col: 3,
        purchase: { kind: 'o2gen', key: 'o2Generator' }
    });

    GOAL_ORDER.forEach((goalKey, i) => {
        const prev = i === 0 ? null : GOAL_ORDER[i - 1];
        nodes.push({
            id: `goal_${goalKey}`,
            branch: 'ship',
            label: GOAL_LABELS[goalKey] ?? goalKey.toUpperCase(),
            desc: GOAL_DESCS[goalKey] ?? '',
            cost: GOAL_COSTS[goalKey] ?? null,
            level2Cost: GOAL_LEVEL2_COSTS[goalKey] ?? null,
            maxLevel: GOAL_LEVEL2_COSTS[goalKey] ? 2 : 1,
            prereqs: prev ? [`goal_${prev}`] : [],
            row: 3 + i * 2,
            col: i % 2 === 0 ? 2 : 4,
            purchase: { kind: 'goal', key: goalKey, prereqKey: prev }
        });
    });

    TIER2_UPGRADE_ORDER.forEach((key, i) => {
        const cfg = TIER2_UPGRADE_CONFIGS[key] ?? {};
        nodes.push({
            id: `tier2_${key}`,
            branch: 'ship',
            label: cfg.label ?? key.toUpperCase(),
            desc: cfg.desc ?? '',
            cost: cfg.cost ?? null,
            maxLevel: 1,
            prereqs: cfg.prereq ? [`goal_${cfg.prereq}`] : [],
            row: 11,
            col: 1 + i * 2,
            purchase: { kind: 'tier2', key }
        });
    });

    return nodes;
}

export function buildUnifiedSkillTree({ playerClass = 'SCOUT' } = {}) {
    const cls = String(playerClass ?? 'SCOUT').toUpperCase();
    const resolvedClass = CLASS_SKILL_TREES[cls] ? cls : 'SCOUT';
    return {
        playerClass: resolvedClass,
        branches: {
            class: { key: 'class', label: TREE_BRANCH_LABELS.class, nodes: classBranchNodes(resolvedClass) },
            combat: { key: 'combat', label: TREE_BRANCH_LABELS.combat, nodes: combatBranchNodes() },
            ship: { key: 'ship', label: TREE_BRANCH_LABELS.ship, nodes: shipBranchNodes() }
        }
    };
}

export function getAllTreeNodes(tree) {
    return TREE_BRANCHES.flatMap((branch) => tree.branches[branch]?.nodes ?? []);
}

// Connector cells between a node and each prereq, computed from grid
// geometry instead of the old hardcoded row/col table. Supports the three
// shapes the grid produces: straight down, down-left, down-right.
export function getBranchConnectors(nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const connectors = [];
    for (const node of nodes) {
        for (const prereqId of node.prereqs) {
            const parent = byId.get(prereqId);
            if (!parent) continue;
            const rowGap = node.row - parent.row;
            const colGap = node.col - parent.col;
            if (rowGap !== 2) continue; // only adjacent tiers get drawn lines
            let type;
            if (colGap === 0) type = 'down';
            else if (colGap < 0) type = 'down-left';
            else type = 'down-right';
            connectors.push({
                row: parent.row + 1,
                col: parent.col + (colGap === 0 ? 0 : colGap < 0 ? -1 : 1),
                type,
                parentId: parent.id,
                childId: node.id
            });
        }
    }
    return connectors;
}
