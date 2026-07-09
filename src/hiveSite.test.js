import { describe, it, expect } from 'vitest';
import { HiveSite } from './hiveSite.js';

// Mock THREE.js scene since we run in Node
class MockScene {
    constructor() { this.children = []; }
    add(child) { this.children.push(child); }
}

globalThis.window = {
    document: {
        createElement: () => ({
            getContext: () => ({
                clearRect: () => {},
                fillRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {}
            }),
            width: 128,
            height: 128
        })
    }
};

describe('Hive Site 3D Visualizer', () => {
    it('initializes hive site properties correctly', () => {
        const scene = new MockScene();
        const hive = new HiveSite(scene, { id: 'hive_suture', label: 'SUTURE HIVE', characterId: 'nahl' });

        expect(hive.id).toBe('hive_suture');
        expect(hive.label).toBe('SUTURE HIVE');
        expect(hive.characterId).toBe('nahl');
        expect(hive.status).toBe('dormant');
        expect(hive.built).toBe(false);
    });
});
