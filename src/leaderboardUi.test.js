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
