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
    // hook appears but before networkidle settles again — a fixed buffer is
    // crude but was the one thing that reliably avoided the click racing it
    // during investigation (confirmed via CDP: body had zero click listeners
    // without this, non-zero with it).
    await page.waitForTimeout(1_000);
    await page.locator('body').click();
    const splash = page.locator('#splash');
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
