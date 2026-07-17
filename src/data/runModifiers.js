import {
    RUN_MODIFIER_CARDS,
    createRunCardState,
    getRunCardByKey
} from '../runModifiers.js';

const toLegacyModifier = (card) => card ? Object.freeze({
    id: card.key,
    title: card.label,
    description: card.blurb,
    effects: card.effects,
    cards: Object.freeze([card])
}) : null;

export const RUN_MODIFIERS = Object.freeze(RUN_MODIFIER_CARDS.map(toLegacyModifier));

export function getRunModifierById(id) {
    return toLegacyModifier(getRunCardByKey(id));
}

export function pickRunModifier(random = Math.random, options = {}) {
    const seed = options.seed ?? `run-${Math.floor(random() * 0xffffffff).toString(16)}`;
    const state = createRunCardState(seed, options);
    return Object.freeze({
        id: state.cards[0]?.key ?? 'none',
        title: state.cards.map((card) => card.label).join(' + '),
        description: state.cards.map((card) => card.blurb).join(' '),
        seed: state.seed,
        cards: state.cards,
        effects: state.effects
    });
}
