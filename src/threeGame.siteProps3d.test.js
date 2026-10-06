import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Camp and hive prop sprites name their model in userData.model3d; the game
// draws the model, swaps it when the name changes and mirrors visibility.
describe('camp and hive props in 3D', () => {
    const setup = () => {
        const created = [];
        const game = {
            createWorld3dModel: vi.fn(async (type) => {
                const root = new THREE.Group();
                root.userData.type = type;
                created.push(root);
                return root;
            })
        };
        game.syncSiteProp3d = ThreeGame.prototype.syncSiteProp3d;
        game.syncSiteProps3d = ThreeGame.prototype.syncSiteProps3d;
        const group = new THREE.Group();
        const fire = new THREE.Sprite(new THREE.SpriteMaterial());
        fire.position.set(0.2, 0.4, 0.1);
        fire.userData.model3d = 'prop_camp_cookfire_lit';
        group.add(fire);
        const placard = new THREE.Sprite(new THREE.SpriteMaterial());
        placard.visible = false;
        placard.userData.model3d = 'prop_camp_warning_placard';
        group.add(placard);
        game.camps = [{ built: true, propSprites: { cookfire: fire, placard } }];
        game.hives = [];
        return { game, group, fire, placard, created };
    };
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('hides the billboard and stands the model on the ground at the sprite', async () => {
        const { game, group, fire } = setup();
        game.syncSiteProps3d();
        await flush();
        expect(fire.material.visible).toBe(false);
        const root = fire.userData.site3d.root;
        expect(root.userData.type).toBe('prop_camp_cookfire_lit');
        expect(root.parent).toBe(group);
        expect(root.position.toArray()).toEqual([0.2, 0, 0.1]);
    });

    it('follows the sprite visibility as camp state changes', async () => {
        const { game, placard } = setup();
        game.syncSiteProps3d();
        await flush();
        game.syncSiteProps3d();
        expect(placard.userData.site3d.root.visible).toBe(false);
        placard.visible = true;
        game.syncSiteProps3d();
        expect(placard.userData.site3d.root.visible).toBe(true);
    });

    it('swaps the model when the state names a different one (lit -> doused)', async () => {
        const { game, fire } = setup();
        game.syncSiteProps3d();
        await flush();
        const lit = fire.userData.site3d.root;
        fire.userData.model3d = 'prop_camp_cookfire';
        game.syncSiteProps3d();
        await flush();
        expect(lit.parent).toBeNull();
        expect(fire.userData.site3d.root.userData.type).toBe('prop_camp_cookfire');
    });

    it('keeps the billboard when the model fails to load', async () => {
        const { game, fire } = setup();
        game.createWorld3dModel = vi.fn(async () => null);
        game.syncSiteProps3d();
        await flush();
        game.syncSiteProps3d();
        expect(fire.material.visible).toBe(true);
    });
});
