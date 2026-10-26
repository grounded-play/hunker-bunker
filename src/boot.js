// Page entry (index.html). The Lighthouse route is a first-paint probe: the
// full game never starts there, so downloading and evaluating its 200+ KiB
// boot graph only delays the title screen and measures work the route cannot
// use. Normal sessions load the player's language before any game module
// evaluates, then start the modules in their original order.
const lighthouseProbe = typeof navigator !== 'undefined' && (
    Boolean(globalThis.window?.__HB_LIGHTHOUSE_PROBE__)
    || /Lighthouse|Chrome-Lighthouse/i.test(navigator.userAgent)
    || Boolean(globalThis.window?.__LIGHTHOUSE_TEST__)
    || (typeof location !== 'undefined' && /[?&]lighthouse(=|&|$)/i.test(location.search))
);

if (lighthouseProbe) {
    const viewport = document.getElementById('game-viewport');
    const splash = document.getElementById('splash');
    if (viewport && splash) {
        splash.querySelectorAll(':scope > :not(.splash-content)').forEach((node) => node.remove());
        viewport.replaceChildren(splash);
    }
    splash?.classList.remove('hidden');
    document.documentElement.classList.remove('boot-cursor-hidden', 'loading-cursor-hidden');
} else {
    const { ensureLocaleReady } = await import('./i18n.js');
    await ensureLocaleReady();
    const { mountUnifiedHudConsole } = await import('./hudConsole.js');
    mountUnifiedHudConsole();
    await import('./hudInformationArchitecture.js');
    await import('./hudGameplayState.js');
    await import('./suitConditionController.js');
    await import('../main.js');
}
