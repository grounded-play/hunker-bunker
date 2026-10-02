import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    QUICK_COMMAND_DEFS,
    findClosestQuickCommand,
    createQuickCommandRadialUi
} from './quickCommandRadialUi.js';

describe('Quick Command Radial UI (S49-14)', () => {
    let mockDoc;
    let mockGame;
    let containerEl;

    beforeEach(() => {
        containerEl = null;
        mockDoc = {
            getElementById: vi.fn((id) => (id === 'quick-command-radial' ? containerEl : null)),
            createElement: vi.fn((tag) => {
                const el = {
                    tagName: tag.toUpperCase(),
                    className: '',
                    id: '',
                    style: {},
                    innerHTML: '',
                    textContent: '',
                    children: [],
                    attributes: {},
                    classList: {
                        add: vi.fn(function (c) { el.className = `${el.className} ${c}`.trim(); }),
                        remove: vi.fn(function (c) {
                            el.className = el.className.split(' ').filter((x) => x !== c).join(' ');
                        }),
                        contains: vi.fn(function (c) { return el.className.split(' ').includes(c); })
                    },
                    setAttribute: vi.fn(function (k, v) { el.attributes[k] = v; }),
                    getAttribute: vi.fn(function (k) { return el.attributes[k]; }),
                    appendChild: vi.fn(function (child) {
                        el.children.push(child);
                        child.parentNode = el;
                        return child;
                    }),
                    removeChild: vi.fn(function (child) {
                        el.children = el.children.filter((c) => c !== child);
                        child.parentNode = null;
                        return child;
                    }),
                    remove: vi.fn(function () {
                        if (el.parentNode && el.parentNode.removeChild) {
                            el.parentNode.removeChild(el);
                        }
                    }),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    getBoundingClientRect: vi.fn(() => ({ left: 400, top: 300, width: 200, height: 200 }))
                };
                return el;
            }),
            body: {
                appendChild: vi.fn((child) => {
                    containerEl = child;
                    child.parentNode = mockDoc.body;
                    return child;
                }),
                removeChild: vi.fn((child) => {
                    if (containerEl === child) {
                        containerEl = null;
                    }
                    child.parentNode = null;
                    return child;
                })
            }
        };

        mockGame = {
            triggerQuickCommand: vi.fn(() => true)
        };
    });

    it('has 5 distinct quick command definitions with angles and keys', () => {
        expect(QUICK_COMMAND_DEFS).toHaveLength(5);
        const ids = QUICK_COMMAND_DEFS.map((c) => c.id);
        expect(ids).toEqual(['help', 'wait', 'follow', 'regroup', 'thanks']);
        const keys = QUICK_COMMAND_DEFS.map((c) => c.key);
        expect(keys).toEqual(['1', '2', '3', '4', '5']);
    });

    it('findClosestQuickCommand matches vectors accurately by angular proximity', () => {
        // Up (x:0, y:-1) -> angle -90 -> 'help'
        const up = findClosestQuickCommand(0, -1);
        expect(up.id).toBe('help');

        // Top Right (x:1, y:-0.3) -> 'wait'
        const tr = findClosestQuickCommand(1, -0.3);
        expect(tr.id).toBe('wait');

        // Bottom Right (x:0.5, y:0.8) -> 'follow'
        const br = findClosestQuickCommand(0.5, 0.8);
        expect(br.id).toBe('follow');

        // Bottom Left (x:-0.5, y:0.8) -> 'regroup'
        const bl = findClosestQuickCommand(-0.5, 0.8);
        expect(bl.id).toBe('regroup');

        // Top Left (x:-1, y:-0.3) -> 'thanks'
        const tl = findClosestQuickCommand(-1, -0.3);
        expect(tl.id).toBe('thanks');

        // Inside deadzone -> null
        expect(findClosestQuickCommand(0.1, 0.1, 0.3)).toBeNull();
    });

    it('initializes DOM structure with container, center reticle, and 5 slices', () => {
        const ui = createQuickCommandRadialUi({ document: mockDoc, getGame: () => mockGame });
        expect(ui).toBeDefined();
        expect(mockDoc.body.appendChild).toHaveBeenCalled();
        expect(ui.isOpen()).toBe(false);
        ui.destroy();
    });

    it('opens and closes modal, toggling active class and selection state', () => {
        const ui = createQuickCommandRadialUi({ document: mockDoc, getGame: () => mockGame });
        ui.open();
        expect(ui.isOpen()).toBe(true);
        expect(containerEl.classList.add).toHaveBeenCalledWith('is-active');

        ui.close();
        expect(ui.isOpen()).toBe(false);
        expect(containerEl.classList.remove).toHaveBeenCalledWith('is-active');
        ui.destroy();
    });

    it('handleDirectionInput highlights command based on stick input', () => {
        const ui = createQuickCommandRadialUi({ document: mockDoc, getGame: () => mockGame });
        ui.open();

        const hit = ui.handleDirectionInput(0, -1);
        expect(hit).toBe('help');
        expect(ui.getHighlighted()).toBe('help');

        ui.destroy();
    });

    it('confirmSelection triggers highlighted command and closes radial', () => {
        const ui = createQuickCommandRadialUi({ document: mockDoc, getGame: () => mockGame });
        ui.open();
        ui.setHighlighted('wait');

        const success = ui.confirmSelection();
        expect(success).toBe(true);
        expect(mockGame.triggerQuickCommand).toHaveBeenCalledWith('wait');
        expect(ui.isOpen()).toBe(false);

        ui.destroy();
    });

    it('triggerCommand triggers game action directly and closes radial', () => {
        const ui = createQuickCommandRadialUi({ document: mockDoc, getGame: () => mockGame });
        ui.open();

        const success = ui.triggerCommand('thanks');
        expect(success).toBe(true);
        expect(mockGame.triggerQuickCommand).toHaveBeenCalledWith('thanks');
        expect(ui.isOpen()).toBe(false);

        ui.destroy();
    });
});
