import { describe, it, expect } from 'vitest';
import {
    STORY_LINCHPINS,
    previewCampLeaderLinchpin,
    applyLinchpinResolution
} from './storyLinchpins.js';
import { buildEndingArchive, getLeaderReaction } from './storyArchive.js';
import { getCodexEntry } from './data/codex.js';
import { ACT2_ENDINGS } from './act2Endings.js';
import { Act2Manager } from './act2.js';

describe('Story & World Lore Integration', () => {
    describe('Camp Leader Linchpin Previews & Ending Locks', () => {
        it('previews Briggs arc with appropriate endings locked for both human and hostile verbs', () => {
            const recruitPreview = previewCampLeaderLinchpin('Tank', 'recruit');
            expect(recruitPreview).toMatchObject({
                id: 'briggs_oath',
                resolution: 'honored'
            });
            expect(recruitPreview.locksEndings).toContain(ACT2_ENDINGS.FULL_BROOD);
            expect(recruitPreview.locksEndings).toContain(ACT2_ENDINGS.SCORCHED_SKY);
            expect(recruitPreview.locksEndings).not.toContain(ACT2_ENDINGS.MIXED_CREW);

            const stealPreview = previewCampLeaderLinchpin('Tank', 'steal');
            expect(stealPreview).toMatchObject({
                id: 'briggs_oath',
                resolution: 'broken'
            });
            expect(stealPreview.locksEndings).toContain(ACT2_ENDINGS.CLEAN_ESCAPE);
        });

        it('previews Martha beacon arc with correct endings locked', () => {
            const recruitPreview = previewCampLeaderLinchpin('Scout', 'recruit');
            expect(recruitPreview).toMatchObject({
                id: 'martha_beacon',
                resolution: 'broadcast'
            });
            expect(recruitPreview.locksEndings).toContain(ACT2_ENDINGS.MOTHERSHIP_INFECTION);

            const cullPreview = previewCampLeaderLinchpin('Scout', 'cull');
            expect(cullPreview).toMatchObject({
                id: 'martha_beacon',
                resolution: 'silenced'
            });
            expect(cullPreview.locksEndings).toContain(ACT2_ENDINGS.CLEAN_ESCAPE);
            expect(cullPreview.locksEndings).toContain(ACT2_ENDINGS.ALIEN_EXODUS);
        });

        it('previews Kaelen manifest arc with correct endings locked', () => {
            const recruitPreview = previewCampLeaderLinchpin('Engineer', 'recruit');
            expect(recruitPreview).toMatchObject({
                id: 'kaelen_manifest',
                resolution: 'disclosed'
            });
            expect(recruitPreview.locksEndings).toContain(ACT2_ENDINGS.MOTHERSHIP_INFECTION);
            expect(recruitPreview.locksEndings).toContain(ACT2_ENDINGS.CARRIERS_BARGAIN);

            const turnPreview = previewCampLeaderLinchpin('Engineer', 'turn');
            expect(turnPreview).toMatchObject({
                id: 'kaelen_manifest',
                resolution: 'falsified'
            });
            expect(turnPreview.locksEndings).toContain(ACT2_ENDINGS.CLEAN_ESCAPE);
        });
    });

    describe('Ending Archive Gallery & Causality Attribution', () => {
        it('tracks discovered endings and attributes locked trajectories to specific linchpins', () => {
            const manager = new Act2Manager({ storage: { getItem: () => null, setItem() {} } });
            
            // Resolve two linchpins: Briggs broken and Specimen dismissed
            applyLinchpinResolution(manager, 'briggs_oath', 'broken');
            applyLinchpinResolution(manager, 'scientist_specimen', 'dismissed');

            const state = manager.getState();
            const unlockedAchievements = {
                ending_mixed_crew: { unlockedAt: 1000 },
                ending_clean_escape: { unlockedAt: 2000 }
            };

            const archive = buildEndingArchive(state, unlockedAchievements);
            expect(archive).toHaveLength(10);

            // Clean escape: historically discovered, but locked in current run by briggs_oath:broken
            const cleanEscape = archive.find(e => e.id === 'clean_escape');
            expect(cleanEscape.discovered).toBe(true);
            expect(cleanEscape.causes).toEqual([{ id: 'briggs_oath', resolution: 'broken' }]);

            // Alien exodus: locked in current run by scientist_specimen:dismissed
            const alienExodus = archive.find(e => e.id === 'alien_exodus');
            expect(alienExodus.discovered).toBe(false);
            expect(alienExodus.causes).toEqual([{ id: 'scientist_specimen', resolution: 'dismissed' }]);

            // Mixed crew: discovered and NEVER locked
            const mixedCrew = archive.find(e => e.id === 'mixed_crew');
            expect(mixedCrew.discovered).toBe(true);
            expect(mixedCrew.causes).toEqual([]);
        });
    });

    describe('Inter-Leader Radio Chatter System', () => {
        it('provides characterful radio commentary from leaders reacting to others fates', () => {
            // Briggs reacts to Martha
            const briggsOnMartha = getLeaderReaction('TANK', 'martha_beacon', 'broadcast');
            expect(briggsOnMartha).toContain('Sister Martha');
            expect(briggsOnMartha).toContain('BRIGGS:');

            // Martha reacts to Briggs
            const marthaOnBriggs = getLeaderReaction('SCOUT', 'briggs_oath', 'broken');
            expect(marthaOnBriggs).toContain('abandoned Briggs');
            expect(marthaOnBriggs).toContain('MARTHA:');

            // Kaelen reacts to Tina
            const kaelenOnTina = getLeaderReaction('ENGINEER', 'mayor_tina', 'killed');
            expect(kaelenOnTina).toContain('Tina\'s neural pulse flatlined');
            expect(kaelenOnTina).toContain('KAELEN:');

            // Allied Mayor Tina reacts to Hive Ally choices
            const tinaOnSuture = getLeaderReaction('MAYOR_TINA', 'suture_host_mercy', 'cured_human');
            expect(tinaOnSuture).toContain('burned the spore out');
            expect(tinaOnSuture).toContain('TINA:');
        });
    });

    describe('Codex Catalog Linchpin Coverage', () => {
        it('ensures every registered linchpin resolution has an authored codex entry', () => {
            for (const [linchpinId, linchpin] of Object.entries(STORY_LINCHPINS)) {
                for (const [resKey, res] of Object.entries(linchpin.resolutions)) {
                    expect(res.codexNote, `Missing codexNote for ${linchpinId}:${resKey}`).toBeTruthy();
                    const entry = getCodexEntry(res.codexNote);
                    expect(entry, `Codex entry not found for ${res.codexNote}`).toBeTruthy();
                    expect(entry.category).toBe('PHENOMENON');
                    expect(entry.blurb.length).toBeGreaterThan(20);
                }
            }
        });
    });
});
