import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Sprint 53 V7: quest targets wear their quest's object and carry a beacon;
// every way a target leaves the world takes its model and beacon with it.
function makeGame(questId, kind = 'interact') {
    const game = Object.create(ThreeGame.prototype);
    const group = new THREE.Group();
    const scene = new THREE.Scene();
    scene.add(group);
    Object.assign(game, {
        chunkSize: 12,
        scene,
        chunkMeshes: new Map([['0,0', group]]),
        scatterSprites: [],
        player: { position: new THREE.Vector3(3, 0, 3) },
        isGameplayInputActive: () => true,
        isSnailTileWalkable: () => true,
        canOccupyPosition: () => true,
        createScatterInstance: (p) => {
            const s = new THREE.Sprite(new THREE.SpriteMaterial());
            s.position.set(p.x, 0, p.z);
            s.userData = { type: p.type, scatterKey: p.scatterKey };
            return s;
        },
        advanceCampQuestProgress: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        _activeCampQuest: { campId: 'camp_meridian', quest: { id: questId }, kind, props: [], current: 0, target: 3 }
    });
    const camp = { id: 'camp_meridian', pos: { x: 4, z: 4 } };
    return { game, group, camp };
}

// Pretend the stand-in model loaded, as setupWorld3dReplacement would.
function attachFakeModel(sprite) {
    const root = new THREE.Group();
    sprite.parent.add(root);
    sprite.userData.world3dRoot = root;
    return root;
}

describe('quest objects in the world', () => {
    it("wears its quest's stand-in model and carries a beacon in the quest's colour", () => {
        const { game, group, camp } = makeGame('reactor_venting');
        const sprite = game.spawnCampQuestMarkerProp(camp, { type: 'quest_prop', x: 3, z: 3 });
        expect(sprite.userData.world3dModelType).toBe('prop_valve_wheel_fused');
        const beacon = sprite.userData.questBeacon;
        expect(beacon?.parent).toBe(group);
        expect(beacon.position.x).toBe(3);
        expect(beacon.userData.accent).toBe(0xef4444);
    });

    it('takes the model and beacon with it when claimed', () => {
        const { game, group, camp } = makeGame('reactor_venting');
        const sprite = game.spawnCampQuestMarkerProp(camp, { type: 'quest_prop', x: 3, z: 3 });
        game._activeCampQuest.props.push(sprite);
        const root = attachFakeModel(sprite);
        const beacon = sprite.userData.questBeacon;
        expect(game.interactWithCampQuestObject()).toBe(true);
        expect(sprite.parent).toBeNull();
        expect(root.parent).toBeNull();
        expect(beacon.parent).toBeNull();
        expect(group.children).toHaveLength(0);
    });

    it('takes the model and beacon with it when shot', () => {
        const { game, group, camp } = makeGame('spore_cleansing', 'shoot');
        const sprite = game.spawnCampQuestMarkerProp(camp, { type: 'quest_mold', x: 3, z: 3 });
        attachFakeModel(sprite);
        game.destroyCampQuestShootProp(sprite);
        expect(group.children).toHaveLength(0);
    });

    it('marks a kill quest with a landmark that never counts as a target', () => {
        const { game, group, camp } = makeGame('armory_breach', 'kill');
        const landmark = game.spawnCampQuestLandmark(camp, { x: 5, z: 5 });
        expect(landmark.userData.world3dModelType).toBe('prop_oxygen_bottle_cascade_rack');
        expect(game._activeCampQuest.props).not.toContain(landmark);
        expect(game._activeCampQuest.landmarks).toContain(landmark);
        attachFakeModel(landmark);
        game.clearActiveCampQuestEntities();
        expect(group.children).toHaveLength(0);
    });

    it('leaves a quest with no entry on the plain marker', () => {
        const { game, camp } = makeGame('unknown_quest');
        const sprite = game.spawnCampQuestMarkerProp(camp, { type: 'quest_prop', x: 3, z: 3 });
        expect(sprite.userData.world3dModelType).toBeUndefined();
        expect(sprite.userData.questBeacon).toBeTruthy();
    });
});
