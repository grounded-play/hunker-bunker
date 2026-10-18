import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lighthouse on PR #110 fell from 0.96 to 0.49 (TBT 41 -> ~800 ms, 934 KB
// -> 35.6 MB): a hidden dialogue <video preload="auto"> pulled the 22 MB
// briefing film at boot, and the title screen built the 3D hero preview
// (about 12 MB of GLBs parsed on the main thread) before anyone opened it.
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const boot = readFileSync(new URL('./boot.js', import.meta.url), 'utf8');

describe('boot payload', () => {
    it('keeps web fonts non-blocking and paints a critical loading shell inline', () => {
        expect(index).toMatch(/fonts\.googleapis\.com[^>]+media="print"[^>]+onload="this\.media='all'"/);
        expect(index).toContain('rel="preconnect" href="https://fonts.gstatic.com" crossorigin');
        expect(index).toMatch(/<style id="critical-loading-css">[\s\S]*#loading-screen/);
        const appStyles = [...index.matchAll(/<link rel="stylesheet"[^>]+data-app-style[^>]*>/g)].map(([tag]) => tag);
        expect(appStyles.length).toBeGreaterThan(5);
        expect(appStyles.every((tag) => tag.includes('media="print"'))).toBe(true);
        expect(index).toMatch(/critical-loading-css[\s\S]*#splash\{/);
        expect(index).toContain('href="/title_key_art_v2.webp" fetchpriority="high" media="(min-width: 769px)"');
        expect(index).toContain('href="/menu_bg.webp" fetchpriority="high" media="(max-width: 768px)"');
    });

    it('never preloads a video in the page markup; videos load when they play', () => {
        const eager = [...index.matchAll(/<video\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => /preload="auto"/.test(tag));
        expect(eager).toEqual([]);
    });

    it('labels the class at boot without building the 3D hero preview', () => {
        expect(main).toContain('syncHeroPreview(initialType, { loadPreview: false })');
        expect(main).toMatch(/scoutHeroPreview \?\? \(loadPreview \? await ensureScoutHeroPreview\(\) : null\)/);
    });

    it('defers full walk sheets until the selected operator deploys', () => {
        const coreManifest = main.match(/const manifest = \{[\s\S]*?manifest\.images = Array\.from/)?.[0] ?? '';
        expect(coreManifest).not.toContain('PLAYER_SPRITE_LAYOUTS.SCOUT.path');
        expect(coreManifest).not.toContain('PLAYER_SPRITE_LAYOUTS.TANK.path');
        expect(coreManifest).not.toContain('PLAYER_SPRITE_LAYOUTS.ENGINEER.path');
        expect(main).toContain('playerTextures?.[targetType]?.userData?.loadSource?.()');
    });

    it('keeps the first-paint probe out of the full game boot graph', () => {
        expect(boot).toContain('if (lighthouseProbe)');
        expect(boot).toContain("await import('../main.js')");
        expect(boot).not.toMatch(/^import .*main\.js/m);
        expect(boot).not.toMatch(/^import .*i18n\.js/m);
    });
});
