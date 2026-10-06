import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SurvivorCamp } from './camp.js';
import { syncWorld3dReplacement, prepareWorld3dModel } from './world3dOverlay.js';

describe('camp 3D animations and duplicate NPC elimination', () => {
    it('autoplay idle animation mixer when prepareWorld3dModel has clips', () => {
        const model = new THREE.Group();
        model.add(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial()));
        const track = new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 0, 1, 0]);
        const clip = new THREE.AnimationClip('idle', 1, [track]);

        const root = prepareWorld3dModel(model, 'npc_civilian_miner', { height: 1.8, yaw: 0 }, [clip]);
        expect(root.userData.mixer).toBeInstanceOf(THREE.AnimationMixer);
        expect(root.userData.animations).toEqual([clip]);

        const source = new THREE.Sprite();
        source.userData.world3dRoot = root;
        source.userData.yaw = Math.PI / 4;
        expect(syncWorld3dReplacement(source, { delta: 0.1 })).toBe(true);
        expect(root.rotation.y).toBeCloseTo(Math.PI / 4);
    });

    it('hides signature prop billboard placeholders when 3D dressing models attach', async () => {
        const scene = new THREE.Scene();
        const camp = new SurvivorCamp(scene, { id: 'camp_meridian' });
        camp.reveal(10, 20);

        // Before dressing attaches, signature props exist
        expect(Object.keys(camp.signatureProps).length).toBeGreaterThan(0);

        // Simulate dressing models attached
        const dummy3dProp = new THREE.Group();
        camp.dressingModels.push(dummy3dProp);
        camp.updatePropVisuals();

        // Signature props must be hidden so 2D letter boxes do not render
        for (const prop of Object.values(camp.signatureProps)) {
            expect(prop.visible).toBe(false);
        }
    });

    it('allows hiding primitive placeholder workers when real 3D civilians are spawned', () => {
        const scene = new THREE.Scene();
        const camp = new SurvivorCamp(scene, { id: 'camp_tallow' });
        camp.reveal(0, 0);

        expect(camp.campWorkers.length).toBe(2);
        camp.setWorkersVisible(false);
        expect(camp.campWorkers.every((w) => w.mesh.visible === false)).toBe(true);

        // Even after update, workers remain hidden
        camp.update(0.016, 10);
        expect(camp.campWorkers.every((w) => w.mesh.visible === false)).toBe(true);
    });

    it('continues leader pathfinding and updates 3D position/yaw even when 2D sprite is hidden by 3D replacement', () => {
        const scene = new THREE.Scene();
        const camp = new SurvivorCamp(scene, { id: 'camp_meridian' });
        camp.reveal(0, 0);

        // 3D replacement mounts on camp leader
        const root = new THREE.Group();
        camp.npcSprite.userData.world3dRoot = root;
        camp.npcSprite.userData.replacedBy3d = true;
        camp.npcSprite.visible = false; // Hidden because 3D is active

        const initialX = camp.npcPos.x;
        const initialZ = camp.npcPos.z;

        // Force action to walking with distant target
        camp.npcAction = 'walking';
        camp.npcTarget = { x: initialX + 5, z: initialZ + 5, action: 'idle' };

        // Tick camp update
        camp.update(0.5, 10); // Far from player so patrol proceeds

        // Leader must have moved and updated position & yaw
        expect(camp.npcPos.x).not.toBe(initialX);
        expect(camp.npcPos.z).not.toBe(initialZ);
        expect(camp.npcSprite.userData.yaw).toBeDefined();
        expect(Number.isFinite(camp.npcSprite.userData.yaw)).toBe(true);
        expect(root.position.x).toBeCloseTo(camp.npcSprite.position.x);
        expect(root.position.z).toBeCloseTo(camp.npcSprite.position.z);
        // Sprite remains hidden
        expect(camp.npcSprite.visible).toBe(false);
    });
});
