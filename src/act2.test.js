import { describe, it, expect } from 'vitest';
import {
    Act2Manager,
    ACT2_CAMP_STATUSES,
    ACT2_CAMP_IDS,
    ACT2_CAMP_LABELS,
    ACT2_CAMP_MAX_LEVEL,
    ACT2_CAMP_SUPPORT_COSTS,
    ACT2_ENDINGS,
    ACT2_HIVE_SITES,
    ACT2_LINES,
    ACT2_MAX_BOND,
    ACT2_MAX_OBEDIENCE,
    ACT2_RECRUIT_BOND_THRESHOLD,
    ACT2_HIVE_RESCUE_BOND_THRESHOLD,
    buildAct2Manifest,
    campSupportCost,
    deriveAct2Phase,
    normalizeAct2State,
    pickAct2Ending,
    getBoardingCampId,
    getCampClassMapping,
    getClassCampOrder
} from './act2.js';

function memoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
}

describe('deriveAct2Phase', () => {
    it('is dormant until begun', () => {
        expect(deriveAct2Phase({})).toBe('dormant');
        expect(deriveAct2Phase({ uplinkSilenced: true })).toBe('dormant');
    });

    it('walks the ladder in order and unlocks launch once the vessel is complete', () => {
        const s = { begun: true };
        expect(deriveAct2Phase(s)).toBe('gestation');
        s.uplinkSilenced = true;
        expect(deriveAct2Phase(s)).toBe('dish');
        s.dishBuilt = true;
        expect(deriveAct2Phase(s)).toBe('camps_help');
        s.camps = ACT2_CAMP_IDS.map((id) => ({ id, aided: true }));
        expect(deriveAct2Phase(s)).toBe('launch_ready');
        s.departed = true;
        expect(deriveAct2Phase(s)).toBe('departed');
    });

    it('stays in camps_help until every camp is aided', () => {
        const s = {
            begun: true,
            uplinkSilenced: true,
            dishBuilt: true,
            camps: ACT2_CAMP_IDS.map((id, i) => ({ id, aided: i < 2 }))
        };
        expect(deriveAct2Phase(s)).toBe('camps_help');
    });
});

describe('Act2Manager', () => {
    it('round-trips through storage and fires phase transitions', () => {
        const storage = memoryStorage();
        const transitions = [];
        const m = new Act2Manager({ storage, onTransition: (from, to) => transitions.push(`${from}->${to}`) });
        expect(m.getPhase()).toBe('dormant');

        m.begin();
        m.silenceUplink();
        m.buildDish();
        for (const id of ACT2_CAMP_IDS) m.setCampPosition(id, 10, 20);
        for (const id of ACT2_CAMP_IDS) m.aidCamp(id);
        for (const id of ACT2_CAMP_IDS) m.cullCamp(id);
        m.depart();

        expect(transitions).toEqual([
            'dormant->gestation',
            'gestation->dish',
            'dish->camps_help',
            'camps_help->launch_ready',
            'launch_ready->departed'
        ]);

        // A fresh manager over the same storage restores everything.
        const m2 = new Act2Manager({ storage });
        expect(m2.getPhase()).toBe('departed');
        expect(m2.getState().camps.every((c) => c.x === 10 && c.z === 20)).toBe(true);
    });

    it('cannot cull a camp that was never aided', () => {
        const m = new Act2Manager({ storage: memoryStorage() });
        m.begin();
        m.silenceUplink();
        m.buildDish();
        m.cullCamp(ACT2_CAMP_IDS[0]);
        expect(m.getState().camps[0].status).toBe('alive');
    });

    it('normalizes corrupt saves to a safe default', () => {
        const storage = memoryStorage();
        storage.setItem('hb_act2_v1', '{not json');
        const m = new Act2Manager({ storage });
        expect(m.getPhase()).toBe('dormant');
        expect(normalizeAct2State(null).camps).toHaveLength(3);
    });

    it('has labels and lines for every beat', () => {
        for (const id of ACT2_CAMP_IDS) expect(ACT2_CAMP_LABELS[id]).toBeTruthy();
        for (const key of ['intro', 'uplinkSilenced', 'dishBuilt', 'allAided', 'campRobbed', 'campRecruited', 'campTurned']) {
            expect(ACT2_LINES[key]?.length).toBeGreaterThan(0);
        }
    });
});

describe('Act 2 story schema', () => {
    it('normalizes v1 camp booleans into status fields', () => {
        const state = normalizeAct2State({
            camps: [
                { id: 'camp_meridian', destroyed: true, level: 2 },
                { id: 'camp_tallow', robbed: true, bond: 99 },
                { id: 'camp_vesper', turned: true, bond: -4 }
            ]
        });
        expect(state.version).toBe(3);
        expect(state.camps.map((c) => c.status)).toEqual(['culled', 'robbed', 'turned']);
        expect(state.camps[0].destroyed).toBe(true);
        expect(state.camps[0].passengerState).toBe('dead');
        expect(state.camps[2].passengerState).toBe('turned');
        expect(state.camps[1].bond).toBe(ACT2_MAX_BOND);
        expect(state.camps[2].bond).toBe(0);
        expect(state.queenObedience).toBe(1);
        expect(state.humanity).toBe(100);
        expect(state.coverIntegrity).toBe(100);
        expect(state.suspicion).toEqual({
            camp_meridian: 0,
            camp_tallow: 0,
            camp_vesper: 0
        });
        expect(state.hives.map((h) => h.id)).toEqual(ACT2_HIVE_SITES.map((h) => h.id));
        expect(state.manifest).toMatchObject({ player: 'infected', seatsMax: 4 });
    });

    it('keeps old all-cull saves on the full brood vector', () => {
        const state = normalizeAct2State({
            begun: true,
            uplinkSilenced: true,
            dishBuilt: true,
            camps: ACT2_CAMP_IDS.map((id) => ({ id, aided: true, destroyed: true }))
        });
        expect(state.queenObedience).toBe(ACT2_MAX_OBEDIENCE);
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.FULL_BROOD);
    });

    it('rejects unknown statuses safely', () => {
        const state = normalizeAct2State({ camps: [{ id: 'camp_meridian', status: 'space_whale' }] });
        expect(ACT2_CAMP_STATUSES).toContain(state.camps[0].status);
        expect(state.camps[0].status).toBe('alive');
    });

    it('normalizes infection, network, hive, and manifest fields', () => {
        const state = normalizeAct2State({
            humanity: 44,
            infectionLoad: 12,
            coverIntegrity: 999,
            suspicion: { camp_meridian: 120 },
            networks: {
                humanRelayOnline: true,
                knownByCamps: ['camp_meridian', 'fake_camp'],
                knownByHives: ['hive_suture', 'fake_hive']
            },
            hives: [{ id: 'hive_suture', status: 'aboard', bond: 99, extractionLevel: 2 }]
        });

        expect(state.infectionStage).toBe('symptomatic');
        expect(state.coverIntegrity).toBe(100);
        expect(state.suspicion.camp_meridian).toBe(100);
        expect(state.networks.knownByCamps).toEqual(['camp_meridian']);
        expect(state.networks.knownByHives).toEqual(['hive_suture']);
        expect(state.hives.find((h) => h.id === 'hive_suture')).toMatchObject({
            status: 'aboard',
            aboard: true,
            bond: ACT2_MAX_BOND,
            extractionLevel: 2
        });
    });
});

describe('Act 2 choice reducers', () => {
    function readyManager() {
        const manager = new Act2Manager({ storage: memoryStorage() });
        manager.begin();
        manager.silenceUplink();
        manager.buildDish();
        for (const id of ACT2_CAMP_IDS) manager.aidCamp(id);
        return manager;
    }

    it('steals a camp without killing it', () => {
        const manager = readyManager();
        manager.stealCamp('camp_meridian');
        const camp = manager.getState().camps.find((c) => c.id === 'camp_meridian');
        expect(camp.status).toBe('robbed');
        expect(camp.destroyed).toBe(false);
    });

    it('culls a camp and increments queen obedience', () => {
        const manager = readyManager();
        manager.cullCamp('camp_meridian');
        const state = manager.getState();
        expect(state.camps.find((c) => c.id === 'camp_meridian').status).toBe('culled');
        expect(state.queenObedience).toBe(1);
    });

    it('requires bond before recruiting or turning', () => {
        const manager = readyManager();
        manager.recruitCamp('camp_meridian', { mode: 'human' });
        expect(manager.getState().camps.find((c) => c.id === 'camp_meridian').status).toBe('alive');

        manager.adjustCampBond('camp_meridian', ACT2_RECRUIT_BOND_THRESHOLD);
        manager.recruitCamp('camp_meridian', { mode: 'human' });
        expect(manager.getState().camps.find((c) => c.id === 'camp_meridian').status).toBe('recruited');

        manager.adjustCampBond('camp_tallow', ACT2_RECRUIT_BOND_THRESHOLD);
        manager.recruitCamp('camp_tallow', { mode: 'turned' });
        const state = manager.getState();
        expect(state.camps.find((c) => c.id === 'camp_tallow').status).toBe('turned');
        expect(state.queenObedience).toBe(0); // -1 for human recruit, +1 for turned
    });

    it('records each quest once', () => {
        const manager = readyManager();
        manager.completeCampQuest('camp_meridian', 'lost_probe', 2);
        manager.completeCampQuest('camp_meridian', 'lost_probe', 2);
        const camp = manager.getState().camps.find((c) => c.id === 'camp_meridian');
        expect(camp.bond).toBe(2);
        expect(camp.questFlags.lost_probe).toBe('done');
    });

    it('adjusts humanity and suspicion as first-pass Act 2 overlays', () => {
        const manager = readyManager();
        manager.adjustHumanity(-30);
        manager.adjustCampSuspicion('camp_meridian', 85);
        const state = manager.getState();
        expect(state.humanity).toBe(70);
        expect(state.infectionStage).toBe('strained');
        expect(state.suspicion.camp_meridian).toBe(85);
        expect(state.camps.find((c) => c.id === 'camp_meridian').knowsPlayerInfected).toBe(true);
    });
});

describe('Act 2 ending picker', () => {
    const camps = (status, extra = {}) => ACT2_CAMP_IDS.map((id) => ({ id, aided: true, status, ...extra }));

    it('picks full brood', () => {
        expect(pickAct2Ending({
            queenObedience: ACT2_MAX_OBEDIENCE,
            queenStatus: 'aboard',
            eggsStatus: 'aboard',
            camps: camps('culled')
        })).toBe(ACT2_ENDINGS.FULL_BROOD);
    });

    it('picks clean escape', () => {
        expect(pickAct2Ending({
            queenStatus: 'killed',
            eggsStatus: 'destroyed',
            camps: camps('recruited')
        })).toBe(ACT2_ENDINGS.CLEAN_ESCAPE);
    });

    it('picks mixed crew', () => {
        expect(pickAct2Ending({
            queenStatus: 'aboard',
            eggsStatus: 'aboard',
            camps: [
                { id: 'camp_meridian', aided: true, status: 'recruited' },
                { id: 'camp_tallow', aided: true, status: 'turned' },
                { id: 'camp_vesper', aided: true, status: 'robbed' }
            ]
        })).toBe(ACT2_ENDINGS.MIXED_CREW);
    });

    it('picks carriers bargain', () => {
        expect(pickAct2Ending({
            queenStatus: 'killed',
            eggsStatus: 'aboard',
            camps: camps('recruited')
        })).toBe(ACT2_ENDINGS.CARRIERS_BARGAIN);
    });

    it('picks scorched sky', () => {
        expect(pickAct2Ending({
            queenStatus: 'killed',
            eggsStatus: 'destroyed',
            camps: camps('culled')
        })).toBe(ACT2_ENDINGS.SCORCHED_SKY);
    });

    it('treats hidden eggs as aboard and abandoned eggs as gone', () => {
        expect(pickAct2Ending({
            queenStatus: 'killed',
            eggsStatus: 'hidden',
            camps: camps('recruited'),
            hives: [{ id: 'hive_suture', status: 'aboard' }]
        })).toBe(ACT2_ENDINGS.CARRIERS_BARGAIN);

        expect(pickAct2Ending({
            queenStatus: 'abandoned',
            eggsStatus: 'abandoned',
            camps: camps('culled')
        })).toBe(ACT2_ENDINGS.SCORCHED_SKY);
    });
});

describe('Act 2 boarding manifest', () => {
    it('computes seat usage for queen, eggs, humans, and alien allies', () => {
        const manifest = buildAct2Manifest({
            queenStatus: 'aboard',
            eggsStatus: 'aboard',
            camps: ACT2_CAMP_IDS.map((id) => ({ id, status: 'culled' })),
            hives: []
        });
        expect(manifest).toMatchObject({
            player: 'infected',
            queen: true,
            egg: true,
            seatsUsed: 4,
            valid: true
        });
    });

    it('flags unstable eggs without the queen or Suture aboard', () => {
        const manifest = buildAct2Manifest({
            queenStatus: 'killed',
            eggsStatus: 'hidden',
            camps: [{ id: 'camp_meridian', status: 'recruited' }]
        });
        expect(manifest.valid).toBe(false);
        expect(manifest.invalidReasons).toContain('egg_unstable');
    });
});

describe('camp support levels', () => {
    it('normalizes levels into 0..max and defaults to 0', () => {
        const state = normalizeAct2State({
            camps: [
                { id: 'camp_meridian', level: 99 },
                { id: 'camp_tallow', level: -4 },
                { id: 'camp_vesper', level: 2.9 }
            ]
        });
        expect(state.camps.map((c) => c.level)).toEqual([ACT2_CAMP_MAX_LEVEL, 0, 2]);
        expect(normalizeAct2State({}).camps.every((c) => c.level === 0)).toBe(true);
    });

    it('upgradeCamp is monotonic, capped, and persists', () => {
        const storage = memoryStorage();
        const manager = new Act2Manager({ storage });
        for (let i = 0; i < ACT2_CAMP_MAX_LEVEL + 2; i += 1) {
            manager.upgradeCamp('camp_meridian');
        }
        expect(manager.getState().camps[0].level).toBe(ACT2_CAMP_MAX_LEVEL);

        const reloaded = new Act2Manager({ storage });
        expect(reloaded.getState().camps[0].level).toBe(ACT2_CAMP_MAX_LEVEL);
    });

    it('refuses to upgrade a destroyed camp and prices each level', () => {
        const storage = memoryStorage();
        const manager = new Act2Manager({ storage });
        manager.begin();
        manager.silenceUplink();
        manager.buildDish();
        for (const id of manager.getState().camps.map((c) => c.id)) manager.aidCamp(id);
        manager.destroyCamp('camp_tallow');
        manager.upgradeCamp('camp_tallow');
        expect(manager.getState().camps.find((c) => c.id === 'camp_tallow').level).toBe(0);

        expect(campSupportCost(0)).toBe(ACT2_CAMP_SUPPORT_COSTS[0]);
        expect(campSupportCost(ACT2_CAMP_MAX_LEVEL - 1)).toBe(ACT2_CAMP_SUPPORT_COSTS[ACT2_CAMP_MAX_LEVEL - 1]);
        expect(campSupportCost(99)).toBe(ACT2_CAMP_SUPPORT_COSTS[ACT2_CAMP_MAX_LEVEL - 1]);
    });
});

describe('getCampClassMapping', () => {
    it('returns the correct RPS mapping for a Scout player', () => {
        const mapping = getCampClassMapping('Scout');
        expect(getClassCampOrder('Scout').map((c) => c.classId)).toEqual(['TANK', 'ENGINEER', 'SCOUT']);
        expect(mapping.camp_meridian).toMatchObject({ class: 'Tank', leader: 'Commander Briggs', isBoss: false, order: 1 });
        expect(mapping.camp_tallow).toMatchObject({ class: 'Engineer', leader: 'Overseer Kaelen', isBoss: false, order: 2 });
        expect(mapping.camp_vesper).toMatchObject({ class: 'Scout', leader: 'Sister Martha', isBoss: true, order: 3 });
        expect(getBoardingCampId('Scout')).toBe('camp_vesper');
    });

    it('returns the correct RPS mapping for a Tank player', () => {
        const mapping = getCampClassMapping('Tank');
        expect(getClassCampOrder('Tank').map((c) => c.classId)).toEqual(['ENGINEER', 'SCOUT', 'TANK']);
        expect(mapping.camp_meridian).toMatchObject({ class: 'Engineer', leader: 'Overseer Kaelen', isBoss: false, order: 1 });
        expect(mapping.camp_tallow).toMatchObject({ class: 'Scout', leader: 'Sister Martha', isBoss: false, order: 2 });
        expect(mapping.camp_vesper).toMatchObject({ class: 'Tank', leader: 'Commander Briggs', isBoss: true, order: 3 });
        expect(getBoardingCampId('Tank')).toBe('camp_vesper');
    });

    it('returns the correct RPS mapping for an Engineer player', () => {
        const mapping = getCampClassMapping('Engineer');
        expect(getClassCampOrder('Engineer').map((c) => c.classId)).toEqual(['SCOUT', 'TANK', 'ENGINEER']);
        expect(mapping.camp_meridian).toMatchObject({ class: 'Scout', leader: 'Sister Martha', isBoss: false, order: 1 });
        expect(mapping.camp_tallow).toMatchObject({ class: 'Tank', leader: 'Commander Briggs', isBoss: false, order: 2 });
        expect(mapping.camp_vesper).toMatchObject({ class: 'Engineer', leader: 'Overseer Kaelen', isBoss: true, order: 3 });
        expect(getBoardingCampId('Engineer')).toBe('camp_vesper');
    });

    it('defaults to Engineer mapping for unknown classes', () => {
        const mapping = getCampClassMapping('SpaceWhale');
        expect(getClassCampOrder('SpaceWhale').map((c) => c.classId)).toEqual(['SCOUT', 'TANK', 'ENGINEER']);
        expect(mapping.camp_meridian).toMatchObject({ class: 'Scout', leader: 'Sister Martha', isBoss: false, order: 1 });
        expect(mapping.camp_tallow).toMatchObject({ class: 'Tank', leader: 'Commander Briggs', isBoss: false, order: 2 });
        expect(mapping.camp_vesper).toMatchObject({ class: 'Engineer', leader: 'Overseer Kaelen', isBoss: true, order: 3 });
        expect(getBoardingCampId('SpaceWhale')).toBe('camp_vesper');
    });
});

describe('hive reducers', () => {
    const boot = () => new Act2Manager({ storage: memoryStorage() });

    it('mining raises extraction, costs bond, and wounds at level 3', () => {
        const m = boot();
        m.adjustHiveBond('hive_suture', 2);
        m.mineHive('hive_suture');
        let hive = m.getState().hives.find((h) => h.id === 'hive_suture');
        expect(hive.extractionLevel).toBe(1);
        expect(hive.bond).toBe(1);
        expect(hive.status).toBe('mined');
        m.mineHive('hive_suture');
        m.mineHive('hive_suture');
        m.mineHive('hive_suture'); // capped
        hive = m.getState().hives.find((h) => h.id === 'hive_suture');
        expect(hive.extractionLevel).toBe(3);
        expect(hive.status).toBe('wounded');
    });

    it('bond threshold marks the hive bonded and rescue takes it aboard', () => {
        const m = boot();
        m.adjustHiveBond('hive_relay', ACT2_HIVE_RESCUE_BOND_THRESHOLD);
        expect(m.getState().hives.find((h) => h.id === 'hive_relay').status).toBe('bonded');
        const obedienceBefore = m.getState().queenObedience;
        m.rescueHive('hive_relay');
        const state = m.getState();
        const hive = state.hives.find((h) => h.id === 'hive_relay');
        expect(hive.status).toBe('rescued');
        expect(hive.aboard).toBe(true);
        expect(state.queenObedience).toBe(obedienceBefore - 1);
        expect(state.manifest.aliens).toContain('hive_relay');
    });

    it('rescue is gated by bond', () => {
        const m = boot();
        m.rescueHive('hive_carapace');
        expect(m.getState().hives.find((h) => h.id === 'hive_carapace').status).toBe('dormant');
    });

    it('sacrifice and harvest kill the ally and please the queen', () => {
        const m = boot();
        m.sacrificeHive('hive_suture');
        m.harvestHive('hive_relay');
        const state = m.getState();
        expect(state.hives.find((h) => h.id === 'hive_suture').status).toBe('queen_consumed');
        expect(state.hives.find((h) => h.id === 'hive_relay').status).toBe('slain');
        expect(state.queenObedience).toBe(2);
    });

    it('synapse comes online when every living hive is networked', () => {
        const m = boot();
        m.harvestHive('hive_carapace'); // dead hives do not block the chorus
        m.setHiveNetworked('hive_suture', true);
        expect(m.getState().networks.hiveSynapseOnline).toBe(false);
        m.setHiveNetworked('hive_relay', true);
        expect(m.getState().networks.hiveSynapseOnline).toBe(true);
    });
});

describe('outing propagation', () => {
    const boot = () => new Act2Manager({ storage: memoryStorage() });

    it('spreads across linked camps when the relay is online', () => {
        const m = boot();
        m.markCampRelayLinked('camp_meridian', true);
        m.markCampRelayLinked('camp_tallow', true);
        m.setNetworkFlag('humanRelayOnline', true);
        m.propagateOuting('camp_meridian');
        const state = m.getState();
        expect(state.outedToHumans).toBe(true);
        expect(state.camps.find((c) => c.id === 'camp_meridian').knowsPlayerInfected).toBe(true);
        expect(state.camps.find((c) => c.id === 'camp_tallow').knowsPlayerInfected).toBe(true);
        expect(state.camps.find((c) => c.id === 'camp_vesper').knowsPlayerInfected).toBe(false);
    });

    it('a jammed relay contains the outing to the origin camp', () => {
        const m = boot();
        m.markCampRelayLinked('camp_meridian', true);
        m.markCampRelayLinked('camp_tallow', true);
        m.setNetworkFlag('humanRelayOnline', true);
        m.setNetworkFlag('relayJammed', true);
        m.propagateOuting('camp_meridian');
        const state = m.getState();
        expect(state.camps.find((c) => c.id === 'camp_meridian').knowsPlayerInfected).toBe(true);
        expect(state.camps.find((c) => c.id === 'camp_tallow').knowsPlayerInfected).toBe(false);
    });
});

describe('infection reducers', () => {
    const boot = () => new Act2Manager({ storage: memoryStorage() });

    it('warnCamp recruits them suspicious and defies the queen', () => {
        const m = boot();
        m.adjustCampBond('camp_tallow', 2);
        m.warnCamp('camp_tallow');
        const state = m.getState();
        const camp = state.camps.find((c) => c.id === 'camp_tallow');
        expect(camp.status).toBe('recruited');
        expect(camp.passengerState).toBe('human_suspicious');
        expect(camp.knowsPlayerInfected).toBe(true);
        expect(state.queenObedience).toBe(-1);
    });

    it('latentInfectCamp needs Host Mercy, bond, and low suspicion', () => {
        const m = boot();
        m.adjustCampBond('camp_meridian', ACT2_RECRUIT_BOND_THRESHOLD);
        m.latentInfectCamp('camp_meridian');
        expect(m.getState().camps[0].status).toBe('alive'); // no quest yet
        m.completeHiveQuest('hive_suture', 'host_mercy', 1);
        m.latentInfectCamp('camp_meridian');
        const camp = m.getState().camps[0];
        expect(camp.status).toBe('recruited');
        expect(camp.passengerState).toBe('latent_infected');
    });

    it('uninfectSelf is blocked while the queen is aboard, then cures and expires unsecured hives', () => {
        const m = boot();
        m.adjustHiveBond('hive_suture', ACT2_HIVE_RESCUE_BOND_THRESHOLD);
        m.rescueHive('hive_suture');
        m.uninfectSelf();
        expect(m.getState().infectionStage).not.toBe('cured'); // queen aboard
        m.setQueenStatus('rejected');
        m.uninfectSelf();
        const state = m.getState();
        expect(state.infectionStage).toBe('cured');
        expect(state.humanity).toBe(100);
        expect(state.hives.find((h) => h.id === 'hive_suture').status).toBe('rescued');
        expect(state.hives.find((h) => h.id === 'hive_relay').status).toBe('expired_by_cure');
        expect(state.manifest.player).toBe('human');
    });
});

describe('expanded ending families', () => {
    it('mothership infection: latent carrier, three unsuspecting humans, forged clearance', () => {
        const state = {
            begun: true,
            uplinkSilenced: true,
            dishBuilt: true,
            queenStatus: 'rejected',
            eggsStatus: 'destroyed',
            infectionStage: 'latent',
            camps: ACT2_CAMP_IDS.map((id) => ({ id, aided: true, status: 'recruited', bond: 4 })),
            hives: [{ id: 'hive_relay', questFlags: { false_clearance: 'done' } }]
        };
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.MOTHERSHIP_INFECTION);
        // A single suspicious passenger burns the infiltration.
        state.camps[1].passengerState = 'human_suspicious';
        expect(pickAct2Ending(state)).not.toBe(ACT2_ENDINGS.MOTHERSHIP_INFECTION);
    });

    it('alien exodus: three rescued hives, queen left behind', () => {
        const state = {
            begun: true,
            queenStatus: 'abandoned',
            eggsStatus: 'abandoned',
            camps: ACT2_CAMP_IDS.map((id) => ({ id, aided: true, status: 'robbed' })),
            hives: ACT2_HIVE_SITES.map((site) => ({ id: site.id, status: 'rescued' }))
        };
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.ALIEN_EXODUS);
    });

    it('outed escape: humans board knowing, player still infected', () => {
        const state = {
            begun: true,
            queenStatus: 'killed',
            eggsStatus: 'destroyed',
            infectionStage: 'symptomatic',
            camps: ACT2_CAMP_IDS.map((id) => ({
                id, aided: true, status: 'recruited', knowsPlayerInfected: true
            })),
            hives: []
        };
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.OUTED_ESCAPE);
    });

    it('cured player with warned humans still earns clean escape', () => {
        const state = {
            begun: true,
            queenStatus: 'killed',
            eggsStatus: 'destroyed',
            infectionStage: 'cured',
            camps: ACT2_CAMP_IDS.map((id) => ({
                id, aided: true, status: 'recruited', knowsPlayerInfected: true
            })),
            hives: []
        };
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.CLEAN_ESCAPE);
    });

    it('failed carrier: hidden egg with no stabilization', () => {
        const state = {
            begun: true,
            queenStatus: 'killed',
            eggsStatus: 'hidden',
            camps: ACT2_CAMP_IDS.map((id, i) => ({
                id, aided: true, status: i === 0 ? 'recruited' : 'culled'
            })),
            hives: []
        };
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.FAILED_CARRIER);
    });

    it('empty husk: nobody aboard, camps not even culled', () => {
        const state = {
            begun: true,
            queenStatus: 'abandoned',
            eggsStatus: 'abandoned',
            camps: ACT2_CAMP_IDS.map((id) => ({ id, aided: true, status: 'robbed' })),
            hives: ACT2_HIVE_SITES.map((site) => ({ id: site.id, status: 'abandoned' }))
        };
        expect(pickAct2Ending(state)).toBe(ACT2_ENDINGS.EMPTY_HUSK);
    });
});
