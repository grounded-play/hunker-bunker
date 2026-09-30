import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    STORY_LINCHPINS,
    NEVER_LOCKED_ENDINGS,
    applyLinchpinResolution
} from './storyLinchpins.js';
import { ACT2_ENDINGS } from './act2Endings.js';
import { GIB_CHUNK_COUNT, GIB_GROUP_NAME } from './enemyGibs.js';

describe('Ticket #66 — Prop Destructibility & Ending Locks Verification', () => {
    it('verifies enemy gib and dismemberment physics constants are safely bounded', () => {
        expect(GIB_CHUNK_COUNT).toBe(8);
        expect(GIB_GROUP_NAME).toBe('enemy-gibs');
    });

    it('proves objective-critical props are never marked destructible, protecting runs from soft-locks', () => {
        const threeGameSource = readFileSync(
            fileURLToPath(new URL('./threeGame.js', import.meta.url)),
            'utf8'
        );

        const PROTECTED_TYPES = ['lore_terminal', 'black_box', 'blackbox', 'extraction', 'objective'];
        const blocks = threeGameSource.split('isDestructibleProp: true');

        for (let i = 1; i < blocks.length; i++) {
            const preceding = blocks[i - 1].slice(-1200);
            for (const type of PROTECTED_TYPES) {
                const guardsOnProtected = new RegExp(
                    `placement\\\\.type\\\\s*===\\\\s*['"\`]${type}['"\`][^]{0,400}$`
                ).test(preceding);
                expect(
                    guardsOnProtected,
                    `a destructible branch must never be gated on protected type "${type}"`
                ).toBe(false);
            }
        }

        // Terminal block specifically
        const terminalIndex = threeGameSource.indexOf("placement.type === 'lore_terminal'");
        expect(terminalIndex).toBeGreaterThan(-1);
        const terminalSection = threeGameSource.slice(terminalIndex, terminalIndex + 1600);
        expect(terminalSection.includes('isDestructibleProp: true')).toBe(false);

        // Ordinary scenery (crates, bunker_junk) IS destructible
        expect(threeGameSource.split('isDestructibleProp: true').length - 1).toBeGreaterThanOrEqual(2);
    });

    it('proves ending locks are mathematically defined on all linchpin resolutions without soft-locking all endings', () => {
        const tinaKilled = STORY_LINCHPINS.mayor_tina.resolutions.killed;
        expect(tinaKilled).toBeDefined();
        expect(tinaKilled.locksEndings).toEqual(
            expect.arrayContaining([
                ACT2_ENDINGS.ALIEN_EXODUS,
                ACT2_ENDINGS.FULL_BROOD,
                ACT2_ENDINGS.MOTHERSHIP_INFECTION
            ])
        );
        expect(tinaKilled.codexNote).toBe('linchpin_tina_killed');

        const tinaJoined = STORY_LINCHPINS.mayor_tina.resolutions.joined;
        expect(tinaJoined).toBeDefined();
        expect(tinaJoined.locksEndings).toEqual(
            expect.arrayContaining([
                ACT2_ENDINGS.CLEAN_ESCAPE,
                ACT2_ENDINGS.SCORCHED_SKY
            ])
        );
        expect(tinaJoined.codexNote).toBe('linchpin_tina_joined');

        // Mixed Crew is the canonical safety floor and must NEVER be locked
        expect(NEVER_LOCKED_ENDINGS).toContain(ACT2_ENDINGS.MIXED_CREW);
        for (const linchpin of Object.values(STORY_LINCHPINS)) {
            for (const res of Object.values(linchpin.resolutions)) {
                expect(res.locksEndings).not.toContain(ACT2_ENDINGS.MIXED_CREW);
            }
        }
    });

    it('proves linchpin resolutions are strictly write-once and dispatch ending lock events', () => {
        let dispatchedEvent = null;
        const fakeWindow = {
            dispatchEvent: (event) => { dispatchedEvent = event; }
        };
        const originalWindow = globalThis.window;
        globalThis.window = fakeWindow;

        try {
            const manager = {
                state: {
                    linchpins: {}
                },
                save: () => {}
            };

            // First resolution succeeds
            const firstResult = applyLinchpinResolution(manager, 'mayor_tina', 'killed');
            expect(firstResult).toBe(true);
            expect(manager.state.linchpins.mayor_tina).toBe('killed');
            expect(dispatchedEvent).toBeDefined();
            expect(dispatchedEvent.detail.id).toBe('mayor_tina');
            expect(dispatchedEvent.detail.resolution).toBe('killed');
            expect(dispatchedEvent.detail.locksEndings).toEqual(
                expect.arrayContaining([ACT2_ENDINGS.ALIEN_EXODUS])
            );

            // Second resolution attempt on the same linchpin is rejected (write-once invariant)
            dispatchedEvent = null;
            const secondResult = applyLinchpinResolution(manager, 'mayor_tina', 'joined');
            expect(secondResult).toBe(false);
            expect(manager.state.linchpins.mayor_tina).toBe('killed');
            expect(dispatchedEvent).toBeNull();
        } finally {
            globalThis.window = originalWindow;
        }
    });
});
