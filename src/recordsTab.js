// Archive → RECORDS (docs/planning/records-and-leaderboards-popup-plan-2026-10-05.md):
// SERVICE RECORD, the player's all-time numbers, and LEADERBOARDS, the five
// Steam boards by scope. Decisions live in the small exported functions; the
// DOM side is covered by tests/e2e/records-tab.spec.js.
import { t as defaultT } from './i18n.js';
import { buildServiceRecord } from './serviceRecord.js';
import { fetchLeaderboard, renderLeaderboardRows } from './leaderboardUi.js';

export const RECORD_BOARDS = Object.freeze([
    'best_run_score', 'survival_time_seconds', 'deepest_depth_score', 'fastest_extraction_ms', 'daily_ops_score'
]);
// Keys spelled out so the i18n audit can see each one in use.
const BOARD_LABEL_KEYS = Object.freeze({
    best_run_score: 'ui.records.board_best_run_score',
    survival_time_seconds: 'ui.records.board_survival_time_seconds',
    deepest_depth_score: 'ui.records.board_deepest_depth_score',
    fastest_extraction_ms: 'ui.records.board_fastest_extraction_ms',
    daily_ops_score: 'ui.records.board_daily_ops_score'
});
const SCOPE_LABEL_KEYS = Object.freeze({
    Global: 'ui.records.scope_global',
    Friends: 'ui.records.scope_friends',
    AroundUser: 'ui.records.scope_around'
});

/** Friends and Around me need a signed-in Steam session. */
export function availableScopes({ steam = false } = {}) {
    return steam ? ['Global', 'Friends', 'AroundUser'] : ['Global'];
}

/** One request per board and scope per `ttlMs`; offline answers are not kept. */
export function createBoardCache({ fetch = fetchLeaderboard, now = Date.now, ttlMs = 60_000 } = {}) {
    const entries = new Map();
    return {
        async get(board, scope) {
            const key = `${board}|${scope}`;
            const hit = entries.get(key);
            if (hit && now() - hit.at < ttlMs) return hit.result;
            const result = await fetch({ board, scope, count: 10 });
            if (result.state === 'offline') entries.delete(key);
            else entries.set(key, { at: now(), result });
            return result;
        }
    };
}

export function recordsStatus({ state, board, scope }, t = defaultT) {
    if (state === 'loading') return t('ui.records.loading');
    if (state === 'offline') return t('ui.records.offline');
    const params = { board: t(BOARD_LABEL_KEYS[board] ?? BOARD_LABEL_KEYS.best_run_score), scope: t(SCOPE_LABEL_KEYS[scope] ?? SCOPE_LABEL_KEYS.Global) };
    return t(state === 'mock' ? 'ui.records.status_mock' : 'ui.records.status', params);
}

export function createRecordsTab({
    document: doc = globalThis.document,
    getStats = () => ({}),
    getLedger = () => ({}),
    getTotals = () => ({}),
    hasSteam = () => Boolean(globalThis.window?.electronAPI?.getSteamLeaderboard),
    getLocale = () => 'en',
    t = defaultT,
    cache = createBoardCache()
} = {}) {
    const state = { view: 'service', board: RECORD_BOARDS[0], scope: 'Global' };
    let boardRequest = 0;
    const $ = (id) => doc?.getElementById(id);

    function chip(label, pressed, onSelect, data) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'records-chip';
        button.textContent = label;
        button.setAttribute('aria-pressed', String(pressed));
        for (const [key, value] of Object.entries(data)) button.dataset[key] = value;
        button.addEventListener('click', onSelect);
        return button;
    }

    function renderService() {
        const root = $('records-service');
        if (!root) return;
        root.innerHTML = '';
        const sections = buildServiceRecord({
            stats: getStats() ?? {}, ledger: getLedger() ?? {}, totals: getTotals() ?? {}, t, locale: getLocale()
        });
        for (const section of sections) {
            const card = doc.createElement('article');
            card.className = 'records-card';
            card.dataset.recordsSection = section.id;
            const title = doc.createElement('h3');
            title.className = 'records-card__title';
            title.textContent = t(section.titleKey);
            const list = doc.createElement('dl');
            list.className = 'records-card__rows';
            for (const row of section.rows) {
                const label = doc.createElement('dt');
                label.textContent = t(row.labelKey);
                const value = doc.createElement('dd');
                value.textContent = row.display;
                value.dataset.recordsRow = row.id;
                list.append(label, value);
            }
            card.append(title, list);
            root.appendChild(card);
        }
    }

    function renderChips() {
        const boards = $('records-board-chips');
        const scopes = $('records-scope-chips');
        const allowed = availableScopes({ steam: hasSteam() });
        if (!allowed.includes(state.scope)) state.scope = 'Global';
        boards?.replaceChildren(...RECORD_BOARDS.map((board) => chip(
            t(BOARD_LABEL_KEYS[board]), board === state.board, () => selectBoard(board), { recordsBoard: board }
        )));
        scopes?.replaceChildren(...allowed.map((scope) => chip(
            t(SCOPE_LABEL_KEYS[scope]), scope === state.scope, () => selectScope(scope), { recordsScope: scope }
        )));
    }

    async function renderBoard() {
        const status = $('records-board-status');
        const list = $('records-board-list');
        const request = ++boardRequest;
        const { board, scope } = state;
        if (status) status.textContent = recordsStatus({ state: 'loading' }, t);
        const result = await cache.get(board, scope);
        if (request !== boardRequest) return;
        if (status) {
            status.textContent = recordsStatus({ state: result.state, board, scope }, t);
            status.dataset.state = result.state;
        }
        if (result.state === 'offline') list?.replaceChildren();
        else renderLeaderboardRows(list, result.entries, { board, selfSteamId: result.selfSteamId, rowClass: 'records-board' });
    }

    function renderView() {
        for (const button of doc?.querySelectorAll('[data-records-view]') ?? []) {
            button.setAttribute('aria-pressed', String(button.dataset.recordsView === state.view));
        }
        $('records-service')?.classList.toggle('hidden', state.view !== 'service');
        $('records-boards')?.classList.toggle('hidden', state.view !== 'boards');
        if (state.view === 'service') renderService();
        else {
            renderChips();
            renderBoard();
        }
    }

    function selectView(view) {
        state.view = view === 'boards' ? 'boards' : 'service';
        renderView();
    }

    function selectBoard(board) {
        if (!RECORD_BOARDS.includes(board)) return;
        state.board = board;
        renderView();
        doc.querySelector(`[data-records-board="${board}"]`)?.focus({ preventScroll: true });
    }

    function selectScope(scope) {
        state.scope = scope;
        renderView();
        doc.querySelector(`[data-records-scope="${scope}"]`)?.focus({ preventScroll: true });
    }

    for (const button of doc?.querySelectorAll('[data-records-view]') ?? []) {
        button.addEventListener('click', () => selectView(button.dataset.recordsView));
    }

    return {
        render: renderView,
        /** Open on a view (and board) from a shortcut elsewhere. */
        show({ view = state.view, board = null } = {}) {
            if (board && RECORD_BOARDS.includes(board)) state.board = board;
            selectView(view);
        },
        get state() { return { ...state }; }
    };
}
