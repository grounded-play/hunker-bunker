import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    CHAPTER_ORDER,
    CHAPTERS,
    ENDINGS,
    ITEMS,
    GAME_OVERS,
    BRANCH_CINEMATICS,
    RAIL_CINEMATICS,
    INTRO_CINEMATIC,
    resolveCinematicSteps,
    resolveCinematicAssets
} from './content.js';
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

    it('every non-empty resolveCinematicSteps result resolves to a known cinematic asset', () => {
        const priorState = createRunState();
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots) {
                const steps = resolveCinematicSteps(hotspot.id, priorState);
                const assets = resolveCinematicAssets(steps);
                expect(assets.length).toBe(steps.length);
            }
        }
    });

    it('every produced branch cinematic ships both a video and an image', () => {
        for (const entry of Object.values(BRANCH_CINEMATICS)) {
            expect(entry.video).toMatch(/\.mp4$/);
            expect(entry.image).toMatch(/\.png$/);
        }
    });

    it('rail cinematics ship video clips for R1-R8 and image fallbacks for R1-R9', () => {
        for (const [key, entry] of Object.entries(RAIL_CINEMATICS)) {
            expect(entry.image).toMatch(/\.png$/);
            if (key !== 'R9') {
                expect(entry.video).toMatch(/\.mp4$/);
            }
        }
        expect(Object.keys(RAIL_CINEMATICS).sort()).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9']);
    });

    it('the intro cinematic declares a video', () => {
        expect(INTRO_CINEMATIC.video).toMatch(/Intro\.mp4$/);
    });

    it('picks the branch clip that matches what the player actually did', () => {
        const base = createRunState();

        // The fork plays its own branch clip; R1 is the badge reader and
        // belongs to the beat where Elias actually walks in.
        expect(resolveCinematicSteps('enter_now', base)).toEqual(['C1-B']);
        expect(resolveCinematicSteps('reply_to_lucia', base)).toEqual(['C1-A']);
        expect(resolveCinematicSteps('badge_in', base)).toEqual(['R1']);

        expect(resolveCinematicSteps('proceed_to_kiosk', base)).toEqual(['C3-B', 'R3']);
        const documented = { ...base, flags: { ...base.flags, keptNotebook: true } };
        expect(resolveCinematicSteps('proceed_to_kiosk', documented)).toEqual(['C3-A', 'R3']);

        expect(resolveCinematicSteps('follow_utility_map', base)).toEqual(['C4-A', 'R4', 'R5']);
        const calledOnly = { ...base, flags: { ...base.flags, luciaCallback: true } };
        expect(resolveCinematicSteps('follow_utility_map', calledOnly)).toEqual(['C4-B', 'R4', 'R5']);

        expect(resolveCinematicSteps('give_up', base)).toEqual(['C4-C']);
        expect(resolveCinematicSteps('walk_away', base)).toEqual(['C5-A', 'R8']);
        expect(resolveCinematicSteps('expose_profile', base)).toEqual(['C5-B', 'R9']);
        expect(resolveCinematicSteps('sever_trunk', base)).toEqual(['C5-C', 'R6', 'R7']);
        expect(resolveCinematicSteps('rescue_recenter', base)).toEqual(['C6-A']);
        expect(resolveCinematicSteps('rescue_fumble', base)).toEqual(['C6-B']);
        expect(resolveCinematicSteps('read_diagram', base)).toEqual([]);
    });

    it('ships the art every item and ending declares', () => {
        const declared = [
            ...Object.values(ITEMS).map((item) => item.icon),
            ...Object.values(ENDINGS).map((ending) => ending.art),
            ...Object.values(CHAPTERS).map((chapter) => chapter.bg)
        ].filter((url) => Boolean(url) && !url.startsWith('data:'));

        expect(declared.length).toBeGreaterThan(0);
        for (const url of declared) {
            expect(existsSync(resolve('public', url.replace(/^\//, ''))), url).toBe(true);
        }
    });

    it('gives every item an icon so the inventory never falls back to bare text', () => {
        for (const [id, item] of Object.entries(ITEMS)) {
            expect(item.icon, id).toBeTruthy();
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
