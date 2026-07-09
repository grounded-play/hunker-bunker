// Headless smoke test: plays Act 2 end-to-end on a post-reveal save.
// Usage: node smoke_act2.js <port>
import puppeteer from 'puppeteer-core';

const PORT = process.argv[2] ?? '5199';
const URL = `http://localhost:${PORT}/`;
const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';

const results = [];
function check(name, ok, extra = '') {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissTransmissions(page, { timeoutMs = 60000 } = {}) {
    // Poll until the dialogue closes, clicking CONTINUE whenever the typing
    // finishes and the choice row appears.
    const start = Date.now();
    let closedStreak = 0;
    while (Date.now() - start < timeoutMs) {
        const state = await page.evaluate(() => {
            const dialog = document.getElementById('mothership-dialogue');
            if (!dialog || dialog.classList.contains('hidden')) return 'closed';
            const btn = document.getElementById('mothership-choice-skip');
            const choices = document.getElementById('mothership-dialogue-choices');
            if (btn && choices && !choices.classList.contains('hidden')) {
                btn.click();
                return 'clicked';
            }
            return 'typing';
        });
        if (state === 'closed') {
            closedStreak += 1;
            if (closedStreak >= 3) return; // stayed closed ~1.5s — done
        } else {
            closedStreak = 0;
        }
        await sleep(state === 'clicked' ? 700 : 500);
    }
}

async function waitFor(page, fn, label, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            if (await page.evaluate(fn)) return true;
        } catch { /* page busy */ }
        await sleep(250);
    }
    console.log(`TIMEOUT waiting for: ${label}`);
    return false;
}

async function teleport(page, x, z) {
    await page.evaluate((tx, tz) => {
        window.game.player.position.set(tx, 0, tz);
    }, x, z);
    await sleep(400); // let proximity scans catch up
}

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--window-size=1280,800',
        '--autoplay-policy=no-user-gesture-required'
    ]
});

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // Seed a post-cave-reveal save so Act 2 is live from boot.
    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('hb_arc_v1', JSON.stringify({ arcState: 'hive_awakened_tease', version: 1 }));
        localStorage.removeItem('hb_act2_v1');
    });

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1200);

    // Corrupted title should already be applied on boot.
    const corrupted = await page.evaluate(() =>
        document.title.includes('PREGALIEN')
        && Boolean(document.querySelector('.splash-title.title-corrupted')));
    check('boot: PREGALIEN corrupted title on splash', corrupted);

    // Boot: click through loader/splash → menu → INITIALIZE.
    await page.mouse.click(640, 400); // wake the loader
    await waitFor(page, () => {
        const btn = document.getElementById('enter-fullscreen');
        return btn && btn.offsetParent !== null;
    }, 'PLAY GAME button', 30000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await waitFor(page, () => {
        const btn = document.getElementById('start-game');
        return btn && btn.offsetParent !== null;
    }, 'INITIALIZE button', 30000);
    await sleep(2500); // door transition
    await page.evaluate(() => document.getElementById('start-game')?.click());

    // Act 2 intro: no crash cutscene; queen intro transmission instead.
    const introShown = await waitFor(page, () => {
        const dialog = document.getElementById('mothership-dialogue');
        const body = document.getElementById('mothership-dialogue-body');
        return dialog && !dialog.classList.contains('hidden')
            && /TWO HEARTBEATS/i.test(body?.textContent ?? '');
    }, 'queen intro transmission', 60000);
    check('intro: queen "TWO HEARTBEATS" transmission plays', introShown);

    const queenSpeaker = await page.evaluate(() =>
        /THE QUEEN/i.test(document.getElementById('mothership-dialogue')?.textContent ?? ''));
    check('intro: THE QUEEN speaker name renders', queenSpeaker);

    await dismissTransmissions(page);
    const inputLive = await waitFor(page, () => window.game?.isGameplayInputActive?.() === true, 'gameplay input', 30000);
    check('intro: gameplay input active after transmission', inputLive);

    const phase1 = await page.evaluate(() => window.game.act2?.getPhase());
    check('phase: gestation after begin()', phase1 === 'gestation', `phase=${phase1}`);

    const loopLabel = await page.evaluate(() => document.querySelector('#loop-state-hud, .loop-step-label, [data-loop-step]')?.textContent ?? '');
    console.log(`  loop HUD text: "${loopLabel.trim().slice(0, 60)}"`);

    // ── Gestation: sever the uplink at the ship console ──
    const consolePos = await page.evaluate(() => {
        const ship = window.game.getActiveShip();
        return ship ? { x: ship.tileX + (ship.consoleOffset?.x ?? 0), z: ship.tileZ + (ship.consoleOffset?.z ?? 0) } : null;
    });
    check('gestation: ship console located', Boolean(consolePos));
    await teleport(page, consolePos.x, consolePos.z);
    await waitFor(page, () => Boolean(window.game.activeInteractiveConsole), 'console proximity', 8000);
    await page.evaluate(() => window.game.interactWithConsole());
    await sleep(800);
    const phase2 = await page.evaluate(() => window.game.act2?.getPhase());
    check('gestation: console interact severs uplink → dish phase', phase2 === 'dish', `phase=${phase2}`);
    await dismissTransmissions(page);

    // ── Dish: foundry interact grows the dish ──
    const foundryUp = await waitFor(page, () => window.game.foundry?.isRevealed === true, 'foundry reveal', 10000);
    check('dish: foundry auto-revealed for dish objective', foundryUp);
    const foundryPos = await page.evaluate(() => window.game.foundry.getPosition());
    await teleport(page, foundryPos.x, foundryPos.z);
    await waitFor(page, () => window.game?.isGameplayInputActive?.() === true, 'input before foundry', 8000);
    await page.evaluate(() => window.game.interactWithFoundry());
    await sleep(800);
    const phase3 = await page.evaluate(() => window.game.act2?.getPhase());
    check('dish: foundry interact grows dish → camps_help', phase3 === 'camps_help', `phase=${phase3}`);
    await dismissTransmissions(page);

    // ── Camps: aid all three ──
    const campsUp = await waitFor(page, () => window.game.camps?.length === 3, 'camps spawn', 10000);
    check('camps: three survivor camps spawned', campsUp);
    const campSpots = await page.evaluate(() =>
        window.game.act2.getState().camps.map((c) => ({ id: c.id, x: c.x, z: c.z })));
    console.log(`  camp positions: ${JSON.stringify(campSpots)}`);

    for (const spot of campSpots) {
        await teleport(page, spot.x, spot.z);
        await waitFor(page, () => window.game?.isGameplayInputActive?.() === true, 'input before aid', 8000);
        await page.evaluate(() => window.game.interactWithAct2Camp());
        await sleep(500);
        await dismissTransmissions(page);
    }
    const phase4 = await page.evaluate(() => window.game.act2?.getPhase());
    check('camps: all aided → camps_betray', phase4 === 'camps_betray', `phase=${phase4}`);

    // ── Betrayal: cull all three ──
    for (const spot of campSpots) {
        await teleport(page, spot.x, spot.z);
        await waitFor(page, () => window.game?.isGameplayInputActive?.() === true, 'input before cull', 8000);
        await page.evaluate(() => window.game.interactWithAct2Camp());
        await sleep(500);
        await dismissTransmissions(page);
    }
    const phase5 = await page.evaluate(() => window.game.act2?.getPhase());
    check('betrayal: all culled → launch_ready', phase5 === 'launch_ready', `phase=${phase5}`);

    // ── Launch: board the vessel at the first camp ──
    await teleport(page, campSpots[0].x, campSpots[0].z);
    await waitFor(page, () => window.game?.isGameplayInputActive?.() === true, 'input before board', 8000);
    await page.evaluate(() => window.game.interactWithAct2Camp());
    await sleep(800);
    const phase6 = await page.evaluate(() => window.game.act2?.getPhase());
    check('launch: boarded → departed', phase6 === 'departed', `phase=${phase6}`);

    const departLines = await waitFor(page, () => {
        const body = document.getElementById('mothership-dialogue-body');
        return /SLEEP, CARRIER/i.test(body?.textContent ?? '');
    }, 'departure transmission', 20000);
    check('launch: departure queen sign-off plays', departLines);
    await dismissTransmissions(page);

    const teaseCard = await waitFor(page, () =>
        Boolean(document.querySelector('.act3-tease-overlay')), 'ACT III card', 15000);
    check('ending: ACT III tease card shows', teaseCard);

    const backAtMenu = await waitFor(page, () => {
        const menu = document.getElementById('menu');
        return menu && !menu.classList.contains('hidden');
    }, 'return to menu', 30000);
    check('ending: returned to main menu', backAtMenu);

    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('hb_act2_v1') ?? '{}'));
    check('persistence: hb_act2_v1 departed=true saved', persisted?.departed === true);

    await page.screenshot({ path: '/tmp/smoke_act2_final.png' });
} finally {
    await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
