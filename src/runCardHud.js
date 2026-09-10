// Presentation for the run-modifier deck.
//
// The cards decide what a run *is* -- which pressure it applies and which
// relief it grants -- but they were drawn, merged into effects, and never
// shown. `activeRunCards` lived in main.js behind a debug-only seed readout,
// so the player felt the bargain without ever being told the terms.
//
// Pure formatting, kept out of main.js so it can be tested: main.js has DOM
// side effects at module scope and cannot be imported by Vitest.

const CARD_TYPES = ['world', 'faction', 'threat'];

export function formatRunCardBadges(cards = []) {
    if (!Array.isArray(cards)) return [];
    return cards.map((card) => ({
        label: String(card?.label ?? 'UNKNOWN'),
        blurb: String(card?.blurb ?? ''),
        type: CARD_TYPES.includes(card?.type) ? card.type : 'world'
    }));
}

export function summarizeRunCards(cards = []) {
    const badges = formatRunCardBadges(cards);
    // An unmodified run is a real outcome, not missing data. Saying so beats a
    // blank line the player has to interpret.
    if (!badges.length) return 'RUN PRESSURE: NONE — A CLEAN DESCENT';
    return `RUN PRESSURE: ${badges.map((b) => b.label).join(' · ')}`;
}
