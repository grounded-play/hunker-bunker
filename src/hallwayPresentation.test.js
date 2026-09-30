import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { hallwayMarkerGeometry, planHallwayRouteDressing } from './hallwayPresentation.js';
import { ThreeGame } from './threeGame.js';

const grid = (rows) => rows.map((row) => [...row]);

describe('hallway route presentation', () => {
    it('derives the long axis and open width without blocking the route', () => {
        const horizontal = grid([
            '#######',
            '.......',
            '.......',
            '.......',
            '#######'
        ]);
        expect(hallwayMarkerGeometry(horizontal, { x: 3, y: 2 })).toEqual({
            axis: 'x',
            rotationY: Math.PI / 2,
            width: 3
        });
    });

    it('activates authored dressing and lighting rhythm deterministically', () => {
        const corridor = grid([
            '###.###',
            '###.###',
            '###.###',
            '###.###',
            '###.###'
        ]);
        const metadata = { wayfindingMarkers: [{
            x: 3,
            y: 2,
            dressingKit: 'pipes_and_cable_trays',
            lightingRhythm: 'warning'
        }] };
        const first = planHallwayRouteDressing(metadata, corridor);
        expect(first).toEqual(planHallwayRouteDressing(metadata, corridor));
        expect(first[0]).toMatchObject({
            axis: 'z',
            structure: 'frame',
            cableCount: 2,
            signalCount: 3,
            signalColor: 0xff493d
        });
    });

    it('uses rail silhouettes for exposed causeways and ignores invalid markers', () => {
        const corridor = grid(['.....']);
        const plans = planHallwayRouteDressing({ wayfindingMarkers: [
            { x: 2, y: 0, dressingKit: 'canyon_railing', lightingRhythm: 'sparse' },
            { x: 9, y: 9, dressingKit: 'bunker_utility', lightingRhythm: 'even' }
        ] }, corridor);
        expect(plans).toHaveLength(1);
        expect(plans[0]).toMatchObject({ structure: 'rail', cableCount: 0, signalCount: 1 });
    });

    it('falls back safely when catalog metadata is from a newer build', () => {
        const corridor = grid(['.....']);
        expect(planHallwayRouteDressing({ wayfindingMarkers: [{
            x: 2,
            y: 0,
            dressingKit: 'future_kit',
            lightingRhythm: 'future_rhythm'
        }] }, corridor)[0]).toMatchObject({
            structure: 'frame',
            cableCount: 1,
            signalCount: 2,
            signalColor: 0x71cddf
        });
    });

    it('mounts one bounded instance pool per visual layer with no collision tags', () => {
        const corridor = grid([
            '###.###',
            '###.###',
            '###.###',
            '###.###',
            '###.###'
        ]);
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const structureMaterial = new THREE.MeshStandardMaterial();
        const cableMaterial = new THREE.MeshStandardMaterial();
        const signalMaterial = new THREE.MeshBasicMaterial();
        const game = {
            chunkSize: 7,
            wallHeight: 2.8,
            hallwayDressingGeometry: geometry,
            hallwayDressingMaterial: structureMaterial,
            hallwayCableMaterial: cableMaterial,
            hallwaySignalMaterial: signalMaterial
        };
        const group = new THREE.Group();
        ThreeGame.prototype.addHallwayRouteDressing.call(game, group, 0, 0, {
            wayfindingMarkers: [{
                x: 3,
                y: 2,
                dressingKit: 'pipes_and_cable_trays',
                lightingRhythm: 'warning'
            }]
        }, corridor);

        expect(group.children).toHaveLength(3);
        expect(group.children.map((child) => child.count)).toEqual([3, 2, 3]);
        expect(group.children.every((child) => !child.userData.isWall && !child.userData.isSolidProp)).toBe(true);
        expect(group.children.filter((child) => child.userData.isHallwayRouteStructurePool)).toHaveLength(1);
        expect(group.children.filter((child) => child.userData.isHallwayRouteCablePool)).toHaveLength(1);
        expect(group.children.filter((child) => child.userData.isHallwayRouteSignalPool)).toHaveLength(1);

        geometry.dispose();
        structureMaterial.dispose();
        cableMaterial.dispose();
        signalMaterial.dispose();
    });
});
