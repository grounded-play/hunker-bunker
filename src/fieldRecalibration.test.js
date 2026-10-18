import { describe, it, expect } from 'vitest';
import {
    RECALIBRATION_MODS,
    RECALIBRATION_REROLL_COST,
    generateRecalibrationChoices,
    buildStatDiffPreview,
    checkRecalibrationAffordability
} from './fieldRecalibration.js';

describe('fieldRecalibration', () => {
    describe('catalog definitions', () => {
        it('has all required base and fusion mods defined', () => {
            const ids = RECALIBRATION_MODS.map((m) => m.id);
            expect(ids).toContain('cryo_rime');
            expect(ids).toContain('caustic_payload');
            expect(ids).toContain('subzero_necrosis');
            expect(ids).toContain('kinetic_hollow_point');
            expect(ids).toContain('hyper_split_core');
            expect(ids).toContain('corrupted_overcharge');
            expect(ids).toContain('o2_siphon_chamber');
        });

        it('defines subzero_necrosis as a fusion with dual cryo and bio elements', () => {
            const fusion = RECALIBRATION_MODS.find((m) => m.id === 'subzero_necrosis');
            expect(fusion.isFusion).toBe(true);
            expect(fusion.fusionElements).toEqual(['cryo', 'bio']);
            expect(fusion.stats.novaDamage).toBeGreaterThan(0);
            expect(fusion.stats.novaRadius).toBeGreaterThan(0);
            expect(RECALIBRATION_REROLL_COST.tech).toBe(10);
        });
    });

    describe('generateRecalibrationChoices', () => {
        it('generates exactly 3 distinct choices for a safe camp', () => {
            const choices = generateRecalibrationChoices({
                campId: 'camp-alpha',
                equippedOverclocks: [],
                equippedRelics: []
            });
            expect(choices).toHaveLength(3);
            const ids = choices.map((c) => c.id);
            const unique = new Set(ids);
            expect(unique.size).toBe(3);
        });

        it('is deterministic for the same campId and runEntropy', () => {
            const run1 = generateRecalibrationChoices({ campId: 'camp-beta', runEntropy: 42 });
            const run2 = generateRecalibrationChoices({ campId: 'camp-beta', runEntropy: 42 });
            expect(run1.map((c) => c.id)).toEqual(run2.map((c) => c.id));
        });

        it('rerolling changes the choices', () => {
            const initial = generateRecalibrationChoices({ campId: 'camp-gamma', rerollCount: 0 });
            const rerolled = generateRecalibrationChoices({ campId: 'camp-gamma', rerollCount: 1 });
            expect(initial.map((c) => c.id)).not.toEqual(rerolled.map((c) => c.id));
        });

        it('guarantees Sub-Zero Necrosis fusion if player has Cryo or Bio component', () => {
            const choicesWithCryo = generateRecalibrationChoices({
                campId: 'camp-delta',
                equippedOverclocks: [{ id: 'cryo_rime', name: 'Cryo Rime Injector', element: 'cryo' }],
                equippedRelics: []
            });
            expect(choicesWithCryo.some((c) => c.id === 'subzero_necrosis')).toBe(true);

            const choicesWithBio = generateRecalibrationChoices({
                campId: 'camp-delta',
                equippedOverclocks: [],
                equippedRelics: [{ id: 'caustic_payload', name: 'Caustic Spore Payload', element: 'bio' }]
            });
            expect(choicesWithBio.some((c) => c.id === 'subzero_necrosis')).toBe(true);
        });
    });

    describe('buildStatDiffPreview', () => {
        it('produces human-readable before and after comparison lists', () => {
            const current = { id: 'kinetic_hollow_point', name: 'Kinetic Hollow-Point Core', element: 'kinetic', stats: { damageMult: 1.25 } };
            const candidate = RECALIBRATION_MODS.find((m) => m.id === 'subzero_necrosis');
            const preview = buildStatDiffPreview(current, candidate);

            expect(preview.beforeStats.length).toBeGreaterThan(0);
            expect(preview.afterStats.length).toBeGreaterThan(0);
            expect(preview.beforeStats.some((s) => s.label === 'ACTIVE OVERCLOCK' && s.value === current.name)).toBe(true);
            expect(preview.afterStats.some((s) => s.label === 'NEW OVERCLOCK' && s.value === candidate.name)).toBe(true);
            expect(preview.afterStats.some((s) => s.label === 'ELEMENT' && s.value === 'CRYO + BIO FUSION')).toBe(true);
        });

        it('provides baseline for standard issue weapon when current is null', () => {
            const candidate = RECALIBRATION_MODS.find((m) => m.id === 'cryo_rime');
            const preview = buildStatDiffPreview(null, candidate);
            expect(preview.beforeStats.some((s) => s.label === 'CORE FIRING PIN')).toBe(true);
        });
    });

    describe('checkRecalibrationAffordability', () => {
        it('returns affordable: true when bank has sufficient materials', () => {
            const cost = { tech: 35 };
            const bank = { tech: 35, med: 10 };
            const result = checkRecalibrationAffordability(cost, bank);
            expect(result.affordable).toBe(true);
            expect(result.missing).toHaveLength(0);
        });

        it('identifies missing resources when bank is insufficient', () => {
            const cost = { tech: 30, med: 15 };
            const bank = { tech: 10, scrap: 5, med: 5 };
            const result = checkRecalibrationAffordability(cost, bank);
            expect(result.affordable).toBe(false);
            expect(result.missing.some((m) => m.resource === 'tech' && m.need === 30)).toBe(true);
            expect(result.missing.some((m) => m.resource === 'med' && m.need === 15)).toBe(true);
        });
    });
});
