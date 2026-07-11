import { describe, expect, it } from 'vitest';
import { DIALOGUE_LINES, DIALOGUE_REGISTERS, getDialogueLine, getSuitRegister } from './dialogueLines.js';

describe('dialogueLines', () => {
    it('groups bunker voice lines by required sprint triggers', () => {
        for (const trigger of ['lowO2', 'extraction', 'death', 'blackBoxRecovery', 'terminalChoice', 'majorUpgrade']) {
            expect(DIALOGUE_LINES[trigger]?.length).toBeGreaterThanOrEqual(5);
        }
    });

    it('includes escalating cave-signal foreshadowing', () => {
        expect(DIALOGUE_LINES.caveSignal).toEqual([
            'MOTHERSHIP: SUBTERRANEAN SIGNAL DETECTED. SOURCE UNKNOWN.',
            'SYSTEM: AUDIO PATTERN RESEMBLES BREATHING. CLASSIFYING AS STATIC.',
            'BUNKER: DOOR MAP UPDATED. UNAUTHORIZED CAVITY FOUND.',
            'MOTHERSHIP: DO NOT ENTER ORGANIC STRUCTURE WITHOUT RECOVERY OBJECTIVE.'
        ]);
    });

    it('selects lines deterministically', () => {
        expect(getDialogueLine('death', () => 0)).toBe(DIALOGUE_LINES.death[0]);
        expect(getDialogueLine('death', () => 0.999)).toBe(DIALOGUE_LINES.death[DIALOGUE_LINES.death.length - 1]);
        expect(getDialogueLine('missing')).toBeNull();
    });

    it('resolves different registers (corporate, glitched, reverent)', () => {
        const corpLine = getDialogueLine('lowO2', () => 0, 'corporate');
        const glitchLine = getDialogueLine('lowO2', () => 0, 'glitched');
        const reverentLine = getDialogueLine('lowO2', () => 0, 'reverent');

        expect(corpLine).toBe(DIALOGUE_LINES.lowO2[0]);
        expect(glitchLine).toContain('L-LiFe sUPpOrT');
        expect(reverentLine).toContain('The air is a cage');
    });

    it('maps infection context onto suit OS registers', () => {
        expect(getSuitRegister({ infectionStage: 'latent' })).toBe('corporate');
        expect(getSuitRegister({ infectionStage: 'symptomatic' })).toBe('glitched');
        expect(getSuitRegister({ infectionStage: 'strained', queenObedience: 2 })).toBe('reverent');
        expect(getDialogueLine('lowO2', () => 0, { infectionStage: 'symptomatic' }))
            .toBe(DIALOGUE_REGISTERS.glitched.lowO2[0]);
        expect(getDialogueLine('director', () => 0, { infectionStage: 'outed' }))
            .toBe(DIALOGUE_REGISTERS.reverent.director[0]);
    });
});
