import { describe, it, expect } from 'vitest';
import {
    buildUnifiedSkillTree,
    getAllTreeNodes,
    getBranchConnectors,
    getTreeConnectors,
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

    it('preserves class prereqs and costs while carrying legacy grid coordinates', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'SCOUT' });
        for (const legacy of CLASS_SKILL_TREES.SCOUT) {
            const node = tree.branches.class.nodes.find((n) => n.id === legacy.id);
            expect(node).toBeTruthy();
            expect(node.prereqs).toEqual([...legacy.prereqs]);
            expect(node.cost).toEqual(legacy.cost);
            expect(node.legacyRow).toBe(legacy.row);
            expect(node.legacyCol).toBe(legacy.col);
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

    it('carries weapon level ladders while adding graph-only cross gates', () => {
        const combat = buildUnifiedSkillTree({}).branches.combat.nodes;
        for (const key of WEAPON_UPGRADE_ORDER) {
            const node = combat.find((n) => n.id === `weapon_${key}`);
            const cfg = WEAPON_UPGRADES_CONFIG[key];
            expect(node.maxLevel).toBe(cfg.maxLevel);
            expect(node.costsPerLevel).toEqual(cfg.costs);
            expect(node.descPerLevel).toEqual(cfg.desc);
            expect(node.prereqs).toEqual([]);
        }
        expect(combat.find((n) => n.id === 'weapon_ammoRefill').graphPrereqs).toContain('goal_o2Bubble');
        expect(combat.find((n) => n.id === 'weapon_shotAmount').graphPrereqs).toContain('scout_special_unlock');
    });

    it('falls back to SCOUT for unknown classes and exposes all branches', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'BANANA' });
        expect(tree.playerClass).toBe('SCOUT');
        for (const branch of TREE_BRANCHES) {
            expect(tree.branches[branch].nodes.length).toBeGreaterThan(0);
            expect(tree.branches[branch].label).toBeTruthy();
        }
    });

    it('renders all nodes into one downward graph with unique global cells', () => {
        for (const playerClass of Object.keys(CLASS_SKILL_TREES)) {
            const tree = buildUnifiedSkillTree({ playerClass });
            const seen = new Set();
            for (const node of getAllTreeNodes(tree)) {
                const cell = `${node.row},${node.col}`;
                expect(seen.has(cell), `${node.id} ${cell}`).toBe(false);
                seen.add(cell);
            }
            expect(tree.graph.columns).toBeGreaterThanOrEqual(7);
            expect(tree.graph.rows).toBeGreaterThan(10);
        }
    });

    it('adds cross-branch graph prerequisites without changing bank prereq keys', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'TANK' });
        const byId = new Map(getAllTreeNodes(tree).map((node) => [node.id, node]));

        expect(byId.get('goal_o2Bubble').graphPrereqs).toContain('ship_o2_generator');
        expect(byId.get('goal_radarNode').graphPrereqs).toContain('weapon_ammoRefill');
        expect(byId.get('goal_reactorCompressor').graphPrereqs).toContain('weapon_shotAmount');
        expect(byId.get('tank_special_unlock').graphPrereqs).toContain('goal_hullExpansion');
        expect(byId.get('tank_special_unlock').graphAnyPrereqs).toEqual(['tank_damage_1', 'tank_o2_efficiency']);
        expect(byId.get('tank_special_upgrade_1').graphPrereqs).toContain('goal_reactorCompressor');
    });
});

describe('getTreeConnectors', () => {
    it('connects graph-only cross-branch prerequisites', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'SCOUT' });
        const connectors = getTreeConnectors(getAllTreeNodes(tree));

        expect(connectors).toContainEqual(expect.objectContaining({
            parentId: 'goal_o2Bubble',
            childId: 'weapon_ammoRefill',
            type: 'down-left',
            mode: 'all'
        }));
        expect(connectors).toContainEqual(expect.objectContaining({
            parentId: 'scout_speed_1',
            childId: 'scout_special_unlock',
            mode: 'any'
        }));
    });

    it('keeps the branch connector export as a compatibility alias', () => {
        const tree = buildUnifiedSkillTree({ playerClass: 'SCOUT' });
        const ship = tree.branches.ship.nodes;
        const connectors = getBranchConnectors(ship);

        expect(connectors.length).toBeGreaterThan(0);
        for (const c of connectors) {
            expect(['down', 'down-left', 'down-right']).toContain(c.type);
            expect(c.parentId).toBeTruthy();
            expect(c.childId).toBeTruthy();
        }
    });
});
