import { describe, expect, it } from 'vitest';
import {
    getPropVariants,
    PROP_VARIANT_GROUPS,
    resolvePropVariant
} from './propVariants.js';

describe('propVariants', () => {
    it('defines frozen variant groups covering key categories', () => {
        expect(PROP_VARIANT_GROUPS).toBeDefined();
        expect(Object.isFrozen(PROP_VARIANT_GROUPS)).toBe(true);
        expect(PROP_VARIANT_GROUPS.specimen_tank).toContain('prop_specimen_tank');
        expect(PROP_VARIANT_GROUPS.specimen_tank).toContain('prop_broken_specimen_tank');
        expect(PROP_VARIANT_GROUPS.flesh_steel_reliquary).toContain('prop_corporate_saint_reliquary');
        expect(PROP_VARIANT_GROUPS.cryo_manifold).toContain('prop_coolant_drum_leaking_pool');
    });

    it('returns variants for a given group key', () => {
        const variants = getPropVariants('specimen_tank');
        expect(variants).toEqual(['prop_specimen_tank', 'prop_broken_specimen_tank']);
    });

    it('returns sibling variants for a model key belonging to a group', () => {
        const variants = getPropVariants('prop_specimen_tank');
        expect(variants).toContain('prop_broken_specimen_tank');
    });

    it('returns array with input key when no group exists', () => {
        const variants = getPropVariants('non_existent_prop');
        expect(variants).toEqual(['non_existent_prop']);
    });

    it('resolves direct variant group with deterministic rng', () => {
        const first = resolvePropVariant('specimen_tank', { rng: () => 0.0 });
        const second = resolvePropVariant('specimen_tank', { rng: () => 0.99 });
        expect(first).toBe('prop_specimen_tank');
        expect(second).toBe('prop_broken_specimen_tank');
    });

    it('resolves model substitution only when allowSubstitution is true', () => {
        const unSubbed = resolvePropVariant('prop_specimen_tank', {
            rng: () => 0.99,
            allowSubstitution: false
        });
        expect(unSubbed).toBe('prop_specimen_tank');

        const subbed = resolvePropVariant('prop_specimen_tank', {
            rng: () => 0.99,
            allowSubstitution: true
        });
        expect(subbed).toBe('prop_broken_specimen_tank');
    });
});
