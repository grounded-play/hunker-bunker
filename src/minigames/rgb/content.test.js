import { describe, expect, it } from 'vitest';
import { CHAPTER_ORDER, CHAPTERS, ENDINGS, GAME_OVERS } from './content.js';
import {
    EVIDENCE_IDS,
    PAIN_LEVELS,
    createRunState,
    applyChoice,
    chooseFinal
} from './state.js';

describe('content shape', () => {
    it('has an entry for every chapter in CHAPTER_ORDER, in order', () => {
        expect(Object.keys(CHAPTERS)).toEqual(CHAPTER_ORDER);
    });

    it('every hotspot id is unique within its chapter', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            const ids = chapter.hotspots.map((h) => h.id);
            expect(new Set(ids).size).toBe(ids.length);
        }
    });

    it('every hotspot sits inside the 1280x800 logical stage', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                expect(hotspot.x).toBeGreaterThanOrEqual(0);
                expect(hotspot.y).toBeGreaterThanOrEqual(0);
                expect(hotspot.x + hotspot.w).toBeLessThanOrEqual(1280);
                expect(hotspot.y + hotspot.h).toBeLessThanOrEqual(800);
            }
        }
    });

    it('every requiresAllOf reference points at a hotspot id in the same chapter', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            const ids = new Set(chapter.hotspots.map((h) => h.id));
            for (const hotspot of chapter.hotspots) {
                for (const dep of hotspot.requiresAllOf ?? []) {
                    expect(ids.has(dep)).toBe(true);
                }
            }
        }
    });

    it('every declared choice effect is a valid applyChoice id', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                const choice = hotspot.effects?.choice;
                if (!choice) continue;
                expect(() => applyChoice(createRunState(), choice)).not.toThrow();
            }
        }
    });

    it('every declared evidence effect is a canonical evidence id', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                const evidence = hotspot.effects?.evidence;
                if (!evidence) continue;
                expect(EVIDENCE_IDS).toContain(evidence);
            }
        }
    });

    it('every declared pain effect is a canonical pain level', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                const pain = hotspot.effects?.pain;
                if (!pain) continue;
                expect(PAIN_LEVELS).toContain(pain);
            }
        }
    });

    it('every declared finalChoice effect is a valid chooseFinal value', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                const finalChoice = hotspot.effects?.finalChoice;
                if (!finalChoice) continue;
                expect(() => chooseFinal(createRunState(), finalChoice)).not.toThrow();
            }
        }
    });

    it('each chapter but the last points `next` at the following chapter', () => {
        CHAPTER_ORDER.forEach((id, index) => {
            const expectedNext = CHAPTER_ORDER[index + 1] ?? null;
            expect(CHAPTERS[id].next).toBe(expectedNext);
        });
    });

    it('ships an ending card for every resolvable outcome and a game-over card for every failure state', () => {
        expect(Object.keys(ENDINGS).sort()).toEqual(['ashes_survival', 'open_hand', 'system_loop']);
        expect(Object.keys(GAME_OVERS).sort()).toEqual(['crushed', 'lockout']);
    });

    it('every chapter has at least one advancing hotspot to leave it', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            const advancing = chapter.hotspots.filter((h) => h.advances);
            expect(advancing.length).toBeGreaterThan(0);
        }
    });

    it('every game-over retryFrom points at a real hotspot id', () => {
        const allHotspotIds = new Set(
            Object.values(CHAPTERS).flatMap((chapter) => chapter.hotspots.map((h) => h.id))
        );
        for (const gameOver of Object.values(GAME_OVERS)) {
            expect(allHotspotIds.has(gameOver.retryFrom)).toBe(true);
        }
    });
});
