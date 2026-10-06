#!/usr/bin/env node
/**
 * Lived-in world M3 baseline (docs/planning/sprint-49-lived-in-world-continuation.md):
 * what each authored room costs to dress, before any density change.
 *
 *     node scripts/room-density-probe.mjs                 # summary to stdout
 *     node scripts/room-density-probe.mjs --out <file>    # also write the JSON report
 *     node scripts/room-density-probe.mjs --area-budget   # same rooms with the M3 area budget
 *
 * Every populated room is stamped from ROOM_BUILD_CATALOG, so this stamps each
 * build in each biome over a fixed seed set, themes it and plans its
 * population exactly as ThreeGame.buildChunk does, then prices every placement
 * from asset data: a GLB costs one draw call per mesh primitive and its index
 * count / 3 triangles; a sprite or decal costs one draw call and two triangles.
 *
 * This is a content-cost estimate, not a GPU measurement: it ignores
 * instancing, material batching, frustum culling, shadows and the walls and
 * floor themselves. It is the baseline the [Deck] capture is compared against.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOM_BUILD_CATALOG, stampRoomBuild, buildRoomInstanceFromBuild } from '../src/roomBuilds.js';
import { assignRoomThemes } from '../src/roomThemes.js';
import { bindRoomContent } from '../src/roomContent.js';
import { planRoomPopulation, areaRoomObjectLimit } from '../src/roomPopulation.js';
import { WORLD_3D_MODELS } from '../src/world3dOverlay.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIOMES = ['active', 'cryo', 'bio', 'cave'];
const SEEDS = 50;
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : null;
const areaBudget = args.includes('--area-budget');

function seeded(seed) {
    let state = (seed * 2654435761) >>> 0 || 1;
    return () => {
        state ^= state << 13; state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5; state >>>= 0;
        return state / 4294967296;
    };
}

const glbCostCache = new Map();
function costOf(type) {
    const url = WORLD_3D_MODELS[type]?.url;
    if (!url) return { drawCalls: 1, triangles: 2, source: 'sprite' };
    if (glbCostCache.has(url)) return glbCostCache.get(url);
    const file = path.join(ROOT, 'public', url);
    let cost = { drawCalls: 1, triangles: 2, source: 'missing-glb' };
    if (fs.existsSync(file)) {
        const buffer = fs.readFileSync(file);
        const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
        let drawCalls = 0;
        let triangles = 0;
        const meshUses = new Map();
        for (const node of json.nodes ?? []) {
            if (node.mesh != null) meshUses.set(node.mesh, (meshUses.get(node.mesh) ?? 0) + 1);
        }
        for (const [meshIndex, uses] of meshUses) {
            for (const primitive of json.meshes[meshIndex].primitives) {
                drawCalls += uses;
                const count = primitive.indices != null
                    ? json.accessors[primitive.indices].count
                    : json.accessors[primitive.attributes.POSITION].count;
                triangles += uses * Math.floor(count / 3);
            }
        }
        cost = { drawCalls, triangles, source: 'glb' };
    }
    glbCostCache.set(url, cost);
    return cost;
}

const rooms = [];
for (const build of ROOM_BUILD_CATALOG) {
    for (const biome of BIOMES) {
        for (let seed = 0; seed < SEEDS; seed += 1) {
            const random = seeded(seed * 7919 + build.id.length * 31 + BIOMES.indexOf(biome));
            let stamped;
            try {
                stamped = stampRoomBuild(build, random);
            } catch {
                continue;
            }
            const [themed] = assignRoomThemes([buildRoomInstanceFromBuild(build, stamped)], { biome, depthTier: seed % 4, random });
            const room = { ...themed, contentPlan: bindRoomContent(themed, build, { chunkSize: stamped.grid.length, activeQuests: [] }) };
            const plan = planRoomPopulation(room, stamped.grid, random, { areaBudget });
            const floorCells = room.interior.filter(({ x, y }) => stamped.grid[y]?.[x] === '.').length;
            let drawCalls = 0;
            let triangles = 0;
            for (const placement of plan.placements) {
                if (placement.kind === 'pickup') continue;
                const cost = costOf(placement.type);
                drawCalls += cost.drawCalls;
                triangles += cost.triangles;
            }
            rooms.push({
                build: build.id,
                biome,
                seed,
                theme: room.theme,
                floorCells,
                areaLimit: areaRoomObjectLimit(floorCells),
                objects: plan.placements.filter(({ kind }) => kind !== 'grounding-decal' && kind !== 'pickup').length,
                decals: plan.placements.filter(({ kind }) => kind === 'grounding-decal').length,
                drawCalls,
                triangles
            });
        }
    }
}

const percentile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};
const summarize = (list) => ({
    rooms: list.length,
    floorCells: { min: Math.min(...list.map((r) => r.floorCells)), max: Math.max(...list.map((r) => r.floorCells)) },
    objects: { mean: +(list.reduce((s, r) => s + r.objects, 0) / list.length).toFixed(2), max: Math.max(...list.map((r) => r.objects)) },
    areaLimit: { min: Math.min(...list.map((r) => r.areaLimit)), max: Math.max(...list.map((r) => r.areaLimit)) },
    drawCalls: { mean: +(list.reduce((s, r) => s + r.drawCalls, 0) / list.length).toFixed(1), p95: percentile(list.map((r) => r.drawCalls), 0.95), max: Math.max(...list.map((r) => r.drawCalls)) },
    triangles: { mean: Math.round(list.reduce((s, r) => s + r.triangles, 0) / list.length), p95: percentile(list.map((r) => r.triangles), 0.95), max: Math.max(...list.map((r) => r.triangles)) }
});

const byBuild = {};
for (const build of ROOM_BUILD_CATALOG) {
    const list = rooms.filter((room) => room.build === build.id);
    if (list.length) byBuild[build.id] = summarize(list);
}
const report = {
    generatedBy: 'scripts/room-density-probe.mjs',
    mode: areaBudget ? 'area-budget' : 'fixed-cap-5',
    method: 'content-cost estimate from asset data; not a GPU measurement',
    seedsPerBuildAndBiome: SEEDS,
    biomes: BIOMES,
    overall: summarize(rooms),
    byBuild
};
console.log(JSON.stringify({ mode: report.mode, overall: report.overall }, null, 2));
for (const [id, s] of Object.entries(byBuild)) {
    console.log(`${id.padEnd(22)} floor ${String(s.floorCells.min).padStart(3)}-${String(s.floorCells.max).padEnd(3)} objects ${s.objects.mean} (max ${s.objects.max}) areaLimit ${s.areaLimit.min}-${s.areaLimit.max} drawCalls p95 ${s.drawCalls.p95} tris p95 ${s.triangles.p95}`);
}
if (outPath) {
    fs.writeFileSync(path.resolve(ROOT, outPath), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`wrote ${outPath}`);
}
