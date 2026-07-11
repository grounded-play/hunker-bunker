import { describe, it, expect } from 'vitest';
import { BunkerDirector, chooseApexThreatEvents, chooseDirectorAction } from './director.js';

describe('chooseDirectorAction', () => {
    it('never harasses inside the safe field', () => {
        expect(chooseDirectorAction({ inSafeField: true, hpFrac: 1, depth: 50 }, () => 0)).toBe('none');
    });

    it('eases when the player is struggling (low hp): never patrols, sometimes mercy', () => {
        // low roll -> mercy, high roll -> none; never an aggressive action
        expect(chooseDirectorAction({ hpFrac: 0.2, depth: 40, secondsSinceThreat: 999 }, () => 0)).toBe('mercy');
        expect(chooseDirectorAction({ hpFrac: 0.2, depth: 40, secondsSinceThreat: 999 }, () => 0.9)).toBe('none');
    });

    it('lets the moment breathe right after a threat', () => {
        const a = chooseDirectorAction({ hpFrac: 1, secondsSinceThreat: 3, threatGap: 16 }, () => 0.9);
        expect(a).toBe('none');
    });

    it('pressures a healthy, greedy, quiet player with a patrol', () => {
        const a = chooseDirectorAction({ hpFrac: 1, depth: 40, secondsSinceThreat: 999, secondsElapsed: 200 }, () => 0);
        expect(a).toBe('patrol');
    });

    it('keeps environmental sabotage console-driven', () => {
        const deep = { hpFrac: 1, depth: 60, secondsSinceThreat: 999, secondsElapsed: 240 };
        for (let r = 0; r < 1; r += 0.05) {
            const action = chooseDirectorAction(deep, () => r);
            expect(['patrol', 'taunt', 'none']).toContain(action);
            expect(action).not.toBe('lightsout');
            expect(action).not.toBe('corrupt');
        }
    });
});

describe('BunkerDirector', () => {
    const snap = { hpFrac: 1, depth: 40, inSafeField: false, secondsElapsed: 200 };

    it('does not act before the cadence elapses', () => {
        const d = new BunkerDirector({ cadence: 16 });
        expect(d.tick(5, snap, () => 0)).toBeNull();
        expect(d.tick(5, snap, () => 0)).toBeNull();
    });

    it('returns an action once cadence elapses for a greedy quiet player', () => {
        const d = new BunkerDirector({ cadence: 16, threatGap: 16 });
        let action = null;
        // advance well past cadence + threatGap
        for (let i = 0; i < 5 && !action; i++) action = d.tick(10, snap, () => 0);
        expect(action).toBe('patrol');
    });

    it('respects per-action cooldown (no immediate repeat)', () => {
        const d = new BunkerDirector({ cadence: 1, threatGap: 0 });
        const first = d.tick(2, snap, () => 0); // patrol
        expect(first).toBe('patrol');
        // next eval is within patrol cooldown -> suppressed
        const second = d.tick(2, snap, () => 0);
        expect(second).toBeNull();
    });

    it('notifyThreat resets the quiet timer so it eases off', () => {
        const d = new BunkerDirector({ cadence: 1, threatGap: 30 });
        d.notifyThreat();
        const a = d.tick(2, snap, () => 0.9); // sinceThreat tiny -> breathe
        expect(a).toBeNull();
    });

    it('draws and exposes deterministic run cards', () => {
        const d = new BunkerDirector();
        const state = d.startRun('director-seed');

        expect(d.runSeed).toBe('director-seed');
        expect(d.activeCards.map((card) => card.key)).toEqual(state.cards.map((card) => card.key));
        expect(d.cardEffects).toEqual(state.effects);
        expect(d.cardState.publicCards[0]).toEqual({
            key: d.activeCards[0].key,
            label: d.activeCards[0].label,
            blurb: d.activeCards[0].blurb
        });
    });

    it('accepts a pre-drawn card state from the runtime', () => {
        const d = new BunkerDirector();
        d.setRunCards({
            seed: 'manual',
            cards: [{
                key: 'patrol_surge',
                label: 'PATROL SURGE',
                blurb: 'test',
                effects: { spawnBias: { patrolBias: true } }
            }]
        });

        expect(d.runSeed).toBe('manual');
        expect(d.cardEffects.spawnBias.patrolBias).toBe(true);
    });

    it('emits apex threats once per run gate', () => {
        const d = new BunkerDirector();
        const first = d.evaluateApexThreats({ campId: 'camp_vesper', suspicion: 75 });
        const second = d.evaluateApexThreats({ campId: 'camp_vesper', suspicion: 100 });
        const outed = d.evaluateApexThreats({ campId: 'camp_vesper', suspicion: 100, outed: true });

        expect(first.map((event) => event.type)).toEqual(['hunter_pair']);
        expect(second).toEqual([]);
        expect(outed.map((event) => event.type)).toEqual(['exterminator_lander']);
    });
});

describe('chooseApexThreatEvents', () => {
    it('triggers hunters at high suspicion and a lander when outed', () => {
        const events = chooseApexThreatEvents({ campId: 'camp_meridian', suspicion: 80, outed: true });

        expect(events.map((event) => event.type)).toEqual(['hunter_pair', 'exterminator_lander']);
        expect(events[0].hunters).toEqual(['HENDERSON-REDLINE', 'PARK-ASH']);
    });

    it('does not repeat already spawned threat keys', () => {
        const events = chooseApexThreatEvents(
            { campId: 'camp_meridian', suspicion: 80, outed: true },
            ['hunter_pair:camp_meridian', 'exterminator_lander:global']
        );

        expect(events).toEqual([]);
    });
});
