import fs from 'node:fs';
import path from 'node:path';

const className = String(process.argv[2] ?? '').toUpperCase();
const classConfig = {
    TANK: {
        directory: 'tank',
        filename: 'Tank',
        identity: 'identity/Tank.front-idle-master.png',
        movement: 'short, wide, heavy compression'
    },
    ENGINEER: {
        directory: 'engineer',
        filename: 'Engineer',
        identity: 'identity/Engineer.front-idle-master.png',
        movement: 'compact efficient stride; controlled tool arm'
    }
}[className];

if (!classConfig) {
    throw new Error('Usage: node scripts/build-player-v4-frame-spec.js TANK|ENGINEER');
}

const directions = [
    ['east', 'strict-right-profile', 'right'],
    ['southeast', 'front-right-three-quarter', 'down-right'],
    ['south', 'direct-front', 'down'],
    ['southwest', 'front-left-three-quarter', 'down-left'],
    ['west', 'strict-left-profile', 'left'],
    ['northwest', 'rear-left-three-quarter', 'up-left'],
    ['north', 'direct-back', 'up'],
    ['northeast', 'rear-right-three-quarter', 'up-right']
].map(([id, view, travelScreen], index) => ({ index, id, view, travelScreen }));

const phases = [
    ['left-contact', 'left-entering', 'left', null, 'right', 'left', 'neutral'],
    ['left-down', 'left', null, 'right-heel', 'right', 'left', 'low'],
    ['left-pass', 'left', null, 'right', 'neutral', 'neutral', 'neutral'],
    ['left-up', 'left', null, 'right', 'left', 'right', 'high'],
    ['right-contact', 'right-entering', 'right', null, 'left', 'right', 'neutral'],
    ['right-down', 'right', null, 'left-heel', 'left', 'right', 'low'],
    ['right-pass', 'right', null, 'left', 'neutral', 'neutral', 'neutral'],
    ['right-up', 'right', null, 'left', 'right', 'left', 'high']
].map((
    [id, supportLeg, strikeFoot, airborneFoot, forwardArm, rearArm, pelvisLevel],
    index
) => ({
    index, id, supportLeg, strikeFoot, airborneFoot, forwardArm, rearArm, pelvisLevel
}));

const legMarkers = {
    left: {
        hip: 'cyan-circular-fastener',
        knee: 'cyan-split-kneepad-with-vertical-seam',
        ankle: 'cyan-ankle-light'
    },
    right: {
        hip: 'amber-circular-fastener',
        knee: 'amber-solid-kneepad-without-seam',
        ankle: 'amber-ankle-light'
    }
};

const frames = directions.flatMap((direction) => phases.map((phase) => ({
    atlasRow: direction.index,
    atlasColumn: phase.index,
    frameId: `${direction.id}.${phase.id}`,
    direction: direction.id,
    view: direction.view,
    travelScreen: direction.travelScreen,
    phase: phase.id,
    supportLeg: phase.supportLeg,
    strikeFoot: phase.strikeFoot,
    airborneFoot: phase.airborneFoot,
    forwardArm: phase.forwardArm,
    rearArm: phase.rearArm,
    pelvisLevel: phase.pelvisLevel,
    anatomicalMarkers: legMarkers,
    movementCharacter: classConfig.movement,
    invariants: {
        helmetTopY: 'locked-to-class-anchor',
        pelvisX: 128,
        groundBaselineY: 240,
        scale: 'locked',
        costume: classConfig.identity
    }
})));

const outputPath = path.resolve(
    `art/source/art-remaster/sprite-v4/${classConfig.directory}/${classConfig.filename}.walk-v4-frame-spec.json`
);
const spec = {
    version: 4,
    character: className,
    purpose: 'explicit anatomical truth table for every walk-atlas cell',
    identityMaster: classConfig.identity,
    atlas: `${classConfig.filename}.walk_v4.png`,
    grid: { columns: 8, rows: 8, cellWidth: 256, cellHeight: 256 },
    directionOrder: directions.map(({ id }) => id),
    phaseOrder: phases.map(({ id }) => id),
    legMarkers,
    frames
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Wrote ${outputPath} (${frames.length} frames)`);
