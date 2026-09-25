import { describe, expect, it } from 'vitest';
import { createControllerPressGate } from './controllerPressGate.js';

// 2026-09-24 Deck QA: one B press closed the map and then opened the pause
// menu; the settings button flashed open and shut; quitting a menu sprinted.

function gate() {
    let clock = 0;
    const g = createControllerPressGate({ windowMs: 350, now: () => clock });
    return { g, tick: (ms) => { clock += ms; } };
}
const native = (buttons = {}) => ({ handle: 'steam:1', active: Object.values(buttons).some(Boolean), move: { x: 0, y: 0 }, ...buttons });
const browser = (buttons = {}) => ({ handle: 'browser-gamepad:0', active: Object.values(buttons).some(Boolean), move: { x: 0, y: 0 }, ...buttons });

describe('one physical press, one action', () => {
    it('takes a press from the first source and masks the second source’s copy until release', () => {
        const { g, tick } = gate();
        expect(g.filter(browser({ dash: true }), 'menu').dash).toBe(true);
        tick(100);
        // Native Steam Input reports the same B a frame later.
        expect(g.filter(native({ dash: true }), 'menu').dash).toBe(false);
        tick(100);
        expect(g.filter(native({ dash: true }), 'menu').dash).toBe(false);
        // Released on both, then pressed again: a fresh press is honoured.
        g.filter(browser({ dash: false }), 'menu');
        g.filter(native({ dash: false }), 'menu');
        tick(500);
        expect(g.filter(native({ dash: true }), 'menu').dash).toBe(true);
    });

    it('keeps the rest of the controller intact', () => {
        const { g } = gate();
        const out = g.filter({ handle: 'x', active: true, move: { x: 0.5, y: 0 }, type: 'SteamDeckController', pause: true }, 'menu');
        expect(out).toMatchObject({ handle: 'x', active: true, move: { x: 0.5, y: 0 }, type: 'SteamDeckController', pause: true });
    });

    it('does not carry a held button from a menu into gameplay (no sprint on quit)', () => {
        const { g, tick } = gate();
        expect(g.filter(native({ sprint: true, menuBack: true }), 'menu').menuBack).toBe(true);
        tick(16);
        // The menu closed; the same buttons are still down in gameplay.
        const inGameplay = g.filter(native({ sprint: true, menuBack: true }), 'gameplay');
        expect(inGameplay.sprint).toBe(false);
        expect(inGameplay.menuBack).toBe(false);
        tick(16);
        expect(g.filter(native({ sprint: true }), 'gameplay').sprint).toBe(false);
        // Let go, press again: now it sprints.
        g.filter(native({ sprint: false }), 'gameplay');
        tick(16);
        expect(g.filter(native({ sprint: true }), 'gameplay').sprint).toBe(true);
    });

    it('lets the same source repeat quickly (a real double tap)', () => {
        const { g, tick } = gate();
        expect(g.filter(native({ pause: true }), 'menu').pause).toBe(true);
        tick(60);
        g.filter(native({ pause: false }), 'menu');
        tick(60);
        expect(g.filter(native({ pause: true }), 'menu').pause).toBe(true);
    });

    it('accepts the other source once the window has passed', () => {
        const { g, tick } = gate();
        g.filter(browser({ interact: true }), 'gameplay');
        g.filter(browser({ interact: false }), 'gameplay');
        tick(1000);
        expect(g.filter(native({ interact: true }), 'gameplay').interact).toBe(true);
    });
});

describe('presses consumed outside the router', () => {
    it('masks the other source’s copy of a press a direct poll already used', () => {
        const { g, tick } = gate();
        // The tactical map's own Gamepad API poll closes the map on B…
        g.claim(['menuBack', 'dash'], 'browser-gamepad:0');
        tick(100);
        // …and native Steam Input's copy must not then open the pause menu.
        const copy = g.filter(native({ menuBack: true, dash: true }), 'gameplay');
        expect(copy.menuBack).toBe(false);
        expect(copy.dash).toBe(false);
        g.filter(native({}), 'gameplay');
        g.observe(browser({})); // the pad lets go too
        tick(600);
        expect(g.filter(native({ menuBack: true }), 'menu').menuBack).toBe(true);
    });
});

describe('a hitch longer than the window', () => {
    it('still treats the second source’s copy as the same press while the first holds it', () => {
        const { g, tick } = gate();
        expect(g.filter(native({ menuBack: true }), 'menu').menuBack).toBe(true);
        tick(900); // a long frame: the browser copy arrives late
        expect(g.filter(browser({ menuBack: true }), 'gameplay').menuBack).toBe(false);
        g.filter(native({ menuBack: false }), 'gameplay');
        g.filter(browser({ menuBack: false }), 'gameplay');
        tick(900);
        expect(g.filter(browser({ menuBack: true }), 'gameplay').menuBack).toBe(true);
    });
});

describe('a source that goes quiet', () => {
    it('does not block the button on other sources forever', () => {
        const { g, tick } = gate();
        // The browser fallback routes a held B, then stops reporting (native took over).
        g.filter(browser({ menuBack: true }), 'menu');
        tick(2500);
        expect(g.filter(native({ menuBack: true }), 'menu').menuBack).toBe(true);
    });
});

describe('a press the tactical map consumed', () => {
    it('masks the native copy for as long as the pad still holds it, however late', () => {
        const { g, tick } = gate();
        g.claim(['menuBack', 'dash'], 'browser-gamepad:0');
        tick(300);
        g.observe(browser({ menuBack: true, dash: true }));
        tick(1300); // a 1.6 s hitch before native reports
        g.observe(browser({ menuBack: true, dash: true }));
        const copy = g.filter(native({ menuBack: true, dash: true }), 'gameplay');
        expect(copy.menuBack).toBe(false);
        expect(copy.dash).toBe(false);
    });

    it('lets the next real press through once the pad lets go', () => {
        const { g, tick } = gate();
        g.claim(['menuBack'], 'browser-gamepad:0');
        tick(50);
        g.observe(browser({ menuBack: false }));
        g.filter(native({ menuBack: false }), 'gameplay');
        tick(1000);
        expect(g.filter(native({ menuBack: true }), 'gameplay').menuBack).toBe(true);
    });

    it('an observed (un-routed) pad never blocks native input by itself', () => {
        const { g, tick } = gate();
        g.observe(browser({ menuBack: true }));
        tick(10);
        expect(g.filter(native({ menuBack: true }), 'menu').menuBack).toBe(true);
    });
});
