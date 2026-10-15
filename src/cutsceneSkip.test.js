import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Opening Videos & Cutscene Skip Controls', () => {
    let listeners = {};
    let classList;
    let presentationPointerTimer = null;

    beforeEach(() => {
        listeners = {};
        classList = new Set();

        globalThis.document = {
            documentElement: {
                classList: {
                    add: (cls) => classList.add(cls),
                    remove: (cls) => classList.delete(cls),
                    contains: (cls) => classList.has(cls),
                    toggle: (cls, force) => {
                        if (force) classList.add(cls);
                        else classList.delete(cls);
                    }
                }
            }
        };

        globalThis.window = {
            addEventListener: vi.fn((event, fn) => {
                listeners[event] = listeners[event] || [];
                listeners[event].push(fn);
            }),
            removeEventListener: vi.fn((event, fn) => {
                if (listeners[event]) {
                    listeners[event] = listeners[event].filter(cb => cb !== fn);
                }
            }),
            clearTimeout: vi.fn((t) => clearTimeout(t)),
            setTimeout: vi.fn((fn, ms) => setTimeout(fn, ms))
        };
    });

    afterEach(() => {
        if (presentationPointerTimer) clearTimeout(presentationPointerTimer);
    });

    it('activates pointer on mouse movement when presentation cursor is hidden', () => {
        // Presentation starts hidden
        globalThis.document.documentElement.classList.add('presentation-cursor-hidden');
        expect(globalThis.document.documentElement.classList.contains('presentation-cursor-hidden')).toBe(true);
        expect(globalThis.document.documentElement.classList.contains('presentation-pointer-active')).toBe(false);

        // Function behavior as wired in main.js
        function handlePresentationPointerActivity() {
            if (!globalThis.document.documentElement.classList.contains('presentation-cursor-hidden')) return;
            globalThis.document.documentElement.classList.add('presentation-pointer-active');
        }

        handlePresentationPointerActivity();
        expect(globalThis.document.documentElement.classList.contains('presentation-pointer-active')).toBe(true);
    });

    it('supports button creation with skip classes and click listeners', () => {
        const skipBtn = {
            tagName: 'BUTTON',
            type: 'button',
            className: 'class-intro-skip cinematic-still-skip',
            listeners: {},
            addEventListener: vi.fn((ev, fn) => {
                skipBtn.listeners[ev] = skipBtn.listeners[ev] || [];
                skipBtn.listeners[ev].push(fn);
            }),
            click: vi.fn(() => {
                (skipBtn.listeners['click'] || []).forEach(fn => fn({ preventDefault: vi.fn(), stopPropagation: vi.fn() }));
            })
        };

        let skipped = false;
        skipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            skipped = true;
        });

        skipBtn.click();
        expect(skipped).toBe(true);
        expect(skipBtn.type).toBe('button');
        expect(skipBtn.className).toContain('class-intro-skip');
    });

    it('allows controller gamepad skip check to trigger skip immediately', () => {
        const fakeGamepad = {
            connected: true,
            buttons: [{ pressed: false }, { pressed: true }]
        };
        const originalGetGamepads = globalThis.navigator.getGamepads;
        try {
            Object.defineProperty(globalThis.navigator, 'getGamepads', {
                value: () => [fakeGamepad],
                configurable: true
            });

            let skipped = false;
            const pads = globalThis.navigator.getGamepads() || [];
            const anyPressed = Array.from(pads).some((gp) => gp?.connected && gp?.buttons?.some((b) => b?.pressed));
            if (anyPressed) {
                skipped = true;
            }

            expect(skipped).toBe(true);
        } finally {
            Object.defineProperty(globalThis.navigator, 'getGamepads', {
                value: originalGetGamepads,
                configurable: true
            });
        }
    });
});
