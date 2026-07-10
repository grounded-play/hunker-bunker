// Camp feature verify:
//  A) Act 1 — camps exist, SUPPORT costs shells, levels persist, O2 haven works
//  B) Act 2 — leveled camp resists the cull with defenders, then pays out loot
import puppeteer from 'puppeteer-core';

const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

async function bootToGameplay(page) {
    await page.goto('http://localhost:5199/', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.mouse.click(480, 300);
    await sleep(2000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3000);
    await page.evaluate(() => document.getElementById('start-game')?.click());
    for (let i = 0; i < 260; i += 1) {
        await sleep(1000);
        const state = await page.evaluate(() => {
            if (document.querySelector('.class-intro-overlay')) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
                return 'intro';
            }
            const choices = document.getElementById('mothership-dialogue-choices');
            const skip = document.getElementById('mothership-choice-skip');
            if (skip && choices && !choices.classList.contains('hidden')) {
                skip.click();
                return 'skipped';
            }
            const dialog = document.getElementById('mothership-dialogue');
            if (dialog && !dialog.classList.contains('hidden')) return 'typing';
            return window.game?.isGameplayInputActive?.() === true ? 'live' : 'waiting';
        });
        if (state === 'live') return true;
    }
    return false;
}

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});

try {
    // ── Scenario A: Act 1 support ──
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 960, height: 600 });
        page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
        await page.evaluateOnNewDocument(() => localStorage.clear());
        check('A: booted to Act 1 gameplay', await bootToGameplay(page));

        const camp = await page.evaluate(() => {
            const c = window.game.act2?.getState()?.camps?.[0];
            return c && Number.isFinite(c.x) ? { id: c.id, x: c.x, z: c.z, level: c.level } : null;
        });
        check('A: camps spawned in Act 1 with persisted positions', Boolean(camp), JSON.stringify(camp));

        await page.evaluate((c) => {
            window.game.bank.addShells(50);
            window.game.player.position.set(c.x + 1, 0, c.z + 1);
        }, camp);
        let promptText = '';
        for (let i = 0; i < 24; i += 1) {
            await sleep(500);
            promptText = await page.evaluate(() =>
                document.querySelector('#foundry-hud-prompt .prompt-text')?.textContent ?? '');
            if (/SUPPORT CAMP/.test(promptText)) break;
        }
        check('A: SUPPORT prompt shows with shell cost', /SUPPORT CAMP — 5 SHELLS/.test(promptText), promptText);

        const supported = await page.evaluate(() => {
            const g = window.game;
            g.playerVitals.o2 = 30;
            const before = g.bank.getShells();
            g.interactWithAct2Camp();
            return {
                shells: { before, after: g.bank.getShells() },
                level: g.act2.getState().camps[0].level,
                visualLevel: g.camps[0]?.level,
                barricades: g.camps[0]?.barricades?.length ?? 0,
                o2: g.playerVitals.o2
            };
        });
        check('A: support spent 5 shells', supported.shells.before - supported.shells.after === 5, JSON.stringify(supported.shells));
        check('A: camp leveled to 1 (state + visuals + barricades)',
            supported.level === 1 && supported.visualLevel === 1 && supported.barricades === 2,
            `level=${supported.level} barricades=${supported.barricades}`);
        check('A: support refilled O2', supported.o2 >= 69, `o2=${supported.o2}`);

        // O2 haven: drain, stand inside, watch it climb.
        await page.evaluate(() => { window.game.playerVitals.o2 = 40; });
        let o2After = 40;
        for (let i = 0; i < 24; i += 1) {
            await sleep(500);
            o2After = await page.evaluate(() => window.game.playerVitals.o2);
            if (o2After > 42) break;
        }
        check('A: leveled camp regenerates O2 while standing in it', o2After > 42, `o2=${Math.round(o2After)}`);

        // Persistence: the manager saves on every mutation.
        const persisted = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('hb_act2_v1') ?? '{}')?.camps?.[0]?.level ?? -1);
        check('A: camp level persists in hb_act2_v1', persisted === 1, `level=${persisted}`);
        await page.close();
    }

    // ── Scenario B: Act 2 defended cull ──
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 960, height: 600 });
        page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
        await page.evaluateOnNewDocument(() => {
            localStorage.clear();
            localStorage.setItem('hb_arc_v1', JSON.stringify({ arcState: 'hive_awakened_tease', version: 1 }));
            localStorage.setItem('hb_act2_v1', JSON.stringify({
                begun: true,
                uplinkSilenced: true,
                dishBuilt: true,
                camps: [
                    { id: 'camp_meridian', aided: true, level: 2 },
                    { id: 'camp_tallow', aided: true, level: 0 },
                    { id: 'camp_vesper', aided: true, level: 0 }
                ],
                version: 1
            }));
        });
        check('B: booted to Act 2 gameplay', await bootToGameplay(page));
        const phase = await page.evaluate(() => window.game.act2?.getPhase());
        check('B: phase is camps_betray', phase === 'camps_betray', `phase=${phase}`);

        const camp = await page.evaluate(() => {
            const c = window.game.act2.getState().camps[0];
            return { id: c.id, x: c.x, z: c.z, level: c.level };
        });
        await page.evaluate((c) => { window.game.player.position.set(c.x + 1, 0, c.z + 1); }, camp);
        await sleep(800);

        for (let i = 0; i < 30; i += 1) {
            if (await page.evaluate(() => window.game?.isGameplayInputActive?.() === true)) break;
            await sleep(1000);
        }
        const breach = await page.evaluate(() => {
            const g = window.game;
            const shellsBefore = g.bank.getShells();
            g.interactWithAct2Camp(); // breach → defenders
            const defenders = g.scatterSprites.filter((s) => s.userData?.campDefenderId === 'camp_meridian');
            g.interactWithAct2Camp(); // blocked while defenders alive
            return {
                shellsBefore,
                defenderCount: defenders.length,
                destroyedEarly: g.act2.getState().camps[0].destroyed
            };
        });
        check('B: breach spawned level*2 defenders', breach.defenderCount === 4, `count=${breach.defenderCount}`);
        check('B: cull blocked while defenders live', breach.destroyedEarly === false);

        const cull = await page.evaluate(async () => {
            const g = window.game;
            const pickupsBefore = g.pickupMeshes.length;
            for (const s of g.scatterSprites.filter((x) => x.userData?.campDefenderId === 'camp_meridian')) {
                g.damageSnail(s, 9999);
            }
            await new Promise((r) => setTimeout(r, 400));
            g.interactWithAct2Camp(); // now the cull proceeds
            return {
                destroyed: g.act2.getState().camps[0].destroyed,
                shells: g.bank.getShells(),
                lootAdded: g.pickupMeshes.length - pickupsBefore
            };
        });
        check('B: camp culled after defenders cleared', cull.destroyed === true);
        check('B: cull granted level*5 bonus shells (plus defender corpses pending)',
            cull.shells >= breach.shellsBefore + 10, `shells=${cull.shells}`);
        check('B: cull ejected level-scaled loot', cull.lootAdded >= 6, `pickups+${cull.lootAdded}`);
        await page.close();
    }
} finally {
    await browser.close();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
