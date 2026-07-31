import { describe, expect, it } from 'vitest';
import { canUseDeveloperTools } from './devToolsAccess.js';

describe('developer tool authorization', () => {
    it('keeps browser development tools available', () => {
        expect(canUseDeveloperTools()).toBe(true);
    });

    it('keeps the current packaged QA build enabled without a beta response', () => {
        expect(canUseDeveloperTools({ electronApiPresent: true })).toBe(true);
        expect(canUseDeveloperTools({
            electronApiPresent: true,
            qaToolsEnabled: false
        })).toBe(true);
    });

    it('allows an explicitly QA-enabled Electron launch', () => {
        expect(canUseDeveloperTools({
            electronApiPresent: true,
            qaToolsEnabled: true
        })).toBe(true);
    });
});
