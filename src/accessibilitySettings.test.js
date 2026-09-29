import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    SUBTITLE_SIZES,
    SUBTITLE_BACKDROPS,
    CONTRAST_LEVELS,
    CAMERA_SHAKE_LEVELS,
    CAMERA_SHAKE_FACTORS,
    AIM_ASSIST_MODES,
    REDUCED_PRESSURE_MODES,
    SUBTITLE_SIZE_KEY,
    SUBTITLE_BACKDROP_KEY,
    CONTRAST_KEY,
    CAMERA_SHAKE_KEY,
    AIM_ASSIST_KEY,
    REDUCED_PRESSURE_KEY,
    loadAccessibilitySettings,
    applyAccessibilitySettings,
    setSubtitleSize,
    setSubtitleBackdrop,
    setContrast,
    setCameraShake,
    setAimAssist,
    setReducedPressure
} from './accessibilitySettings.js';

function fakeDoc() {
    const classes = new Set();
    const props = new Map();
    return {
        body: {
            classList: {
                add: (c) => classes.add(c),
                remove: (...cs) => cs.forEach((c) => classes.delete(c)),
                contains: (c) => classes.has(c)
            }
        },
        documentElement: {
            style: {
                setProperty: (k, v) => props.set(k, v),
                getPropertyValue: (k) => props.get(k) ?? ''
            }
        },
        _classes: classes,
        _props: props
    };
}

describe('accessibility settings', () => {
    let store;

    beforeEach(() => {
        store = {};
        vi.stubGlobal('window', {
            localStorage: {
                getItem: (k) => (k in store ? store[k] : null),
                setItem: (k, v) => { store[k] = String(v); },
                removeItem: (k) => { delete store[k]; }
            }
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    describe('loadAccessibilitySettings', () => {
        it('defaults to the least intrusive option for each control', () => {
            const s = loadAccessibilitySettings();
            expect(s.subtitleSize).toBe('medium');
            expect(s.subtitleBackdrop).toBe('dim');
            expect(s.contrast).toBe('normal');
            expect(s.cameraShake).toBe('normal');
            expect(s.cameraShakeScale).toBe(1.0);
            expect(s.aimAssist).toBe('standard');
            expect(s.reducedPressure).toBe(false);
        });

        it('reads persisted values back', () => {
            store[SUBTITLE_SIZE_KEY] = 'xlarge';
            store[SUBTITLE_BACKDROP_KEY] = 'solid';
            store[CONTRAST_KEY] = 'max';
            store[CAMERA_SHAKE_KEY] = 'reduced';
            store[AIM_ASSIST_KEY] = 'low';
            store[REDUCED_PRESSURE_KEY] = 'true';
            expect(loadAccessibilitySettings()).toEqual({
                subtitleSize: 'xlarge',
                subtitleBackdrop: 'solid',
                contrast: 'max',
                cameraShake: 'reduced',
                cameraShakeScale: 0.5,
                aimAssist: 'low',
                reducedPressure: true
            });
        });

        it('falls back to defaults for values not in the allowed set', () => {
            store[SUBTITLE_SIZE_KEY] = 'enormous';
            store[CONTRAST_KEY] = '../../etc';
            store[CAMERA_SHAKE_KEY] = 'wild';
            store[AIM_ASSIST_KEY] = 'auto-aimbot';
            const s = loadAccessibilitySettings();
            expect(s.subtitleSize).toBe('medium');
            expect(s.contrast).toBe('normal');
            expect(s.cameraShake).toBe('normal');
            expect(s.cameraShakeScale).toBe(1.0);
            expect(s.aimAssist).toBe('standard');
            expect(s.reducedPressure).toBe(false);
        });

        it('survives storage being unavailable', () => {
            vi.stubGlobal('window', {
                get localStorage() { throw new Error('blocked'); }
            });
            expect(() => loadAccessibilitySettings()).not.toThrow();
            expect(loadAccessibilitySettings().subtitleSize).toBe('medium');
        });
    });

    describe('applyAccessibilitySettings', () => {
        it('drives subtitle size, backdrop, and camera shake scale through CSS custom properties', () => {
            const doc = fakeDoc();
            applyAccessibilitySettings({
                subtitleSize: 'xlarge',
                subtitleBackdrop: 'solid',
                contrast: 'normal',
                cameraShake: 'reduced',
                cameraShakeScale: 0.5
            }, doc);
            expect(doc._props.get('--hb-subtitle-scale')).toBeTruthy();
            expect(doc._props.get('--hb-subtitle-backdrop')).toBeTruthy();
            expect(doc._props.get('--hb-camera-shake-scale')).toBe('0.5');
        });

        it('scales camera shake scale correctly from off to normal', () => {
            const doc = fakeDoc();
            applyAccessibilitySettings({ cameraShake: 'off' }, doc);
            expect(doc._props.get('--hb-camera-shake-scale')).toBe('0');

            applyAccessibilitySettings({ cameraShake: 'low' }, doc);
            expect(doc._props.get('--hb-camera-shake-scale')).toBe('0.25');

            applyAccessibilitySettings({ cameraShake: 'reduced' }, doc);
            expect(doc._props.get('--hb-camera-shake-scale')).toBe('0.5');

            applyAccessibilitySettings({ cameraShake: 'normal' }, doc);
            expect(doc._props.get('--hb-camera-shake-scale')).toBe('1');
        });

        it('scales monotonically from small to extra large', () => {
            const scaleFor = (size) => {
                const doc = fakeDoc();
                applyAccessibilitySettings({ ...loadAccessibilitySettings(), subtitleSize: size }, doc);
                return parseFloat(doc._props.get('--hb-subtitle-scale'));
            };
            const scales = SUBTITLE_SIZES.map(scaleFor);
            for (let i = 1; i < scales.length; i++) {
                expect(scales[i]).toBeGreaterThan(scales[i - 1]);
            }
        });

        it('makes the backdrop fully transparent only when set to off', () => {
            const doc = fakeDoc();
            applyAccessibilitySettings({ ...loadAccessibilitySettings(), subtitleBackdrop: 'off' }, doc);
            expect(doc._props.get('--hb-subtitle-backdrop')).toBe('transparent');
        });

        it('applies exactly one contrast class at a time', () => {
            const doc = fakeDoc();
            applyAccessibilitySettings({ ...loadAccessibilitySettings(), contrast: 'high' }, doc);
            expect(doc._classes.has('contrast-high')).toBe(true);
            // Switching must clear the previous level, not stack them.
            applyAccessibilitySettings({ ...loadAccessibilitySettings(), contrast: 'max' }, doc);
            expect(doc._classes.has('contrast-high')).toBe(false);
            expect(doc._classes.has('contrast-max')).toBe(true);
            applyAccessibilitySettings({ ...loadAccessibilitySettings(), contrast: 'normal' }, doc);
            expect(doc._classes.has('contrast-high')).toBe(false);
            expect(doc._classes.has('contrast-max')).toBe(false);
        });

        it('is a safe no-op without a document', () => {
            expect(() => applyAccessibilitySettings(loadAccessibilitySettings(), null)).not.toThrow();
        });
    });

    describe('setters', () => {
        it('persist and return the normalized value', () => {
            const doc = fakeDoc();
            expect(setSubtitleSize('large', doc)).toBe('large');
            expect(store[SUBTITLE_SIZE_KEY]).toBe('large');
            expect(setSubtitleBackdrop('off', doc)).toBe('off');
            expect(store[SUBTITLE_BACKDROP_KEY]).toBe('off');
            expect(setContrast('max', doc)).toBe('max');
            expect(store[CONTRAST_KEY]).toBe('max');
            expect(setCameraShake('reduced', doc)).toBe('reduced');
            expect(store[CAMERA_SHAKE_KEY]).toBe('reduced');
            expect(setAimAssist('low', doc)).toBe('low');
            expect(store[AIM_ASSIST_KEY]).toBe('low');
            expect(setReducedPressure(true, doc)).toBe(true);
            expect(store[REDUCED_PRESSURE_KEY]).toBe('true');
        });

        it('reject junk without persisting it', () => {
            const doc = fakeDoc();
            expect(setContrast('nonsense', doc)).toBe('normal');
            expect(store[CONTRAST_KEY]).toBe('normal');
            expect(setCameraShake('extreme', doc)).toBe('normal');
            expect(store[CAMERA_SHAKE_KEY]).toBe('normal');
            expect(setAimAssist('broken', doc)).toBe('standard');
            expect(store[AIM_ASSIST_KEY]).toBe('standard');
        });

        it('apply immediately so the change is visible without reopening Settings', () => {
            const doc = fakeDoc();
            setContrast('high', doc);
            expect(doc._classes.has('contrast-high')).toBe(true);
            setCameraShake('off', doc);
            expect(doc._props.get('--hb-camera-shake-scale')).toBe('0');
        });
    });

    it('exposes option lists that match what the Settings selects offer', () => {
        expect(SUBTITLE_SIZES).toEqual(['small', 'medium', 'large', 'xlarge']);
        expect(SUBTITLE_BACKDROPS).toEqual(['off', 'dim', 'solid']);
        expect(CONTRAST_LEVELS).toEqual(['normal', 'high', 'max']);
        expect(CAMERA_SHAKE_LEVELS).toEqual(['off', 'low', 'reduced', 'normal']);
        expect(CAMERA_SHAKE_FACTORS).toEqual({ off: 0.0, low: 0.25, reduced: 0.5, normal: 1.0 });
        expect(AIM_ASSIST_MODES).toEqual(['off', 'low', 'standard']);
        expect(REDUCED_PRESSURE_MODES).toEqual(['off', 'on']);
    });
});
