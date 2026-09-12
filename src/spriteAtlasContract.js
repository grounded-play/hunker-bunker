/**
 * Sprite atlas contract, shared by the Blender pre-render pipeline and the
 * runtime layouts.
 *
 * See docs/planning/blender-prerendered-animation-plan-2026-09-12.md. The
 * numbers here are not new: they are read off Tank.walk_v4.png, the atlas that
 * already ships and works (2048x2048, 8x8, 256px cells, footsteps on frames 0
 * and 4). Scout's legacy sheet is 4x4 with two walk frames, and the live
 * Engineer sheet has seven authored rows reusing one rear direction -- this
 * module exists so a generated atlas cannot ship in either of those states
 * again without a test failing.
 */

export const ATLAS_CONTRACT_V4 = Object.freeze({
    version: 'v4',
    columns: 8,
    rows: 8,
    cellSize: 256,
    imageSize: 2048,
    /** Frames on which a foot plants; the runtime hangs footstep audio here. */
    footstepFrames: Object.freeze([0, 4]),
    animationFps: 8
});

/**
 * Row order, screen-relative under the fixed isometric camera. Row 0 is the
 * facing the player sees when moving "down-right" on screen; yaw increases
 * clockwise from there in 45-degree steps.
 */
export const DIRECTION_NAMES = Object.freeze([
    'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE', 'E'
]);

/** Pixel rect of one cell. Throws rather than returning a plausible wrong one. */
export function cellRect(direction, frame, contract = ATLAS_CONTRACT_V4) {
    const { columns, rows, cellSize } = contract;
    if (!Number.isInteger(direction) || direction < 0 || direction >= rows) {
        throw new RangeError(`direction ${direction} outside 0..${rows - 1}`);
    }
    if (!Number.isInteger(frame) || frame < 0 || frame >= columns) {
        throw new RangeError(`frame ${frame} outside 0..${columns - 1}`);
    }
    return { x: frame * cellSize, y: direction * cellSize, width: cellSize, height: cellSize };
}

/**
 * Even samples across a clip, excluding the loop endpoint.
 *
 * Frame 0 and frame N of a cycle are the same pose. Sampling both makes the
 * walk hitch once per loop, which reads as a limp and is hard to attribute.
 */
export function frameSequence({ startFrame, endFrame }, contract = ATLAS_CONTRACT_V4) {
    const count = contract.columns;
    const span = endFrame - startFrame;
    if (!Number.isFinite(span) || span <= 0) {
        return Array.from({ length: count }, () => startFrame);
    }
    return Array.from({ length: count }, (_, i) =>
        Math.round(startFrame + (span * i) / count)
    );
}

export function buildAtlasManifest({
    id,
    source,
    clip,
    imageWidth = ATLAS_CONTRACT_V4.imageSize,
    imageHeight = ATLAS_CONTRACT_V4.imageSize,
    contract = ATLAS_CONTRACT_V4
} = {}) {
    return {
        id,
        contract: contract.version,
        source,
        clip,
        imageWidth,
        imageHeight,
        columns: contract.columns,
        rows: contract.rows,
        cellSize: contract.cellSize,
        footstepFrames: [...contract.footstepFrames],
        animationFps: contract.animationFps,
        directions: DIRECTION_NAMES.map((name, i) => ({
            index: i,
            name,
            yaw: i * (360 / contract.rows)
        }))
    };
}

/**
 * Returns a list of problems; empty means valid.
 *
 * Collects every fault rather than stopping at the first, because a render is
 * expensive and finding out about the second problem on the next run is not.
 */
export function validateAtlasManifest(manifest, contract = ATLAS_CONTRACT_V4) {
    const problems = [];
    if (!manifest || typeof manifest !== 'object') return ['manifest is not an object'];

    if (manifest.contract !== contract.version) {
        problems.push(`contract ${manifest.contract} !== ${contract.version}`);
    }
    if (manifest.imageWidth !== contract.imageSize) {
        problems.push(`imageWidth ${manifest.imageWidth} !== ${contract.imageSize}`);
    }
    if (manifest.imageHeight !== contract.imageSize) {
        problems.push(`imageHeight ${manifest.imageHeight} !== ${contract.imageSize}`);
    }
    if (manifest.columns !== contract.columns || manifest.rows !== contract.rows) {
        problems.push(`grid ${manifest.columns}x${manifest.rows} !== ${contract.columns}x${contract.rows}`);
    }

    const dirs = Array.isArray(manifest.directions) ? manifest.directions : [];
    if (dirs.length !== contract.rows) {
        problems.push(`directions: ${dirs.length} authored, ${contract.rows} required`);
    }
    const yaws = dirs.map((d) => d?.yaw);
    if (new Set(yaws).size !== yaws.length) {
        problems.push('duplicate direction yaw -- a facing is reused rather than authored');
    }
    const names = dirs.map((d) => d?.name);
    if (new Set(names).size !== names.length) {
        problems.push('duplicate direction name -- a facing is reused rather than authored');
    }

    for (const f of manifest.footstepFrames ?? []) {
        if (!Number.isInteger(f) || f < 0 || f >= contract.columns) {
            problems.push(`footstep frame ${f} outside 0..${contract.columns - 1}`);
        }
    }

    return problems;
}
