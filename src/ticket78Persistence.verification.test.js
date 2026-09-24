import { describe, expect, it, beforeEach } from 'vitest';
import {
    ProfileManager,
    startNewCampaign,
    resetActiveAttempt,
    exportSaveCode,
    importSaveCode,
    CAMPAIGN_SPECIFIC_STORAGE_KEYS
} from './profile.js';

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
    setItem(key, value) { this.store.set(key, String(value)); }
    removeItem(key) { this.store.delete(key); }
    clear() { this.store.clear(); }
    get length() { return this.store.size; }
    key(i) { return Array.from(this.store.keys())[i] ?? null; }
}

describe('Ticket #78 — Persistence Contract Verification', () => {
    let storage;

    beforeEach(() => {
        storage = new MemoryStorage();
    });

    it('proves two deaths accumulate career statistics while retiring in-flight runs', () => {
        const profile = new ProfileManager({ storage });
        profile.setCallsign('VANGUARD-01');

        // Death 1
        storage.setItem('hb_run_checkpoint_v1', JSON.stringify({ depth: 1, hp: 0 }));
        storage.setItem('hb_expedition_suspend_v1', JSON.stringify({ active: true }));
        profile.recordMultiplayerRun({ mode: 'solo', isVictory: false });
        resetActiveAttempt(storage);

        expect(storage.getItem('hb_run_checkpoint_v1')).toBeNull();
        expect(storage.getItem('hb_expedition_suspend_v1')).toBeNull();
        expect(profile.getStats().coopExpeditions).toBe(1);
        expect(profile.getStats().multiplayerVictories).toBe(0);

        // Death 2
        storage.setItem('hb_run_checkpoint_v1', JSON.stringify({ depth: 2, hp: 0 }));
        profile.recordMultiplayerRun({ mode: 'solo', isVictory: false });
        resetActiveAttempt(storage);

        expect(storage.getItem('hb_run_checkpoint_v1')).toBeNull();
        expect(profile.getStats().coopExpeditions).toBe(2);
        expect(profile.getStats().multiplayerVictories).toBe(0);
        expect(profile.getCallsign()).toBe('VANGUARD-01');
    });

    it('proves victory commits career gains and survives new campaign initiation', () => {
        const profile = new ProfileManager({ storage });
        profile.setCallsign('HERO-47');

        // Victory run
        profile.recordMultiplayerRun({ mode: 'coop', isVictory: true });
        expect(profile.getStats().multiplayerVictories).toBe(1);
        expect(profile.getStats().coopExpeditions).toBe(1);

        // Seed bank and permanent unlocks
        storage.setItem('hb_bank_v1', JSON.stringify({ tech: 100, coin: 80, med: 50 }));
        storage.setItem('hb_achievements', JSON.stringify({ quick_study: { unlockedAt: 12345 } }));
        storage.setItem('hb_item_ownership', JSON.stringify({ owned: ['4100', '4101'] }));

        // Active campaign state
        storage.setItem('hb_arc_v1', JSON.stringify({ act: 2, linchpin: 'tina_allied' }));
        storage.setItem('hb_day_cycle', JSON.stringify({ day: 14 }));
        storage.setItem('hb_campaign_world_v1', JSON.stringify({ seed: 998877 }));

        // Initiate NEW GAME / startNewCampaign()
        const removedCount = startNewCampaign(storage);
        expect(removedCount).toBeGreaterThan(0);

        // Story/campaign keys must be reset
        for (const key of CAMPAIGN_SPECIFIC_STORAGE_KEYS) {
            expect(storage.getItem(key)).toBeNull();
        }

        // Permanent career keys must remain completely intact
        const reloadedProfile = new ProfileManager({ storage });
        expect(reloadedProfile.getCallsign()).toBe('HERO-47');
        expect(reloadedProfile.getStats().multiplayerVictories).toBe(1);
        expect(JSON.parse(storage.getItem('hb_bank_v1')).tech).toBe(100);
        expect(JSON.parse(storage.getItem('hb_achievements')).quick_study).toBeDefined();
        expect(JSON.parse(storage.getItem('hb_item_ownership')).owned).toContain('4100');
    });

    it('proves legacy unversioned save migration safely normalizes without resurrecting stale worlds', () => {
        // Old save code without hb_campaign_world_v1
        const legacyData = {
            hb_profile_v1: JSON.stringify({ callsign: 'LEGACY_OP', profileId: 'op-legacy-1' }),
            hb_arc_state: JSON.stringify({ act: 1, step: 3 }),
            hb_side_stories: JSON.stringify({ count: 2 }),
            hb_campaign_world_v1: JSON.stringify({ staleSeed: 1234 })
        };
        const exportStore = new MemoryStorage();
        for (const [k, v] of Object.entries(legacyData)) exportStore.setItem(k, v);
        // Delete world identity from the exported snapshot to simulate pre-world exports
        exportStore.removeItem('hb_campaign_world_v1');

        const saveCode = exportSaveCode(exportStore);
        expect(saveCode.startsWith('HBSAVE1:')).toBe(true);

        // Device has an existing world seed
        storage.setItem('hb_campaign_world_v1', JSON.stringify({ localSeed: 5555 }));

        const written = importSaveCode(saveCode, storage);
        expect(written).toBeGreaterThan(0);

        // Importing older campaign drops stale foreign world seed so a fresh identity is created
        expect(storage.getItem('hb_campaign_world_v1')).toBeNull();
        expect(new ProfileManager({ storage }).getCallsign()).toBe('LEGACY_OP');
    });

    it('proves no duplicated ownership on re-grant or repeated imports', () => {
        const recordOwnership = (item) => {
            const current = new Set(JSON.parse(storage.getItem('hb_item_ownership') || '{"items":[]}').items);
            current.add(item);
            storage.setItem('hb_item_ownership', JSON.stringify({ items: Array.from(current) }));
        };

        recordOwnership('item_talon_c');
        recordOwnership('item_siege_breaker');
        recordOwnership('item_talon_c'); // duplicate grant attempt

        const stored = JSON.parse(storage.getItem('hb_item_ownership'));
        expect(stored.items).toHaveLength(2);
        expect(stored.items.filter((i) => i === 'item_talon_c')).toHaveLength(1);
    });

    it('proves Cloud save export/import round-trip preserves exact state and avoids corruption', () => {
        const profile = new ProfileManager({ storage });
        profile.setCallsign('CLOUD_AGENT');
        profile.recordMultiplayerRun({ mode: 'coop', isVictory: true });
        storage.setItem('hb_bank_v1', JSON.stringify({ tech: 42, coin: 99, med: 10 }));
        storage.setItem('hb_season_pass', JSON.stringify({ level: 12, claimed: [1, 2, 3] }));

        const code = exportSaveCode(storage);
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(50);

        const newDeviceStore = new MemoryStorage();
        const written = importSaveCode(code, newDeviceStore);
        expect(written).toBeGreaterThanOrEqual(3);

        const restoredProfile = new ProfileManager({ storage: newDeviceStore });
        expect(restoredProfile.getCallsign()).toBe('CLOUD_AGENT');
        expect(restoredProfile.getStats().multiplayerVictories).toBe(1);
        expect(JSON.parse(newDeviceStore.getItem('hb_bank_v1')).coin).toBe(99);
        expect(JSON.parse(newDeviceStore.getItem('hb_season_pass')).level).toBe(12);

        // Malformed code handling
        expect(importSaveCode('INVALID_CODE', storage)).toBe(-1);
        expect(importSaveCode('HBSAVE1:not_base64!!!', storage)).toBe(-1);
    });
});
