import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('terminal objective/night journal', () => {
    let game;
    let elements;

    function fakeElement() {
        const childrenByClass = new Map();
        return {
            textContent: '', className: '', children: [], dataset: {}, style: {},
            setAttribute(name, val) { this[name] = val; },
            getAttribute(name) { return this[name] ?? null; },
            replaceChildren() { this.children = []; },
            append(child) { this.children.push(child); },
            querySelector(selector) { return childrenByClass.get(selector.slice(1)) ?? null; },
            set innerHTML(value) {
                for (const match of value.matchAll(/class="([^"]+)"/g)) {
                    for (const className of match[1].split(/\s+/)) childrenByClass.set(className, fakeElement());
                }
            }
        };
    }

    beforeEach(() => {
        elements = new Map([
            'terminal-log-day', 'terminal-log-phase', 'terminal-log-light',
            'terminal-log-transition', 'terminal-log-route', 'terminal-log-advance-day',
            'terminal-cycle-compact-text', 'terminal-cycle-fill',
            'terminal-cycle-progress-wrap', 'terminal-cycle-progress-text',
            'terminal-objective-journal-list'
        ].map((id) => [id, fakeElement()]));
        vi.stubGlobal('document', {
            getElementById: (id) => elements.get(id) ?? null,
            createElement: () => fakeElement()
        });
        game = {
            renderTerminalObjectiveJournal: ThreeGame.prototype.renderTerminalObjectiveJournal,
            updateTerminalCycleStatus: ThreeGame.prototype.updateTerminalCycleStatus,
            getDayCycleViewModel: ThreeGame.prototype.getDayCycleViewModel,
            getAdvanceDayStatus: ThreeGame.prototype.getAdvanceDayStatus,
            dayState: { day: 3, phase: 'expedition', resolved: [], expired: [] },
            timeOfDay: 0.5,
            dayCycleSeconds: 600,
            getDayFactor: () => 1,
            missionState: { label: 'RECOVER BLACK BOX', status: 'active' },
            runStartTime: Date.now() - 65_000,
            bank: { canAfford: () => false },
            _terminalObjectiveHistory: [],
            _lastJournalDomSignature: null
        };
    });

    afterEach(() => vi.unstubAllGlobals());

    it('renders real day/light/deadline state and records objective transitions once', () => {
        const goal = { title: 'REPAIR O2', cost: { tech: 10 } };
        game.renderTerminalObjectiveJournal({}, goal);
        game.renderTerminalObjectiveJournal({}, goal);

        expect(elements.get('terminal-log-day').textContent).toBe('DAY 3');
        expect(elements.get('terminal-log-phase').textContent).toBe('EXPEDITION');
        expect(elements.get('terminal-log-light').textContent).toBe('DAYLIGHT');
        expect(game._terminalObjectiveHistory).toHaveLength(1);
        const list = elements.get('terminal-objective-journal-list');
        expect(list.children.some((row) => row.querySelector('.terminal-objective-journal-copy')?.textContent === 'MERIDIAN FIRST CONTACT')).toBe(true);

        expect(elements.get('terminal-log-advance-day').textContent).toBe('AVAILABLE AT BUNKER COT');
        expect(elements.get('terminal-log-advance-day').dataset.advanceStatus).toBe('cot_available');
        expect(elements.get('terminal-cycle-progress-wrap')['aria-valuenow']).toBe('50');

        game.missionState.status = 'objective_complete';
        game.bank.canAfford = () => true;
        game.renderTerminalObjectiveJournal({}, goal);
        expect(game._terminalObjectiveHistory).toHaveLength(2);
        expect(list.children[0].querySelector('.terminal-objective-journal-state').textContent)
            .toBe('OBJECTIVE COMPLETE · READY');

        // Verify DOM caching: identical state does not rebuild list children
        const childrenSnapshot = list.children;
        game.renderTerminalObjectiveJournal({}, goal);
        expect(list.children).toBe(childrenSnapshot);
    });

    it('reports advance day blocked when contract is active or in co-op guest mode', () => {
        const goal = { title: 'REPAIR O2', cost: { tech: 10 } };
        game._activeCampQuest = { id: 'contract_1' };
        game.renderTerminalObjectiveJournal({}, goal);
        expect(elements.get('terminal-log-advance-day').textContent).toBe('BLOCKED — ACTIVE CONTRACT');
        expect(elements.get('terminal-log-advance-day').dataset.advanceStatus).toBe('blocked_contract');

        game._activeCampQuest = null;
        game.isMultiplayer = true;
        game.isMultiplayerHost = false;
        game.renderTerminalObjectiveJournal({}, goal);
        expect(elements.get('terminal-log-advance-day').textContent).toBe('CO-OP VISITOR — LOCAL CAMPAIGN CYCLE LOCKED');
        expect(elements.get('terminal-log-advance-day').dataset.advanceStatus).toBe('coop_visitor');
    });
});
