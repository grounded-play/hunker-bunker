// docs/log13-gameplay-fps-plan-2026-08-20.md, root cause #2.
//
// three.js puts `outputColorSpace` and `toneMapping` in the program cache key,
// and both are resolved differently when rendering to a render target vs to
// the canvas (WebGLPrograms.js:176-186 and :212). Gameplay renders through
// EffectComposer (i.e. into a render target), so a warm-up that only calls
// renderer.compile()/renderer.render() straight to the canvas compiles a set
// of programs gameplay never uses -- and every material still stalls the first
// time it is drawn through the composer.
import { describe, expect, it, vi } from 'vitest';
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
    it('warms through the composer when gameplay will render through it', async () => {
        const { game, calls } = makeHarness('gameplay');
        await game.warmUpShaderPrograms();
        expect(calls).toContain('composer.render');
    });

    it('prewarms direct no-shadow fallback before restoring normal gameplay', async () => {
        const { game, calls } = makeHarness('gameplay');
        game.renderer.compile = () => calls.push(`compile:${game.renderer.shadowMap.enabled}`);
        game.renderer.render = () => calls.push(`renderer.render:${game.renderer.shadowMap.enabled}`);
        game.composer.render = () => calls.push(`composer.render:${game.renderer.shadowMap.enabled}`);

        await game.warmUpShaderPrograms();

        expect(calls).toEqual([
            'compile:false',
            'renderer.render:false',
            'compile:true',
            'composer.render:true',
            'composer.render:true'
        ]);
        expect(game.renderer.shadowMap.enabled).toBe(true);
    });

    it('primes the shadow map so the first lit frame is not a shadow rebuild', async () => {
        const { game } = makeHarness('gameplay');
        await game.warmUpShaderPrograms();
        expect(game.renderer.shadowMap.needsUpdate).toBe(true);
    });

    it('falls back to a direct render when there is no composer', async () => {
        const { game, calls } = makeHarness('gameplay');
        game.composer = null;
        await game.warmUpShaderPrograms();
        expect(calls).toContain('renderer.render');
        expect(calls).not.toContain('composer.render');
    });

    it('does not warm composer passes disabled by adaptive gameplay quality', async () => {
        const { game, calls } = makeHarness('gameplay');
        game.gameplayPostProcessingEnabled = false;
        game.renderer.shadowMap.enabled = false;
        await game.warmUpShaderPrograms();
        expect(calls).toContain('renderer.render');
        expect(calls).not.toContain('composer.render');
        expect(calls.filter((call) => call === 'renderer.render')).toHaveLength(1);
    });

    it('never throws when the driver rejects compile()', async () => {
        const { game } = makeHarness('gameplay');
        game.renderer.compile = () => { throw new Error('context lost'); };
        await expect(game.warmUpShaderPrograms()).resolves.toBeUndefined();
    });

    it('is a no-op without a renderer or camera', async () => {
        const { game, calls } = makeHarness('gameplay');
        game.camera = null;
        await game.warmUpShaderPrograms();
        expect(calls).toEqual([]);
    });

    it('awaits asynchronous compilation before issuing any draw', async () => {
        const { game, calls } = makeHarness('menu');
        let complete;
        game.renderer.compileAsync = vi.fn(() => new Promise((resolve) => { complete = resolve; }));
        const warmup = game.warmUpShaderPrograms();
        await Promise.resolve();
        expect(game.renderer.compileAsync).toHaveBeenCalledOnce();
        expect(calls).toEqual([]);
        complete();
        await warmup;
        expect(calls).toEqual(['renderer.render']);
    });

    it('compiles the composer variant against its target and restores the previous target', async () => {
        const { game } = makeHarness('gameplay');
        const initialTarget = {};
        const composerTarget = {};
        let currentTarget = initialTarget;
        const targets = [];
        game.composer.readBuffer = composerTarget;
        game.renderer.getRenderTarget = () => currentTarget;
        game.renderer.setRenderTarget = (target) => { currentTarget = target; };
        game.renderer.compileAsync = vi.fn(async () => { targets.push(currentTarget); });
        await game.warmUpShaderPrograms();
        expect(targets).toEqual([null, composerTarget]);
        expect(currentTarget).toBe(initialTarget);
        expect(game.renderer.shadowMap.enabled).toBe(true);
    });

    it('restores render state even when asynchronous compilation is rejected', async () => {
        const { game, calls } = makeHarness('gameplay');
        game.renderer.compileAsync = vi.fn().mockRejectedValue(new Error('context lost'));
        await expect(game.warmUpShaderPrograms()).resolves.toBeUndefined();
        expect(calls).toContain('composer.render');
        expect(game.renderer.shadowMap.enabled).toBe(true);
    });
});
