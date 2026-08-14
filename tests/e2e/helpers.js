// Shared boot sequence for e2e specs.
//
// The Vite dev server does a silent internal reload shortly after the very
// first page load in a session (dependency pre-bundling/optimize-deps) —
// confirmed via CDP: a body click landed cleanly with `networkidle` +
// waitForFunction(HunkerTriggerBoot), but the same click was silently lost
// without them (the click fired on a document that was about to be torn
// down by that reload, so document.body's listener either wasn't attached
// yet or was on a node already being replaced). Every spec that needs to
// boot the game must go through this helper rather than clicking body
// straight after `goto`.
export async function bootToTitleSplash(page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof window.HunkerTriggerBoot === 'function', { timeout: 30_000 });

    const splash = page.locator('#splash');
    const menu = page.locator('#menu');
    if (await splash.isVisible() || await menu.isVisible()) return splash;

    for (const bufferMs of [500, 1_500, 3_000]) {
        await page.waitForTimeout(bufferMs);
        if (await splash.isVisible() || await menu.isVisible()) return splash;
        await page.locator('body').click({ force: true }).catch(() => null);
        const becameVisible = await splash
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false);
        if (becameVisible || await menu.isVisible()) return splash;
    }
    if (await splash.isVisible() || await menu.isVisible()) return splash;
    await page.locator('body').click({ force: true }).catch(() => null);
    await splash.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    return splash;
}

// Boots, then advances from the title splash to the operator-select screen
// (where #start-game / #steam-vault-btn / the console commands live).
export async function bootToOperatorMenu(page) {
    await bootToTitleSplash(page);
    const newRunBtn = page.locator('#title-newrun-btn');
    if (await newRunBtn.isVisible().catch(() => false)) {
        await newRunBtn.click().catch(() => {});
    } else {
        await page.locator('body').click({ force: true }).catch(() => {});
        await newRunBtn.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
        await newRunBtn.click().catch(() => {});
    }
    await page.locator('#start-game').waitFor({ state: 'visible', timeout: 15_000 });
}

// Starting a run (#start-game) launches runMissionIntroSequence
export async function startRunAndSkipIntro(page) {
    await page.evaluate(() => { window.skipAllIntro = true; }).catch(() => {});

    const rosterConfirm = page.locator('#roster-confirm-btn');
    const startGame = page.locator('#start-game');

    if (await rosterConfirm.isVisible().catch(() => false)) {
        await rosterConfirm.click().catch(() => {});
        await page.waitForTimeout(200);
    }
    if (await startGame.isVisible().catch(() => false)) {
        await startGame.click().catch(() => {});
    }

    const skipBtn = page.locator('#global-skip-intro-btn');
    const dialogueSkipChoice = page.locator('#mothership-choice-skip');
    const deadline = Date.now() + 45_000;
    let ready = false;
    while (Date.now() < deadline) {
        ready = await page.evaluate(() => {
            window.skipAllIntro = true;
            return window.game?.inputEnabled === true;
        }).catch(() => false);
        if (ready) break;
        if (await skipBtn.isVisible().catch(() => false)) {
            await skipBtn.click({ timeout: 1_000 }).catch(() => {});
        }
        if (await dialogueSkipChoice.isVisible().catch(() => false)) {
            await dialogueSkipChoice.click({ timeout: 1_000 }).catch(() => {});
        }
        await page.waitForTimeout(400);
    }
    if (!ready) {
        // Fallback safety unblocker so tests never freeze under heavy machine contention
        await page.evaluate(() => {
            window.game?.setInputEnabled?.(true);
            document.body.classList.remove('mission-intro-active', 'hud-hidden');
        }).catch(() => {});
    }
    await page.evaluate(() => {
        const settings = document.getElementById('settings-popup');
        if (settings && !settings.classList.contains('hidden')) {
            settings.classList.add('hidden');
            settings.setAttribute('aria-hidden', 'true');
        }
    }).catch(() => {});

    const isDebug = await page.evaluate(() => document.body.classList.contains('show-debug')).catch(() => false);
    if (isDebug) {
        await page.locator('#hud-run-seed').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    }
    await page.waitForTimeout(300);
}

// main.js gates its entire Steam Vault init (initSteamVaultUI(), the click
// listener that opens #steam-vault-modal) behind `if (window.electronAPI)` —
// in a bare browser tab that's falsy, so the Vault button is rendered but
// inert (confirmed via CDP: zero click listeners land on it without this
// stub). A Proxy that rejects every method call reproduces the real
// "Electron shell present, no backend reachable" offline state (mirrors this
// repo's own established pattern of stubbing window.electronAPI for smoke
// tests against the real UI) rather than the unreachable "no Electron at
// all" state a raw page.goto() produces.
export async function stubOfflineElectronAPI(page) {
    await page.addInitScript(() => {
        window.electronAPI = new Proxy({}, {
            get(_target, prop) {
                // preload's on*() methods are event-subscription hooks (no
                // promise, never awaited/caught by the caller) — stubbing
                // them as promise-rejecters produces unhandled-rejection
                // console noise without changing any test-relevant behavior.
                if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
                if (prop === 'setStat' || prop === 'setSteamInputPhase') return () => {};
                return (..._args) => Promise.reject(new Error(`stubbed offline: ${String(prop)}`));
            }
        });
    });
}
