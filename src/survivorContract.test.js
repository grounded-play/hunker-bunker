import { describe, expect, it } from 'vitest';
import { WandererManager, WANDERER_STORAGE_KEY } from './wandererSystem.js';
import { BankManager } from './bank.js';
import { FOXHOLE_CONTRACT } from './survivorContract.js';

function storage() {
    const data = new Map();
    return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
function recruit(manager) {
    const wanderer = manager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['o2Bubble'] });
    expect(wanderer.familyId).toBe('foxhole_buddy');
    manager.befriend(wanderer);
    return wanderer;
}
function protectRoute(manager, start = 0) {
    for (let i = start; i < 8; i += 1) manager.recordQuestEvent({ id: `kill:${i}`, type: 'enemy-killed' });
}

describe('connected survivor contract', () => {
    it('requires ordered, distinct combat events followed by a camp job', () => {
        const manager = new WandererManager({ storage: storage() });
        recruit(manager);
        expect(manager.recordQuestEvent({ id: 'camp:early', type: 'camp-complete' })).toBeNull();
        manager.recordQuestEvent({ id: 'kill:0', type: 'enemy-killed' });
        expect(manager.recordQuestEvent({ id: 'kill:0', type: 'enemy-killed' })).toBeNull();
        expect(manager.state.questProgress).toBe(1);
        protectRoute(manager, 1);
        expect(manager.recordQuestEvent({ id: 'kill:extra', type: 'enemy-killed' })).toBeNull();
        expect(manager.state.questProgress).toBe(8);
        expect(manager.recordQuestEvent({ id: 'camp:meridian:job', type: 'camp-complete' }).completed).toBe(true);
        expect(manager.state.pendingRewards).toEqual([FOXHOLE_CONTRACT.id]);
        expect(manager.recordQuestEvent({ id: 'camp:meridian:job', type: 'camp-complete' })).toBeNull();
    });

    it('preserves progress and replay protection through reload and re-recruitment', () => {
        const disk = storage();
        let manager = new WandererManager({ storage: disk });
        const foxhole = recruit(manager);
        manager.recordQuestEvent({ id: 'first', type: 'enemy-killed' });
        manager = new WandererManager({ storage: disk });
        manager.befriend(foxhole);
        expect(manager.state.questProgress).toBe(1);
        expect(manager.recordQuestEvent({ id: 'first', type: 'enemy-killed' })).toBeNull();
        manager.dismissCompanion();
        expect(manager.recordQuestEvent({ id: 'second', type: 'enemy-killed' })).toBeNull();
    });

    it('grants currency once even if the game restarts between the bank write and reward acknowledgement', () => {
        const disk = storage();
        const manager = new WandererManager({ storage: disk });
        recruit(manager);
        protectRoute(manager);
        manager.recordQuestEvent({ id: 'camp:1', type: 'camp-complete' });
        let bank = new BankManager({ storage: disk });
        bank.claimSurvivorReward(FOXHOLE_CONTRACT.id);
        bank = new BankManager({ storage: disk });
        const reloaded = new WandererManager({ storage: disk });
        reloaded.deliverPendingRewards(bank);
        reloaded.deliverPendingRewards(bank);
        expect(bank.getShells()).toBe(12);
        expect(reloaded.state.pendingRewards).toEqual([]);
        expect(bank.claimSurvivorReward('unknown')).toBe(false);
    });

    it('keeps a failed bank write retryable without changing the live balance', () => {
        const disk = storage();
        const bank = new BankManager({ storage: disk });
        const write = disk.setItem;
        disk.setItem = () => { throw new Error('disk full'); };
        expect(() => bank.claimSurvivorReward(FOXHOLE_CONTRACT.id)).toThrow('disk full');
        expect(bank.getShells()).toBe(0);
        disk.setItem = write;
        expect(bank.claimSurvivorReward(FOXHOLE_CONTRACT.id)).toBe(true);
        expect(bank.getShells()).toBe(12);
    });

    it('recovers malformed optional fields and migrates the old unconnected Foxhole quest', () => {
        const disk = storage();
        disk.setItem(WANDERER_STORAGE_KEY, JSON.stringify({
            metWandererIds: 'bad', completedQuests: null, questEventIds: 5,
            pendingRewards: null, activeQuest: { id: 'quest_foxhole_tags', progress: 3 }
        }));
        const manager = new WandererManager({ storage: disk });
        expect(manager.state.activeQuest).toMatchObject({ id: FOXHOLE_CONTRACT.id, progress: 0 });
        expect(manager.state.questEventIds).toEqual([]);
        expect(manager.advanceQuest(-1)).toBeNull();
    });

    it('HACKER_CONTRACT: requires 3 distinct terminal decryptions, rejects duplicates, and awards 15 shells', () => {
        const disk = storage();
        const manager = new WandererManager({ storage: disk });
        const bank = new BankManager({ storage: disk });

        // Manually roll/befriend hacker GF
        manager.state.metWandererIds = ['some_prior'];
        const hacker = manager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['o2Bubble'] }, () => 0); // keys[0] = manic_hacker
        expect(hacker.familyId).toBe('manic_hacker');
        expect(hacker.quest.id).toBe('hacker_core_override_v1');

        manager.befriend(hacker);
        expect(manager.state.activeQuest?.id).toBe('hacker_core_override_v1');

        // Wrong event type is rejected
        expect(manager.recordQuestEvent({ id: 'kill:0', type: 'enemy-killed' })).toBeNull();

        // Terminal 1
        const res1 = manager.recordQuestEvent({ id: 'terminal:t1', type: 'terminal-decrypted' });
        expect(res1.completed).toBe(false);
        expect(manager.state.questProgress).toBe(1);

        // Duplicate terminal 1 rejected
        expect(manager.recordQuestEvent({ id: 'terminal:t1', type: 'terminal-decrypted' })).toBeNull();
        expect(manager.state.questProgress).toBe(1);

        // Terminal 2
        manager.recordQuestEvent({ id: 'terminal:t2', type: 'terminal-decrypted' });
        expect(manager.state.questProgress).toBe(2);

        // Terminal 3 completes quest
        const res3 = manager.recordQuestEvent({ id: 'terminal:t3', type: 'terminal-decrypted' });
        expect(res3.completed).toBe(true);
        expect(manager.state.activeQuest).toBeNull();
        expect(manager.state.pendingRewards).toEqual(['hacker_core_override_v1']);

        // Deliver rewards to bank
        const delivered = manager.deliverPendingRewards(bank);
        expect(delivered).toEqual(['hacker_core_override_v1']);
        expect(bank.getShells()).toBe(15);
    });

    it('HYBRID_CONTRACT: requires 3 distinct hive harvests, rejects duplicates, and awards 18 shells', () => {
        const disk = storage();
        const manager = new WandererManager({ storage: disk });
        const bank = new BankManager({ storage: disk });

        manager.state.metWandererIds = ['some_prior'];
        // species_hybrid is index 5 out of 6 archetypes (0.95 * 6 = 5.7 -> floor 5)
        const hybrid = manager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['o2Bubble'] }, () => 0.95);
        expect(hybrid.familyId).toBe('species_hybrid');
        expect(hybrid.quest.id).toBe('species_symbiosis_v1');

        manager.befriend(hybrid);
        expect(manager.state.activeQuest?.id).toBe('species_symbiosis_v1');

        // Wrong event type is rejected
        expect(manager.recordQuestEvent({ id: 'kill:0', type: 'enemy-killed' })).toBeNull();
        expect(manager.recordQuestEvent({ id: 'terminal:0', type: 'terminal-decrypted' })).toBeNull();

        // Harvest 1: hive_suture
        const res1 = manager.recordQuestEvent({ id: 'hive:suture:c1', type: 'hive-harvested' });
        expect(res1.completed).toBe(false);
        expect(manager.state.questProgress).toBe(1);

        // Duplicate harvest 1 rejected
        expect(manager.recordQuestEvent({ id: 'hive:suture:c1', type: 'hive-harvested' })).toBeNull();
        expect(manager.state.questProgress).toBe(1);

        // Harvest 2: hive_relay
        manager.recordQuestEvent({ id: 'hive:relay:c1', type: 'hive-harvested' });
        expect(manager.state.questProgress).toBe(2);

        // Harvest 3: hive_carapace completes quest
        const res3 = manager.recordQuestEvent({ id: 'hive:carapace:c1', type: 'hive-harvested' });
        expect(res3.completed).toBe(true);
        expect(manager.state.activeQuest).toBeNull();
        expect(manager.state.pendingRewards).toEqual(['species_symbiosis_v1']);

        // Deliver rewards to bank
        const delivered = manager.deliverPendingRewards(bank);
        expect(delivered).toEqual(['species_symbiosis_v1']);
        expect(bank.getShells()).toBe(18);
    });
});
