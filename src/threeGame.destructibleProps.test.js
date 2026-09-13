import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
});
