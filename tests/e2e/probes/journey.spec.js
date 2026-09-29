import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Sprint 46 journey probe. A fresh campaign (random seed), then three
// consecutive deployments within it via death -> TRY AGAIN. At each deploy it
// records what the player meets in the first 40 s; at each death it captures
// the results screen.
const LABEL = process.env.HB_PROBE_LABEL || 'probe';
const OUT = process.env.HB_PROBE_OUT || '/tmp';

async function snapshot(page) {
    return page.evaluate(() => {
        const g = window.game;
        const p = g.player.position;
        const enemies = (g.scatterSprites ?? []).filter((s) => g.isEnemyType?.(s.userData?.type) && !s.userData?.burstTriggered && !s.userData?.isDisplayModel)
            .map((s) => ({ type: s.userData.type, d: Math.round(Math.hypot(s.position.x - p.x, s.position.z - p.z)), elite: Boolean(s.userData.isElite), arrival: Boolean(s.userData.arrivalIncident) }))
            .sort((a, b) => a.d - b.d);
        return {
            campaignSeed: g._campaignWorldSeed, expeditionIndex: g.expeditionIndex,
            condition: g.activeExpedition?.condition?.id, bounty: g.activeExpedition?.bounty?.id,
            loop: g.getLoopStep?.()?.label,
            tracked: window.objectiveRegistry?.getActiveObjectives?.()?.map?.((o) => o.label) ?? [],
            enemiesWithin25: enemies.filter((e) => e.d <= 25).length,
            nearestEnemy: enemies[0] ?? null,
            arrivalPack: enemies.filter((e) => e.arrival).map((e) => `${e.type}${e.elite ? '*' : ''}@${e.d}`)
        };
    });
}

test(`${LABEL}: fresh campaign, three consecutive deployments`, async ({ page }) => {
    test.setTimeout(2_400_000);
    const lines = [];
    const bunkerLines = [];
    page.on('console', () => {});
    await page.exposeFunction('__probeLine', (text) => bunkerLines.push(text));
    await page.addInitScript(() => {
        window.addEventListener('bunker-line', (e) => window.__probeLine?.(e.detail?.text ?? ''));
    });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    for (let deployment = 0; deployment < 3; deployment += 1) {
        await page.evaluate(() => window.game.setGodMode(true));
        const atDeploy = await snapshot(page);
        // Game time advances at most 0.05 s a frame, and this headless
        // machine renders well under 1 fps -- the 20 s arrival delay would take
        // ~10 min of wall time. The probe shortens only that delay (after the
        // at-deploy snapshot) so spawn, tracking, fight and cache are observed.
        await page.evaluate(() => { if (window.game._arrivalIncident?.state === 'pending') window.game._arrivalIncident.timer = 0.01; });
        await page.waitForFunction(() => ['active', 'done'].includes(window.game._arrivalIncident?.state) || !window.game._arrivalIncident, null, { timeout: 240_000 }).catch(() => {});
        await page.waitForTimeout(2000);
        const after24s = await snapshot(page);
        after24s.arrivalState = await page.evaluate(() => window.game._arrivalIncident?.state ?? null);
        await page.screenshot({ path: `${OUT}/${LABEL}-d${deployment}-gameplay.png` });
        const guards = await page.evaluate(() => {
            const g = window.game;
            g.setGodMode(false);
            const state = { dead: g.isPlayerDead, downed: g.isPlayerDowned, profile: g.performanceProfile, cinematicLock: g.cinematicLock, pocket: g.isInPocket, iframes: g.iFrameTimer, spawnProtect: g.spawnInvulnerabilityTimer };
            // Condition shields (Geothermal Arc) absorb a hit; repeat until down.
            state.hits = 0;
            while (!g.isPlayerDead && state.hits < 12) {
                g.iFrameTimer = 0;
                g.takeDamage(99, 'abyss');
                state.hits += 1;
            }
            state.took = Boolean(g.isPlayerDead);
            return state;
        });
        console.log('KILL ' + JSON.stringify(guards));
        await page.waitForFunction(() => !document.getElementById('game-over-modal').classList.contains('hidden'), null, { timeout: 60_000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${OUT}/${LABEL}-d${deployment}-results.png` });
        const report = await page.evaluate(() => document.getElementById('go-expedition-report')?.classList.contains('hidden') === false
            ? document.getElementById('go-expedition-report').innerText : null);
        lines.push({ deployment, atDeploy, after24s, report, radio: bunkerLines.splice(0) });
        if (deployment < 2) {
            await page.locator('#game-over-try-again').click();
            await page.waitForFunction(() => window.isGameplayReady?.() === true, null, { timeout: 180_000 });
            await page.waitForTimeout(1500);
        }
    }
    console.log('JOURNEY ' + JSON.stringify(lines));
});
