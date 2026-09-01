import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CutsceneManager } from './cutscene.js';
import { DialogueManager } from './dialogue.js';

describe('Opening video, dialogue, and tutorial audio skip behavior', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
        originalWindow = globalThis.window;
        originalDocument = globalThis.document;

        globalThis.window = {
            AudioManager: {
                stopActiveVoice: vi.fn(),
                playVoiceForMessage: vi.fn(),
                isVoiceSpeaking: () => false,
                play: vi.fn()
            },
            speechSynthesis: {
                cancel: vi.fn(),
                speak: vi.fn()
            },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            clearTimeout: (id) => clearTimeout(id),
            setInterval: vi.fn().mockReturnValue(123),
            clearInterval: vi.fn()
        };

        globalThis.document = {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: (tag) => ({
                tagName: tag.toUpperCase(),
                classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn().mockReturnValue(false) },
                style: { setProperty: vi.fn() },
                setAttribute: vi.fn(),
                removeAttribute: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                appendChild: vi.fn(),
                append: vi.fn(),
                replaceChildren: vi.fn(),
                getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
                cloneNode: function () { return { ...this, classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn().mockReturnValue(false) }, querySelector: () => null }; }
            })
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });

    describe('CutsceneManager skip audio handling', () => {
        it('stops active voice and speech synthesis when crash cutscene is skipped', () => {
            const cutscene = new CutsceneManager({});
            cutscene.activeRunId = 1;

            cutscene.finishRun(1, true);

            expect(globalThis.window.AudioManager.stopActiveVoice).toHaveBeenCalledWith(0.08);
            expect(globalThis.window.speechSynthesis.cancel).toHaveBeenCalled();
        });
    });

    describe('DialogueManager skip and tutorial audio cancellation', () => {
        it('stops voice and speech synthesis on cancelDialogue', () => {
            const dialogue = new DialogueManager({});
            dialogue.activeDialogueRunId = 1;

            dialogue.cancelDialogue();

            expect(dialogue.activeDialogueRunId).toBe(0);
            expect(globalThis.window.AudioManager.stopActiveVoice).toHaveBeenCalledWith(0.08);
            expect(globalThis.window.speechSynthesis.cancel).toHaveBeenCalled();
        });

        it('stops voice and speech synthesis on cancelTutorial', () => {
            const dialogue = new DialogueManager({});
            dialogue.activeTutorialRunId = 1;

            dialogue.cancelTutorial();

            expect(dialogue.activeTutorialRunId).toBe(0);
            expect(globalThis.window.AudioManager.stopActiveVoice).toHaveBeenCalledWith(0.08);
            expect(globalThis.window.speechSynthesis.cancel).toHaveBeenCalled();
        });

        it('stops voice and speech synthesis when typing is skipped with Enter/Space', () => {
            const dialogue = new DialogueManager({});
            dialogue.activeDialogueRunId = 1;
            dialogue.isTyping = true;
            dialogue.completeTypingInstantly = false;

            const fakeEvent = { code: 'Space', preventDefault: vi.fn() };
            dialogue.handleDialogueKey(fakeEvent);

            expect(fakeEvent.preventDefault).toHaveBeenCalled();
            expect(dialogue.completeTypingInstantly).toBe(true);
            expect(globalThis.window.AudioManager.stopActiveVoice).toHaveBeenCalledWith(0.08);
            expect(globalThis.window.speechSynthesis.cancel).toHaveBeenCalled();
        });

        it('stops voice and speech synthesis when dialogue panel is clicked while typing', () => {
            const dialogue = new DialogueManager({});
            dialogue.activeDialogueRunId = 1;
            dialogue.isTyping = true;
            dialogue.completeTypingInstantly = false;

            dialogue.initDialogueListeners();
            dialogue.handlePanelClick();

            expect(dialogue.completeTypingInstantly).toBe(true);
            expect(globalThis.window.AudioManager.stopActiveVoice).toHaveBeenCalledWith(0.08);
            expect(globalThis.window.speechSynthesis.cancel).toHaveBeenCalled();
        });
    });
});
