import { afterEach, describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

function elementWithClasses(...classes) {
    const values = new Set(classes);
    return { classList: { contains: (name) => values.has(name) } };
}

describe('ThreeGame blocking gameplay overlay gate', () => {
    const previousDocument = globalThis.document;

    afterEach(() => {
        globalThis.document = previousDocument;
    });

    it('uses indexed class/id checks while preserving active and closing states', () => {
        const collections = new Map([
            ['modal', [elementWithClasses('modal', 'hidden')]],
            ['class-intro-overlay', [elementWithClasses('class-intro-overlay', 'is-closing')]],
            ['cinematic-still-overlay', []],
            ['rgb-cinematic--visible', []]
        ]);
        const elements = new Map();
        globalThis.document = {
            body: elementWithClasses(),
            getElementsByClassName: (name) => collections.get(name) ?? [],
            getElementById: (id) => elements.get(id) ?? null,
            querySelector: () => { throw new Error('full-document selector must not run per frame'); }
        };

        expect(ThreeGame.prototype.hasBlockingGameplayOverlay()).toBe(false);

        collections.set('modal', [elementWithClasses('modal')]);
        expect(ThreeGame.prototype.hasBlockingGameplayOverlay()).toBe(true);

        collections.set('modal', [elementWithClasses('modal', 'hidden')]);
        elements.set('cutscene-overlay', elementWithClasses('is-active'));
        expect(ThreeGame.prototype.hasBlockingGameplayOverlay()).toBe(true);
    });
});
