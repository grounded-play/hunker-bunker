import { describe, expect, it } from 'vitest';
import {
    inferBrowserGamepadType,
    isGamepadButtonPressed,
    mapBrowserGamepad,
    mergeBrowserAnalogFallback,
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

    // The gameplay aim path reads controller.cameraDelta every frame. The Web
    // Gamepad API has no trackpad or gyro to feed it, but the field still has to
    // exist and read zero so the browser fallback lands on stick aim instead of
    // faulting on an absent object.
    it('carries a zeroed cameraDelta so the mouse-style aim path stays inert', () => {
        const mapped = mapBrowserGamepad({
            index: 0,
            id: 'Xbox Wireless Controller',
            axes: [0, 0, 0.9, -0.9],
            buttons: Array.from({ length: 16 }, () => button(false))
        });

        expect(mapped.cameraDelta).toEqual({ x: 0, y: 0 });
        expect(mapped.camera).toEqual({ x: 0.9, y: -0.9 });
    });

    it('maps standard gamepad controls into the Steam-compatible shape', () => {
        const buttons = Array.from({ length: 16 }, () => button(false));
        buttons[0] = button(true);
        buttons[2] = button(true);
        buttons[6] = button(true);
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

    it('maps right trigger to both gameplay fire and menu confirm', () => {
        const buttons = Array.from({ length: 17 }, () => button(false));
        buttons[7] = button(false, 0.8);

        const mapped = mapBrowserGamepad({ index: 0, id: 'Steam Deck', axes: [0, 0, 0, 0], buttons });

        expect(mapped.fire).toBe(true);
        expect(mapped.menuConfirm).toBe(true);
    });

    it('fills each missing native stick independently from the browser view', () => {
        const native = {
            handle: 'native:1',
            move: { x: 0, y: 0 },
            camera: { x: 0, y: 0 },
            interact: true
        };
        const browser = [{
            move: { x: 0.75, y: -0.25 },
            camera: { x: -0.6, y: 0.4 }
        }];

        expect(mergeBrowserAnalogFallback(native, browser)).toEqual({
            ...native,
            move: browser[0].move,
            camera: browser[0].camera
        });
    });

    it('keeps a working native stick while rescuing only the neutral one', () => {
        const native = { move: { x: 0.5, y: 0 }, camera: { x: 0, y: 0 } };
        const browser = [{ move: { x: -0.9, y: 0 }, camera: { x: 0.7, y: 0.2 } }];
        const merged = mergeBrowserAnalogFallback(native, browser);

        expect(merged.move).toBe(native.move);
        expect(merged.camera).toBe(browser[0].camera);
    });

    it('maps gameplay scan and tactical map to the left and right bumpers', () => {
        const buttons = Array.from({ length: 17 }, () => button(false));
        buttons[4] = button(true);
        buttons[5] = button(true);

        const mapped = mapBrowserGamepad({ index: 0, id: 'Xbox Wireless Controller', axes: [0, 0, 0, 0], buttons });

        expect(mapped.scan).toBe(true);
        expect(mapped.toggleMap).toBe(true);
        expect(mapped.fire).toBe(false);
        expect(mapped.sprint).toBe(false);
    });

    it('maps Y to both gameplay smash and archive Inventory semantics', () => {
        const buttons = Array.from({ length: 17 }, () => button(false));
        buttons[3] = button(true);

        const mapped = mapBrowserGamepad({ index: 0, id: 'Xbox Wireless Controller', axes: [0, 0, 0, 0], buttons });

        expect(mapped.melee).toBe(true);
        expect(mapped.ability).toBe(true);
        expect(mapped.active).toBe(true);
    });

    it('keeps B as back/dodge without also firing scan or tab navigation', () => {
        const buttons = Array.from({ length: 16 }, () => button(false));
        buttons[1] = button(true);

        const mapped = mapBrowserGamepad({ index: 0, id: 'Xbox Wireless Controller', axes: [0, 0, 0, 0], buttons });

        expect(mapped.menuBack).toBe(true);
        expect(mapped.dash).toBe(true);
        expect(mapped.scan).toBe(false);
        expect(mapped.menuTabLeft).toBe(false);
        expect(mapped.menuTabRight).toBe(false);
    });

    it('uses both the D-pad and left stick for menu directions', () => {
        const buttons = Array.from({ length: 16 }, () => button(false));
        buttons[12] = button(true);
        const mapped = mapBrowserGamepad({ index: 0, id: 'Xbox Wireless Controller', axes: [0.8, 0, 0, 0], buttons });
        expect(mapped.menuUp).toBe(true);
        expect(mapped.menuRight).toBe(true);
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
