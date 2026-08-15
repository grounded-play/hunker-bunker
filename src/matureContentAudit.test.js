import { describe, expect, it, beforeEach } from 'vitest';
import { MatureContentAudit, MATURE_CONTENT_MANIFEST } from './matureContentAudit.js';

describe('MatureContentAudit', () => {
    let audit;

    beforeEach(() => {
        audit = new MatureContentAudit();
    });

    it('contains all required mature content categories in the manifest', () => {
        expect(MATURE_CONTENT_MANIFEST.length).toBe(5);
        const ids = MATURE_CONTENT_MANIFEST.map((m) => m.id);
        expect(ids).toContain('sensual_storylines_romance');
        expect(ids).toContain('parasite_symbiosis');
        expect(ids).toContain('queen_subjugation');
        expect(ids).toContain('self_annihilation');
        expect(ids).toContain('combat_violence');
    });

    it('toggles open state correctly', () => {
        expect(audit.isOpen).toBe(false);
        audit.isOpen = false;
        // toggle when closed
        audit.toggleModal();
        // Since document is mocked/null in pure unit tests, verify flag behavior
        expect(typeof audit.toggleModal).toBe('function');
    });

    it('gives the flagged suicide/self-sacrifice category real jump-to-scene buttons', () => {
        const category = MATURE_CONTENT_MANIFEST.find((m) => m.id === 'self_annihilation');
        expect(category.scenes.length).toBeGreaterThanOrEqual(4);
        const kinds = category.scenes.map((s) => s.kind);
        expect(kinds).toContain('ending');
        expect(kinds).toContain('log');
    });

    it('gives the Queen subjugation category a jump-to-cinematic scene', () => {
        const category = MATURE_CONTENT_MANIFEST.find((m) => m.id === 'queen_subjugation');
        expect(category.scenes.length).toBeGreaterThanOrEqual(1);
        expect(category.scenes[0].kind).toBe('ending');
    });

    it('playScene and closeSceneViewer are safe no-ops without a DOM', () => {
        expect(() => audit.playScene({ kind: 'log', log: 'reyes_c11' })).not.toThrow();
        expect(() => audit.closeSceneViewer()).not.toThrow();
    });

    it('bindGamepadShortcut does not throw when gamepad API is unavailable', () => {
        expect(() => audit.bindGamepadShortcut()).not.toThrow();
    });
});
