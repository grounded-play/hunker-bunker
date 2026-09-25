import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, bootToTitleSplash, startRunAndSkipIntro } from './helpers.js';

// docs/planning/hud-lower-dock-plan-2026-09-25.md Phase 0/1: HUD units, the
// hb_hud_layout flag, and the dock's keep-out and gear-slot guarantees.

test.describe('HUD layout system and lower dock spec', () => {
    test.describe.configure({ timeout: 300_000 });

    test('computes HUD units correctly across Steam Deck and Desktop viewports', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await bootToTitleSplash(page);

        // Deck (1280x800): floor 0.8px applies
        const deckU = await page.evaluate(() => {
            const div = document.createElement('div');
            div.style.width = 'calc(10 * var(--hud-u))';
            document.body.appendChild(div);
            const px = parseFloat(getComputedStyle(div).width) / 10;
            div.remove();
            return px;
        });
        expect(deckU).toBeCloseTo(0.8, 1);

        // 1080p Desktop (1920x1080): reference 1.0px applies
        await page.setViewportSize({ width: 1920, height: 1080 });
        const desktopU = await page.evaluate(() => {
            const div = document.createElement('div');
            div.style.width = 'calc(10 * var(--hud-u))';
            document.body.appendChild(div);
            const px = parseFloat(getComputedStyle(div).width) / 10;
            div.remove();
            return px;
        });
        expect(desktopU).toBeCloseTo(1.0, 1);
    });

    test('defaults to the classic layout when no flag is stored', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToTitleSplash(page);
        expect(await page.evaluate(() => document.documentElement.dataset.hudLayout)).toBe('classic');
        expect(await page.evaluate(() => window.state?.settings?.hudLayout)).toBe('classic');
    });

    test('honors hb_hud_layout toggle between classic and dock', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('hb_hud_layout', 'dock');
        });
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToTitleSplash(page);

        const datasetLayout = await page.evaluate(() => document.documentElement.dataset.hudLayout);
        expect(datasetLayout).toBe('dock');

        const stateLayout = await page.evaluate(() => window.state?.settings?.hudLayout);
        expect(stateLayout).toBe('dock');
    });

    test('keeps the dock below the player keep-out and the gear in its slot at 1080p', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('hb_hud_layout', 'dock');
        });
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        // Verify the keep-out area: center 30% width x 34% height
        const keepOut = {
            x0: 1920 * 0.35,
            x1: 1920 * 0.65,
            y0: 1080 * 0.35,
            y1: 1080 * 0.69
        };

        // The band: the three painted class housings share one bottom edge, sit
        // inside the stage and below the keep-out, and never overlap; every live
        // element sits inside its housing; the prompt lane sits above the band.
        const band = await page.evaluate(() => {
            const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, bottom: b.bottom, w: b.width, h: b.height }; };
            const housings = ['map', 'status', 'arms'].map((p) => ({ id: p, ...r(document.querySelector(`.dock-housing--${p}`)) }));
            const members = { map: ['desktop-compass'], status: ['vitals-panel', 'pickup-counter-panel'], arms: ['weapon-status-panel', 'class-ability-panel', 'radar-scan-panel'] };
            const inside = [];
            for (const [panel, ids] of Object.entries(members)) {
                for (const id of ids) inside.push({ id, panel, ...r(document.getElementById(id)) });
            }
            return { housings, inside, cls: document.documentElement.dataset.operatorClass };
        });
        expect(['scout', 'tank', 'engineer']).toContain(band.cls);
        const stage = await page.locator('#game-viewport').boundingBox();
        const hs = band.housings;
        for (const p of hs) {
            expect(p.w, p.id).toBeGreaterThan(0);
            expect(Math.abs(p.bottom - hs[0].bottom), p.id).toBeLessThan(1.5);
            expect(p.y, p.id).toBeGreaterThanOrEqual(keepOut.y1);
            expect(p.x, p.id).toBeGreaterThanOrEqual(stage.x - 1);
            expect(p.r, p.id).toBeLessThanOrEqual(stage.x + stage.width + 1);
        }
        for (let i = 0; i < hs.length; i += 1) {
            for (let j = i + 1; j < hs.length; j += 1) {
                const overlap = Math.min(hs[i].r, hs[j].r) - Math.max(hs[i].x, hs[j].x);
                expect(overlap, `${hs[i].id} overlaps ${hs[j].id}`).toBeLessThan(1.5);
            }
        }
        for (const el of band.inside) {
            const h = hs.find((p) => p.id === el.panel);
            expect(el.x, el.id).toBeGreaterThanOrEqual(h.x - 1);
            expect(el.r, el.id).toBeLessThanOrEqual(h.r + 1);
            expect(el.y, el.id).toBeGreaterThanOrEqual(h.y - 1);
            expect(el.bottom, el.id).toBeLessThanOrEqual(h.bottom + 1);
        }
        const lane = await page.evaluate(() => {
            const el = document.getElementById('loop-step-hud');
            return el && !el.classList.contains('hidden') ? el.getBoundingClientRect().bottom : null;
        });
        if (lane !== null) expect(lane).toBeLessThanOrEqual(Math.min(...hs.map((p) => p.y)) + 1);

        // The gear stays in its fixed slot: the stage's top-right corner. The
        // stage is 16:10, so at 1920x1080 it is letterboxed inside the window;
        // measure against #game-viewport, not the window.
        const stageBox = await page.locator('#game-viewport').boundingBox();
        const gearBox = await page.locator('.hud-corner-settings').boundingBox();
        expect(stageBox).not.toBeNull();
        expect(gearBox).not.toBeNull();
        if (stageBox && gearBox) {
            expect(stageBox.x + stageBox.width - (gearBox.x + gearBox.width)).toBeLessThan(80);
            expect(gearBox.y - stageBox.y).toBeLessThan(80);
        }
    });
});
