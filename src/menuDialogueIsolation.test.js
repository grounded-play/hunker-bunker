import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DialogueManager } from './dialogue.js';
import { renderWandererModal } from './wandererModal.js';
import { ThreeGame } from './threeGame.js';

describe('Menu Dialogue Isolation', () => {
    let originalIsGameplayPhase;

    beforeEach(() => {
        originalIsGameplayPhase = globalThis.window?.isGameplayPhase;
    });

    afterEach(() => {
        if (typeof window !== 'undefined') {
            window.isGameplayPhase = originalIsGameplayPhase;
            document.getElementById('wanderer-encounter-modal')?.remove();
            document.getElementById('mothership-dialogue')?.remove();
        }
    });

    it('suppresses DialogueManager.openBriefTransmission when window.isGameplayPhase is false', async () => {
        if (typeof window === 'undefined') return;
        window.isGameplayPhase = () => false;

        const dm = new DialogueManager();
        const spy = vi.spyOn(dm, 'typeLine');
        await dm.openBriefTransmission({
            playerType: 'SCOUT',
            lines: ['SYSTEM: TEST TRANSMISSION']
        });

        expect(spy).not.toHaveBeenCalled();
        expect(dm.activeDialogueRunId).toBe(0);
    });

    it('suppresses DialogueManager.openO2MilestoneDialogue when window.isGameplayPhase is false', async () => {
        if (typeof window === 'undefined') return;
        window.isGameplayPhase = () => false;

        const dm = new DialogueManager();
        await dm.openO2MilestoneDialogue({
            playerType: 'SCOUT',
            goalKey: 'o2Bubble'
        });

        expect(dm.activeDialogueRunId).toBe(0);
    });

    it('suppresses DialogueManager.startTutorialSequence when window.isGameplayPhase is false', async () => {
        if (typeof window === 'undefined') return;
        window.isGameplayPhase = () => false;

        const dm = new DialogueManager();
        await dm.startTutorialSequence({ game: {} });

        expect(dm.activeTutorialRunId).toBe(0);
    });

    it('suppresses renderWandererModal when window.isGameplayPhase is false', () => {
        if (typeof window === 'undefined') return;
        window.isGameplayPhase = () => false;

        renderWandererModal({
            id: 'wnd_test',
            name: 'Rusty Mac',
            title: 'Scrap Scavenger'
        });

        expect(document.getElementById('wanderer-encounter-modal')).toBeNull();
    });

    it('suppresses ThreeGame.prototype.showBunkerLine when performanceProfile is menu', () => {
        const dispatchSpy = vi.fn();
        const fakeGame = Object.create(ThreeGame.prototype);
        fakeGame.performanceProfile = 'menu';

        const hadWindow = 'window' in globalThis;
        const originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: dispatchSpy };

        fakeGame.showBunkerLine('TEACUP SIREN: SHOULD NOT SHOW IN MENU');

        expect(dispatchSpy).not.toHaveBeenCalled();

        if (hadWindow) {
            globalThis.window = originalWindow;
        } else {
            delete globalThis.window;
        }
    });

    it('allows ThreeGame.prototype.showBunkerLine when performanceProfile is gameplay', () => {
        const dispatchSpy = vi.fn();
        const fakeGame = Object.create(ThreeGame.prototype);
        fakeGame.performanceProfile = 'gameplay';

        const hadWindow = 'window' in globalThis;
        const originalWindow = globalThis.window;
        globalThis.window = { dispatchEvent: dispatchSpy };

        fakeGame.showBunkerLine('TEACUP SIREN: ALLOWED IN GAMEPLAY');

        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        expect(dispatchSpy.mock.calls[0][0].type).toBe('bunker-line');
        expect(dispatchSpy.mock.calls[0][0].detail.text).toBe('TEACUP SIREN: ALLOWED IN GAMEPLAY');

        if (hadWindow) {
            globalThis.window = originalWindow;
        } else {
            delete globalThis.window;
        }
    });
});
