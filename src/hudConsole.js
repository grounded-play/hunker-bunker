const SLOT_CONTENT = Object.freeze({
    '.hud-console__map-slot': [
        '.level-indicator',
        '#desktop-compass'
    ],
    '.hud-console__suit-slot': [
        '#vitals-panel',
        '#ship-status-panel',
        '#pickup-counter-panel',
        '#weapon-status-panel'
    ],
    '.hud-console__mission-slot': [
        '#objective-drawer',
        '#class-ability-panel',
        '#radar-scan-panel',
        '#dash-cooldown-panel',
        '#melee-cooldown-panel',
        '.hud-corner-settings'
    ],
    '#hud-console-overlays': [
        '.hud-mission-stack',
        '.hud-right-rail',
        '#loop-step-hud',
        '#boss-status-panel',
        '#hazard-status-panel',
        '#queens-ledger-hud',
        '#tutorial-prompt',
        '#expedition-briefing-card'
        // #compound-location-title stays a top-center card in #game-viewport:
        // the console's bottom-left overlay slot truncated every room name.
    ]
});

/**
 * Consolidate the existing HUD instruments without cloning or replacing them.
 * Keeping the live nodes preserves every gameplay listener and aria-live region.
 */
export function mountUnifiedHudConsole(documentRef = document) {
    const consoleRoot = documentRef.getElementById('hud-console');
    if (!consoleRoot || consoleRoot.dataset.mounted === 'true') return consoleRoot ?? null;

    for (const [slotSelector, contentSelectors] of Object.entries(SLOT_CONTENT)) {
        const slot = documentRef.querySelector(slotSelector);
        if (!slot) continue;
        for (const selector of contentSelectors) {
            const element = documentRef.querySelector(selector);
            if (element && element !== slot && element.parentNode !== slot) slot.appendChild(element);
        }
    }

    consoleRoot.dataset.mounted = 'true';
    documentRef.documentElement.dataset.hudConsole = 'unified';
    return consoleRoot;
}

