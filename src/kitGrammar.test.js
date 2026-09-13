import { describe, expect, it } from 'vitest';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import {
    KIT_SKINS, SHARED_ROLES, SKIN_ONLY_ROLES,
    skinForBiome, kitPieceFor, chooseKitPiece
} from './kitGrammar.js';

describe('biome skinning', () => {
    it('routes rock biomes to the cave kit and fabricated ones to space', () => {
        expect(skinForBiome('bio')).toBe(KIT_SKINS.CAVE);
        expect(skinForBiome('active')).toBe(KIT_SKINS.SPACE);
        expect(skinForBiome('cryo')).toBe(KIT_SKINS.SPACE);
    });

    it('falls back to space for an unknown biome rather than throwing', () => {
        expect(skinForBiome('nonsense')).toBe(KIT_SKINS.SPACE);
        expect(skinForBiome(undefined)).toBe(KIT_SKINS.SPACE);
    });
});

describe('role resolution', () => {
    it('resolves every shared role in both skins to a REGISTERED model', () => {
        // The point of the grammar is that a generator can ask for a role and
        // get something that renders. A role resolving to a type nobody
        // registered is the failure this guards.
        for (const biome of ['active', 'bio']) {
            for (const role of Object.keys(SHARED_ROLES)) {
                const type = kitPieceFor(role, biome);
                expect(WORLD_3D_MODELS[type], `${role} in ${biome} -> ${type}`).toBeTruthy();
            }
        }
    });

    it('gives each skin its own gate rather than a shared one', () => {
        expect(kitPieceFor('gate', 'bio')).toBe('kit_cave_gate_rock');
        expect(kitPieceFor('gate', 'active')).toBe('kit_space_gate_door');
    });

    it('returns null for a role the skin lacks, instead of substituting', () => {
        // A rock slab standing in for a powered door is worse than no door.
        expect(kitPieceFor('ladder', 'active')).toBeNull();
        expect(kitPieceFor('gateHazard', 'bio')).toBeNull();
    });

    it('resolves every skin-only role within its own skin', () => {
        for (const [skin, roles] of Object.entries(SKIN_ONLY_ROLES)) {
            const biome = skin === KIT_SKINS.CAVE ? 'bio' : 'active';
            for (const role of Object.keys(roles)) {
                expect(WORLD_3D_MODELS[kitPieceFor(role, biome)], `${role}/${skin}`).toBeTruthy();
            }
        }
    });

    it('only adds a -variation suffix where that twin actually exists', () => {
        expect(kitPieceFor('roomSmall', 'active', { variation: true })).toBe('kit_space_room_small_variation');
        // Corridors have no variation twin; asking for one must not invent a type.
        expect(kitPieceFor('corridor', 'active', { variation: true })).toBe('kit_space_corridor');
    });
});

describe('grid breaking', () => {
    it('is deterministic for a given seeded roll', () => {
        const a = chooseKitPiece('roomLarge', 'bio', () => 0.3);
        const b = chooseKitPiece('roomLarge', 'bio', () => 0.3);
        expect(a).toEqual(b);
    });

    it('produces different rotations across rolls, so the grid does not repeat', () => {
        const rotations = new Set([0.05, 0.3, 0.55, 0.8].map((r) => chooseKitPiece('corridor', 'active', () => r).rotationSteps));
        expect(rotations.size).toBeGreaterThan(1);
    });

    it('keeps rotation cardinal, since these pieces socket on a grid', () => {
        for (const r of [0, 0.24, 0.49, 0.74, 0.99]) {
            const piece = chooseKitPiece('corridor', 'active', () => r);
            expect([0, 1, 2, 3]).toContain(piece.rotationSteps);
        }
    });

    it('reaches the variation twin on a high roll and not on a low one', () => {
        expect(chooseKitPiece('roomWide', 'active', () => 0.9).variation).toBe(true);
        expect(chooseKitPiece('roomWide', 'active', () => 0.1).variation).toBe(false);
    });

    it('returns null for an impossible role rather than a broken piece', () => {
        expect(chooseKitPiece('ladder', 'active', () => 0.5)).toBeNull();
    });
});
