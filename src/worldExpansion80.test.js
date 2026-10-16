import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import { WORLD_EXPANSION_80_IDS, WORLD_EXPANSION_80_MODELS, WORLD_EXPANSION_80_SPECS, WORLD_EXPANSION_80_SURFACES } from './data/worldExpansion80.js';
import { PROP_SOCKET_REGISTRY } from './data/propSockets.js';
import { DRESSING_TRIANGLES } from './data/dressingTriangles.js';
import { FLOOR_SURFACE_COUNT, floorSurfaceFileNames } from './floorSplat.js';
import { getModelPresentationProfile } from './modelPresentationRegistry.js';
import { PROP_EXPERIENCE_PROFILES } from './propExperience.js';
import { PROP_FX_PROFILES } from './propFx.js';
import { PROP_INTERACTION_SPECS } from './propInteractions.js';
import { dressingKitFor, vignettesFor } from './roomDressingKits.js';

describe('World Expansion 80 runtime cohort', () => {
    it('keeps one complete 80-item identity and gameplay contract', () => {
        expect(WORLD_EXPANSION_80_IDS).toHaveLength(80);
        expect(new Set(WORLD_EXPANSION_80_IDS).size).toBe(80);
        for (const spec of WORLD_EXPANSION_80_SPECS) {
            expect(WORLD_EXPANSION_80_MODELS[spec.id]?.url).toBe(`/3d/runtime/new3ds/${spec.id}.glb`);
            expect(fs.existsSync(`public${WORLD_EXPANSION_80_MODELS[spec.id].url}`), spec.id).toBe(true);
            expect(PROP_INTERACTION_SPECS[spec.id], `${spec.id} interaction`).toBeDefined();
            expect(PROP_EXPERIENCE_PROFILES[spec.id], `${spec.id} experience`).toBeDefined();
            expect(PROP_FX_PROFILES[spec.id], `${spec.id} FX`).toBeDefined();
            expect(DRESSING_TRIANGLES[spec.id], `${spec.id} budget`).toBeGreaterThan(0);
        }
    });

    it('gives every model a reachable themed placement', () => {
        const cohortThemes = [...new Set(WORLD_EXPANSION_80_SPECS.map((spec) => spec.theme))];
        for (const spec of WORLD_EXPANSION_80_SPECS) {
            const kitTypes = Object.values(dressingKitFor(spec.theme, spec.role)).flat();
            const vignetteTypes = vignettesFor(spec.theme, spec.role).flat();
            expect([...kitTypes, ...vignetteTypes], spec.id).toContain(spec.id);
            for (const otherTheme of cohortThemes.filter((theme) => theme !== spec.theme)) {
                expect(Object.values(dressingKitFor(otherTheme, spec.role)).flat(), `${spec.id} leaked into ${otherTheme}`)
                    .not.toContain(spec.id);
            }
            if (spec.placement === 'wall' || spec.placement === 'ceiling') {
                expect(getModelPresentationProfile(spec.id), `${spec.id} presentation`).toBeDefined();
            }
            if (spec.sockets.length) {
                expect(PROP_SOCKET_REGISTRY[spec.id]?.map((socket) => socket.id), `${spec.id} sockets`)
                    .toEqual(spec.sockets);
            }
        }
    });

    it('registers all 64 new layered PBR surface variants', () => {
        const names = floorSurfaceFileNames().filter((name) => WORLD_EXPANSION_80_SURFACES.some((surface) => name.startsWith(`${surface}_`)));
        expect(names).toHaveLength(64);
        expect(FLOOR_SURFACE_COUNT).toBeLessThanOrEqual(239);
        for (const name of names) {
            expect(fs.existsSync(`public/3d/runtime/surfaces/${name}_albedo.ktx2`), name).toBe(true);
            expect(fs.existsSync(`public/3d/runtime/surfaces/${name}_detail.ktx2`), name).toBe(true);
        }
    });

    it('ships alpha-capable decals and compressed PBR decal layers', () => {
        for (const decal of new Set(WORLD_EXPANSION_80_SPECS.map((spec) => spec.decal))) {
            const png = fs.readFileSync(`public/${decal}.png`);
            expect(png.subarray(1, 4).toString(), decal).toBe('PNG');
            expect(png[25], `${decal} PNG color type`).toBe(6);
            expect(fs.existsSync(`public/3d/runtime/decals/legacy/${decal}_albedo.ktx2`), decal).toBe(true);
            expect(fs.existsSync(`public/3d/runtime/decals/legacy/${decal}_detail.ktx2`), decal).toBe(true);
        }
    });
});
