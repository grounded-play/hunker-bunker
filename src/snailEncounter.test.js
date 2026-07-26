import { describe, it, expect } from 'vitest';
import {
    createEncounter,
    resolveFight,
    resolveTalk,
    resolveFlee,
    SNAIL_ENCOUNTER_CONSTANTS
} from './snailEncounter.js';

describe('createEncounter', () => {
    it('starts at full snail HP, zero resolve, no outcome', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        expect(state).toEqual({
            snailType: 'cybersnail',
            snailHp: 2,
            snailMaxHp: 2,
            resolve: 0,
            resolveMax: SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX,
            outcome: null
        });
    });
});

describe('resolveFight', () => {
    it('damages the snail and counters the player each round', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveFight(state, {
            playerDamage: SNAIL_ENCOUNTER_CONSTANTS.FIGHT_PLAYER_DAMAGE,
            snailDamage: SNAIL_ENCOUNTER_CONSTANTS.SNAIL_COUNTER_DAMAGE
        });
        expect(result.state.snailHp).toBe(1);
        expect(result.state.outcome).toBeNull();
        expect(result.playerDamageTaken).toBe(SNAIL_ENCOUNTER_CONSTANTS.SNAIL_COUNTER_DAMAGE);
        expect(result.snailDamageTaken).toBe(SNAIL_ENCOUNTER_CONSTANTS.FIGHT_PLAYER_DAMAGE);
    });

    it('sets outcome to fight_win when snail HP reaches 0', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 1, snailMaxHp: 2 });
        const result = resolveFight(state, { playerDamage: 1, snailDamage: 1 });
        expect(result.state.snailHp).toBe(0);
        expect(result.state.outcome).toBe('fight_win');
    });

    it('does not deal a counter-hit once the snail is already dead', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 1, snailMaxHp: 2 });
        const result = resolveFight(state, { playerDamage: 5, snailDamage: 1 });
        expect(result.state.snailHp).toBe(0);
        expect(result.playerDamageTaken).toBe(0);
    });

    it('never lets snailHp go negative', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 1, snailMaxHp: 2 });
        const result = resolveFight(state, { playerDamage: 99, snailDamage: 1 });
        expect(result.state.snailHp).toBe(0);
    });
});

describe('resolveTalk', () => {
    const neverBackfires = () => 0.99; // above both backfire chances (0.4 max)

    it('gains more resolve while infected than while cured', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const infected = resolveTalk(state, { infectionStage: 'latent', rollFn: neverBackfires });
        const human = resolveTalk(state, { infectionStage: 'cured', rollFn: neverBackfires });
        expect(infected.resolveGained).toBe(SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_ALIEN);
        expect(human.resolveGained).toBe(SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_HUMAN);
        expect(infected.resolveGained).toBeGreaterThan(human.resolveGained);
    });

    it('backfires reliably for a human roll below the human backfire chance', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveTalk(state, { infectionStage: 'cured', rollFn: () => 0.01 });
        expect(result.backfired).toBe(true);
        expect(result.resolveGained).toBe(0);
        expect(result.state.resolve).toBe(0);
    });

    it('rarely backfires for an infected roll below the alien backfire chance', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveTalk(state, { infectionStage: 'strained', rollFn: () => 0.01 });
        expect(result.backfired).toBe(true);
        expect(result.resolveGained).toBe(0);
    });

    it('does not backfire for a roll above both backfire chances', () => {
        const state = createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveTalk(state, { infectionStage: 'cured', rollFn: () => 0.99 });
        expect(result.backfired).toBe(false);
        expect(result.resolveGained).toBe(SNAIL_ENCOUNTER_CONSTANTS.TALK_GAIN_HUMAN);
    });

    it('sets outcome to befriend once resolve reaches resolveMax, regardless of snailHp', () => {
        const state = { ...createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 }), resolve: 90 };
        const result = resolveTalk(state, { infectionStage: 'latent', rollFn: neverBackfires });
        expect(result.state.resolve).toBe(SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX);
        expect(result.state.outcome).toBe('befriend');
    });

    it('never exceeds resolveMax', () => {
        const state = { ...createEncounter({ snailType: 'cybersnail', snailHp: 2, snailMaxHp: 2 }), resolve: 99 };
        const result = resolveTalk(state, { infectionStage: 'latent', rollFn: neverBackfires });
        expect(result.state.resolve).toBe(SNAIL_ENCOUNTER_CONSTANTS.RESOLVE_MAX);
    });
});

describe('resolveFlee', () => {
    it('sets outcome to fled and changes nothing else', () => {
        const state = createEncounter({ snailType: 'cryosnail', snailHp: 2, snailMaxHp: 2 });
        const result = resolveFlee(state);
        expect(result.state.outcome).toBe('fled');
        expect(result.state.snailHp).toBe(2);
        expect(result.state.resolve).toBe(0);
    });
});
