/* global console, process */
// Equipment fit check (Sprint 51): how every Rig Module sits on every
// chassis, rendered with the Armory's own scene (src/armoryScene.js).
//
//   node scripts/capture-equipment-fit.mjs measure [baseUrl]
//       -> fit-out/metrics.json: each chassis's size and skeleton spans
//   node scripts/capture-equipment-fit.mjs capture [baseUrl] [class...]
//       -> fit-out/<class>/<chassis>.png: front and back, every module pair
//
// Run against a dev server serving the current source (npm run dev). Output
// goes to $FIT_OUT (default: ./fit-out, git-ignored scratch).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [mode = 'measure', baseUrl = 'http://localhost:5173', ...classArgs] = process.argv.slice(2);
const outDir = path.resolve(process.env.FIT_OUT ?? 'fit-out');
const CLASSES = classArgs.length ? classArgs : ['scout', 'tank', 'engineer'];
// Each pair puts two modules on different mounts, so 8 shots cover all 16.
const ALL_PAIRS = [[4140, 4141], [4142, 4144], [4143, 4145], [4146, 4147], [4160, 4161], [4162, 4163], [4164, 4165], [4166, 4167]];
// FIT_PAIRS=4140-4141,4143-4145 and FIT_VIEWS=front narrow a run.
const MOD_PAIRS = process.env.FIT_PAIRS
    ? ALL_PAIRS.filter(([a, b]) => process.env.FIT_PAIRS.split(',').includes(`${a}-${b}`))
    : ALL_PAIRS;
const VIEWS = [['front', 0], ['back', Math.PI]].filter(([view]) => !process.env.FIT_VIEWS || process.env.FIT_VIEWS.split(',').includes(view));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const blank = `${baseUrl}/__equipment_fit__.html`;
await page.route(blank, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><body style="margin:0;background:#11161b"><canvas id="c" style="width:1280px;height:800px;display:block"></canvas></body>'
}));
await page.goto(blank);
await page.evaluate(async () => {
    const { createArmoryScene } = await import('/src/armoryScene.js');
    const { CLASS_CHASSIS_SKINS } = await import('/src/data/classArsenal.js');
    window.__fit = { scene: await createArmoryScene(document.getElementById('c')), chassis: CLASS_CHASSIS_SKINS };
});

const settle = (ms = 700) => page.waitForTimeout(ms);

async function measure(cls, chassis) {
    return page.evaluate(async ({ cls, chassis }) => {
        const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
        const { scene } = window.__fit;
        await scene.setClass(cls, chassis);
        const root = scene.getOperatorRoot();
        if (!root) return null;
        root.updateMatrixWorld(true);
        const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
        const bone = (suffix) => {
            let found = null;
            root.traverse((o) => { if (!found && o.isBone && o.name.endsWith(suffix)) found = o; });
            return found ? found.getWorldPosition(new THREE.Vector3()) : null;
        };
        const span = (a, b) => (a && b ? a.distanceTo(b) : null);
        return {
            height: size.y, width: size.x, depth: size.z,
            shoulders: span(bone('LeftArm'), bone('RightArm')),
            torso: span(bone('Hips'), bone('Neck') ?? bone('Head'))
        };
    }, { cls, chassis });
}

if (mode === 'measure') {
    const chassisByClass = await page.evaluate(() => window.__fit.chassis);
    const metrics = {};
    for (const cls of CLASSES) {
        for (const chassis of [null, ...(chassisByClass[cls] ?? [])]) {
            const key = `${cls}:${chassis ?? 'default'}`;
            metrics[key] = await measure(cls, chassis).catch((error) => ({ error: String(error) }));
            console.log(key, JSON.stringify(metrics[key]));
        }
    }
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
} else {
    const chassisByClass = await page.evaluate(() => window.__fit.chassis);
    const only = process.env.FIT_CHASSIS ? process.env.FIT_CHASSIS.split(',') : null;
    for (const cls of CLASSES) {
        const dir = path.join(outDir, cls);
        fs.mkdirSync(dir, { recursive: true });
        for (const chassis of [null, ...(chassisByClass[cls] ?? [])]) {
            const name = chassis ?? 'default';
            if (only && !only.includes(name)) continue;
            await page.evaluate(({ cls, chassis }) => window.__fit.scene.setClass(cls, chassis), { cls, chassis });
            for (const [a, b] of MOD_PAIRS) {
                await page.evaluate(async ({ a, b }) => {
                    await window.__fit.scene.setRigModule(1, String(a));
                    await window.__fit.scene.setRigModule(2, String(b));
                }, { a, b });
                for (const [view, yaw] of VIEWS) {
                    await page.evaluate((y) => window.__fit.scene.setOperatorYaw(y), yaw);
                    await settle(350);
                    await page.locator('#c').screenshot({ path: path.join(dir, `${name}__${a}-${b}__${view}.png`) });
                }
            }
            console.log(`[fit] ${cls} ${name}`);
        }
    }
}
await browser.close();
