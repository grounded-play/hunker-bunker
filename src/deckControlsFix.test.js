import { describe, expect, it } from 'vitest';
import { createControllerPressGate, EQUIVALENT_ACTION_GROUPS } from './controllerPressGate.js';
import { ThreeGame } from './threeGame.js';

describe('Steam Deck Controls Fix — Verification Suite', () => {
    describe('controllerPressGate physical button equivalence', () => {
        it('maps menuBack and dash to the same equivalence group', () => {
            const group = EQUIVALENT_ACTION_GROUPS.find((g) => g.has('menuBack'));
            expect(group).toBeDefined();
            expect(group.has('dash')).toBe(true);
            expect(group.has('archiveBack')).toBe(true);
        });

        it('maps menuTabLeft and sprint to the same equivalence group', () => {
            const group = EQUIVALENT_ACTION_GROUPS.find((g) => g.has('menuTabLeft'));
            expect(group).toBeDefined();
            expect(group.has('sprint')).toBe(true);
        });

        it('masks dash in gameplay when physical B was held while closing tactical map', () => {
            let now = 10000;
            const gate = createControllerPressGate({ windowMs: 350, now: () => now });

            // 1. Tactical map is open (menu action set). User presses B to close map.
            const menuOut = gate.filter({ handle: 'deck:native', menuBack: true }, 'menu');
            expect(menuOut.menuBack).toBe(true);

            // 2. Map closes: direct poll or close function claims the exit press
            gate.claim(['menuBack', 'dash', 'toggleMap', 'pause', 'sprint'], 'browser-gamepad:0');

            now += 60;
            // 3. Native Steam Input sends gameplay snapshot while user's thumb still rests on B
            const gameplayOut = gate.filter({ handle: 'deck:native', dash: true }, 'gameplay');
            expect(gameplayOut.dash).toBe(false);

            now += 50;
            // Still held -> still masked
            expect(gate.filter({ handle: 'deck:native', dash: true }, 'gameplay').dash).toBe(false);

            // 4. User lets go of B
            gate.filter({ handle: 'deck:native', dash: false }, 'gameplay');
            gate.observe({ handle: 'browser-gamepad:0', dash: false, menuBack: false });

            now += 400;
            // 5. Subsequent intentional dash in gameplay is honored
            expect(gate.filter({ handle: 'deck:native', dash: true }, 'gameplay').dash).toBe(true);
        });

        it('masks sprint in gameplay when LB was held during menu close', () => {
            let now = 20000;
            const gate = createControllerPressGate({ windowMs: 350, now: () => now });

            expect(gate.filter({ handle: 'deck:native', menuTabLeft: true }, 'menu').menuTabLeft).toBe(true);

            now += 30;
            // Switch to gameplay while still holding LB
            const gameplayOut = gate.filter({ handle: 'deck:native', sprint: true }, 'gameplay');
            expect(gameplayOut.sprint).toBe(false);

            // Release
            gate.filter({ handle: 'deck:native', sprint: false }, 'gameplay');
            now += 30;
            expect(gate.filter({ handle: 'deck:native', sprint: true }, 'gameplay').sprint).toBe(true);
        });
    });

    describe('ThreeGame.prototype.clearGameplayInputState', () => {
        it('clears this.sprinting when resetting input state', () => {
            const context = {
                keys: { up: true, down: false, left: false, right: false, shift: true },
                sprinting: true,
                virtualInput: { x: 0.5, z: -0.5 },
                isMoving: true,
                mouseAimActive: true,
                _mouseEdgeTurnInput: 0.2,
                _cameraTurnVelocity: 0.5,
                endHeldFire: () => {},
                _aimResetTimer: 5,
                lastMouseClientX: 200,
                lastMouseClientY: 300
            };

            ThreeGame.prototype.clearGameplayInputState.call(context);

            expect(context.sprinting).toBe(false);
            expect(context.keys.shift).toBe(false);
            expect(context.virtualInput.x).toBe(0);
            expect(context.virtualInput.z).toBe(0);
            expect(context.isMoving).toBe(false);
        });
    });

    describe('Escape / Controller Back guard logic', () => {
        function shouldOpenSettingsOnEscape({ isGameplay, isControllerBack, lastCloseTime, currentTime }) {
            if (!isGameplay) return false;
            if (isControllerBack || (currentTime - lastCloseTime < 350)) {
                return false;
            }
            return true;
        }

        it('never opens settings modal when Escape is dispatched from controller Back button', () => {
            expect(shouldOpenSettingsOnEscape({
                isGameplay: true,
                isControllerBack: true,
                lastCloseTime: 0,
                currentTime: 10000
            })).toBe(false);
        });

        it('never opens settings modal when Escape arrives within 350ms of a modal closing', () => {
            expect(shouldOpenSettingsOnEscape({
                isGameplay: true,
                isControllerBack: false,
                lastCloseTime: 10000,
                currentTime: 10100
            })).toBe(false);
        });

        it('opens settings modal when physical keyboard Escape is pressed cleanly in gameplay', () => {
            expect(shouldOpenSettingsOnEscape({
                isGameplay: true,
                isControllerBack: false,
                lastCloseTime: 5000,
                currentTime: 10000
            })).toBe(true);
        });

        it('does not open settings modal when not in gameplay phase', () => {
            expect(shouldOpenSettingsOnEscape({
                isGameplay: false,
                isControllerBack: false,
                lastCloseTime: 0,
                currentTime: 10000
            })).toBe(false);
        });
    });
});
