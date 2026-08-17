import { describe, it, expect } from 'vitest';

describe('armoryScene module exports', () => {
    it('throws if created without a canvas', async () => {
        const { createArmoryScene } = await import('./armoryScene.js');
        await expect(createArmoryScene(null)).rejects.toThrow(/requires a canvas/);
    });

    it('exports the createArmoryScene function', async () => {
        const mod = await import('./armoryScene.js');
        expect(typeof mod.createArmoryScene).toBe('function');
    });
});
