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

        // Native 4K keeps the 1080p physical proportion instead of stopping at
        // the former 1.3 cap, which made the PC playtest HUD illegible.
        await page.setViewportSize({ width: 3840, height: 2160 });
        const fourKU = await page.evaluate(() => {
            const div = document.createElement('div');
            div.style.width = 'calc(10 * var(--hud-u))';
            document.body.appendChild(div);
            const px = parseFloat(getComputedStyle(div).width) / 10;
            div.remove();
            return px;
        });
        expect(fourKU).toBeCloseTo(2.0, 1);
    });

    test('defaults to the dock layout when no flag is stored', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToTitleSplash(page);
        expect(await page.evaluate(() => document.documentElement.dataset.hudLayout)).toBe('dock');
        expect(await page.evaluate(() => window.state?.settings?.hudLayout)).toBe('dock');
    });

    test('honors hb_hud_layout toggle between dock and classic', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('hb_hud_layout', 'classic');
        });
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToTitleSplash(page);

        const datasetLayout = await page.evaluate(() => document.documentElement.dataset.hudLayout);
        expect(datasetLayout).toBe('classic');

        const stateLayout = await page.evaluate(() => window.state?.settings?.hudLayout);
        expect(stateLayout).toBe('classic');
    });

    test('keeps the dock below the player keep-out and the gear in its slot at 1080p', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('hb_hud_layout', 'dock');
        });
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        // A cold Vite boot can finish dependency optimization after gameplay
        // first appears and reload back to the title. Restore the run before
        // taking geometry measurements instead of auditing an empty shell.
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const gameplayHudReady = await page.evaluate(() => (
                ['scout', 'tank', 'engineer'].includes(document.documentElement.dataset.operatorClass)
                && !document.getElementById('ui')?.classList.contains('hidden')
            )).catch(() => false);
            if (gameplayHudReady) break;
            await bootToOperatorMenu(page);
            await startRunAndSkipIntro(page);
        }

        // Verify the keep-out area: center 30% width x 34% height
        const keepOut = {
            x0: 1920 * 0.35,
            x1: 1920 * 0.65,
            y0: 1080 * 0.35,
            y1: 1080 * 0.69
        };

        const stage = await page.locator('#game-viewport').boundingBox();
        expect(stage).not.toBeNull();

        // One unified lower console housing
        const consoleData = await page.evaluate(() => {
            const r = (el) => {
                if (!el) return null;
                const b = el.getBoundingClientRect();
                return { x: b.x, y: b.y, r: b.right, bottom: b.bottom, w: b.width, h: b.height };
            };
            const consoleEl = document.getElementById('hud-console');
            const slots = {
                map: r(document.querySelector('.hud-console__map-slot')),
                suit: r(document.querySelector('.hud-console__suit-slot')),
                mission: r(document.querySelector('.hud-console__mission-slot'))
            };
            const members = {
                map: ['desktop-compass'],
                suit: ['vitals-panel', 'ship-status-panel', 'pickup-counter-panel', 'weapon-status-panel'],
                mission: ['objective-drawer', 'class-ability-panel', 'radar-scan-panel']
            };
            const inside = [];
            for (const [panel, ids] of Object.entries(members)) {
                for (const id of ids) {
                    const el = document.getElementById(id) ?? document.querySelector(`.${id}`);
                    inside.push({ id, panel, rect: r(el) });
                }
            }
            return {
                console: r(consoleEl),
                slots,
                inside,
                cls: document.documentElement.dataset.operatorClass
            };
        });

        expect(['scout', 'tank', 'engineer']).toContain(consoleData.cls);
        const c = consoleData.console;
        expect(c).not.toBeNull();
        expect(c.w).toBeGreaterThan(0);
        expect(c.h).toBeGreaterThan(0);
        // Console sits inside the stage and below the keep-out
        expect(c.y).toBeGreaterThanOrEqual(keepOut.y1);
        expect(c.x).toBeGreaterThanOrEqual(stage.x - 2);
        expect(c.r).toBeLessThanOrEqual(stage.x + stage.width + 2);

        // All instruments sit inside the unified console bounds
        for (const el of consoleData.inside) {
            expect(el.rect, el.id).not.toBeNull();
            expect(el.rect.x, el.id).toBeGreaterThanOrEqual(c.x - 2);
            expect(el.rect.r, el.id).toBeLessThanOrEqual(c.r + 2);
            expect(el.rect.y, el.id).toBeGreaterThanOrEqual(c.y - 2);
            expect(el.rect.bottom, el.id).toBeLessThanOrEqual(c.bottom + 2);

            const slot = consoleData.slots[el.panel];
            expect(el.rect.x, `${el.id} left edge`).toBeGreaterThanOrEqual(slot.x - 2);
            expect(el.rect.r, `${el.id} right edge`).toBeLessThanOrEqual(slot.r + 2);
            expect(el.rect.y, `${el.id} top edge`).toBeGreaterThanOrEqual(slot.y - 2);
            expect(el.rect.bottom, `${el.id} bottom edge`).toBeLessThanOrEqual(slot.bottom + 2);
        }


        expect(consoleData.slots.map.w / c.w, 'map receives a useful share of the console').toBeGreaterThanOrEqual(0.28);

        // Prompt lane sits above the console and does not overlap keep-out
        const lane = await page.evaluate(() => {
            const el = document.getElementById('loop-step-hud') ?? document.querySelector('.hud-mission-stack');
            return el && !el.classList.contains('hidden') ? el.getBoundingClientRect().bottom : null;
        });
        if (lane !== null) expect(lane).toBeLessThanOrEqual(c.y + 1);

        // The gear is consolidated inside the console's mission slot
        const gearBox = await page.locator('.hud-console__mission-slot .hud-corner-settings').boundingBox();
        expect(gearBox).not.toBeNull();
        if (gearBox) {
            expect(gearBox.x).toBeGreaterThanOrEqual(c.x);
            expect(gearBox.y).toBeGreaterThanOrEqual(c.y);
            expect(gearBox.y + gearBox.height).toBeLessThanOrEqual(c.bottom + 2);
        }

        // Overlay rail attached above the console
        const overlays = await page.evaluate(() => {
            const ov = document.getElementById('hud-console-overlays');
            if (!ov) return null;
            const b = ov.getBoundingClientRect();
            return { x: b.x, y: b.y, bottom: b.bottom, w: b.width, h: b.height };
        });
        if (overlays) {
            expect(overlays.bottom).toBeLessThanOrEqual(c.y + 1);
        }

        await page.screenshot({ path: 'playwright-report/screenshots/hud-console-1080p.png' }).catch(() => {});

        // Steam Deck test
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(150);
        const deckConsole = await page.evaluate(() => {
            const box = (selector) => {
                const rect = document.querySelector(selector)?.getBoundingClientRect();
                return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width } : null;
            };
            const cBox = box('#hud-console');
            const prompt = box('.hud-mission-stack') ?? box('#loop-step-hud');
            return {
                console: cBox,
                promptOverlapsConsole: prompt && cBox ? (prompt.top < cBox.bottom && prompt.bottom > cBox.top) : false
            };
        });
        expect(deckConsole.console.width).toBeGreaterThan(0);
        expect(deckConsole.promptOverlapsConsole).toBe(false);

        await page.screenshot({ path: 'playwright-report/screenshots/hud-console-deck-800p.png' }).catch(() => {});
    });
});
