import { describe, expect, it } from 'vitest';
import {
    TIERS, FINAL_TIER, SPACE, SITE,
    HALL_PROFILES, ROOM_PROFILES, PLAIN_PROFILES,
    MAZE_TIER_GEOMETRY, MIN_HALL_WIDTH, MIN_HALL_ASPECT,
    classifySpace, profileFootprint, interiorForCells,
    goalsRequiredForTier, bossesRequiredForTier, milestonesRequiredForTier, isTierUnlocked,
    getMaxUnlockedTier, describeRouteToFinalTier,
    findDisjointRoutes, hasTwoRoutesToQueen
} from './mazeTiers.js';
import { RING_UNLOCK_GOAL_ORDER } from './mazeExpedition.js';
import { BAND_THICKNESS, CHUNK_SIZE, LATTICE, TILE_SIZE } from './tileCatalog.js';
import { MILESTONE_BOSS_DEFINITIONS, MILESTONE_BOSS_IDS } from './milestoneBossLifecycle.js';

describe('tier gating', () => {
    // If these drift apart, the maze would gate on goals the bank never grants.
    it('gates on exactly the bank goals the ring system already uses, in order', () => {
        const tierGoals = TIERS.filter((t) => t.unlockGoal).map((t) => t.unlockGoal);
        expect(tierGoals).toEqual([...RING_UNLOCK_GOAL_ORDER]);
    });

    it('leaves tier 1 always open so the player can stand somewhere at spawn', () => {
        expect(isTierUnlocked(1)).toBe(true);
        expect(getMaxUnlockedTier()).toBe(1);
    });

    it('needs both the banked goal and the dead gate boss to open a tier', () => {
        const goals = { unlockedGoalKeys: new Set(['o2Bubble']) };
        const boss = { defeatedMilestoneIds: new Set([MILESTONE_BOSS_IDS.O2_BUBBLE]) };
        expect(isTierUnlocked(2, goals)).toBe(false);
        expect(isTierUnlocked(2, boss)).toBe(false);
        expect(isTierUnlocked(2, { ...goals, ...boss })).toBe(true);
    });

    it('will not open a later tier while an earlier one is still shut', () => {
        // Everything the Queen's own tier asks for, but tier 3 skipped.
        const state = {
            unlockedGoalKeys: new Set(['o2Bubble', 'radarNode', 'reactorCompressor']),
            defeatedMilestoneIds: new Set([
                MILESTONE_BOSS_IDS.O2_BUBBLE,
                MILESTONE_BOSS_IDS.RADAR_NODE,
                MILESTONE_BOSS_IDS.REACTOR_COMPRESSOR
            ])
        };
        expect(isTierUnlocked(FINAL_TIER, state)).toBe(false);
        expect(getMaxUnlockedTier(state)).toBe(2);
    });

    it('spells out everything still standing between the player and the Queen', () => {
        const state = {
            unlockedGoalKeys: new Set(['o2Bubble']),
            defeatedMilestoneIds: new Set([MILESTONE_BOSS_IDS.O2_BUBBLE])
        };
        const route = describeRouteToFinalTier(state);
        expect(route).toHaveLength(4);
        expect(route[0]).toMatchObject({ tier: 2, open: true, goalBanked: true, bossDefeated: true });
        expect(route[1]).toMatchObject({ tier: 3, open: false, goalBanked: false, bossDefeated: false });
        expect(goalsRequiredForTier(FINAL_TIER)).toEqual([...RING_UNLOCK_GOAL_ORDER]);
        expect(milestonesRequiredForTier(FINAL_TIER))
            .toEqual(MILESTONE_BOSS_DEFINITIONS.map((entry) => entry.milestoneId));
        expect(bossesRequiredForTier(FINAL_TIER)).toEqual(milestonesRequiredForTier(FINAL_TIER));
    });

    it('requires canonical milestone IDs rather than conceptual labels or enemy types', () => {
        const unlockedGoalKeys = new Set(['o2Bubble']);
        expect(isTierUnlocked(2, { unlockedGoalKeys, defeatedBosses: new Set(['sentinel']) })).toBe(false);
        expect(isTierUnlocked(2, { unlockedGoalKeys, defeatedBosses: new Set(['boss_cybersnail']) })).toBe(false);
        expect(isTierUnlocked(2, {
            unlockedGoalKeys,
            defeatedMilestoneIds: new Set([MILESTONE_BOSS_IDS.O2_BUBBLE])
        })).toBe(true);
    });

    it('puts the Queen alone in the deepest tier', () => {
        const queenTiers = TIERS.filter((t) => t.sites.includes(SITE.QUEEN));
        expect(queenTiers).toHaveLength(1);
        expect(queenTiers[0].tier).toBe(FINAL_TIER);
    });
});

describe('space taxonomy', () => {
    it('derives its 17/16/3/49 profile geometry from the tile catalog', () => {
        expect(MAZE_TIER_GEOMETRY).toEqual({
            tileSize: TILE_SIZE,
            bandThickness: BAND_THICKNESS,
            lattice: LATTICE,
            stride: TILE_SIZE - 1,
            chunkSize: CHUNK_SIZE
        });
        expect(MAZE_TIER_GEOMETRY).toEqual({
            tileSize: 17,
            bandThickness: 5,
            lattice: 3,
            stride: 16,
            chunkSize: 49
        });
        expect(interiorForCells(1)).toBe(7);
    });
    it('makes every hall longer than it is wide, and never a tight slot', () => {
        for (const profile of HALL_PROFILES) {
            expect(classifySpace(profile), profile.id).toBe(SPACE.HALL);
            const { interiorWide } = profileFootprint(profile);
            expect(interiorWide, profile.id).toBeGreaterThanOrEqual(MIN_HALL_WIDTH);
            const long = Math.max(profile.long, profile.wide);
            const wide = Math.min(profile.long, profile.wide);
            expect(long / wide, profile.id).toBeGreaterThanOrEqual(MIN_HALL_ASPECT);
        }
    });

    it('gives rooms genuinely different footprints rather than one repeated box', () => {
        const areas = ROOM_PROFILES.map((p) => {
            const { interiorLong, interiorWide } = profileFootprint(p);
            return interiorLong * interiorWide;
        });
        expect(new Set(areas).size).toBe(ROOM_PROFILES.length);
        expect(Math.max(...areas)).toBeGreaterThan(Math.min(...areas) * 4);
        for (const profile of ROOM_PROFILES) {
            expect(classifySpace(profile), profile.id).toBe(SPACE.ROOM);
        }
    });

    it('treats plains as open exterior, not as rooms or halls', () => {
        for (const profile of PLAIN_PROFILES) {
            expect(classifySpace(profile), profile.id).toBe(SPACE.PLAIN);
        }
        expect(TIERS.find((t) => t.tier === 1).spaces).toContain(SPACE.PLAIN);
        // The deep tiers are inside the bunker; open sky does not belong there.
        expect(TIERS.find((t) => t.tier === FINAL_TIER).spaces).not.toContain(SPACE.PLAIN);
    });

    it('derives interiors from the merged span, so bigger footprints really are bigger', () => {
        expect(interiorForCells(2)).toBeGreaterThan(interiorForCells(1));
        expect(interiorForCells(3)).toBeGreaterThan(interiorForCells(2));
    });
});

describe('two routes to the Queen', () => {
    const graph = (pairs) => {
        const map = new Map();
        for (const [a, b] of pairs) {
            if (!map.has(a)) map.set(a, []);
            if (!map.has(b)) map.set(b, []);
            map.get(a).push(b);
            map.get(b).push(a);
        }
        return map;
    };

    it('finds two routes that share no intermediate cell', () => {
        // Two parallel branches between S and Q.
        const g = graph([['S', 'a'], ['a', 'Q'], ['S', 'b'], ['b', 'Q']]);
        const routes = findDisjointRoutes(g, 'S', 'Q', 2);
        expect(routes).toHaveLength(2);
        const middles = routes.flatMap((r) => r.slice(1, -1));
        expect(new Set(middles).size).toBe(middles.length);
        expect(hasTwoRoutesToQueen(g, 'S', 'Q')).toBe(true);
    });

    it('rejects a layout where one choke point owns the only way in', () => {
        // Both branches funnel through 'choke' — exactly the dead-end risk the
        // two-route rule exists to prevent.
        const g = graph([['S', 'a'], ['S', 'b'], ['a', 'choke'], ['b', 'choke'], ['choke', 'Q']]);
        expect(hasTwoRoutesToQueen(g, 'S', 'Q')).toBe(false);
    });

    it('reports no routes at all when the Queen is unreachable', () => {
        const g = graph([['S', 'a'], ['Q', 'b']]);
        expect(findDisjointRoutes(g, 'S', 'Q', 2)).toHaveLength(0);
    });
});
