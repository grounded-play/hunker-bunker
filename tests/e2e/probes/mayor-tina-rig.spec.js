import { expect, test } from '@playwright/test';

// Owner 2026-10-08: "we need to rerig the mayor tina". Builds the transformed
// Mayor exactly as the game does (createPlayer3dOverlay with the Scout
// locomotion pack retargeted), poses idle/walk/run, renders a contact sheet,
// and measures skin stretch and foot contact.
//   HB_PROBES=1 TINA_SHEET=/path/sheet.png npx playwright test ... mayor-tina-rig
test('Mayor Tina skins cleanly through the shared locomotion pack', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/index.html');
    // TINA_BASELINE=scout measures the stock Scout; TINA_MODEL=/url another GLB.
    const baseline = process.env.TINA_BASELINE === 'scout' ? 'scout' : (process.env.TINA_MODEL || null);
    // TINA_SHOTS="run:0.75,walk:0.75" renders just those poses, larger.
    const only = process.env.TINA_SHOTS ? process.env.TINA_SHOTS.split(',').map((s) => s.split(':')).map(([n, f]) => [n, Number(f)]) : null;
    const result = await page.evaluate(async ({ baseline, only }) => {
        const { createPlayer3dOverlay } = await import('/src/player3dOverlay.js');
        // The exact (versioned) three module the game imported: a second copy
        // would not render the game's skinned meshes correctly.
        const threeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/deps\/three\.js/.test(n));
        const THREE = await import(threeUrl);
        const { MAYOR_TINA_PLAYER_VISUAL } = await import('/src/threeGame.js');
        const visual = baseline
            ? { ...MAYOR_TINA_PLAYER_VISUAL, modelUrl: baseline === 'scout' ? MAYOR_TINA_PLAYER_VISUAL.animationModelUrl : baseline }
            : MAYOR_TINA_PLAYER_VISUAL;
        const overlay = await createPlayer3dOverlay({ targetHeight: 1.8, ...visual });
        const root = overlay.root;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x202024);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 2.2));
        const sun = new THREE.DirectionalLight(0xffffff, 2.4);
        sun.position.set(2, 4, 3);
        scene.add(sun);
        scene.add(root);
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);

        let skinned = null;
        root.traverse((o) => { if (o.isSkinnedMesh && !skinned) skinned = o; });
        const geometry = skinned.geometry;
        const count = geometry.attributes.position.count;
        const index = geometry.index;
        const v = new THREE.Vector3();
        const sample = () => {
            root.updateMatrixWorld(true);
            skinned.skeleton.update();
            const out = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                skinned.getVertexPosition(i, v); // applies skinning
                skinned.localToWorld(v);
                out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
            }
            return out;
        };
        const edgeLength = (pos, a, b) => Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]);

        const actions = overlay.actions;
        const pose = (name, fraction) => {
            for (const action of actions.values()) action.stop();
            const action = actions.get(name);
            if (!action) return false;
            action.reset().setEffectiveWeight(1).play();
            action.time = action.getClip().duration * fraction;
            action.getMixer().update(0);
            overlay.syncFollowerBones();
            return true;
        };

        // Reference = the idle pose (skeleton.pose() would ignore the
        // overlay's height normalisation).
        pose('idle', 0);
        const rest = sample();
        const bounds = new THREE.Box3().setFromObject(root, true);
        let restMinY = Infinity;
        let restMaxY = -Infinity;
        for (let i = 0; i < count; i++) {
            restMinY = Math.min(restMinY, rest[i * 3 + 1]);
            restMaxY = Math.max(restMaxY, rest[i * 3 + 1]);
        }
        const height = restMaxY - restMinY;

        const shots = only ?? [['idle', 0], ['walk', 0], ['walk', 0.25], ['walk', 0.5], ['walk', 0.75], ['run', 0.25], ['run', 0.75]];
        const metrics = [];
        const canvas = document.createElement('canvas');
        canvas.width = 1400;
        canvas.height = 800;
        canvas.id = 'tina-sheet';
        canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:999999';
        document.body.appendChild(canvas);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        renderer.setScissorTest(true);
        const pad = height * 0.08;
        const half = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, height * 0.6) * 0.6;
        const camera = new THREE.OrthographicCamera(-half, half, (height + 2 * pad) / 2, -(height + 2 * pad) / 2, 0.01, 100);
        const centre = bounds.getCenter(new THREE.Vector3());
        const cell = only ? Math.floor(1400 / (only.length * 2)) : 200;
        shots.forEach(([name, fraction], column) => {
            if (!pose(name, fraction)) return;
            const posed = sample();
            let worstStretch = 0;
            let worstAt = null;
            let minY = Infinity;
            for (let i = 0; i < count; i++) minY = Math.min(minY, posed[i * 3 + 1]);
            for (let t = 0; t < index.count; t += 3) {
                const a = index.getX(t);
                const b = index.getX(t + 1);
                const c = index.getX(t + 2);
                for (const [p, q] of [[a, b], [b, c], [c, a]]) {
                    const r = edgeLength(rest, p, q);
                    if (r < height * 0.002) continue;
                    const stretch = edgeLength(posed, p, q) / r;
                    if (stretch > worstStretch) {
                        worstStretch = stretch;
                        const bones = (i) => [0, 1, 2, 3]
                            .map((k) => [geometry.attributes.skinIndex.getComponent(i, k), geometry.attributes.skinWeight.getComponent(i, k)])
                            .filter(([, w]) => w > 0.01)
                            .map(([bi, w]) => `${skinned.skeleton.bones[bi].name.replace('mixamorig1', '')}:${w.toFixed(2)}`)
                            .join(' ');
                        worstAt = { rest: [rest[p * 3], rest[p * 3 + 1], rest[p * 3 + 2]].map((n) => +n.toFixed(3)), restLength: +r.toFixed(4), a: bones(p), b: bones(q) };
                    }
                }
            }
            const above = [];
            for (let t = 0; t < index.count; t += 3) {
                const a = index.getX(t);
                const b = index.getX(t + 1);
                if (edgeLength(rest, a, b) >= height * 0.002 && edgeLength(posed, a, b) / edgeLength(rest, a, b) > 3) above.push(a);
            }
            metrics.push({ name, fraction, worstStretch, worstAt, over3: above.length, footLift: (minY - restMinY) / height });
            const views = only ? [[0, 0.5], [1, -0.9]] : [[0, 0], [1, Math.PI / 2]];
            for (const [row, yaw] of views) {
                camera.position.set(centre.x + Math.sin(yaw) * 20, centre.y, centre.z + Math.cos(yaw) * 20);
                camera.lookAt(centre);
                const w = only ? cell : cell;
                const h = only ? 800 : 400;
                const x = only ? (column * 2 + row) * cell : column * cell;
                const y = only ? 0 : (1 - row) * 400;
                camera.left = -half * (only ? 0.75 : 1);
                camera.right = half * (only ? 0.75 : 1);
                camera.top = (height + 2 * pad) / (only ? 1.6 : 2);
                camera.bottom = -(height + 2 * pad) / (only ? 1.6 : 2);
                camera.updateProjectionMatrix();
                renderer.setViewport(x, y, w, h);
                renderer.setScissor(x, y, w, h);
                renderer.render(scene, camera);
            }
        });
        return {
            height,
            bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
            rootScale: root.scale.toArray(),
            metrics,
            clips: [...actions.keys()]
        };
    }, { baseline, only });
    console.log(JSON.stringify(result, null, 2));
    if (process.env.TINA_SHEET) await page.locator('#tina-sheet').screenshot({ path: process.env.TINA_SHEET });
    for (const m of result.metrics) {
        // The stock Scout stays under 1.6x everywhere. Tina's mesh fuses her
        // thighs and right shin to the abdomen, so a few slivers at those
        // contacts stretch as a leg swings away (2026-10-08: worst 9.9x, at
        // most 70 edges over 3x, invisible at game scale). The broken rig
        // glued whole limbs to the wrong bones; bound both size and count.
        expect(m.worstStretch, `${m.name}@${m.fraction}`).toBeLessThan(15);
        expect(m.over3, `${m.name}@${m.fraction}`).toBeLessThan(150);
        // Feet stay near the floor: not sunk below, not hoisted.
        expect(Math.abs(m.footLift), `${m.name}@${m.fraction}`).toBeLessThan(0.08);
    }
});
