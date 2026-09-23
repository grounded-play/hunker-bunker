import { describe, it, expect, beforeEach } from 'vitest';
import {
    ProfileManager,
    clearSaveData,
    exportSaveCode,
    importSaveCode,
    resetActiveAttempt,
    resetAllDataFactory,
    startNewCampaign
} from './profile.js';

function makeStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        get length() { return map.size; },
        key: (i) => Array.from(map.keys())[i] ?? null,
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
        _map: map
    };
}

describe('ProfileManager', () => {
    let storage;
    beforeEach(() => { storage = makeStorage(); });

    it('defaults to AGENT with a stable profile id', () => {
        const p = new ProfileManager({ storage });
        expect(p.getCallsign()).toBe('AGENT');
        expect(p.getProfileId()).toMatch(/^op-/);
        // id is stable across reloads
        const id = p.getProfileId();
        expect(new ProfileManager({ storage }).getProfileId()).toBe(id);
    });

    it('sanitizes and persists the callsign', () => {
        const p = new ProfileManager({ storage });
        expect(p.setCallsign('  Ghost-7! <xss> ')).toBe('GHOST-7 XSS');
        expect(new ProfileManager({ storage }).getCallsign()).toBe('GHOST-7 XSS');
    });

    it('falls back to AGENT for empty callsign', () => {
        const p = new ProfileManager({ storage });
        expect(p.setCallsign('!!!')).toBe('AGENT');
    });

    it('tracks multiplayer runs and trades accurately in profile state', () => {
        const p = new ProfileManager({ storage });
        expect(p.getStats()).toEqual({
            multiplayerMatches: 0,
            multiplayerVictories: 0,
            tradesCompleted: 0,
            coopExpeditions: 0,
            pvpDuels: 0
        });

        p.recordMultiplayerRun({ mode: 'coop', isVictory: true });
        p.recordMultiplayerRun({ mode: 'pvp', isVictory: false });
        p.recordTradeCompleted();

        expect(p.getStats()).toEqual({
            multiplayerMatches: 2,
            multiplayerVictories: 1,
            tradesCompleted: 1,
            coopExpeditions: 1,
            pvpDuels: 1
        });

        // Persisted across reloads
        const reloaded = new ProfileManager({ storage });
        expect(reloaded.getStats().multiplayerMatches).toBe(2);
        expect(reloaded.getStats().tradesCompleted).toBe(1);
    });
});

describe('save codes', () => {
    it('round-trips all hb_ keys and ignores foreign keys', () => {
        const src = makeStorage({
            hb_bank: '{"tech":5}',
            hb_fabricator_v1: '{"fabricated":{"mk1_sidearm":true}}',
            hb_arc_v1: '{"arcState":"cave_signal"}',
            unrelated: 'nope'
        });
        const code = exportSaveCode(src);
        expect(code.startsWith('HBSAVE1:')).toBe(true);

        const dst = makeStorage();
        const written = importSaveCode(code, dst);
        expect(written).toBe(3);
        expect(dst.getItem('hb_bank')).toBe('{"tech":5}');
        expect(dst.getItem('hb_fabricator_v1')).toBe('{"fabricated":{"mk1_sidearm":true}}');
        expect(dst.getItem('hb_arc_v1')).toBe('{"arcState":"cave_signal"}');
        expect(dst.getItem('unrelated')).toBeNull();
    });

    it('rejects malformed codes', () => {
        const dst = makeStorage();
        expect(importSaveCode('garbage', dst)).toBe(-1);
        expect(importSaveCode('HBSAVE1:!!!notb64', dst)).toBe(-1);
        expect(importSaveCode('', dst)).toBe(-1);
    });

    it('retires a previous world identity when importing a valid legacy campaign', () => {
        const legacy = makeStorage({ hb_arc_v1: '{"arcState":"cave_signal"}', hb_day_cycle: '{"day":4}' });
        const destination = makeStorage({
            hb_campaign_world_v1: '{"version":1,"seed":42,"mazeState":{"doors":{"old":"open"}}}',
            hb_bank: '{"tech":5}'
        });
        expect(importSaveCode(exportSaveCode(legacy), destination)).toBe(2);
        expect(destination.getItem('hb_campaign_world_v1')).toBeNull();
        expect(destination.getItem('hb_day_cycle')).toBe('{"day":4}');
        expect(destination.getItem('hb_bank')).toBe('{"tech":5}');
    });

    it.each([
        { hb_profile_v1: '{"callsign":"GHOST"}' },
        { hb_arc_v1: '{broken' }
    ])('keeps world identity when an import has no valid campaign record: %j', (records) => {
        const identity = '{"version":1,"seed":42}';
        const destination = makeStorage({ hb_campaign_world_v1: identity });
        expect(importSaveCode(exportSaveCode(makeStorage(records)), destination)).toBe(1);
        expect(destination.getItem('hb_campaign_world_v1')).toBe(identity);
    });

    it('restores the supplied identity from a modern campaign save', () => {
        const modern = makeStorage({
            hb_arc_v1: '{"arcState":"cave_signal"}',
            hb_campaign_world_v1: '{"version":1,"seed":99}'
        });
        const destination = makeStorage({ hb_campaign_world_v1: '{"version":1,"seed":42}' });
        expect(importSaveCode(exportSaveCode(modern), destination)).toBe(2);
        expect(destination.getItem('hb_campaign_world_v1')).toBe('{"version":1,"seed":99}');
    });

    it('clears hb_ save records while keeping preferences', () => {
        const storage = makeStorage({
            hb_bank: '{"tech":5}',
            hb_profile_v1: '{"callsign":"GHOST"}',
            hb_achievements_v1: '{"unlocked":{"quick_study":1}}',
            hb_minigame_rgb_v1: '{"checkpoint":"warehouse","endingsSeen":["open_hand"]}',
            hunker_key_bindings: '{"moveUp":["KeyW","ArrowUp"]}',
            hunker_audio_mix_v1: '{"master":0.7}'
        });

        expect(clearSaveData(storage)).toBe(4);
        expect(storage.getItem('hb_bank')).toBeNull();
        expect(storage.getItem('hb_profile_v1')).toBeNull();
        expect(storage.getItem('hb_achievements_v1')).toBeNull();
        expect(storage.getItem('hb_minigame_rgb_v1')).toBeNull();
        expect(storage.getItem('hunker_key_bindings')).toBe('{"moveUp":["KeyW","ArrowUp"]}');
        expect(storage.getItem('hunker_audio_mix_v1')).toBe('{"master":0.7}');
    });
});

describe('three-tier persistence contract', () => {
    const careerSeed = {
        hb_profile_v1: '{"callsign":"GHOST","multiplayerMatches":8}',
        hb_bank: '{"tech":90,"coin":12,"med":4}',
        hb_fabricator_v1: '{"fabricated":{"mk1_sidearm":true}}',
        hb_codex_v1: '{"discovered":["A01"]}',
        hb_world_memory_v1: '{"logsFound":["A01","drop_horizon_badge"]}',
        hb_achievements_v1: '{"unlocked":{"quick_study":1}}',
        hb_loadout_v2: '{"classType":"TANK"}',
        hb_season_deep_crust_beta_1_v1: '{"xp":140}'
    };

    it('starts a new campaign by removing real campaign keys while preserving career data', () => {
        const storage = makeStorage({
            ...careerSeed,
            hb_arc_v1: '{"arcState":"cave_signal"}',
            hb_act2_v1: '{"hives":{"alpha":"alive"}}',
            hb_side_stories_v1: '{"stories":{"queen_slayer":"active"}}',
            hb_run_checkpoint_v1: '{"depth":840}',
            hb_day_cycle: '{"day":6}',
            hb_fatigue: '{"expeditionsSinceSleep":4}',
            hb_overnight_v1: '{"night":5}',
            hb_campaign_ledger_v1: '{"runs":3,"deaths":2}',
            hb_campaign_world_v1: '{"version":1,"seed":8128,"expeditionIndex":3}',
            hb_black_box_v1: JSON.stringify({
                active: true,
                depth: 840,
                salvage: { tech: 4 },
                archive: [{ depth: 400 }]
            })
        });

        expect(startNewCampaign(storage)).toBe(9);
        for (const key of [
            'hb_arc_v1',
            'hb_act2_v1',
            'hb_side_stories_v1',
            'hb_run_checkpoint_v1',
            'hb_day_cycle',
            'hb_fatigue',
            'hb_overnight_v1',
            'hb_campaign_ledger_v1',
            'hb_campaign_world_v1'
        ]) {
            expect(storage.getItem(key), key).toBeNull();
        }
        for (const [key, value] of Object.entries(careerSeed)) {
            expect(storage.getItem(key), key).toBe(value);
        }
        expect(JSON.parse(storage.getItem('hb_black_box_v1'))).toMatchObject({
            active: false,
            archive: [{ depth: 400 }]
        });
    });

    it('resets only the active attempt without clearing campaign progression', () => {
        const storage = makeStorage({
            ...careerSeed,
            hb_arc_v1: '{"arcState":"act_two"}',
            hb_day_cycle: '{"day":4}',
            hb_campaign_world_v1: '{"version":1,"seed":8128,"expeditionIndex":3}',
            hb_run_checkpoint_v1: '{"depth":1200}'
        });

        expect(resetActiveAttempt(storage)).toBe(1);
        expect(storage.getItem('hb_run_checkpoint_v1')).toBeNull();
        expect(storage.getItem('hb_arc_v1')).toBe('{"arcState":"act_two"}');
        expect(storage.getItem('hb_day_cycle')).toBe('{"day":4}');
        expect(storage.getItem('hb_campaign_world_v1')).toBe('{"version":1,"seed":8128,"expeditionIndex":3}');
    });

    it('factory reset removes every hb_ record and preserves non-save preferences', () => {
        const storage = makeStorage({
            ...careerSeed,
            hb_arc_v1: '{}',
            hunker_key_bindings: '{"moveUp":["KeyW"]}'
        });

        expect(resetAllDataFactory(storage)).toBe(Object.keys(careerSeed).length + 1);
        expect(Array.from(storage._map.keys())).toEqual(['hunker_key_bindings']);
    });
});
