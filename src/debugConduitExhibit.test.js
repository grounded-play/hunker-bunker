import { describe, expect, it } from 'vitest';
import { CONDUIT_EXHIBITS, createConduitExhibit } from './debugConduitExhibit.js';
import { SPLINE_LAYERS, SPLINE_PAINT } from './splineDressingRenderer.js';

const layersOf = (group) => {
    const layers = new Set();
    group.traverse((object) => {
        const attribute = object.isMesh && object.userData?.isSplineDressing ? object.geometry.getAttribute('splineLayer') : null;
        if (attribute) for (const value of attribute.array) layers.add(value);
    });
    return layers;
};
const kind = (name) => SPLINE_LAYERS.findIndex((layer) => layer.kind === name);

describe('createConduitExhibit', () => {
    it('shows each area\'s conduits on a three-walled bay, as the router dresses a real room', () => {
        expect(CONDUIT_EXHIBITS.map((exhibit) => exhibit.label)).toHaveLength(4);
        const expected = { bunker: kind('wire'), cryo: kind('pipe'), bio: kind('vein'), camp: kind('vine') };
        for (const exhibit of CONDUIT_EXHIBITS) {
            const group = createConduitExhibit(exhibit.theme);
            expect(layersOf(group), exhibit.label).toContain(expected[exhibit.area]);
            expect(group.children.some((child) => child.userData?.isConduitExhibitWall)).toBe(true);
        }
    });

    it('carries the area finishes: hazard collars in the bunker, bulbs in the camp', () => {
        expect(layersOf(createConduitExhibit('bunker-standard'))).toContain(SPLINE_PAINT.hazardMetal);
        expect(layersOf(createConduitExhibit('camp-tallow'))).toContain(SPLINE_PAINT.bulb);
    });
});
