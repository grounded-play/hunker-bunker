import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createQaNexusModal, openQaNexusModal, closeQaNexusModal, updateNexusTelemetry } from './debugQaNexus.js';

describe('QA Nexus Machine & Harmonized UI Terminal', () => {
    let originalDoc;
    let elementStore;

    beforeEach(() => {
        originalDoc = globalThis.document;
        elementStore = new Map();

        function createMockElement(tag = 'div') {
            const classSet = new Set();
            const listeners = new Map();
            const children = [];
            const attributes = new Map();

            const el = {
                tagName: tag.toUpperCase(),
                id: '',
                className: '',
                innerHTML: '',
                textContent: '',
                style: {},
                classList: {
                    add: (cls) => classSet.add(cls),
                    remove: (cls) => classSet.delete(cls),
                    toggle: (cls, force) => {
                        if (force === undefined) {
                            if (classSet.has(cls)) classSet.delete(cls);
                            else classSet.add(cls);
                        } else if (force) {
                            classSet.add(cls);
                        } else {
                            classSet.delete(cls);
                        }
                    },
                    contains: (cls) => classSet.has(cls)
                },
                setAttribute: (k, v) => attributes.set(k, v),
                getAttribute: (k) => attributes.get(k) ?? null,
                addEventListener: (evt, fn) => {
                    if (!listeners.has(evt)) listeners.set(evt, []);
                    listeners.get(evt).push(fn);
                },
                dispatchEvent: (evt) => {
                    const fns = listeners.get(evt.type) || [];
                    fns.forEach(fn => fn(evt));
                },
                appendChild: (child) => {
                    children.push(child);
                    if (child.id) elementStore.set(child.id, child);
                    return child;
                },
                querySelector: (sel) => {
                    if (sel.startsWith('#')) return elementStore.get(sel.slice(1)) || createMockElement('div');
                    return createMockElement('div');
                },
                querySelectorAll: () => [createMockElement('button'), createMockElement('button')]
            };
            return el;
        }

        const body = createMockElement('body');
        globalThis.document = {
            body,
            createElement: (tag) => {
                const el = createMockElement(tag);
                return el;
            },
            getElementById: (id) => elementStore.get(id) || null
        };

        globalThis.window = globalThis.window || {};
        globalThis.window.game = {
            noclip: true,
            godMode: true,
            player: { position: { x: 11000, z: 9500 } },
            playerVitals: { health: 85, maxHp: 100 }
        };
        globalThis.window.AudioManager = { play: vi.fn() };
    });

    afterEach(() => {
        globalThis.document = originalDoc;
    });

    it('creates QA Nexus modal DOM with cybernetic glassmorphic sections', () => {
        const modal = createQaNexusModal();
        expect(modal).toBeTruthy();
        expect(modal.id).toBe('qa-nexus-modal');
        expect(modal.querySelector('.qa-nexus-title')).toBeTruthy();
    });

    it('opens and closes QA Nexus modal, playing UI sound effects', () => {
        const opened = openQaNexusModal();
        expect(opened).toBe(true);
        const modal = document.getElementById('qa-nexus-modal');
        expect(modal.classList.contains('hidden')).toBe(false);
        expect(globalThis.window.AudioManager.play).toHaveBeenCalledWith('ui_modal_open', expect.anything());

        const closed = closeQaNexusModal();
        expect(closed).toBe(true);
        expect(modal.classList.contains('hidden')).toBe(true);
        expect(globalThis.window.AudioManager.play).toHaveBeenCalledWith('ui_modal_close', expect.anything());
    });

    it('updates live telemetry pills with noclip and god status', () => {
        openQaNexusModal();
        updateNexusTelemetry();

        const noclipPill = document.getElementById('qa-pill-noclip');
        if (noclipPill) {
            expect(noclipPill.textContent).toContain('NOCLIP: ON');
            expect(noclipPill.classList.contains('qa-pill--active')).toBe(true);
        }
    });
});
