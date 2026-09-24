import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Owner's map rules (2026-09-24): TRY AGAIN keeps the map; MAIN MENU ends the
// run and the next one gets a new map; the campaign (story) is the same.
const OUT = process.env.HB_PROBE_OUT || '/tmp';

async function snapshot(page) {
    return page.evaluate(() => {
        const g = window.game;
        const landforms = [];
        for (let x = -2; x <= 2; x += 1) for (let z = -2; z <= 2; z += 1) {
            landforms.push(`${x},${z}:${g.getChunkLandform?.(x, z) ?? g._chunkLandformCache?.get?.(`${x},${z}`)?.landform ?? '?'}`);
        }
        return {
            runEntropy: g.runEntropy,
            campaignSeed: g._campaignWorldSeed,
            mapSeed: g._campaignMapSeed,
            expeditionIndex: g.expeditionIndex,
            layout: g.getRadialLayoutSignature?.(g.getRadialMazePlan?.())?.slice(0, 160) ?? null,
            landforms: landforms.join(' ')
        };
    });
}

async function die(page) {
    await page.evaluate(() => {
        const g = window.game;
        g.setGodMode?.(false);
        for (let hits = 0; !g.isPlayerDead && hits < 12; hits += 1) {
            g.iFrameTimer = 0;
            g.spawnInvulnerabilityTimer = 0;
            g.takeDamage(99, 'crawler');
        }
    });
    await page.waitForFunction(() => !document.getElementById('game-over-modal').classList.contains('hidden'), null, { timeout: 90_000 });
    await page.waitForTimeout(1500);
}

test('TRY AGAIN keeps the map; MAIN MENU gets a new one', async ({ page }) => {
    test.setTimeout(1_500_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    const first = await snapshot(page);
    await die(page);
    await page.locator('#game-over-try-again').click();
    await page.waitForFunction(() => window.isGameplayReady?.() === true, null, { timeout: 180_000 });
    await page.waitForTimeout(1500);
    const retry = await snapshot(page);
    await die(page);
    await page.locator('#game-over-main-menu').click();
    await page.waitForTimeout(4000);
    await startRunAndSkipIntro(page);
    const fresh = await snapshot(page);
    const result = {
        first, retry, fresh,
        retryKeptMap: retry.runEntropy === first.runEntropy && retry.layout === first.layout,
        newRunNewMap: fresh.runEntropy !== first.runEntropy && fresh.layout !== first.layout,
        sameCampaign: fresh.campaignSeed === first.campaignSeed
    };
    fs.writeFileSync(`${OUT}/run-maps.json`, JSON.stringify(result, null, 1));
    await page.screenshot({ path: `${OUT}/run-maps-fresh.png` });
});
