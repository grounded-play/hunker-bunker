import { describe, expect, it } from 'vitest';
import { formatRunCardBadges, summarizeRunCards } from './runCardHud.js';
import { drawRunCards } from './runModifiers.js';

describe('run card HUD presentation', () => {
    // ROGUE-02: the deck decides what a run is, but `activeRunCards` was
    // captured in main.js and never rendered anywhere -- the only surface was a
    // debug-only seed string. A bargain the player cannot see is not a bargain.
    it('turns drawn cards into renderable badges', () => {
        const cards = drawRunCards('hud-seed');
        const badges = formatRunCardBadges(cards);

        expect(badges).toHaveLength(cards.length);
        for (const [i, badge] of badges.entries()) {
            expect(badge.label).toBe(cards[i].label);
            expect(badge.blurb).toBe(cards[i].blurb);
            expect(badge.type).toBe(cards[i].type);
        }
    });

    it('is safe on an empty or malformed draw', () => {
        expect(formatRunCardBadges()).toEqual([]);
        expect(formatRunCardBadges(null)).toEqual([]);
        expect(formatRunCardBadges([{ label: 'X' }])).toEqual([{ label: 'X', blurb: '', type: 'world' }]);
    });

    // The death screen reports what the player did; it should also report what
    // the run *was*, so two runs with identical stats still read differently.
    it('summarizes a run into one debrief line', () => {
        const cards = drawRunCards('debrief-seed');
        const summary = summarizeRunCards(cards);

        expect(summary.startsWith('RUN PRESSURE: ')).toBe(true);
        for (const card of cards) expect(summary).toContain(card.label);
    });

    it('reports an unmodified run honestly rather than blank', () => {
        expect(summarizeRunCards([])).toBe('RUN PRESSURE: NONE — A CLEAN DESCENT');
        expect(summarizeRunCards()).toBe('RUN PRESSURE: NONE — A CLEAN DESCENT');
    });
});
