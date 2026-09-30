import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

function matrixScaleAndPosition(mesh, index = 0) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    mesh.getMatrixAt(index, matrix);
    matrix.decompose(position, quaternion, scale);
    return { matrix, position, scale };
}

function makeGame({ destroyed = false } = {}) {
    const wallPool = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 2.8, 1),
        new THREE.MeshBasicMaterial(),
        1
    );
    const capPool = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.08, 1),
        new THREE.MeshBasicMaterial(),
        1
    );
    wallPool.setMatrixAt(0, new THREE.Matrix4().compose(
        new THREE.Vector3(4, 0.41, 2),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 0.82 / 2.8, 1)
    ));
    capPool.setMatrixAt(0, new THREE.Matrix4().makeTranslation(4, 0.86, 2));
    const record = {
        destroyed,
        wallKey: '4,2',
        worldX: 4,
        worldZ: 2,
        instancedMesh: wallPool,
        instanceIndex: 0,
        roomWallPresentation: {
            offsetX: 0,
            offsetZ: 0,
            rotationY: 0,
            fullHeightScale: 1
        }
    };
    const group = new THREE.Group();
    group.userData.roomCutawayPresentation = {
        quadrant: 'se',
        wallRecords: [record],
        capPool,
        capIndexByWallKey: new Map([['4,2', 0]]),
        cutawayWallKeysByQuadrant: {
            se: new Set(['4,2']),
            sw: new Set(),
            ne: new Set(),
            nw: new Set()
        }
    };
    return {
        game: {
            cameraAzimuth: (-Math.PI * 3) / 4,
            _roomCutawayQuadrant: 'se',
            wallHeight: 2.8,
            chunkMeshes: new Map([['0,0', group]])
        },
        wallPool,
        capPool
    };
}

describe('ThreeGame room cutaway rotation', () => {
    it('restores the old foreground wall without remounting its instance pool', () => {
        const { game, wallPool, capPool } = makeGame();
        const changed = ThreeGame.prototype.updateRoomCutawaysForCamera.call(game);
        const wall = matrixScaleAndPosition(wallPool);
        const cap = matrixScaleAndPosition(capPool);

        expect(changed).toBe(1);
        expect(game._roomCutawayQuadrant).toBe('nw');
        expect(wall.scale.y).toBeCloseTo(1, 5);
        expect(wall.position.y).toBeCloseTo(1.4, 5);
        expect([cap.matrix.elements[0], cap.matrix.elements[5], cap.matrix.elements[10]])
            .toEqual([0, 0, 0]);
    });

    it('never resurrects a destroyed room wall or its cap during rotation', () => {
        const { game, wallPool, capPool } = makeGame({ destroyed: true });
        ThreeGame.prototype.updateRoomCutawaysForCamera.call(game);

        const wall = matrixScaleAndPosition(wallPool).matrix.elements;
        const cap = matrixScaleAndPosition(capPool).matrix.elements;
        expect([wall[0], wall[5], wall[10]]).toEqual([0, 0, 0]);
        expect([cap[0], cap[5], cap[10]]).toEqual([0, 0, 0]);
    });
});
