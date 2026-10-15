import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lighthouse on PR #110 fell from 0.96 to 0.49 (TBT 41 -> ~800 ms, 934 KB
// -> 35.6 MB): a hidden dialogue <video preload="auto"> pulled the 22 MB
// briefing film at boot, and the title screen built the 3D hero preview
// (about 12 MB of GLBs parsed on the main thread) before anyone opened it.
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

describe('boot payload', () => {
    it('never preloads a video in the page markup; videos load when they play', () => {
        const eager = [...index.matchAll(/<video\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => /preload="auto"/.test(tag));
        expect(eager).toEqual([]);
    });

    it('labels the class at boot without building the 3D hero preview', () => {
        expect(main).toContain('syncHeroPreview(initialType, { loadPreview: false })');
        expect(main).toMatch(/scoutHeroPreview \?\? \(loadPreview \? await ensureScoutHeroPreview\(\) : null\)/);
    });
});
