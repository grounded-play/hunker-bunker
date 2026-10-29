import { describe, expect, it } from 'vitest';
import { KIOSK_OVERLAYS, kioskFocus, kioskPlacement, kioskRoles } from './kioskFrame.js';

describe('kiosk frames', () => {
    it('names every machine hole by role', () => {
        const roles = (name) => Object.keys(kioskRoles(KIOSK_OVERLAYS[name])).sort();
        // The production machines: one big screen each (controls live on it).
        for (const name of ['fab_automart_overlay', 'console_kiosk_overlay', 'armory_workbench_overlay']) {
            expect(roles(name), name).toEqual(['screen']);
        }
        // The cabinet's side-art gaps are not buttons.
        expect(roles('arcade_cabinet_overlay')).not.toContain('row4');
        // The first-pass machines with painted buttons.
        expect(roles('vending_atm_overlay')).toEqual(['aisle1', 'aisle2', 'aisle3', 'aisle4', 'aisle5', 'screen']);
        expect(roles('crt_terminal_overlay')).toEqual(['row1', 'row2', 'screen']);
        expect(roles('slot_minimart_overlay')).toEqual(['reel1', 'reel2', 'reel3', 'row1', 'row2', 'row3', 'row4', 'row5', 'screen']);
    });

    it('orders aisles top to bottom and rows left to right', () => {
        const atm = kioskRoles(KIOSK_OVERLAYS.vending_atm_overlay);
        expect(atm.aisle1.y).toBeLessThan(atm.aisle2.y);
        expect(atm.aisle4.y).toBeLessThan(atm.aisle5.y);
        const slot = kioskRoles(KIOSK_OVERLAYS.slot_minimart_overlay);
        expect(slot.row1.x).toBeLessThan(slot.row5.x);
        expect(slot.reel1.x).toBeLessThan(slot.reel3.x);
    });

    it('fits each machine to the box and keeps every screen legible at 1280x800', () => {
        for (const name of ['fab_automart_overlay', 'console_kiosk_overlay', 'arcade_cabinet_overlay']) {
            const overlay = KIOSK_OVERLAYS[name];
            const focus = kioskFocus(overlay);
            const at = kioskPlacement({ width: 1280, height: 800 }, overlay.aspect, focus);
            const screen = kioskRoles(overlay).screen;
            const screenPx = { w: at.width * screen.w / 100, h: at.height * screen.h / 100 };
            expect(screenPx.h, name).toBeGreaterThan(340);
            expect(screenPx.w, name).toBeGreaterThan(640);
            // The focus fits: its edges land inside the box.
            expect(at.left + at.width * focus.x / 100, name).toBeGreaterThanOrEqual(-0.5);
            expect(at.top + at.height * (focus.y + focus.h) / 100, name).toBeLessThanOrEqual(800.5);
        }
    });
});
