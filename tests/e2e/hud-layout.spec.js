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

        const dockHeaderBox = await page.locator('#ui .hud-header').boundingBox();
        expect(dockHeaderBox).not.toBeNull();
        if (dockHeaderBox) {
            // Dock header must sit safely below keep-out zone
            expect(dockHeaderBox.y).toBeGreaterThanOrEqual(keepOut.y1);
        }

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
