import { describe, expect, it } from 'vitest';
import {
    createBedInstallSocketVisual,
    updateBedInstallSocketVisual,
    disposeBedInstallSocketVisual
} from './installSocketPresentation.js';

describe('installSocketPresentation', () => {
    it('creates a bed install socket root with holographic elements and light', () => {
        const root = createBedInstallSocketVisual();
        expect(root).toBeDefined();
        expect(root.userData.isBedInstallSocketVisual).toBe(true);
        expect(root.userData.light).toBeDefined();
        expect(root.userData.wireframe).toBeDefined();
        expect(root.userData.chevron).toBeDefined();
        expect(root.userData.outerRing).toBeDefined();
        expect(root.userData.labelSprite).toBeDefined();
    });

    it('updates visuals based on near proximity and carrying state', () => {
        const root = createBedInstallSocketVisual();
        expect(updateBedInstallSocketVisual(root, { isNear: false, isCarryingTarget: false, elapsedSeconds: 1.0 })).toBe(true);
        const idleIntensity = root.userData.light.intensity;

        updateBedInstallSocketVisual(root, { isNear: true, isCarryingTarget: true, elapsedSeconds: 1.0 });
        const activeIntensity = root.userData.light.intensity;
        expect(activeIntensity).toBeGreaterThan(idleIntensity);
    });

    it('toggles visibility and disposes cleanly without throwing', () => {
        const root = createBedInstallSocketVisual();
        updateBedInstallSocketVisual(root, { visible: false });
        expect(root.visible).toBe(false);

        expect(() => disposeBedInstallSocketVisual(root)).not.toThrow();
    });
});
