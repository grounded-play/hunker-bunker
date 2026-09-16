import { describe, expect, it, vi } from 'vitest';
import { usesGameplayFocusEffects } from './gameplayPresentation.js';
import { ThreeGame } from './threeGame.js';

describe('gameplay focus policy', () => {
    const normal = { performanceProfile: 'gameplay', cameraMode: 'isometric' };

    // G01: the shipped default camera is third-person (threeGame.js sets it, and
    // main.js persists it), so gating focus effects on isometric meant a
    // default-settings player never rendered through the composer at all.
    it('runs focus effects in both shipped cameras', () => {
        expect(usesGameplayFocusEffects(normal)).toBe(true);
        expect(usesGameplayFocusEffects({ ...normal, cameraMode: 'third-person' })).toBe(true);
    });

    it.each([
        { performanceProfile: 'menu' }, { loadingPaused: true },
        { gameplayPostProcessingEnabled: false }
    ])('bypasses focus work when %j', (state) => {
        const game = { ...normal, ...state, renderer: { render: vi.fn() }, composer: { render: vi.fn() }, getPerformanceDiagnosticsSnapshot: () => ({}) };
        ThreeGame.prototype.renderWithPerf.call(game);
        expect(game.renderer.render).toHaveBeenCalledOnce();
        expect(game.composer.render).not.toHaveBeenCalled();
    });

    it.each([
        { performanceProfile: 'gameplay', cameraMode: 'isometric' },
        { performanceProfile: 'gameplay', cameraMode: 'third-person' },
        { performanceProfile: 'gameplay', cameraMode: 'third-person', adaptiveGameplayPerformanceMode: true }
    ])('renders through the composer when %j', (state) => {
        const game = { ...state, renderer: { render: vi.fn() }, composer: { render: vi.fn() }, getPerformanceDiagnosticsSnapshot: () => ({}) };
        ThreeGame.prototype.renderWithPerf.call(game);
        expect(game.composer.render).toHaveBeenCalledOnce();
        expect(game.renderer.render).not.toHaveBeenCalled();
    });
});
