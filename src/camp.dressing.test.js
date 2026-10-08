import { describe, expect, it } from 'vitest';
import { CAMP_DRESSING_MODELS } from './camp.js';
import { ENEMY_3D_MODELS } from './enemy3dOverlay.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const overlay = readFileSync(fileURLToPath(new URL('./world3dOverlay.js', import.meta.url)), 'utf8');

describe('camp 3D dressing', () => {
    it('covers all three camps', () => {
        expect(Object.keys(CAMP_DRESSING_MODELS).sort())
            .toEqual(['camp_meridian', 'camp_tallow', 'camp_vesper']);
    });

    it('only references models that are actually registered', () => {
        // An unregistered type silently yields no model, so the camp would just
        // be missing dressing with nothing reported anywhere.
        for (const [camp, specs] of Object.entries(CAMP_DRESSING_MODELS)) {
            for (const spec of specs) {
                const registered = overlay.includes(`${spec.type}:`)
                    || Object.prototype.hasOwnProperty.call(ENEMY_3D_MODELS, spec.type);
                expect(registered, `${camp} references unregistered model ${spec.type}`).toBe(true);
            }
        }
    });

    it('places dressing clear of the camp centre where the leader stands', () => {
        for (const [camp, specs] of Object.entries(CAMP_DRESSING_MODELS)) {
            for (const spec of specs) {
                const dist = Math.hypot(spec.x, spec.z);
                expect(dist, `${camp}/${spec.type} sits on the camp centre`).toBeGreaterThan(2.5);
            }
        }
    });

    it('gives each camp a distinct palette', () => {
        // Shared props would undo the point: the camps read the same today
        // precisely because their dressing does not differentiate them.
        const intentionallyShared = new Set([
            'life_card_table', 'life_memorial_board', 'life_latrine_stall',
            'life_pipe_hammock', 'life_sanitation_bidet', 'life_vulval_drain_sump'
        ]);
        const all = Object.values(CAMP_DRESSING_MODELS).flat().map((s) => s.type)
            .filter((type) => !intentionallyShared.has(type));
        expect(new Set(all).size).toBe(all.length);
    });

    it('gives every camp the shared daily-life layer from the prompt sheet', () => {
        const shared = [
            'life_card_table', 'life_memorial_board', 'life_latrine_stall',
            'life_pipe_hammock', 'life_sanitation_bidet', 'life_vulval_drain_sump'
        ];
        for (const specs of Object.values(CAMP_DRESSING_MODELS)) {
            const types = new Set(specs.map(({ type }) => type));
            for (const type of shared) expect(types.has(type), type).toBe(true);
        }
    });
});
