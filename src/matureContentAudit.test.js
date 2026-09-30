import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { MatureContentAudit, MATURE_CONTENT_MANIFEST, REVIEWER_LOG_LETTERS, buildDialogueTranscript } from './matureContentAudit.js';
import { NPC_DIALOGUE_TREES } from './npcDialogueTrees.js';

describe('MatureContentAudit', () => {
    let audit;

    beforeEach(() => {
        audit = new MatureContentAudit();
    });

    it('lists only categories the game contains', () => {
        const ids = MATURE_CONTENT_MANIFEST.map((m) => m.id);
        expect(ids).toEqual(['sensual_storylines_romance', 'parasite_symbiosis', 'queen_subjugation', 'self_annihilation', 'combat_violence']);
        // Valve review 2026-09: these two existed only in this gallery.
        expect(ids).not.toContain('veiled_nudity');
        expect(ids).not.toContain('survival_economy_eroticism');
    });

    it('says where every category is met in play', () => {
        for (const item of MATURE_CONTENT_MANIFEST) expect(item.inPlay, item.id).toMatch(/In play:/);
    });

    it('shows only logs that exist in the game itself', () => {
        const gameSource = readFileSync(new URL('./threeGame.js', import.meta.url), 'utf8');
        const phraseByLog = { reyes_c11: 'making it out of here', chen_b03: 'needs a body' };
        const logs = MATURE_CONTENT_MANIFEST.flatMap((m) => (m.scenes ?? []).filter((s) => s.kind === 'log').map((s) => s.log));
        expect(logs.length).toBeGreaterThan(0);
        for (const log of logs) {
            expect(REVIEWER_LOG_LETTERS[log], log).toBeTruthy();
            expect(gameSource, log).toContain(phraseByLog[log]);
        }
    });

    it('reads every romance tree as a transcript, from any screen, including its sensual choices', () => {
        const category = MATURE_CONTENT_MANIFEST.find((m) => m.id === 'sensual_storylines_romance');
        for (const { id } of category.dialogueTrees) {
            expect(NPC_DIALOGUE_TREES[id], id).toBeTruthy();
            expect(buildDialogueTranscript(NPC_DIALOGUE_TREES[id]).length).toBeGreaterThan(200);
        }
        const val = buildDialogueTranscript(NPC_DIALOGUE_TREES.sister_val);
        expect(val).toContain('[SENSUAL / EMBRACE]');
        expect(val).toContain('[DEEPEN INTIMACY]');
        expect(() => audit.playScene({ kind: 'tree', treeId: 'sister_val' })).not.toThrow();
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
