import { expect, test } from '@playwright/test';

// Owner 2026-10-08: "the model is moving the floor that is supposed to just
// sit under it". Loads the rigged umbilical through the game's own world-model
// path, drives the attacker through tracking and strikes, and measures the
// skinned hatch vertices and the tentacle crown in three.js.
test('umbilical hatch stays still while the tentacle tracks and strikes', async ({ page }) => {
    await page.goto('/index.html');
    const result = await page.evaluate(async () => {
        const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
        const { createWorld3dModel } = await import('/src/world3dOverlay.js');
        const { UmbilicalAttacker } = await import('/src/3d/umbilicalAttacker.js');

        async function run(player) {
            const root = await createWorld3dModel('prop_biomech_spore_umbilical_cable_rigged');
            const model = root.children[0];
            const attacker = new UmbilicalAttacker(
                { scene: model, animations: root.userData.animations || [] },
                { root, x: 0, y: 0, z: 0, detectionRadius: 7, strikeRadius: 3.5 }
            );
            let skinned = null;
            root.traverse((o) => { if (o.isSkinnedMesh) skinned = o; });
            const count = skinned.geometry.attributes.position.count;
            const v = new THREE.Vector3();
            const sample = () => {
                root.updateMatrixWorld(true);
                skinned.skeleton.update();
                const out = new Float32Array(count * 3);
                for (let i = 0; i < count; i++) {
                    skinned.getVertexPosition(i, v);
                    skinned.applyBoneTransform(i, v);
                    skinned.localToWorld(v);
                    out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
                }
                return out;
            };
            const rest = sample();
            let top = 0;
            for (let i = 0; i < count; i++) top = Math.max(top, rest[i * 3 + 1]);
            const hatch = [];
            const crown = [];
            for (let i = 0; i < count; i++) {
                const y = rest[i * 3 + 1];
                if (y < top * 0.07) hatch.push(i);
                else if (y > top * 0.8) crown.push(i);
            }
            let hatchMove = 0;
            let bestToward = -Infinity;
            let firstStrikeToward = null;
            const dir = new THREE.Vector2(player.x, player.z).normalize();
            const states = new Set();
            for (let f = 0; f < 150; f++) {
                attacker.update(1 / 30, player);
                states.add(attacker.state);
                const now = sample();
                for (const i of hatch) {
                    const d = Math.hypot(now[i * 3] - rest[i * 3], now[i * 3 + 1] - rest[i * 3 + 1], now[i * 3 + 2] - rest[i * 3 + 2]);
                    if (d > hatchMove) hatchMove = d;
                }
                if (attacker.state === 'STRIKE' || attacker.state === 'RECOVERY') {
                    let cx = 0;
                    let cz = 0;
                    for (const i of crown) { cx += now[i * 3]; cz += now[i * 3 + 2]; }
                    const toward = (cx / crown.length) * dir.x + (cz / crown.length) * dir.y;
                    if (toward > bestToward) bestToward = toward;
                    if (firstStrikeToward === null && attacker.state === 'RECOVERY') firstStrikeToward = bestToward;
                }
            }
            return {
                height: top,
                hatchVerts: hatch.length,
                hatchMove,
                crownReachTowardPlayer: bestToward,
                firstStrikeTowardPlayer: firstStrikeToward,
                states: [...states],
                modelYaw: model.rotation.y
            };
        }
        return {
            east: await run({ x: 3, y: 0, z: 0 }),
            north: await run({ x: 0, y: 0, z: -3 }),
            southwest: await run({ x: -2, y: 0, z: 2 })
        };
    });
    console.log(JSON.stringify(result, null, 2));
    for (const r of Object.values(result)) {
        expect(r.hatchVerts).toBeGreaterThan(1000);
        expect(r.hatchMove).toBeLessThan(1e-4);
        expect(r.states).toContain('STRIKE');
        expect(r.modelYaw).toBe(0);
        // The crown lunges at least a fifth of the height toward the player.
        expect(r.crownReachTowardPlayer).toBeGreaterThan(r.height * 0.2);
        // Even the first lash, straight from IDLE with no tracking turn.
        expect(r.firstStrikeTowardPlayer).toBeGreaterThan(r.height * 0.2);
    }
});
