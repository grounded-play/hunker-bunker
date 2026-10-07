import { test, expect } from '@playwright/test';

// Session 2026-10-06: "the night sleep isn't working, I don't see a bed, I
// can't interact with it". The cot was placed for the menu profile's showroom
// spawn, ~3,200 units from the rest trigger. Start a run, stand at the cot,
// and the prompt offers sleep and sleeping begins.
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test.describe.configure({ timeout: 300_000 });

test('bunker cot stands at the rest point and the prompt offers sleep', async ({ page }) => {
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });
    await page.waitForTimeout(4000);
    const state = await page.evaluate(() => {
        const g = window.game;
        const point = g.getBunkerRestPoint();
        const sprite = g.bunkerCotSprite;
        // Stand beside the cot.
        g.player.position.x = point.x + 0.6;
        g.player.position.z = point.z + 0.6;
        return {
            point,
            sprite: sprite && { x: sprite.position.x, z: sprite.position.z, visible: sprite.visible },
            has3d: Boolean(g.bunkerCot3d),
            spawn: g.getSpawnTile?.()
        };
    });
    
    expect(state.sprite.x).toBeCloseTo(state.point.x, 3);
    expect(state.sprite.z).toBeCloseTo(state.point.z, 3);
    expect(state.sprite.visible).toBe(true);
    await page.waitForTimeout(1500);
    const prompt = await page.evaluate(() => {
        const el = document.getElementById('console-hud-prompt');
        const g = window.game;
        return { text: el?.querySelector('.prompt-text')?.textContent, visible: el?.classList.contains('visible'),
            cot3dVisible: g.bunkerCot3d?.visible ?? null, day: g.dayState?.day,
            cot3dPos: g.bunkerCot3d ? [g.bunkerCot3d.position.x, g.bunkerCot3d.position.z] : null };
    });
    
    await page.screenshot({ path: 'playwright-report/screenshots/bunker-cot.png' });
    expect(prompt.visible).toBe(true);
    expect(prompt.text).toBeTruthy();
    const began = await page.evaluate(() => window.game.interactWithBunkerCot());
    
    await page.waitForTimeout(1500);
    expect(began).toBe(true);
});
