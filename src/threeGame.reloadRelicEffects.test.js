import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { SUIT_RELICS } from './runDrops.js';

// docs/design/one-more-ring-design-pillars.md item 2 (Sprint 28): Scrap
// Cycler and Vesper Doctrine, the last two of the 7 previously-inert
// transformative relics/overclocks wired to real gameplay hooks. Same
// Function.prototype.call() pattern as the rest of this file's *.test.js
// suite (no live WebGL context here).
describe('ThreeGame reload relic effects', () => {
    function buildFakeGameInstance({ runRelics = [], runOverclocks = [], spendShellsResult = true } = {}) {
        return {
            player: { position: { x: 5, z: 5 } },
            runRelics,
            runOverclocks,
            bank: { spendShells: vi.fn(() => spendShellsResult) },
            scatterSprites: [],
            spawnPhysicalBurst: vi.fn(),
            damageSnail: vi.fn(),
            // The triggerReloadRelicEffects tests below verify it calls the
            // real applyRadialEnemyDamage with the right args -- bound to
            // this same fake so it still runs the real distance-check logic
            // (already covered directly by the describe block above) against
            // this fake's own scatterSprites/damageSnail, not a re-mock.
            applyRadialEnemyDamage: ThreeGame.prototype.applyRadialEnemyDamage
        };
    }

    describe('applyRadialEnemyDamage', () => {
        it('damages only enemies within radius, leaving farther ones untouched', () => {
            const inRange = { position: { x: 6, z: 5 }, userData: { hp: 10 } };
            const outOfRange = { position: { x: 20, z: 5 }, userData: { hp: 10 } };
            const fake = buildFakeGameInstance();
            fake.scatterSprites = [inRange, outOfRange];

            ThreeGame.prototype.applyRadialEnemyDamage.call(fake, 5, 5, 3, 15);

            expect(fake.damageSnail).toHaveBeenCalledTimes(1);
            expect(fake.damageSnail).toHaveBeenCalledWith(inRange, 15);
        });

        it('skips already-dead sprites', () => {
            const dead = { position: { x: 5, z: 5 }, userData: { hp: 0 } };
            const fake = buildFakeGameInstance();
            fake.scatterSprites = [dead];

            ThreeGame.prototype.applyRadialEnemyDamage.call(fake, 5, 5, 3, 15);

            expect(fake.damageSnail).not.toHaveBeenCalled();
        });

        it('does nothing for a non-positive radius or damage (defensive)', () => {
            const enemy = { position: { x: 5, z: 5 }, userData: { hp: 10 } };
            const fake = buildFakeGameInstance();
            fake.scatterSprites = [enemy];

            ThreeGame.prototype.applyRadialEnemyDamage.call(fake, 5, 5, 0, 15);
            ThreeGame.prototype.applyRadialEnemyDamage.call(fake, 5, 5, 3, 0);

            expect(fake.damageSnail).not.toHaveBeenCalled();
        });
    });

    describe('triggerReloadRelicEffects', () => {
        it('Scrap Cycler: spends salvage and blasts nearby enemies when equipped and affordable', () => {
            const relic = SUIT_RELICS.find((r) => r.id === 'scrap_cycler');
            const enemy = { position: { x: 5, z: 5 }, userData: { hp: 10 } };
            const fake = buildFakeGameInstance({ runRelics: [relic] });
            fake.scatterSprites = [enemy];

            ThreeGame.prototype.triggerReloadRelicEffects.call(fake, false);

            expect(fake.bank.spendShells).toHaveBeenCalledWith(3);
            expect(fake.damageSnail).toHaveBeenCalledWith(enemy, 15);
            expect(fake.spawnPhysicalBurst).toHaveBeenCalledTimes(1);
        });

        it('Scrap Cycler: no blast when the player can\'t afford the salvage cost', () => {
            const relic = SUIT_RELICS.find((r) => r.id === 'scrap_cycler');
            const fake = buildFakeGameInstance({ runRelics: [relic], spendShellsResult: false });

            ThreeGame.prototype.triggerReloadRelicEffects.call(fake, false);

            expect(fake.bank.spendShells).toHaveBeenCalledWith(3);
            expect(fake.damageSnail).not.toHaveBeenCalled();
        });

        it('Vesper Doctrine: explodes only on an empty reload, never a partial one', () => {
            const overclock = SUIT_RELICS.find((r) => r.id === 'vesper_doctrine');
            const enemy = { position: { x: 5, z: 5 }, userData: { hp: 10 } };
            const fake = buildFakeGameInstance({ runOverclocks: [overclock] });
            fake.scatterSprites = [enemy];

            ThreeGame.prototype.triggerReloadRelicEffects.call(fake, false);
            expect(fake.damageSnail).not.toHaveBeenCalled();

            ThreeGame.prototype.triggerReloadRelicEffects.call(fake, true);
            expect(fake.damageSnail).toHaveBeenCalledWith(enemy, 20);
        });

        it('does nothing when neither relic is equipped', () => {
            const fake = buildFakeGameInstance();

            expect(() => ThreeGame.prototype.triggerReloadRelicEffects.call(fake, true)).not.toThrow();
            expect(fake.bank.spendShells).not.toHaveBeenCalled();
            expect(fake.damageSnail).not.toHaveBeenCalled();
        });
    });
});
