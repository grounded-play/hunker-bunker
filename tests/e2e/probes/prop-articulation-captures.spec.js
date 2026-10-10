import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Articulated props (src/propArticulation.js): spawns each rig beside the
// player, captures it at rest, presses E through the prop experience, and
// captures it open / working.
//   HB_PROBES=1 ARTIC_SHOTS_DIR=/tmp/shots npx playwright test -c <gpu config> \
//     tests/e2e/probes/prop-articulation-captures.spec.js
const RIGS = ['life_ribcage_rescue_cabinet', 'life_confessional', 'life_seismic_drill', 'life_ice_bore_winch', 'life_supply_drop_pod'];

test('articulated props: rest and active captures', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/tests/e2e/fixtures/prop-articulation-showroom.html');
    await page.waitForFunction(() => window.__articulation?.ready === true, null, { timeout: 60_000 });
    const dir = process.env.ARTIC_SHOTS_DIR;
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const placed = await page.evaluate(() => window.__articulation.states());
    console.log(JSON.stringify(placed));
    expect(placed.every((rig) => rig.parts > 0)).toBe(true);

    await page.waitForTimeout(750);
    const shoot = async (label) => {
        if (!dir) return;
        await page.screenshot({ path: path.join(dir, `${label}.png`) });
        for (const [index, type] of RIGS.entries()) {
            await page.screenshot({
                path: path.join(dir, `${label}-${type}.png`),
                clip: { x: index * 320, y: 150, width: 320, height: 600 }
            });
        }
    };
    await shoot('rest');
    // Vite may reload the fixture when another local worker writes a source
    // file; reacquire readiness before addressing its browser global.
    await page.waitForFunction(() => window.__articulation?.ready === true, null, { timeout: 60_000 });
    const pressed = await page.evaluate(() => window.__articulation.activate());
    expect(pressed.every(Boolean)).toBe(true);
    await page.waitForTimeout(1800);
    await shoot('active');
    const states = await page.evaluate(() => window.__articulation.states().map((item) => item.state));
    console.log(JSON.stringify(states));
    expect(states).toEqual(['open', 'open', 'working', 'working', 'open']);
    expect(errors).toEqual([]);
});
