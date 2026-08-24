import { describe, expect, it } from 'vitest';
import { summarizeSceneLights, diffLightCounts } from './lightingReport.js';

function light(type, extra = {}) {
    return { isLight: true, type, visible: true, intensity: 1, ...extra };
}

describe('summarizeSceneLights', () => {
    it('counts the lights actually in the scene, by type', () => {
        const scene = { children: [light('PointLight'), light('PointLight'), light('AmbientLight')] };

        expect(summarizeSceneLights(scene)).toMatchObject({
            total: 3,
            byType: { PointLight: 2, AmbientLight: 1 }
        });
    });

    it('does not count a light that has been switched off', () => {
        const scene = { children: [light('PointLight'), light('PointLight', { visible: false })] };

        expect(summarizeSceneLights(scene).total).toBe(1);
    });

    it('counts lights nested under groups', () => {
        const scene = {
            traverse(visitor) {
                visitor({ isLight: false });
                visitor(light('SpotLight'));
            }
        };

        expect(summarizeSceneLights(scene).byType).toEqual({ SpotLight: 1 });
    });

    it('does not count a light left at zero intensity', () => {
        const scene = { children: [light('PointLight', { intensity: 0 })] };

        expect(summarizeSceneLights(scene).total).toBe(0);
    });

    it('survives a missing scene', () => {
        expect(summarizeSceneLights(null)).toMatchObject({ total: 0, byType: {} });
    });
});

describe('diffLightCounts', () => {
    it('reports a type whose lights went away', () => {
        const before = { total: 4, byType: { PointLight: 3, AmbientLight: 1 } };
        const after = { total: 2, byType: { PointLight: 1, AmbientLight: 1 } };

        expect(diffLightCounts(before, after)).toEqual([{ type: 'PointLight', before: 3, after: 1 }]);
    });

    it('reports a type that disappeared entirely', () => {
        const before = { total: 1, byType: { SpotLight: 1 } };
        const after = { total: 0, byType: {} };

        expect(diffLightCounts(before, after)).toEqual([{ type: 'SpotLight', before: 1, after: 0 }]);
    });

    it('says nothing when lights were added', () => {
        expect(diffLightCounts({ byType: { PointLight: 1 } }, { byType: { PointLight: 5 } })).toEqual([]);
    });

    it('says nothing without a previous reading', () => {
        expect(diffLightCounts(null, { byType: { PointLight: 1 } })).toEqual([]);
    });
});
