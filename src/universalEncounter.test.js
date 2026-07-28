import { describe, it, expect } from 'vitest';
import {
    createUniversalEncounter,
    resolveEncounterAction,
    getEntityCategory,
    ENCOUNTER_CATEGORIES
} from './universalEncounter.js';

describe('universalEncounter', () => {
    it('categorizes enemy and NPC types correctly', () => {
        expect(getEntityCategory('cybersnail')).toBe(ENCOUNTER_CATEGORIES.SNAIL);
        expect(getEntityCategory('sentinel')).toBe(ENCOUNTER_CATEGORIES.MECHANICAL);
        expect(getEntityCategory('alien_proto_crawler')).toBe(ENCOUNTER_CATEGORIES.BIOLOGICAL);
        expect(getEntityCategory('camp_meridian')).toBe(ENCOUNTER_CATEGORIES.CAMP_NPC);
        expect(getEntityCategory('hive_suture')).toBe(ENCOUNTER_CATEGORIES.HIVE_LEADER);
    });

    it('creates encounter state with appropriate action labels', () => {
        const crawlerEnc = createUniversalEncounter({ entityType: 'alien_proto_crawler' });
        expect(crawlerEnc.actionLabels.talk).toBe('PACIFY');

        const droneEnc = createUniversalEncounter({ entityType: 'sentinel' });
        expect(droneEnc.actionLabels.talk).toBe('HACK');

        const npcEnc = createUniversalEncounter({ entityType: 'camp_meridian', isNpc: true });
        expect(npcEnc.actionLabels.talk).toBe('TALK');
    });

    it('resolves fight action cleanly', () => {
        const enc = createUniversalEncounter({ entityType: 'alien_proto_crawler', entityHp: 5, maxHp: 5 });
        const result = resolveEncounterAction(enc, 'fight', { playerDamage: 2, counterDamage: 1 });
        expect(result.state.hp).toBe(3);
        expect(result.playerDamageTaken).toBe(1);
    });

    it('resolves pacify/talk action to completion', () => {
        const enc = createUniversalEncounter({ entityType: 'alien_proto_crawler' });
        const result1 = resolveEncounterAction(enc, 'talk', { infectionStage: 'infected', rollFn: () => 0.9 });
        expect(result1.resolveGained).toBe(35);
        expect(result1.state.resolve).toBe(35);

        const result2 = resolveEncounterAction(result1.state, 'talk', { infectionStage: 'infected', rollFn: () => 0.9 });
        const result3 = resolveEncounterAction(result2.state, 'talk', { infectionStage: 'infected', rollFn: () => 0.9 });
        expect(result3.state.outcome).toBe('pacified');
    });

    it('handles flee/leave action', () => {
        const enc = createUniversalEncounter({ entityType: 'camp_meridian', isNpc: true });
        const result = resolveEncounterAction(enc, 'flee');
        expect(result.state.outcome).toBe('fled');
    });
});
