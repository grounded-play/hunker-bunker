import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame debug museum session profile', () => {
    it('renders inspection movement while skipping every live-run simulation system', () => {
        const game = {
            performanceProfile: 'gameplay',
            _debugMuseumSessionActive: true,
            lastTime: performance.now() - 16,
            hitstopTimer: 0,
            loadingPaused: false,
            updatePlayer: vi.fn(),
            updateCamera: vi.fn(),
            updateHiddenPlayerMarker: vi.fn(),
            updateVitals: vi.fn(),
            updateProjectiles: vi.fn(),
            updateScatter: vi.fn(),
            updateHazardZoneDamage: vi.fn(),
            updateBunkerDirector: vi.fn(),
            renderer: { render: vi.fn() },
            scene: {},
            camera: {}
        };

        ThreeGame.prototype.render.call(game);

        expect(game.updatePlayer).toHaveBeenCalledOnce();
        expect(game.updateCamera).toHaveBeenCalledOnce();
        expect(game.renderer.render).toHaveBeenCalledWith(game.scene, game.camera);
        expect(game.updateVitals).not.toHaveBeenCalled();
        expect(game.updateProjectiles).not.toHaveBeenCalled();
        expect(game.updateScatter).not.toHaveBeenCalled();
        expect(game.updateHazardZoneDamage).not.toHaveBeenCalled();
        expect(game.updateBunkerDirector).not.toHaveBeenCalled();
    });
});
