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
});

