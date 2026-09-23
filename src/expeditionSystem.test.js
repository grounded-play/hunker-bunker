import { describe, it, expect } from 'vitest';
import {
    EXPEDITION_CONDITIONS,
    EXPEDITION_BOUNTIES,
    deriveExpeditionSeed,
    createExpeditionProfile
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
    });
});
