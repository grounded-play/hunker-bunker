import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TerminalBezelController } from './terminalBezelInteractivity.js';

class MockElement {
    constructor(tagName = 'DIV', id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.children = [];
        this.parent = null;
        this.dataset = {};
        this.style = {};
        this.attributes = {};
        this.listeners = {};
        this.textContent = '';
        this._html = '';
        const classes = new Set();
        this.classList = {
            add: (...c) => c.forEach((x) => classes.add(x)),
            remove: (...c) => c.forEach((x) => classes.delete(x)),
            contains: (c) => classes.has(c),
            toggle: (c, on) => { if (on ?? !classes.has(c)) classes.add(c); else classes.delete(c); }
        };
        Object.defineProperty(this, 'className', {
            get: () => [...classes].join(' '),
            set: (v) => { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => classes.add(x)); }
        });
    }

    get innerHTML() { return this._html; }
    set innerHTML(v) {
        this._html = String(v);
        this.children = [];
        this._parseMockChildren(v);
    }

    _parseMockChildren(html) {
        // Simple regex-based mock node generator for testing
        const tagRegex = /<([a-z0-9-]+)([^>]*)>(.*?)<\/\1>|<([a-z0-9-]+)([^>]*)\/>/gis;
        let match;
        while ((match = tagRegex.exec(html)) !== null) {
            const tagName = match[1] || match[4];
            const attrs = match[2] || match[5] || '';
            const child = new MockElement(tagName);
            const classMatch = attrs.match(/class="([^"]*)"/);
            if (classMatch) child.className = classMatch[1];
            const idMatch = attrs.match(/id="([^"]*)"/);
            if (idMatch) child.id = idMatch[1];
            const dataScrew = attrs.match(/data-screw="([^"]*)"/);
            if (dataScrew) child.dataset.screw = dataScrew[1];
            const dataKey = attrs.match(/data-key="([^"]*)"/);
            if (dataKey) child.dataset.key = dataKey[1];
            const dataDip = attrs.match(/data-dip="([^"]*)"/);
            if (dataDip) child.dataset.dip = dataDip[1];
            const textMatch = match[3];
            if (textMatch && !textMatch.includes('<')) child.textContent = textMatch.trim();
            child.parent = this;
            this.children.push(child);
            if (textMatch && textMatch.includes('<')) {
                child._parseMockChildren(textMatch);
            }
        }
    }

    appendChild(child) {
        child.parent = this;
        this.children.push(child);
        return child;
    }

    setAttribute(k, v) { this.attributes[k] = String(v); }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn); }

    click() {
        if (typeof this.onclick === 'function') {
            this.onclick({ stopPropagation() {}, preventDefault() {} });
        }
        for (const fn of this.listeners.click ?? []) {
            fn({ stopPropagation() {}, preventDefault() {} });
        }
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector) {
        const results = [];
        const match = (node) => {
            if (selector.startsWith('#')) {
                if (node.id === selector.slice(1)) results.push(node);
            } else if (selector.startsWith('.')) {
                if (node.classList.contains(selector.slice(1))) results.push(node);
            } else if (selector.startsWith('[data-')) {
                const attrMatch = selector.match(/\[data-([a-z0-9-]+)="([^"]*)"\]/);
                if (attrMatch) {
                    const key = attrMatch[1].replace(/-([a-z])/g, (_, g) => g.toUpperCase());
                    if (node.dataset[key] === attrMatch[2]) results.push(node);
                }
            } else if (node.tagName.toLowerCase() === selector.toLowerCase()) {
                results.push(node);
            }
            for (const child of node.children) match(child);
        };
        for (const child of this.children) match(child);
        return results;
    }
}

describe('TerminalBezelController', () => {
    let container;
    let doc;
    let audio;
    let bank;
    let controller;

    beforeEach(() => {
        container = new MockElement('div', 'kiosk-container');
        doc = { createElement: (tag) => new MockElement(tag) };
        audio = { play: vi.fn() };
        bank = {
            getState: vi.fn(() => ({ coin: 10, tech: 5 })),
            setCoin: vi.fn(),
            setTech: vi.fn()
        };
        controller = new TerminalBezelController({ container, audio, bank, doc });
    });

    it('initializes the DOM structure with screws, keypad, coin return, and hidden hatch', () => {
        expect(container.querySelectorAll('.bezel-hex-screw')).toHaveLength(4);
        expect(container.querySelectorAll('.bezel-keypad-btn')).toHaveLength(14);
        expect(container.querySelector('#bezel-coin-lever')).not.toBeNull();
        expect(container.querySelector('#bezel-maintenance-hatch')).not.toBeNull();
        expect(container.querySelector('#bezel-maintenance-hatch').classList.contains('hidden')).toBe(true);
    });

    it('rotates corner screws on click and plays ratchet audio', () => {
        const screwTl = container.querySelector('.screw-tl');
        expect(screwTl).not.toBeNull();

        screwTl.click();
        expect(audio.play).toHaveBeenCalledWith('door_gears_spin', expect.any(Object));
        expect(controller.screws.tl).toBe(1);
        expect(screwTl.style.transform).toContain('rotate(90deg)');

        screwTl.click();
        expect(controller.screws.tl).toBe(2);
        expect(screwTl.style.transform).toContain('rotate(180deg)');

        screwTl.click();
        expect(controller.screws.tl).toBe(3);
        expect(screwTl.classList.contains('screw-loose')).toBe(true);
    });

    it('unlocks the maintenance hatch only when all 4 screws are loosened (3 turns)', () => {
        const hatch = container.querySelector('#bezel-maintenance-hatch');
        expect(controller.hatchOpen).toBe(false);

        ['tl', 'tr', 'bl'].forEach((corner) => {
            for (let i = 0; i < 3; i++) controller.turnScrew(corner);
        });
        expect(controller.hatchOpen).toBe(false);
        expect(hatch.classList.contains('hidden')).toBe(true);

        controller.turnScrew('br');
        controller.turnScrew('br');
        controller.turnScrew('br');

        expect(controller.hatchOpen).toBe(true);
        expect(hatch.classList.contains('hidden')).toBe(false);
        expect(audio.play).toHaveBeenCalledWith('door_slam_vertical', expect.any(Object));
    });

    it('enters keypad digits and verifies secret PIN code 0451 for coin reward', () => {
        const aux = container.querySelector('#bezel-aux-display');
        controller.pressKey('0');
        controller.pressKey('4');
        controller.pressKey('5');
        controller.pressKey('1');
        expect(aux.textContent).toBe('PIN: ***1');

        controller.pressKey('ENTER');
        expect(audio.play).toHaveBeenCalledWith('generator_complete', expect.any(Object));
        expect(bank.setCoin).toHaveBeenCalledWith(35); // 10 + 25
        expect(aux.textContent).toContain('OVERRIDE');
    });

    it('denies invalid PIN codes and clears on CLEAR key', () => {
        const aux = container.querySelector('#bezel-aux-display');
        controller.pressKey('9');
        controller.pressKey('1');
        controller.pressKey('1');
        controller.pressKey('ENTER');

        expect(audio.play).toHaveBeenCalledWith('ui_error', expect.any(Object));
        expect(aux.textContent).toContain('DENIED');

        controller.pressKey('5');
        controller.pressKey('CLEAR');
        expect(controller.keypadBuffer).toBe('');
        expect(aux.textContent).toContain('CLEARED');
    });

    it('animates coin return lever and dispenses coins periodically', () => {
        const lever = container.querySelector('#bezel-coin-lever');
        lever.click();
        expect(audio.play).toHaveBeenCalledWith('ui_click_confirm1', expect.any(Object));
        expect(controller.coinReturnClicks).toBe(1);

        for (let i = 2; i <= 5; i++) lever.click();
        expect(bank.setCoin).toHaveBeenCalledWith(11); // 10 + 1
        expect(container.querySelector('#bezel-aux-display').textContent).toContain('CLINK! +1 COIN');
    });

    it('toggles DIP switches and adds corresponding mode classes to container', () => {
        const dipOverclock = container.querySelector('[data-dip="overclock"]');
        dipOverclock.click();
        expect(controller.dipSwitches.overclock).toBe(true);
        expect(container.classList.contains('crt-overclock-mode')).toBe(true);

        const dipGreen = container.querySelector('[data-dip="greenPhosphor"]');
        dipGreen.click();
        expect(controller.dipSwitches.greenPhosphor).toBe(true);
        expect(container.classList.contains('crt-green-mode')).toBe(true);

        dipOverclock.click();
        expect(controller.dipSwitches.overclock).toBe(false);
        expect(container.classList.contains('crt-overclock-mode')).toBe(false);
    });

    it('harvests overclock fuse once for +10 tech salvage', () => {
        const fuseBtn = container.querySelector('#maintenance-fuse-btn');
        fuseBtn.click();

        expect(controller.fuseClaimed).toBe(true);
        expect(bank.setTech).toHaveBeenCalledWith(15); // 5 + 10
        expect(container.querySelector('#bezel-aux-display').textContent).toContain('+10 TECH');

        bank.setTech.mockClear();
        fuseBtn.click();
        expect(bank.setTech).not.toHaveBeenCalled();
    });
});
