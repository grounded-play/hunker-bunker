// Diagnostic + verification spec for docs/log13-gameplay-fps-plan-2026-08-20.md.
//
// Not a pass/fail gate on timings (a shared dev container is far too noisy for
// that). It exists to print two things the unit tests cannot observe, because
// both are properties of a real WebGL context:
//   1. how far renderer.info.programs grows while the player moves around --
//      the metric the whole shader-runaway line of work is measured against;
//   2. the ranked per-subsystem frame cost, to attribute the ~63% of blocked
//      main-thread time that log13 could only tag "frame:render".
//
//   npx playwright test tests/e2e/frame-profile.spec.js --reporter=list
import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test('profile gameplay frame cost and shader program growth', async ({ page }) => {
    test.setTimeout(180_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    // Let initial streaming settle so we measure steady state, not chunk mounts.
    await page.waitForTimeout(5000);

    const before = await page.evaluate(() => {
        window.game.frameProfiler.reset();
        window.game.frameProfiler.enable();
        return {
            programs: window.game.renderer.info.programs.length,
            envLights: window.game.envDynamicLights.length,
            scatter: window.game.scatterSprites.length,
            enemies: window.game.scatterSprites.filter((sprite) => sprite.userData?.isEnemy).length,
            world3d: window.game.scatterSprites.filter((sprite) => sprite.userData?.world3dRoot).length
        };
    });

    // Sample the browser main thread instead of putting performance.now()
    // probes inside the 465-object scatter loop. The latter changes the hot
    // path enough to distort the result; CDP attributes sampled leaf time
    // without adding work to each object update.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    await cdp.send('Profiler.start');

    // Real movement: forces chunk streaming, enemy AI, pickup/scatter proximity
    // and -- the point of the exercise -- constant env-light budget churn.
    const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
    for (let i = 0; i < 16; i++) {
        const k = keys[i % keys.length];
        await page.keyboard.down(k);
        await page.waitForTimeout(800);
        await page.keyboard.up(k);
    }

    const { profile: cpuProfile } = await cdp.send('Profiler.stop');
    await cdp.send('Profiler.disable');
    await cdp.detach();

    const after = await page.evaluate(() => {
        const snap = window.game.frameProfiler.snapshot();
        window.game.frameProfiler.disable();
        return {
            snap,
            programs: window.game.renderer.info.programs.length,
            envLights: window.game.envDynamicLights.length,
            poolSize: window.game.envLightPool?.length ?? null,
            scatter: window.game.scatterSprites.length,
            enemies: window.game.scatterSprites.filter((sprite) => sprite.userData?.isEnemy).length,
            world3d: window.game.scatterSprites.filter((sprite) => sprite.userData?.world3dRoot).length
        };
    });

    const snap = after.snap;
    const msPerFrame = snap.totalMs / snap.frames;
    console.log('\n================ GAMEPLAY FRAME PROFILE ================');
    console.log(`frames            : ${snap.frames}`);
    console.log(`ms/frame          : ${msPerFrame.toFixed(2)}  (${(1000 / msPerFrame).toFixed(1)} fps)`);
    console.log(`programs          : ${before.programs} -> ${after.programs}  (growth ${after.programs - before.programs})`);
    console.log(`env lights        : ${before.envLights} -> ${after.envLights}, pool ${after.poolSize}`);
    console.log(`scatter / enemies : ${before.scatter} / ${before.enemies}  (3D ${before.world3d} -> ${after.world3d})`);
    console.log('--------------------------------------------------------');
    console.log('  ms/frame    total     max   calls  section');
    for (const s of snap.sections.slice(0, 22)) {
        console.log(`  ${s.avgMsPerFrame.toFixed(2).padStart(8)} ${s.totalMs.toFixed(0).padStart(8)} ${s.maxMs.toFixed(1).padStart(7)} ${String(s.calls).padStart(7)}  ${s.name}`);
    }
    console.log('========================================================\n');

    const nodesById = new Map(cpuProfile.nodes.map((node) => [node.id, node]));
    const sampledTimeByFunction = new Map();
    for (let i = 0; i < (cpuProfile.samples?.length ?? 0); i++) {
        const node = nodesById.get(cpuProfile.samples[i]);
        if (!node) continue;
        const frame = node.callFrame;
        const functionName = frame.functionName || '(anonymous)';
        const url = frame.url ? frame.url.split('/').pop() : '';
        const key = `${functionName}${url ? ` (${url}:${frame.lineNumber + 1})` : ''}`;
        sampledTimeByFunction.set(key, (sampledTimeByFunction.get(key) ?? 0) + (cpuProfile.timeDeltas?.[i] ?? 0));
    }
    const sampledFunctions = [...sampledTimeByFunction.entries()]
        .map(([name, micros]) => ({ name, ms: micros / 1000 }))
        .filter(({ name }) => !name.startsWith('(idle)'))
        .sort((a, b) => b.ms - a.ms);
    console.log('================ MAIN-THREAD CPU SAMPLES ===============');
    console.log('      self ms  sampled leaf function');
    for (const entry of sampledFunctions.slice(0, 30)) {
        console.log(`  ${entry.ms.toFixed(1).padStart(11)}  ${entry.name}`);
    }
    console.log('========================================================\n');

    expect(snap.frames).toBeGreaterThan(0);
});
