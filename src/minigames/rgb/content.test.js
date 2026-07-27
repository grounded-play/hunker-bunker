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

    it('rail cinematics ship video clips for R1-R8 and image fallbacks for every rail', () => {
        for (const [key, entry] of Object.entries(RAIL_CINEMATICS)) {
            expect(entry.image).toMatch(/\.png$/);
            if (!['R9', 'R10'].includes(key)) {
                expect(entry.video).toMatch(/\.mp4$/);
            }
        }
        expect(Object.keys(RAIL_CINEMATICS).sort()).toEqual([
            'R1', 'R10', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'
        ]);
    });

    it('the intro cinematic declares a video', () => {
        expect(INTRO_CINEMATIC.video).toMatch(/Intro\.mp4$/);
    });

    it('ships every declared cinematic video and fallback image', () => {
        const urls = [
            INTRO_CINEMATIC.video,
            INTRO_CINEMATIC.image,
            ...Object.values(BRANCH_CINEMATICS).flatMap((entry) => [entry.video, entry.image]),
            ...Object.values(RAIL_CINEMATICS).flatMap((entry) => [entry.video, entry.image])
        ].filter(Boolean);

        for (const url of urls) {
            expect(existsSync(resolve('public', url.replace(/^\//, ''))), url).toBe(true);
        }
    });

    it('picks the branch clip that matches what the player actually did', () => {
        const base = createRunState();

        // Leaving the sedan is one continuous branch-to-rail sequence.
        expect(resolveCinematicSteps('enter_now', base)).toEqual(['C1-B', 'R1']);
        expect(resolveCinematicSteps('reply_to_lucia', base)).toEqual(['C1-A', 'R1']);

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
        expect(resolveCinematicSteps('rescue_recenter', base)).toEqual(['C6-A', 'R10']);
        expect(resolveCinematicSteps('rescue_fumble', base)).toEqual(['C6-B']);
        expect(resolveCinematicSteps('read_diagram', base)).toEqual([]);
    });

    it('ships the art every item and ending declares', () => {
        const declared = [
            ...Object.values(ITEMS).map((item) => item.icon),
            ...Object.values(ENDINGS).map((ending) => ending.art),
            ...Object.values(CHAPTERS).map((chapter) => chapter.bg),
            ...Object.values(CHAPTERS).flatMap((chapter) => (
                chapter.hotspots.map((hotspot) => hotspot.cutaway?.image)
            ))
        ].filter((url) => Boolean(url) && !url.startsWith('data:'));

        expect(declared.length).toBeGreaterThan(0);
        for (const url of declared) {
            expect(existsSync(resolve('public', url.replace(/^\//, ''))), url).toBe(true);
        }
    });

    it('gives Chapter 1 object interactions authored cutaways', () => {
        const objectHotspots = CHAPTERS.parking_lot.hotspots.filter((hotspot) => hotspot.object);
        expect(objectHotspots.length).toBeGreaterThan(0);
        for (const hotspot of objectHotspots) {
            expect(hotspot.cutaway?.image, hotspot.id).toMatch(/\/interstitials\/c1\/.+\.png$/);
            expect(hotspot.cutaway?.label, hotspot.id).toBeTruthy();
        }
    });

    it('gives every later chapter multiple authored narrative inserts', () => {
        for (const chapterId of ['incident_review', 'medi_kiosk', 'server_room', 'sector_four']) {
            const authoredImages = new Set(
                CHAPTERS[chapterId].hotspots
                    .map((hotspot) => hotspot.cutaway?.image)
                    .filter(Boolean)
            );
            expect(authoredImages.size, chapterId).toBeGreaterThanOrEqual(2);
        }
    });

    it('gives every object interaction an authored cutaway', () => {
        for (const chapter of Object.values(CHAPTERS)) {
            for (const hotspot of chapter.hotspots.filter((entry) => entry.object)) {
                expect(hotspot.cutaway?.image, `${chapter.id}:${hotspot.id}`).toBeTruthy();
                expect(hotspot.cutaway?.label, `${chapter.id}:${hotspot.id}`).toBeTruthy();
            }
        }
    });

    it('paces the incident review through one decision pair at a time', () => {
        const chapter = CHAPTERS.incident_review;
        const byId = Object.fromEntries(chapter.hotspots.map((hotspot) => [hotspot.id, hotspot]));
        expect(byId.call_marisol.requires.minVisitedOf.ids).toEqual(['keep_notebook', 'surrender_notebook']);
        expect(byId.proceed_to_kiosk.requires.minVisitedOf.ids).toEqual([
            'request_marisol_witness',
            'release_marisol_from_request'
        ]);
        expect(byId.challenge_neutral_language.choice).not.toBe(true);
    });

    it('turns taking the cutters into a committed server-room route', () => {
        const chapter = CHAPTERS.server_room;
        const byId = Object.fromEntries(chapter.hotspots.map((hotspot) => [hotspot.id, hotspot]));
        expect(byId.walk_away.excludesAllOf).toContain('inspect_cutters');
        expect(byId.expose_profile.excludesAllOf).toContain('inspect_cutters');
        expect(byId.sever_trunk.requiresAllOf).toContain('inspect_cutters');
    });

    it('restores the missing narrative setup beats before each major choice', () => {
        const parking = Object.fromEntries(CHAPTERS.parking_lot.hotspots.map((h) => [h.id, h]));
        const warehouse = Object.fromEntries(CHAPTERS.warehouse.hotspots.map((h) => [h.id, h]));
        const kiosk = Object.fromEntries(CHAPTERS.medi_kiosk.hotspots.map((h) => [h.id, h]));
        const server = Object.fromEntries(CHAPTERS.server_room.hotspots.map((h) => [h.id, h]));

        expect(parking.reply_to_lucia.requiresAllOf).toContain('speak_with_marisol');
        expect(warehouse.double_tap_honest.requiresAllOf).toContain('observe_sensor_sweep');
        expect(kiosk.request_billing_agent.requiresAllOf).toContain('deposit_partial_pay');
        expect(server.walk_away.requiresAllOf).toContain('inspect_extinguisher');
        expect(server.expose_profile.requiresAllOf).toContain('inspect_extinguisher');
        expect(server.inspect_cutters.requiresAllOf).toContain('inspect_extinguisher');
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
