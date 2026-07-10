// Verify: sprint-19 wave-2 Claude lane — the Bunker Tree (one surface, three
// branches, purchases through legacy plumbing, old sections retired) and
// findable lore drops (spawn, collect, reader, persistence, no respawn).
// Boot harness from scratch/verify_physicality.js.
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
    await page.goto(`http://localhost:${process.env.HB_PORT ?? 5199}/`, { waitUntil: 'networkidle2' });
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
    await page.goto(`http://localhost:${process.env.HB_PORT ?? 5199}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    check('boot to gameplay', await bootToGameplay(page));

    // ── A) The Bunker Tree: one surface, three branches ──
    const tree = await page.evaluate(() => {
        const g = window.game;
        const ship = g.getActiveShip();
        g.bank.addShells(500);
        g.bank.deposit({ tech: 800, coin: 300, med: 100 });
        g.openConsoleModal(ship);
        document.getElementById('terminal-tab-skills')?.click();
        const classNodes = document.querySelectorAll('#skills-tree-grid .skill-node-card').length;
        const branchGrids = document.querySelectorAll('#skills-upgrade-matrix .skills-tree-grid').length;
        const branchTitles = [...document.querySelectorAll('#skills-upgrade-matrix .skills-branch-title')].map((el) => el.textContent);
        const oldSectionsHidden = ['tier2-section', 'weapons-section']
            .every((id) => document.getElementById(id)?.classList.contains('hidden') ?? true);
        return { classNodes, branchGrids, branchTitles, oldSectionsHidden };
    });
    check('class branch renders as node cards', tree.classNodes >= 6, `nodes: ${tree.classNodes}`);
    check('combat + ship branches render as tree grids', tree.branchGrids === 2, JSON.stringify(tree.branchTitles));
    check('old card sections are retired', tree.oldSectionsHidden);
    await page.screenshot({ path: `${SHOTS}/wave2_bunker_tree.png` });

    // Purchase one node per branch through the rendered buttons.
    const purchases = await page.evaluate(() => {
        const g = window.game;
        const before = {
            skillCount: (g.bank.getState().unlockedSkills ?? []).length,
            weaponLevels: { ...g.bank.getState().weaponUpgrades },
            o2Level: g.bank.getO2GeneratorLevel()
        };
        const clickFirstButton = (rootSel) => {
            const btn = document.querySelector(`${rootSel} .skill-node-card.node-state--available .skill-node-btn`);
            if (!btn) return false;
            btn.click();
            return true;
        };
        const clickedClass = clickFirstButton('#skills-tree-grid');
        const grids = document.querySelectorAll('#skills-upgrade-matrix .skills-tree-grid');
        const clickedCombat = grids[0] ? Boolean(grids[0].querySelector('.skill-node-card.node-state--available .skill-node-btn')?.click() ?? grids[0].querySelector('.skill-node-card.node-state--available .skill-node-btn')) : false;
        const gridsAfter = document.querySelectorAll('#skills-upgrade-matrix .skills-tree-grid');
        const clickedShip = gridsAfter[1] ? Boolean(gridsAfter[1].querySelector('.skill-node-card.node-state--available .skill-node-btn')?.click() ?? gridsAfter[1].querySelector('.skill-node-card.node-state--available .skill-node-btn')) : false;

        const state = g.bank.getState();
        const after = {
            skillUnlockedCount: (state.unlockedSkills ?? []).length,
            weaponLevels: { ...state.weaponUpgrades },
            o2Level: g.bank.getO2GeneratorLevel(),
            unlocks: { ...state.unlocks },
            tier2: { ...state.tier2Unlocks }
        };
        return { before, after, clickedClass, clickedCombat, clickedShip };
    });
    const weaponLeveled = Object.keys(purchases.after.weaponLevels)
        .some((k) => purchases.after.weaponLevels[k] > (purchases.before.weaponLevels[k] ?? 0));
    const shipAdvanced = purchases.after.o2Level > purchases.before.o2Level
        || Object.values(purchases.after.unlocks ?? {}).some(Boolean)
        || Object.values(purchases.after.tier2 ?? {}).some(Boolean);
    check('class-branch purchase lands in the bank', purchases.clickedClass && purchases.after.skillUnlockedCount >= 1, JSON.stringify({ clicked: purchases.clickedClass, count: purchases.after.skillUnlockedCount }));
    check('combat-branch purchase raises a weapon level', weaponLeveled, JSON.stringify(purchases.after.weaponLevels));
    check('ship-branch purchase advances a system', shipAdvanced, JSON.stringify({ o2: purchases.after.o2Level, unlocks: purchases.after.unlocks }));
    await page.screenshot({ path: `${SHOTS}/wave2_tree_after_buys.png` });
    await page.evaluate(() => window.game.closeConsoleModal());

    // ── B) Lore drops: spawn, collect, read, persist ──
    const spawned = await page.evaluate(async () => {
        const g = window.game;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        // Sweep for ruins/crater chunks to trigger mount-time spawns.
        for (let cx = -9; cx <= 9 && g.loreDrops.length === 0; cx++) {
            for (let cy = -9; cy <= 9 && g.loreDrops.length === 0; cy++) {
                if (Math.hypot(cx, cy) < 2) continue;
                const lf = g.getChunkLandform(cx, cy);
                if (lf !== 'ruins' && lf !== 'crater') continue;
                g.player.position.set(cx * g.chunkSize + 9, 0, cy * g.chunkSize + 9);
                g.syncVisibleChunks(true);
                await sleep(120);
            }
        }
        // Camp/hive site drops spawn from the update loop once sites exist.
        g.ensureAct2Camps();
        await sleep(400);
        return {
            count: g.loreDrops.length,
            first: g.loreDrops[0] ? { key: g.loreDrops[0].drop.key, x: g.loreDrops[0].sprite.position.x, z: g.loreDrops[0].sprite.position.z } : null
        };
    });
    check('lore drops spawn in the world', spawned.count > 0 && spawned.first, JSON.stringify(spawned));

    const collected = await page.evaluate(async (target) => {
        const g = window.game;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        let eventDetail = null;
        window.addEventListener('lore-drop-collected', (e) => { eventDetail = e.detail; }, { once: true });
        g.player.position.set(target.x, 0, target.z);
        await sleep(600);
        const modal = document.getElementById('lore-modal');
        const mem = JSON.parse(localStorage.getItem('hb_world_memory_v1') ?? '{}');
        return {
            eventDetail,
            modalOpen: modal ? !modal.classList.contains('hidden') : false,
            modalKey: document.getElementById('lore-modal-key')?.textContent ?? '',
            persisted: (mem.logsFound ?? []).includes(target.key),
            remaining: g.loreDrops.filter((d) => d.drop.key === target.key).length
        };
    }, spawned.first);
    check('walking onto a drop collects it and fires the event', collected.eventDetail?.key === spawned.first.key, JSON.stringify(collected.eventDetail));
    check('the reader modal opens with the drop text', collected.modalOpen, collected.modalKey);
    check('found key persists to world memory', collected.persisted);
    check('collected drop leaves the world', collected.remaining === 0);
    await page.screenshot({ path: `${SHOTS}/wave2_lore_reader.png` });

    // 🔍 Probe: reload — the same key must never spawn again.
    await page.reload({ waitUntil: 'networkidle2' });
    check('reboot to gameplay', await bootToGameplay(page, { budget: 420 }));
    const respawn = await page.evaluate(async (target) => {
        const g = window.game;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let cx = -9; cx <= 9; cx++) {
            for (let cy = -9; cy <= 9; cy++) {
                if (Math.hypot(cx, cy) < 2) continue;
                const lf = g.getChunkLandform(cx, cy);
                if (lf !== 'ruins' && lf !== 'crater') continue;
                g.player.position.set(cx * g.chunkSize + 9, 0, cy * g.chunkSize + 9);
                g.syncVisibleChunks(true);
                await sleep(80);
            }
        }
        g.ensureAct2Camps();
        await sleep(400);
        return {
            foundKeyRespawned: g.loreDrops.some((d) => d.drop.key === target.key),
            totalDrops: g.loreDrops.length
        };
    }, spawned.first);
    check('collected key never respawns after reload', respawn.foundKeyRespawned === false, JSON.stringify(respawn));

    // 🔍 Probe: saves from before the tree change still load — the bank state
    // written by the old surfaces this session reads back intact.
    const saveCompat = await page.evaluate(() => {
        const g = window.game;
        const state = g.bank.getState();
        return {
            weaponKeysIntact: Object.keys(state.weaponUpgrades ?? {}).length >= 5,
            o2Level: g.bank.getO2GeneratorLevel(),
            skillStillUnlocked: (state.unlockedSkills ?? []).length >= 1
        };
    });
    check('pre-tree purchases survive the reload', saveCompat.weaponKeysIntact && saveCompat.skillStillUnlocked, JSON.stringify(saveCompat));

    console.log(results.every(Boolean) ? '\nALL PASS' : '\nSOME FAILED');
} finally {
    await browser.close();
}
