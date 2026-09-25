import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Where does a gameplay frame's main-thread time go? (2026-09-25 PC log:
// frames every ~48 ms with ~12 ms of GPU and ~20 ms of frame:render.)
// Enables the in-game frame profiler and records a CDP CPU profile while the
// player walks and fires, then writes both, worst first.
const OUT = process.env.HB_PROBE_OUT || '/tmp';
const LABEL = process.env.HB_PROBE_LABEL || 'run';
const SECONDS = Number(process.env.HB_PROBE_SECONDS || 20);

function summarize(profile) {
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const dt = profile.timeDeltas;
    for (let i = 0; i < profile.samples.length; i += 1) {
        const node = byId.get(profile.samples[i]);
        const f = node.callFrame;
        const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
        self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
    }
    const total = [...self.values()].reduce((a, b) => a + b, 0);
    return {
        totalMs: Math.round(total),
        top: [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)
            .map(([k, ms]) => `${ms.toFixed(0).padStart(6)}ms ${(100 * ms / total).toFixed(1).padStart(5)}% ${k}`)
    };
}

test('gameplay main-thread profile', async ({ page }) => {
    test.setTimeout(900_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.evaluate(() => { window.game.setGodMode?.(true); });
    await page.waitForTimeout(4000);
    await page.evaluate(() => { const fp = window.game.frameProfiler; fp?.reset(); fp?.enable(); window.__probeFrames = 0; const tick = () => { window.__probeFrames += 1; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
    const start = Date.now();
    const box = await page.locator('#game-container canvas').first().boundingBox();
    const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
    let k = 0;
    while (Date.now() - start < SECONDS * 1000) {
        await page.keyboard.down(keys[k % 4]);
        if (box) await page.mouse.move(box.x + box.width * (0.3 + 0.4 * Math.random()), box.y + box.height * (0.3 + 0.4 * Math.random()));
        await page.mouse.down();
        await page.waitForTimeout(900);
        await page.mouse.up();
        await page.keyboard.up(keys[k % 4]);
        k += 1;
    }
    const { profile } = await cdp.send('Profiler.stop');
    const elapsed = (Date.now() - start) / 1000;
    const game = await page.evaluate(() => ({
        rafFrames: window.__probeFrames,
        profiler: window.game.frameProfiler?.snapshot?.(),
        drawCalls: window.game.renderer?.info?.render?.calls,
        scatter: window.game.scatterSprites?.length,
        chunks: window.game.chunkMeshes?.size,
        adaptive: window.game.adaptiveGameplayPerformanceMode,
        post: window.game.gameplayPostProcessingEnabled,
        // What the draw calls are: visible renderable objects by owner tag.
        census: (() => {
            const g = window.game;
            const out = {};
            let shadowCasters = 0;
            g.scene.traverseVisible((o) => {
                if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
                if (o.castShadow) shadowCasters += 1;
                let tag = o.isInstancedMesh ? 'instanced' : o.isSkinnedMesh ? 'skinned' : o.isSprite ? 'sprite' : 'mesh';
                let p = o; let owner = null;
                while (p && !owner) { owner = p.userData?.type || p.userData?.world3dModelType || (p.userData?.isWall ? 'wall' : null) || (p.userData?.isChunk ? 'chunk' : null) || p.name || null; p = p.parent; }
                const key = `${tag}:${String(owner ?? '?').slice(0, 40)}`;
                out[key] = (out[key] ?? 0) + 1;
            });
            const top = Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 40);
            return { shadowCasters, total: Object.values(out).reduce((a, b) => a + b, 0), top };
        })()
    }));
    const cpu = summarize(profile);
    const result = { label: LABEL, seconds: elapsed, fps: game.rafFrames / elapsed, ...game, cpu };
    fs.writeFileSync(`${OUT}/gameplay-cpu-${LABEL}.json`, JSON.stringify(result, null, 1));
    fs.writeFileSync(`${OUT}/gameplay-cpu-${LABEL}.cpuprofile`, JSON.stringify(profile));
});
