import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installToastNotification, showToastNotification } from './toastNotification.js';

class FakeElement {
    constructor(tag) {
        this.tagName = tag;
        this.id = '';
        this.className = '';
        this.textContent = '';
        this.attributes = {};
        this.children = [];
        this.parent = null;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    remove() {
        if (!this.parent) return;
        this.parent.children = this.parent.children.filter((c) => c !== this);
        this.parent = null;
    }
    get isConnected() { return Boolean(this.parent); }
    get childElementCount() { return this.children.length; }
    get firstElementChild() { return this.children[0] ?? null; }
}

function fakeDocument() {
    const body = new FakeElement('body');
    body.parent = { children: [body] };
    return {
        body,
        createElement: (tag) => new FakeElement(tag),
        getElementById: (id) => body.children.find((c) => c.id === id) ?? null
    };
}

describe('toast notifications', () => {
    let doc;
    beforeEach(() => {
        vi.useFakeTimers();
        doc = fakeDocument();
    });
    afterEach(() => vi.useRealTimers());

    // 2026-10-15 playtest: every window.showToastNotification call was a
    // silent no-op because nothing defined it.
    it('installs window.showToastNotification so callers reach the screen', () => {
        const target = {};
        installToastNotification(target);
        expect(typeof target.showToastNotification).toBe('function');
    });

    it('shows the message in a live region and removes the stack once it expires', () => {
        const toast = showToastNotification('HOST IS ON 2.4.16-beta, YOU ARE ON 2.4.17-beta', { doc, tone: 'error', duration: 9000 });
        const stack = doc.getElementById('hb-toast-stack');
        expect(stack.attributes['aria-live']).toBe('polite');
        expect(toast.textContent).toContain('2.4.16-beta');
        expect(toast.className).toContain('hb-toast--error');
        vi.advanceTimersByTime(9000);
        expect(doc.getElementById('hb-toast-stack')).toBeNull();
    });

    it('refreshes a repeated notice instead of stacking copies', () => {
        const first = showToastNotification('VERSION MISMATCH', { doc, now: 0 });
        const second = showToastNotification('VERSION MISMATCH', { doc, now: 500 });
        expect(second).toBe(first);
        expect(doc.getElementById('hb-toast-stack').childElementCount).toBe(1);
    });

    it('ignores empty messages', () => {
        expect(showToastNotification('  ', { doc })).toBeNull();
        expect(doc.getElementById('hb-toast-stack')).toBeNull();
    });
});
