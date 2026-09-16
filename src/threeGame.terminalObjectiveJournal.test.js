import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('terminal objective/night journal', () => {
    let game;
    let elements;

    function fakeElement() {
        const childrenByClass = new Map();
        return {
            textContent: '', className: '', children: [],
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
            'terminal-log-transition', 'terminal-objective-journal-list'
        ].map((id) => [id, fakeElement()]));
        vi.stubGlobal('document', {
            getElementById: (id) => elements.get(id) ?? null,
            createElement: () => fakeElement()
        });
        game = {
            renderTerminalObjectiveJournal: ThreeGame.prototype.renderTerminalObjectiveJournal,
            dayState: { day: 3, phase: 'expedition', resolved: [], expired: [] },
            timeOfDay: 0.5,
            dayCycleSeconds: 600,
            getDayFactor: () => 1,
            missionState: { label: 'RECOVER BLACK BOX', status: 'active' },
            runStartTime: Date.now() - 65_000,
            bank: { canAfford: () => false },
            _terminalObjectiveHistory: []
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

        game.missionState.status = 'objective_complete';
        game.bank.canAfford = () => true;
        game.renderTerminalObjectiveJournal({}, goal);
        expect(game._terminalObjectiveHistory).toHaveLength(2);
        expect(list.children[0].querySelector('.terminal-objective-journal-state').textContent)
            .toBe('OBJECTIVE COMPLETE · READY');
    });
});
