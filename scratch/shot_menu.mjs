import puppeteer from 'puppeteer-core';
const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => localStorage.clear());
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:5200/', { waitUntil: 'networkidle2' });
await sleep(1500);
await page.mouse.click(640, 400);
await sleep(2500);
await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
await sleep(3500);

for (const [w, h] of [[1366, 768], [1440, 900], [1024, 768], [1920, 1080], [900, 650]]) {
    await page.setViewport({ width: w, height: h });
    await sleep(900);
    const spills = await page.evaluate(() => {
        const out = [];
        const menu = document.getElementById('menu');
        if (!menu || menu.classList.contains('hidden')) return ['menu-hidden'];
        for (const el of menu.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            // viewport spill
            if (r.right > window.innerWidth + 4 || r.bottom > window.innerHeight + 4 || r.left < -4 || r.top < -4) {
                out.push(`VIEWPORT ${el.id || el.className.toString().split(' ')[0]} @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
                continue;
            }
            // spill past a padded parent box
            const p = el.parentElement;
            if (!p) continue;
            const pr = p.getBoundingClientRect();
            const cs = getComputedStyle(p);
            if (cs.overflow !== 'visible' && cs.overflowY !== 'visible') continue;
            if (r.bottom > pr.bottom + 6 || r.right > pr.right + 6) {
                out.push(`PARENT ${el.id || el.className.toString().split(' ')[0]} spills ${p.id || p.className.toString().split(' ')[0]} by ${Math.round(Math.max(r.bottom - pr.bottom, r.right - pr.right))}px`);
            }
        }
        return [...new Set(out)].slice(0, 12);
    });
    console.log(`=== ${w}x${h}:`, JSON.stringify(spills));
    if (spills.length && spills[0] !== 'menu-hidden') {
        await page.screenshot({ path: process.env.OUT + `/hero_spill_${w}x${h}.png` });
    }
}
await browser.close();
