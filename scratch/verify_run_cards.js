import assert from 'node:assert/strict';
import { BunkerDirector } from '../src/director.js';
import { createRunCardState } from '../src/runModifiers.js';

const alpha = createRunCardState('sprint-19-alpha');
const beta = createRunCardState('sprint-19-beta');

const alphaKeys = alpha.cards.map((card) => card.key);
const betaKeys = beta.cards.map((card) => card.key);

assert(alpha.cards.length >= 2 && alpha.cards.length <= 3, 'alpha draws 2-3 cards');
assert(beta.cards.length >= 2 && beta.cards.length <= 3, 'beta draws 2-3 cards');
assert.notDeepEqual(alphaKeys, betaKeys, 'fixed seeds draw different pressure cards');

assert.equal(alpha.effects.radar.rangeMult, 0.65, 'relay blackout degrades radar range');
assert.equal(alpha.effects.spawnBias.patrolBias, true, 'patrol surge reaches director contract');
assert.equal(beta.effects.economy.tallowMedPayMult, 2, 'spore bloom exposes Tallow med payoff');

const director = new BunkerDirector();
director.setRunCards(alpha);
assert.deepEqual(director.activeCards.map((card) => card.key), alphaKeys, 'director stores active cards');
assert.equal(director.cardEffects.spawnBias.patrolBias, true, 'director exposes merged effects');

console.log(JSON.stringify({
    seeds: {
        alpha: { seed: alpha.seed, cards: alphaKeys },
        beta: { seed: beta.seed, cards: betaKeys }
    },
    observableEffects: {
        alphaRadarRangeMult: alpha.effects.radar.rangeMult,
        alphaPatrolBias: alpha.effects.spawnBias.patrolBias,
        betaTallowMedPayMult: beta.effects.economy.tallowMedPayMult
    }
}, null, 2));
