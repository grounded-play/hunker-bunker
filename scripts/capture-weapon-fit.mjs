/* global console, process */
// Weapon fit check: every class gun and weapon finish, rendered with the
// Armory's own scene (src/armoryScene.js) -- the operator holding it and the
// bench close-up side by side, so a gun that faces backwards, floats off the
// hand or swaps model between the two views shows up at a glance.
//
//   node scripts/capture-weapon-fit.mjs [baseUrl] [class...]
//       -> fit-out/weapons/<class>/<archetype>-<finish>-{idle,aim}.png and a
//          contact sheet fit-out/weapons/<class>.png (needs ffmpeg): the hand
//          at rest, the aim pose and the bench, per gun
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
// The Armory's own turn (armoryScene.js) unless FIT_YAW overrides it.
const YAW = Number(process.env.FIT_YAW ?? 0.35);
// FIT_ONLY=talon-4105,talon_c-base narrows a run.
const ONLY = process.env.FIT_ONLY ? new Set(process.env.FIT_ONLY.split(',')) : null;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', args: ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const DSF = 2;
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: DSF });
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
            if (ONLY && !ONLY.has(`${archetype}-${finish ?? 'base'}`)) continue;
            await page.evaluate(async ([arch, skin, sheen, yaw]) => {
                const scene = window.__fit.scene;
                if (sheen !== null) scene.setWeaponSheen(sheen);
                await scene.setWeapon(arch, skin);
                scene.setOperatorYaw(yaw);
                // Muzzle to the right, as the operator would hold it.
                scene.pinBenchYaw(0);
            }, [archetype, finish, SHEEN, YAW]);
            const base = path.join(dir, `${archetype}-${finish ?? 'base'}`);
            for (const [pose, state] of [['idle', 'ARMED_IDLE'], ['aim', 'AIM_READY']]) {
                await page.evaluate((st) => window.__fit.scene.holdPresentation(st), state);
                await page.waitForTimeout(1500);
                await page.screenshot({ path: `${base}-${pose}.png` });
            }
            shots.push(base);
            console.log(`${cls} ${archetype} ${finish ?? 'base'}`);
        }
    }
    // Contact sheet, two guns per row: hand at rest, aim pose, bench.
    const crop = (x, y, w, h) => `crop=${w * DSF}:${h * DSF}:${x * DSF}:${y * DSF}`;
    const inputs = shots.flatMap((b) => ['-i', `${b}-idle.png`, '-i', `${b}-aim.png`]);
    const cellW = 200 + 240 + 400;
    const cellH = 280;
    // Where the right hand is at rest and in the aim (CSS px); the Tank is wider.
    const hands = cls === 'tank'
        ? { idle: [30, 300, 200, 280], aim: [60, 30, 240, 280] }
        : { idle: [130, 250, 200, 280], aim: [110, 110, 240, 280] };
    const cells = shots.map((b, i) => [
        `[${2 * i}:v]split[i${i}][j${i}]`,
        `[i${i}]${crop(...hands.idle)},scale=200:280[h${i}]`,
        `[${2 * i + 1}:v]${crop(...hands.aim)},scale=240:280[a${i}]`,
        `[j${i}]${crop(300, 40, 560, 340)},scale=400:243,pad=400:280:0:18[b${i}]`,
        `[h${i}][a${i}][b${i}]hstack=3,drawtext=text='${path.basename(b)}':x=6:y=4:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[c${i}]`
    ].join(';'));
    const cols = 2;
    const rows = Math.ceil(shots.length / cols);
    const pads = [];
    for (let i = shots.length; i < rows * cols; i++) pads.push(`color=c=black:s=${cellW}x${cellH}:d=1[c${i}]`);
    const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * cellW}_${Math.floor(i / cols) * cellH}`).join('|');
    const graph = [...cells, ...pads, `${Array.from({ length: rows * cols }, (_, i) => `[c${i}]`).join('')}xstack=inputs=${rows * cols}:layout=${layout}`].join(';');
    try {
        execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', graph, '-frames:v', '1', path.join(outDir, `${cls}.png`)]);
    } catch (error) {
        console.warn('contact sheet skipped:', error.message);
    }
}
await browser.close();
