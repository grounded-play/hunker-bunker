import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Runtime errors the game hides. It runs with renderer.debug.checkShaderErrors
// off (compile checks cost frame time), so a shader that fails to link prints
// nothing: on 2026-10-11 every prop particle effect (steam, smoke, sparks,
// spores, bubbles) had drawn nothing for days, its only trace a WebGL
// "useProgram: program not valid" warning, and 17 baked sprites failed to
// upload for want of sides in multiples of four. This turns shader checking
// on before gameplay, walks the bunker, cryo and bio, camps and hives, fights
// at each stop, and fails on any shader error, invalid program, texture
// upload failure or uncaught page error.
//   HB_PROBES=1 RUNTIME_ERRORS_OUT=/tmp/errors npx playwright test -c <gpu config> tests/e2e/probes/runtime-errors.spec.js
const OUT = process.env.RUNTIME_ERRORS_OUT ?? 'playwright-report/runtime-errors';
const FAILURES = [
    /Shader Error/i,
    /program not valid/i,
    /GL_INVALID_OPERATION: glCompressedTex/i,
    /GL_INVALID_OPERATION: glTexStorage/i,
    /multiple-of-four dimensions/i
];

test.setTimeout(1_200_000);
test('runtime errors: shaders link and textures upload everywhere a run goes', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const messages = [];
    page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') messages.push({ type: message.type(), text: message.text().slice(0, 2000) });
    });
    page.on('pageerror', (error) => messages.push({ type: 'pageerror', text: String(error?.stack ?? error).slice(0, 2000) }));
    await page.addInitScript(() => {
        const timer = setInterval(() => {
            const renderer = window.game?.renderer;
            if (renderer) {
                renderer.debug.checkShaderErrors = true;
                clearInterval(timer);
            }
        }, 5);
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay', null, { timeout: 60_000 });
    await page.evaluate(() => {
        const game = window.game;
        game.setGodMode?.(true);
        game.setNoclip?.(true, 1);
    });

    const sites = await page.evaluate(() => {
        const game = window.game;
        game.ensureAct2Camps?.();
        game.ensureHiveSites?.();
        const at = (site) => site?.position ?? site?.group?.position;
        return [...(game.camps ?? []), ...(game.hives ?? [])].map(at).filter(Boolean).slice(0, 6).map((p) => [p.x, p.z]);
    });
    // Bunker, cryo (~60 m out), bio (~140 m out), then camps and hives.
    const stops = [[20, 10], [60, -40], [-80, 40], [150, 30], [-60, -150], ...sites];
    for (const [x, z] of stops) {
        await page.evaluate(([wx, wz]) => window.game.teleportPlayerTo(wx + 4, wz + 4, { safeFloor: true }), [x, z]);
        await page.waitForTimeout(4000);
        await page.evaluate(() => {
            const game = window.game;
            game.setNoclip?.(false);
            game.enemiesFrozen = false;
        });
        for (let shot = 0; shot < 12; shot += 1) {
            await page.evaluate(() => window.game.fireWeaponAtCurrentAim?.({ source: 'probe' }));
            await page.waitForTimeout(250);
        }
        await page.waitForTimeout(2500);
        await page.evaluate(() => window.game.setNoclip?.(true, 1));
    }

    const failures = messages.filter((message) => message.type === 'pageerror' || FAILURES.some((pattern) => pattern.test(message.text)));
    fs.writeFileSync(path.join(OUT, 'runtime-errors.json'), JSON.stringify({ failures, messages }, null, 1));
    expect(failures.map((failure) => `${failure.type}: ${failure.text.slice(0, 400)}`)).toEqual([]);
});
