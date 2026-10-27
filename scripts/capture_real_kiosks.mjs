import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function capture() {
    console.log('Launching Chromium...');
    const browser = await chromium.launch({
        headless: true,
        channel: 'chrome',
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist']
    });

    const targets = [
        { name: 'deck', width: 1280, height: 800 },
        { name: 'pc', width: 1920, height: 1080 }
    ];

    for (const target of targets) {
        console.log(`\n--- Capturing for ${target.name} (${target.width}x${target.height}) ---`);
        const context = await browser.newContext({
            viewport: { width: target.width, height: target.height },
            deviceScaleFactor: 1
        });
        const page = await context.newPage();

        await page.addInitScript(() => {
            localStorage.setItem('hb_world_memory_v1', JSON.stringify({ logsFound: ['A01', 'A02'] }));
            window.electronAPI = new Proxy({}, {
                get(_t, prop) {
                    if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                    return () => Promise.resolve({ ok: true });
                }
            });
        });

        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);

        // 1. Fabrication Auto-Mart
        console.log('Opening Fabrication Auto-Mart...');
        await page.evaluate(() => {
            // Unhide modal and trigger kiosk presentation
            const modal = document.getElementById('fabrication-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.setAttribute('aria-hidden', 'false');
            }
            if (window.fabricationBay?.render) {
                window.fabricationBay.render();
            }
        });
        await page.waitForTimeout(1000);
        const fabPath = path.join(OUT_DIR, `${target.name}_fabrication_automart.png`);
        await page.screenshot({ path: fabPath });
        console.log(`Saved: ${fabPath}`);

        // Close Fabrication
        await page.evaluate(() => {
            document.getElementById('fabrication-modal')?.classList.add('hidden');
        });
        await page.waitForTimeout(300);

        // 2. Sector 0 Console Terminal
        console.log('Opening Sector 0 Console Terminal...');
        await page.evaluate(() => {
            const modal = document.getElementById('console-terminal-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.setAttribute('aria-hidden', 'false');
            }
        });
        await page.waitForTimeout(1000);
        const consolePath = path.join(OUT_DIR, `${target.name}_console_kiosk.png`);
        await page.screenshot({ path: consolePath });
        console.log(`Saved: ${consolePath}`);

        // Close Console
        await page.evaluate(() => {
            document.getElementById('console-terminal-modal')?.classList.add('hidden');
        });
        await page.waitForTimeout(300);

        // 3. Black-Ice 21 Arcade Cabinet
        console.log('Opening Black-Ice 21 Arcade...');
        await page.evaluate(() => {
            if (window.arcadeCabinet?.open) {
                window.arcadeCabinet.open();
            } else {
                // Ensure overlay DOM is revealed
                const overlay = document.getElementById('arcade-blackjack-overlay');
                if (overlay) {
                    overlay.classList.remove('hidden');
                }
            }
        });
        await page.waitForTimeout(1000);
        const arcadePath = path.join(OUT_DIR, `${target.name}_blackice_arcade.png`);
        await page.screenshot({ path: arcadePath });
        console.log(`Saved: ${arcadePath}`);

        // Close Arcade
        await page.evaluate(() => {
            if (window.arcadeCabinet?.close) window.arcadeCabinet.close();
            document.getElementById('arcade-blackjack-overlay')?.classList.add('hidden');
        });
        await page.waitForTimeout(300);

        // 4. Armory Workbench
        console.log('Opening Armory Screen...');
        await page.evaluate(() => {
            const armory = document.getElementById('armory-screen');
            if (armory) {
                armory.classList.remove('hidden');
            }
        });
        await page.waitForTimeout(1000);
        const armoryPath = path.join(OUT_DIR, `${target.name}_armory_workbench.png`);
        await page.screenshot({ path: armoryPath });
        console.log(`Saved: ${armoryPath}`);

        await context.close();
    }

    await browser.close();
    console.log('\nAll real in-game screenshots captured successfully!');
}

capture().catch((err) => {
    console.error('Capture failed:', err);
    process.exit(1);
});
