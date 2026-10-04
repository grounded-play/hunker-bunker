import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PlayerChat } from './playerChat.js';
import { initPlayerChatUI } from './playerChatUi.js';

class MockElement {
    constructor(tag, className = '') {
        this.tagName = tag.toUpperCase();
        this._className = className;
        this._id = '';
        this.attributes = new Map();
        this.listeners = new Map();
        this.children = [];
        this.parentElement = null;
        this.textContent = '';
        this.value = '';
        this.disabled = false;
        this.dataset = {};
        this.scrollTop = 0;
        this.scrollHeight = 100;
        this.clientHeight = 100;
    }

    get className() { return this._className; }
    set className(val) { this._className = val; }

    get classList() {
        return {
            contains: (c) => this._className.split(/\s+/).includes(c),
            add: (c) => {
                if (!this.classList.contains(c)) {
                    this._className = (this._className + ' ' + c).trim();
                }
            },
            remove: (c) => {
                this._className = this._className.split(/\s+/).filter((cls) => cls !== c).join(' ');
            },
            toggle: (c, force) => {
                const has = this.classList.contains(c);
                if (force === undefined) {
                    if (has) this.classList.remove(c);
                    else this.classList.add(c);
                } else if (force) this.classList.add(c);
                else this.classList.remove(c);
            }
        };
    }

    get id() { return this._id; }
    set id(val) {
        this._id = val;
        if (typeof globalThis.document?._registerId === 'function') {
            globalThis.document._registerId(val, this);
        }
    }

    setAttribute(k, v) {
        this.attributes.set(k, String(v));
        if (k === 'id') this.id = v;
    }
    getAttribute(k) { return this.attributes.get(k) ?? null; }
    removeAttribute(k) {
        this.attributes.delete(k);
        if (k === 'id') this.id = '';
    }

    addEventListener(event, fn) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(fn);
    }
    removeEventListener(event, fn) {
        const list = this.listeners.get(event);
        if (list) {
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
        }
    }

    dispatchEvent(evt) {
        evt.target = evt.target || this;
        evt.currentTarget = this;
        const list = this.listeners.get(evt.type) || [];
        for (const fn of list) fn(evt);
        return !evt.defaultPrevented;
    }

    click() {
        this.dispatchEvent({
            type: 'click',
            target: this,
            currentTarget: this,
            preventDefault() {},
            stopPropagation() {}
        });
    }

    focus() {
        if (typeof globalThis.document !== 'undefined') {
            globalThis.document.activeElement = this;
        }
    }

    append(...nodes) {
        for (const node of nodes) {
            this.children.push(node);
            node.parentElement = this;
            if (node.id && typeof globalThis.document?._registerId === 'function') {
                globalThis.document._registerId(node.id, node);
            }
        }
    }

    replaceChildren(...nodes) {
        this.children = [];
        this.append(...nodes);
    }

    remove() {
        if (this.parentElement) {
            const idx = this.parentElement.children.indexOf(this);
            if (idx >= 0) this.parentElement.children.splice(idx, 1);
            this.parentElement = null;
        }
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const parts = selector.trim().split(/\s+/);
        if (parts.length > 1) {
            let current = [this];
            for (const part of parts) {
                const next = [];
                for (const node of current) {
                    next.push(...node.querySelectorAll(part));
                }
                current = next;
            }
            return current;
        }

        const part = parts[0];
        const results = [];
        const check = (node) => {
            let match = false;
            if (part.startsWith('#') && node.id === part.slice(1)) match = true;
            else if (part.startsWith('.') && node.classList.contains(part.slice(1))) match = true;
            else if (part === 'button' && node.tagName === 'BUTTON') match = true;
            else if (part.startsWith('[') && part.endsWith(']')) {
                const attr = part.slice(1, -1);
                if (attr.includes('=')) {
                    const [k, v] = attr.split('=');
                    const cleanVal = v.replace(/['"]/g, '');
                    if (k.startsWith('data-')) {
                        const dataKey = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                        if (node.dataset[dataKey] === cleanVal) match = true;
                    } else if (node.getAttribute(k) === cleanVal) match = true;
                } else if (attr.startsWith('data-')) {
                    const dataKey = attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                    if (dataKey in node.dataset || Object.hasOwn(node.dataset, dataKey)) match = true;
                } else if (node.getAttribute(attr) !== null) match = true;
            }
            if (match) results.push(node);
            for (const child of node.children) check(child);
        };
        for (const child of this.children) check(child);
        return results;
    }
}

describe('PlayerChat UI controller with mock DOM', () => {
    let originalDoc;
    let originalWin;
    let mockDoc;
    let mockWin;
    let chat;
    let openBtn;
    let ui;

    beforeEach(() => {
        originalDoc = globalThis.document;
        originalWin = globalThis.window;

        const body = new MockElement('body');
        const elementsById = new Map();

        openBtn = new MockElement('button');
        openBtn.dataset.playerChatOpen = '';
        body.append(openBtn);

        mockDoc = {
            body,
            activeElement: null,
            _registerId: (id, el) => { if (id) elementsById.set(id, el); },
            createElement: vi.fn((tag, className) => {
                const el = new MockElement(tag, className);
                return el;
            }),
            getElementById: vi.fn((id) => elementsById.get(id) || null),
            querySelectorAll: vi.fn((sel) => body.querySelectorAll(sel))
        };

        const winListeners = new Map();
        mockWin = {
            addEventListener: vi.fn((ev, fn) => {
                if (!winListeners.has(ev)) winListeners.set(ev, []);
                winListeners.get(ev).push(fn);
            }),
            removeEventListener: vi.fn((ev, fn) => {
                const list = winListeners.get(ev);
                if (list) {
                    const idx = list.indexOf(fn);
                    if (idx >= 0) list.splice(idx, 1);
                }
            }),
            dispatchEvent: vi.fn((evt) => {
                const list = winListeners.get(evt.type) || [];
                for (const fn of list) fn(evt);
            })
        };

        globalThis.document = mockDoc;
        globalThis.window = mockWin;

        chat = new PlayerChat({ filter: (t) => ({ ok: true, text: String(t) }) });
        chat.ready = true;
        chat.roomCode = 'SECTOR-7';
        chat.selfId = 'self-1';
        ui = initPlayerChatUI({ chat });
    });

    afterEach(() => {
        ui?.dispose();
        globalThis.document = originalDoc;
        globalThis.window = originalWin;
        vi.restoreAllMocks();
    });

    it('mounts the player-chat-modal into the document body', () => {
        const modal = mockDoc.getElementById('player-chat-modal');
        expect(modal).not.toBeNull();
        expect(modal.classList.contains('hidden')).toBe(true);
        expect(modal.getAttribute('aria-hidden')).toBe('true');
    });

    it('opens chat modal when open button is clicked and sets visible', () => {
        const modal = mockDoc.getElementById('player-chat-modal');
        openBtn.click();

        expect(modal.classList.contains('hidden')).toBe(false);
        expect(modal.getAttribute('aria-hidden')).toBe('false');
        expect(chat.visible).toBe(true);
    });

    it('closes modal on close button click and restores focus', () => {
        const modal = mockDoc.getElementById('player-chat-modal');
        openBtn.focus();
        openBtn.click();
        expect(modal.classList.contains('hidden')).toBe(false);

        const closeBtn = mockDoc.getElementById('player-chat-close');
        expect(closeBtn).not.toBeNull();
        closeBtn.click();
        expect(modal.classList.contains('hidden')).toBe(true);
        expect(chat.visible).toBe(false);
    });

    it('populates composer when clicking quick message preset buttons', () => {
        openBtn.click();
        const composer = mockDoc.getElementById('player-chat-input');
        const modal = mockDoc.getElementById('player-chat-modal');
        const quickBtns = modal.querySelectorAll('.player-chat-quick button');
        expect(quickBtns.length).toBeGreaterThan(0);

        quickBtns[0].click();
        expect(composer.value).toBe('Need help!');
    });

    it('updates unread badges on open buttons when chat is hidden', () => {
        chat.setVisible(false);
        chat.receive({
            id: 'm1',
            roomCode: 'SECTOR-7',
            senderId: 'remote-1',
            senderName: 'Echo',
            text: 'Incoming enemies',
            sentAt: 1000
        });

        expect(openBtn.textContent).toContain('(1)');

        openBtn.click();
        expect(openBtn.textContent).toBe('CHAT');
    });

    // Playtest 2026-10-02: lines only raised a badge on a CHAT button, so a
    // friend mid-run never saw them. Closed panel => they appear in the feed.
    it('shows incoming lines in the feed while the panel is closed, then fades them', () => {
        vi.useFakeTimers();
        try {
            const feed = mockDoc.getElementById('player-chat-feed');
            expect(feed).not.toBeNull();
            chat.receive({ id: 'f1', roomCode: 'SECTOR-7', senderId: 'remote-1', senderName: 'Cypher', text: 'Behind you', sentAt: 1000 });
            expect(feed.children).toHaveLength(1);
            expect(feed.children[0].children.map((c) => c.textContent)).toEqual(['Cypher', 'Behind you']);

            chat.receive({ id: 'f2', roomCode: 'SECTOR-7', senderId: 'self-1', senderName: 'Zero', text: 'mine', sentAt: 1100 });
            expect(feed.children).toHaveLength(1);

            vi.advanceTimersByTime(9000);
            expect(feed.children).toHaveLength(0);
        } finally {
            vi.useRealTimers();
        }
    });

    it('keeps the feed quiet while the panel is open, and clears it on open', () => {
        const feed = mockDoc.getElementById('player-chat-feed');
        chat.receive({ id: 'g1', roomCode: 'SECTOR-7', senderId: 'remote-1', senderName: 'Cypher', text: 'one', sentAt: 1000 });
        expect(feed.children).toHaveLength(1);
        openBtn.click();
        expect(feed.children).toHaveLength(0);
        chat.receive({ id: 'g2', roomCode: 'SECTOR-7', senderId: 'remote-1', senderName: 'Cypher', text: 'two', sentAt: 1100 });
        expect(feed.children).toHaveLength(0);
    });

    it('caps the feed at three lines', () => {
        const feed = mockDoc.getElementById('player-chat-feed');
        for (let i = 0; i < 5; i += 1) {
            chat.receive({ id: `h${i}`, roomCode: 'SECTOR-7', senderId: 'remote-1', senderName: 'Cypher', text: `line ${i}`, sentAt: 1000 + i });
        }
        expect(feed.children.map((line) => line.children[1].textContent)).toEqual(['line 2', 'line 3', 'line 4']);
    });
});

