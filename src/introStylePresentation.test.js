import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DialogueManager, MOTHERSHIP_VERBATIM_TIMED_LINES } from './dialogue.js';

describe('Intro Style & Verbatim Timed Presentation', () => {
    let originalWindow;
    let originalDocument;

    const createMockElement = (tag = 'div') => {
        const children = [];
        const listeners = {};
        const element = {
            tagName: tag.toUpperCase(),
            children,
            classList: {
                _classes: new Set(),
                add: vi.fn((cls) => element.classList._classes.add(cls)),
                remove: vi.fn((cls) => element.classList._classes.delete(cls)),
                contains: vi.fn((cls) => element.classList._classes.has(cls))
            },
            style: {
                setProperty: vi.fn()
            },
            setAttribute: vi.fn(),
            removeAttribute: vi.fn(),
            addEventListener: vi.fn((ev, fn) => {
                listeners[ev] = listeners[ev] || [];
                listeners[ev].push(fn);
            }),
            removeEventListener: vi.fn(),
            appendChild: vi.fn((child) => {
                children.push(child);
                return child;
            }),
            replaceChildren: vi.fn(() => {
                children.length = 0;
            }),
            querySelector: vi.fn((sel) => {
                if (sel === '.mothership-line__speaker') return createMockElement('div');
                if (sel === '.mothership-line__text') return createMockElement('div');
                return null;
            }),
            querySelectorAll: vi.fn(() => []),
            focus: vi.fn(),
            click: vi.fn(() => {
                (listeners['click'] || []).forEach(fn => fn({ preventDefault: vi.fn() }));
            })
        };
        return element;
    };

    beforeEach(() => {
        originalWindow = globalThis.window;
        originalDocument = globalThis.document;

        const elements = {
            'mothership-dialogue': createMockElement('div'),
            'mothership-dialogue-panel': createMockElement('div'),
            'mothership-dialogue-body': createMockElement('div'),
            'mothership-class-badge': createMockElement('div'),
            'mothership-dialogue-choices': createMockElement('div'),
            'mothership-choice-skip': createMockElement('button'),
            'mothership-choice-tutorial': createMockElement('button'),
            'tutorial-prompt': createMockElement('div'),
            'tutorial-prompt-text': createMockElement('div'),
            'tutorial-prompt-icon': createMockElement('div'),
            'close-mothership-dialogue': createMockElement('button'),
            'mothership-dialogue-video-bg': Object.assign(createMockElement('video'), {
                play: vi.fn(async () => {}),
                pause: vi.fn(),
                currentTime: 0
            })
        };

        globalThis.window = {
            AudioManager: {
                play: vi.fn(),
                playVoiceForMessage: vi.fn(),
                isVoiceSpeaking: () => false,
                stopActiveVoice: vi.fn()
            },
            speechSynthesis: {
                cancel: vi.fn(),
                speak: vi.fn()
            },
            state: {
                settings: {
                    introStyle: 'tactical_terminal',
                    textSpeed: 'instant'
                }
            },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            clearTimeout: (id) => clearTimeout(id),
            requestAnimationFrame: (fn) => fn()
        };

        globalThis.document = {
            getElementById: vi.fn((id) => elements[id] || null),
            querySelector: vi.fn(() => null),
            querySelectorAll: vi.fn(() => []),
            createElement: vi.fn((tag) => createMockElement(tag))
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });

    it('defines verbatim lines matching mothership voiceover transcript with ~13.2s total envelope', () => {
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES.length).toBe(6);
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES[0].text).toContain("AGENT. YOU'RE ALIVE.");
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES[1].text).toContain("HYPERSONIC STRIKE");
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES[2].text).toContain("SALVAGE CONSOLE REMAINS OPERATIONAL");
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES[3].text).toContain("BANK WHAT YOU RECOVER");
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES[4].text).toContain("SYSTEM BY SYSTEM");
        expect(MOTHERSHIP_VERBATIM_TIMED_LINES[5].text).toContain("AWAITING CHOICE");

        const totalActiveMs = MOTHERSHIP_VERBATIM_TIMED_LINES.reduce((sum, line) => sum + line.targetDurationMs + line.pauseMs, 0);
        expect(totalActiveMs).toBeGreaterThanOrEqual(12500);
        expect(totalActiveMs).toBeLessThanOrEqual(14000);
    });

    it('plays tactical terminal cutscene video before presenting choices in tactical_terminal mode', async () => {
        const cutsceneSpy = vi.fn(async () => ({ played: true }));
        globalThis.window.playCutsceneVideo = cutsceneSpy;
        globalThis.window.state.settings.introStyle = 'tactical_terminal';

        const dialogue = new DialogueManager();
        dialogue.sleep = vi.fn(async () => {});

        const introPromise = dialogue.openMothershipDialogue({ playerType: 'SCOUT' });

        expect(cutsceneSpy).toHaveBeenCalledWith(
            'intro-mothership-briefing',
            expect.objectContaining({
                allowSkip: true,
                showSpeakerHeadshot: true,
                speaker: expect.objectContaining({
                    name: 'MOTHERSHIP COMMAND',
                    portrait: '/lore_portraits/survivor_00.webp'
                })
            })
        );

        // Wait until choice resolver is ready, then resolve
        await vi.waitFor(() => expect(dialogue.activeChoiceResolver).not.toBeNull());
        dialogue.resolveChoice('skip');

        const result = await introPromise;
        expect(result).toBe('skip');
    });

    it('types verbatim timed lines in timed_verbatim mode without re-triggering speech on subsequent lines', async () => {
        globalThis.window.state.settings.introStyle = 'timed_verbatim';
        globalThis.window.state.settings.textSpeed = 'instant';

        const dialogue = new DialogueManager();
        dialogue.sleep = vi.fn(async () => {});

        const introPromise = dialogue.openMothershipDialogue({ playerType: 'SCOUT' });

        await vi.waitFor(() => expect(dialogue.activeChoiceResolver).not.toBeNull());

        // Speech audio should only be triggered once on line 0 (excluding keyboard chirps)
        const speechCalls = globalThis.window.AudioManager.playVoiceForMessage.mock.calls.filter(call => !call[2]?.isChirp);
        expect(speechCalls.length).toBe(1);
        expect(speechCalls[0][1]).toContain("YOU'RE ALIVE.");

        const bgVideo = globalThis.document.getElementById('mothership-dialogue-video-bg');
        expect(bgVideo.play).toHaveBeenCalled();

        dialogue.resolveChoice('tutorial');
        const result = await introPromise;
        expect(result).toBe('tutorial');
        expect(bgVideo.pause).toHaveBeenCalled();
    });

    it('respects classic mode falling back to standard typewriter lines', async () => {
        globalThis.window.state.settings.introStyle = 'classic';
        globalThis.window.state.settings.textSpeed = 'instant';

        const dialogue = new DialogueManager();
        dialogue.sleep = vi.fn(async () => {});

        const introPromise = dialogue.openMothershipDialogue({ playerType: 'TANK' });

        await vi.waitFor(() => expect(dialogue.activeChoiceResolver).not.toBeNull());
        dialogue.resolveChoice('skip');

        const result = await introPromise;
        expect(result).toBe('skip');
    });
});
