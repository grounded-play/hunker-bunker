import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderGameOverLeaderboard } from './leaderboardUi.js';

// Minimal DOM stand-in: the suite runs in node, and these tests only need the
// status line and the row count.
function fakeElement() {
    return {
        textContent: '',
        className: '',
        children: [],
        set innerHTML(_value) { this.children = []; },
        appendChild(child) { this.children.push(child); },
        append(...kids) { this.children.push(...kids); }
    };
}

let statusEl;
let listEl;

beforeEach(() => {
    statusEl = fakeElement();
    listEl = fakeElement();
    globalThis.document = {
        getElementById: (id) => ({ 'go-leaderboard-status': statusEl, 'go-leaderboard-list': listEl })[id] ?? null,
        createElement: () => fakeElement()
    };
    globalThis.window = {};
});

afterEach(() => {
    delete globalThis.document;
    delete globalThis.window;
});

const SELF = '76561198000000099';

describe('renderGameOverLeaderboard', () => {
    it('reads the board only after this run\'s submit settles, so the new run is listed', async () => {
        const order = [];
        let resolveSubmit;
        const submission = new Promise((resolve) => { resolveSubmit = resolve; });
        window.electronAPI = {
            getSteamLeaderboard: vi.fn(async () => {
                order.push('read');
                return { ok: true, mock: false, entries: [{ steamId64: SELF, score: 700, rank: 1, persona: 'Me' }] };
            }),
            getSteamIdentity: vi.fn(async () => ({ steamId64: SELF }))
        };

        const rendering = renderGameOverLeaderboard({}, { submission });
        await Promise.resolve();
        expect(statusEl.textContent).toBe('UPLINKING SCORE TO BEST RUN SCORE...');
        expect(window.electronAPI.getSteamLeaderboard).not.toHaveBeenCalled();

        order.push('submitted');
        resolveSubmit({ ok: true, queued: false });
        await rendering;

        expect(order).toEqual(['submitted', 'read']);
        expect(statusEl.textContent).toBe('BEST RUN SCORE - GLOBAL TOP 10 // SCORE LOGGED');
        expect(statusEl.className).toContain('--live');
        expect(listEl.children[0].className).toContain('player-self');
    });

    it('shows why a rejected run did not land', async () => {
        window.electronAPI = {
            getSteamLeaderboard: vi.fn(async () => ({ ok: true, mock: false, entries: [] })),
            getSteamIdentity: vi.fn(async () => null)
        };
        await renderGameOverLeaderboard({}, {
            submission: Promise.resolve({ ok: false, queued: false, reason: 'invalid_run_payload', errors: ['unsupported_schema'] })
        });
        expect(statusEl.textContent).toBe('BEST RUN SCORE - GLOBAL TOP 10 // SCORE REJECTED - UNSUPPORTED_SCHEMA');
        expect(statusEl.className).toContain('--offline');
    });

    it('says the score is queued when the uplink is down', async () => {
        window.electronAPI = {
            getSteamLeaderboard: vi.fn(async () => ({ ok: false, reason: 'steam_backend_unreachable' })),
            getSteamIdentity: vi.fn(async () => null)
        };
        await renderGameOverLeaderboard({}, {
            submission: Promise.resolve({ ok: false, queued: true, reason: 'steam_backend_unreachable' })
        });
        expect(statusEl.textContent).toBe('UPLINK DOWN - SCORE QUEUED FOR RETRY');
    });

    it('stops waiting for a hung submit after the cap and still reads the board', async () => {
        window.electronAPI = {
            getSteamLeaderboard: vi.fn(async () => ({ ok: true, mock: false, entries: [] })),
            getSteamIdentity: vi.fn(async () => null)
        };
        await renderGameOverLeaderboard({}, { submission: new Promise(() => {}), submitWaitMs: 5 });
        expect(window.electronAPI.getSteamLeaderboard).toHaveBeenCalled();
        expect(statusEl.textContent).toBe('BEST RUN SCORE - GLOBAL TOP 10');
    });

    it('keeps the web-build offline message', async () => {
        await renderGameOverLeaderboard({});
        expect(statusEl.textContent).toBe('LEADERBOARD OFFLINE - SCORE BANKED LOCALLY');
    });
});

describe('fetchLeaderboard (shared by Game Over and Archive → RECORDS)', () => {
    const top = [
        { steamId64: '1', persona: 'A', score: 300, rank: 1 },
        { steamId64: '2', persona: 'B', score: 200, rank: 2 }
    ];

    it('is offline without the Steam bridge', async () => {
        const { fetchLeaderboard } = await import('./leaderboardUi.js');
        expect(await fetchLeaderboard({ board: 'best_run_score', api: null })).toEqual({ state: 'offline', entries: [], selfSteamId: null });
    });

    it('pins your row under the global top when you are outside it', async () => {
        const { fetchLeaderboard } = await import('./leaderboardUi.js');
        const api = {
            getSteamLeaderboard: vi.fn(async (_board, scope) => (scope === 'Global'
                ? { ok: true, entries: top }
                : { ok: true, entries: [{ steamId64: SELF, persona: 'Me', score: 50, rank: 40 }] })),
            getSteamIdentity: async () => ({ steamId64: SELF })
        };
        const result = await fetchLeaderboard({ board: 'best_run_score', scope: 'Global', count: 10, api });
        expect(result.state).toBe('live');
        expect(result.selfSteamId).toBe(SELF);
        expect(result.entries).toEqual([...top, { separator: true }, { steamId64: SELF, persona: 'Me', score: 50, rank: 40 }]);
        expect(api.getSteamLeaderboard).toHaveBeenCalledWith('best_run_score', 'Global', 10);
    });

    it('asks Steam for the requested scope and marks the dev mock', async () => {
        const { fetchLeaderboard } = await import('./leaderboardUi.js');
        const api = { getSteamLeaderboard: vi.fn(async () => ({ ok: true, mock: true, entries: top })), getSteamIdentity: async () => null };
        const result = await fetchLeaderboard({ board: 'survival_time_seconds', scope: 'Friends', count: 10, api });
        expect(api.getSteamLeaderboard).toHaveBeenCalledWith('survival_time_seconds', 'Friends', 10);
        expect(result).toMatchObject({ state: 'mock', entries: top });
    });

    it('is offline when Steam answers not ok or throws', async () => {
        const { fetchLeaderboard } = await import('./leaderboardUi.js');
        expect((await fetchLeaderboard({ board: 'best_run_score', api: { getSteamLeaderboard: async () => ({ ok: false }) } })).state).toBe('offline');
        expect((await fetchLeaderboard({ board: 'best_run_score', api: { getSteamLeaderboard: async () => { throw new Error('down'); } } })).state).toBe('offline');
    });
});

describe('formatLeaderboardScore', () => {
    it('formats every board', async () => {
        const { formatLeaderboardScore } = await import('./leaderboardUi.js');
        expect(formatLeaderboardScore('fastest_extraction_ms', 245_400)).toBe('4m 05s');
        expect(formatLeaderboardScore('survival_time_seconds', 125)).toBe('2m 5s');
        expect(formatLeaderboardScore('daily_ops_score', 1550)).toBe('1550');
        expect(formatLeaderboardScore('best_run_score', 1550)).toBe('1550');
    });
});

describe('fetchLeaderboard on the web build (Global from the backend)', () => {
    it('reads Global over HTTP when there is no Steam bridge and the caller allows it', async () => {
        const { fetchLeaderboard } = await import('./leaderboardUi.js');
        const http = vi.fn(async () => new Response(JSON.stringify({ ok: true, entries: [{ steamId64: '1', persona: 'A', score: 9, rank: 1 }] })));
        const result = await fetchLeaderboard({ board: 'best_run_score', scope: 'Global', count: 10, api: null, web: { http, backendUrl: 'https://hb.test' } });
        expect(http).toHaveBeenCalledWith('https://hb.test/steam/leaderboards/best_run_score?dataRequest=RequestGlobal&count=10', expect.any(Object));
        expect(result).toEqual({ state: 'live', entries: [{ steamId64: '1', persona: 'A', score: 9, rank: 1 }], selfSteamId: null });
    });

    it('stays offline for other scopes, failures, or without the opt-in', async () => {
        const { fetchLeaderboard } = await import('./leaderboardUi.js');
        const http = vi.fn(async () => new Response('{}', { status: 503 }));
        expect((await fetchLeaderboard({ board: 'best_run_score', scope: 'Friends', api: null, web: { http, backendUrl: 'https://hb.test' } })).state).toBe('offline');
        expect((await fetchLeaderboard({ board: 'best_run_score', scope: 'Global', api: null, web: { http, backendUrl: 'https://hb.test' } })).state).toBe('offline');
        expect((await fetchLeaderboard({ board: 'best_run_score', scope: 'Global', api: null })).state).toBe('offline');
        expect(http).toHaveBeenCalledTimes(1);
    });
});
