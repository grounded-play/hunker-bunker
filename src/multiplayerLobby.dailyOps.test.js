import { describe, expect, it, afterEach, vi } from 'vitest';
import { MultiplayerLobby, MULTIPLAYER_MODES } from './multiplayerLobby.js';
import { RUN_GRADE_BANDS, getRunRating } from './runRating.js';

// Daily Ops moved from the Armory footer to a DAILY OPS mode card on the
// Deployment Briefing, with a goals panel listing what today's run can earn.

afterEach(() => vi.unstubAllGlobals());

function stubDom() {
    const els = new Map();
    const el = (id) => {
        if (!els.has(id)) els.set(id, { id, textContent: '', innerHTML: '', className: '', disabled: false });
        return els.get(id);
    };
    vi.stubGlobal('document', { getElementById: el, querySelector: () => null });
    return el;
}

function dailyLobby(status) {
    vi.stubGlobal('window', {
        activeMultiplayerSession: { roomCode: 'OLDRUN' },
        game: { teardownMultiplayerNetwork: vi.fn() },
        AudioManager: { play: vi.fn() }
    });
    const lobby = new MultiplayerLobby();
    lobby.currentMode = MULTIPLAYER_MODES.DAILY;
    lobby.closeModal = vi.fn();
    lobby.onLaunch = vi.fn();
    lobby.onDailyLaunch = vi.fn();
    lobby.getDailyOpsStatus = () => status;
    return lobby;
}

describe('Daily Ops on the Deployment Briefing', () => {
    it('deploys through the Daily Ops launcher, not the standard solo launch', () => {
        const lobby = dailyLobby({ state: 'ready' });
        const { onDailyLaunch, onLaunch } = lobby;

        lobby.handleDeployButtonClick();

        expect(onDailyLaunch).toHaveBeenCalledOnce();
        expect(onLaunch).not.toHaveBeenCalled();
        expect(window.activeMultiplayerSession).toBeNull();
        expect(lobby.onDailyLaunch).toBeNull();
    });

    it('refuses a second attempt once today is scored', () => {
        const lobby = dailyLobby({ state: 'completed', score: 1200, grade: 'B' });
        const { onDailyLaunch } = lobby;

        lobby.handleDeployButtonClick();

        expect(onDailyLaunch).not.toHaveBeenCalled();
        expect(lobby.closeModal).not.toHaveBeenCalled();
    });

    it('lists every grade target a run can earn, plus the attempt and leaderboard', () => {
        const el = stubDom();
        const lobby = dailyLobby({ state: 'ready', seedLabel: 'DAILY-2026-09-21' });

        lobby.updateDailyPanel(lobby.getDailyOpsStatus());

        const html = el('net-daily-goals').innerHTML;
        expect(html.match(/net-daily-row/g)).toHaveLength(6);
        for (const band of RUN_GRADE_BANDS.filter((b) => b.minScore > 0)) {
            expect(html).toContain(`>${band.grade}</span>`);
            expect(html).toContain(String(band.minScore));
        }
        expect(html).not.toContain('net-daily-row--earned');
        expect(el('net-daily-seed').textContent).toBe('DAILY-2026-09-21');
        expect(el('net-deploy-btn').disabled).toBe(false);
    });

    it('marks grades at or under today\'s score as earned and locks deploy', () => {
        const el = stubDom();
        const lobby = dailyLobby({ state: 'completed', score: 1200, grade: 'B' });

        lobby.updateDailyPanel(lobby.getDailyOpsStatus());

        const html = el('net-daily-goals').innerHTML;
        // attempt + B + C + leaderboard earned; S and A missed.
        expect(html.match(/net-daily-row--earned/g)).toHaveLength(4);
        expect(html.match(/net-status-tag--missed/g)).toHaveLength(2);
        expect(el('net-deploy-btn').disabled).toBe(true);
    });
});

describe('run grade bands', () => {
    it('grades on the same bands the goals panel shows', () => {
        expect(getRunRating(2000).grade).toBe('S');
        expect(getRunRating(1999).grade).toBe('A');
        expect(getRunRating(1000).grade).toBe('B');
        expect(getRunRating(500).grade).toBe('C');
        expect(getRunRating(0).grade).toBe('D');
    });
});
