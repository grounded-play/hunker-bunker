import { describe, expect, it, vi } from 'vitest';
import { COMMENTARY_ENTRIES, createDeveloperCommentary } from './developerCommentary.js';

// Minimal DOM: enough element behaviour for the commentary cards and list.
class FakeElement {
    constructor(tag) {
        this.tagName = tag.toUpperCase();
        this.children = [];
        this.parent = null;
        this.dataset = {};
        this.attributes = {};
        this.listeners = {};
        this.textContent = '';
        this.id = '';
        const classes = new Set();
        this.classList = {
            add: (...c) => c.forEach((x) => classes.add(x)),
            remove: (...c) => c.forEach((x) => classes.delete(x)),
            contains: (c) => classes.has(c),
            toString: () => [...classes].join(' ')
        };
        Object.defineProperty(this, 'className', {
            get: () => this.classList.toString(),
            set: (v) => { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => classes.add(x)); }
        });
    }
    append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
    appendChild(n) { this.append(n); return n; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    set innerHTML(v) { if (v === '') this.children = []; }
}

function makeDoc() {
    const byId = new Map();
    const body = new FakeElement('body');
    const doc = {
        body,
        createElement: (tag) => new FakeElement(tag),
        getElementById: (id) => byId.get(id) ?? findById(body, id) ?? null,
        register: (el) => { byId.set(el.id, el); return el; }
    };
    function findById(node, id) {
        if (node.id === id) return node;
        for (const c of node.children) { const hit = findById(c, id); if (hit) return hit; }
        return null;
    }
    return doc;
}

function setup(overrides = {}) {
    vi.useFakeTimers();
    const doc = makeDoc();
    let enabled = true;
    let gameplay = false;
    let seq = 0;
    const hudStack = new FakeElement('div');
    const deps = {
        doc,
        t: (key) => key,
        isEnabled: () => enabled,
        isGameplayActive: () => gameplay,
        isGameplayReady: () => gameplay,
        getHudStack: () => hudStack,
        nextCardSeq: () => seq++,
        dismissCard: vi.fn(),
        updateDeck: vi.fn(),
        focusTarget: vi.fn(),
        requestFrame: (fn) => fn(),
        ...overrides
    };
    const commentary = createDeveloperCommentary(deps);
    return {
        doc, deps, commentary, hudStack,
        setEnabled: (v) => { enabled = v; },
        setGameplay: (v) => { gameplay = v; }
    };
}

describe('developer commentary', () => {
    it('ships the authored catalog, including the opt-in card and the Queen', () => {
        expect(COMMENTARY_ENTRIES.commentary_on.title).toBeTruthy();
        expect(Object.keys(COMMENTARY_ENTRIES).length).toBeGreaterThan(5);
        for (const entry of Object.values(COMMENTARY_ENTRIES)) {
            expect(entry.title.length).toBeGreaterThan(0);
            expect(entry.body.length).toBeGreaterThan(0);
        }
    });

    it('shows nothing while commentary mode is off, or for an unknown key', () => {
        const { commentary, setEnabled } = setup();
        setEnabled(false);
        expect(commentary.show('commentary_on')).toBe(false);
        setEnabled(true);
        expect(commentary.show('no_such_entry')).toBe(false);
    });

    // Valve review 2026-09: commentary toggled on from a menu showed nothing.
    it('shows a card over the menus outside gameplay, and times it out itself', () => {
        const { commentary, doc } = setup();
        expect(commentary.show('commentary_on')).toBe(true);
        const host = doc.getElementById('menu-commentary-stack');
        expect(host).toBeTruthy();
        const card = host.children[0];
        expect(card.classList.contains('commentary-toast')).toBe(true);
        expect(card.classList.contains('visible')).toBe(true);
        expect(card.children[1].children[1].textContent).toBe(COMMENTARY_ENTRIES.commentary_on.title);
        vi.advanceTimersByTime(Number(card.dataset.autoDismissMs) + 400);
        expect(host.children).toHaveLength(0);
    });

    it('uses the HUD deck in gameplay and lets the deck own dismissal', () => {
        const { commentary, deps, hudStack, setGameplay } = setup();
        setGameplay(true);
        expect(commentary.show('commentary_on')).toBe(true);
        expect(hudStack.children).toHaveLength(1);
        expect(deps.updateDeck).toHaveBeenCalled();
        const card = hudStack.children[0];
        card.listeners.pointerdown[0]({ preventDefault() {} });
        expect(deps.dismissCard).toHaveBeenCalledWith(card);
    });

    it('shows each entry once per run unless forced, and resets with the run', () => {
        const { commentary } = setup();
        expect(commentary.show('black_box_signal')).toBe(true);
        expect(commentary.show('black_box_signal')).toBe(false);
        expect(commentary.show('black_box_signal', {}, { once: false })).toBe(true);
        commentary.resetRun();
        expect(commentary.show('black_box_signal')).toBe(true);
    });

    it('holds run-start commentary until the player is in control', () => {
        const { commentary, doc, setGameplay } = setup();
        commentary.showWhenPlaying('run_start');
        vi.advanceTimersByTime(1500);
        expect(doc.getElementById('menu-commentary-stack')).toBeNull();
        setGameplay(true);
        vi.advanceTimersByTime(600);
        expect(commentary.show('run_start')).toBe(false); // already shown once this run
    });

    it('lists every entry in the Read All modal and opens/closes it', () => {
        const { commentary, doc, deps } = setup();
        const modal = doc.register(Object.assign(new FakeElement('div'), { id: 'commentary-list-modal' }));
        modal.classList.add('hidden');
        const list = doc.register(Object.assign(new FakeElement('div'), { id: 'commentary-list' }));
        doc.register(Object.assign(new FakeElement('button'), { id: 'close-commentary-list' }));
        commentary.openList();
        expect(modal.classList.contains('hidden')).toBe(false);
        expect(list.children).toHaveLength(Object.keys(COMMENTARY_ENTRIES).length);
        expect(deps.focusTarget).toHaveBeenCalled();
        expect(commentary.closeList()).toBe(true);
        expect(commentary.closeList()).toBe(false);
    });

    // Generated voice lines (src/voiceLines.js): a card is also read aloud
    // when that entry has a recording in the current language.
    it('asks for the entry to be read aloud each time its card is shown', () => {
        const speak = vi.fn();
        const { commentary } = setup({ speak });
        commentary.show('run_start');
        expect(speak).toHaveBeenCalledWith('run_start');
        commentary.show('run_start');
        expect(speak).toHaveBeenCalledTimes(1);
    });

    // S49-38: explicit lifecycle. Nothing may fire or linger after teardown.
    it('cancels pending cards and waits, and removes its menu stack, on dispose', () => {
        const { commentary, doc, setGameplay } = setup();
        commentary.show('commentary_on');
        commentary.showWhenPlaying('run_start');
        commentary.dispose();
        expect(doc.getElementById('menu-commentary-stack')).toBeNull();
        setGameplay(true);
        vi.advanceTimersByTime(130_000);
        expect(vi.getTimerCount()).toBe(0);
        expect(commentary.show('commentary_on')).toBe(false);
        vi.useRealTimers();
    });
});
