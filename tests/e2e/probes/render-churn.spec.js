import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Why does three re-check shader programs and re-upload textures every frame?
// Counts, per frame: materials whose version moved (needsUpdate), textures
// whose version moved (re-upload), and the light set (a changed light count
// or shadow set makes every lit material re-resolve its program).
const OUT = process.env.HB_PROBE_OUT || '/tmp';
const LABEL = process.env.HB_PROBE_LABEL || 'run';

test('render churn', async ({ page }) => {
    test.setTimeout(900_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => { window.game.setGodMode?.(true); });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(3000);
    const result = await page.evaluate(() => new Promise((resolve) => {
        const g = window.game;
        const matVersions = new Map();
        const texVersions = new Map();
        const frames = [];
        const matKeys = ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap', 'envMap'];
        const where = (o) => { let p = o; while (p) { const t = p.userData?.type || p.userData?.world3dModelType || (p.userData?.isWall ? 'wall' : null) || p.name; if (t) return String(t).slice(0, 40); p = p.parent; } return '?'; };
        const matWho = {}; const texWho = {};
        let n = 0;
        const sample = () => {
            let matChanged = 0; let texChanged = 0; const lights = { point: 0, spot: 0, dir: 0, shadow: 0, ambient: 0, hemi: 0 };
            g.scene.traverse((o) => {
                if (o.isLight) {
                    if (!o.visible) return;
                    let vis = true; let p = o.parent; while (p) { if (!p.visible) { vis = false; break; } p = p.parent; }
                    if (!vis) return;
                    if (o.isPointLight) lights.point += 1; else if (o.isSpotLight) lights.spot += 1; else if (o.isDirectionalLight) lights.dir += 1; else if (o.isAmbientLight) lights.ambient += 1; else if (o.isHemisphereLight) lights.hemi += 1;
                    if (o.castShadow) lights.shadow += 1;
                }
                const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
                for (const m of mats) {
                    const prev = matVersions.get(m);
                    if (prev !== undefined && prev !== m.version) { matChanged += 1; const w = `${m.type}:${where(o)}`; matWho[w] = (matWho[w] ?? 0) + 1; }
                    matVersions.set(m, m.version);
                    for (const k of matKeys) {
                        const t = m[k]; if (!t) continue;
                        const tp = texVersions.get(t);
                        if (tp !== undefined && tp !== t.version) { texChanged += 1; const w = `${k}:${t.constructor?.name}:${t.image?.width ?? '?'}x${t.image?.height ?? '?'}:${where(o)}`; texWho[w] = (texWho[w] ?? 0) + 1; }
                        texVersions.set(t, t.version);
                    }
                    for (const u of Object.values(m.uniforms ?? {})) {
                        const t = u?.value; if (!t?.isTexture) continue;
                        const tp = texVersions.get(t);
                        if (tp !== undefined && tp !== t.version) { texChanged += 1; const w = `uniform:${t.constructor?.name}:${t.image?.width ?? '?'}x${t.image?.height ?? '?'}:${where(o)}`; texWho[w] = (texWho[w] ?? 0) + 1; }
                        texVersions.set(t, t.version);
                    }
                }
            });
            frames.push({ matChanged, texChanged, lights: JSON.stringify(lights), info: { calls: g.renderer.info.render.calls, programs: g.renderer.info.programs?.length } });
            n += 1;
            if (n < 90) requestAnimationFrame(sample);
            else {
                const lightSets = {};
                for (const f of frames) lightSets[f.lights] = (lightSets[f.lights] ?? 0) + 1;
                let lightChanges = 0;
                for (let i = 1; i < frames.length; i += 1) if (frames[i].lights !== frames[i - 1].lights) lightChanges += 1;
                resolve({
                    frames: frames.length,
                    matChangedPerFrame: frames.reduce((a, f) => a + f.matChanged, 0) / frames.length,
                    texChangedPerFrame: frames.reduce((a, f) => a + f.texChanged, 0) / frames.length,
                    lightChanges, lightSets,
                    matWho: Object.entries(matWho).sort((a, b) => b[1] - a[1]).slice(0, 25),
                    texWho: Object.entries(texWho).sort((a, b) => b[1] - a[1]).slice(0, 25),
                    lastInfo: frames.at(-1).info
                });
            }
        };
        requestAnimationFrame(sample);
    }));
    await page.keyboard.up('KeyW');
    fs.writeFileSync(`${OUT}/render-churn-${LABEL}.json`, JSON.stringify(result, null, 1));
});
