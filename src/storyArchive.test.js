import { describe, it, expect } from 'vitest';
import { buildEndingArchive, getLeaderReaction } from './storyArchive.js';
import { Act2Manager } from './act2.js';
import { applyLinchpinResolution, previewCampLeaderLinchpin } from './storyLinchpins.js';

describe('story archive', () => {
    it('distinguishes historical discoveries from current journey locks after reload', () => {
        const records = new Map();
        const storage = { getItem: key => records.get(key), setItem: (key, value) => records.set(key, value) };
        const manager = new Act2Manager({ storage });
        applyLinchpinResolution(manager, 'mayor_tina', 'joined');
        const state = new Act2Manager({ storage }).getState();
        const archive = buildEndingArchive(state, { ending_clean_escape: { unlockedAt: 1 } });
        expect(archive).toHaveLength(10);
        expect(archive.find(e => e.id === 'clean_escape')).toMatchObject({ discovered: true, causes: [{ id: 'mayor_tina', resolution: 'joined' }] });
        expect(archive.find(e => e.id === 'mixed_crew').causes).toEqual([]);
    });

    it('previews the same irreversible resolution applied for every leader discipline', () => {
        for (const discipline of ['Scout', 'Tank', 'Engineer']) {
            const manager = new Act2Manager({ storage: { getItem: () => null, setItem() {} } });
            const choice = previewCampLeaderLinchpin(discipline, 'recruit');
            expect(manager.getState().linchpins).toEqual({});
            applyLinchpinResolution(manager, choice.id, choice.resolution);
            for (const ending of choice.locksEndings) {
                expect(buildEndingArchive(manager.getState()).find(e => e.id === ending).causes)
                    .toContainEqual({ id: choice.id, resolution: choice.resolution });
            }
        }
        expect(previewCampLeaderLinchpin('Scout', 'talk')).toBeNull();
    });

    it('provides authored, characterful radio lines for each leader reacting to other linchpins', () => {
        // Briggs (Tank) reactions
        expect(getLeaderReaction('TANK', 'mayor_tina', 'killed')).toContain('put the roach mayor down');
        expect(getLeaderReaction('TANK', 'mayor_tina', 'joined')).toContain('whispering in your head');
        expect(getLeaderReaction('TANK', 'queen_offer', 'accepted')).toContain('leaving my squad to suffocate');
        expect(getLeaderReaction('TANK', 'martha_beacon', 'broadcast')).toContain('Sister Martha');

        // Martha (Scout) reactions
        expect(getLeaderReaction('SCOUT', 'mayor_tina', 'killed')).toContain('transit tunnels');
        expect(getLeaderReaction('SCOUT', 'queen_offer', 'refused')).toContain('turned your back');
        expect(getLeaderReaction('SCOUT', 'briggs_oath', 'honored')).toContain('Commander Briggs');

        // Kaelen (Engineer) reactions
        expect(getLeaderReaction('ENGINEER', 'mayor_tina', 'killed')).toContain('neural pulse flatlined');
        expect(getLeaderReaction('ENGINEER', 'scientist_specimen', 'proved')).toContain('acoustic damping');
        expect(getLeaderReaction('ENGINEER', 'suture_host_mercy', 'cured_human')).toContain('quarantine clearance');

        // Mayor Tina (allied) reactions
        expect(getLeaderReaction('MAYOR_TINA', 'scientist_specimen', 'proved')).toContain('little snail');
        expect(getLeaderReaction('MAYOR_TINA', 'queen_offer', 'accepted')).toContain('Mother is coming home');

        // Fallback for unmapped choice still yields characterful line
        const fallback = getLeaderReaction('TANK', 'custom_event', 'completed');
        expect(fallback).toContain('BRIGGS:');
        expect(fallback).toContain('custom event, completed');
    });
});

