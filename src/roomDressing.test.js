import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { DRESSING_KITS, ROLE_DRESSING, ROLE_VIGNETTES, VIGNETTES, WALL_MOUNT_HEIGHT, dressingKitFor, dressingFamilyForTheme } from './roomDressingKits.js';
import { DRESSING_LIMITS, planRoomDressing } from './roomDressing.js';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';
import { ROOM_BUILD_CATALOG, stampRoomBuild, buildRoomInstanceFromBuild } from './roomBuilds.js';
import { ROOM_THEME_CATALOG, assignRoomThemes } from './roomThemes.js';
import { bindRoomContent } from './roomContent.js';
import { planRoomPopulation } from './roomPopulation.js';

const FLAT_LAYERS = new Set(['wallDecals', 'floorDecals']);

describe('room dressing kits', () => {
    it('uses only shipped assets: sized GLBs for 3D layers, PNGs for decal layers', () => {
        const kits = [...Object.values(DRESSING_KITS), ...Object.values(ROLE_DRESSING)];
        for (const kit of kits) {
            for (const [layer, list] of Object.entries(kit)) {
                for (const type of list) {
                    if (FLAT_LAYERS.has(layer)) {
                        expect(fs.existsSync(`public/${type}.png`), `${layer} ${type}`).toBe(true);
                    } else {
                        const model = WORLD_3D_MODELS[type];
                        expect(model?.url, `${layer} ${type}`).toBeTruthy();
                        expect(fs.existsSync(`public${model.url}`), `${layer} ${type}`).toBe(true);
                    }
                }
            }
        }
        for (const type of Object.keys(WALL_MOUNT_HEIGHT)) expect(WORLD_3D_MODELS[type], type).toBeTruthy();
        for (const group of [...Object.values(VIGNETTES), ...Object.values(ROLE_VIGNETTES)].flat()) {
            for (const type of group) {
                expect(WORLD_3D_MODELS[type]?.url, `vignette ${type}`).toBeTruthy();
                expect(fs.existsSync(`public${WORLD_3D_MODELS[type].url}`), `vignette ${type}`).toBe(true);
            }
        }
    });

    it('keeps the triangle table in step with the GLBs', () => {
        const kits = [...Object.values(DRESSING_KITS), ...Object.values(ROLE_DRESSING)];
        const modelTypes = new Set([
            ...kits.flatMap((kit) => ['wallProps', 'clutter', 'corners'].flatMap((layer) => kit[layer] ?? [])),
            ...[...Object.values(VIGNETTES), ...Object.values(ROLE_VIGNETTES)].flat(2)
        ]);
        for (const type of modelTypes) {
            const buffer = fs.readFileSync(`public${WORLD_3D_MODELS[type].url}`);
            const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
            const uses = new Map();
            for (const node of json.nodes ?? []) if (node.mesh != null) uses.set(node.mesh, (uses.get(node.mesh) ?? 0) + 1);
            let triangles = 0;
            for (const [mesh, count] of uses) {
                for (const primitive of json.meshes[mesh].primitives) {
                    const accessor = primitive.indices != null ? json.accessors[primitive.indices] : json.accessors[primitive.attributes.POSITION];
                    triangles += count * Math.floor(accessor.count / 3);
                }
            }
            expect(DRESSING_TRIANGLES[type], type).toBe(triangles);
        }
    });

    it('gives every theme family a kit with every layer filled', () => {
        for (const theme of ROOM_THEME_CATALOG) {
            const kit = dressingKitFor(theme.id, 'generic');
            for (const layer of Object.keys(DRESSING_LIMITS.typesPerLayer)) {
                expect(kit[layer].length, `${theme.id} ${layer}`).toBeGreaterThan(0);
            }
        }
        expect(dressingFamilyForTheme('giger-cathedral')).toBe('cathedral');
        expect(dressingKitFor('bunker-standard', 'medical').clutter[0]).toBe('prop_surgical_cart');
    });
});

describe('room dressing plan', () => {
    const LONG = { n: 'north', s: 'south', e: 'east', w: 'west' };
    function realRoom(build, biome, seed = 5) {
        let state = seed;
        const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
        const stamp = stampRoomBuild(build, random, {
            openings: Object.fromEntries(build.sockets.map((socket) => [LONG[socket.side], { open: true, offset: 8 }]))
        });
        const [themed] = assignRoomThemes([buildRoomInstanceFromBuild(build, stamp)], { biome, depthTier: 1, random });
        const room = { ...themed, contentPlan: bindRoomContent(themed, build, { chunkSize: stamp.grid.length, activeQuests: [] }) };
        const plan = planRoomPopulation(room, stamp.grid, random);
        return { room, grid: stamp.grid, plan };
    }

    it.each(ROOM_BUILD_CATALOG.map((build) => [build.id, build]))('stuffs %s without touching entrances or hero props', (_id, build) => {
        const biome = ['bio', 'cryo', 'active'].find((b) => build.biomeEligibility?.includes(b)) ?? 'active';
        const { room, grid, plan } = realRoom(build, biome);
        const dressing = planRoomDressing(room, grid, { reserved: plan.reserved, occupied: plan.placements });
        const reserved = new Set(plan.reserved);
        const heroCells = new Set(plan.placements.map(({ x, y }) => `${x},${y}`));

        // Lived-in: dozens of pieces, from a bounded set of types per layer.
        expect(dressing.items.length).toBeGreaterThan(30);
        // GPU budget: 3D dressing triangles per room stay within perimeter + vignette caps.
        const counted = dressing.items.reduce((sum, item) => sum + (DRESSING_TRIANGLES[item.type] ?? 0), 0);
        expect(counted).toBe(dressing.triangles);
        expect(dressing.triangles).toBeLessThanOrEqual(DRESSING_LIMITS.roomTriangles.perimeter + DRESSING_LIMITS.roomTriangles.vignettes);
        for (const item of dressing.items.filter(({ layer }) => layer === 'clutter')) {
            expect(DRESSING_TRIANGLES[item.type], item.type).toBeLessThanOrEqual(DRESSING_LIMITS.maxTrianglesPerModel.clutter);
        }
        const byLayer = {};
        for (const item of dressing.items) (byLayer[item.layer] ??= new Set()).add(item.type);
        expect(byLayer.wallDecal?.size ?? 0).toBeLessThanOrEqual(DRESSING_LIMITS.typesPerLayer.wallDecals);
        expect(byLayer.clutter?.size ?? 0).toBeLessThanOrEqual(DRESSING_LIMITS.typesPerLayer.clutter);

        // Furniture collides: with every blocking piece solid, every floor cell
        // reachable from the doors before dressing must still be reachable.
        const solid = new Set(dressing.items.filter((item) => item.blocking).map(({ x, y }) => `${Math.round(x)},${Math.round(y)}`));
        for (const { x, y } of plan.placements) if (plan.placements.length && grid[y]?.[x] === '#') solid.add(`${x},${y}`);
        const flood = (blockedKeys) => {
            // Door-lane cells sit on the wall line; start from the floor cell nearest the first one.
            const door = room.navigation.doorLanes[0];
            const start = room.interior.filter(({ x, y }) => grid[y][x] === '.' && !blockedKeys.has(`${x},${y}`))
                .sort((a, b) => (Math.abs(a.x - door.x) + Math.abs(a.y - door.y)) - (Math.abs(b.x - door.x) + Math.abs(b.y - door.y)))[0];
            const seen = new Set([`${start.x},${start.y}`]);
            const queue = [start];
            while (queue.length) {
                const { x, y } = queue.pop();
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const k = `${x + dx},${y + dy}`;
                    if (seen.has(k) || blockedKeys.has(k) || grid[y + dy]?.[x + dx] !== '.') continue;
                    seen.add(k);
                    queue.push({ x: x + dx, y: y + dy });
                }
            }
            return seen;
        };
        const before = flood(new Set());
        const after = flood(solid);
        for (const key of before) if (!solid.has(key)) expect(after.has(key), `cut off ${key}`).toBe(true);
        expect(dressing.items.some(({ layer }) => layer === 'vignette')).toBe(true);

        const floorKeys = new Set();
        const vignetteKeys = new Set();
        for (const item of dressing.items) {
            const cell = { x: Math.round(item.x), y: Math.round(item.y) };
            if (item.layer === 'wallDecal') {
                // On a wall face: the cell behind it (opposite the normal) is a wall.
                const wallX = Math.round(item.x - item.normal.x * 0.49 - item.normal.x * 0.51);
                const wallY = Math.round(item.y - item.normal.z * 0.49 - item.normal.z * 0.51);
                expect(grid[wallY][wallX]).toBe('#');
                continue;
            }
            if (item.layer === 'floorDecal') continue;
            const key = `${cell.x},${cell.y}`;
            expect(reserved.has(key), `${item.layer} in reserved ${key}`).toBe(false);
            expect(heroCells.has(key), `${item.layer} on hero prop ${key}`).toBe(false);
            // A vignette spreads 2-3 pieces over its own two cells; nothing
            // else may share a cell.
            if (item.layer === 'vignette') {
                expect(floorKeys.has(key) && !vignetteKeys.has(key), `vignette on another item at ${key}`).toBe(false);
                vignetteKeys.add(key);
            } else {
                expect(floorKeys.has(key), `two floor items in ${key}`).toBe(false);
            }
            floorKeys.add(key);
        }
    });

    it('is deterministic per room and draws nothing from Math.random', () => {
        const { room, grid, plan } = realRoom(ROOM_BUILD_CATALOG[0], 'bio');
        const original = Math.random;
        Math.random = () => { throw new Error('Math.random used'); };
        try {
            const a = planRoomDressing(room, grid, { reserved: plan.reserved, occupied: plan.placements });
            const b = planRoomDressing(room, grid, { reserved: plan.reserved, occupied: plan.placements });
            expect(b).toEqual(a);
        } finally {
            Math.random = original;
        }
    });
});
