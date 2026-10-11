import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { DEFAULT_GRAPHICS_SETTINGS, GRAPHICS_PRESETS, setGraphicsAutoAdjust, setGraphicsValue } from './graphicsSettings.js';

function call(method, game, ...args) {
    return ThreeGame.prototype[method].call(game, ...args);
}

function fakeGame(settings = DEFAULT_GRAPHICS_SETTINGS) {
    const directionalLight = new THREE.DirectionalLight();
    directionalLight.castShadow = true;
    directionalLight.shadow.intensity = 0.8;
    const chunk = new THREE.Group();
    const dressing = new THREE.Object3D();
    dressing.userData.isWallTopDressing = true;
    const landmark = new THREE.Object3D();
    landmark.userData.isChasmLandmark = true;
    const wall = new THREE.Object3D();
    wall.userData.isInstancedWallPool = true;
    chunk.add(dressing, landmark, wall);
    const game = {
        graphicsSettings: settings,
        performanceProfile: 'gameplay',
        gameplayPixelRatio: 1.2,
        adaptiveGameplayPerformanceMode: false,
        directionalLight,
        renderer: {
            pixelRatio: 1.2,
            getPixelRatio() { return this.pixelRatio; },
            setPixelRatio: vi.fn(function setPixelRatio(value) { this.pixelRatio = value; }),
            shadowMap: { enabled: true, autoUpdate: true, needsUpdate: false }
        },
        resize: vi.fn(),
        chunkMeshes: new Map([['0,0', chunk]]),
        scene: new THREE.Scene(),
        gameplayPostProcessingEnabled: true,
        _adaptiveGameplaySeconds: 40
    };
    game.gameplayTargetPixelRatio = ThreeGame.prototype.gameplayTargetPixelRatio;
    game.applyGraphicsSettings = ThreeGame.prototype.applyGraphicsSettings;
    return { game, directionalLight, dressing, landmark, wall };
}

describe('ThreeGame graphics settings', () => {
    it('renders at the chosen share of the gameplay pixel ratio', () => {
        const { game } = fakeGame(setGraphicsValue(DEFAULT_GRAPHICS_SETTINGS, 'resolution', '85'));
        expect(call('gameplayTargetPixelRatio', game)).toBeCloseTo(1.02);
        call('applyGraphicsSettings', game);
        expect(game.renderer.setPixelRatio).toHaveBeenCalledWith(expect.closeTo(1.02, 5));
    });

    it('reduces shadows to every other frame and turns them off by intensity, never by shadowMap.enabled', () => {
        const { game, directionalLight } = fakeGame(setGraphicsValue(DEFAULT_GRAPHICS_SETTINGS, 'shadows', 'reduced'));
        call('applyGraphicsSettings', game);
        expect(game.renderer.shadowMap.enabled).toBe(true);
        expect(game.renderer.shadowMap.autoUpdate).toBe(false);
        expect(game._shadowUpdateEveryOtherFrame).toBe(true);
        expect(directionalLight.shadow.intensity).toBeCloseTo(0.8);

        game.graphicsSettings = setGraphicsValue(game.graphicsSettings, 'shadows', 'off');
        call('applyGraphicsSettings', game);
        expect(game.renderer.shadowMap.enabled).toBe(true);
        expect(directionalLight.shadow.intensity).toBe(0);
        expect(game._shadowUpdateEveryOtherFrame).toBe(false);

        game.graphicsSettings = setGraphicsValue(game.graphicsSettings, 'shadows', 'full');
        call('applyGraphicsSettings', game);
        expect(game.renderer.shadowMap.autoUpdate).toBe(true);
        expect(directionalLight.shadow.intensity).toBeCloseTo(0.8);
    });

    it('applies post-processing, world detail and landmarks to what is already built', () => {
        const { game, dressing, landmark, wall } = fakeGame({
            ...DEFAULT_GRAPHICS_SETTINGS,
            values: { ...GRAPHICS_PRESETS.high, postProcessing: 'off', worldDetail: 'low', landmarks: 'off' }
        });
        call('applyGraphicsSettings', game);
        expect(game.gameplayPostProcessingEnabled).toBe(false);
        expect(dressing.visible).toBe(false);
        expect(landmark.visible).toBe(false);
        expect(wall.visible).toBe(true);
        game.graphicsSettings = DEFAULT_GRAPHICS_SETTINGS;
        call('applyGraphicsSettings', game);
        expect(dressing.visible && landmark.visible && game.gameplayPostProcessingEnabled).toBe(true);
    });

    it('lowers one setting when the game stalls, saves it and says why', () => {
        const { game } = fakeGame();
        game.saveGraphics = vi.fn();
        game.announceGraphicsChange = vi.fn();
        game.getBiomeKeyForWorldPosition = () => 'cryo';
        game.player = { position: new THREE.Vector3(70, 0, 0) };
        const step = call('autoLowerGraphics', game, { fps: 31.2, bound: 'cpu', seconds: 1.5 });
        expect(step).toEqual({ key: 'worldDetail', from: 'high', to: 'low' });
        expect(game.graphicsSettings.values.worldDetail).toBe('low');
        expect(game.graphicsSettings.autoChanges[0]).toMatchObject({ key: 'worldDetail', fps: 31, bound: 'cpu', area: 'cryo', seconds: 1.5 });
        expect(game.saveGraphics).toHaveBeenCalled();
        expect(game.announceGraphicsChange).toHaveBeenCalledWith(game.graphicsSettings.autoChanges[0]);
    });

    it('leaves everything alone when the player turned auto-adjust off', () => {
        const { game } = fakeGame(setGraphicsAutoAdjust(DEFAULT_GRAPHICS_SETTINGS, false));
        game.saveGraphics = vi.fn();
        expect(call('autoLowerGraphics', game, { fps: 20, bound: 'gpu' })).toBeNull();
        expect(game.graphicsSettings.values).toEqual(GRAPHICS_PRESETS.high);
        expect(game.saveGraphics).not.toHaveBeenCalled();
    });
});

describe('ThreeGame adaptive quality steps graphics settings down', () => {
    function stallingGame({ gpuMs, frameMs = 40 }) {
        const game = {
            performanceProfile: 'gameplay',
            adaptiveGameplayPerformanceMode: false,
            _adaptiveGameplaySeconds: 60,
            _adaptiveFrameMsAverage: frameMs,
            gpuFrameTimer: { snapshot: () => ({ supported: true, samples: 60, averageMs: gpuMs }) },
            autoLowerGraphics: vi.fn(() => ({ key: 'x' })),
            setAdaptiveGameplayPerformanceMode: vi.fn()
        };
        return game;
    }
    const stall = (game, seconds = 2) => {
        for (let t = 0; t < seconds; t += 0.04) ThreeGame.prototype.updateAdaptiveGameplayQuality.call(game, 0.04);
    };

    it('takes the CPU ladder when the GPU is mostly idle, and still acts', () => {
        const game = stallingGame({ gpuMs: 8 });
        stall(game);
        expect(game.autoLowerGraphics).toHaveBeenCalledWith(expect.objectContaining({ bound: 'cpu' }));
        expect(game.setAdaptiveGameplayPerformanceMode).not.toHaveBeenCalled();
    });

    it('takes the GPU ladder when the GPU is the bottleneck', () => {
        const game = stallingGame({ gpuMs: 36 });
        stall(game);
        expect(game.autoLowerGraphics).toHaveBeenCalledWith(expect.objectContaining({ bound: 'gpu' }));
    });

    it('waits between steps to see whether the last one helped', () => {
        const game = stallingGame({ gpuMs: 8 });
        stall(game, 4);
        expect(game.autoLowerGraphics).toHaveBeenCalledTimes(1);
    });
});
