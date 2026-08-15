import { describe, expect, it, beforeEach } from 'vitest';
import {
    SIDE_STORIES_CONFIG,
    SIDE_STORY_STATUS,
    SideStoryManager
} from './sideStorySystem.js';

function createMockStorage(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
    };
}

describe('SideStoryManager & Multi-Path Story Progression', () => {
    let manager;
    let storage;

    beforeEach(() => {
        storage = createMockStorage();
        manager = new SideStoryManager({ storage });
    });

    it('initializes all side stories in locked state', () => {
        for (const key of Object.keys(SIDE_STORIES_CONFIG)) {
            const story = manager.getStoryState(key);
            expect(story.status).toBe(SIDE_STORY_STATUS.LOCKED);
            expect(story.stageIndex).toBe(1);
            expect(story.completedStages).toEqual([]);
        }
    });

    it('evaluates environmental and gameplay triggers to unlock Stage 1', () => {
        // Sister Val unlocks on low O2 or Tallow visit
        manager.evaluateTriggers({ lowO2Exposures: 1 });
        expect(manager.getStoryState('sister_val').status).toBe(SIDE_STORY_STATUS.AVAILABLE);

        // Commander Briggs unlocks on combat breach or Depth Tier 2
        expect(manager.getStoryState('commander_briggs').status).toBe(SIDE_STORY_STATUS.LOCKED);
        manager.evaluateTriggers({ depthTier: 2 });
        expect(manager.getStoryState('commander_briggs').status).toBe(SIDE_STORY_STATUS.AVAILABLE);

        // Overseer Kaelen unlocks on Tech inventory or visiting Meridian
        manager.evaluateTriggers({ techInventory: 20 });
        expect(manager.getStoryState('overseer_kaelen').status).toBe(SIDE_STORY_STATUS.AVAILABLE);

        // Aria unlocks on deep caves (depthTier 3+)
        manager.evaluateTriggers({ depthTier: 3 });
        expect(manager.getStoryState('aria_queen_mimic').status).toBe(SIDE_STORY_STATUS.AVAILABLE);

        // Dr. Nahl unlocks on biolab visit or depthTier 2
        manager.evaluateTriggers({ visitedBioLab: true });
        expect(manager.getStoryState('dr_nahl').status).toBe(SIDE_STORY_STATUS.AVAILABLE);
    });

    it('supports pause and resume for flexible side story progression', () => {
        manager.evaluateTriggers({ lowO2Exposures: 1 });
        manager.startStory('sister_val');
        expect(manager.getStoryState('sister_val').status).toBe(SIDE_STORY_STATUS.IN_PROGRESS);

        // Pause when player leaves camp or chooses "Come back later"
        expect(manager.pauseStory('sister_val')).toBe(true);
        expect(manager.getStoryState('sister_val').status).toBe(SIDE_STORY_STATUS.PAUSED);

        // Resume when player returns
        expect(manager.resumeStory('sister_val')).toBe(true);
        expect(manager.getStoryState('sister_val').status).toBe(SIDE_STORY_STATUS.IN_PROGRESS);
    });

    it('handles quest skips/bribes with resource validation and grants rewards', () => {
        manager.evaluateTriggers({ lowO2Exposures: 1 });
        manager.startStory('sister_val');

        // Cannot skip without enough shells
        const failSkip = manager.skipCurrentStageWithCost('sister_val', { shells: 10 });
        expect(failSkip.success).toBe(false);
        expect(failSkip.reason).toBe('insufficient_shells');

        // Successful skip with sufficient shells
        const successSkip = manager.skipCurrentStageWithCost('sister_val', { shells: 50 });
        expect(successSkip.success).toBe(true);
        expect(successSkip.stageCompleted).toBe(1);
        expect(successSkip.nextStage).toBe(2);
        expect(successSkip.rewards.shells).toBe(50);
        expect(manager.getStoryState('sister_val').perks).toContain('tallow_suture_salve');
    });

    it('enforces mutual faction lockouts and conflicts', () => {
        // Complete Aria to Stage 3 (Queen's Mark)
        manager.getStoryState('aria_queen_mimic').completedStages = [1, 2, 3];
        manager.getStoryState('aria_queen_mimic').status = SIDE_STORY_STATUS.COMPLETED;

        // Commander Briggs Stage 3 checks for Aria Stage 3
        manager.getStoryState('commander_briggs').stageIndex = 3;
        const lockout = manager.isLockedOut('commander_briggs');
        expect(lockout.locked).toBe(true);
        expect(lockout.conflictingStory).toBe('aria_queen_mimic');

        manager.evaluateTriggers({ depthTier: 3, bondScore: 60 });
        expect(manager.getStoryState('commander_briggs').status).toBe(SIDE_STORY_STATUS.LOCKED_OUT);
    });

    it('persists side story progression across storage reloads', () => {
        manager.evaluateTriggers({ lowO2Exposures: 1 });
        manager.completeCurrentStage('sister_val');

        const reloaded = new SideStoryManager({ storage });
        const val = reloaded.getStoryState('sister_val');
        expect(val.stageIndex).toBe(2);
        expect(val.completedStages).toContain(1);
        expect(val.perks).toContain('tallow_suture_salve');
    });

    it('deposits rewards into active game bank and ammo on stage completion', () => {
        const fakeBank = {
            shells: 0,
            bal: { tech: 0, med: 0, coin: 0 },
            depositShells(n) { this.shells += n; },
            deposit(res) {
                this.bal.tech += res.tech || 0;
                this.bal.med += res.med || 0;
                this.bal.coin += res.coin || 0;
            }
        };
        const fakeGame = { bank: fakeBank, playerAmmo: 10 };
        globalThis.window = { game: fakeGame };

        manager.evaluateTriggers({ lowO2Exposures: 1 });
        const res = manager.completeCurrentStage('sister_val');
        expect(res.success).toBe(true);
        expect(fakeBank.shells).toBe(50);
        expect(fakeBank.bal.med).toBe(4);

        delete globalThis.window;
    });
});
