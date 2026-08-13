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

    it('runs a signal column whose color reads the hive state', () => {
        const scene = new MockScene();
        const hive = new HiveSite(scene, { id: 'hive_relay', label: 'RELAY HIVE', characterId: 'vey' });
        hive.reveal(40, 40);

        // Dormant: hive-native color, visible.
        expect(hive.signalColumn.visible).toBe(true);
        expect(hive.signalMat.color.getHex()).toBe(0x00ffcc);

        hive.setStatus('wounded');
        expect(hive.signalColumn.visible).toBe(true);
        expect(hive.signalMat.color.getHex()).toBe(0xff5a3c);

        hive.setStatus('bonded');
        expect(hive.signalMat.color.getHex()).toBe(0x7dff9a);

        hive.setStatus('slain');
        expect(hive.signalColumn.visible).toBe(false);
    });

    it.each(['rescued', 'aboard'])('keeps a persisted %s hive vacated', (status) => {
        const scene = new MockScene();
        const hive = new HiveSite(scene, { id: 'hive_suture', label: 'SUTURE HIVE', characterId: 'nahl' });
        hive.reveal(24, -12);

        hive.syncFromRecord({ status, extractionLevel: 2, bond: 3, networked: true });
        hive.update(1);

        expect(hive.status).toBe(status);
        expect(hive.signalColumn.visible).toBe(false);
        expect(hive.npcSprite.visible).toBe(false);
        expect(hive.propSprites.eggs.visible).toBe(false);
        expect(hive.coreMat.emissiveIntensity).toBe(0);
        expect(hive.alienDrones.every((drone) => drone.mesh?.visible === false)).toBe(true);
    });
});
