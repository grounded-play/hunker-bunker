import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ThreeGame } from './threeGame.js';

/**
 * Guard for the destructibility audit (docs/reports/pr65-known-gaps-2026-09-11.md).
 *
 * The hazard is specific and unrecoverable: if a prop an objective can point at
 * becomes destructible, a player can shoot it and soft-lock the run with no
 * feedback and no way back. That failure would not show up in any other test --
 * the code would be working exactly as written.
 */
describe('destructible prop safety', () => {
    const source = readFileSync(fileURLToPath(new URL('./threeGame.js', import.meta.url)), 'utf8');

    beforeEach(() => {
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn(), playMetalStress: vi.fn() }
        };
        globalThis.CustomEvent = class CustomEvent {
            constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
        };
    });

    /** Prop types an objective or run-critical flow can target. */
    const PROTECTED_TYPES = ['lore_terminal', 'black_box', 'blackbox', 'extraction', 'objective'];

    it('never marks an objective-critical prop destructible', () => {
        // Find each block that sets isDestructibleProp and check the guard that
        // leads into it does not admit a protected type.
        const blocks = source.split('isDestructibleProp: true');
        // The first split element is everything before the first occurrence.
        for (let i = 1; i < blocks.length; i++) {
            const preceding = blocks[i - 1].slice(-1200);
            for (const type of PROTECTED_TYPES) {
                const guardsOnProtected = new RegExp(
                    `placement\\\\.type\\\\s*===\\\\s*['"\`]${type}['"\`][^]{0,400}$`
                ).test(preceding);
                expect(
                    guardsOnProtected,
                    `a destructible branch is gated on the protected type "${type}"`
                ).toBe(false);
            }
        }
    });

    it('keeps lore_terminal out of the destructible path entirely', () => {
        const terminalBlock = source.slice(source.indexOf("placement.type === 'lore_terminal'"));
        const nextSection = terminalBlock.slice(0, 1600);
        expect(nextSection.includes('isDestructibleProp: true')).toBe(false);
    });

    it('does mark ordinary scenery destructible, so the audit has teeth', () => {
        // A guard that passes because nothing is destructible is worthless.
        expect(source.split('isDestructibleProp: true').length - 1).toBeGreaterThanOrEqual(2);
    });

    it('makes GLB-only prop placements destructible without weakening structural anchors', () => {
        const game = {
            deferWorld3dReplacement: vi.fn()
        };
        const prop = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'prop_oxygen_bottle_cascade_rack',
            x: 4,
            z: 7,
            scale: 1.15,
            hp: 35,
            scatterKey: 'oxygen-rack'
        });
        const architecture = ThreeGame.prototype.createScatterInstance.call(game, {
            type: 'arch_bulkhead_frame',
            x: 1,
            z: 2,
            scale: 1,
            hp: 99,
            scatterKey: 'bulkhead'
        });

        expect(prop.userData).toMatchObject({
            isWorld3dOnly: true,
            isDestructibleProp: true,
            propHp: 35,
            maxPropHp: 35
        });
        expect(architecture.userData.isDestructibleProp).toBe(false);
        expect(architecture.userData.propHp).toBeUndefined();
        expect(game.deferWorld3dReplacement).toHaveBeenCalledWith(prop, 'prop_oxygen_bottle_cascade_rack');
    });

    it('removes a destroyed umbilical attacker from its update loop', () => {
        const root = { removeFromParent: vi.fn() };
        const attacker = { dispose: vi.fn() };
        const sprite = {
            parent: { remove: vi.fn() },
            position: { x: 2, z: 3 },
            userData: {
                isDestructibleProp: true,
                type: 'prop_biomech_spore_umbilical_cable_rigged',
                scatterKey: 'umbilical',
                world3dRoot: root,
                umbilicalAttacker: attacker
            }
        };
        const game = {
            player: null,
            scatterSprites: [sprite],
            umbilicalAttackers: [attacker],
            spawnGearPoofEffect: vi.fn(),
            spawnToxicSporePuddle: vi.fn(),
            spawnDestructiblePropDrops: vi.fn(),
            broadcastSharedWorldEvent: vi.fn()
        };

        ThreeGame.prototype.breakScatterProp.call(game, sprite);

        expect(attacker.dispose).toHaveBeenCalledOnce();
        expect(game.umbilicalAttackers).toEqual([]);
        expect(root.removeFromParent).toHaveBeenCalledOnce();
    });
});
