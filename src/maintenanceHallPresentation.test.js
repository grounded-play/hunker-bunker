import { describe, expect, it } from 'vitest';
import { buildGrammarRoomChunk } from './roomGrammarChunk.js';
import { planRoomDressing } from './roomDressing.js';
import { buildRoomDressingGroup, hideRoomDressingSupport } from './roomDressingRenderer.js';
import { grammarWallExterior } from './roomGrammarBreach.js';
import { registerDressingNetwork, applyDressingNetworkEvent } from './dressingNetwork.js';

describe('finished maintenance-hall presentation (G2/G4 vertical slice)', () => {
    it('generates an engineering maintenance hall with functional subzones and key-art dressing', async () => {
        const chunk = buildGrammarRoomChunk({
            seed: 7,
            tier: 'standard',
            openings: { north: { open: true, offset: 8 }, south: { open: true, offset: 8 } }
        });
        expect(chunk).toBeDefined();
        const room = chunk.rooms[0];
        expect(room.role).toBe('engineering');
        expect(room.theme).toBe('bunker-utility');
        expect(room.grammar?.modules?.length).toBeGreaterThan(0);

        // Plan dressing using the live dressing planner
        const dressing = planRoomDressing(room, chunk.grid);
        expect(dressing.items.length).toBeGreaterThan(0);

        // Verify key-art assets appear in planned items
        const types = new Set(dressing.items.map(item => item.type));
        const keyArtCandidates = [
            'prop_maintenance_tool_cart',
            'prop_conduit_junction_box',
            'prop_wall_cable_tray_swag',
            'prop_pipe_organ_heat_exchanger',
            'prop_floor_drainage_sump_trough',
            'prop_coolant_drum_leaking_pool',
            'scatter_cable_coil',
            'scatter_bolts'
        ];
        const matched = keyArtCandidates.filter(c => types.has(c));
        expect(matched.length).toBeGreaterThanOrEqual(2);

        // All physical props receive stable v2 identity and 3 HP
        const destructibles = dressing.items.filter(item => item.destructible);
        expect(destructibles.length).toBeGreaterThan(0);
        for (const item of destructibles) {
            expect(item.hp).toBe(3);
            expect(item.id).toContain(':dressing:v2:');
        }

        // Build dressing group and verify draw batch handles
        const group = await buildRoomDressingGroup(dressing.items, {
            loadModel: () => null,
            loadDecalTexture: () => null
        });
        expect(group).toBeDefined();
    });

    it('cleans up wall-mounted fixtures when interior partition modules are breached', async () => {
        const chunk = buildGrammarRoomChunk({
            seed: 7,
            tier: 'standard',
            openings: { north: { open: true, offset: 8 }, south: { open: true, offset: 8 } }
        });
        const room = chunk.rooms[0];
        const metadata = { ...chunk, roomInstances: chunk.rooms };

        // Verify interior module walls are classified as interior (not exterior shell)
        const module = room.grammar.modules[0];
        expect(grammarWallExterior(metadata, module.x, module.y)).toBe(false);

        // Add a mock wall fixture attached to this module cell
        const attachedFixture = {
            id: 'room:dressing:v2:wallProp:prop_conduit_junction_box:0',
            layer: 'wallProp',
            type: 'prop_conduit_junction_box',
            destructible: true,
            hp: 3,
            supportCell: { x: module.x, y: module.y },
            batchInstances: []
        };
        const floorClutter = {
            id: 'room:dressing:v2:clutter:prop_maintenance_tool_cart:1',
            layer: 'clutter',
            type: 'prop_maintenance_tool_cart',
            destructible: true,
            hp: 3,
            supportCell: null,
            batchInstances: []
        };

        const group = {
            userData: {
                roomDressingItems: [attachedFixture, floorClutter]
            }
        };

        // Breach the module wall support
        const removed = hideRoomDressingSupport(group, module.x, module.y);
        expect(removed).toHaveLength(1);
        expect(removed[0]).toBe(attachedFixture);
        expect(attachedFixture.isDestroyed).toBe(true);
        expect(floorClutter.isDestroyed).toBeUndefined();
    });

    it('negotiates co-op identity and reconciles damage for maintenance hall props', () => {
        const chunk = buildGrammarRoomChunk({
            seed: 7,
            tier: 'standard',
            openings: { north: { open: true, offset: 8 }, south: { open: true, offset: 8 } }
        });
        const room = chunk.rooms[0];
        const dressing = planRoomDressing(room, chunk.grid);
        const item = dressing.items.find(i => i.destructible);
        expect(item).toBeDefined();

        item.stableId = item.id;
        const target = { userData: { dressingStableId: item.stableId, propHp: 3, isDestructibleProp: true } };
        const game = {
            isMultiplayer: true,
            _dressingProtocolEnabled: true,
            broadcastSharedWorldEvent: () => {},
            scatterSprites: [target],
            brokenPropScatterKeys: new Set(),
            breakScatterProp: () => {}
        };

        // Register candidate items
        registerDressingNetwork(game, [item]);
        expect(game._dressingManifest.has(item.stableId)).toBe(true);

        // Apply authoritative partial damage
        const damageEvent = {
            event: 'dressing-state',
            originId: 'relay',
            detail: { version: 1, id: item.stableId, hp: 1, revision: 1 }
        };
        const applied = applyDressingNetworkEvent(game, damageEvent);
        expect(applied).toBe(true);
        expect(target.userData.propHp).toBe(1);
    });
});
