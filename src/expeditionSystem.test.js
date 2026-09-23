import { describe, it, expect } from 'vitest';
import {
    EXPEDITION_CONDITIONS,
    EXPEDITION_BOUNTIES,
    EXPEDITION_CONDITION_EFFECTS,
    deriveExpeditionSeed,
    createExpeditionProfile,
    normalizeExpeditionProfile,
    getExpeditionEffects,
    composeExpeditionIntoLoadoutMods,
    scaleExpeditionSalvage,
    scaleExpeditionEliteRoll,
    planExpeditionObstacles,
    planExpeditionDeathEffect,
    expeditionAtmosphere
} from './expeditionSystem.js';

describe('expeditionSystem', () => {
    it('defines distinct environmental conditions with required gameplay properties', () => {
        expect(EXPEDITION_CONDITIONS.length).toBeGreaterThanOrEqual(4);
        for (const condition of EXPEDITION_CONDITIONS) {
            expect(condition.id).toBeTypeOf('string');
            expect(condition.name).toBeTypeOf('string');
            expect(condition.tagline).toBeTypeOf('string');
            expect(condition.description).toBeTypeOf('string');
            expect(condition.scrapMultiplier).toBeGreaterThan(0);
            expect(condition.threatTier).toBeGreaterThanOrEqual(1);
            expect(condition.weatherVisual).toBeTypeOf('string');
        }
    });

    it('defines optional tactical bounties', () => {
        expect(EXPEDITION_BOUNTIES.length).toBeGreaterThanOrEqual(3);
        for (const bounty of EXPEDITION_BOUNTIES) {
            expect(bounty.id).toBeTypeOf('string');
            expect(bounty.label).toBeTypeOf('string');
            expect(bounty.rewardBonus).toBeGreaterThan(0);
        }
    });

    it('derives deterministic expedition seeds', () => {
        const seed1 = deriveExpeditionSeed(12345, 0);
        const seed2 = deriveExpeditionSeed(12345, 0);
        const seed3 = deriveExpeditionSeed(12345, 1);
        const seedOtherCampaign = deriveExpeditionSeed(99999, 0);

        expect(seed1).toBe(seed2);
        expect(seed1).not.toBe(seed3);
        expect(seed1).not.toBe(seedOtherCampaign);
    });

    it('generates fully deterministic expedition profiles for a campaign seed and index', () => {
        const profileA = createExpeditionProfile(424242, 2);
        const profileB = createExpeditionProfile(424242, 2);

        expect(profileA).toEqual(profileB);
        expect(profileA.expeditionIndex).toBe(2);
        expect(profileA.campaignSeed).toBe(424242);
        expect(profileA.condition).toBeDefined();
        expect(profileA.bounty).toBeDefined();
        expect(profileA.title).toContain('EXPEDITION 3');
        expect(profileA.title).toContain(profileA.condition.name.toUpperCase());
        expect(profileA.briefing).toContain(profileA.condition.tagline);
    });

    it('scales threat tier and generates varying conditions across sequential expeditions', () => {
        const p0 = createExpeditionProfile(1337, 0);
        const p1 = createExpeditionProfile(1337, 1);
        const p3 = createExpeditionProfile(1337, 3);
        const p9 = createExpeditionProfile(1337, 9);

        expect(p0.threatIndex).toBe(1);
        expect(p3.threatIndex).toBe(2);
        expect(p9.threatIndex).toBe(4);

        // Ensure different expeditions have different seeds
        expect(p0.expeditionSeed).not.toBe(p1.expeditionSeed);
    });

    it('safely normalizes invalid or edge-case inputs', () => {
        const pDefault = createExpeditionProfile(undefined, undefined);
        expect(pDefault.expeditionIndex).toBe(0);
        expect(pDefault.threatIndex).toBe(1);

        const pNegative = createExpeditionProfile(100, -5);
        expect(pNegative.expeditionIndex).toBe(0);

        const pString = createExpeditionProfile('5555', '3');
        expect(pString.expeditionIndex).toBe(3);
        expect(pString.campaignSeed).toBe(5555);
        expect(createExpeditionProfile(100, Infinity)).toEqual(createExpeditionProfile(100, 0));
        expect(createExpeditionProfile(100, Number.MAX_SAFE_INTEGER + 1)).toEqual(createExpeditionProfile(100, 0));
    });

    it('retains valid saved condition choices but refreshes tuning and rejects another deployment identity', () => {
        const saved = createExpeditionProfile(100, 2);
        const condition = EXPEDITION_CONDITIONS.find((entry) => entry.id !== saved.condition.id);
        const stale = { ...saved, condition: { ...condition, scrapMultiplier: 99 }, threatIndex: 99 };
        const normalized = normalizeExpeditionProfile(stale, 100, 2);
        expect(normalized.condition).toEqual(condition);
        expect(normalized.threatIndex).toBe(saved.threatIndex);
        expect(normalized.title).toContain(condition.name.toUpperCase());
        expect(normalizeExpeditionProfile(stale, 101, 2)).toEqual(createExpeditionProfile(101, 2));
        expect(normalizeExpeditionProfile(stale, 100, 3)).toEqual(createExpeditionProfile(100, 3));
        expect(normalizeExpeditionProfile([], 100, 2)).toEqual(saved);
    });

    it('gives every condition a real, distinct gameplay effect', () => {
        const fingerprints = new Set();
        for (const condition of EXPEDITION_CONDITIONS) {
            expect(EXPEDITION_CONDITION_EFFECTS[condition.id], condition.id).toBeDefined();
            const effects = getExpeditionEffects({ condition });
            expect(effects.conditionId).toBe(condition.id);
            expect(effects.world.salvageMultiplier).toBe(condition.scrapMultiplier);
            fingerprints.add(JSON.stringify(effects.player) + JSON.stringify(effects.world));
        }
        expect(fingerprints.size).toBe(EXPEDITION_CONDITIONS.length);
    });

    it('resolves effects by condition id so saved profiles pick up retuning', () => {
        const stale = { condition: { id: 'subzero_stillness', scrapMultiplier: 99 } };
        expect(getExpeditionEffects(stale).world.salvageMultiplier).toBe(1.15);
        expect(getExpeditionEffects(stale).world.eliteChanceMultiplier).toBeGreaterThan(1);
        expect(getExpeditionEffects(stale).world.enemyDensityMultiplier).toBeLessThan(1);
    });

    it('is neutral for missing or unknown profiles', () => {
        for (const profile of [null, undefined, {}, { condition: { id: 'nope' } }]) {
            expect(getExpeditionEffects(profile)).toEqual({
                conditionId: null,
                player: {},
                world: { enemyDensityMultiplier: 1, enemySpeedMultiplier: 1, eliteChanceMultiplier: 1, salvageMultiplier: 1, resinYieldMultiplier: 1 }
            });
            expect(composeExpeditionIntoLoadoutMods({ moveSpeedMultiplier: 1.2 }, profile)).toEqual({ moveSpeedMultiplier: 1.2 });
        }
    });

    it('composes player effects onto loadout mods with the fatigue bus contract', () => {
        const gale = { condition: { id: 'glacial_gale' } };
        const merged = composeExpeditionIntoLoadoutMods({ moveSpeedMultiplier: 1.1, maxHealthBonus: 1 }, gale);
        expect(merged.moveSpeedMultiplier).toBeCloseTo(1.1 * 1.04);
        expect(merged.oxygenDrainMultiplier).toBeCloseTo(1.1);
        expect(merged.maxHealthBonus).toBe(1);
        const still = composeExpeditionIntoLoadoutMods({ hiddenRoomDetectionRange: 1 }, { condition: { id: 'subzero_stillness' } });
        expect(still.hiddenRoomDetectionRange).toBe(3);
        expect(composeExpeditionIntoLoadoutMods(null, gale).cryoDurationMultiplier).toBeCloseTo(1.25);
    });

    it('pays fractional salvage as a chance of one more whole unit', () => {
        expect(scaleExpeditionSalvage(1, 1, 0.99)).toBe(1);
        expect(scaleExpeditionSalvage(1, 1.35, 0.2)).toBe(2);
        expect(scaleExpeditionSalvage(1, 1.35, 0.5)).toBe(1);
        expect(scaleExpeditionSalvage(2, 1.5, 0.99)).toBe(3);
        let total = 0;
        for (let i = 0; i < 1000; i += 1) total += scaleExpeditionSalvage(1, 1.35, i / 1000);
        expect(Math.abs(total - 1350)).toBeLessThanOrEqual(1);
    });

    it('scales elite promotion odds without drawing extra rolls', () => {
        const chance = 0.1;
        let base = 0;
        let boosted = 0;
        for (let i = 0; i < 1000; i += 1) {
            const roll = i / 1000;
            if (scaleExpeditionEliteRoll(roll, 1) < chance) base += 1;
            if (scaleExpeditionEliteRoll(roll, 2.5) < chance) boosted += 1;
        }
        expect(base).toBe(100);
        expect(boosted).toBe(250);
        expect(scaleExpeditionEliteRoll(0.4, 0)).toBe(0.4);
    });

    it('gives each condition its own signature on a kill', () => {
        const profile = (id) => ({ condition: { id } });
        expect(planExpeditionDeathEffect(profile('glacial_gale'), { type: 'cryosnail' })).toMatchObject({ kind: 'frost_ring' });
        expect(planExpeditionDeathEffect(profile('glacial_gale'), { type: 'sporesnail' })).toBeNull();
        expect(planExpeditionDeathEffect(profile('spore_bloom'), { type: 'sporesnail' })).toMatchObject({ kind: 'spore_cache', dropType: 'coin' });
        expect(planExpeditionDeathEffect(profile('geothermal_arc'), { type: 'crawler', roll: 0.1 })).toMatchObject({ kind: 'arc_discharge' });
        expect(planExpeditionDeathEffect(profile('geothermal_arc'), { type: 'crawler', roll: 0.6 })).toBeNull();
        expect(planExpeditionDeathEffect(profile('glacial_gale'), { type: 'cryosnail', isBoss: true })).toBeNull();
        expect(planExpeditionDeathEffect(null, { type: 'cryosnail' })).toBeNull();
        expect(getExpeditionEffects(profile('bio_resin_surge')).world.resinYieldMultiplier).toBe(1.5);
        expect(getExpeditionEffects(profile('spore_bloom')).world.resinYieldMultiplier).toBe(1);
    });

    describe('corridor rubble', () => {
        const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);
        const openHall = (size = 24) => Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => (
            x === 0 || y === 0 || x === size - 1 || y === size - 1 ? '#' : '.'
        )));
        const components = (grid) => {
            const seen = new Set();
            let count = 0;
            grid.forEach((row, y) => row.forEach((cell, x) => {
                if (!WALKABLE.has(cell) || seen.has(`${x},${y}`)) return;
                count += 1;
                const queue = [[x, y]];
                seen.add(`${x},${y}`);
                while (queue.length) {
                    const [cx, cy] = queue.pop();
                    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
                        if (!WALKABLE.has(grid[ny]?.[nx]) || seen.has(`${nx},${ny}`)) continue;
                        seen.add(`${nx},${ny}`);
                        queue.push([nx, ny]);
                    }
                }
            }));
            return count;
        };
        const always = { chance: 1 };

        it('is deterministic per expedition and chunk, and shifts between expeditions', () => {
            const a = planExpeditionObstacles(openHall(), { expeditionSeed: 11, chunkKey: '3,4', ...always });
            expect(a.length).toBeGreaterThan(0);
            expect(planExpeditionObstacles(openHall(), { expeditionSeed: 11, chunkKey: '3,4', ...always })).toEqual(a);
            const layouts = new Set();
            for (let seed = 1; seed <= 12; seed += 1) {
                layouts.add(JSON.stringify(planExpeditionObstacles(openHall(), { expeditionSeed: seed, chunkKey: '3,4', ...always })));
            }
            expect(layouts.size).toBeGreaterThan(8);
        });

        it('touches roughly the configured share of chunks', () => {
            let touched = 0;
            for (let i = 0; i < 400; i += 1) {
                if (planExpeditionObstacles(openHall(), { expeditionSeed: 99, chunkKey: `${i},${-i}` }).length) touched += 1;
            }
            expect(touched).toBeGreaterThan(400 * 0.15);
            expect(touched).toBeLessThan(400 * 0.3);
        });

        it('never splits the walkable area, so a one-lane corridor gets no rubble', () => {
            const lane = Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, () => (
                y === 5 || y === 6 ? '.' : '#'
            )));
            for (let seed = 1; seed <= 30; seed += 1) {
                expect(planExpeditionObstacles(lane, { expeditionSeed: seed, chunkKey: '0,5', ...always })).toEqual([]);
            }
            for (let seed = 1; seed <= 30; seed += 1) {
                const grid = openHall(20);
                // A ring corridor around a solid core: rubble may close one side
                // of the loop but never both.
                for (let y = 5; y < 15; y += 1) for (let x = 5; x < 15; x += 1) grid[y][x] = '#';
                const before = components(grid);
                for (const { x, y } of planExpeditionObstacles(grid, { expeditionSeed: seed, chunkKey: '1,1', ...always, maxPiles: 6, attempts: 60 })) {
                    expect(grid[y][x]).toBe('.');
                    grid[y][x] = '#';
                }
                expect(components(grid)).toBe(before);
            }
        });

        it('keeps rubble off protected cells and the chunk border', () => {
            const protectedCells = new Set();
            for (let y = 0; y < 24; y += 1) for (let x = 0; x < 12; x += 1) protectedCells.add(`${x},${y}`);
            for (let seed = 1; seed <= 20; seed += 1) {
                for (const { x, y } of planExpeditionObstacles(openHall(), { expeditionSeed: seed, chunkKey: '2,2', protectedCells, ...always })) {
                    expect(x).toBeGreaterThanOrEqual(12);
                    expect(x).toBeLessThan(24 - 2);
                    expect(y).toBeGreaterThanOrEqual(2);
                    expect(y).toBeLessThan(24 - 2);
                }
            }
            expect(planExpeditionObstacles([], { expeditionSeed: 1, chunkKey: '0,0', ...always })).toEqual([]);
        });
    });

    it('colours each condition\'s world and browns out a grid arc', () => {
        const fogs = new Set();
        for (const condition of EXPEDITION_CONDITIONS) {
            const atmosphere = expeditionAtmosphere(condition.id, 0);
            expect(atmosphere, condition.id).not.toBeNull();
            fogs.add(atmosphere.fog);
        }
        expect(fogs.size).toBe(EXPEDITION_CONDITIONS.length);
        expect(expeditionAtmosphere('spore_bloom', 0).fog).toBe(0x5fd07a);
        let sparks = 0;
        let dimmest = 1;
        for (let t = 0; t < 120; t += 0.05) {
            const arc = expeditionAtmosphere('geothermal_arc', t);
            if (arc.sparking) sparks += 1;
            dimmest = Math.min(dimmest, arc.intensity);
            expect(expeditionAtmosphere('spore_bloom', t).sparking).toBe(false);
        }
        expect(sparks).toBeGreaterThan(0);
        expect(sparks).toBeLessThan(2400 * 0.25);
        expect(dimmest).toBeLessThan(0.8);
        expect(expeditionAtmosphere('geothermal_arc', 3.3)).toEqual(expeditionAtmosphere('geothermal_arc', 3.3));
        expect(expeditionAtmosphere(undefined, 0)).toBeNull();
    });
});
