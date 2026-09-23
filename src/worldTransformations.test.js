import { describe, expect, it } from 'vitest';
import {
    BONDED_HIVE_SPEED_BONUS_CAP,
    HIVE_OUTCOMES,
    bondedHiveSpeedMultiplier,
    deriveHiveOutcome,
    findTerritoryRoomReservation,
    getBridgedCrossingIds,
    isCampLevelFortified,
    isWithinHarvestedHiveRange,
    planBridgeDeckCells,
    planBridgeSpan,
    selectHarvestOverclock,
    territoryRoomWorldCenter
} from './worldTransformations.js';
import { WEAPON_OVERCLOCKS } from './runDrops.js';
import { CAMP_AFTERMATH_FORTIFIED_LEVEL } from './campEconomy.js';
import { buildWorldPlan } from './ringManifest.js';
import { generateRadialMazeExpedition } from './mazeExpedition.js';

describe('world transformations', () => {
    it('treats only a resolved bond or a kill as a hive outcome', () => {
        for (const status of ['bonded', 'rescued', 'aboard']) {
            expect(deriveHiveOutcome({ status })).toBe(HIVE_OUTCOMES.BONDED);
        }
        for (const status of ['slain', 'queen_consumed']) {
            expect(deriveHiveOutcome({ status })).toBe(HIVE_OUTCOMES.HARVESTED);
        }
        for (const status of ['dormant', 'mined', 'wounded', 'abandoned', 'expired_by_cure', undefined]) {
            expect(deriveHiveOutcome({ status })).toBeNull();
        }
        expect(deriveHiveOutcome(null)).toBeNull();
    });

    it('fortifies a camp at the aftermath threshold the camp itself announces', () => {
        expect(isCampLevelFortified(CAMP_AFTERMATH_FORTIFIED_LEVEL - 1)).toBe(false);
        expect(isCampLevelFortified(CAMP_AFTERMATH_FORTIFIED_LEVEL)).toBe(true);
        expect(isCampLevelFortified(undefined)).toBe(false);
    });

    it('locates each named compound room in the world plan', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(3));
        const heart = findTerritoryRoomReservation(plan, 'camp_meridian', 'central');
        expect(heart.id).toBe('territory:camp_meridian');
        expect(heart.conditional).toBeFalsy();
        const perimeter = findTerritoryRoomReservation(plan, 'camp_meridian', 'perimeter');
        expect(perimeter.id).toBe('room:camp_meridian:perimeter');
        const center = territoryRoomWorldCenter(plan, 'camp_meridian', 'perimeter', 49);
        expect(center).toEqual({ x: perimeter.chunkX * 49 + 24, z: perimeter.chunkY * 49 + 24 });
        expect(territoryRoomWorldCenter(plan, 'hive_relay', 'choice_chamber', 49)).not.toBeNull();
        expect(territoryRoomWorldCenter(plan, 'camp_nowhere', 'perimeter', 49)).toBeNull();
        expect(territoryRoomWorldCenter(null, 'camp_meridian', 'perimeter', 49)).toBeNull();
    });

    it('bridges only the open crossing whose clearing opens bridge traversal', () => {
        const plan = buildWorldPlan(generateRadialMazeExpedition(3));
        const bridged = plan.ringCrossings.filter((crossing) => crossing.opensTraversal === 'bridge');
        expect(bridged.map((crossing) => crossing.requirements.missionId)).toEqual(['restore_canyon_crossing']);
        expect(getBridgedCrossingIds(plan, new Set())).toEqual([]);
        const allOpen = new Set(plan.ringCrossings.map((crossing) => crossing.id));
        expect(getBridgedCrossingIds(plan, allOpen)).toEqual(bridged.map((crossing) => crossing.id));
        expect(getBridgedCrossingIds(null, allOpen)).toEqual([]);
    });

    it('lays the deck across the threshold along the door side', () => {
        const north = planBridgeSpan({ worldX: 10, worldZ: 0, side: 'n' });
        expect(north.start).toEqual({ x: 10, z: 3 });
        expect(north.end).toEqual({ x: 10, z: -6 });
        expect(north.horizontal).toBe(false);
        const east = planBridgeSpan({ worldX: 48, worldZ: 20, side: 'e' }, { length: 6, inset: 2 });
        expect(east.start).toEqual({ x: 46, z: 20 });
        expect(east.end).toEqual({ x: 52, z: 20 });
        expect(east.center).toEqual({ x: 49, z: 20 });
        expect(east.yaw).toBeCloseTo(Math.PI / 2);
        expect(planBridgeSpan({ worldX: 1, worldZ: 1, side: 'up' })).toBeNull();
        expect(planBridgeSpan({ worldX: NaN, worldZ: 1, side: 'n' })).toBeNull();
    });

    it('caps the bonded-hive speed on infested ground', () => {
        expect(bondedHiveSpeedMultiplier({})).toBe(1);
        expect(bondedHiveSpeedMultiplier({ a: { outcome: 'harvested' } })).toBe(1);
        expect(bondedHiveSpeedMultiplier({ a: { outcome: 'bonded' } })).toBeCloseTo(1.06);
        const all = { a: { outcome: 'bonded' }, b: { outcome: 'bonded' }, c: { outcome: 'bonded' } };
        expect(bondedHiveSpeedMultiplier(all)).toBeCloseTo(1 + BONDED_HIVE_SPEED_BONUS_CAP);
    });

    it('scopes harvest enragement to the hive surroundings', () => {
        const hives = [{ x: 100, z: 100 }];
        expect(isWithinHarvestedHiveRange(110, 110, hives)).toBe(true);
        expect(isWithinHarvestedHiveRange(200, 100, hives)).toBe(false);
        expect(isWithinHarvestedHiveRange(100, 100, undefined)).toBe(false);
    });

    it('tears the rarest implemented overclock the carrier lacks out of a harvested hive', () => {
        const best = selectHarvestOverclock(WEAPON_OVERCLOCKS, []);
        expect(best.implemented).not.toBe(false);
        expect(best.rarity).toBe('corrupted');
        const next = selectHarvestOverclock(WEAPON_OVERCLOCKS, [best.id]);
        expect(next.id).not.toBe(best.id);
        expect(next.implemented).not.toBe(false);
        const all = WEAPON_OVERCLOCKS.filter((drop) => drop.implemented !== false).map((drop) => drop.id);
        expect(selectHarvestOverclock(WEAPON_OVERCLOCKS, all)).toBeNull();
        expect(selectHarvestOverclock([], [])).toBeNull();
    });

    it('decks exactly the corridor a crossing door opens onto', () => {
        const grid = [
            'XO#...#OX',
            'XO#...#OX',
            'XO#...#OX',
            'XO#DDD#OX',
            'XO#.....#'
        ].map((row) => [...row]);
        const door = { side: 'n', localX: 4, localY: 3, cells: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }] };
        const cells = planBridgeDeckCells(grid, door);
        expect(cells).toHaveLength(9);
        expect(cells.every(({ x, y }) => x >= 3 && x <= 5 && y <= 2)).toBe(true);
        for (const { x, y } of cells) grid[y][x] = 'B';
        expect(planBridgeDeckCells(grid, door)).toHaveLength(9);
        expect(planBridgeDeckCells(grid, { ...door, side: 'up' })).toEqual([]);
    });
});
