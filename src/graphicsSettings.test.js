import { describe, expect, it } from 'vitest';
import {
    DEFAULT_GRAPHICS_SETTINGS,
    GRAPHICS_OPTIONS,
    GRAPHICS_PRESETS,
    applyGraphicsPreset,
    graphicsPresetOf,
    loadGraphicsSettings,
    nextAutoGraphicsStep,
    recordAutoGraphicsStep,
    restoreAutoGraphicsChanges,
    saveGraphicsSettings,
    setGraphicsAutoAdjust,
    setGraphicsValue
} from './graphicsSettings.js';

function memoryStorage(initial = {}) {
    const data = { ...initial };
    return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); }, data };
}

describe('graphics settings defaults', () => {
    it('starts every machine at High, auto-adjust on, nothing lowered', () => {
        expect(DEFAULT_GRAPHICS_SETTINGS.values).toEqual(GRAPHICS_PRESETS.high);
        expect(DEFAULT_GRAPHICS_SETTINGS.autoAdjust).toBe(true);
        expect(DEFAULT_GRAPHICS_SETTINGS.autoChanges).toEqual([]);
        expect(graphicsPresetOf(DEFAULT_GRAPHICS_SETTINGS.values)).toBe('high');
    });

    it('offers each setting up, down and (where it can go) off', () => {
        expect(GRAPHICS_OPTIONS.resolution).toEqual(['100', '85', '70']);
        expect(GRAPHICS_OPTIONS.shadows).toEqual(['full', 'reduced', 'off']);
        expect(GRAPHICS_OPTIONS.postProcessing).toEqual(['on', 'off']);
        expect(GRAPHICS_OPTIONS.worldDetail).toEqual(['high', 'low']);
        expect(GRAPHICS_OPTIONS.landmarks).toEqual(['on', 'off']);
        expect(GRAPHICS_OPTIONS.effects).toEqual(['full', 'reduced', 'off']);
        for (const preset of Object.values(GRAPHICS_PRESETS)) {
            for (const [key, value] of Object.entries(preset)) expect(GRAPHICS_OPTIONS[key]).toContain(value);
        }
    });
});

describe('presets and manual changes', () => {
    it('reads a preset back, and Custom once a value departs from it', () => {
        expect(graphicsPresetOf(GRAPHICS_PRESETS.medium)).toBe('medium');
        expect(graphicsPresetOf({ ...GRAPHICS_PRESETS.high, landmarks: 'off' })).toBe('custom');
    });

    it('applies a preset and forgets automatic changes it overrides', () => {
        const lowered = recordAutoGraphicsStep(DEFAULT_GRAPHICS_SETTINGS, { key: 'worldDetail', from: 'high', to: 'low' }, { fps: 30, bound: 'cpu' });
        const next = applyGraphicsPreset(lowered, 'low');
        expect(next.values).toEqual(GRAPHICS_PRESETS.low);
        expect(next.autoChanges).toEqual([]);
    });

    it('a manual change wins: it clears the automatic note for that setting only', () => {
        let settings = recordAutoGraphicsStep(DEFAULT_GRAPHICS_SETTINGS, { key: 'worldDetail', from: 'high', to: 'low' }, { fps: 30, bound: 'cpu' });
        settings = recordAutoGraphicsStep(settings, { key: 'landmarks', from: 'on', to: 'off' }, { fps: 29, bound: 'cpu' });
        settings = setGraphicsValue(settings, 'worldDetail', 'high');
        expect(settings.values.worldDetail).toBe('high');
        expect(settings.autoChanges.map((change) => change.key)).toEqual(['landmarks']);
    });

    it('rejects unknown settings and values without changing anything', () => {
        expect(setGraphicsValue(DEFAULT_GRAPHICS_SETTINGS, 'shadows', 'ultra')).toBe(DEFAULT_GRAPHICS_SETTINGS);
        expect(setGraphicsValue(DEFAULT_GRAPHICS_SETTINGS, 'raytracing', 'on')).toBe(DEFAULT_GRAPHICS_SETTINGS);
        expect(applyGraphicsPreset(DEFAULT_GRAPHICS_SETTINGS, 'potato')).toBe(DEFAULT_GRAPHICS_SETTINGS);
    });

    it('turns auto-adjust on and off', () => {
        expect(setGraphicsAutoAdjust(DEFAULT_GRAPHICS_SETTINGS, false).autoAdjust).toBe(false);
    });
});

describe('automatic steps down', () => {
    it('lowers what costs the GPU first when the GPU is the bottleneck', () => {
        const steps = [];
        let values = { ...GRAPHICS_PRESETS.high };
        for (let step = nextAutoGraphicsStep(values, 'gpu'); step; step = nextAutoGraphicsStep(values, 'gpu')) {
            steps.push(`${step.key}:${step.from}->${step.to}`);
            values = { ...values, [step.key]: step.to };
        }
        expect(steps).toEqual(['resolution:100->85', 'shadows:full->reduced', 'resolution:85->70']);
    });

    it('lowers draw calls first when the main thread (CPU) is the bottleneck', () => {
        const steps = [];
        let values = { ...GRAPHICS_PRESETS.high };
        for (let step = nextAutoGraphicsStep(values, 'cpu'); step; step = nextAutoGraphicsStep(values, 'cpu')) {
            steps.push(`${step.key}:${step.from}->${step.to}`);
            values = { ...values, [step.key]: step.to };
        }
        expect(steps).toEqual(['worldDetail:high->low', 'landmarks:on->off', 'effects:full->reduced', 'shadows:full->reduced']);
    });

    it('never switches shadows or post-processing off by itself (owner: it made the game look unloaded)', () => {
        for (const bound of ['gpu', 'cpu']) {
            let values = { ...GRAPHICS_PRESETS.high };
            for (let step = nextAutoGraphicsStep(values, bound); step; step = nextAutoGraphicsStep(values, bound)) {
                if (step.key === 'shadows' || step.key === 'postProcessing') expect(step.to, step.key).not.toBe('off');
                expect(step.key).not.toBe('postProcessing');
                values = { ...values, [step.key]: step.to };
            }
            expect(values.postProcessing).toBe('on');
            expect(values.shadows).not.toBe('off');
        }
    });

    it('only ever steps down from where the player put it', () => {
        const values = { ...GRAPHICS_PRESETS.high, resolution: '70', shadows: 'off' };
        const step = nextAutoGraphicsStep(values, 'gpu');
        expect(step).toBeNull();
    });

    it('writes each step into the settings with why it happened', () => {
        const settings = recordAutoGraphicsStep(DEFAULT_GRAPHICS_SETTINGS, { key: 'resolution', from: '100', to: '85' }, {
            fps: 31.4, bound: 'gpu', area: 'cryo', at: '2026-10-11T16:04:00.000Z', seconds: 1.5
        });
        expect(settings.values.resolution).toBe('85');
        expect(settings.autoChanges).toEqual([{
            key: 'resolution', from: '100', to: '85', fps: 31, bound: 'gpu', area: 'cryo', seconds: 1.5, at: '2026-10-11T16:04:00.000Z'
        }]);
        expect(DEFAULT_GRAPHICS_SETTINGS.values.resolution).toBe('100');
    });

    it('restores everything it lowered, back to what the player had', () => {
        let settings = setGraphicsValue(DEFAULT_GRAPHICS_SETTINGS, 'effects', 'reduced');
        settings = recordAutoGraphicsStep(settings, { key: 'worldDetail', from: 'high', to: 'low' }, { fps: 30, bound: 'cpu' });
        settings = recordAutoGraphicsStep(settings, { key: 'resolution', from: '100', to: '85' }, { fps: 30, bound: 'gpu' });
        settings = recordAutoGraphicsStep(settings, { key: 'resolution', from: '85', to: '70' }, { fps: 28, bound: 'gpu' });
        const restored = restoreAutoGraphicsChanges(settings);
        expect(restored.values).toEqual({ ...GRAPHICS_PRESETS.high, effects: 'reduced' });
        expect(restored.autoChanges).toEqual([]);
    });
});

describe('persistence', () => {
    it('saves and loads, keeping only known values', () => {
        const storage = memoryStorage();
        const settings = recordAutoGraphicsStep(DEFAULT_GRAPHICS_SETTINGS, { key: 'landmarks', from: 'on', to: 'off' }, { fps: 30, bound: 'cpu' });
        saveGraphicsSettings(settings, storage);
        expect(loadGraphicsSettings(storage)).toEqual(settings);
        storage.setItem('hb_graphics', JSON.stringify({ values: { shadows: 'ultra', landmarks: 'off' }, autoAdjust: false }));
        const loaded = loadGraphicsSettings(storage);
        expect(loaded.values).toEqual({ ...GRAPHICS_PRESETS.high, landmarks: 'off' });
        expect(loaded.autoAdjust).toBe(false);
    });

    it('falls back to the defaults on missing, broken or blocked storage', () => {
        expect(loadGraphicsSettings(memoryStorage())).toEqual(DEFAULT_GRAPHICS_SETTINGS);
        expect(loadGraphicsSettings(memoryStorage({ hb_graphics: '{nope' }))).toEqual(DEFAULT_GRAPHICS_SETTINGS);
        expect(loadGraphicsSettings({ getItem: () => { throw new Error('blocked'); } })).toEqual(DEFAULT_GRAPHICS_SETTINGS);
        expect(() => saveGraphicsSettings(DEFAULT_GRAPHICS_SETTINGS, { setItem: () => { throw new Error('full'); } })).not.toThrow();
    });
});
