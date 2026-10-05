import { describe, expect, it } from 'vitest';
import {
    INDUSTRIAL_ROOM_PROFILE,
    CRYO_MEDICAL_ROOM_PROFILE,
    BIOMECH_ROOM_PROFILE,
    getRoomGrammarProfile
} from './data/roomGrammarProfiles.js';
import { planInterior } from './roomGrammar.js';
import { buildGrammarRoomChunk } from './roomGrammarChunk.js';

describe('room grammar area profiles (G4)', () => {
    it('provides distinct, well-structured profiles with valid motifs and tiers', () => {
        const profiles = [INDUSTRIAL_ROOM_PROFILE, CRYO_MEDICAL_ROOM_PROFILE, BIOMECH_ROOM_PROFILE];
        for (const profile of profiles) {
            expect(profile.id).toBeTypeOf('string');
            expect(profile.tiers.standard.length).toBeGreaterThan(0);
            expect(profile.tiers.major.length).toBeGreaterThan(0);
            expect(profile.motifs.length).toBe(3);
            for (const motif of profile.motifs) {
                expect(motif.id).toBeTypeOf('string');
                expect(motif.blocks.length).toBeGreaterThanOrEqual(1);
                for (const block of motif.blocks) {
                    expect(block.role).toBeTypeOf('string');
                    expect(block.x).toBeGreaterThanOrEqual(0.2);
                    expect(block.y).toBeGreaterThanOrEqual(0.2);
                    expect(block.x + block.w).toBeLessThanOrEqual(0.85);
                    expect(block.y + block.h).toBeLessThanOrEqual(0.85);
                }
            }
        }

        expect(getRoomGrammarProfile('cryo-medical')).toBe(CRYO_MEDICAL_ROOM_PROFILE);
        expect(getRoomGrammarProfile('medical')).toBe(CRYO_MEDICAL_ROOM_PROFILE);
        expect(getRoomGrammarProfile('biomech')).toBe(BIOMECH_ROOM_PROFILE);
        expect(getRoomGrammarProfile('industrial')).toBe(INDUSTRIAL_ROOM_PROFILE);
        expect(getRoomGrammarProfile('unknown-area')).toBe(INDUSTRIAL_ROOM_PROFILE);
    });

    it('generates valid cryo-medical interiors with quarantine, autopsy, or stasis motifs', () => {
        const medicalMotifs = new Set(['quarantine-triage-ward', 'central-autopsy-theater', 'stasis-cryo-vault']);
        const seenMotifs = new Set();

        for (let seed = 100; seed < 130; seed += 1) {
            const plan = planInterior({
                seed,
                areaId: 'cryo-medical',
                tier: seed % 2 === 0 ? 'standard' : 'major',
                sockets: [
                    { side: 'n', width: 3, offset: 7 },
                    { side: 's', width: 3, offset: 7 }
                ]
            });

            expect(plan.profile).toBe('cryo-medical');
            expect(medicalMotifs.has(plan.diagnostics.motif)).toBe(true);
            seenMotifs.add(plan.diagnostics.motif);
            expect(plan.modules.length).toBeGreaterThanOrEqual(1);
            expect(plan.doors.length).toBe(2);
        }

        expect(seenMotifs.size).toBe(3);
    });

    it('generates valid biomech interiors with incubation, tracheal, or spore cathedral motifs', () => {
        const biomechMotifs = new Set(['incubation-cyst-nave', 'tracheal-peristaltic-junction', 'biomech-spore-cathedral']);
        const seenMotifs = new Set();

        for (let seed = 200; seed < 230; seed += 1) {
            const plan = planInterior({
                seed,
                areaId: 'biomech',
                tier: seed % 2 === 0 ? 'standard' : 'major',
                sockets: [
                    { side: 'e', width: 3, offset: 7 },
                    { side: 'w', width: 3, offset: 7 }
                ]
            });

            expect(plan.profile).toBe('biomech');
            expect(biomechMotifs.has(plan.diagnostics.motif)).toBe(true);
            seenMotifs.add(plan.diagnostics.motif);
            expect(plan.modules.length).toBeGreaterThanOrEqual(1);
            expect(plan.doors.length).toBe(2);
        }

        expect(seenMotifs.size).toBe(3);
    });

    it('builds full grammar room chunks adapting areaId to matching role and theme', () => {
        const medicalChunk = buildGrammarRoomChunk({
            seed: 42,
            chunkX: 2,
            chunkY: 3,
            areaId: 'cryo-medical',
            openings: {
                north: { open: true, offset: 7 },
                south: { open: true, offset: 7 }
            }
        });

        expect(medicalChunk).toBeDefined();
        expect(medicalChunk.rooms[0].role).toBe('medical');
        expect(medicalChunk.rooms[0].theme).toBe('cryo');

        const biomechChunk = buildGrammarRoomChunk({
            seed: 88,
            chunkX: 4,
            chunkY: 5,
            areaId: 'biomech',
            openings: {
                east: { open: true, offset: 7 },
                west: { open: true, offset: 7 }
            }
        });

        expect(biomechChunk).toBeDefined();
        expect(biomechChunk.rooms[0].role).toBe('nest');
        expect(biomechChunk.rooms[0].theme).toBe('bio');
    });
});
