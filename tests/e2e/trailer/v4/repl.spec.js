import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootForCapture, captureShot, shotApi } from './capture.js';

// Dev aid for writing shot recipes: boots once, then runs every
// trailer/raw/repl/<n>.mjs dropped in (default export: async (api, ctx) => any)
// and writes <n>.out.json. A `stop` file ends the session.
//   TRAILER_REPL_CLASS=SCOUT npx playwright test -c tests/e2e/trailer/v4/playwright.config.js repl
const DIR = 'trailer/raw/repl';

test('trailer repl', async ({ page }) => {
    test.skip(!process.env.TRAILER_REPL, 'set TRAILER_REPL=1');
    fs.mkdirSync(DIR, { recursive: true });
    for (const f of fs.readdirSync(DIR)) fs.rmSync(path.join(DIR, f), { force: true, recursive: true });
    const boot = await bootForCapture(page, {
        playerClass: process.env.TRAILER_REPL_CLASS ?? null,
        chassisSkin: process.env.TRAILER_REPL_SKIN ?? null,
        archetype: process.env.TRAILER_REPL_ARCHETYPE ?? null,
        weaponSkin: process.env.TRAILER_REPL_WEAPON_SKIN ?? null
    });
    fs.writeFileSync(path.join(DIR, 'boot.json'), JSON.stringify(boot ?? null));
    const api = shotApi(page);
    fs.writeFileSync(path.join(DIR, 'ready'), new Date().toISOString());
    const done = new Set();
    for (;;) {
        if (fs.existsSync(path.join(DIR, 'stop'))) break;
        const next = fs.readdirSync(DIR).filter((f) => /^\d+\.mjs$/.test(f) && !done.has(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))[0];
        if (!next) {
            await page.waitForTimeout(300);
            continue;
        }
        done.add(next);
        let out;
        try {
            const mod = await import(`${path.resolve(DIR, next)}?t=${Date.now()}`);
            out = { ok: true, result: await mod.default(api, { page, captureShot, dir: DIR }) };
        } catch (error) {
            out = { ok: false, error: String(error?.stack ?? error).slice(0, 2000) };
        }
        fs.writeFileSync(path.join(DIR, next.replace('.mjs', '.out.json')), JSON.stringify(out, null, 1));
    }
});
