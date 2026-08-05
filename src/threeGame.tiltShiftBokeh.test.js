import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame - Tilt-Shift Camera & Bokeh Vignette', () => {
    it('creates bokeh particles with specified count and varied colors/properties', () => {
        const particles = ThreeGame.prototype.createBokehParticles.call({}, 20);
        expect(particles).toHaveLength(20);
        particles.forEach((p) => {
            expect(p).toHaveProperty('angle');
            expect(p).toHaveProperty('distanceRatio');
            expect(p).toHaveProperty('radius');
            expect(p).toHaveProperty('baseAlpha');
            expect(['cyan', 'amber', 'white']).toContain(p.hue);
        });
    });

    it('updates focus CSS variables and toggles active state in gameplay mode', () => {
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

        const fakeContext = {
            setTransform: () => {},
            clearRect: () => {},
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {}
        };

        const fakeCanvas = {
            width: 100,
            height: 100,
            style: {}
        };

        const fakeGame = {
            tiltShiftOverlay: fakeOverlay,
            bokehCanvas: fakeCanvas,
            bokehContext: fakeContext,
            performanceProfile: 'gameplay',
            loadingPaused: false,
            _tiltShiftFocusX: 50,
            _tiltShiftFocusY: 50,
            _tiltShiftProjectVec: new THREE.Vector3(),
            _bokehParticles: ThreeGame.prototype.createBokehParticles(10),
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
            container: { clientWidth: 800, clientHeight: 600 },
            renderer: { getPixelRatio: () => 1 }
        };
        fakeGame.camera.position.set(0, 10, 10);
        fakeGame.camera.lookAt(0, 0, 0);

        ThreeGame.prototype.updateTiltShiftAndBokeh.call(fakeGame, 0.016);

        expect(fakeOverlay._active).toBe(true);
        expect(overlayStyleMap.has('--focus-x')).toBe(true);
        expect(overlayStyleMap.has('--focus-y')).toBe(true);

        const focusX = parseFloat(overlayStyleMap.get('--focus-x'));
        const focusY = parseFloat(overlayStyleMap.get('--focus-y'));
        expect(focusX).toBeGreaterThan(0);
        expect(focusX).toBeLessThan(100);
        expect(focusY).toBeGreaterThan(0);
        expect(focusY).toBeLessThan(100);
    });

    it('clears canvas and removes active state when in menu profile', () => {
        let cleared = false;
        const fakeOverlay = {
            classList: {
                toggle: (cls, state) => {
                    fakeOverlay._active = Boolean(state);
                }
            },
            style: { setProperty: () => {} }
        };
        const fakeContext = {
            clearRect: () => {
                cleared = true;
            }
        };
        const fakeGame = {
            tiltShiftOverlay: fakeOverlay,
            bokehCanvas: { width: 100, height: 100, style: {} },
            bokehContext: fakeContext,
            performanceProfile: 'menu',
            player: { position: new THREE.Vector3(0, 0, 0) },
            camera: new THREE.PerspectiveCamera(),
            container: { clientWidth: 800, clientHeight: 600 }
        };

        ThreeGame.prototype.updateTiltShiftAndBokeh.call(fakeGame, 0.016);
        expect(fakeOverlay._active).toBe(false);
        expect(cleared).toBe(true);
    });
});
