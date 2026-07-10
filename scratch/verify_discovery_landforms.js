// Verify: camp discovery incentive + chunk landform terrain diversity.
// Recipe from scratch/smoke_camps.js: vite on :5199, bundled Chrome, boot
// to gameplay by skipping the mothership dialogue.
import puppeteer from 'puppeteer-core';

const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const SHOTS = '/tmp/claude-1001/-home-caveman-Desktop-icecave-hunker-bunker/fbdaf594-4fbe-47ac-b1bd-f5db26c1637a/scratchpad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

// strict: require live gameplay input (fresh-boot path). Non-strict (resume
// boots) settles for game+act2+player being up, which is all the state
// probes need — resume overlays can hold gameplay input longer.
async function bootToGameplay(page, { strict = true, budget = 420 } = {}) {
    await page.goto('http://localhost:5199/', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.mouse.click(480, 300);
    await sleep(2000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3000);
    await page.evaluate(() => document.getElementById('start-game')?.click());
    for (let i = 0; i < budget; i += 1) {
        await sleep(1000);
        const state = await page.evaluate((wantStrict) => {
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
            if (window.game?.isGameplayInputActive?.() === true) return 'live';
            if (!wantStrict && window.game?.act2 && window.game?.player) return 'live';
            return 'waiting';
        }, strict);
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
    // Fresh save for the run — cleared once (not on every navigation), so the
    // reload probe at the end can prove discovery persists across sessions.
    await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    check('boot to gameplay', await bootToGameplay(page));

    // ── A) Landform sampling: distribution + grid safety ──
    const landformInfo = await page.evaluate(() => {
        const g = window.game;
        const counts = {};
        const samples = {};
        for (let cx = -8; cx <= 8; cx++) {
            for (let cy = -8; cy <= 8; cy++) {
                const l = g.getChunkLandform(cx, cy);
                counts[l] = (counts[l] ?? 0) + 1;
                if (!samples[l] && Math.hypot(cx, cy) >= 2) samples[l] = { cx, cy };
            }
        }
        // Every chunk near spawn stays maze.
        let spawnRingMaze = true;
        for (let cx = -1; cx <= 1; cx++) {
            for (let cy = -1; cy <= 1; cy++) {
                if (g.getChunkLandform(cx, cy) !== 'maze') spawnRingMaze = false;
            }
        }
        // Build every sampled chunk and confirm all border portals open into
        // reachable floor (flood fill from each portal).
        const portalIssues = [];
        for (const [l, { cx, cy }] of Object.entries(samples)) {
            const grid = g.getOrCreateChunk(cx, cy);
            const size = grid.length;
            const floods = [];
            const flood = (sx, sy) => {
                const seen = new Set([`${sx},${sy}`]);
                const stack = [[sx, sy]];
                while (stack.length) {
                    const [x, y] = stack.pop();
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                        const k = `${nx},${ny}`;
                        if (seen.has(k) || grid[ny][nx] !== '.') continue;
                        seen.add(k);
                        stack.push([nx, ny]);
                    }
                }
                return seen.size;
            };
            for (let i = 1; i < size - 1; i++) {
                if (grid[0][i] === '.') floods.push(flood(i, 0));
                if (grid[size - 1][i] === '.') floods.push(flood(i, size - 1));
                if (grid[i][0] === '.') floods.push(flood(0, i));
                if (grid[i][size - 1] === '.') floods.push(flood(size - 1, i));
            }
            if (floods.some((f) => f < 20)) portalIssues.push(`${l}@${cx},${cy}: ${JSON.stringify(floods)}`);
        }
        return { counts, samples, spawnRingMaze, portalIssues };
    });
    const kinds = Object.keys(landformInfo.counts);
    check('landform variety in 17x17 chunk sweep', kinds.length >= 4, JSON.stringify(landformInfo.counts));
    check('maze most common', kinds.every((k) => k === 'maze' || landformInfo.counts.maze >= landformInfo.counts[k]));
    check('spawn ring stays maze', landformInfo.spawnRingMaze);
    check('all portals reach open floor in sampled chunks', landformInfo.portalIssues.length === 0, landformInfo.portalIssues.join(' | '));

    // ── B) Visual: teleport into a non-maze chunk and screenshot ──
    for (const kind of ['field', 'canyon', 'crater']) {
        const spot = landformInfo.samples[kind];
        if (!spot) { check(`sampled a ${kind} chunk`, false, 'none in sweep'); continue; }
        await page.evaluate((s) => {
            const g = window.game;
            const size = g.chunkSize;
            // Land on a floor tile near the chunk center.
            const grid = g.getOrCreateChunk(s.cx, s.cy);
            let tx = s.cx * size + 9, tz = s.cy * size + 9;
            outer: for (let y = 7; y < 12; y++) {
                for (let x = 7; x < 12; x++) {
                    if (grid[y][x] === '.') { tx = s.cx * size + x; tz = s.cy * size + y; break outer; }
                }
            }
            g.player.position.set(tx, 0, tz);
        }, spot);
        await sleep(2500);
        await page.screenshot({ path: `${SHOTS}/landform_${kind}.png` });
        const mounted = await page.evaluate(() => window.game?.isGameplayInputActive?.() === true);
        check(`teleported into ${kind} chunk without errors`, mounted);
        // Dump the grid so the screenshot can be read against ground truth.
        const dump = await page.evaluate((s) => window.game.getOrCreateChunk(s.cx, s.cy).map((r) => r.join('')).join('\n'), spot);
        console.log(`--- ${kind} chunk (${spot.cx},${spot.cy}) ---\n${dump}`);
    }

    // ── C) Camp discovery: flare burns, first contact pays once ──
    const before = await page.evaluate(() => {
        const g = window.game;
        g.ensureAct2Camps();
        const camp = g.camps[0];
        const record = g.act2.getState().camps.find((c) => c.id === camp.id);
        return {
            id: camp.id,
            x: camp.pos.x,
            z: camp.pos.z,
            flareVisible: camp.signalColumn?.visible === true,
            discovered: record.discovered,
            shells: g.bank?.getShells?.() ?? g.bank?.shells ?? null,
            o2: g.playerVitals?.o2 ?? null
        };
    });
    check('undiscovered camp burns a flare', before.flareVisible && before.discovered === false, JSON.stringify(before));

    // Drain some O2 so the top-up is observable, then walk into the camp.
    await page.evaluate((c) => {
        const g = window.game;
        g.adjustOxygen(-50);
        g.player.position.set(c.x + 1, 0, c.z + 1);
    }, before);
    await sleep(1500);

    const after = await page.evaluate((c) => {
        const g = window.game;
        const camp = g.camps.find((k) => k.id === c.id);
        const record = g.act2.getState().camps.find((r) => r.id === c.id);
        return {
            flareVisible: camp.signalColumn?.visible === true,
            discovered: record.discovered,
            campDiscoveredFlag: camp.discovered,
            shells: g.bank?.getShells?.() ?? g.bank?.shells ?? null,
            o2: g.playerVitals?.o2 ?? null
        };
    }, before);
    check('first contact marks discovery + persists', after.discovered === true && after.campDiscoveredFlag === true);
    check('flare doused on discovery', after.flareVisible === false);
    check('shells paid out (+10)', after.shells === before.shells + 10, `${before.shells} -> ${after.shells}`);
    check('O2 topped up', after.o2 !== null && after.o2 > (before.o2 - 50) + 20, `o2 ${after.o2}`);
    await page.screenshot({ path: `${SHOTS}/camp_discovered.png` });

    // 🔍 Probe: leave and re-enter — the payout must not repeat.
    await page.evaluate((c) => {
        const g = window.game;
        g.player.position.set(c.x + 40, 0, c.z + 40);
    }, before);
    await sleep(800);
    await page.evaluate((c) => { window.game.player.position.set(c.x + 1, 0, c.z + 1); }, before);
    await sleep(1200);
    const reentry = await page.evaluate(() => window.game.bank?.getShells?.() ?? window.game.bank?.shells ?? null);
    check('re-entry does not pay again', reentry === after.shells, `${after.shells} -> ${reentry}`);

    // 🔍 Probe: reload the page — discovery must survive, flare stays doused.
    await page.reload({ waitUntil: 'networkidle2' });
    check('reboot to gameplay', await bootToGameplay(page, { strict: false, budget: 120 }));
    const persisted = await page.evaluate((c) => {
        const g = window.game;
        g.ensureAct2Camps();
        const camp = g.camps.find((k) => k.id === c.id);
        const record = g.act2.getState().camps.find((r) => r.id === c.id);
        return { discovered: record.discovered, flareVisible: camp.signalColumn?.visible === true };
    }, before);
    check('discovery survives reload, flare stays doused', persisted.discovered === true && persisted.flareVisible === false, JSON.stringify(persisted));

    console.log(results.every(Boolean) ? '\nALL PASS' : '\nSOME FAILED');
} finally {
    await browser.close();
}
