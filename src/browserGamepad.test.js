import { describe, expect, it } from 'vitest';
import {
    inferBrowserGamepadType,
    isGamepadButtonPressed,
    mapBrowserGamepad,
    normalizeGamepadAxis
} from './browserGamepad.js';

function button(pressed = false, value = pressed ? 1 : 0) {
    return { pressed, value };
}

describe('browser gamepad mapping', () => {
    it('normalizes stick deadzones', () => {
        expect(normalizeGamepadAxis(0.1)).toBe(0);
        expect(normalizeGamepadAxis(-0.2)).toBe(-0.2);
        expect(normalizeGamepadAxis(2)).toBe(1);
    });

    it('reads analog trigger values as pressed buttons', () => {
        expect(isGamepadButtonPressed(button(false, 0.49))).toBe(false);
        expect(isGamepadButtonPressed(button(false, 0.5))).toBe(true);
        expect(isGamepadButtonPressed(button(true, 0))).toBe(true);
    });

    it('maps standard gamepad controls into the Steam-compatible shape', () => {
        const buttons = Array.from({ length: 16 }, () => button(false));
        buttons[0] = button(true);
        buttons[2] = button(true);
        buttons[4] = button(true);
        buttons[7] = button(false, 0.8);
        buttons[9] = button(true);

        const mapped = mapBrowserGamepad({
            index: 2,
            id: 'Xbox Wireless Controller',
            axes: [0.6, -0.7, 0.35, 0.4],
            buttons
        });

        expect(mapped).toMatchObject({
            handle: 'browser-gamepad:2',
            type: 'XBoxOneController',
            active: true,
            move: { x: 0.6, y: -0.7 },
            camera: { x: 0.35, y: 0.4 },
            fire: true,
            interact: true,
            reload: true,
            sprint: true,
            pause: true,
            menuConfirm: true
        });
    });

    it('gives menu tab navigation its own bumper buttons, independent of back/scan', () => {
        // East face button (index 1) already drives dash/scan/menuBack. If tab
        // navigation also listened on it, a single Steam Deck B press would both
        // close a modal (menuBack) and flip its tab (tabLeft) at once.
        const buttons = Array.from({ length: 16 }, () => button(false));
        buttons[1] = button(true);

        const mapped = mapBrowserGamepad({ index: 0, id: 'Xbox Wireless Controller', axes: [0, 0, 0, 0], buttons });

        expect(mapped.menuBack).toBe(true);
        expect(mapped.scan).toBe(true);
        expect(mapped.menuTabLeft).toBe(false);
        expect(mapped.menuTabRight).toBe(false);
    });

    it('drives menu tab navigation from the bumpers, matching the native controller_neptune.vdf menu action set', () => {
        const buttons = Array.from({ length: 16 }, () => button(false));
        buttons[4] = button(true);
        buttons[5] = button(true);

        const mapped = mapBrowserGamepad({ index: 0, id: 'Xbox Wireless Controller', axes: [0, 0, 0, 0], buttons });

        expect(mapped.menuTabLeft).toBe(true);
        expect(mapped.menuTabRight).toBe(true);
    });

    it('infers common controller prompt families from browser ids', () => {
        expect(inferBrowserGamepadType('DualSense Wireless Controller')).toBe('PS5Controller');
        expect(inferBrowserGamepadType('DUALSHOCK 4')).toBe('PS4Controller');
        expect(inferBrowserGamepadType('Nintendo Switch Pro Controller')).toBe('SwitchProController');
        expect(inferBrowserGamepadType('mystery pad')).toBe('GenericGamepad');
    });
});
