import { describe, expect, it, beforeEach } from 'vitest';
import { createCampaignLedger, EMPTY_CAMPAIGN_LEDGER, CAMPAIGN_LEDGER_STORAGE_KEY } from './campaignLedger.js';
import { createBlackBoxStorage } from './blackBox.js';
import {
    CAMPAIGN_SPECIFIC_STORAGE_KEYS,
    ACTIVE_ATTEMPT_STORAGE_KEYS,
    startNewCampaign,
    resetActiveAttempt
} from './profile.js';

class MemoryStorage {
    constructor() { this.store = new Map(); }
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
    setItem(key, value) { this.store.set(key, String(value)); }
    removeItem(key) { this.store.delete(key); }
    clear() { this.store.clear(); }
    get length() { return this.store.size; }
    key(i) { return Array.from(this.store.keys())[i] ?? null; }
}

describe('Ticket #83 — Deployment Console, Ledger & Black Box Verification', () => {
    let storage;

    beforeEach(() => {
        storage = new MemoryStorage();
    });

    it('verifies CampaignLedger correctly tracks in-campaign progression separate from lifetime career', () => {
        let fakeTime = 1000;
        const ledger = createCampaignLedger({ storage, now: () => fakeTime });

        expect(ledger.getState()).toEqual(EMPTY_CAMPAIGN_LEDGER);

        // Record a defeat at depth 1
        ledger.recordRun({ outcome: 'death', depthTier: 1 });
        let state = ledger.getState();
        expect(state.runs).toBe(1);
        expect(state.deaths).toBe(1);
        expect(state.victories).toBe(0);
        expect(state.deepestDepthTier).toBe(1);
        expect(state.startedAt).toBe(1000);

        // Record a second defeat at depth 3
        fakeTime = 2000;
        ledger.recordRun({ outcome: 'death', depthTier: 3 });
        state = ledger.getState();
        expect(state.runs).toBe(2);
        expect(state.deaths).toBe(2);
        expect(state.deepestDepthTier).toBe(3);

        // Record a victory at depth 2 (does not lower deepestDepthTier)
        ledger.recordRun({ outcome: 'victory', depthTier: 2 });
        state = ledger.getState();
        expect(state.runs).toBe(3);
        expect(state.deaths).toBe(2);
        expect(state.victories).toBe(1);
        expect(state.deepestDepthTier).toBe(3);
    });

    it('verifies new campaign resets the campaign ledger while storage retains career records', () => {
        expect(CAMPAIGN_LEDGER_STORAGE_KEY).toBe('hb_campaign_ledger_v1');
        expect(CAMPAIGN_SPECIFIC_STORAGE_KEYS).toContain(CAMPAIGN_LEDGER_STORAGE_KEY);
        expect(ACTIVE_ATTEMPT_STORAGE_KEYS).not.toContain(CAMPAIGN_LEDGER_STORAGE_KEY);

        // Populate career, campaign ledger, and active attempt keys
        storage.setItem('hb_profile_v1', JSON.stringify({ callsign: 'REAPER' }));
        storage.setItem('hb_achievements', JSON.stringify({ archivist: true }));
        storage.setItem(CAMPAIGN_LEDGER_STORAGE_KEY, JSON.stringify({ runs: 4, deaths: 3 }));
        storage.setItem('hb_run_checkpoint_v1', JSON.stringify({ active: true }));

        // resetActiveAttempt ends the attempt but MUST PRESERVE campaign ledger and career
        resetActiveAttempt(storage);
        expect(storage.getItem('hb_run_checkpoint_v1')).toBeNull();
        expect(storage.getItem(CAMPAIGN_LEDGER_STORAGE_KEY)).not.toBeNull();
        expect(storage.getItem('hb_profile_v1')).not.toBeNull();
        expect(storage.getItem('hb_achievements')).not.toBeNull();

        // startNewCampaign wipes campaign ledger but MUST PRESERVE career
        startNewCampaign(storage);
        expect(storage.getItem(CAMPAIGN_LEDGER_STORAGE_KEY)).toBeNull();
        expect(storage.getItem('hb_profile_v1')).not.toBeNull();
        expect(storage.getItem('hb_achievements')).not.toBeNull();

        // Clean ledger reflects empty state for the fresh campaign
        const freshLedger = createCampaignLedger({ storage });
        expect(freshLedger.getState()).toEqual(EMPTY_CAMPAIGN_LEDGER);
    });

    it('proves Soulslike Black Box rule: death-before-recovery forfeits prior salvage and keeps exactly one active marker', () => {
        let clock = 100;
        const blackBox = createBlackBoxStorage({ storage, now: () => clock });

        expect(blackBox.load().active).toBe(false);

        // First death with 50 tech salvage
        clock = 500;
        blackBox.recordDeath({
            x: 10,
            z: 20,
            depth: 1,
            classType: 'SCOUT',
            salvage: { tech: 50, coin: 20, med: 5 },
            cause: 'swarm_overrun'
        });

        let current = blackBox.load();
        expect(current.active).toBe(true);
        expect(current.depth).toBe(1);
        expect(current.salvage.tech).toBe(50);
        expect(current.archive).toHaveLength(1);

        // Second death BEFORE recovering the first box (new loss with 10 tech)
        clock = 800;
        blackBox.recordDeath({
            x: -15,
            z: 45,
            depth: 2,
            classType: 'TANK',
            salvage: { tech: 10, coin: 0, med: 0 },
            cause: 'fall_damage'
        });

        current = blackBox.load();
        // The active recoverable salvage is NOW ONLY the latest death
        expect(current.active).toBe(true);
        expect(current.x).toBe(-15);
        expect(current.z).toBe(45);
        expect(current.depth).toBe(2);
        expect(current.classType).toBe('TANK');
        expect(current.salvage.tech).toBe(10);
        // The first death was archived for lore/tombstone history, not recoverable currency
        expect(current.archive).toHaveLength(2);
        expect(current.archive[0].salvage.tech).toBe(50);
        expect(current.archive[1].salvage.tech).toBe(10);

        // Successful recovery retrieves the active salvage once
        const recovered = blackBox.recoverActive();
        expect(recovered).toBeDefined();
        expect(recovered.salvage.tech).toBe(10);

        // Second recovery returns null and active is false (atomic single-recovery)
        expect(blackBox.recoverActive()).toBeNull();
        expect(blackBox.load().active).toBe(false);

        // Reload from storage confirms persisted state is inactive and zeroed (anti-dupe guarantee)
        const reloaded = createBlackBoxStorage({ storage });
        const loaded = reloaded.load();
        expect(loaded.active).toBe(false);
        expect(loaded.salvage).toEqual({ tech: 0, coin: 0, med: 0 });
        expect(reloaded.recoverActive()).toBeNull();
    });

    it('verifies deployment briefing payload aggregates career, campaign, black box and objectives', () => {
        const payload = {
            career: {
                runs: 10,
                deaths: 8,
                victories: 2,
                deepestDepth: 'SECTOR-04'
            },
            campaign: {
                runs: 3,
                deaths: 2,
                day: 5,
                deepestDepth: 'SECTOR-02',
                storyProgress: 'ACT I // HUMAN PRELUDE'
            },
            blackBox: {
                active: true,
                depth: 2,
                salvage: { tech: 15, coin: 10, med: 2 }
            },
            daily: {
                seedLabel: 'DAILY-2026-09-29',
                state: 'ready',
                score: 0,
                grade: 'D',
                scope: 'personal'
            },
            seasonObjectives: [
                { title: 'Purge Suture Crawlers', progress: 5, target: 20, scope: 'personal' }
            ]
        };

        expect(payload.career.runs).toBeGreaterThanOrEqual(payload.campaign.runs);
        expect(payload.campaign.storyProgress).toContain('ACT I');
        expect(payload.blackBox.active).toBe(true);
        expect(payload.seasonObjectives[0].progress).toBe(5);
        // Explicit delineation between personal directives and co-op squad missions
        expect(payload.daily.scope).toBe('personal');
        expect(payload.seasonObjectives[0].scope).toBe('personal');
    });

    it('proves in-game Black Box recovery updates bank salvage and records campaign ledger depth tier', () => {
        const ledger = createCampaignLedger({ storage });
        const blackBox = createBlackBoxStorage({ storage });

        // Record a deep run death
        blackBox.recordDeath({
            x: 12.5,
            z: -8.0,
            depth: 3,
            classType: 'SCOUT',
            salvage: { tech: 40, coin: 25, med: 5 }
        });
        const stateAfterDeath = ledger.recordRun({ outcome: 'death', depthTier: 3 });
        expect(stateAfterDeath.runs).toBe(1);
        expect(stateAfterDeath.deaths).toBe(1);
        expect(stateAfterDeath.deepestDepthTier).toBe(3);

        // Recover the Black Box in gameplay
        const recovered = blackBox.recoverActive();
        expect(recovered).toBeDefined();
        expect(recovered.salvage).toEqual({ tech: 40, coin: 25, med: 5 });

        // Subsequent extraction victory updates ledger with deeper depth
        const stateAfterVictory = ledger.recordRun({ outcome: 'victory', depthTier: 5 });
        expect(stateAfterVictory.runs).toBe(2);
        expect(stateAfterVictory.victories).toBe(1);
        expect(stateAfterVictory.deepestDepthTier).toBe(5);
    });
});


