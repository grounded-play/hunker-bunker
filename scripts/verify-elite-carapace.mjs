import { chromium } from '@playwright/test';
import fs from 'node:fs';

const output = process.env.COHERENCE_OUTPUT || 'test-results/elite-carapace';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1431, height: 781 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const check = (condition, message) => { if (!condition) throw new Error(message); };
try {
    await page.goto(process.env.COHERENCE_ORIGIN || 'http://127.0.0.1:5186');
    await page.locator('#title-newrun-btn').waitFor({ state: 'visible', timeout: 90000 });
    await page.click('#title-newrun-btn');
    await page.getByRole('button', { name: 'CONFIRM CALLSIGN & DEPLOY' }).click();
    await page.click('#start-game');
    await page.locator('#armory-slot-weapon').waitFor();
    await page.click('#armory-btn-embark');
    await page.click('#net-mode-solo-btn');
    await page.click('#net-deploy-btn');
    await page.locator('#global-skip-intro-btn').waitFor({ state: 'visible', timeout: 60000 });
    await page.click('#global-skip-intro-btn');
    await page.waitForFunction(() => window.game?.player3dOverlay, { timeout: 60000 });
    await page.waitForFunction(() => window.game?.isGameplayInputActive?.() && !document.querySelector('#transition-overlay')?.classList.contains('visible'), { timeout: 90000 });
    const runtime = await page.evaluate(async () => {
        const game = window.game;
        const { SUIT_RELICS } = await import('/src/runDrops.js');
        const original = { sprites: game.scatterSprites, hp: game.playerVitals.hp, maxHp: game.playerVitals.maxHp,
            shield: game.playerShieldHp, relics: game.runRelics, overclocks: game.runOverclocks, god: game.godMode,
            credit: game._carapaceArmorCredit, playerType: game.playerType };
        const blocks = [];
        const listen = (event) => blocks.push(event.detail);
        window.addEventListener('player-blocked', listen);
        try {
            game.godMode = false; game.playerType = 'SCOUT'; game.iFrameTimer = 0;
            game.playerVitals.hp = 100; game.playerVitals.maxHp = 100; game.playerShieldHp = 0;
            game.runRelics = [SUIT_RELICS.find((item) => item.id === 'chitin_membrane')];
            game.runOverclocks = []; game._carapaceArmorCredit = 0;
            game.scatterSprites = [{ visible: true, userData: { type: 'scatter_slime_puddle' },
                position: game.player.position.clone(), scale: { x: 1, y: 1 } }];
            const landed = [];
            for (let i = 0; i < 10; i++) { game.iFrameTimer = 0; landed.push(game.takeDamage(1, 'crawler')); }
            return { hpAfterTenHits: game.playerVitals.hp, blocks: blocks.filter((b) => b.relic === 'chitin_membrane').length,
                acceptedContacts: landed.filter(Boolean).length, audio: window.AudioManager.playEliteWarning() };
        } finally {
            window.removeEventListener('player-blocked', listen);
            game.scatterSprites = original.sprites; game.playerVitals.hp = original.hp; game.playerVitals.maxHp = original.maxHp;
            game.playerShieldHp = original.shield; game.runRelics = original.relics; game.runOverclocks = original.overclocks;
            game.godMode = original.god; game._carapaceArmorCredit = original.credit; game.playerType = original.playerType;
            game.emitHealthState();
        }
    });
    check(runtime.hpAfterTenHits === 93 && runtime.blocks === 3 && runtime.acceptedContacts === 10, JSON.stringify(runtime));
    check(runtime.audio === true, 'Elite audio did not schedule after user input');
    check(errors.length === 0, errors.join('\n'));
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ runtime, pageErrors: errors }, null, 2));
    await page.screenshot({ path: `${output}/gameplay.png` });
    console.log(JSON.stringify({ runtime, pageErrors: errors }));
} finally { await browser.close(); }
