import { describe, expect, it } from 'vitest';
import {
    BUILD_LINE_KEYS,
    DEATH_CAUSE_KEYS,
    ENEMY_NAME_KEYS,
    FIELD_LINE_KEYS,
    NEXT_ACTION_KEYS,
    chooseNextAction,
    describeDeathCause,
    describeFieldLoss,
    salvageParts,
    summarizeBuild
} from './deathReport.js';
import en from './locales/en.json';

const lookup = (key) => key.split('.').reduce((node, part) => node?.[part], en);

describe('the cause of death', () => {
    it('names the hostile when an enemy landed the last hit', () => {
        expect(describeDeathCause('boss_cybersnail')).toEqual({ key: DEATH_CAUSE_KEYS.enemy, params: { enemyKey: 'ui.death.enemy.boss_cybersnail' } });
        expect(describeDeathCause('mycelium_stalker').params.enemyKey).toBe('ui.death.enemy.mycelium_stalker');
    });

    it('explains environmental deaths by what the player can act on', () => {
        expect(describeDeathCause('o2-depletion').key).toBe(DEATH_CAUSE_KEYS.o2);
        expect(describeDeathCause('pit-fall').key).toBe(DEATH_CAUSE_KEYS.fall);
        expect(describeDeathCause('fall').key).toBe(DEATH_CAUSE_KEYS.fall);
        expect(describeDeathCause('poison').key).toBe(DEATH_CAUSE_KEYS.hazard);
        expect(describeDeathCause('frost-shockwave').key).toBe(DEATH_CAUSE_KEYS.boss_attack);
        expect(describeDeathCause('enemy-projectile').key).toBe(DEATH_CAUSE_KEYS.projectile);
    });

    it('says it does not know rather than guessing', () => {
        expect(describeDeathCause('abyss')).toEqual({ key: DEATH_CAUSE_KEYS.unknown });
        expect(describeDeathCause(undefined)).toEqual({ key: DEATH_CAUSE_KEYS.unknown });
    });
});

describe('the build line', () => {
    it('leads with the synergy that fired most', () => {
        expect(summarizeBuild({
            equippedDropIds: ['cryo_rime', 'shatter_engine'],
            telemetry: { cryo_shatter: { activations: 3, damage: 150.4 }, bio_predator: { activations: 1, o2: 8, hearts: 1 } }
        })).toEqual({ key: BUILD_LINE_KEYS.cryo_shatter, params: { count: 3, damage: 150 } });
        expect(summarizeBuild({ telemetry: { bio_predator: { activations: 2, o2: 16, hearts: 1 } } }))
            .toEqual({ key: BUILD_LINE_KEYS.bio_predator, params: { count: 2, o2: 16, hearts: 1 } });
    });

    it('lists what was equipped when nothing fired, and says when there was nothing', () => {
        expect(summarizeBuild({ equippedDropIds: ['cryo_rime', 'cryo_rime'], telemetry: { cryo_shatter: { activations: 0 } } }))
            .toEqual({ key: BUILD_LINE_KEYS.equipped, params: { dropKeys: ['ui.relics.cryo_rime.name'], dropIds: ['cryo_rime'] } });
        expect(summarizeBuild()).toEqual({ key: BUILD_LINE_KEYS.none });
    });
});

describe('what was left in the field', () => {
    it('lists the black box salvage and its distance from the ship', () => {
        const loss = describeFieldLoss({ x: 39, z: 51, salvage: { tech: 3, coin: 0, med: 2 } }, { x: 9, z: 11 });
        expect(loss).toEqual({ key: FIELD_LINE_KEYS.black_box, params: { meters: 50 }, parts: [{ resource: 'tech', amount: 3 }, { resource: 'med', amount: 2 }] });
        expect(describeFieldLoss({ x: 1, z: 1, salvage: {} }, { x: 0, z: 0 })).toEqual({ key: FIELD_LINE_KEYS.black_box_empty });
        expect(describeFieldLoss(null)).toBeNull();
        expect(salvageParts({ tech: -1, coin: 'x', med: 1.7 })).toEqual([{ resource: 'med', amount: 1 }]);
    });
});

describe('the next action', () => {
    const loss = describeFieldLoss({ x: 29, z: 11, salvage: { tech: 1 } }, { x: 9, z: 11 });
    it('recovering salvage comes first, then an affordable goal, then a lead, else redeploy', () => {
        expect(chooseNextAction({ fieldLoss: loss, nextGoalAffordable: true, goalNameKey: 'g' })).toEqual({ key: NEXT_ACTION_KEYS.recover, params: { meters: 20 } });
        expect(chooseNextAction({ nextGoalAffordable: true, goalNameKey: 'g', leadLabelKey: 'l' })).toEqual({ key: NEXT_ACTION_KEYS.build, params: { goalKey: 'g' } });
        expect(chooseNextAction({ nextGoalAffordable: false, goalNameKey: 'g', leadLabelKey: 'l' })).toEqual({ key: NEXT_ACTION_KEYS.lead, params: { labelKey: 'l' } });
        expect(chooseNextAction({ fieldLoss: describeFieldLoss({ x: 0, z: 0, salvage: {} }, { x: 0, z: 0 }) })).toEqual({ key: NEXT_ACTION_KEYS.redeploy });
    });
});

describe('text', () => {
    it('every key the module can emit exists in English', () => {
        const keys = [
            ...Object.values(ENEMY_NAME_KEYS), ...Object.values(DEATH_CAUSE_KEYS), ...Object.values(BUILD_LINE_KEYS),
            ...Object.values(FIELD_LINE_KEYS), ...Object.values(NEXT_ACTION_KEYS)
        ];
        for (const key of keys) expect(typeof lookup(key), key).toBe('string');
    });
});
