import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame, TiltShiftPassShader } from './threeGame.js';

describe('ThreeGame - WebGL Camera Tilt-Shift Shader Pass', () => {
    it('defines TiltShiftPassShader with focusY and blur direction uniforms', () => {
        expect(TiltShiftPassShader).toBeDefined();
        expect(TiltShiftPassShader.uniforms).toHaveProperty('focusY');
        expect(TiltShiftPassShader.uniforms).toHaveProperty('focusRange');
        expect(TiltShiftPassShader.uniforms).toHaveProperty('blurAmount');
        expect(TiltShiftPassShader.uniforms).toHaveProperty('dir');
    });

    it('updates focus CSS variables and shader uniforms in gameplay mode', () => {
        const overlayStyleMap = new Map();
        const fakeOverlay = {
            classList: {
                toggle: (cls, state) => {
                    fakeOverlay._active = Boolean(state);
                }
            },
            style: {
                setProperty: (key, val) => overlayStyleMap.set(key, val)
            }
        };

        const fakePassV = { uniforms: { focusY: { value: 0.5 } } };
        const fakePassH = { uniforms: { focusY: { value: 0.5 } } };

        const fakeGame = {
            tiltShiftOverlay: fakeOverlay,
            tiltShiftPassV: fakePassV,
            tiltShiftPassH: fakePassH,
            performanceProfile: 'gameplay',
            loadingPaused: false,
            _tiltShiftFocusX: 50,
            _tiltShiftFocusY: 50,
            _tiltShiftProjectVec: new THREE.Vector3(),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
            container: { clientWidth: 800, clientHeight: 600 }
        };
        fakeGame.camera.position.set(0, 10, 10);
        fakeGame.camera.lookAt(0, 0, 0);

        ThreeGame.prototype.updateTiltShiftAndBokeh.call(fakeGame, 0.016);

        expect(fakeOverlay._active).toBe(true);
        expect(overlayStyleMap.has('--focus-x')).toBe(true);
        expect(overlayStyleMap.has('--focus-y')).toBe(true);

        expect(fakePassV.uniforms.focusY.value).toBeGreaterThan(0.05);
        expect(fakePassV.uniforms.focusY.value).toBeLessThan(0.95);
        expect(fakePassH.uniforms.focusY.value).toEqual(fakePassV.uniforms.focusY.value);
    });

    it('removes active overlay state when in menu profile', () => {
        const fakeOverlay = {
            classList: {
                toggle: (cls, state) => {
                    fakeOverlay._active = Boolean(state);
                }
            },
            style: { setProperty: () => {} }
        };
        const fakeGame = {
            tiltShiftOverlay: fakeOverlay,
            performanceProfile: 'menu',
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera(),
            container: { clientWidth: 800, clientHeight: 600 }
        };

        ThreeGame.prototype.updateTiltShiftAndBokeh.call(fakeGame, 0.016);
        expect(fakeOverlay._active).toBe(false);
    });

    it('removes active overlay state in adaptive gameplay mode', () => {
        const fakeOverlay = {
            classList: {
                toggle: (cls, state) => {
                    fakeOverlay._active = Boolean(state);
                }
            },
            style: { setProperty: () => {} }
        };
        const fakeGame = {
            tiltShiftOverlay: fakeOverlay,
            performanceProfile: 'gameplay',
            loadingPaused: false,
            adaptiveGameplayPerformanceMode: true,
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera()
        };

        ThreeGame.prototype.updateTiltShiftAndBokeh.call(fakeGame, 0.016);
        expect(fakeOverlay._active).toBe(false);
    });
});
