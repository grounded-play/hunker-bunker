// Fresh-save boot: class intro video files don't exist yet — the intro hook
// must resolve fast and hand off to the crash cutscene + Mothership dialogue.
import puppeteer from 'puppeteer-core';

const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.evaluateOnNewDocument(() => localStorage.clear());
    await page.goto('http://localhost:5199/', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.mouse.click(640, 400);
    await sleep(2000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3000);
    await page.evaluate(() => document.getElementById('start-game')?.click());

    // Watch for the intro overlay + crash cutscene + dialogue over ~40s.
    let sawIntroOverlay = false;
    let sawCutscene = false;
    let sawDialogue = false;
    let overlayStuck = false;
    const start = Date.now();
    while (Date.now() - start < 60000) {
        const snap = await page.evaluate(() => ({
            intro: Boolean(document.querySelector('.class-intro-overlay')),
            cutscene: Boolean(document.querySelector('#cutscene-overlay:not(.hidden)')),
            dialogue: (() => {
                const d = document.getElementById('mothership-dialogue');
                return Boolean(d && !d.classList.contains('hidden'));
            })()
        }));
        sawIntroOverlay ||= snap.intro;
        sawCutscene ||= snap.cutscene;
        if (snap.dialogue) { sawDialogue = true; break; }
        if (snap.intro && Date.now() - start > 20000) { overlayStuck = true; break; }
        await sleep(500);
    }
    check('fresh boot: intro overlay appeared (and is not required to)', true, `appeared=${sawIntroOverlay}`);
    check('fresh boot: intro overlay does not stall the flow', !overlayStuck);
    check('fresh boot: crash cutscene ran', sawCutscene);
    check('fresh boot: Mothership dialogue reached', sawDialogue);
} finally {
    await browser.close();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
