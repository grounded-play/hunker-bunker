/* global console, process */
// Real in-game screenshots of the kiosk machines on Steam Deck (1280x800) and
// PC (1920x1080), for the PR and README: the game is played into an actual
// run (title -> new run -> Armory -> embark -> deploy -> gameplay), then each
// machine is opened in the world the way a player opens it.
//
//   node scripts/capture-kiosk-screenshots.mjs [baseUrl]
//
// Writes docs/screenshots/<deck|pc>_<armory|fabrication_automart|
// console_kiosk|blackice_arcade>.png and kiosks_deck_vs_pc.png. Run against a
// dev server (npm run dev); Chrome is used for WebGL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const [baseUrl = 'http://localhost:5173'] = process.argv.slice(2);
const OUT = path.resolve('docs/screenshots');
const TARGETS = [['deck', 1280, 800], ['pc', 1920, 1080]];
const SHOTS = ['armory_workbench', 'fabrication_automart', 'console_kiosk', 'blackice_arcade'];

async function clickWhenVisible(page, selector, timeout = 30000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        if (await page.locator(selector).isVisible().catch(() => false)) {
            await page.locator(selector).click({ force: true }).catch(() => {});
            return true;
        }
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(700);
    }
    return false;
}

async function capture(name, width, height) {
    const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width, height } });
    // Every shot waits for the door transition to finish opening.
    const shot = async (id) => {
        await page.waitForFunction(() => !document.getElementById('transition-overlay')?.classList.contains('visible'), null, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUT, `${name}_${id}.png`) });
    };
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await clickWhenVisible(page, '#title-newrun-btn', 120000);
    await page.waitForTimeout(2500);
    if (await page.locator('#roster-confirm-btn').isVisible().catch(() => false)) await page.click('#roster-confirm-btn', { force: true });
    for (let i = 0; i < 4 && !(await page.locator('#armory-btn-embark').isVisible().catch(() => false)); i += 1) {
        if (await page.locator('#start-game').isVisible().catch(() => false)) await page.click('#start-game', { force: true });
        await page.waitForTimeout(4000);
    }
    await page.waitForTimeout(6000);
    await shot('armory_workbench');
    fs.copyFileSync(path.join(OUT, `${name}_armory_workbench.png`), path.join(OUT, `${name}_armory.png`));
    await page.click('#armory-btn-embark', { force: true });
    await clickWhenVisible(page, '#net-deploy-btn', 60000);
    // Skip the opening into gameplay.
    const end = Date.now() + 180000;
    // Gameplay is live once the phase is set and the mission intro has ended.
    const inGame = () => page.evaluate(() => document.documentElement.classList.contains('phase-gameplay')
        && !document.body.classList.contains('mission-intro-active'));
    while (Date.now() < end && !(await inGame())) {
        await page.evaluate(() => {
            const skip = document.getElementById('global-skip-intro-btn');
            if (skip && !skip.classList.contains('hidden')) skip.click();
        }).catch(() => {});
        await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(8000);
    // Nothing else open over the world (pause/settings, toasts' modals).
    const clearModals = () => page.evaluate(() => {
        for (const modal of document.querySelectorAll('.modal:not(.hidden)')) {
            modal.querySelector('.close-modal, [id^="close-"]')?.click?.();
            modal.classList.add('hidden');
        }
    });
    await clearModals();

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-fabrication-bay')));
    await page.waitForTimeout(2500);
    await shot('fabrication_automart');
    await page.evaluate(() => document.getElementById('close-fabrication-modal')?.click());
    await page.waitForTimeout(1200);
    await clearModals();

    await page.evaluate(() => {
        const game = window.game;
        const ship = game?.ships?.find?.((entry) => entry.type === game.playerType) ?? { type: game?.playerType ?? 'SCOUT' };
        game?.openConsoleModal?.(ship);
    });
    await page.waitForTimeout(2500);
    await shot('console_kiosk');
    await page.evaluate(() => document.getElementById('close-console-terminal')?.click());
    await page.waitForTimeout(1200);
    await clearModals();

    await page.evaluate(async () => {
        const { getBlackjackController } = await import('/src/blackjackArcade.js');
        getBlackjackController({ game: window.game }).open();
    });
    await page.waitForTimeout(4000);
    await shot('blackice_arcade');
    await browser.close();
    console.log(`[kiosk-shots] ${name} ${width}x${height}`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, width, height] of TARGETS) await capture(name, width, height);

// Deck beside PC, one row per machine.
const inputs = SHOTS.flatMap((id) => TARGETS.flatMap(([name]) => ['-i', path.join(OUT, `${name}_${id}.png`)]));
const scale = SHOTS.flatMap((_, row) => TARGETS.map((__, col) => `[${row * 2 + col}]scale=1280:-2,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0x05080a[v${row * 2 + col}]`));
const stack = `${scale.join(';')};${SHOTS.map((_, row) => `[v${row * 2}][v${row * 2 + 1}]hstack[r${row}]`).join(';')};${SHOTS.map((_, row) => `[r${row}]`).join('')}vstack=inputs=${SHOTS.length},scale=1920:-2`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', stack, path.join(OUT, 'kiosks_deck_vs_pc.png')]);
console.log('[kiosk-shots] docs/screenshots/kiosks_deck_vs_pc.png');
