import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DialogueManager } from './dialogue.js';

let originalDocument;

describe('DialogueManager getControlPrompt dynamic controls formatting', () => {
    beforeEach(() => {
        originalDocument = globalThis.document;
        globalThis.document = {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => []
        };
    });

    afterEach(() => {
        globalThis.document = originalDocument;
    });

    it('returns keyboard controls when no gamepad is active', () => {
        const manager = new DialogueManager({});
        const fakeGame = { isGamepadActive: () => false, activeInputDevice: 'keyboard' };
        const prompt = manager.getControlPrompt(fakeGame, {
            action: 'sprint',
            kbdIcon: 'WASD',
            kbdText: 'WASD / ARROW KEYS — NAVIGATE STRUCTURE | [SHIFT] — SPRINT',
            padIcon: 'LS',
            padText: 'LEFT STICK — NAVIGATE STRUCTURE | [LS] / [LB] — SPRINT'
        });

        expect(prompt.icon).toBe('WASD');
        expect(prompt.text).toContain('WASD / ARROW KEYS');
    });

    it('returns gamepad / Steam Deck controls when gamepad is active', () => {
        const manager = new DialogueManager({});
        const fakeGame = { isGamepadActive: () => true, activeInputDevice: 'gamepad', activeControllerType: 'SteamDeckController' };
        const prompt = manager.getControlPrompt(fakeGame, {
            action: 'interact',
            kbdIcon: 'E',
            kbdText: 'PRESS [E] TO UPLINK.',
            padIcon: 'A',
            padText: 'PRESS [A] TO UPLINK.'
        });

        expect(prompt.icon).toBe('A');
        expect(prompt.text).toBe('PRESS [A] TO UPLINK.');
    });

    it('uses correct glyphs for tactical map and sprint on Steam Deck', () => {
        const manager = new DialogueManager({});
        const fakeGame = { isGamepadActive: () => true, activeInputDevice: 'gamepad', activeControllerType: 'SteamDeckController' };
        const mapPrompt = manager.getControlPrompt(fakeGame, {
            action: 'toggleMap',
            kbdIcon: 'N',
            kbdText: 'PRESS [M] FOR MAP.',
            padIcon: 'VIEW',
            padText: 'PRESS [VIEW] FOR MAP.'
        });

        expect(mapPrompt.icon).toBe('VIEW');
        expect(mapPrompt.text).toBe('PRESS [VIEW] FOR MAP.');
    });
});
