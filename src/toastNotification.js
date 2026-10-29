// window.showToastNotification(message): the short notice multiplayer and
// co-op code has called for months (join rejected, squadmate down, host
// reassigned, ...). Nothing ever defined it, so every one of those calls was
// a silent no-op in shipped builds -- the 2026-10-15 playtest's two players
// pressed JOIN six times across a 2.4.16 / 2.4.17 version split and saw
// nothing at all.
//
// The stack is created on demand and removed once empty: an always-mounted
// overlay without .hidden pins the Steam Deck to the menu action set
// (see the Steam Input action-set trap). It never takes focus or pointer
// input, so controller navigation underneath is unaffected.
const STACK_ID = 'hb-toast-stack';
const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 4;
// A repeated notice (pressing JOIN again) refreshes the one on screen
// instead of stacking copies.
const REPEAT_WINDOW_MS = 1500;

const recent = new Map();

function ensureStack(doc) {
    let stack = doc.getElementById(STACK_ID);
    if (stack) return stack;
    stack = doc.createElement('div');
    stack.id = STACK_ID;
    stack.className = 'hb-toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    doc.body.appendChild(stack);
    return stack;
}

function removeToast(toast, doc) {
    toast.remove();
    for (const [key, entry] of recent) if (entry.toast === toast) recent.delete(key);
    const stack = doc.getElementById(STACK_ID);
    if (stack && stack.childElementCount === 0) stack.remove();
}

export function showToastNotification(message, { duration = DEFAULT_DURATION_MS, tone = 'info', doc = globalThis.document, now = Date.now() } = {}) {
    const text = String(message ?? '').trim();
    if (!text || !doc?.body) return null;
    const key = `${tone}|${text}`;
    const previous = recent.get(key);
    if (previous?.toast?.isConnected && now - previous.at < REPEAT_WINDOW_MS + duration) {
        clearTimeout(previous.timer);
        previous.at = now;
        previous.timer = setTimeout(() => removeToast(previous.toast, doc), duration);
        return previous.toast;
    }

    const stack = ensureStack(doc);
    while (stack.childElementCount >= MAX_VISIBLE) removeToast(stack.firstElementChild, doc);
    const toast = doc.createElement('div');
    toast.className = `hb-toast hb-toast--${tone}`;
    toast.textContent = text;
    stack.appendChild(toast);
    const entry = { toast, at: now, timer: setTimeout(() => removeToast(toast, doc), duration) };
    recent.set(key, entry);
    return toast;
}

export function installToastNotification(target = globalThis.window) {
    if (!target) return;
    target.showToastNotification = (message, options) => showToastNotification(message, options);
}
