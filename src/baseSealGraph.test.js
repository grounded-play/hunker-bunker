import { describe, expect, it } from 'vitest';
import {
    SEAL_LEAK_TYPES,
    evaluateRoomSealGraph,
    isPositionSafeForRest
} from './baseSealGraph.js';

describe('BaseSealGraph', () => {
    it('detects unsealed leaks when ceiling or walls are missing', () => {
        // Just a 1x1 floor with no walls or ceiling
        const modules = [
            { instanceId: 'f1', definitionId: 'floor_plate_1x1', x: 0, z: 0 }
        ];

        const result = evaluateRoomSealGraph({ modules });
        expect(result.isEnclosed).toBe(false);
        expect(result.isSleepSafe).toBe(false);
        expect(result.leaks.some((l) => l.type === SEAL_LEAK_TYPES.MISSING_CEILING)).toBe(true);
        expect(result.leaks.some((l) => l.type === SEAL_LEAK_TYPES.MISSING_WALL)).toBe(true);
    });

    it('detects leaks when a boundary door is left open', () => {
        const modules = [
            { instanceId: 'f1', definitionId: 'floor_plate_1x1', x: 0, z: 0 },
            { instanceId: 'c1', definitionId: 'ceiling_panel_1x1', x: 0, z: 0 },
            { instanceId: 'w_n', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'north' },
            { instanceId: 'w_s', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'south' },
            { instanceId: 'w_w', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'west' },
            { instanceId: 'd_e', definitionId: 'sealable_door_1x1', x: 0, z: 0, side: 'east', isOpen: true }
        ];

        const result = evaluateRoomSealGraph({ modules });
        expect(result.isEnclosed).toBe(false);
        const openDoorLeak = result.leaks.find((l) => l.type === SEAL_LEAK_TYPES.OPEN_DOOR);
        expect(openDoorLeak).toBeDefined();
        expect(openDoorLeak.doorId).toBe('d_e');
    });

    it('validates a completely sealed and oxygenated room with a bed as sleep-safe', () => {
        const modules = [
            { instanceId: 'f1', definitionId: 'floor_plate_1x1', x: 0, z: 0 },
            { instanceId: 'c1', definitionId: 'ceiling_panel_1x1', x: 0, z: 0 },
            { instanceId: 'w_n', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'north' },
            { instanceId: 'w_s', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'south' },
            { instanceId: 'w_w', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'west' },
            { instanceId: 'd_e', definitionId: 'sealable_door_1x1', x: 0, z: 0, side: 'east', isOpen: false },
            { instanceId: 'o2', definitionId: 'o2_regulator', x: 0, z: 0 },
            { instanceId: 'bed', definitionId: 'cot_bed', x: 0, z: 0 }
        ];

        const result = evaluateRoomSealGraph({ modules });
        expect(result.isEnclosed).toBe(true);
        expect(result.isOxygenated).toBe(true);
        expect(result.isSleepSafe).toBe(true);
        expect(result.leaks.length).toBe(0);

        const restCheck = isPositionSafeForRest(result, { x: 0, z: 0 });
        expect(restCheck.safe).toBe(true);
    });

    it('refuses sleep when the sealed room has no bed installed', () => {
        const modules = [
            { instanceId: 'f1', definitionId: 'floor_plate_1x1', x: 0, z: 0 },
            { instanceId: 'c1', definitionId: 'ceiling_panel_1x1', x: 0, z: 0 },
            { instanceId: 'w_n', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'north' },
            { instanceId: 'w_s', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'south' },
            { instanceId: 'w_w', definitionId: 'straight_wall_1x1', x: 0, z: 0, side: 'west' },
            { instanceId: 'd_e', definitionId: 'sealable_door_1x1', x: 0, z: 0, side: 'east', isOpen: false },
            { instanceId: 'o2', definitionId: 'o2_regulator', x: 0, z: 0 }
        ];

        const result = evaluateRoomSealGraph({ modules, defaultSafeBubble: null });
        expect(result.isEnclosed).toBe(true);
        expect(result.isOxygenated).toBe(true);
        expect(result.isSleepSafe).toBe(false);

        const restCheck = isPositionSafeForRest(result, { x: 0, z: 0 });
        expect(restCheck.safe).toBe(false);
        expect(restCheck.reason).toBe('lacks-installed-bed');
    });

    it('preserves crash ship default safe bubble as emergency rest fallback', () => {
        const result = evaluateRoomSealGraph({
            modules: [],
            defaultSafeBubble: { x: 10, z: 10, radius: 4 }
        });

        // Outside bubble -> not safe
        const outside = isPositionSafeForRest(result, { x: 25, z: 25 });
        expect(outside.safe).toBe(false);

        // Inside ship bubble -> emergency rest allowed
        const inside = isPositionSafeForRest(result, { x: 11, z: 11 });
        expect(inside.safe).toBe(true);
        expect(inside.isEmergencyBubble).toBe(true);
    });
});
