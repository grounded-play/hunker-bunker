import { describe, expect, it } from 'vitest';
import { PickupMagnet, PickupComboTracker, formatPickupToast } from './lootJuice.js';

describe('Loot Juice System', () => {
    describe('PickupMagnet', () => {
        it('identifies and attracts pickups within magnetic radius', () => {
            const magnet = new PickupMagnet({ baseRadius: 3.5 });
            const playerPos = { x: 0, y: 0, z: 0 };
            const nearPickup = { position: { x: 2.0, y: 0.1, z: 0 }, userData: {} };
            const farPickup = { position: { x: 10.0, y: 0.1, z: 0 }, userData: {} };

            const attracted = magnet.update([nearPickup, farPickup], playerPos, 0.05, false);

            expect(attracted.length).toBe(1);
            expect(attracted[0]).toBe(nearPickup);
            expect(nearPickup.position.x).toBeLessThan(2.0); // moved towards 0
            expect(farPickup.position.x).toBe(10.0); // untouched
        });

        it('expands radius when player is sprinting', () => {
            const magnet = new PickupMagnet({ baseRadius: 3.5, sprintMultiplier: 1.25 });
            expect(magnet.getRadius(false)).toBe(3.5);
            expect(magnet.getRadius(true)).toBe(4.375);

            const pickup = { position: { x: 4.0, y: 0.1, z: 0 }, userData: {} };
            const playerPos = { x: 0, y: 0, z: 0 };

            // Not attracted walking
            let attracted = magnet.update([pickup], playerPos, 0.05, false);
            expect(attracted.length).toBe(0);

            // Attracted sprinting
            attracted = magnet.update([pickup], playerPos, 0.05, true);
            expect(attracted.length).toBe(1);
        });
    });

    describe('PickupComboTracker', () => {
        it('increases musical pitch semitone by semitone on rapid pickups', () => {
            const tracker = new PickupComboTracker({ comboWindow: 1.25 });

            const first = tracker.registerPickup(0.5);
            expect(first.combo).toBe(1);
            expect(first.playbackRate).toBe(1.0);

            const second = tracker.registerPickup(0.4);
            expect(second.combo).toBe(2);
            expect(second.playbackRate).toBeGreaterThan(1.0);

            // Rapid streak
            let lastResult;
            for (let i = 0; i < 11; i++) {
                lastResult = tracker.registerPickup(0.2);
            }
            expect(lastResult.combo).toBe(13);
            expect(lastResult.playbackRate).toBe(2.0); // capped at octave (2.0x)
            expect(lastResult.isMaxCombo).toBe(true);
        });

        it('resets combo when delay exceeds combo window', () => {
            const tracker = new PickupComboTracker({ comboWindow: 1.0 });
            tracker.registerPickup(0.1);
            tracker.registerPickup(0.1);
            expect(tracker.comboCount).toBe(2);

            const resetPickup = tracker.registerPickup(2.5); // delayed
            expect(resetPickup.combo).toBe(1);
            expect(resetPickup.playbackRate).toBe(1.0);
        });
    });

    describe('formatPickupToast', () => {
        it('formats resource label and thematic color', () => {
            const tech = formatPickupToast('tech', 15);
            expect(tech.text).toBe('+15 TECH');
            expect(tech.color).toBe('#49dfff');

            const o2 = formatPickupToast('o2', 25);
            expect(o2.text).toBe('+25 O₂');
            expect(o2.color).toBe('#38bdf8');
        });
    });
});
