import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// 2026-10-05: the game is 3D. A prop with a model never draws its 2D sprite;
// the sprite keeps owning gameplay state, and only reappears if the model fails.
describe('no 2D stand-ins for props with 3D models', () => {
    const spriteProp = () => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
        sprite.userData = { type: 'prop_bunker_supplies', isSolidProp: true };
        new THREE.Group().add(sprite);
        return sprite;
    };

    it('hides the sprite material (not the object) when a 3D model is deferred', () => {
        const sprite = spriteProp();
        ThreeGame.prototype.deferWorld3dReplacement.call({}, sprite, 'prop_bunker_supplies');
        expect(sprite.material.visible).toBe(false);
        // The object stays visible so collision and targeting still treat it as present.
        expect(sprite.visible).toBe(true);
        expect(sprite.userData.world3dModelType).toBe('prop_bunker_supplies');
    });

    it('leaves sprites without a model alone', () => {
        const sprite = spriteProp();
        ThreeGame.prototype.deferWorld3dReplacement.call({}, sprite, 'definitely_not_a_model');
        expect(sprite.material.visible).toBe(true);
    });

    it('reveals the sprite as a fallback when the model fails to load', async () => {
        const sprite = spriteProp();
        const game = {
            deferWorld3dReplacement: ThreeGame.prototype.deferWorld3dReplacement,
            revealWorld3dFallback: ThreeGame.prototype.revealWorld3dFallback,
            createWorld3dModel: vi.fn(async () => null)
        };
        game.deferWorld3dReplacement(sprite, 'prop_bunker_supplies');
        await ThreeGame.prototype.setupWorld3dReplacement.call(game, sprite, 'prop_bunker_supplies');
        expect(sprite.material.visible).toBe(true);

        const throwing = { ...game, createWorld3dModel: vi.fn(async () => { throw new Error('missing'); }) };
        const second = spriteProp();
        throwing.deferWorld3dReplacement(second, 'prop_bunker_supplies');
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await ThreeGame.prototype.setupWorld3dReplacement.call(throwing, second, 'prop_bunker_supplies');
        warn.mockRestore();
        expect(second.material.visible).toBe(true);
    });

    it('resolves 2D types whose subject ships as a GLB under another name', () => {
        const sprite = spriteProp();
        ThreeGame.prototype.deferWorld3dReplacement.call({}, sprite, 'body_human_frozen_suit');
        expect(sprite.userData.world3dModelType).toBe('prop_body_human_frozen');
        expect(sprite.material.visible).toBe(false);
    });
});

