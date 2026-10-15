import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

// S53-02: per-frame clientWidth reads forced a layout after the HUD's DOM
// writes (~5% of the gameplay main thread). The size is cached and refreshed
// by a ResizeObserver.
describe('container size without per-frame layout reads', () => {
    afterEach(() => vi.unstubAllGlobals());

    function container(width, height) {
        let reads = 0;
        return {
            get clientWidth() { reads += 1; return width; },
            get clientHeight() { reads += 1; return height; },
            set size([w, h]) { width = w; height = h; },
            get reads() { return reads; }
        };
    }

    it('reads the container once, then serves the observed size', () => {
        let observerCallback = null;
        vi.stubGlobal('ResizeObserver', class { constructor(cb) { observerCallback = cb; } observe() {} disconnect() {} });
        const box = container(1920, 1080);
        const game = { container: box, getContainerSize: ThreeGame.prototype.getContainerSize };
        expect(game.getContainerSize()).toEqual({ width: 1920, height: 1080 });
        const after = box.reads;
        for (let i = 0; i < 100; i++) game.getContainerSize();
        expect(box.reads).toBe(after);

        box.size = [0, 0];
        observerCallback();
        expect(game.getContainerSize()).toEqual({ width: 0, height: 0 });
    });

    it('reads directly where there is no ResizeObserver', () => {
        vi.stubGlobal('ResizeObserver', undefined);
        const box = container(800, 600);
        const game = { container: box, getContainerSize: ThreeGame.prototype.getContainerSize };
        expect(game.getContainerSize()).toEqual({ width: 800, height: 600 });
    });

    it('follows a new container', () => {
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
        const game = { container: container(10, 10), getContainerSize: ThreeGame.prototype.getContainerSize };
        game.getContainerSize();
        game.container = container(20, 30);
        expect(game.getContainerSize()).toEqual({ width: 20, height: 30 });
    });
});
