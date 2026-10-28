import { describe, expect, it } from 'vitest';
import { attachScrollCue } from './kioskTerminals.js';

function fakeElement() {
    const classes = new Set();
    const listeners = new Map();
    return {
        children: [],
        attributes: {},
        classList: {
            toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
            contains: (name) => classes.has(name)
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        appendChild(child) { this.children.push(child); child.parent = this; },
        remove() { this.parent?.children.splice(this.parent.children.indexOf(this), 1); },
        addEventListener: (type, fn) => listeners.set(type, fn),
        removeEventListener: (type) => listeners.delete(type),
        fire: (type) => listeners.get(type)?.(),
        listeners
    };
}

// QA 2026-10-28: the Fab Bay's list ran on below the machine's small screen
// and nothing said it scrolled.
describe('kiosk scroll cue', () => {
    const doc = { createElement: () => fakeElement() };

    it('shows while more of the list sits below the screen, and hides at the end', () => {
        const screen = Object.assign(fakeElement(), { scrollHeight: 600, clientHeight: 339, scrollTop: 0 });
        attachScrollCue(screen, doc);
        const [cue] = screen.children;
        expect(cue.attributes['aria-hidden']).toBe('true');
        expect(cue.classList.contains('is-hidden')).toBe(false);
        screen.scrollTop = 261;
        screen.fire('scroll');
        expect(cue.classList.contains('is-hidden')).toBe(true);
    });

    it('stays hidden when everything fits', () => {
        const screen = Object.assign(fakeElement(), { scrollHeight: 300, clientHeight: 339, scrollTop: 0 });
        attachScrollCue(screen, doc);
        expect(screen.children[0].classList.contains('is-hidden')).toBe(true);
    });

    it('removes itself and its listener', () => {
        const screen = Object.assign(fakeElement(), { scrollHeight: 600, clientHeight: 339, scrollTop: 0 });
        const remove = attachScrollCue(screen, doc);
        remove();
        expect(screen.children).toHaveLength(0);
        expect(screen.listeners.has('scroll')).toBe(false);
    });
});
