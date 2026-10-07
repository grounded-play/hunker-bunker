// Every full-screen presentation layer: movies (boss, class and interstitial
// videos all play in .class-intro-overlay), still cinematics, the crash
// cutscene, RGB cinematics and the blast-door transition. No pointer of any
// kind belongs on top of these.
export const PRESENTATION_LAYER_SELECTOR = '.fullscreen-video-overlay:not(.hidden), '
    + '.cinematic-overlay:not(.hidden), '
    + '.class-intro-overlay:not(.is-closing), '
    + '.cinematic-still-overlay:not(.is-closing), '
    + '#cutscene-overlay.is-active, '
    + '.rgb-cinematic--visible, '
    + '#transition-overlay.active';

// Any element that could ever match the selector above, in any state.
const PRESENTATION_CANDIDATE_SELECTOR = '.fullscreen-video-overlay, .cinematic-overlay, .class-intro-overlay, '
    + '.cinematic-still-overlay, #cutscene-overlay, [class*="rgb-cinematic"], #transition-overlay';
const PRESENTATION_CLASS_TOKEN = /(^|\s)(fullscreen-video-overlay|cinematic-overlay|class-intro-overlay|cinematic-still-overlay|rgb-cinematic\S*)(\s|$)/;
const PRESENTATION_IDS = new Set(['cutscene-overlay', 'transition-overlay']);

function isCandidateElement(node) {
    if (!node || node.nodeType !== 1) return false;
    if (PRESENTATION_IDS.has(node.id)) return true;
    const className = typeof node.className === 'string' ? node.className : node.getAttribute?.('class') ?? '';
    if (PRESENTATION_CLASS_TOKEN.test(className)) return true;
    return Boolean(node.querySelector?.(PRESENTATION_CANDIDATE_SELECTOR));
}

/**
 * Can this mutation change whether a presentation layer is up? The cursor
 * observer sees every class change and every node added anywhere (loader log
 * lines, HUD updates), and answering by querying the whole document each time
 * cost ~400 ms of main thread during boot (issue #106). Only a presentation
 * element changing class, or being added or removed, can change the answer.
 */
export function isPresentationMutation(record) {
    if (!record) return false;
    if (record.type === 'attributes') {
        const target = record.target;
        if (PRESENTATION_IDS.has(target?.id)) return true;
        const current = typeof target?.className === 'string' ? target.className : target?.getAttribute?.('class') ?? '';
        return PRESENTATION_CLASS_TOKEN.test(current) || PRESENTATION_CLASS_TOKEN.test(record.oldValue ?? '');
    }
    if (record.type === 'childList') {
        for (const node of record.addedNodes ?? []) if (isCandidateElement(node)) return true;
        for (const node of record.removedNodes ?? []) if (isCandidateElement(node)) return true;
    }
    return false;
}
