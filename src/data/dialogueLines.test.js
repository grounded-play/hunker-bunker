import { describe, expect, it } from 'vitest';
import { DIALOGUE_LINES, getDialogueLine } from './dialogueLines.js';

describe('dialogueLines', () => {
    it('groups bunker voice lines by required sprint triggers', () => {
        for (const trigger of ['lowO2', 'extraction', 'death', 'blackBoxRecovery', 'terminalChoice', 'majorUpgrade']) {
            expect(DIALOGUE_LINES[trigger]?.length).toBeGreaterThanOrEqual(5);
        }
    });

    it('selects lines deterministically', () => {
        expect(getDialogueLine('death', () => 0)).toBe(DIALOGUE_LINES.death[0]);
        expect(getDialogueLine('death', () => 0.999)).toBe(DIALOGUE_LINES.death[DIALOGUE_LINES.death.length - 1]);
        expect(getDialogueLine('missing')).toBeNull();
    });
});
