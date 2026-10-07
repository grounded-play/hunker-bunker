import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Sprint 53 V6: rooms hold sealed mystery boxes. Stand at one, press
// interact, wait out the opening, get the roll.
test.describe.configure({ timeout: 300_000 });

test('a mystery box sits in a room and opens when you stand at it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    // Walk the camera out until some chunk with a box has mounted.
    const found = await page.evaluate(async () => {
        const game = window.game;
        for (let ring = 1; ring <= 6; ring++) {
            for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) {
                const box = (game.mysteryBoxes ?? []).find((b) => !b.opened && b.kind !== 'blacksite' && b.sprite?.parent);
                if (box) return { id: box.id, kind: box.kind, x: box.sprite.position.x, z: box.sprite.position.z };
                game.player.position.set(dx * ring * game.chunkSize, 0, dz * ring * game.chunkSize);
                game.syncVisibleChunks?.();
                await new Promise((resolve) => setTimeout(resolve, 400));
            }
        }
        return null;
    });
    expect(found).not.toBeNull();
    await page.evaluate(({ x, z }) => {
        window.game.player.position.set(x + 0.4, 0, z + 0.4);
        window.game.syncVisibleChunks?.();
    }, found);
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'playwright-report/screenshots/mystery-box-sealed.png' });
    const started = await page.evaluate(() => window.game.interactWithMysteryBox());
    expect(started).toBe(true);
    await page.waitForTimeout(600);
    await expect(page.locator('#foundry-hud-prompt')).toContainText(/OPENING/i);
    await page.screenshot({ path: 'playwright-report/screenshots/mystery-box-opening.png' });
    await expect.poll(() => page.evaluate((id) => window.game.openedMysteryBoxes?.has(id) ?? false, found.id), { timeout: 8000 }).toBe(true);
    const outcome = await page.evaluate((id) => window.game.mysteryBoxes.find((b) => b.id === id)?.outcome, found.id);
    expect(['supplies', 'salvage', 'lore', 'ambush', 'hazard', 'quest_hook']).toContain(outcome);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playwright-report/screenshots/mystery-box-opened.png' });
});
