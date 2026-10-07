// Screens built on first open (Sprint 51 web perf, docs/planning/
// sprint-50-playtest-fixes-and-web-perf-2026-10-06.md "Split main.js per
// screen"). A heavy modal keeps its outer element in index.html, so every
// show/hide and focus-root check finds it, but its children sit in an inert
//   <template data-deferred-markup> ... </template>
// until something needs them: no layout, style or image cost at boot, and
// Lighthouse's DOM count drops by the screen's size.
//
// Code that touches a deferred screen's children calls mountDeferredMarkup()
// first, and wiring that used to run at boot goes in onDeferredMarkupMounted().
// As a safety net, showing the modal (removing `hidden`) mounts it too.

const mounted = new Set();
const listeners = new Map();
let decorate = null;
let observer = null;

/** Run on every mounted subtree: translations, input hints. */
export function setDeferredMarkupDecorator(fn) {
    decorate = typeof fn === 'function' ? fn : null;
}

export function isDeferredMarkupMounted(id) {
    return mounted.has(id);
}

/**
 * Build a deferred screen's children in place. Idempotent; returns the host
 * element (null when it is not in the page).
 */
export function mountDeferredMarkup(id, doc = globalThis.document) {
    const host = doc?.getElementById?.(id) ?? null;
    if (!host || mounted.has(id)) return host;
    const template = host.querySelector?.(':scope > template[data-deferred-markup]');
    mounted.add(id);
    if (template) {
        template.replaceWith(template.content);
        try {
            decorate?.(host);
        } catch (error) {
            console.warn('[deferred-markup] decorate failed', id, error);
        }
    }
    for (const callback of listeners.get(id) ?? []) {
        try {
            callback(host);
        } catch (error) {
            console.warn('[deferred-markup] mount callback failed', id, error);
        }
    }
    return host;
}

/** Wire a deferred screen once its children exist (now, if they already do). */
export function onDeferredMarkupMounted(id, callback, doc = globalThis.document) {
    if (!listeners.has(id)) listeners.set(id, []);
    listeners.get(id).push(callback);
    if (mounted.has(id)) callback(doc?.getElementById?.(id) ?? null);
}

/**
 * Mount any deferred screen the moment it is shown, for show paths that do
 * not mount it themselves. A one-off per page.
 */
export function watchDeferredMarkup(doc = globalThis.document) {
    if (observer || typeof MutationObserver === 'undefined' || !doc?.querySelectorAll) return;
    const hosts = [...doc.querySelectorAll('template[data-deferred-markup]')]
        .map((template) => template.parentElement)
        .filter((host) => host?.id);
    if (!hosts.length) return;
    observer = new MutationObserver((records) => {
        for (const record of records) {
            const host = record.target;
            if (!mounted.has(host.id) && !host.classList.contains('hidden')) mountDeferredMarkup(host.id, doc);
        }
    });
    for (const host of hosts) observer.observe(host, { attributes: true, attributeFilter: ['class'] });
}

export function resetDeferredMarkupForTests() {
    mounted.clear();
    listeners.clear();
    decorate = null;
    observer?.disconnect?.();
    observer = null;
}
