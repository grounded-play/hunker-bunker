import { chromium } from '@playwright/test';
import fs from 'node:fs';

const output = process.env.ARMORY_VERIFY_OUTPUT || 'test-results/armory-layout';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const matrix = [];
page.on('pageerror', (e) => errors.push(e.message));
const click = (selector) => page.locator(selector).click();
const check = (condition, message) => { if (!condition) throw new Error(message); };
try {
    await page.goto(process.env.ARMORY_PREVIEW_ORIGIN || 'http://127.0.0.1:5173/');
    await click('#title-newrun-btn');
    await page.getByRole('button', { name: 'CONFIRM CALLSIGN & DEPLOY' }).click();
    await click('#start-game');
    await page.locator('#armory-slot-weapon').waitFor();
    for (const [width, height] of [[1280,800], [1431,781], [1920,1080], [1280,720]]) {
        await page.setViewportSize({ width, height });
        for (const cls of ['scout', 'tank', 'engineer']) {
            await click(`.class-tab[data-class="${cls}"]`);
            const sidebar = await page.locator('.armory-controls-sidebar').evaluate((e) => {
                const rect = e.getBoundingClientRect();
                return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
                    excessX: e.scrollWidth - e.clientWidth, excessY: e.scrollHeight - e.clientHeight };
            });
            check(sidebar.excessX <= 1 && sidebar.excessY <= 1, `${cls} ${width}x${height}: sidebar overflow ${JSON.stringify(sidebar)}`);
            for (const field of ['weapon','sheen','charm','mod1','mod2','chassis','decal']) {
                await click(`#armory-slot-${field}`);
                await page.locator('#armory-picker-grid').waitFor();
                await page.locator('#armory-picker-grid').evaluate(async (e) => {
                    await Promise.all([...e.querySelectorAll('img')].map((img) => img.decode()));
                });
                const layout = await page.locator('#armory-picker-modal').evaluate((modal) => {
                    const grid = modal.querySelector('#armory-picker-grid');
                    const content = modal.querySelector('.modal-content');
                    const rect = content.getBoundingClientRect();
                    const cards = [...grid.querySelectorAll('button')].map((c) => ({ w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height }));
                    return { rect: rect.toJSON(), cards, overflow: [grid.scrollWidth-grid.clientWidth, grid.scrollHeight-grid.clientHeight,
                        content.scrollWidth-content.clientWidth, content.scrollHeight-content.clientHeight] };
                });
                check(layout.overflow.every((v) => v <= 1), `${cls}/${field} overflow: ${JSON.stringify(layout)}`);
                check(layout.rect.x >= 0 && layout.rect.y >= 0 && layout.rect.right <= width && layout.rect.bottom <= height,
                    `${cls}/${field}: dialog outside viewport`);
                check(new Set(layout.cards.map((c) => `${c.w}x${c.h}`)).size === 1, `${cls}/${field}: unequal cards ${JSON.stringify(layout.cards)}`);
                matrix.push({ width, height, cls, field, sidebar, ...layout });
                if (width === 1431 && cls === 'engineer' && ['weapon','chassis','charm','sheen'].includes(field)) {
                    await page.screenshot({ path: `${output}/${field}-locked-1431.png` });
                }
                if (field === 'weapon') {
                    const before = await page.evaluate(() => JSON.stringify(window.loadout.state));
                    const locked = page.locator('#armory-picker-grid .is-locked').first();
                    if (await locked.count()) {
                        await locked.dispatchEvent('click');
                        check(await page.evaluate(() => JSON.stringify(window.loadout.state)) === before, 'Locked weapon changed loadout');
                    }
                }
                await page.keyboard.press('Escape');
                check(await page.evaluate((key) => document.activeElement.id === `armory-slot-${key}`, field), 'Escape did not restore slot focus');
            }
            if (width === 1280) await page.screenshot({ path: `${output}/${cls}-${width}x${height}.png` });
        }
    }
    await page.setViewportSize({ width: 1431, height: 781 });
    await click('.class-tab[data-class="engineer"]');
    await click('#armory-debug-unlock-skins-btn');
    for (const [field, value] of [['weapon','4103'],['sheen','sheen:7'],['charm','4138'],['mod1','4142'],['decal','2003']]) {
        await click(`#armory-slot-${field}`);
        await click(`#armory-picker-grid [data-value="${value}"]`);
    }
    await click('.class-tab[data-class="scout"]');
    await click('.class-tab[data-class="engineer"]');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${output}/fitted-engineer-1431.png` });
    for (const field of ['weapon','chassis','charm','mod1','decal','sheen']) {
        await click(`#armory-slot-${field}`);
        await page.locator('#armory-picker-grid').evaluate(async (e) => Promise.all([...e.querySelectorAll('img')].map((img) => img.decode())));
        await page.screenshot({ path: `${output}/${field}-unlocked-1431.png` });
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Tab');
        check(await page.evaluate(() => document.querySelector('#armory-picker-modal').contains(document.activeElement)), 'Focus escaped picker');
        await page.keyboard.press('Escape');
    }
    const fitted = await page.evaluate(() => ({ loadout: window.loadout.getClassLoadout('engineer'), sheen: localStorage.getItem('hb_weapon_sheen_selected_v1') }));
    check(fitted.loadout.weaponSkinId === '4103' && fitted.loadout.charmId === '4138' && fitted.sheen === '7', 'Fitted items did not persist across classes');
    await click('#armory-btn-embark');
    await click('#net-mode-solo-btn');
    await click('#net-deploy-btn');
    await page.locator('#global-skip-intro-btn').waitFor({ state: 'visible', timeout: 30000 });
    await click('#global-skip-intro-btn');
    await page.waitForFunction(() => window.game?.player3dOverlay?.weapon, { timeout: 60000 });
    const deployed = await page.evaluate(() => {
        window.game.godMode = true;
        const weapon = window.game.player3dOverlay.weapon;
        return { name: weapon.name, sheen: weapon.userData.weaponSheen, charmMounted: Boolean(weapon.userData.charmSocket?.children.length) };
    });
    check(deployed.charmMounted, 'The fitted charm was not mounted on deployment');
    check(deployed.sheen === '#ff6262' && deployed.name.includes('skin4103'), 'Deployment differs from the fitted weapon or sheen');
    await page.screenshot({ path: `${output}/deployed-sheen-1431.png` });
    await page.reload();
    await page.locator('#title-newrun-btn').waitFor();
    const afterReload = await page.evaluate(async () => {
        const { getSelectedSheen } = await import('/src/weaponSheens.js');
        return getSelectedSheen().id;
    });
    check(afterReload === 7, 'Weapon sheen did not survive reload');
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, errors, fitted, deployed, afterReload, matrix }, null, 2));
    check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    console.log(`PASS: ${matrix.length} picker layouts; all classes; locked refusal; item art; keyboard focus; fitted items.`);
} catch (error) {
    await page.screenshot({ path: `${output}/failure.png` });
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: false, failure: error.message, errors, matrix }, null, 2));
    console.error(error);
    process.exitCode = 1;
} finally { await browser.close(); }
