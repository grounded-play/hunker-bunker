import { describe, expect, it } from 'vitest';
import { toxinProtectionGuidance } from './toxinProtectionGuidance.js';

describe('toxin protection guidance', () => {
    it('directs an unprotected player through printing and installation', () => {
        const guidance = toxinProtectionGuidance();
        expect(guidance.state).toBe('missing');
        expect(guidance.detail).toContain('FOUNDRY → WEAPONS → PRINT');
        expect(guidance.prompt).toContain('INSTALL IN SUIT BAY A OR B');
    });

    it('distinguishes a printed filter from an installed one', () => {
        const guidance = toxinProtectionGuidance({ fabricated: true });
        expect(guidance.state).toBe('ready');
        expect(guidance.detail).toContain('INSTALL IN SUIT BAY');
    });

    it('confirms the live reduction once installed', () => {
        const guidance = toxinProtectionGuidance({ gasDamageReduction: 0.12, fabricated: true });
        expect(guidance.state).toBe('active');
        expect(guidance.detail).toContain('12% DAMAGE REDUCTION');
        expect(guidance.detail).toContain('LEAVE THE CLOUD');
    });
});
