import { describe, expect, it } from 'vitest';
import { vitalHazardGuidance } from './hazardGuidance.js';

describe('vital hazard guidance', () => {
    it('names the immediate escape and the generator repair with its cost', () => {
        const guidance = vitalHazardGuidance({ kind: 'oxygen', nextCost: { tech: 10, med: 5, coin: 5 } });
        expect(guidance.state).toBe('missing');
        expect(guidance.detail).toContain('RETURN TO THE PRESSURIZED SHIP FIELD');
        expect(guidance.detail).toContain('REPAIR THE O₂ GENERATOR AT THE SHIP CONSOLE (10 TECH · 5 MED · 5 COIN)');
        expect(guidance.prompt).toContain('FOR GOOD:');
    });

    it('prefers the live safe direction and points at the next generator level', () => {
        const guidance = vitalHazardGuidance({ kind: 'cold', safeDirection: 'SHIP FIELD 40U NORTH', generatorLevel: 1 });
        expect(guidance.state).toBe('ready');
        expect(guidance.detail).toBe('SHIP FIELD 40U NORTH · UPGRADE THE O₂ GENERATOR FOR A WIDER FIELD (LEVEL 1)');
        expect(guidance.prompt).toContain('COLD DRAINS YOUR O₂ FASTER');
    });

    it('confirms installed protection instead of repeating the shopping list', () => {
        const sealed = vitalHazardGuidance({ kind: 'oxygen', drainMultiplier: 0.75 });
        expect(sealed.state).toBe('active');
        expect(sealed.detail).toContain('O₂ DRAIN CUT 25%');
        expect(sealed.detail).not.toContain('REPAIR');

        const warm = vitalHazardGuidance({ kind: 'cold', warmthPerk: true, generatorLevel: 3, generatorMaxed: true });
        expect(warm.detail).toContain('TALLOW WARMTH ACTIVE');
        // Being rested (10%) is not protection: the generator is still the answer.
        expect(vitalHazardGuidance({ kind: 'oxygen', drainMultiplier: 0.9 }).detail).toContain('REPAIR THE O₂ GENERATOR');
        // Warmth only answers cold.
        expect(vitalHazardGuidance({ kind: 'oxygen', warmthPerk: true }).state).toBe('missing');
    });
});
