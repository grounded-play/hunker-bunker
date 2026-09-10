import { afterEach, describe, expect, it, vi } from 'vitest';
import { WandererManager, WANDERER_STORAGE_KEY } from './wandererSystem.js';
import { BankManager } from './bank.js';
import { ThreeGame } from './threeGame.js';
import { CORPO_CONTRACT, CRASH_QUEEN_CONTRACT, TRIPPER_CONTRACT, SURVIVOR_REWARDS, getSurvivorContractSteps } from './survivorContract.js';

function storage() { const map = new Map(); return { getItem: (key) => map.get(key), setItem: (key, value) => map.set(key, value) }; }
function recruit(manager, contract) { manager.befriend({ familyId: contract.familyId, skinId: contract.familyId, name: contract.familyId, quest: contract }); }
afterEach(() => vi.unstubAllGlobals());

describe('complete companion contracts', () => {
    it.each([CORPO_CONTRACT, CRASH_QUEEN_CONTRACT, TRIPPER_CONTRACT])('$title enforces stages, replay protection and exactly-once banked rewards', (contract) => {
        const disk = storage();
        const manager = new WandererManager({ storage: disk });
        recruit(manager, contract);
        expect(manager.recordQuestEvent({ type: 'unrelated', id: 'bad' })).toBeNull();
        if (contract.stages.length > 1) expect(manager.recordQuestEvent({ type: contract.stages.at(-1).type, id: 'early' })).toBeNull();
        for (const stage of contract.stages) {
            for (let i = 0; i < stage.count; i++) {
                const event = { type: stage.type, id: `${stage.type}:${i}` };
                expect(manager.recordQuestEvent(event)).not.toBeNull();
                expect(manager.recordQuestEvent(event)).toBeNull();
            }
        }
        expect(manager.state.completedQuests[contract.id]).toBe(true);
        expect(getSurvivorContractSteps(contract.id, contract.targetCount).every((s) => s.done)).toBe(true);
        let bank = new BankManager({ storage: disk });
        bank.claimSurvivorReward(contract.id); // crash before Wanderer receipt acknowledgement
        bank = new BankManager({ storage: disk });
        const reloaded = new WandererManager({ storage: disk });
        reloaded.deliverPendingRewards(bank);
        reloaded.deliverPendingRewards(bank);
        recruit(reloaded, contract);
        expect(reloaded.state.activeQuest).toBeNull();
        expect(bank.getShells()).toBe(SURVIVOR_REWARDS[contract.id].shells);
    });

    it('remembers a finished contract in reunion dialogue without offering its reward again', () => {
        const manager = new WandererManager({ storage: storage() });
        manager.state.metWandererIds = ['prior'];
        manager.state.completedQuests[CORPO_CONTRACT.id] = true;
        const returned = manager.rollWanderer({ unlocks: { o2Bubble: true }, defeatedBosses: ['boss'] }, () => 0.2);
        expect(returned.familyId).toBe('corpo_runner');
        expect(returned.quest).toBeNull();
        expect(returned.dialogueBefriend).toBe(CORPO_CONTRACT.reunionLine);
    });

    it('preserves separate progress and receipts through switches, dismissal and reload', () => {
        const disk = storage();
        let manager = new WandererManager({ storage: disk });
        recruit(manager, CORPO_CONTRACT);
        manager.recordQuestEvent({ type: 'terminal-decrypted', id: 'terminal:one' });
        recruit(manager, CRASH_QUEEN_CONTRACT);
        manager.recordQuestEvent({ type: 'camp-complete', id: 'camp:one' });
        manager.dismissCompanion();
        expect(manager.recordQuestEvent({ type: 'camp-complete', id: 'camp:two' })).toBeNull();
        manager = new WandererManager({ storage: disk });
        recruit(manager, CORPO_CONTRACT);
        expect(manager.state.questProgress).toBe(1);
        expect(manager.recordQuestEvent({ type: 'terminal-decrypted', id: 'terminal:one' })).toBeNull();
        recruit(manager, CRASH_QUEEN_CONTRACT);
        expect(manager.state.questProgress).toBe(1);
        expect(manager.recordQuestEvent({ type: 'camp-complete', id: 'camp:one' })).toBeNull();
    });

    it.each(['quest_corpo_severance', 'quest_crash_beacon', 'quest_abg_vinyl'])('migrates unsupported legacy quest %s without granting invented progress', (id) => {
        const disk = storage();
        disk.setItem(WANDERER_STORAGE_KEY, JSON.stringify({ activeQuest: { id, progress: 100 }, contractProgress: null }));
        const manager = new WandererManager({ storage: disk });
        expect(manager.state.activeQuest.progress).toBe(0);
        expect(manager.state.activeQuest.id).not.toBe(id);
    });

    it('counts actual gameplay crossings once and ignores menu, loading and forced announcements', () => {
        vi.stubGlobal('window', { dispatchEvent: vi.fn() });
        const manager = new WandererManager({ storage: storage() });
        recruit(manager, TRIPPER_CONTRACT);
        const game = { performanceProfile: 'menu', getDepthTierName: () => 'DEEP', syncSurvivorContract: (event) => manager.recordQuestEvent(event) };
        const crossing = (tier, isCrossing = true) => ThreeGame.prototype.emitDepthTierChanged.call(game, tier, { isCrossing });
        crossing(1);
        game.performanceProfile = 'gameplay'; game.loadingPaused = true; crossing(1);
        game.loadingPaused = false; crossing(1, false);
        expect(manager.state.questProgress).toBe(0);
        crossing(1); crossing(1); crossing(2);
        expect(manager.state.questProgress).toBe(2);
        expect(manager.state.activeQuest.id).toBe(TRIPPER_CONTRACT.id);
    });

    it('resolves the previous HUD row as paused and delivers the new completion dialogue', () => {
        const disk = storage();
        const manager = new WandererManager({ storage: disk });
        const registry = { trackObjective: vi.fn(), resolveObjective: vi.fn() };
        vi.stubGlobal('window', { dispatchEvent: vi.fn(), objectiveRegistry: registry });
        const game = { wandererManager: manager, bank: new BankManager({ storage: disk }), showBunkerLine: vi.fn() };
        recruit(manager, CORPO_CONTRACT);
        recruit(manager, CRASH_QUEEN_CONTRACT);
        ThreeGame.prototype.syncSurvivorContract.call(game, { type: 'camp-complete', id: 'a' });
        expect(registry.resolveObjective).toHaveBeenCalledWith(`survivor:${CORPO_CONTRACT.id}`, 'paused');
        ThreeGame.prototype.syncSurvivorContract.call(game, { type: 'camp-complete', id: 'b' });
        expect(game.bank.getShells()).toBe(16);
        expect(game.showBunkerLine).toHaveBeenCalledWith(CRASH_QUEEN_CONTRACT.completionLine);
    });
});
