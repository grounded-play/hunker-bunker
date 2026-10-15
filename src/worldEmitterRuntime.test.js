import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPropFx } from './propFx.js';
import { EMITTER_PHASE } from './worldEmitters.js';
import { WorldEmitterRuntime } from './worldEmitterRuntime.js';

function pipeAt(x = 0, z = 0) {
    const parent = new THREE.Group();
    const sprite = new THREE.Object3D();
    sprite.position.set(x, 0, z);
    sprite.userData = { type: 'prop_pipe_rupture', scatterKey: `pipe:${x}:${z}` };
    parent.add(sprite);
    const root = new THREE.Group();
    root.position.copy(sprite.position);
    const model = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    root.add(model);
    root.userData.propFx = createPropFx(root, model, 'prop_pipe_rupture');
    parent.add(root);
    sprite.userData.world3dRoot = root;
    return sprite;
}

describe('WorldEmitterRuntime', () => {
    it('discovers both prop emitters and a virtual fungal source', () => {
        const runtime = new WorldEmitterRuntime();
        const pipe = pipeAt();
        const enemy = new THREE.Object3D();
        new THREE.Group().add(enemy);
        enemy.userData = { type: 'fungal_spore_vent', scatterKey: 'fungal:a' };
        runtime.syncSources([pipe, enemy]);
        expect(runtime.sources.has('pipe:0:0')).toBe(true);
        expect(runtime.sources.has('fungal:a')).toBe(true);
        expect(runtime.sources.get('fungal:a').visual.virtual).toBe(true);
    });

    it('telegraphs a nearby fungal vent before applying infection and poison', () => {
        const runtime = new WorldEmitterRuntime();
        const parent = new THREE.Group();
        const vent = new THREE.Object3D();
        vent.userData = { type: 'fungal_spore_vent', scatterKey: 'fungal:near' };
        parent.add(vent);
        const game = {
            scatterSprites: [vent],
            player: { position: new THREE.Vector3(0.5, 0, 0) },
            canEnemyTargetPlayer: () => true,
            presentWorldEmitterPhase: vi.fn(),
            applyWorldEmitterPayload: vi.fn()
        };

        runtime.update(0.1, game);
        expect(game.presentWorldEmitterPhase).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({ phase: EMITTER_PHASE.TELEGRAPH })
        );
        expect(game.applyWorldEmitterPayload).not.toHaveBeenCalled();
        for (let i = 0; i < 8; i += 1) runtime.update(0.1, game);
        expect(game.applyWorldEmitterPayload).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'infect', reason: 'spore-vent' }),
            expect.any(Object),
            expect.any(THREE.Vector3)
        );
        expect(game.applyWorldEmitterPayload).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'poison', reason: 'spore-vent' }),
            expect.any(Object),
            expect.any(THREE.Vector3)
        );
    });

    it('uses the visible outlet transform for capsule exposure and applies payload on cadence', () => {
        const runtime = new WorldEmitterRuntime();
        const pipe = pipeAt();
        const game = {
            scatterSprites: [pipe],
            player: { position: new THREE.Vector3(1.2, 0, 0) },
            applyWorldEmitterPayload: vi.fn()
        };
        runtime.syncSources(game.scatterSprites);
        const entry = runtime.sources.get('pipe:0:0');
        entry.state.phase = EMITTER_PHASE.ACTIVE;
        entry.state.phaseTime = 0;
        runtime.step(game);
        expect(game.applyWorldEmitterPayload).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'damage', reason: 'steam-burn' }),
            entry,
            expect.objectContaining({ x: expect.any(Number), z: expect.any(Number) })
        );
        runtime.step(game);
        expect(game.applyWorldEmitterPayload).toHaveBeenCalledTimes(1);
    });

    it('keeps simulation cadence independent of render delta', () => {
        const pipe = pipeAt();
        const make = () => ({
            runtime: new WorldEmitterRuntime(),
            game: { scatterSprites: [pipe], player: { position: new THREE.Vector3(99, 0, 99) } }
        });
        const a = make();
        const b = make();
        for (let i = 0; i < 60; i += 1) a.runtime.update(1 / 60, a.game);
        for (let i = 0; i < 10; i += 1) b.runtime.update(0.1, b.game);
        const stateA = [...a.runtime.sources.values()][0].state;
        const stateB = [...b.runtime.sources.values()][0].state;
        expect(stateA.phase).toBe(stateB.phase);
        expect(stateA.phaseTime).toBeCloseTo(stateB.phaseTime, 6);
    });

    it('transfers a destroyed pipe into a timed world hazard after its root is removed', () => {
        const runtime = new WorldEmitterRuntime();
        const pipe = pipeAt();
        const game = {
            scatterSprites: [pipe],
            player: { position: new THREE.Vector3(1.2, 0, 0) },
            applyWorldEmitterPayload: vi.fn()
        };
        runtime.syncSources(game.scatterSprites);
        const children = runtime.destroySource(pipe);
        pipe.userData.world3dRoot.removeFromParent();
        pipe.removeFromParent();
        game.scatterSprites = [];

        expect(children).toEqual([
            expect.objectContaining({ id: 'pipe:0:0:destroyed:jet:0', kind: 'jet' })
        ]);
        expect(runtime.transients.has('pipe:0:0:destroyed:jet:0')).toBe(true);
        runtime.step(game);
        expect(game.applyWorldEmitterPayload).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'damage', amount: 1.5, reason: 'steam-burn-rupture' }),
            expect.any(Object),
            expect.any(THREE.Vector3)
        );
        for (let i = 0; i < 20; i += 1) runtime.step(game);
        expect(runtime.transients.size).toBe(0);
    });

    it('visualizes authoritative outlet transforms, volumes, phases, and destroyed jets on demand', () => {
        const runtime = new WorldEmitterRuntime();
        const scene = new THREE.Scene();
        const pipe = pipeAt();
        const game = {
            scatterSprites: [pipe],
            player: { position: new THREE.Vector3(99, 0, 99) }
        };

        runtime.setDebugVisible(scene, true);
        runtime.step(game);
        const helper = runtime.debugHelpers.get('pipe:0:0');
        expect(scene.getObjectByName('world-emitter-debug')).toBe(runtime.debugGroup);
        expect(helper.root.position.distanceTo(runtime.resolveTransform(runtime.sources.get('pipe:0:0')).position)).toBeLessThan(1e-6);
        expect(helper.volume.geometry.type).toBe('CapsuleGeometry');
        expect(helper.volume.material.color.getHex()).toBe(0x48b9ff);

        runtime.sources.get('pipe:0:0').state.phase = EMITTER_PHASE.ACTIVE;
        runtime.updateDebugVisualization();
        expect(helper.volume.material.color.getHex()).toBe(0xff3b30);

        runtime.destroySource(pipe);
        runtime.updateDebugVisualization();
        expect(runtime.debugHelpers.has('pipe:0:0')).toBe(false);
        expect(runtime.debugHelpers.get('pipe:0:0:destroyed:jet:0').volume.material.color.getHex()).toBe(0xb56cff);
    });

    it('cleans debug GPU resources and scene ownership when disabled or disposed', () => {
        const runtime = new WorldEmitterRuntime();
        const scene = new THREE.Scene();
        const pipe = pipeAt();
        runtime.setDebugVisible(scene, true);
        runtime.step({ scatterSprites: [pipe], player: { position: new THREE.Vector3(99, 0, 99) } });
        const helper = runtime.debugHelpers.get('pipe:0:0');
        const geometryDispose = vi.spyOn(helper.volume.geometry, 'dispose');
        const materialDispose = vi.spyOn(helper.volume.material, 'dispose');

        runtime.setDebugVisible(scene, false);

        expect(geometryDispose).toHaveBeenCalledOnce();
        expect(materialDispose).toHaveBeenCalledOnce();
        expect(runtime.debugHelpers.size).toBe(0);
        expect(runtime.debugGroup).toBeNull();
        expect(scene.getObjectByName('world-emitter-debug')).toBeUndefined();
    });
});
