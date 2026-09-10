import { chromium } from '@playwright/test';
import fs from 'node:fs';

const output = process.env.COHERENCE_OUTPUT || 'test-results/expedition-coherence';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1431, height: 781 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const check = (condition, message) => { if (!condition) throw new Error(message); };
try {
    await page.goto(process.env.COHERENCE_ORIGIN || 'http://127.0.0.1:5186');
    await page.locator('#title-newrun-btn').waitFor({ state: 'visible', timeout: 90000 });
    await page.click('#title-newrun-btn');
    await page.getByRole('button', { name: 'CONFIRM CALLSIGN & DEPLOY' }).click();
    await page.click('#start-game');
    await page.locator('#armory-slot-weapon').waitFor();
    await page.click('#armory-btn-embark');
    await page.click('#net-mode-solo-btn');
    await page.click('#net-deploy-btn');
    await page.locator('#global-skip-intro-btn').waitFor({ state: 'visible', timeout: 60000 });
    await page.click('#global-skip-intro-btn');
    await page.waitForFunction(() => window.game?.player3dOverlay, { timeout: 60000 });
    await page.waitForFunction(() => window.game?.isGameplayInputActive?.() && !document.querySelector('#transition-overlay')?.classList.contains('visible'), { timeout: 90000 });
    const runtime = await page.evaluate(async () => {
        const game = window.game;
        game.godMode = true;
        const { SUIT_RELICS } = await import('http://127.0.0.1:5186/src/runDrops.js');
        const item = SUIT_RELICS.find((r) => r.id === 'punctured_lung');
        game.resetRunDrops();
        game.resetVitalsForRun({ emit: false });
        const baseline = game.playerVitals.maxO2;
        game.equipRunDrop(item);
        const reduced = game.playerVitals.maxO2;
        game.equipRunDrop(item);
        const duplicate = game.playerVitals.maxO2;
        game.spawnPhysicalLootDrop(game.player.position.x + 1.5, game.player.position.z, SUIT_RELICS.find((r) => r.id === 'last_breath'));
        const mesh = game.inRunLootDrops.at(-1);
        const shape = { name: mesh.name, children: mesh.children.length, depthTest: mesh.children.every((c) => c.material.depthTest) };
        game.resetRunDrops();
        game.resetVitalsForRun({ emit: false });
        return { baseline, reduced, duplicate, restored: game.playerVitals.maxO2, pending: game.inRunLootDrops.length, shape };
    });
    check(runtime.reduced === runtime.duplicate && runtime.restored === runtime.baseline && runtime.pending === 0, 'Run reset or duplicate guard failed');
    check(runtime.shape.children === 3 && runtime.shape.depthTest, 'World loot is not the new occluding 3D effect');
    await page.screenshot({ path: `${output}/gameplay-perspective.png` });
    await page.evaluate(() => { window.game.cameraMode = 'isometric'; window.game.updateCamera?.(0.016); });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${output}/gameplay-isometric.png` });

    const render = await page.evaluate(async () => {
        const THREE = await import('http://127.0.0.1:5186/node_modules/three/build/three.module.js');
        const { TiltShiftPassShader } = await import('http://127.0.0.1:5186/src/threeGame.js');
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(64, 64);
        const source = new THREE.DataTexture(new Uint8Array([64, 128, 192, 255]), 1, 1);
        source.needsUpdate = true;
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const material = new THREE.ShaderMaterial({ ...TiltShiftPassShader, uniforms: THREE.UniformsUtils.clone(TiltShiftPassShader.uniforms) });
        material.uniforms.tDiffuse.value = source;
        material.uniforms.focusRange.value = 0.05;
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        scene.add(plane);
        const first = new THREE.WebGLRenderTarget(64, 64);
        const second = new THREE.WebGLRenderTarget(64, 64);
        renderer.setRenderTarget(first); renderer.render(scene, camera);
        material.uniforms.tDiffuse.value = first.texture;
        material.uniforms.dir.value.set(1, 0);
        renderer.setRenderTarget(second); renderer.render(scene, camera);
        const pixels = new Uint8Array(4);
        renderer.readRenderTargetPixels(second, 3, 3, 1, 1, pixels);
        source.dispose(); first.dispose(); second.dispose(); material.dispose(); plane.geometry.dispose(); renderer.dispose();
        return [...pixels];
    });
    check(render.every((v, i) => Math.abs(v - [64,128,192,255][i]) <= 2), `Blur changes constant lighting: ${render}`);
    // Isolated render using the same shipped effect factories, for readable art inspection.
    await page.evaluate(async () => {
        const THREE = await import('http://127.0.0.1:5186/node_modules/three/build/three.module.js');
        const { createRelicPickup, createImpactBurst } = await import('http://127.0.0.1:5186/src/expeditionVfx.js');
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(1100, 700);
        renderer.setClearColor(0x101c27);
        const canvas = renderer.domElement;
        canvas.style.cssText = 'position:fixed;z-index:999999;left:0;top:0;width:1100px;height:700px';
        document.body.append(canvas);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1100/700, 0.01, 100);
        camera.position.set(0, 1.7, 3.2); camera.lookAt(0, 0.3, 0);
        scene.add(new THREE.HemisphereLight(0xc2e9ff, 0x18242c, 2));
        const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(2, 3, 2); scene.add(key);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x243441, roughness: 0.9 }));
        floor.rotation.x = -Math.PI/2; floor.position.y = -0.01; scene.add(floor);
        const a = createRelicPickup({ type: 'overclock', rarity: 'rare' }); a.position.x = -0.55;
        const b = createRelicPickup({ type: 'relic', rarity: 'mythic' }); b.position.x = 0.55;
        const impact = createImpactBurst(); impact.position.set(0, 0.03, 0.55);
        for (const shard of impact.children) { shard.position.x += (shard.userData.vx || 0)*0.08; shard.position.z += (shard.userData.vz || 0)*0.08; }
        scene.add(a, b, impact); renderer.render(scene, camera);
    });
    await page.locator('canvas').last().screenshot({ path: `${output}/effects-gallery.png` });
    check(errors.length === 0, errors.join('; '));
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, runtime, constantColorAfterTwoPasses: render, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, runtime, render }));
} catch (error) {
    await page.screenshot({ path: `${output}/failure.png` });
    console.error(error);
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: false, error: error.message, errors }, null, 2));
    process.exitCode = 1;
} finally { await browser.close(); }
