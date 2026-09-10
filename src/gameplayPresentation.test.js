import { describe, expect, it, vi } from 'vitest';
import { usesGameplayFocusEffects } from './gameplayPresentation.js';
import { ThreeGame } from './threeGame.js';

describe('gameplay focus policy', () => {
    const normal = { performanceProfile: 'gameplay', cameraMode: 'isometric' };
    it('keeps the perspective camera sharp and preserves the isometric effect', () => {
        expect(usesGameplayFocusEffects(normal)).toBe(true);
        expect(usesGameplayFocusEffects({ ...normal, cameraMode: 'third-person' })).toBe(false);
    });
    it.each([
        { performanceProfile: 'menu' }, { loadingPaused: true },
        { adaptiveGameplayPerformanceMode: true }, { gameplayPostProcessingEnabled: false }
    ])('bypasses focus work when %j', (state) => {
        const game = { ...normal, ...state, renderer: { render: vi.fn() }, composer: { render: vi.fn() }, getPerformanceDiagnosticsSnapshot: () => ({}) };
        ThreeGame.prototype.renderWithPerf.call(game);
        expect(game.renderer.render).toHaveBeenCalledOnce();
        expect(game.composer.render).not.toHaveBeenCalled();
    });
});
