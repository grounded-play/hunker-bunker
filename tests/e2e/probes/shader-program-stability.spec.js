import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';

// S53-01 (docs/planning/sprint-53-plan-2026-10-15.md): once the startup
// warm-up is done, nothing should compile a wave of shader programs. Each
// program costs ~0.45 s of frozen main thread on Windows/D3D11; the
// 2026-10-15 co-op session froze for 32, 36 and 38 s.
//
// Two invariants, measured on a real GPU through deploy, the first frames,
// streaming new chunks and a death + TRY AGAIN:
//   - the number of point lights three.js counts never changes in gameplay
//     (it is baked into every lit program's cache key; lights belong in the
//     fixed pool, ThreeGame.registerEnvLight);
//   - after deploy, programs grow by a handful at most.
// HB_PROBE_OUT gets timeline.json: every change of light count, program count
// or profile, with the lights that joined or left.
const OUT = process.env.HB_PROBE_OUT || 'test-results/shader-program-stability';
const MAX_PROGRAMS_AFTER_DEPLOY = 12;

test('shader programs stay put after the warm-up', async ({ page }) => {
    test.setTimeout(600_000);
    fs.mkdirSync(OUT, { recursive: true });
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await page.evaluate(() => {
        const g = window.game;
        const r = g.renderer;
        window.__shaderTimeline = [];
        let last = '';
        let lastSet = new Map();
        const describe = (o) => {
            const chain = [];
            for (let p = o.parent; p && chain.length < 4; p = p.parent) chain.push(p.name || p.userData?.type || p.type);
            return `${o.name || '(unnamed)'} #${o.color.getHexString()} d=${o.distance} < ${chain.join(' < ')}`;
        };
        const counted = () => {
            const set = new Map();
            g.scene.traverse((o) => {
                if (!o.isPointLight) return;
                let shown = o.visible;
                for (let p = o.parent; shown && p; p = p.parent) if (!p.visible) shown = false;
                if (shown) set.set(o.uuid, o);
            });
            return set;
        };
        const note = (via) => {
            const set = counted();
            const key = `${set.size}|${r.info.programs?.length}|${g.performanceProfile}`;
            if (key === last) return;
            last = key;
            window.__shaderTimeline.push({
                t: Math.round(performance.now()),
                via,
                lights: set.size,
                programs: r.info.programs?.length ?? 0,
                profile: g.performanceProfile,
                added: [...set.keys()].filter((k) => !lastSet.has(k)).map((k) => describe(set.get(k))),
                removed: [...lastSet.keys()].filter((k) => !set.has(k)).map((k) => describe(lastSet.get(k)))
            });
            lastSet = set;
        };
        const render = r.render.bind(r);
        r.render = (...a) => { note('render'); return render(...a); };
        if (r.compileAsync) { const ca = r.compileAsync.bind(r); r.compileAsync = (...a) => { note('compileAsync'); return ca(...a); }; }
    });

    await startRunAndSkipIntro(page);
    const programs = () => page.evaluate(() => window.game.renderer.info.programs.length);
    const atDeploy = await programs();
    await page.waitForTimeout(8000);
    // Stream new content: hop the player outward through several chunks.
    for (const [dx, dz] of [[40, 0], [80, 0], [80, -40], [40, -80], [0, -80], [-40, -40], [-40, 40], [0, 80]]) {
        await page.evaluate(([x, z]) => {
            const g = window.game;
            g.setGodMode?.(true);
            const origin = g._shaderProbeOrigin ?? (g._shaderProbeOrigin = { x: g.player.position.x, z: g.player.position.z });
            g.player.position.x = origin.x + x;
            g.player.position.z = origin.z + z;
        }, [dx, dz]);
        await page.waitForTimeout(4000);
    }
    const afterStreaming = await programs();
    await page.evaluate(() => window.game.handleDeath('shader-probe'));
    await page.locator('#game-over-try-again').waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.locator('#game-over-try-again').click();
    await page.waitForFunction(() => window.game?.performanceProfile === 'gameplay' && window.game?.inputEnabled === true, null, { timeout: 180_000 });
    await page.waitForTimeout(8000);
    const afterRetry = await programs();

    const timeline = await page.evaluate(() => window.__shaderTimeline);
    fs.writeFileSync(`${OUT}/timeline.json`, JSON.stringify({ atDeploy, afterStreaming, afterRetry, timeline }, null, 1));
    const gameplayLightCounts = [...new Set(timeline.filter((x) => x.profile === 'gameplay').map((x) => x.lights))];
    expect(gameplayLightCounts, 'point lights joined or left the count; see timeline.json').toHaveLength(1);
    expect(afterStreaming - atDeploy, 'programs compiled after deploy').toBeLessThanOrEqual(MAX_PROGRAMS_AFTER_DEPLOY);
    expect(afterRetry - atDeploy, 'programs compiled through a retry').toBeLessThanOrEqual(MAX_PROGRAMS_AFTER_DEPLOY);
});
