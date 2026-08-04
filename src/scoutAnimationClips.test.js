import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guards the Scout.game.glb export: the shared animation pack retargeted onto
// every player class. A clip missing here means someone rebuilt the GLB from
// scripts/blender/build_mixamo_scout_glb.py without the full CLIPS mapping,
// and player3dOverlay's ONE_SHOTS triggers would silently no-op in-game
// instead of failing a build (see docs/manual-smash-and-animation-mapping-plan.md).
const GLB_PATH = fileURLToPath(new URL('../public/3d/scouting-scout/Scout.game.glb', import.meta.url));

const EXPECTED_CLIPS = [
    'idle', 'heroIdle', 'walk', 'run', 'backward', 'strafeLeft', 'strafeRight',
    'fire', 'reload', 'hit', 'fall', 'land', 'melee',
    'injuredIdle', 'injuredWalk', 'injuredRun'
];

function readGlbAnimationNames(path) {
    const buffer = readFileSync(path);
    if (buffer.readUInt32LE(0) !== 0x46546c67) {
        throw new Error(`${path} is not a binary glTF file`);
    }
    const jsonChunkLength = buffer.readUInt32LE(12);
    const json = JSON.parse(buffer.slice(20, 20 + jsonChunkLength).toString('utf8'));
    return new Set((json.animations ?? []).map((animation) => animation.name));
}

describe('Scout.game.glb animation clips', () => {
    it('contains every clip player3dOverlay expects to trigger', () => {
        const names = readGlbAnimationNames(GLB_PATH);
        for (const clip of EXPECTED_CLIPS) {
            expect(names.has(clip), `missing "${clip}" clip in Scout.game.glb`).toBe(true);
        }
    });
});
