import { describe, expect, it } from 'vitest';
import { itemCardHtml, loadoutCardViews, loadoutEffectSummaryHtml } from './itemCard.js';
import { getItemView } from './data/itemCatalog.js';

// Sprint 51: "I want to see what the loadout does" and "when I click an empty
// box we see what can go there".
describe('loadout cards say what they do and open their slot', () => {
    it('shows a charm or module effect on the card, and cosmetics as cosmetic', () => {
        expect(itemCardHtml(getItemView(4141), { slot: 'bay_a' })).toContain('Pickup magnet radius +20%.');
        expect(itemCardHtml(getItemView(4100), { slot: 'weapon' })).toContain('Cosmetic');
    });

    it("puts the effect in a compact card's label", () => {
        expect(itemCardHtml(getItemView(4131), { slot: 'charm', compact: true })).toMatch(/aria-label="[^"]*Projectiles gain \+1 pierce\./);
    });

    it('renders interactive cards as buttons, empty ones included', () => {
        const filled = itemCardHtml(getItemView(4141), { slot: 'bay_a', interactive: true });
        const empty = itemCardHtml(null, { slot: 'bay_b', interactive: true });
        expect(filled).toMatch(/^<button type="button" class="item-card[^"]*" data-slot="bay_a"/);
        expect(empty).toMatch(/^<button type="button" class="item-card item-card--empty" data-slot="bay_b"/);
        expect(itemCardHtml(null, { slot: 'bay_b' })).toMatch(/^<div /);
    });

    it('sums up what the loadout does, playable effects only', () => {
        const views = loadoutCardViews({ archetypeId: 'talon', weaponSkinId: '4100', charmId: '4131', mod1Id: '4141' }, { classId: 'scout' });
        const html = loadoutEffectSummaryHtml(views);
        expect(html).toContain('Projectiles gain +1 pierce.');
        expect(html).toContain('Pickup magnet radius +20%.');
        expect(html).not.toContain('Cosmetic');
        expect(loadoutEffectSummaryHtml(loadoutCardViews({ archetypeId: 'talon' }, { classId: 'scout' }))).toContain('Factory weapon');
    });
});
