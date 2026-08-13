import { describe, it, expect } from 'vitest';
import {
    isCellInSafeZone,
    isPointInBounds,
    normalizeContainmentBounds,
    translateContainmentZone,
    translateContainmentDoor,
    shouldBlockAttackPath,
    shouldClampAreaOfEffect,
    canHostileAggroTarget
} from './roomContainment.js';

describe('roomContainment', () => {
    describe('isPointInBounds', () => {
        it('checks minX/maxX/minZ/maxZ correctly', () => {
            const bounds = { minX: 10, maxX: 20, minZ: 30, maxZ: 40 };
            expect(isPointInBounds(15, 35, bounds)).toBe(true);
            expect(isPointInBounds(10, 30, bounds)).toBe(true);
            expect(isPointInBounds(20, 40, bounds)).toBe(true);
            expect(isPointInBounds(9, 35, bounds)).toBe(false);
            expect(isPointInBounds(15, 41, bounds)).toBe(false);
        });

        it('handles left/right/top/bottom', () => {
            const bounds = { left: 0, right: 10, top: 0, bottom: 10 };
            expect(isPointInBounds(5, 5, bounds)).toBe(true);
            expect(isPointInBounds(-1, 5, bounds)).toBe(false);
        });

        it('normalizes minY/maxY grid bounds onto the Z axis', () => {
            const bounds = { minX: 8, maxX: 2, minY: 15, maxY: 9 };
            expect(normalizeContainmentBounds(bounds)).toEqual({
                minX: 2,
                maxX: 8,
                minZ: 9,
                maxZ: 15
            });
            expect(isPointInBounds(4, 12, bounds)).toBe(true);
        });
    });

    describe('isCellInSafeZone', () => {
        it('requires explicit safe policy and does not infer safety from quiet metadata', () => {
            const rooms = [
                {
                    id: 'med_triage',
                    role: 'medical_safe',
                    safeZone: true,
                    bounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 }
                },
                {
                    id: 'combat_arena',
                    role: 'arena',
                    bounds: { minX: 50, maxX: 70, minZ: 50, maxZ: 70 },
                    quietZones: [{ bounds: { minX: 50, maxX: 55, minZ: 50, maxZ: 55 } }]
                }
            ];

            expect(isCellInSafeZone(5, 5, rooms)).toBe(true);
            expect(isCellInSafeZone(52, 52, rooms)).toBe(false);
            expect(isCellInSafeZone(65, 65, rooms)).toBe(false);
            expect(isCellInSafeZone(100, 100, rooms)).toBe(false);
        });

        it('allows an explicitly safe nested zone without promoting its quiet siblings', () => {
            const room = {
                bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 20 },
                quietZones: [
                    { bounds: { minX: 1, maxX: 4, minZ: 1, maxZ: 4 } },
                    { isSafe: true, bounds: { minX: 10, maxX: 14, minZ: 10, maxZ: 14 } }
                ]
            };
            expect(isCellInSafeZone(2, 2, [room])).toBe(false);
            expect(isCellInSafeZone(12, 12, [room])).toBe(true);
        });
    });

    describe('local-to-world translation', () => {
        it('translates a non-origin safe room and its grid Y bounds', () => {
            const worldRoom = translateContainmentZone({
                id: 'medical-safe',
                safeZone: true,
                bounds: { minX: 1, maxX: 5, minY: 2, maxY: 7 }
            }, { x: 64, z: -32 });

            expect(worldRoom.bounds).toEqual({ minX: 65, maxX: 69, minZ: -30, maxZ: -25 });
            expect(isCellInSafeZone(67, -27, [worldRoom])).toBe(true);
            expect(isCellInSafeZone(3, 4, [worldRoom])).toBe(false);
        });

        it('translates non-origin door bounds and cells without mutating the source', () => {
            const localDoor = {
                state: 'closed',
                bounds: { minX: 3, maxX: 4, minY: 6, maxY: 8 },
                cells: [{ x: 3, y: 7 }, [4, 7]]
            };
            const worldDoor = translateContainmentDoor(localDoor, { x: 100, z: 50 });

            expect(worldDoor.bounds).toEqual({ minX: 103, maxX: 104, minZ: 56, maxZ: 58 });
            expect(worldDoor.cells).toEqual([{ x: 103, y: 57 }, [104, 57]]);
            expect(localDoor.cells[0]).toEqual({ x: 3, y: 7 });
        });
    });

    describe('shouldBlockAttackPath', () => {
        it('blocks a projectile segment at a translated closed door', () => {
            const door = translateContainmentDoor({
                state: 'locked',
                bounds: { minX: 2, maxX: 3, minY: 4, maxY: 6 }
            }, { x: 80, z: -20 });

            expect(shouldBlockAttackPath(
                { x: 78, z: -15 },
                { x: 88, z: -15 },
                { doors: [door] }
            )).toBe(true);
            expect(shouldBlockAttackPath(
                { x: 78, z: -10 },
                { x: 88, z: -10 },
                { doors: [door] }
            )).toBe(false);
        });

        it('blocks entry into an explicit safe room but not a merely quiet room', () => {
            const safe = { isSafe: true, bounds: { minX: 20, maxX: 30, minZ: 20, maxZ: 30 } };
            const quiet = { isQuiet: true, bounds: { minX: 40, maxX: 50, minZ: 20, maxZ: 30 } };
            expect(shouldBlockAttackPath({ x: 15, z: 25 }, { x: 25, z: 25 }, { containmentZones: [safe] })).toBe(true);
            expect(shouldBlockAttackPath({ x: 35, z: 25 }, { x: 45, z: 25 }, { containmentZones: [quiet] })).toBe(false);
        });
    });

    describe('shouldClampAreaOfEffect', () => {
        const safeRooms = [
            {
                id: 'camp_haven',
                role: 'camp',
                safeZone: true,
                bounds: { minX: 10, maxX: 30, minZ: 10, maxZ: 30 }
            }
        ];

        it('clamps AoE if target is inside safe zone and origin is outside', () => {
            const origin = { x: 5, z: 20 }; // Outside safe zone
            const target = { x: 15, z: 20 }; // Inside safe zone
            const radius = 15;

            expect(shouldClampAreaOfEffect(origin, target, radius, { containmentZones: safeRooms })).toBe(true);
        });

        it('does not clamp AoE if both origin and target are outside or inside without barriers', () => {
            const origin = { x: 0, z: 0 };
            const target = { x: 3, z: 4 }; // distance = 5
            const radius = 6;

            expect(shouldClampAreaOfEffect(origin, target, radius, { containmentZones: safeRooms })).toBe(false);
        });

        it('clamps AoE if a closed door intersects line of effect', () => {
            const origin = { x: 0, z: 10 };
            const target = { x: 10, z: 10 };
            const doors = [
                {
                    state: 'closed',
                    bounds: { minX: 4.5, maxX: 5.5, minZ: 8, maxZ: 12 }
                }
            ];

            expect(shouldClampAreaOfEffect(origin, target, 15, { doors })).toBe(true);
        });

        it('allows AoE if door is open', () => {
            const origin = { x: 0, z: 10 };
            const target = { x: 10, z: 10 };
            const doors = [
                {
                    state: 'open',
                    open: true,
                    bounds: { minX: 4.5, maxX: 5.5, minZ: 8, maxZ: 12 }
                }
            ];

            expect(shouldClampAreaOfEffect(origin, target, 15, { doors })).toBe(false);
        });
    });

    describe('canHostileAggroTarget', () => {
        const safeRooms = [
            {
                id: 'medical_quiet',
                isSafe: true,
                bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 20 }
            }
        ];

        it('disallows aggro if player is inside safe zone and enemy is outside', () => {
            const enemy = { x: 35, z: 10 };
            const player = { x: 10, z: 10 };

            expect(canHostileAggroTarget(enemy, player, { containmentZones: safeRooms })).toBe(false);
        });

        it('disallows aggro if closed door separates enemy and player', () => {
            const enemy = { x: 50, z: 10 };
            const player = { x: 30, z: 10 };
            const doors = [
                {
                    state: 'locked',
                    open: false,
                    bounds: { minX: 39, maxX: 41, minZ: 5, maxZ: 15 }
                }
            ];

            expect(canHostileAggroTarget(enemy, player, { doors })).toBe(false);
        });

        it('allows aggro if line of sight is clear', () => {
            const enemy = { x: 50, z: 10 };
            const player = { x: 30, z: 10 };

            expect(canHostileAggroTarget(enemy, player)).toBe(true);
        });
    });
});
