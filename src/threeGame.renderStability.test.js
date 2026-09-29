import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// GAP-RN-09 / GAP-RN-10, from the 2026-09-23 evening Steam Deck log.
const originalWindow = globalThis.window;
afterEach(() => { globalThis.window = originalWindow; });

function profileFake() {
    return {
        performanceProfile: 'boot',
        gpuFrameTimer: { reset: vi.fn() },
        selectActiveCamera: vi.fn(),
        _flushDeferredAtlasProcessors: vi.fn(),
        setupMayorTinaEncounter: vi.fn(),
        virtualInput: {},
        defaultVisibleChunkRadius: 1,
        gameplayPixelRatio: 1,
        menuPixelRatio: 1,
        renderer: { getPixelRatio: () => 1, shadowMap: { enabled: false, autoUpdate: true } },
        resize: vi.fn(),
        resetWeaponState: vi.fn(),
        getSpawnTile: () => ({ x: 0, y: 0 }),
        clearLoadedChunksForRunReset: vi.fn(),
        resetAct2World: vi.fn()
    };
}

describe('the shadow shader key stays fixed across profile switches', () => {
    it('enables shadows with the first gameplay profile and never flips them back', () => {
        globalThis.window = {};
        const fake = profileFake();
        const history = [];
        for (const profile of ['menu', 'gameplay', 'menu', 'gameplay', 'menu']) {
            ThreeGame.prototype.setPerformanceProfile.call(fake, profile);
            history.push([fake.renderer.shadowMap.enabled, fake.renderer.shadowMap.autoUpdate]);
        }
        expect(history).toEqual([
            [false, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false]
        ]);
    });
});

describe('the world is not drawn behind the results screen', () => {
    function renderFake() {
        return {
            container: { clientWidth: 1280, clientHeight: 800 },
            renderWithPerf: vi.fn(),
            performanceProfile: 'gameplay',
            // The museum branch is the shortest path to renderFrame().
            _debugMuseumSessionActive: true,
            setWorldRenderSuspended: ThreeGame.prototype.setWorldRenderSuspended
        };
    }

    it('skips the render while suspended and resumes after', () => {
        globalThis.window = {};
        const fake = renderFake();
        const frame = () => ThreeGame.prototype.renderFrameBody.call(fake);
        fake.setWorldRenderSuspended(true);
        frame();
        expect(fake.renderWithPerf).not.toHaveBeenCalled();
        fake.setWorldRenderSuspended(false);
        frame();
        expect(fake.renderWithPerf).toHaveBeenCalled();
    });
});
