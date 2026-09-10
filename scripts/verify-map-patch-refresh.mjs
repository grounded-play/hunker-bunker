import { chromium } from '@playwright/test';
import fs from 'node:fs';

const output = process.env.COHERENCE_OUTPUT || 'test-results/map-patch-refresh';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1431, height: 781 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const check = (condition, message) => { if (!condition) throw new Error(message); };
try {
    console.log('Opening game');
    await page.goto(process.env.COHERENCE_ORIGIN || 'http://127.0.0.1:5187');
    await page.locator('#title-newrun-btn').waitFor({ state: 'visible', timeout: 90000 });
    console.log('Title ready');
    await page.click('#title-newrun-btn');
    await page.getByRole('button', { name: 'CONFIRM CALLSIGN & DEPLOY' }).click();
    await page.click('#start-game');
    await page.locator('#armory-slot-weapon').waitFor();
    await page.click('#armory-debug-unlock-skins-btn');
    await page.click('#armory-slot-decal');
    await page.locator('#armory-picker-grid img').first().waitFor();
    await page.locator('#armory-picker-grid').evaluate(async (e) => Promise.all([...e.querySelectorAll('img')].map((img) => img.decode())));
    await page.screenshot({ path: `${output}/patch-picker.png` });
    await page.click('#armory-picker-grid [data-value="4129"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${output}/patch-mounted.png` });
    console.log('Patch picker captured');
    await page.click('#armory-btn-embark');
    await page.click('#net-mode-solo-btn');
    await page.click('#net-deploy-btn');
    await page.waitForFunction(() => !document.querySelector('#global-skip-intro-btn')?.classList.contains('hidden') || window.game?.isGameplayInputActive?.(), null, { timeout: 90000 });
    if (await page.locator('#global-skip-intro-btn').isVisible()) await page.click('#global-skip-intro-btn');
    await page.waitForFunction(() => window.game?.player3dOverlay, { timeout: 60000 });
    await page.waitForFunction(() => window.game?.isGameplayInputActive?.() && !document.querySelector('#transition-overlay')?.classList.contains('visible'), { timeout: 90000 });
    console.log('Gameplay ready');
    await page.evaluate(() => { window.game.godMode = true; });
    await page.waitForTimeout(1200);
    const layouts = [];
    for (const [width, height] of [[1431,781], [1280,800], [1920,1080]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${output}/gameplay-${width}.png` });
        const layout = await page.evaluate(() => {
            const panel = document.querySelector('#desktop-compass');
            const r = panel.getBoundingClientRect();
            const canvas = document.querySelector('#hud-blueprint-canvas');
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let lit = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 1] > 70) lit++;
            return { infoParent: document.querySelector('#tactical-telemeter-box').parentElement.id,
                rect: r.toJSON(), lit, overflow: panel.scrollWidth - panel.clientWidth,
                fog: { near: window.game.scene.fog.near, far: window.game.scene.fog.far },
                camera: window.game.thirdPersonCameraConfig };
        });
        check(layout.infoParent === 'hud-map-info' && layout.lit > 10, JSON.stringify(layout));
        check(layout.overflow < 2 && layout.rect.bottom <= height && layout.rect.left >= 0, JSON.stringify(layout));
        await page.keyboard.press('m');
        await page.locator('#tactical-map-modal:not(.hidden)').waitFor();
        await page.screenshot({ path: `${output}/map-${width}.png` });
        const expanded = await page.evaluate(() => ({ parent: document.querySelector('#tactical-telemeter-box').parentElement.id,
            rect: document.querySelector('.tactical-map-modal-content').getBoundingClientRect().toJSON() }));
        check(expanded.parent === 'expanded-map-info', 'Sector info was not moved into full map');
        check(expanded.rect.bottom <= height + 1 && expanded.rect.top >= 0, 'Map dialog outside viewport');
        await page.keyboard.press('Escape');
        layouts.push({ width, height, ...layout, expanded });
    }
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ layouts, errors }, null, 2));
    check(errors.length === 0, errors.join('\n'));
    console.log(JSON.stringify({ layouts, errors }));
} catch (error) {
    console.error(error.message, errors);
    await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(() => {});
    throw error;
} finally { await browser.close(); }
