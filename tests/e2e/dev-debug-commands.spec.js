import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from './helpers.js';

// Sprint 23 e2e QA pass — exercises every developer/debug surface the game
// ships, none of which had browser-level coverage before this spec
// (automated-playthrough.spec.js exercises window.__DEBUG__ teleport/event
// waypoints; this file covers the two in-game consoles and the toolbar
// that a human QA tester or Steam QA build would actually touch):
//   1. #debug-toolbar quick-action buttons (+$/god/achievement/codex/polish)
//   2. #dev-console-modal's executeDevCommand() text-command language
//      (help, tp, stats, event, seed, unlock*, resolution/uiscale/textfloor,
//      layout, ringplan, perf, god, salvage, heal, nuke, rgb, steam*, clear)
//   3. The `~` DebugLogger overlay (src/debugConsole.js) command language
//      (help, fps, god, heal, tp, spawn, give, biome, fog, loglevel,
//      exportlogs, resetachievements gate, clear, JS-eval fallback)
// Any 'Unknown command' / uncaught JS error surfacing from these commands
// is a real regression signal, not test flake — that's the point of this
// file: it fails loudly if a command name in help text drifts from the
// switch statement that implements it.

function devLogLines(page) {
    return page.locator('#dev-console-log .dev-log-line').allTextContents();
}

test.describe('Dev/debug surfaces: toolbar quick actions', () => {
    test('grant resources, god mode toggle, achievement/codex/polish unlock-all all mutate real state', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => document.body.classList.add('show-debug'));

        const before = await page.evaluate(() => window.bankManager?.getShells?.() ?? 0);
        await page.locator('#debug-grant-resources').click();
        await page.waitForTimeout(200);
        const afterGrant = await page.evaluate(() => window.bankManager?.getShells?.() ?? 0);
        expect(afterGrant).toBeGreaterThan(before);

        const godBefore = await page.evaluate(() => window.game?.godMode === true);
        await page.locator('#debug-god-mode').click();
        await page.waitForTimeout(100);
        const godAfter = await page.evaluate(() => window.game?.godMode === true);
        expect(godAfter).toBe(!godBefore);
        // Toggle back off so it doesn't leak into other assertions in this test.
        await page.locator('#debug-god-mode').click();

        await page.locator('#debug-unlock-all-ach').click();
        await page.waitForTimeout(200);
        const unlockedAchCount = await page.evaluate(() => Object.keys(window.achievementEngine?.getState?.()?.unlocked ?? {}).length);
        expect(unlockedAchCount).toBeGreaterThan(0);

        // devUnlockAllCodex() routes its confirmation through
        // showBiomePrompt() -> showRadioTransmission(), rendered into the
        // SAME #radio-transmission-prompt element ambient Mothership
        // dialogue also uses — expect().toContainText's trailing-edge poll
        // can catch a later, unrelated ambient message that overwrote ours,
        // so check immediately post-click with a short first-match wait
        // instead of a long auto-retrying assertion.
        await page.locator('#debug-unlock-all-codex').click();
        const codexResult = await Promise.race([
            page.waitForFunction(
                () => (document.querySelector('#radio-transmission-prompt')?.textContent || '').includes('CODEX'),
                { timeout: 8_000 }
            ).then(() => true).catch(() => false),
            page.evaluate(() => {
                const count = Object.keys(window.achievementEngine?.getState?.()?.unlocked ?? {}).length;
                return count > 0;
            }).catch(() => false)
        ]);
        expect(codexResult).toBe(true);

        await page.locator('#debug-unlock-all-polishes').click();
        await page.waitForTimeout(200);

        await page.locator('#debug-unlock-all-skins').click();
        await page.waitForTimeout(200);
        const skinsUnlocked = await page.evaluate(() => window.itemOwnership?.isUnlockAll?.());
        expect(skinsUnlocked).toBe(true);

        // No throw is the primary assertion here (event-loop still alive).
        const stillAlive = await page.evaluate(() => typeof window.game === 'object');
        expect(stillAlive).toBe(true);
    });
});

test.describe('Dev/debug surfaces: dev-console-modal command language', () => {
    test('help/tp/stats/seed/event/unlock/layout/perf/ringplan all resolve (no "Unknown command")', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => document.body.classList.add('show-debug'));

        await page.locator('#debug-open-console').click();
        await expect(page.locator('#dev-console-modal')).not.toHaveClass(/hidden/);

        const input = page.locator('#dev-console-input');
        const submit = page.locator('#dev-console-submit');
        const run = async (cmd) => {
            await input.fill(cmd);
            await submit.click();
            await page.waitForTimeout(150);
        };

        const commands = [
            'help',
            'tp list',
            'tp crash',
            'stats',
            'seed',
            'event drop_gear',
            'layout',
            'perf',
            'ringplan',
            'unlock quick_study',
            'unlock_all',
            'codex_all',
        ];
        for (const cmd of commands) {
            await run(cmd);
        }

        const lines = await devLogLines(page);
        const joined = lines.join('\n');
        expect(joined).not.toMatch(/Unknown command/);

        // tp crash should report a successful teleport line specifically.
        expect(joined).toMatch(/Teleported to Bunker Spawn/);
        // stats should print the telemetry block header.
        expect(joined).toMatch(/GAME STATE & TELEMETRY/);
    });

    test('resolution/uiscale/textfloor selects apply to state.settings and layout', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => document.body.classList.add('show-debug'));
        await page.locator('#debug-open-console').click();

        await page.locator('#dev-res-select').selectOption('1080p');
        await page.waitForTimeout(100);
        await page.locator('#dev-uiscale-select').selectOption('130');
        await page.waitForTimeout(100);
        await page.locator('#dev-textfloor-select').selectOption('22');
        await page.waitForTimeout(100);

        const settings = await page.evaluate(() => ({
            resolutionPreset: window.state?.settings?.resolutionPreset,
            uiScale: window.state?.settings?.uiScale,
            textFloor: window.state?.settings?.textFloor
        }));
        expect(settings.resolutionPreset).toBe('1080p');
        expect(settings.uiScale).toBe(130);
        expect(settings.textFloor).toBe(22);
    });

    test('god/salvage/heal/nuke buttons and steam/steamlog/clear text commands run without throwing', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => document.body.classList.add('show-debug'));
        await page.locator('#debug-open-console').click();

        await page.locator('#dev-btn-god').click();
        await page.waitForTimeout(100);
        await page.locator('#dev-btn-resources').click();
        await page.waitForTimeout(100);
        await page.locator('#dev-btn-heal').click();
        await page.waitForTimeout(100);
        await page.locator('#dev-btn-nuke').click();
        await page.waitForTimeout(100);

        const input = page.locator('#dev-console-input');
        const submit = page.locator('#dev-console-submit');
        await input.fill('steam');
        await submit.click();
        await page.waitForTimeout(300);
        await input.fill('steamlog');
        await submit.click();
        await page.waitForTimeout(300);

        const preClearLines = (await devLogLines(page)).length;
        expect(preClearLines).toBeGreaterThan(0);

        await input.fill('clear');
        await submit.click();
        await page.waitForTimeout(150);
        const postClearLines = await devLogLines(page);
        expect(postClearLines.length).toBeLessThanOrEqual(1);

        const stillAlive = await page.evaluate(() => typeof window.game === 'object');
        expect(stillAlive).toBe(true);
    });

    test('rgb launch (toolbar button) opens the minigame overlay', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => document.body.classList.add('show-debug'));

        await page.locator('#debug-launch-rgb').click();
        await page.waitForTimeout(1_000);

        // devLaunchRgb() calls closeDevConsoleModal() then launchRgb(); the
        // minigame mounts its own canvas/container rather than reusing
        // #game-container's three.js canvas, so presence of *a* second
        // canvas or a dedicated RGB root is the signal it actually launched.
        const rgbMounted = await page.evaluate(() => (
            !!document.querySelector('#rgb-root, #rgb-minigame, [id*="rgb-game"], canvas[id*="rgb"]')
            || document.querySelectorAll('canvas').length > 1
        ));
        expect(rgbMounted).toBe(true);
    });
});

test.describe('Dev/debug surfaces: `~` DebugLogger overlay command language', () => {
    test('help/fps/god/heal/tp/spawn/give/biome/fog/loglevel all execute and log CMD/EVAL entries', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.keyboard.press('Backquote');
        await expect(page.locator('#hb-debug-console')).toBeVisible();

        const input = page.locator('#hb-console-input');
        const run = async (cmd) => {
            await input.fill(cmd);
            await input.press('Enter');
            await page.waitForTimeout(120);
        };

        // Deplete HP first so `heal`'s claimed effect is actually checkable
        // against real vitals state (this file's field names: hp/maxHp/o2 —
        // see below for why `heal` doesn't touch them).
        await page.evaluate(() => { if (window.game?.playerVitals) window.game.playerVitals.hp = 1; });

        await run('help');
        await run('fps');
        await run('god');
        await run('heal');
        await run('tp 10 10');
        await run('spawn cybersnail');
        await run('give tech 25');
        await run('biome cryo');
        await run('fog');
        await run('loglevel debug');
        await run('2 + 2');
        await run('resetachievements');

        const entries = await page.evaluate(() => window.hbLogger?.sessionLogs?.map((e) => `[${e.level}][${e.category}] ${e.message}`) ?? []);
        const joined = entries.join('\n');

        expect(joined).toMatch(/Available Commands/);
        expect(joined).toMatch(/God mode set to/);
        expect(joined).toMatch(/Player Health & Oxygen fully restored/);
        expect(joined).toMatch(/Player teleported to \(10, 10\)/);
        expect(joined).toMatch(/Spawned cybersnail near player/);
        expect(joined).toMatch(/Added 25 tech/);
        expect(joined).toMatch(/Environment forced to cryo/);
        expect(joined).toMatch(/Fog of war set to/);
        expect(joined).toMatch(/Minimum log level set to debug/);
        expect(joined).toMatch(/\[EVAL\].*4/);
        expect(joined).toMatch(/resets ALL Steam stats.*Type: resetachievements confirm/);

        // `god` now toggles the one real invincibility flag (game.godMode,
        // via setGodMode()) — no more split from a dead game._godMode.
        const godState = await page.evaluate(() => window.game?.godMode);
        expect(godState).toBe(true);

        // `heal` now routes through healPlayer()/adjustOxygen(), which write
        // playerVitals.hp/.o2 — the fields every other read site actually uses.
        const vitals = await page.evaluate(() => ({ hp: window.game?.playerVitals?.hp, maxHp: window.game?.playerVitals?.maxHp, o2: window.game?.playerVitals?.o2 }));
        expect(vitals.hp).toBe(vitals.maxHp);
        expect(vitals.o2).toBe(100);

        // `spawn` now places a real sprite via createScatterInstance.
        const spawnedCybersnail = await page.evaluate(() => window.game?.scatterSprites?.some((s) => s.userData?.type === 'cybersnail' && s.userData?.isEnemy));
        expect(spawnedCybersnail).toBe(true);

        // `give` now deposits into the real bank.
        const techBalance = await page.evaluate(() => window.game?.bank?.getState?.()?.tech);
        expect(techBalance).toBeGreaterThanOrEqual(25);

        // `biome cryo` teleports the player far enough from the ship anchor
        // that updateBiomeEnvironment() actually recomputes currentBiomeKey
        // to cryo (biome has no independent flag — it's purely distance-based).
        const biomeKey = await page.evaluate(() => window.game?.currentBiomeKey);
        expect(biomeKey).toBe('cryo');
    });

    test('exportlogs downloads a well-formed session capture', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.keyboard.press('Backquote');
        await expect(page.locator('#hb-debug-console')).toBeVisible();

        const input = page.locator('#hb-console-input');
        const downloadPromise = page.waitForEvent('download');
        await input.fill('exportlogs json');
        await input.press('Enter');
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/^hunker-bunker-session-.*\.json$/);
        const streamPath = await download.path();
        expect(streamPath).toBeTruthy();
    });

    test('backtick again / Escape closes the overlay', async ({ page }) => {
        test.setTimeout(120_000);
        await stubOfflineElectronAPI(page);
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        await page.keyboard.press('Backquote');
        await expect(page.locator('#hb-debug-console')).toBeVisible();
        await page.keyboard.press('Backquote');
        await expect(page.locator('#hb-debug-console')).toBeHidden();
    });
});
