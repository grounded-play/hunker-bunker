// docs/log13-gameplay-fps-plan-2026-08-20.md, root cause #2.
//
// three.js puts `outputColorSpace` and `toneMapping` in the program cache key,
// and both are resolved differently when rendering to a render target vs to
// the canvas (WebGLPrograms.js:176-186 and :212). Gameplay renders through
// EffectComposer (i.e. into a render target), so a warm-up that only calls
// renderer.compile()/renderer.render() straight to the canvas compiles a set
// of programs gameplay never uses -- and every material still stalls the first
// time it is drawn through the composer.
import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function makeHarness(profile) {
    const calls = [];
    return {
        calls,
        game: {
            performanceProfile: profile,
            camera: {},
            scene: {},
            renderer: {
                compile: () => calls.push('compile'),
                render: () => calls.push('renderer.render'),
                shadowMap: { enabled: profile === 'gameplay', needsUpdate: false }
            },
            composer: { render: () => calls.push('composer.render') },
            warmUpShaderPrograms: ThreeGame.prototype.warmUpShaderPrograms
        }
    };
}

describe('shader warm-up', () => {
    it('warms through the composer when gameplay will render through it', () => {
        const { game, calls } = makeHarness('gameplay');
        game.warmUpShaderPrograms();
        expect(calls).toContain('composer.render');
    });

    it('prewarms direct no-shadow fallback before restoring normal gameplay', () => {
        const { game, calls } = makeHarness('gameplay');
        game.renderer.compile = () => calls.push(`compile:${game.renderer.shadowMap.enabled}`);
        game.renderer.render = () => calls.push(`renderer.render:${game.renderer.shadowMap.enabled}`);
        game.composer.render = () => calls.push(`composer.render:${game.renderer.shadowMap.enabled}`);

        game.warmUpShaderPrograms();

        expect(calls).toEqual([
            'compile:false',
            'renderer.render:false',
            'compile:true',
            'composer.render:true',
            'composer.render:true'
        ]);
        expect(game.renderer.shadowMap.enabled).toBe(true);
    });

    it('primes the shadow map so the first lit frame is not a shadow rebuild', () => {
        const { game } = makeHarness('gameplay');
        game.warmUpShaderPrograms();
        expect(game.renderer.shadowMap.needsUpdate).toBe(true);
    });

    it('falls back to a direct render when there is no composer', () => {
        const { game, calls } = makeHarness('gameplay');
        game.composer = null;
        game.warmUpShaderPrograms();
        expect(calls).toContain('renderer.render');
        expect(calls).not.toContain('composer.render');
    });

    it('does not warm composer passes disabled by adaptive gameplay quality', () => {
        const { game, calls } = makeHarness('gameplay');
        game.gameplayPostProcessingEnabled = false;
        game.renderer.shadowMap.enabled = false;
        game.warmUpShaderPrograms();
        expect(calls).toContain('renderer.render');
        expect(calls).not.toContain('composer.render');
        expect(calls.filter((call) => call === 'renderer.render')).toHaveLength(1);
    });

    it('never throws when the driver rejects compile()', () => {
        const { game } = makeHarness('gameplay');
        game.renderer.compile = () => { throw new Error('context lost'); };
        expect(() => game.warmUpShaderPrograms()).not.toThrow();
    });

    it('is a no-op without a renderer or camera', () => {
        const { game, calls } = makeHarness('gameplay');
        game.camera = null;
        game.warmUpShaderPrograms();
        expect(calls).toEqual([]);
    });
});
