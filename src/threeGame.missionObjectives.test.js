import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// docs/objective-system-spec.md rollout step 2 (missions) -- ThreeGame's
// initMission/clearMission now mirror mission start/abandon into
// ObjectiveRegistry alongside the existing missionState + bespoke HUD
// events, following the established
// ThreeGame.prototype.method.call(fakeThis, ...) pattern
// (see threeGame.campQuests.test.js).

let originalWindow;
let registrySpy;

function stubWindow() {
    registrySpy = {
        trackObjective: vi.fn(),
        resolveObjective: vi.fn()
    };
    globalThis.window = {
        dispatchEvent: () => {},
        objectiveRegistry: registrySpy
    };
}

describe('initMission / clearMission ObjectiveRegistry wiring', () => {
    beforeEach(() => {
        originalWindow = globalThis.window;
        stubWindow();
    });
    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('tracks a stable mission:active objective on mission start', () => {
        const fakeThis = {};
        ThreeGame.prototype.initMission.call(fakeThis, {
            type: 'elimination',
            label: 'PURGE THE NEST',
            targetKills: 6,
            targetDepth: 0
        });

        expect(registrySpy.trackObjective).toHaveBeenCalledWith({
            id: 'mission:active',
            source: 'mission',
            label: 'PURGE THE NEST',
            current: 0,
            target: 6,
            priority: 30
        });
    });

    it('targets 1 (binary) for survey/retrieval missions with no kill count', () => {
        const fakeThis = {};
        ThreeGame.prototype.initMission.call(fakeThis, { type: 'survey', label: 'SURVEY THE DEPTHS', targetDepth: 65 });
        expect(registrySpy.trackObjective).toHaveBeenCalledWith(expect.objectContaining({ target: 1, current: 0 }));
    });

    it('resolves the mission objective as abandoned when a run clears its mission', () => {
        const fakeThis = { missionState: { type: 'elimination', status: 'active' } };
        ThreeGame.prototype.clearMission.call(fakeThis);
        expect(registrySpy.resolveObjective).toHaveBeenCalledWith('mission:active', 'abandoned');
    });

    it('a new mission overwrites rather than stacking a stale prior-run entry (stable id)', () => {
        const fakeThis = {};
        ThreeGame.prototype.initMission.call(fakeThis, { type: 'retrieval', label: 'RECOVER THE CACHE' });
        ThreeGame.prototype.initMission.call(fakeThis, { type: 'elimination', label: 'PURGE THE NEST', targetKills: 4 });

        expect(registrySpy.trackObjective).toHaveBeenCalledTimes(2);
        const ids = registrySpy.trackObjective.mock.calls.map(([detail]) => detail.id);
        expect(new Set(ids)).toEqual(new Set(['mission:active']));
    });
});
