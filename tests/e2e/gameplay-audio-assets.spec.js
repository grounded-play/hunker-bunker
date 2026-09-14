import { test, expect } from '@playwright/test';
import { bootToTitleSplash } from './helpers.js';

test('approved footsteps and impacts decode and play through the shipped audio manager', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await bootToTitleSplash(page);
    const result = await page.evaluate(async () => {
        const { GAMEPLAY_FOLEY_MANIFEST } = await import('/src/data/gameSoundsets.js');
        const { AudioManager } = await import('/src/audio.js');
        // Exercise real fetch/decode/Web Audio, without a gameplay intro or a
        // Steam mutation. main's manifest inclusion is checked by the unit audit.
        await AudioManager.loadAssets({ images: [], audio: GAMEPLAY_FOLEY_MANIFEST });
        const started = ['footstep_concrete', 'footstep_snow', 'prop_impact_metal', 'prop_impact_glass']
            .map((key) => ({ key, started: Boolean(AudioManager.play(key, { volume: 0.1 })) }));
        return {
            buffers: GAMEPLAY_FOLEY_MANIFEST.map(({ key }) => ({ key, duration: AudioManager.buffers[key]?.duration ?? 0 })),
            started,
            missing: AudioManager.getMissingAudioDiagnostics().keys.filter(({ key }) => started.some((entry) => entry.key === key))
        };
    });
    expect(result.buffers).toHaveLength(16);
    for (const buffer of result.buffers) expect(buffer.duration, buffer.key).toBeGreaterThan(0);
    expect(result.started.every(({ started }) => started)).toBe(true);
    expect(result.missing).toEqual([]);
    expect(errors).toEqual([]);
});
