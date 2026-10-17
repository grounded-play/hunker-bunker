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

    // Audit 2026-10-16 §13.2: a song card in the field must not leave enemies
    // simulating behind the doors and the video.
    it('freezes play while a song card is on screen', () => {
        const elements = new Map([['song-interstitial', elementWithClasses('song-interstitial', 'hidden')]]);
        globalThis.document = {
            body: elementWithClasses(),
            getElementsByClassName: () => [],
            getElementById: (id) => elements.get(id) ?? null
        };
        expect(ThreeGame.prototype.hasBlockingGameplayOverlay()).toBe(false);
        elements.set('song-interstitial', elementWithClasses('song-interstitial', 'is-open'));
        expect(ThreeGame.prototype.hasBlockingGameplayOverlay()).toBe(true);
    });
});
