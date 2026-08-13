import { describe, it, expect } from 'vitest';
import {
    resolveAnchorWorldPosition,
    bindRoomContent
} from './roomContent.js';

describe('roomContent', () => {
    describe('resolveAnchorWorldPosition', () => {
        it('calculates world coordinates correctly from chunk coordinates and local anchor', () => {
            const pos = resolveAnchorWorldPosition(2, -3, { x: 10, z: 20 }, 49, { x: 0, z: 0 });
            expect(pos.x).toBe(2 * 49 + 10);
            expect(pos.z).toBe(-3 * 49 + 20);
            expect(pos.worldX).toBe(pos.x);
            expect(pos.worldZ).toBe(pos.z);
        });

        it('handles { x, y } local coordinates when z is missing', () => {
            const pos = resolveAnchorWorldPosition(1, 1, { x: 5, y: 15 }, 49);
            expect(pos.x).toBe(49 + 5);
            expect(pos.z).toBe(49 + 15);
        });

        it('applies world offsets additively and only subtracts in explicit compatibility mode', () => {
            const additive = resolveAnchorWorldPosition(1, -1, { x: 5, y: 6 }, 49, { x: 100, z: -20 });
            const legacy = resolveAnchorWorldPosition(
                1,
                -1,
                { x: 5, y: 6 },
                49,
                { x: 100, z: -20 },
                { offsetMode: 'subtract' }
            );

            expect(additive).toMatchObject({ x: 154, z: -63 });
            expect(legacy).toMatchObject({ x: -46, z: -23 });
        });

        it('rejects malformed anchors instead of silently binding them at the chunk origin', () => {
            expect(resolveAnchorWorldPosition(2, 3, null, 49)).toBeNull();
            expect(resolveAnchorWorldPosition(2, 3, { x: 4 }, 49)).toBeNull();
            expect(resolveAnchorWorldPosition(2, 3, { x: Number.NaN, y: 4 }, 49)).toBeNull();
        });
    });

    describe('bindRoomContent', () => {
        it('binds structural, interaction, reward, and lore anchors for medical rooms', () => {
            const roomInstance = {
                id: 'med_triage_001',
                chunkX: 1,
                chunkY: 0,
                role: 'medical'
            };
            const roomBuild = {
                id: 'medical_triage_a',
                family: 'medical',
                structuralAnchors: [{ id: 'decon_1', x: 12, z: 10 }],
                interactionAnchors: [{ id: 'diag_console', x: 20, z: 20 }],
                rewardAnchors: [{ id: 'med_locker', x: 25, z: 15 }],
                loreAnchors: [{ id: 'patient_log', x: 5, z: 5, loreKey: 'lore_dr_chen_log_1' }]
            };

            const plan = bindRoomContent(roomInstance, roomBuild, {
                chunkSize: 49,
                stateVariant: 'intact'
            });

            expect(plan.roomId).toBe('med_triage_001');
            expect(plan.family).toBe('medical');
            expect(plan.structural.length).toBe(1);
            expect(plan.structural[0].x).toBe(49 + 12);
            expect(plan.interactions.length).toBe(1);
            expect(plan.interactions[0].active).toBe(true);
            expect(plan.rewards.length).toBe(1);
            expect(plan.rewards[0].reward.type).toBe('med');
            expect(plan.lore.length).toBe(1);
            expect(plan.lore[0].loreKey).toBe('lore_dr_chen_log_1');
        });

        it('binds active camp quest props when matching target room', () => {
            const roomInstance = {
                id: 'o2_scrubber_001',
                chunkX: 0,
                chunkY: 1,
                role: 'o2',
                reservationId: 'quest_res_reactor_venting'
            };
            const roomBuild = {
                family: 'o2',
                interactionAnchors: [{ id: 'valve_a', x: 10, z: 10 }]
            };
            const activeQuests = [
                {
                    id: 'camp_quest:reactor_venting',
                    reservationId: 'quest_res_reactor_venting',
                    targetProp: 'reactor_valve_wheel'
                }
            ];

            const plan = bindRoomContent(roomInstance, roomBuild, {
                chunkSize: 49,
                activeQuests
            });

            expect(plan.questProps.length).toBe(1);
            expect(plan.questProps[0].questId).toBe('camp_quest:reactor_venting');
            expect(plan.questProps[0].targetProp).toBe('reactor_valve_wheel');
            expect(plan.questProps[0].x).toBe(10);
            expect(plan.questProps[0].z).toBe(49 + 10);
        });

        it('uses the room instance state variant when no context override is supplied', () => {
            const plan = bindRoomContent({
                id: 'armory',
                chunkX: 0,
                chunkY: 0,
                family: 'armory',
                stateVariant: 'questActive',
                interactionAnchors: [{ x: 2, y: 3 }],
                rewardAnchors: [{ x: 4, y: 5 }]
            });

            expect(plan.stateVariant).toBe('questActive');
            expect(plan.interactions[0]).toMatchObject({ state: 'questActive', active: true });
        });

        it('skips malformed authored anchors and never emits origin content for them', () => {
            const plan = bindRoomContent({
                id: 'broken-room',
                chunkX: 2,
                chunkY: 3,
                family: 'medical',
                structuralAnchors: [{ id: 'missing-y', x: 3 }],
                interactionAnchors: [{ id: 'missing-x', y: 4 }],
                rewardAnchors: [null],
                loreAnchors: [{ x: Infinity, y: 1 }]
            });

            expect(plan.structural).toEqual([]);
            expect(plan.interactions).toEqual([]);
            expect(plan.rewards).toEqual([]);
            expect(plan.lore).toEqual([]);
        });

        it('keeps a fabricator terminal as an interaction and its reward as a schematic cache', () => {
            const plan = bindRoomContent({
                id: 'field-fabricator',
                chunkX: 0,
                chunkY: 0,
                family: 'fabricator',
                interactionAnchors: [{ id: 'terminal', x: 5, y: 5 }],
                rewardAnchors: [{ id: 'schematic-cache', x: 2, y: 2 }]
            });

            expect(plan.interactions[0].type).toBe('field_fabricator_terminal');
            expect(plan.rewards[0].reward.type).toBe('schematic_weapon');
            expect(plan.rewards[0].reward.type).not.toBe(plan.interactions[0].type);
        });

        it('binds quest props precisely to the matching objectiveAnchorId anchor', () => {
            const roomInstance = {
                id: 'med_triage_spore',
                chunkX: 1,
                chunkY: 2,
                family: 'medical',
                interactionAnchors: [
                    { id: 'diag_console', x: 10, y: 10 },
                    { id: 'hydro_bed_controls', x: 30, y: 35 }
                ]
            };
            const activeQuests = [
                {
                    id: 'quest:spore_cleansing',
                    targetFamily: 'medical',
                    objectiveAnchorId: 'hydro_bed_controls',
                    targetProp: 'hydro_bed'
                }
            ];

            const plan = bindRoomContent(roomInstance, {}, {
                chunkSize: 49,
                activeQuests
            });

            expect(plan.questProps).toHaveLength(1);
            expect(plan.questProps[0].questId).toBe('quest:spore_cleansing');
            expect(plan.questProps[0].x).toBe(1 * 49 + 30);
            expect(plan.questProps[0].z).toBe(2 * 49 + 35);
        });
    });
});
