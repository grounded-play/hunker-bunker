import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Owner log 2026-10-07 (desktop, ANGLE/D3D11): 2-10 s single frames "at
// shots and things" while the program count climbed 151 -> 312 in play.
// Record each shader program first created by shooting, hitting and killing.
test.describe.configure({ timeout: 300_000 });

test('which shaders compile the first time you shoot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
        const g = window.game;
        window.__probe = { worst: 0, frames: [] };
        let last = performance.now();
        const tick = (now) => {
            const dt = now - last;
            last = now;
            if (dt > window.__probe.worst) window.__probe.worst = dt;
            if (dt > 120) window.__probe.frames.push({ at: Math.round(now), dt: Math.round(dt), programs: g.renderer.info.programs?.length });
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        const describe = (p) => `${p.id}|${p.name}|${p.cacheKey}`;
        window.__probe.before = new Set((g.renderer.info.programs ?? []).map(describe));
        window.__probe.describe = describe;
    });
    const steps = [];
    const mark = async (label) => steps.push(await page.evaluate((label) => {
        const g = window.game;
        const now = (g.renderer.info.programs ?? []).map(window.__probe.describe);
        const fresh = now.filter((k) => !window.__probe.before.has(k));
        fresh.forEach((k) => window.__probe.before.add(k));
        const out = { label, programs: now.length, fresh, longFrames: window.__probe.frames.splice(0), worst: Math.round(window.__probe.worst) };
        window.__probe.worst = 0;
        return out;
    }, label));
    await page.waitForTimeout(2000);
    await mark('idle');
    // A one-hit target 4 tiles out along +x isolates the first shot and kill
    // from unrelated chunk streaming during a long firing loop.
    await page.evaluate(() => {
        const g = window.game;
        const p = g.player.position;
        g.playerVitals.maxHp = 999; g.playerVitals.hp = 999;
        const target = g.spawnEnemyInstance('cybersnail', p.x + 4, p.z);
        if (target?.userData) target.userData.hp = 1;
        g.aimDirX = 1; g.aimDirZ = 0;
    });
    await page.waitForTimeout(1500);
    await mark('enemy spawned');
    await page.evaluate(() => { const g = window.game; g.aimDirX = 1; g.aimDirZ = 0; g.weaponFireCooldown = 0; g.weaponClipAmmo = Math.max(g.weaponClipAmmo, 3); g.fireWeaponAtCurrentAim({ source: 'probe' }); });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { window.__firstKillProgramId = Math.max(...[...window.__probe.before].map((k) => Number(k.split('|')[0]))) + 1; });
    await mark('first shot / kill');
    await page.evaluate(() => {
        const progs = window.game.renderer.info.programs ?? [];
        window.__firstKillProgramId = Math.min(...progs.map((p) => p.id).filter((id) => id >= 0).slice(-3));
    });
    for (const s of steps) console.log('STEP', JSON.stringify(s));
    // Who uses the programs the kill created?
    console.log('OWNERS', JSON.stringify(await page.evaluate(() => {
        const g = window.game;
        const out = [];
        g.scene.traverse((o) => {
            if (!o.isMesh || !o.material) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
                const prog = g.renderer.properties.get(m)?.currentProgram;
                if (!prog || prog.id < (window.__firstKillProgramId ?? 1e9)) continue;
                const chain = [];
                for (let n = o; n && chain.length < 5; n = n.parent) chain.push(n.name || n.type + (n.userData?.type ? `:${n.userData.type}` : '') + (n.userData?.world3dSource ? `<-${n.userData.world3dSource.userData?.type}` : ''));
                out.push({ prog: prog.id, mat: m.name, type: m.type, chain });
            }
        });
        return out.slice(0, 12);
    })));
});
