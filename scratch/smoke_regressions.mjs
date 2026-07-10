// Verifies the regression fixes: SCOUT ship+console visible, GIF-first intro.
// Also probes hero-select spill with SCOUT selected.
import puppeteer from 'puppeteer-core';
const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const PORT = process.argv[2] ?? '5200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.evaluateOnNewDocument(() => localStorage.clear());
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.mouse.click(640, 400);
    await sleep(2500);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3500);

    // Select SCOUT explicitly.
    const scoutSelected = await page.evaluate(() => {
        const card = document.querySelector('[data-hero="SCOUT"], [data-class="SCOUT"], #hero-scout')
            ?? Array.from(document.querySelectorAll('#menu button, #menu [class*="card"]'))
                .find((el) => /SCOUT/i.test(el.textContent));
        card?.click();
        return Boolean(card);
    });
    await sleep(1200);
    check('selected SCOUT on the menu', scoutSelected);

    // Spill probe with SCOUT selected
    const spills = await page.evaluate(() => {
        const out = [];
        const menu = document.getElementById('menu');
        for (const el of menu?.querySelectorAll('*') ?? []) {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            if (r.right > window.innerWidth + 4 || r.bottom > window.innerHeight + 4) {
                out.push(el.id || el.className.toString().split(' ')[0]);
            }
        }
        return [...new Set(out)];
    });
    check('no hero-select spill with SCOUT selected', spills.length === 0, spills.join(','));
    await page.screenshot({ path: (process.env.OUT ?? '/tmp') + '/scout_select.png' });

    // INITIALIZE → the GIF must appear first.
    await page.evaluate(() => document.getElementById('start-game')?.click());
    let sawGif = false;
    let gifSrc = '';
    for (let i = 0; i < 40; i += 1) {
        await sleep(500);
        const state = await page.evaluate(() => {
            const img = document.querySelector('.class-intro-overlay img');
            return img ? img.getAttribute('src') : null;
        });
        if (state) {
            sawGif = true;
            gifSrc = state;
            break;
        }
    }
    check('class intro shows the GIF first', sawGif && /Scout\.Intro\.gif/i.test(gifSrc), gifSrc);

    // Skip through gif + video + dialogue to gameplay.
    for (let i = 0; i < 260; i += 1) {
        await sleep(1000);
        const state = await page.evaluate(() => {
            if (document.querySelector('.class-intro-overlay')) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
                return 'intro';
            }
            const choices = document.getElementById('mothership-dialogue-choices');
            const skip = document.getElementById('mothership-choice-skip');
            if (skip && choices && !choices.classList.contains('hidden')) {
                skip.click();
                return 'skipped';
            }
            const dialog = document.getElementById('mothership-dialogue');
            if (dialog && !dialog.classList.contains('hidden')) return 'typing';
            return window.game?.isGameplayInputActive?.() === true ? 'live' : 'waiting';
        });
        if (state === 'live') break;
    }

    const ship = await page.evaluate(() => {
        const g = window.game;
        const active = g.getActiveShip();
        if (!active) return null;
        return {
            type: active.type,
            playerType: g.playerType,
            shipCount: g.crashedShips.length,
            visibleObjects: active.threeObjects?.filter((o) => o.visible).length ?? 0,
            totalObjects: active.threeObjects?.length ?? 0,
            othersHidden: g.crashedShips
                .filter((s) => s.type !== g.playerType)
                .every((s) => (s.threeObjects ?? []).every((o) => !o.visible))
        };
    });
    check('SCOUT is the active class with a ship', ship?.playerType === 'SCOUT' && ship?.type === 'SCOUT', JSON.stringify(ship));
    // Module sprites stay hidden until their goals are purchased, so only a
    // subset of threeObjects is visible at run start.
    check('scout ship + console objects are visible', (ship?.visibleObjects ?? 0) >= 5, `visible=${ship?.visibleObjects}`);
    check('other classes\' wrecks stay hidden', ship?.othersHidden === true);
    await page.screenshot({ path: (process.env.OUT ?? '/tmp') + '/scout_gameplay.png' });
} finally {
    await browser.close();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
