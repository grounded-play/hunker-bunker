import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// QA 2026-09-30: session captures reported 1 draw call / 1 triangle during
// gameplay. The composer calls renderer.render once per pass and three.js
// resets renderer.info at the start of each call (autoReset), so the counters
// only ever described the final fullscreen pass. They must cover the frame.
function fakeRenderer() {
    const info = {
        autoReset: true,
        render: { calls: 0, triangles: 0, frame: 0 },
        reset() { this.render.calls = 0; this.render.triangles = 0; }
    };
    return {
        info,
        render(_scene, _camera, { calls = 1, triangles = 1 } = {}) {
            if (info.autoReset) info.reset();
            info.render.calls += calls;
            info.render.triangles += triangles;
        }
    };
}

describe('frame render info', () => {
    it('counts every composer pass in the frame, not just the last', () => {
        const renderer = fakeRenderer();
        const composer = {
            render() {
                renderer.render(null, null, { calls: 120, triangles: 280000 }); // scene pass
                renderer.render(null, null, { calls: 1, triangles: 1 }); // bloom
                renderer.render(null, null, { calls: 1, triangles: 1 }); // output
            }
        };
        const game = {
            renderer, composer, scene: new THREE.Scene(), camera: null,
            performanceProfile: 'gameplay', gameplayPostProcessingEnabled: true, loadingPaused: false
        };
        ThreeGame.prototype.renderWithPerf.call(game);
        expect(renderer.info.render.calls).toBe(122);
        expect(renderer.info.render.triangles).toBe(280002);
    });

    it('starts each frame from zero and leaves autoReset as it found it', () => {
        const renderer = fakeRenderer();
        const game = {
            renderer, composer: null, scene: new THREE.Scene(), camera: null,
            performanceProfile: 'menu'
        };
        ThreeGame.prototype.renderWithPerf.call(game);
        ThreeGame.prototype.renderWithPerf.call(game);
        expect(renderer.info.render.calls).toBe(1);
        expect(renderer.info.autoReset).toBe(true);
    });
});
