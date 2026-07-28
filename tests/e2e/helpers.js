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
    await page.waitForLoadState('networkidle');
    // The click listener that reads "CLICK OR PRESS ANY KEY TO INITIALIZE"
    // (document.body.addEventListener('click', triggerBoot) in main.js) is
    // registered in the same synchronous block that exposes this hook.
    await page.waitForFunction(() => typeof window.HunkerTriggerBoot === 'function', { timeout: 15_000 });
    // Vite's dev-triggered reload can still land in the gap right after the
    // hook appears but before networkidle settles again, and how wide that
    // gap is varies with how loaded the machine is (this dev container runs
    // several concurrent agents/browsers) — a single fixed buffer flaked
    // under heavier contention. Retrying the click a few times, each after
    // a growing wait, is more robust than guessing one buffer length.
    const splash = page.locator('#splash');
    for (const bufferMs of [1_000, 2_500, 5_000]) {
        await page.waitForTimeout(bufferMs);
        await page.locator('body').click();
        const becameVisible = await splash
            .waitFor({ state: 'visible', timeout: 5_000 })
            .then(() => true)
            .catch(() => false);
        if (becameVisible) return splash;
    }
    // Last attempt, surfacing the real timeout error if it still fails.
    await page.locator('body').click();
    await splash.waitFor({ state: 'visible', timeout: 15_000 });
    return splash;
}

// Boots, then advances from the title splash to the operator-select screen
// (where #start-game / #steam-vault-btn / the console commands live).
export async function bootToOperatorMenu(page) {
    await bootToTitleSplash(page);
    await page.locator('#title-newrun-btn').click();
    await page.locator('#start-game').waitFor({ state: 'visible', timeout: 10_000 });
}

// Starting a run (#start-game) launches runMissionIntroSequence
// (main.js) — class intro video -> cutscene -> Mothership dialogue ->
// a door-transition reveal — which holds window.game.inputEnabled false
// (isGameplayInputActive() === false, src/threeGame.js:3009-3015) until
// the whole chain finishes. #global-skip-intro-btn fast-forwards the
// video/cutscene/dialogue (sets window.skipAllIntro), but taking the
// skip path also means body picks up hud-hidden almost immediately
// (the door-transition-reveal branch adds it before the transition
// even starts) — so #hud-run-seed's own "hidden" class clears (it does
// become the true seed text) while it's still not actually visible,
// because an *ancestor* is hidden. Waiting on that element's visibility
// first (as the non-skip boot path safely can) deadlocks here. Wait on
// window.game.inputEnabled directly instead — the one signal that
// actually means "the reveal finished and the player can act" — and
// only check hud-run-seed's own visibility afterward, once hud-hidden
// is guaranteed gone too.
// NOTE on the loop shape: the old "click skip if it appears within 5s,
// then wait (even 50s) for inputEnabled" had a load-dependent DEADLOCK,
// not just a slow path — under heavy machine load the skip button can
// appear after the 5s check gives up, no skip ever fires, and the
// Mothership dialogue then sits awaiting a manual [A]/[B] choice forever
// (confirmed against a clean checkout 2026-07-17; same failure mode the
// wave-5 doc logged). No fixed wait fixes that. Actively unblock
// whichever control is on screen each tick until input is actually live.
export async function startRunAndSkipIntro(page) {
    await page.evaluate(() => { window.skipAllIntro = true; }).catch(() => {});

    const rosterConfirm = page.locator('#roster-confirm-btn');
    const startGame = page.locator('#start-game');

    if (await rosterConfirm.isVisible().catch(() => false)) {
        await rosterConfirm.click();
        await page.waitForTimeout(200);
    }
    await startGame.click();

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
        throw new Error('startRunAndSkipIntro: window.game.inputEnabled never became true within 45s');
    }
    await page.locator('#hud-run-seed').waitFor({ state: 'visible', timeout: 5_000 });
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
