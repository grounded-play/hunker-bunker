import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Invisible Essentials Phase 3 probe: does the results screen say why the
// operator died, what was left in the field and what to do next? Each case
// deploys, carries some salvage, dies of a named cause through takeDamage,
// and records the report. The death itself is scripted (the cause string is
// the one the game's own damage sources pass); nothing about whether a
// player understands the screen is measured here.
const LABEL = process.env.HB_PROBE_LABEL || 'probe';
const OUT = process.env.HB_PROBE_OUT || '/tmp';
const CASES = [
    { name: 'o2', reason: 'o2-depletion', carried: { weapon: 3, coin: 2, health: 0 } },
    { name: 'enemy', reason: 'cybersnail', carried: { weapon: 0, coin: 0, health: 0 } }
];

for (const deathCase of CASES) {
    test(`${LABEL} death report: ${deathCase.name}`, async ({ page }) => {
        test.setTimeout(600_000);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        const setup = await page.evaluate(({ carried }) => {
            window.restorePickupCounterState?.(carried);
            const g = window.game;
            return { inventory: g.getSessionInventory?.(), position: { x: g.player.position.x, z: g.player.position.z } };
        }, deathCase);
        // Walk the operator away from the ship so the black box distance is non-trivial.
        await page.evaluate(() => { window.game.player.position.x += 20; window.game.player.position.z += 15; });
        await page.waitForTimeout(1000);
        const killed = await page.evaluate((reason) => {
            const g = window.game;
            g.setGodMode?.(false);
            for (let hits = 0; !g.isPlayerDead && hits < 12; hits += 1) {
                g.iFrameTimer = 0;
                g.spawnInvulnerabilityTimer = 0;
                g.takeDamage(99, reason);
            }
            return { dead: g.isPlayerDead, reason: g._lastDeathReason, blackBox: g._blackBoxState };
        }, deathCase.reason);
        await page.waitForFunction(() => !document.getElementById('game-over-modal').classList.contains('hidden'), null, { timeout: 90_000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${OUT}/${LABEL}-death-${deathCase.name}-results.png` });
        const report = await page.evaluate(() => [...document.querySelectorAll('#go-expedition-report-lines li')].map((li) => li.innerText));
        fs.appendFileSync(`${OUT}/death-report-${LABEL}.jsonl`, `${JSON.stringify({ label: LABEL, case: deathCase.name, setup, killed, report })}\n`);
    });
}
