import { describe, expect, it, vi } from 'vitest';
import {
    BountyManager,
    DAILY_BOUNTY_XP,
    WEEKLY_OPERATION_XP,
    getDailyDateKey,
    getWeeklyDateKey
} from './bountySystem.js';

function createMockStorage(initial = {}) {
    const store = { ...initial };
    return {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
    };
}

describe('Bounty & Directive System', () => {
    it('generates 3 deterministic dailies and 5 weeklies', () => {
        const storage = createMockStorage();
        const manager = new BountyManager({ storage });
        const dailies = manager.getActiveDailies();
        const weeklies = manager.getActiveWeeklies();

        expect(dailies).toHaveLength(3);
        expect(weeklies).toHaveLength(5);

        for (const d of dailies) {
            expect(d.xp).toBe(DAILY_BOUNTY_XP);
            expect(d.progress).toBe(0);
            expect(d.completed).toBe(false);
            expect(typeof d.title).toBe('string');
        }

        for (const w of weeklies) {
            expect(w.xp).toBe(WEEKLY_OPERATION_XP);
            expect(w.progress).toBe(0);
            expect(w.completed).toBe(false);
        }
    });

    it('records progress and triggers XP award upon completion', () => {
        const storage = createMockStorage();
        const onAwardXp = vi.fn();
        const manager = new BountyManager({ storage, onAwardXp });

        const killsBounty = manager.state.dailies.find((b) => b.type === 'kills') ||
            manager.state.weeklies.find((b) => b.type === 'kills');

        if (killsBounty) {
            const target = killsBounty.target;
            manager.recordProgress('kills', target - 1);
            expect(killsBounty.completed).toBe(false);
            expect(killsBounty.progress).toBe(target - 1);
            expect(onAwardXp).not.toHaveBeenCalled();

            const completed = manager.recordProgress('kills', 1);
            expect(killsBounty.completed).toBe(true);
            expect(killsBounty.progress).toBe(target);
            expect(completed).toContain(killsBounty);
            expect(onAwardXp).toHaveBeenCalledWith(killsBounty.xp, expect.any(String), killsBounty.title);
        }
    });

    it('persists and restores state correctly from storage', () => {
        const storage = createMockStorage();
        const manager1 = new BountyManager({ storage });
        manager1.recordProgress('dashes', 5);

        const manager2 = new BountyManager({ storage });
        const dashesBounty1 = manager1.state.dailies.find((b) => b.type === 'dashes') ||
            manager1.state.weeklies.find((b) => b.type === 'dashes');
        const dashesBounty2 = manager2.state.dailies.find((b) => b.type === 'dashes') ||
            manager2.state.weeklies.find((b) => b.type === 'dashes');

        if (dashesBounty1 && dashesBounty2) {
            expect(dashesBounty2.progress).toBe(dashesBounty1.progress);
        }
    });

    it('formats valid daily and weekly date keys', () => {
        const d = new Date('2026-08-17T12:00:00Z');
        expect(getDailyDateKey(d)).toBe('2026-08-17');
        expect(getWeeklyDateKey(d)).toMatch(/^2026-W\d{2}$/);
    });
});
