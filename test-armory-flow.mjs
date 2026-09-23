/* global console, document */
import { chromium } from 'playwright';

async function testFlow() {
    const browser = await chromium.launch({ headless: true, executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[PAGE ERROR]', err));

    console.log('Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('domcontentloaded');

    // Boot
    await page.locator('body').click();
    await page.waitForTimeout(1000);

    const splash = page.locator('#splash');
    console.log('Splash visible:', await splash.isVisible());

    // Click new run
    await page.locator('#title-newrun-btn').click();
    await page.waitForTimeout(1000);

    const menu = page.locator('#menu');
    console.log('Menu visible:', await menu.isVisible());
    console.log('Active element on menu:', await page.evaluate(() => document.activeElement?.id || document.activeElement?.className));

    // Check #start-game position & visibility
    const startGame = page.locator('#start-game');
    console.log('#start-game text:', await startGame.textContent());
    console.log('#start-game visible:', await startGame.isVisible());
    console.log('#start-game rect:', await startGame.boundingBox());

    // Click ENTER ARMORY (#start-game)
    console.log('Clicking #start-game...');
    await startGame.click();
    await page.waitForTimeout(2500);

    const armory = page.locator('#armory-screen');
    console.log('Armory visible:', await armory.isVisible());
    console.log('Menu visible after armory open:', await menu.isVisible());
    console.log('#start-game visible while armory is open:', await startGame.isVisible());
    console.log('#start-game rect while armory is open:', await startGame.boundingBox());
    console.log('Element at bottom right (1100, 750):', await page.evaluate(() => {
        const el = document.elementFromPoint(1100, 750);
        return el ? `${el.tagName}#${el.id}.${el.className}` : null;
    }));

    // Check embark button in armory
    const embarkBtn = page.locator('#armory-btn-embark');
    console.log('Armory embark btn visible:', await embarkBtn.isVisible());
    console.log('Armory embark btn rect:', await embarkBtn.boundingBox());

    // Try clicking armory embark button
    console.log('Clicking at armory embark button position...');
    const embarkBox = await embarkBtn.boundingBox();
    if (embarkBox) {
        console.log('Element directly at center of embark box:', await page.evaluate((box) => {
            const el = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return el ? `${el.tagName}#${el.id}.${el.className}` : null;
        }, embarkBox));
    }

    // Try clicking return to main menu (#armory-btn-back)
    const backBtn = page.locator('#armory-btn-back');
    console.log('Back btn visible:', await backBtn.isVisible());
    console.log('Back btn rect:', await backBtn.boundingBox());
    console.log('Clicking back button...');
    await backBtn.click();
    await page.waitForTimeout(2500);

    console.log('After clicking back: Armory visible:', await armory.isVisible());
    console.log('After clicking back: Menu visible:', await menu.isVisible());

    await browser.close();
}

testFlow().catch(console.error);
