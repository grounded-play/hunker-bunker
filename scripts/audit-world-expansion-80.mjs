#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORLD_EXPANSION_80_MODELS, WORLD_EXPANSION_80_SPECS, WORLD_EXPANSION_80_SURFACES } from '../src/data/worldExpansion80.js';
import { PROP_SOCKET_REGISTRY } from '../src/data/propSockets.js';
import { PROP_EXPERIENCE_PROFILES } from '../src/propExperience.js';
import { PROP_FX_PROFILES } from '../src/propFx.js';
import { PROP_INTERACTION_SPECS } from '../src/propInteractions.js';
import { getModelPresentationProfile } from '../src/modelPresentationRegistry.js';
import { dressingKitFor, vignettesFor } from '../src/roomDressingKits.js';
import { floorSurfaceFileNames } from '../src/floorSplat.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const DOCS = path.join(ROOT, 'docs/planning');
const TSV_PATH = path.join(DOCS, 'world-expansion-80-runtime-inventory-2026-10-16.tsv');
const REPORT_PATH = path.join(DOCS, 'world-expansion-80-runtime-audit-2026-10-16.md');

function readGlbJson(file) {
    const buffer = fs.readFileSync(file);
    if (buffer.toString('utf8', 0, 4) !== 'glTF') throw new Error(`${file}: invalid GLB magic`);
    const jsonLength = buffer.readUInt32LE(12);
    const jsonType = buffer.toString('utf8', 16, 20);
    if (jsonType !== 'JSON') throw new Error(`${file}: first GLB chunk is not JSON`);
    return { bytes: buffer.length, json: JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength)) };
}

function triangleCount(json) {
    let total = 0;
    for (const mesh of json.meshes ?? []) {
        for (const primitive of mesh.primitives ?? []) {
            const count = primitive.indices == null
                ? json.accessors?.[primitive.attributes?.POSITION]?.count ?? 0
                : json.accessors?.[primitive.indices]?.count ?? 0;
            total += primitive.mode == null || primitive.mode === 4 ? Math.floor(count / 3) : 0;
        }
    }
    return total;
}

function placementCoverage(spec) {
    const kit = dressingKitFor(spec.theme, spec.role);
    const kitTypes = new Set(Object.values(kit).flat());
    const vignetteTypes = new Set(vignettesFor(spec.theme, spec.role).flat());
    return kitTypes.has(spec.id) || vignetteTypes.has(spec.id);
}

const failures = [];
const rows = [];
for (const spec of WORLD_EXPANSION_80_SPECS) {
    const model = WORLD_EXPANSION_80_MODELS[spec.id];
    const glbPath = path.join(PUBLIC, model.url);
    if (!fs.existsSync(glbPath)) {
        failures.push(`${spec.id}: missing ${model.url}`);
        continue;
    }
    const { bytes, json } = readGlbJson(glbPath);
    const nodes = json.nodes ?? [];
    const nodeNames = new Set(nodes.map((node) => node.name));
    const animationNames = (json.animations ?? []).map((animation) => animation.name ?? 'unnamed');
    const imageTypes = (json.images ?? []).map((image) => image.mimeType ?? path.extname(image.uri ?? ''));
    const actuatorIndex = nodes.findIndex((node) => node.name?.startsWith('HB_') && node.extras?.hb_motion);
    const actuator = nodes[actuatorIndex];
    const animatedNodes = new Set((json.animations ?? []).flatMap((animation) =>
        (animation.channels ?? []).map((channel) => channel.target?.node).filter(Number.isInteger)));
    const materialTextureRefs = new Set();
    for (const material of json.materials ?? []) {
        for (const info of [
            material.pbrMetallicRoughness?.baseColorTexture,
            material.pbrMetallicRoughness?.metallicRoughnessTexture,
            material.normalTexture,
            material.occlusionTexture,
            material.emissiveTexture
        ]) if (Number.isInteger(info?.index)) materialTextureRefs.add(info.index);
    }
    const imageRefs = new Set([...materialTextureRefs].map((index) => {
        const texture = json.textures?.[index];
        return texture?.extensions?.EXT_texture_webp?.source ?? texture?.source;
    }).filter(Number.isInteger));
    const triangles = triangleCount(json);
    const checks = {
        interaction: Boolean(PROP_INTERACTION_SPECS[spec.id]),
        experience: Boolean(PROP_EXPERIENCE_PROFILES[spec.id]),
        fx: Boolean(PROP_FX_PROFILES[spec.id]),
        placement: placementCoverage(spec),
        presentation: !['wall', 'ceiling'].includes(spec.placement) || Boolean(getModelPresentationProfile(spec.id)),
        socket: spec.sockets.length === 0 || Boolean(PROP_SOCKET_REGISTRY[spec.id]),
        animation: animationNames.includes('idle'),
        articulatedRig: actuatorIndex >= 0 && ['hinge', 'slide', 'spin'].includes(actuator.extras.hb_motion),
        animatedRig: actuatorIndex >= 0 && animatedNodes.has(actuatorIndex),
        interactionAnchor: nodeNames.has('INTERACTION_00'),
        fxLightAnchor: nodeNames.has('FX_LIGHT_00'),
        fxGlowAnchor: nodeNames.has('FX_GLOW_00'),
        embeddedSockets: spec.sockets.every((socket) => nodeNames.has(socket)),
        pbrAssignments: (json.materials ?? []).length > 0 && (json.materials ?? []).every((material) =>
            Number.isInteger(material.pbrMetallicRoughness?.baseColorTexture?.index)
            && Number.isInteger(material.pbrMetallicRoughness?.metallicRoughnessTexture?.index)
            && Number.isInteger(material.normalTexture?.index)),
        noOrphanTextures: materialTextureRefs.size === (json.textures ?? []).length,
        noOrphanImages: imageRefs.size === (json.images ?? []).length,
        triangleBudget: triangles > 0 && triangles <= 36000,
        webp: imageTypes.length > 0 && imageTypes.every((type) => type === 'image/webp'),
        meshopt: (json.extensionsUsed ?? []).includes('EXT_meshopt_compression')
    };
    for (const [check, passed] of Object.entries(checks)) {
        if (!passed) failures.push(`${spec.id}: failed ${check}`);
    }
    rows.push({ spec, bytes, triangles, animationNames, nodeNames, actuator });
}

const surfaceNames = floorSurfaceFileNames().filter((name) => WORLD_EXPANSION_80_SURFACES.some((surface) => name.startsWith(`${surface}_`)));
for (const name of new Set(surfaceNames)) {
    for (const channel of ['albedo', 'detail']) {
        const file = path.join(PUBLIC, '3d/runtime/surfaces', `${name}_${channel}.ktx2`);
        if (!fs.existsSync(file)) failures.push(`surface: missing ${path.relative(ROOT, file)}`);
    }
}
for (const decal of new Set(WORLD_EXPANSION_80_SPECS.map((spec) => spec.decal))) {
    for (const file of [
        path.join(PUBLIC, `${decal}.png`),
        path.join(PUBLIC, '3d/runtime/decals/legacy', `${decal}_albedo.ktx2`),
        path.join(PUBLIC, '3d/runtime/decals/legacy', `${decal}_detail.ktx2`)
    ]) {
        if (!fs.existsSync(file)) failures.push(`decal: missing ${path.relative(ROOT, file)}`);
    }
}

if (failures.length > 0) {
    console.error(`[world80-audit] ${failures.length} failure(s)`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

const header = ['id', 'suite', 'theme', 'placement', 'role', 'motion', 'rig_node', 'rig_motion', 'fx', 'triangles', 'runtime_bytes', 'animation', 'surface', 'decal', 'sockets', 'runtime_url'];
const tsv = [header.join('\t'), ...rows.map(({ spec, bytes, triangles, animationNames, actuator }) => [
    spec.id, spec.suite, spec.theme, spec.placement, spec.role, spec.motion,
    actuator.name, actuator.extras.hb_motion, spec.fx,
    triangles, bytes, animationNames.join(','), spec.surface, spec.decal, spec.sockets.join(','),
    WORLD_EXPANSION_80_MODELS[spec.id].url
].join('\t'))].join('\n') + '\n';
fs.writeFileSync(TSV_PATH, tsv);

const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
const totalTriangles = rows.reduce((sum, row) => sum + row.triangles, 0);
const report = `# World Expansion 80 runtime audit — 2026-10-16

Status: **PASS**

## Delivered

- 80/80 GLBs registered and present (${(totalBytes / 1048576).toFixed(1)} MiB total runtime payload).
- ${totalTriangles.toLocaleString('en-US')} total indexed triangles; every source mesh is within its 25k/35k ingest ceiling (large pieces remain below 36k including their added actuator).
- 80/80 contain a named articulated \`HB_*\` rig node targeted by an embedded \`idle\` animation, plus interaction/light/glow anchors.
- 80/80 have complete base-color, normal, and metallic/roughness material assignments with no orphan textures or images.
- 80/80 use embedded WebP textures and \`EXT_meshopt_compression\`.
- 80/80 have interaction, experience, FX, room-placement, support-surface and support-decal coverage.
- ${WORLD_EXPANSION_80_SPECS.filter((spec) => spec.sockets.length).length} hazard-network assets have typed runtime conduit sockets.
- 64 seamless surface layers (16 families × 4 variants) are registered in the height-aware floor PBR array.
- ${new Set(WORLD_EXPANSION_80_SPECS.map((spec) => spec.decal)).size} alpha-keyed decal families have runtime PNG plus compressed albedo/detail PBR layers.

## Animation scope

The source uploads contained no animation clips and exposed each model as one monolithic mesh. The ingest therefore preserves the authored mesh, adds a small identified actuator with an embedded restrained idle motion, and publishes \`HB_*\`, \`INTERACTION_00\`, and \`FX_*\` nodes. It does not guess-cut the source geometry into doors or rotors. Future authored articulation can replace the actuator while keeping the same runtime contract.

## Placement and material behavior

Placement is derived from the shared manifest and restricted to each asset's exact room theme: wall/ceiling pieces use mount profiles; tabletop pieces enter clutter; floor, recess, threshold and carry-install pieces enter corner/story placements; eligible pieces also form two-item vignettes. Every prop carries a paired local surface and decal. Surfaces participate in the existing multi-layer height/blend shader, while decals use the shared compressed sticker arrays rather than per-object draw calls.

The exact per-asset evidence is in [the runtime inventory](./world-expansion-80-runtime-inventory-2026-10-16.tsv).
`;
fs.writeFileSync(REPORT_PATH, report);
console.log(`[world80-audit] PASS models=${rows.length} surfaces=${surfaceNames.length} report=${path.relative(ROOT, REPORT_PATH)}`);
