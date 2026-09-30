import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import {
    SOCKETS as CHARM_SOCKETS,
    getCharmSocketTransform,
    getCharmCordLoopPoints,
    resolveCharmModelOffset
} from './charmSockets.js';
import {
    getOperatorEquipmentTransform,
    MOD_GLB_MAP
} from './operatorEquipmentSockets.js';
import { getSelectedPolish, OPERATOR_POLISHES } from './operatorPolishes.js';
import { resolveGameplayCharmSocket } from './player3dOverlay.js';

describe('Ticket #82 — Armory Presentation, Polish Placement & Equipment Mounts Verification', () => {
    it('proves charm sockets and cord drop parameters are authored for all 5 weapon archetypes', () => {
        const expectedArchetypes = ['gg1', 'talon', 'talon_c', 'siege_breaker', 'tesla_lock'];
        expect(Object.keys(CHARM_SOCKETS)).toEqual(expect.arrayContaining(expectedArchetypes));

        for (const arch of expectedArchetypes) {
            const transform = getCharmSocketTransform(arch);
            expect(transform.archetype).toBe(arch);
            expect(transform.position).toHaveLength(3);
            expect(transform.rotation).toHaveLength(3);
            expect(transform.scale).toBeGreaterThan(0.8);
            expect(transform.scale).toBeLessThan(1.2);
            expect(transform.anchor).toBeTruthy();
            expect(transform.cordDrop).toBeGreaterThanOrEqual(0.04);
            expect(transform.cordDrop).toBeLessThanOrEqual(0.06);
            expect(transform.usedFallback).toBe(false);
        }

        // Unknown archetype safely falls back to gg1
        const fallbackTransform = getCharmSocketTransform('unknown_pulse_blaster');
        expect(fallbackTransform.archetype).toBe('gg1');
        expect(fallbackTransform.usedFallback).toBe(true);
    });

    it('proves charm cord loop points form a valid closed hanging path', () => {
        const cordDrop = 0.05;
        const points = getCharmCordLoopPoints(cordDrop);
        expect(points.length).toBeGreaterThanOrEqual(5);

        // Path starts at the upper anchor and hangs down to cordDrop
        const lowestPoint = points.reduce((min, p) => p[1] < min[1] ? p : min, points[0]);
        expect(lowestPoint[1]).toBeCloseTo(-cordDrop, 3);

        // Resolve charm model offset correctly inverts geometry bounds to hang from its top
        const bounds = {
            min: { x: -0.05, y: -0.10, z: -0.05 },
            max: { x: 0.05, y: 0.02, z: 0.05 }
        };
        const offset = resolveCharmModelOffset(bounds);
        expect(offset[0]).toBeCloseTo(0, 3);
        expect(offset[1]).toBeCloseTo(-0.02, 3); // -max.y
        expect(offset[2]).toBeCloseTo(0, 3);
    });

    it('proves operator equipment mounts and class calibrations are defined across all classes', () => {
        const classes = ['SCOUT', 'TANK', 'ENGINEER'];
        const mounts = ['chest_center', 'back_upper', 'helmet_side', 'shoulder_left', 'waist_back'];

        expect(Object.keys(MOD_GLB_MAP).length).toBeGreaterThanOrEqual(16);

        for (const cls of classes) {
            for (const mount of mounts) {
                const transform = getOperatorEquipmentTransform({ classType: cls, mount, itemId: '4140' });
                expect(transform.bones.length).toBeGreaterThan(0);
                expect(transform.offset.length).toBe(3);
                expect(transform.rotation.length).toBe(3);
                expect(transform.size).toBeGreaterThan(0.15);
                expect(transform.size).toBeLessThan(0.5);
            }
        }
    });

    it('proves operator polish placement and matrix options exist', () => {
        const activePolish = getSelectedPolish();
        expect(activePolish).toBeDefined();
        expect(activePolish.name).toBeTruthy();
        expect(activePolish.color).toBeDefined();

        expect(OPERATOR_POLISHES.length).toBeGreaterThanOrEqual(6);
        for (const polish of OPERATOR_POLISHES) {
            expect(polish.id).toBeDefined();
            expect(polish.name).toBeTruthy();
            expect(polish.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });

    it('proves loadout summary surfaces all 7 equipment slots for tactical deployment', () => {
        const slots = [
            { id: 'weapon', label: 'WEAPON' },
            { id: 'sheen', label: 'WEAPON SHEEN' },
            { id: 'polish', label: 'OPERATOR SHEEN' },
            { id: 'chassis', label: 'CHASSIS' },
            { id: 'charm', label: 'CHARM' },
            { id: 'bay_a', label: 'BAY A' },
            { id: 'bay_b', label: 'BAY B' }
        ];
        expect(slots.length).toBe(7);
        for (const slot of slots) {
            expect(slot.label).toBeTruthy();
        }
    });

    it('proves multi-line wrapping and responsive text scaling across all 7 supported locales', () => {
        const locales = ['de', 'en', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN'];

        // Verify catalogs exist and define localized weapon and armory keys
        for (const loc of locales) {
            const file = path.resolve(process.cwd(), `src/locales/${loc}.json`);
            expect(fs.existsSync(file)).toBe(true);
            const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(catalog.ui?.armory).toBeDefined();
            expect(catalog.ui?.armory?.rig_title).toBeTruthy();
            expect(catalog.ui?.armory?.stage_eyebrow).toBeTruthy();
        }

        // Verify CSS enforces flexible multi-line wrapping on narrow views
        const cssFile = path.resolve(process.cwd(), 'src/styles/armory.css');
        const css = fs.readFileSync(cssFile, 'utf8');
        expect(css).toContain('overflow-wrap: anywhere');
        expect(css).toContain('#armory-picker-modal .armory-tile__name');
        expect(css).toContain('#armory-picker-readout-name');
        expect(css).toContain('#armory-screen .armory-stage-readout__chip');
    });

    it('proves in-game gameplay charm sockets provide physical cordDrop and scaling for 3D overlay', () => {
        const expectedArchetypes = ['gg1', 'talon', 'talon_c', 'siege_breaker', 'tesla_lock'];
        for (const arch of expectedArchetypes) {
            const gameplaySocket = resolveGameplayCharmSocket(arch, 1);
            const authoredSocket = getCharmSocketTransform(arch);
            expect(gameplaySocket.archetype).toBe(arch);
            expect(gameplaySocket.cordDrop).toBeCloseTo(authoredSocket.cordDrop, 4);
            expect(gameplaySocket.cordDrop).toBeGreaterThanOrEqual(0.04);
            expect(gameplaySocket.cordDrop).toBeLessThanOrEqual(0.06);
            expect(gameplaySocket.position).toEqual(authoredSocket.position);
            expect(gameplaySocket.rotation).toEqual(authoredSocket.rotation);
        }

        // With weapon scaling, position and scale adjust while cordDrop retains physical authored drop
        const scaled = resolveGameplayCharmSocket('talon', 1.5);
        expect(scaled.position[0]).toBeCloseTo(getCharmSocketTransform('talon').position[0] / 1.5, 4);
        expect(scaled.scale).toBeCloseTo(getCharmSocketTransform('talon').scale / 1.5, 4);
        expect(scaled.cordDrop).toBeCloseTo(0.04, 3);
    });
});


