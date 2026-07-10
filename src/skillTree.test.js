import { describe, it, expect } from 'vitest';
import {
    buildUnifiedSkillTree,
    getAllTreeNodes,
    getBranchConnectors,
    TREE_BRANCHES
} from './skillTree.js';
import {
    CLASS_SKILL_TREES,
    WEAPON_UPGRADE_ORDER,
    WEAPON_UPGRADES_CONFIG,
    GOAL_ORDER,
    O2_GENERATOR_UPGRADES,
    TIER2_UPGRADE_ORDER,
    TIER2_UPGRADE_CONFIGS
} from './bank.js';

describe('buildUnifiedSkillTree', () => {
    it('contains every legacy node from all three systems exactly once', () => {
        for (const playerClass of Object.keys(CLASS_SKILL_TREES)) {
            const tree = buildUnifiedSkillTree({ playerClass });
            const nodes = getAllTreeNodes(tree);
            const ids = nodes.map((n) => n.id);
            expect(new Set(ids).size).toBe(ids.length); // no duplicates

            for (const legacy of CLASS_SKILL_TREES[playerClass]) {
                expect(ids).toContain(legacy.id);
            }
            for (const key of WEAPON_UPGRADE_ORDER) {
                expect(ids).toContain(`weapon_${key}`);
            }
            for (const goalKey of GOAL_ORDER) {
                expect(ids).toContain(`goal_${goalKey}`);
            }
            for (const key of TIER2_UPGRADE_ORDER) {
                expect(ids).toContain(`tier2_${key}`);
            }
            expect(ids).toContain('ship_o2_generator');

            const expectedCount = CLASS_SKILL_TREES[playerClass].length
                + WEAPON_UPGRADE_ORDER.length
                + GOAL_ORDER.length
                + TIER2_UPGRADE_ORDER.length
                + 1; // o2 generator
            expect(nodes.length).toBe(expectedCount);
        }
    });

    it('preserves class prereqs, costs, and grid positions verbatim', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'SCOUT' });
        for (const legacy of CLASS_SKILL_TREES.SCOUT) {
            const node = tree.branches.class.nodes.find((n) => n.id === legacy.id);
            expect(node).toBeTruthy();
            expect(node.prereqs).toEqual([...legacy.prereqs]);
            expect(node.cost).toEqual(legacy.cost);
            expect(node.row).toBe(legacy.row);
            expect(node.col).toBe(legacy.col);
            expect(node.purchase).toEqual({ kind: 'skill', key: legacy.id });
        }
    });

    it('mirrors the base-tab goal prereq chain and tier2 gates verbatim', () => {
        const ship = buildUnifiedSkillTree({}).branches.ship.nodes;
        GOAL_ORDER.forEach((goalKey, i) => {
            const node = ship.find((n) => n.id === `goal_${goalKey}`);
            expect(node.prereqs).toEqual(i === 0 ? [] : [`goal_${GOAL_ORDER[i - 1]}`]);
            expect(node.purchase.prereqKey).toBe(i === 0 ? null : GOAL_ORDER[i - 1]);
        });
        for (const key of TIER2_UPGRADE_ORDER) {
            const node = ship.find((n) => n.id === `tier2_${key}`);
            const cfgPrereq = TIER2_UPGRADE_CONFIGS[key].prereq;
            expect(node.prereqs).toEqual(cfgPrereq ? [`goal_${cfgPrereq}`] : []);
        }
        const o2 = ship.find((n) => n.id === 'ship_o2_generator');
        expect(o2.maxLevel).toBe(O2_GENERATOR_UPGRADES.length);
    });

    it('carries weapon level ladders without inventing prereqs', () => {
        const combat = buildUnifiedSkillTree({}).branches.combat.nodes;
        for (const key of WEAPON_UPGRADE_ORDER) {
            const node = combat.find((n) => n.id === `weapon_${key}`);
            const cfg = WEAPON_UPGRADES_CONFIG[key];
            expect(node.maxLevel).toBe(cfg.maxLevel);
            expect(node.costsPerLevel).toEqual(cfg.costs);
            expect(node.descPerLevel).toEqual(cfg.desc);
            expect(node.prereqs).toEqual([]);
        }
    });

    it('falls back to SCOUT for unknown classes and exposes all branches', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'BANANA' });
        expect(tree.playerClass).toBe('SCOUT');
        for (const branch of TREE_BRANCHES) {
            expect(tree.branches[branch].nodes.length).toBeGreaterThan(0);
            expect(tree.branches[branch].label).toBeTruthy();
        }
    });

    it('never places two nodes in the same branch grid cell', () => {
        for (const playerClass of Object.keys(CLASS_SKILL_TREES)) {
            const tree = buildUnifiedSkillTree({ playerClass });
            for (const branch of TREE_BRANCHES) {
                const seen = new Set();
                for (const node of tree.branches[branch].nodes) {
                    const cell = `${node.row},${node.col}`;
                    expect(seen.has(cell), `${branch} ${cell}`).toBe(false);
                    seen.add(cell);
                }
            }
        }
    });
});

describe('getBranchConnectors', () => {
    it('derives the same connector shapes the old hardcoded table drew', () => {
        // SCOUT rows 1→3: parent (1,3) to children (3,1) and (3,5) were the
        // old down-left/down-right cases at row 2, cols 2 and 4.
        const tree = buildUnifiedSkillTree({ playerClass: 'SCOUT' });
        const connectors = getBranchConnectors(tree.branches.class.nodes);
        expect(connectors).toContainEqual(expect.objectContaining({ row: 2, col: 2, type: 'down-left' }));
        expect(connectors).toContainEqual(expect.objectContaining({ row: 2, col: 4, type: 'down-right' }));
    });

    it('produces straight-down connectors for the ship goal chain', () => {
        const ship = buildUnifiedSkillTree({}).branches.ship.nodes;
        const connectors = getBranchConnectors(ship);
        // Goals alternate cols 2/4 with rowGap 2 → diagonal connectors exist.
        expect(connectors.length).toBeGreaterThan(0);
        for (const c of connectors) {
            expect(['down', 'down-left', 'down-right']).toContain(c.type);
        }
    });
});
