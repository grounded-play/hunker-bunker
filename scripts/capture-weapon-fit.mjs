/* global console, process */
// Weapon fit check: every class gun and weapon finish, rendered with the
// Armory's own scene (src/armoryScene.js) -- the operator holding it and the
// bench close-up side by side, so a gun that faces backwards, floats off the
// hand or swaps model between the two views shows up at a glance.
//
//   node scripts/capture-weapon-fit.mjs [baseUrl] [class...]
//       -> fit-out/weapons/<class>/<archetype>-<finish>.png and a contact sheet
//          fit-out/weapons/<class>.png (needs ffmpeg)
//
// Run against a dev server serving the current source (npm run dev). Output
// goes to $FIT_OUT (default: ./fit-out, git-ignored scratch). FIT_SHEEN=ff3030
// tints every gun, to check that a sheen keeps the paintwork.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [baseUrl = 'http://localhost:5173', ...classArgs] = process.argv.slice(2);
const outDir = path.resolve(process.env.FIT_OUT ?? 'fit-out', 'weapons');
const CLASSES = classArgs.length ? classArgs : ['scout', 'tank', 'engineer'];
const SHEEN = process.env.FIT_SHEEN ? parseInt(process.env.FIT_SHEEN, 16) : null;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', args: ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (error) => console.warn('pageerror', error.message));
const blank = `${baseUrl}/__weapon_fit__.html`;
await page.route(blank, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><body style="margin:0;background:#11161b"><canvas id="c" style="width:1280px;height:800px;display:block"></canvas></body>'
}));
await page.goto(blank);
const arsenal = await page.evaluate(async () => {
    const { createArmoryScene } = await import('/src/armoryScene.js');
    const { CLASS_ARCHETYPES, ARCHETYPE_SKINS } = await import('/src/data/classArsenal.js');
    window.__fit = { scene: await createArmoryScene(document.getElementById('c')) };
    return { archetypes: CLASS_ARCHETYPES, skins: ARCHETYPE_SKINS };
});

for (const cls of CLASSES) {
    const dir = path.join(outDir, cls);
    fs.mkdirSync(dir, { recursive: true });
    await page.evaluate((c) => window.__fit.scene.setClass(c.toUpperCase()), cls);
    const shots = [];
    for (const archetype of arsenal.archetypes[cls]) {
        for (const finish of [null, ...(arsenal.skins[archetype] ?? [])]) {
            await page.evaluate(async ([arch, skin, sheen]) => {
                const scene = window.__fit.scene;
                if (sheen !== null) scene.setWeaponSheen(sheen);
                await scene.setWeapon(arch, skin);
                // Side-on: the muzzle should point away from the operator.
                scene.setOperatorYaw(-Math.PI / 2);
            }, [archetype, finish, SHEEN]);
            await page.waitForTimeout(400);
            const file = path.join(dir, `${archetype}-${finish ?? 'base'}.png`);
            await page.screenshot({ path: file });
            shots.push(file);
            console.log(`${cls} ${archetype} ${finish ?? 'base'}`);
        }
    }
    // Contact sheet: operator and bench, four per row, labelled.
    const inputs = shots.flatMap((f) => ['-i', f]);
    const cells = shots.map((f, i) => `[${i}:v]crop=1040:620:120:120,scale=520:310,drawtext=text='${path.basename(f, '.png')}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[c${i}]`);
    const cols = 4;
    const rows = Math.ceil(shots.length / cols);
    const pads = [];
    for (let i = shots.length; i < rows * cols; i++) pads.push(`color=c=black:s=520x310:d=1[c${i}]`);
    const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * 520}_${Math.floor(i / cols) * 310}`).join('|');
    const graph = [...cells, ...pads, `${Array.from({ length: rows * cols }, (_, i) => `[c${i}]`).join('')}xstack=inputs=${rows * cols}:layout=${layout}`].join(';');
    try {
        execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', graph, '-frames:v', '1', path.join(outDir, `${cls}.png`)]);
    } catch (error) {
        console.warn('contact sheet skipped:', error.message);
    }
}
await browser.close();
