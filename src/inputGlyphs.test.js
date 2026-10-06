import { describe, expect, it } from 'vitest';
import { getControllerGlyphLabel } from './inputGlyphs.js';

describe('getControllerGlyphLabel', () => {
    it('uses Xbox/Deck labels as the safe default family', () => {
        expect(getControllerGlyphLabel('confirm', 'SteamDeckController')).toBe('A');
        expect(getControllerGlyphLabel('tabLeft', 'XBoxOneController')).toBe('LB');
        expect(getControllerGlyphLabel('pause', 'UnknownController')).toBe('MENU');
    });

    it('uses PlayStation face, shoulder, and system labels', () => {
        expect(getControllerGlyphLabel('confirm', 'PS5Controller')).toBe('X');
        expect(getControllerGlyphLabel('back', 'PS4Controller')).toBe('O');
        expect(getControllerGlyphLabel('tabRight', 'PS5Controller')).toBe('R1');
        expect(getControllerGlyphLabel('pause', 'PS5Controller')).toBe('OPTIONS');
    });

    it('uses Nintendo physical labels without swapping semantic confirm/back', () => {
        expect(getControllerGlyphLabel('confirm', 'SwitchProController')).toBe('B');
        expect(getControllerGlyphLabel('back', 'SwitchProController')).toBe('A');
        expect(getControllerGlyphLabel('fire', 'SwitchProController')).toBe('ZR');
    });

    it('falls back to a supplied label or readable semantic action name', () => {
        expect(getControllerGlyphLabel('customAction', 'GenericGamepad', 'E')).toBe('E');
        expect(getControllerGlyphLabel('customAction', 'GenericGamepad')).toBe('CUSTOM ACTION');
        expect(getControllerGlyphLabel('', 'GenericGamepad', 'E')).toBe('E');
    });

    // The glyphs must name the buttons scripts/build-steam-input-configs.js
    // actually binds: sprint is the left trigger and scan the left bumper
    // (B is dodge), and the commands that used to be keyboard-only (T, G, C)
    // sit on the D-pad and the aim-stick click.
    it('names the buttons the shipped controller layout binds', () => {
        expect(getControllerGlyphLabel('sprint', 'SteamDeckController')).toBe('LT');
        expect(getControllerGlyphLabel('scan', 'SteamDeckController')).toBe('LB');
        expect(getControllerGlyphLabel('sprint', 'PS5Controller')).toBe('L2');
        expect(getControllerGlyphLabel('scan', 'PS5Controller')).toBe('L1');
        expect(getControllerGlyphLabel('sprint', 'SwitchProController')).toBe('ZL');
        expect(getControllerGlyphLabel('scan', 'SwitchProController')).toBe('L');
        expect(getControllerGlyphLabel('tacticalPing', 'SteamDeckController')).toBe('D-PAD ←');
        expect(getControllerGlyphLabel('quickCommand', 'PS5Controller')).toBe('D-PAD →');
        expect(getControllerGlyphLabel('cycleInteract', 'SteamDeckController')).toBe('RS');
        expect(getControllerGlyphLabel('cycleInteract', 'PS5Controller')).toBe('R3');
    });
});
