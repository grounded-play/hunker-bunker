import { describe, expect, it } from 'vitest';
import { STRAIN_BY_CLASS, deriveInheritance, getStrainForClass } from './strains.js';

describe('STRAIN_BY_CLASS', () => {
    it('maps every real class id to a strain', () => {
        expect(Object.keys(STRAIN_BY_CLASS).sort()).toEqual(['ENGINEER', 'SCOUT', 'TANK']);
        expect(STRAIN_BY_CLASS.SCOUT.strainId).toBe('RUNNER');
        expect(STRAIN_BY_CLASS.TANK.strainId).toBe('CARAPACE');
        expect(STRAIN_BY_CLASS.ENGINEER.strainId).toBe('WEAVER');
    });

    it('keeps skill rename tables complete and non-empty', () => {
        for (const entry of Object.values(STRAIN_BY_CLASS)) {
            expect(entry.startingMutationBranch).toMatch(/hunter|guardian|weaver/);
            expect(Object.keys(entry.skillRenames).length).toBeGreaterThanOrEqual(3);
            expect(Object.values(entry.skillRenames).every(Boolean)).toBe(true);
        }
    });

    it('falls back to a stable strain for unknown class ids', () => {
        expect(getStrainForClass('NOPE').strainId).toBe('WEAVER');
    });
});

describe('deriveInheritance', () => {
    it('is deterministic and maps skill names into seed mutations', () => {
        const summary = {
            classId: 'SCOUT',
            skillsUsed: ['SPRINT BURST', 'LIGHT STEP', 'SPRINT BURST'],
            blackBoxesRecovered: 2,
            snailsKilled: 5,
            salvageBanked: 12,
            deepestDepthTier: 3
        };
        expect(deriveInheritance(summary)).toEqual(deriveInheritance(summary));
        expect(deriveInheritance(summary)).toMatchObject({
            sourceClass: 'SCOUT',
            strainId: 'RUNNER',
            seedMutations: ['SILENT TALONS', 'POUNCE'],
            chitin: 19,
            geneticMemory: 72
        });
    });

    it('clamps numeric inputs', () => {
        const inheritance = deriveInheritance({ classId: 'TANK', snailsKilled: -10, salvageBanked: Number.NaN, deepestDepthTier: 999, blackBoxesRecovered: 999 });
        expect(inheritance.chitin).toBe(999);
        expect(inheritance.geneticMemory).toBe(999);
        expect(inheritance.preludeEcho.snailsKilled).toBe(0);
    });
});
