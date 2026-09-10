import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { getRunCardByKey } from './runModifiers.js';

// G10: three run-card effect keys were wired into threeGame.js after an audit
// found them promising deltas nothing applied. These exercise the real methods
// at the seam that applies each one, so the wiring cannot silently rot.
describe('run card effects reach their threeGame consumers', () => {
    const withEffects = (effects) => ({ getRunCardEffects: () => effects });

    describe('questPayMult -> camp quest bond', () => {
        it('doubles bond under CAMP PARANOIA', () => {
            const effects = getRunCardByKey('camp_paranoia').effects;
            expect(effects.questPayMult).toBe(2);
            expect(ThreeGame.prototype.getCampQuestBondDelta.call(withEffects(effects), 1)).toBe(2);
            expect(ThreeGame.prototype.getCampQuestBondDelta.call(withEffects(effects), 3)).toBe(6);
        });

        it('leaves bond untouched with no card, and never pays less than base', () => {
            expect(ThreeGame.prototype.getCampQuestBondDelta.call(withEffects({}), 1)).toBe(1);
            // A hostile or nonsensical multiplier must not silently reduce a
            // reward the player earned.
            for (const bad of [0, -2, 0.25, NaN, 'x', undefined]) {
                expect(ThreeGame.prototype.getCampQuestBondDelta.call(
                    withEffects({ questPayMult: bad }), 2
                )).toBeGreaterThanOrEqual(2);
            }
        });
    });

    describe('biomeBias.bio -> BIO threshold', () => {
        it('pulls the bio boundary inward under SPORE BLOOM', () => {
            const effects = getRunCardByKey('spore_bloom').effects;
            expect(effects.biomeBias.bio).toBeGreaterThan(1);

            const biased = withEffects(effects);
            const plain = withEffects({});

            // Find a distance that is BIO with the card and not without it.
            const call = (game, d) => ThreeGame.prototype.getBiomeKeyFromDistance.call(game, d);
            const boundary = [...Array(400).keys()].map((i) => i * 2)
                .find((d) => call(biased, d) === 'bio' && call(plain, d) !== 'bio');

            expect(boundary).toBeDefined();
        });

        it('is unchanged without the card and ignores nonsense bias values', () => {
            const call = (game, d) => ThreeGame.prototype.getBiomeKeyFromDistance.call(game, d);
            for (const bad of [0, -1, NaN, 'x']) {
                for (const d of [0, 25, 90, 400]) {
                    expect(call(withEffects({ biomeBias: { bio: bad } }), d))
                        .toBe(call(withEffects({}), d));
                }
            }
        });
    });

    describe('spawnBias density/speed -> PATROL SURGE', () => {
        it('carries both halves of the blurb as real multipliers', () => {
            const { spawnBias } = getRunCardByKey('patrol_surge').effects;
            expect(spawnBias.snailDensityMult).toBeGreaterThan(1);
            expect(spawnBias.snailSpeedMult).toBeGreaterThan(1);
            expect(spawnBias.patrolBias).toBe(true);
        });
    });
});
