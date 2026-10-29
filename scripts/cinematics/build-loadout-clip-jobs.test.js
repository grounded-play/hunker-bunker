import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCatalogIdsByType, ITEM_TYPE } from '../../src/itemOwnership.js';
import { ARCHETYPE_SKINS, CLASS_ARCHETYPES } from '../../src/data/classArsenal.js';

const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'loadout-clip-jobs.json'), 'utf8'));

describe('loadout microclip render queue', () => {
    it('tracks the live Armory catalog without rendering combinations', () => {
        const weaponCount = Object.values(CLASS_ARCHETYPES).flat().length
            + Object.values(ARCHETYPE_SKINS).flat().length;
        const badgeCount = getCatalogIdsByType(ITEM_TYPE.DECAL).length * 3;
        const charmCount = getCatalogIdsByType(ITEM_TYPE.CHARM).length * 3;
        const combinations = Object.entries(CLASS_ARCHETYPES).reduce((total, [, archetypes]) => {
            const classWeapons = archetypes.reduce((count, archetype) => count + 1 + ARCHETYPE_SKINS[archetype].length, 0);
            return total + classWeapons * getCatalogIdsByType(ITEM_TYPE.DECAL).length * getCatalogIdsByType(ITEM_TYPE.CHARM).length;
        }, 0);

        expect(manifest.counts).toEqual({
            weapon: weaponCount,
            badge: badgeCount,
            charm: charmCount,
            total: weaponCount + badgeCount + charmCount,
            combinationRendersAvoided: combinations
        });
        expect(new Set(manifest.jobs.map((job) => job.id)).size).toBe(manifest.jobs.length);
    });

    it('gives every clip physical truth, class identity, endpoints and motion', () => {
        for (const job of manifest.jobs) {
            expect(fs.existsSync(path.join(root, job.physicalTruth.sourcePlate)), job.id).toBe(true);
            expect(fs.existsSync(path.join(root, job.firstFrame.references[0])), job.id).toBe(true);
            expect(job.propPass.source, job.id).toBe(job.physicalTruth.sourcePlate);
            expect(job.firstFrame.plate, job.id).toBe(job.physicalTruth.sourcePlate);
            expect(job.identityLock, job.id).toContain('IDENTITY LOCK');
            expect(job.identityLock, job.id).toContain('PROP LOCK');
            expect(job.action, job.id).toBeTruthy();
            expect(job.lastFrame, job.id).toBeTruthy();
            expect(job.durationSec, job.id).toBe(2.25);
            expect(job.generateSound, job.id).toBe(false);
        }
    });

    it('renders shared badges and charms once for every player class', () => {
        for (const slot of ['badge', 'charm']) {
            const itemIds = new Set(manifest.jobs.filter((job) => job.slot === slot).map((job) => job.itemId));
            for (const itemId of itemIds) {
                const classes = manifest.jobs
                    .filter((job) => job.slot === slot && job.itemId === itemId)
                    .map((job) => job.class)
                    .sort();
                expect(classes, `${slot}:${itemId}`).toEqual(['ENGINEER', 'SCOUT', 'TANK']);
            }
        }
    });
});
