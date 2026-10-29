import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, stubOfflineElectronAPI } from '../helpers.js';

// S53-03 (docs/planning/sprint-53-plan-2026-10-15.md): switching class must
// put the new operator on the Armory bench. The owner's Deck route was
// Scout -> ENTER ARMORY -> RETURN TO MAIN MENU -> Tank -> ENTER ARMORY, and
// the bench showed the Scout holding the Tank's gun: a weapon refresh
// reloaded the class still on screen and cancelled the newer Tank load.
// This walks that route for every ordered pair of classes.
//
//   HB_PROBES=1 npx playwright test tests/e2e/probes/class-swap.spec.js
const OUT = process.env.HB_PROBE_OUT || 'test-results/class-swap';
const CLASSES = ['SCOUT', 'TANK', 'ENGINEER'];

test('the Armory shows the class just picked, after any switch', async ({ page }) => {
    test.skip(!process.env.HB_PROBES, 'HB_PROBES=1');
    test.setTimeout(900_000);
    fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);

    const benchClass = () => page.evaluate(() => window.armoryScene?.getOperatorClass?.() ?? null);
    const pick = async (cls) => {
        await page.locator(`.char-card[data-type="${cls}"]`).click();
        await page.waitForTimeout(2500);
    };
    const enterArmory = async (expected) => {
        await page.locator('#start-game').click();
        await page.locator('#armory-btn-back').waitFor({ state: 'visible', timeout: 30_000 });
        // Let every queued load (class, weapon, charm) finish.
        await page.waitForFunction((want) => {
            const c = window.armoryScene?.getOperatorClass?.();
            return c && c.shown === c.requested && c.requested === want;
        }, expected, { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(1500);
        return benchClass();
    };
    const leaveArmory = async () => {
        await page.locator('#armory-btn-back').click();
        await page.locator('#start-game').waitFor({ state: 'visible', timeout: 30_000 });
        await page.waitForTimeout(1500);
    };

    const results = [];
    for (const from of CLASSES) {
        for (const to of CLASSES) {
            if (from === to) continue;
            await pick(from);
            await enterArmory(from);
            await leaveArmory();
            await pick(to);
            const bench = await enterArmory(to);
            await page.screenshot({ path: `${OUT}/${from}-to-${to}.png` });
            results.push({ from, to, bench });
            await leaveArmory();
        }
    }
    fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
    for (const { from, to, bench } of results) {
        expect(bench?.shown, `${from} -> ${to}: bench shows ${bench?.shown}`).toBe(to);
    }
});
