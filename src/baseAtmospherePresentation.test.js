import { describe, expect, it } from 'vitest';
import {
    createBaseAtmosphereIndicator,
    disposeBaseAtmosphereIndicator,
    updateBaseAtmosphereIndicator
} from './baseAtmospherePresentation.js';

describe('base atmosphere indicator', () => {
    it('projects pressure and breach state into five emissive segments', () => {
        const root = createBaseAtmosphereIndicator();
        expect(updateBaseAtmosphereIndicator(root, {
            state: 'leaking', pressure: 0.42, color: 0xff3b30, label: 'EAST BREACH'
        }, 0.2)).toBe(true);
        expect(root.userData.segments.filter(({ material }) => material.emissiveIntensity > 0)).toHaveLength(3);
        expect(root.userData.atmosphereStatus).toBe('leaking');
        expect(root.userData.statusLabel).toBe('EAST BREACH');
        disposeBaseAtmosphereIndicator(root);
        expect(root.parent).toBeNull();
    });
});
