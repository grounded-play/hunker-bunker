import { describe, expect, it } from 'vitest';
import { canUseDeveloperTools } from './devToolsAccess.js';

describe('developer tool authorization', () => {
    it('keeps browser development tools available', () => {
        expect(canUseDeveloperTools()).toBe(true);
    });

    it('fails closed in packaged Electron until QA tools are explicitly enabled', () => {
        expect(canUseDeveloperTools({ electronApiPresent: true })).toBe(false);
        expect(canUseDeveloperTools({
            electronApiPresent: true,
            qaToolsEnabled: false
        })).toBe(false);
    });

    it('allows an explicitly QA-enabled Electron launch', () => {
        expect(canUseDeveloperTools({
            electronApiPresent: true,
            qaToolsEnabled: true
        })).toBe(true);
    });
});
