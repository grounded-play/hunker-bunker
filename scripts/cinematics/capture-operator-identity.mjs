/* global console, process */
// Nine-view identity pack of an equipped operator, rendered with the Armory's
// own scene (src/armoryScene.js), so every cinematic reference matches the
// game exactly. Spec: scripts/cinematics/operator-identity-capture-spec.json;
// plan: docs/planning/armory-opening-identity-capture-2026-10-27.md.
//
//   node scripts/cinematics/capture-operator-identity.mjs [baseUrl] [fixture.json]
//
// Without a fixture it captures the factory look of Scout, Tank and Engineer.
// A fixture is a list of appearances: { classId, chassisSkinId, weaponArchetypeId,
// weaponSkinId, operatorPolishId, weaponSheenId, charmId, decalId, mod1Id, mod2Id }.
// Output per appearance: art/source/cinematics/operator-identities/<hash>/
// (nine PNGs, identity_sheet_3x3.png, armory_departure_first.png,
// armory_departure_empty.png, identity.json). Run against a dev server.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { DEFAULT_ARCHETYPES } from '../../src/data/classArsenal.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/cinematics/operator-identity-capture-spec.json'), 'utf8'));
const OUT = path.join(ROOT, 'art/source/cinematics/operator-identities');
const CAPTURE_RIG_VERSION = 1;
const [baseUrl = 'http://localhost:5173', fixturePath] = process.argv.slice(2);
const [width, height] = SPEC.capture.resolution;

const appearances = fixturePath
    ? JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
    : ['scout', 'tank', 'engineer'].map((classId) => ({ classId, weaponArchetypeId: DEFAULT_ARCHETYPES[classId] }));

/** The canonical signature (spec `appearanceSignature`) and its short hash. */
export function appearanceSignature(look) {
    const signature = {};
    for (const key of SPEC.appearanceSignature) signature[key] = look[key] ?? null;
    signature.captureRigVersion = CAPTURE_RIG_VERSION;
    const hash = crypto.createHash('sha1').update(JSON.stringify(signature)).digest('hex').slice(0, 12);
    return { signature, hash };
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const page = await browser.newPage({ viewport: { width, height } });
const blank = `${baseUrl}/__operator_identity__.html`;
await page.route(blank, (route) => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><body style="margin:0;background:#808080"><canvas id="c" style="width:${width}px;height:${height}px;display:block"></canvas></body>`
}));
await page.goto(blank);
await page.evaluate(async () => {
    const { createArmoryScene } = await import('/src/armoryScene.js');
    const { OPERATOR_POLISHES } = await import('/src/operatorPolishes.js');
    const { WEAPON_SHEENS } = await import('/src/weaponSheens.js');
    window.__id = { scene: await createArmoryScene(document.getElementById('c')), OPERATOR_POLISHES, WEAPON_SHEENS };
});
const settle = (ms) => page.waitForTimeout(ms);
const shot = (file) => page.screenshot({ path: file });

for (const look of appearances) {
    const { signature, hash } = appearanceSignature(look);
    const dir = path.join(OUT, hash);
    fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(async (look) => {
        const { scene, OPERATOR_POLISHES, WEAPON_SHEENS } = window.__id;
        scene.resetDeparture();
        await scene.setClass(look.classId, look.chassisSkinId ?? null);
        await scene.setWeapon(look.weaponArchetypeId, look.weaponSkinId ?? null);
        await scene.setCharm(look.charmId ?? null);
        scene.setDecal(look.decalId ?? null);
        await scene.setRigModule(1, look.mod1Id ?? null);
        await scene.setRigModule(2, look.mod2Id ?? null);
        const polish = OPERATOR_POLISHES.find((entry) => entry.id === look.operatorPolishId) ?? OPERATOR_POLISHES[0];
        const sheen = WEAPON_SHEENS.find((entry) => entry.id === look.weaponSheenId) ?? WEAPON_SHEENS[0];
        scene.setOperatorPolish(polish.color);
        scene.setWeaponSheen(sheen.color);
        scene.holdPresentation('ARMED_IDLE');
    }, look);
    await settle(1500);

    // The departure endpoints at 16:9 over the class's Armory backdrop, framed
    // as the departure plays it (sidebar gone, bench gun off): no UI at all.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate((cls) => {
        document.body.style.background = `radial-gradient(circle at 50% 50%, rgba(6, 11, 19, 0.15) 0%, rgba(6, 11, 19, 0.55) 75%, rgba(6, 11, 19, 0.88) 100%), url('/ui/armory_bg_${cls}.jpg') center / cover no-repeat`;
        const canvas = document.getElementById('c');
        canvas.style.width = '1920px';
        canvas.style.height = '1080px';
        window.__id.scene.resize();
        window.__id.scene.setCaptureCamera('departure');
    }, look.classId);
    // Bench gun off, the operator still in their Armory pose (the departure's first frame).
    await page.evaluate(() => window.__id.scene.setBenchVisible(false));
    await settle(400);
    await shot(path.join(dir, 'armory_departure_first.png'));
    await page.evaluate(() => { const root = window.__id.scene.getOperatorRoot(); if (root) root.visible = false; });
    await settle(200);
    await shot(path.join(dir, 'armory_departure_empty.png'));
    await page.evaluate(() => window.__id.scene.resetDeparture());
    await page.setViewportSize({ width, height });
    await page.evaluate(({ width, height }) => {
        document.body.style.background = '#808080';
        const canvas = document.getElementById('c');
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        window.__id.scene.resize();
    }, { width, height });

    // The nine views on flat grey under neutral light.
    await page.evaluate(() => { window.__id.scene.setCinematicCaptureMode(true); window.__id.scene.holdPresentation('ARMED_IDLE'); });
    const files = [];
    for (const view of SPEC.views) {
        const rear = view.id === 'rear_over_shoulder';
        await page.evaluate(({ rear, yaw }) => {
            window.__id.scene.setCaptureCamera(rear ? 'rear-over-shoulder' : 'turntable');
            window.__id.scene.setOperatorYaw(rear ? 0 : yaw);
        }, { rear, yaw: (view.operatorYawDeg * Math.PI) / 180 });
        await settle(SPEC.capture.settleFrames * 200);
        const file = path.join(dir, `${view.id}.png`);
        await shot(file);
        files.push(file);
    }
    await page.evaluate(() => window.__id.scene.setCinematicCaptureMode(false));

    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap((file) => ['-i', file]), '-filter_complex',
        `${files.map((_, i) => `[${i}]scale=512:512[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=9:grid=3x3`,
        path.join(dir, 'identity_sheet_3x3.png')]);
    fs.writeFileSync(path.join(dir, 'identity.json'), `${JSON.stringify({
        hash, signature, views: SPEC.views.map((view) => `${view.id}.png`), capturedAt: new Date().toISOString(), baseUrl
    }, null, 2)}\n`);
    console.log(`[identity] ${look.classId} ${hash} -> ${path.relative(ROOT, dir)}`);
}
await browser.close();
