// Verify: sprint-19 physicality lane — proto-enemy spawner (landform-keyed),
// camp civilians, suspicion lockdown tells, hive signal columns.
// Boot harness copied from scratch/verify_discovery_landforms.js.
import puppeteer from 'puppeteer-core';

const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const SHOTS = '/tmp/claude-1001/-home-caveman-Desktop-icecave-hunker-bunker/fbdaf594-4fbe-47ac-b1bd-f5db26c1637a/scratchpad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

async function bootToGameplay(page, { budget = 420 } = {}) {
    await page.goto('http://localhost:5199/', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.mouse.click(480, 300);
    await sleep(2000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3000);
    await page.evaluate(() => document.getElementById('start-game')?.click());
    for (let i = 0; i < budget; i += 1) {
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
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});

try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    check('boot to gameplay', await bootToGameplay(page));

    // ── A) Proto spawner: find a ruins and a crater chunk that roll protos ──
    // Spawns are seeded per chunk, so sweep candidate chunks, teleport to
    // each, and count proto sprites after the chunk mounts.
    const protoResult = await page.evaluate(async () => {
        const g = window.game;
        g.snailsEnabled = true;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const found = { ruins: null, crater: null };
        const seen = { ruinsChunks: 0, craterChunks: 0 };
        for (let cx = -10; cx <= 10 && (!found.ruins || !found.crater); cx++) {
            for (let cy = -10; cy <= 10 && (!found.ruins || !found.crater); cy++) {
                if (Math.hypot(cx, cy) < 3) continue; // clear of tier-0 (no spawns)
                const landform = g.getChunkLandform(cx, cy);
                if (landform !== 'ruins' && landform !== 'crater') continue;
                if (landform === 'ruins' && found.ruins) continue;
                if (landform === 'crater' && found.crater) continue;
                seen[`${landform}Chunks`] += 1;
                if (seen[`${landform}Chunks`] > 12) continue; // enough attempts
                const grid = g.getOrCreateChunk(cx, cy);
                let tx = null, tz = null;
                outer: for (let y = 5; y < 14; y++) {
                    for (let x = 5; x < 14; x++) {
                        if (grid[y][x] === '.') { tx = cx * g.chunkSize + x; tz = cy * g.chunkSize + y; break outer; }
                    }
                }
                if (tx === null) continue;
                g.player.position.set(tx, 0, tz);
                g.syncVisibleChunks(true);
                await sleep(350);
                const protos = [];
                g.scene.traverse((o) => {
                    if (o.userData?.type?.startsWith?.('alien_proto_')) protos.push(o.userData.type);
                });
                const want = landform === 'ruins' ? 'alien_proto_crawler' : 'alien_proto_spitter';
                if (protos.includes(want)) {
                    found[landform] = { cx, cy, protos: protos.filter((p) => p === want).length };
                }
            }
        }
        // Sheet wiring on one proto sprite if any exist.
        let sheet = null;
        g.scene.traverse((o) => {
            if (!sheet && o.userData?.sheetSprite && o.userData?.type?.startsWith?.('alien_proto_')) {
                sheet = {
                    repeat: [o.material.map.repeat.x, o.material.map.repeat.y],
                    offsetY: o.material.map.offset.y
                };
            }
        });
        return { found, seen, sheet };
    });
    check('proto crawlers spawn in ruins chunks', Boolean(protoResult.found.ruins), JSON.stringify(protoResult.found.ruins ?? protoResult.seen));
    check('proto spitters spawn in crater chunks', Boolean(protoResult.found.crater), JSON.stringify(protoResult.found.crater ?? protoResult.seen));
    check('proto sprites use 4x4 sheet UVs', protoResult.sheet?.repeat?.[0] === 0.25 && protoResult.sheet?.repeat?.[1] === 0.25, JSON.stringify(protoResult.sheet));
    await page.screenshot({ path: `${SHOTS}/physicality_protos.png` });

    // ── B) Civilians wander living camps ──
    const civ = await page.evaluate(() => {
        const g = window.game;
        g.ensureAct2Camps();
        const camp = g.camps[0];
        g.player.position.set(camp.pos.x + 2, 0, camp.pos.z + 2);
        const near = g.campCivilians.filter((c) => c.campId === camp.id);
        return {
            total: g.campCivilians.length,
            nearCamp: near.length,
            visible: near.every((c) => c.sprite.visible),
            sheet: near.every((c) => c.sprite.material.map.repeat.x === 0.25)
        };
    });
    check('two civilians per camp, sheet-animated', civ.total === 6 && civ.nearCamp === 2 && civ.sheet, JSON.stringify(civ));
    await sleep(1500);
    await page.screenshot({ path: `${SHOTS}/physicality_civilians.png` });

    // ── C) Suspicion lockdown: tells + refusal ──
    // Advancing the ladder fires phase-transition radio transmissions that
    // pause gameplay input — dismiss them like a player before interacting.
    await page.evaluate(() => {
        const g = window.game;
        g.act2.begin();
        g.act2.silenceUplink();
        g.act2.buildDish();
    });
    for (let i = 0; i < 30; i++) {
        const live = await page.evaluate(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
            return window.game.isGameplayInputActive();
        });
        if (live) break;
        await sleep(1000);
    }
    const lockdown = await page.evaluate(() => {
        const g = window.game;
        const camp = g.camps[0];
        g.act2.adjustCampSuspicion(camp.id, 60);
        g.syncCampVisualFromRecord(camp);
        const before = {
            strobe: camp.lockdownStrobe.visible,
            locked: camp.isLockedDown,
            barricade: camp.barricades[0]?.material.color.getHex() ?? null
        };
        g.player.position.set(camp.pos.x + 1, 0, camp.pos.z + 1);
        const action = g.getActionableCampAt(g.player.position.x, g.player.position.z);
        // Denial event fires when the player presses the prompt.
        let deniedMsg = null;
        window.addEventListener('camp-choice-denied', (e) => { deniedMsg = e.detail?.message; }, { once: true });
        const handled = g.interactWithAct2Camp();
        return { before, actionLabel: action?.label, actionKind: action?.action, handled, deniedMsg };
    });
    check('suspicion 60 lights the lockdown strobe', lockdown.before.strobe && lockdown.before.locked);
    check('lockdown prompt replaces camp actions', lockdown.actionKind === 'lockdown', `${lockdown.actionKind}: ${lockdown.actionLabel}`);
    check('pressing the prompt refuses with a reason', lockdown.handled === true && /LOCKED DOWN/.test(lockdown.deniedMsg ?? ''), lockdown.deniedMsg ?? 'no denial event');
    await page.screenshot({ path: `${SHOTS}/physicality_lockdown.png` });

    // ── D) Hive signal columns ──
    const hives = await page.evaluate(() => {
        const g = window.game;
        g.ensureHiveSites();
        const hive = g.hives[0];
        const dormant = { visible: hive.signalColumn.visible, color: hive.signalMat.color.getHex() };
        hive.setStatus('wounded');
        const wounded = hive.signalMat.color.getHex();
        hive.setStatus('slain');
        const slainVisible = hive.signalColumn.visible;
        return { id: hive.id, dormant, wounded, slainVisible };
    });
    check('hive column visible while alive, state-colored',
        hives.dormant.visible && hives.wounded === 0xff5a3c && hives.slainVisible === false,
        JSON.stringify(hives));

    console.log(results.every(Boolean) ? '\nALL PASS' : '\nSOME FAILED');
} finally {
    await browser.close();
}
