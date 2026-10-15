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
    it('discovers prop emitters but leaves fungal enemy behavior on its existing path', () => {
        const runtime = new WorldEmitterRuntime();
        const pipe = pipeAt();
        const enemy = new THREE.Object3D();
        new THREE.Group().add(enemy);
        enemy.userData = { type: 'fungal_spore_vent', scatterKey: 'fungal:a' };
        runtime.syncSources([pipe, enemy]);
        expect(runtime.sources.has('pipe:0:0')).toBe(true);
        expect(runtime.sources.has('fungal:a')).toBe(false);
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
});
