import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

// Session 2026-10-06: "make sure every command maps to something on the Steam
// Deck ... like press T to trade". The target panel printed the keyboard key
// (E, T) even when the player was on a controller.
describe('target prompts name the controller button on a pad', () => {
    const game = (gamepad) => ({
        isGamepadActive: () => gamepad,
        activeControllerType: 'SteamDeckController',
        getPromptKeyGlyph: ThreeGame.prototype.getPromptKeyGlyph
    });

    it('maps the keyboard prompt keys to their controller actions', () => {
        const pad = game(true);
        expect(pad.getPromptKeyGlyph('E')).toBe('A');
        expect(pad.getPromptKeyGlyph('T')).toBe('D-PAD ←');
    });

    it('keeps the keyboard key with no pad', () => {
        expect(game(false).getPromptKeyGlyph('T')).toBe('T');
    });
});
