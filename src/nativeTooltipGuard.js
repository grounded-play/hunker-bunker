function preserveAccessibleName(element, title) {
    if (!title || element.hasAttribute?.('aria-label')) return;
    element.setAttribute?.('aria-label', title);
}

export function stripNativeTitles(root) {
    if (!root) return 0;
    const titled = [];
    if (root.nodeType === 1 && root.hasAttribute?.('title')) titled.push(root);
    root.querySelectorAll?.('[title]')?.forEach((element) => titled.push(element));

    for (const element of titled) {
        const title = element.getAttribute?.('title')?.trim() ?? '';
        preserveAccessibleName(element, title);
        element.removeAttribute?.('title');
    }
    return titled.length;
}

// Chromium's native title bubbles can survive a screen swap while the pointer
// stays still. The game has its own focus/hover language, so remove that second
// tooltip system globally, including titles injected later by localized or
// debug UI. Accessible names are retained when a title was the only one.
export function installNativeTooltipGuard({
    documentObject = globalThis.document,
    MutationObserverClass = globalThis.MutationObserver
} = {}) {
    const root = documentObject?.documentElement;
    if (!root) return () => {};

    stripNativeTitles(root);
    if (typeof MutationObserverClass !== 'function') return () => {};

    const observer = new MutationObserverClass((records) => {
        for (const record of records) {
            if (record.type === 'attributes') stripNativeTitles(record.target);
            for (const node of record.addedNodes ?? []) stripNativeTitles(node);
        }
    });
    observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['title']
    });
    return () => observer.disconnect();
}
