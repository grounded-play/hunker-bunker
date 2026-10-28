import { describe, expect, it } from 'vitest';
import { describeModifierChanges, installFeedbackLine } from './installFeedback.js';

describe('install feedback', () => {
    it('reports the toxin filter as toxin damage before and after', () => {
        const changes = describeModifierChanges({ gasDamageReduction: 0 }, { gasDamageReduction: 0.12 });
        expect(changes).toEqual(['TOXIN DAMAGE 1.00 → 0.88']);
        expect(installFeedbackLine({ name: 'Bio-Hazard Filter Vent', slot: 1, mount: 'operator.chest_center', changes }))
            .toBe('> BIO-HAZARD FILTER VENT INSTALLED IN SUIT BAY A · CHEST · TOXIN DAMAGE 1.00 → 0.88');
    });

    it('shows both sides of a tradeoff module', () => {
        const changes = describeModifierChanges(
            { oxygenDrainMultiplier: 1, healingMultiplier: 1 },
            { oxygenDrainMultiplier: 0.75, healingMultiplier: 0.6 }
        );
        expect(changes).toEqual(['O₂ DRAIN 1.00 → 0.75', 'HEALING RECEIVED 1.00 → 0.60']);
    });

    it('counts additive bonuses and switches, and skips what did not move', () => {
        const changes = describeModifierChanges(
            { clipSizeBonus: 0, fireRateMultiplier: 1.08, ringCrossingFreeO2: false },
            { clipSizeBonus: -1, fireRateMultiplier: 1.08, ringCrossingFreeO2: true, maxHealthBonus: 2 }
        );
        expect(changes).toEqual(['MAX HEALTH 0 → 2', 'MAGAZINE 0 → -1', 'FREE RING CROSSINGS OFF → ON']);
    });

    it('places charms on the weapon and mods in their bay', () => {
        expect(installFeedbackLine({ name: 'Sporesnail Pearl', kind: 'charm', mount: 'weapon.charm' }))
            .toBe('> SPORESNAIL PEARL INSTALLED ON THE WEAPON');
        expect(installFeedbackLine({ name: 'Deep Anchor', slot: 2, mount: 'operator.waist_back' }))
            .toBe('> DEEP ANCHOR INSTALLED IN SUIT BAY B · BELT');
    });
});
