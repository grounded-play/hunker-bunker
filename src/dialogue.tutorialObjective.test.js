import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogueManager } from './dialogue.js';

// docs/objective-system-spec.md rollout step 6 (tutorial, last step). Tests
// the two clean, isolated seams -- _trackTutorialProgress and
// cancelTutorial's registry resolution -- rather than the full
// startTutorialSequence (11 DOM/timer-heavy async steps not worth mocking
// wholesale for what's a straightforward, already-proven registry call).

let originalWindow;
let originalDocument;
let registrySpy;

function stubGlobals() {
    registrySpy = { trackObjective: vi.fn(), resolveObjective: vi.fn() };
    globalThis.window = { objectiveRegistry: registrySpy };
    globalThis.document = {
        querySelectorAll: () => [],
        getElementById: () => null,
        querySelector: () => null
    };
}

describe('DialogueManager tutorial ObjectiveRegistry wiring', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        originalDocument = globalThis.document;
        stubGlobals();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });

    it('reports step count matching the number of tutorial steps', () => {
        expect(DialogueManager.TUTORIAL_STEP_COUNT).toBe(11);
    });

    it('_trackTutorialProgress updates the stable tutorial:onboarding objective', () => {
        const fakeThis = {};
        DialogueManager.prototype._trackTutorialProgress.call(fakeThis, 4);

        expect(registrySpy.trackObjective).toHaveBeenCalledWith({
            id: 'tutorial:onboarding',
            current: 4,
            target: 11
        });
    });

    it('cancelTutorial resolves the objective as abandoned when a run is actually active', () => {
        const fakeThis = {
            activeTutorialRunId: 7,
            hideTutorialPrompt: vi.fn()
        };
        DialogueManager.prototype.cancelTutorial.call(fakeThis);

        expect(registrySpy.resolveObjective).toHaveBeenCalledWith('tutorial:onboarding', 'abandoned');
        expect(fakeThis.activeTutorialRunId).toBe(0);
    });

    it('cancelTutorial is a no-op (does not touch the registry) when no run is active', () => {
        const fakeThis = { activeTutorialRunId: 0, hideTutorialPrompt: vi.fn() };
        DialogueManager.prototype.cancelTutorial.call(fakeThis);

        expect(registrySpy.resolveObjective).not.toHaveBeenCalled();
        expect(fakeThis.hideTutorialPrompt).not.toHaveBeenCalled();
    });
});
