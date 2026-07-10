import puppeteer from 'puppeteer-core';
const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('hunker_audio_mix_v1', JSON.stringify({ master: 0, music: 0, vfx: 0 }));
});
await page.goto('http://localhost:5200/', { waitUntil: 'networkidle2' });
await sleep(1500);
await page.mouse.click(640, 400);
await sleep(2500);
const probe = async (label) => {
    const r = await page.evaluate(() => ({
        mix: window.state?.settings?.audioMix,
        stored: localStorage.getItem('hunker_audio_mix_v1'),
        legacy: localStorage.getItem('hunker_audio_enabled'),
        sliders: ['audio-master-slider', 'audio-music-slider', 'audio-vfx-slider']
            .map((id) => document.getElementById(id)?.value),
        gains: (() => {
            const AM = window.AudioManager;
            if (!AM) return 'no-AM';
            return {
                master: AM.masterGain?.gain?.value?.toFixed?.(3),
                music: AM.musicGain?.gain?.value?.toFixed?.(3),
                vfx: AM.sfxGain?.gain?.value?.toFixed?.(3),
                world: AM.worldGain?.gain?.value?.toFixed?.(3),
                ctxState: AM.masterGain?.context?.state
            };
        })()
    }));
    console.log(label, JSON.stringify(r));
};
await probe('after loader click:');
await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
await sleep(4000);
await probe('at menu:');
// open settings then mixer
await page.evaluate(() => document.querySelector('.open-settings-btn')?.click());
await sleep(800);
await page.evaluate(() => document.getElementById('open-audio-mixer')?.click());
await sleep(800);
await probe('mixer open:');
await browser.close();
