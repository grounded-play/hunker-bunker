import fs from 'node:fs';
import path from 'node:path';

const outputPath = path.resolve(
    'public/art-remaster/sprite-v4/scout/Scout.walk-v4-frame-spec.json'
);

const directions = [
    { index: 0, id: 'east', view: 'strict-right-profile', travelScreen: 'right' },
    { index: 1, id: 'southeast', view: 'front-right-three-quarter', travelScreen: 'down-right' },
    { index: 2, id: 'south', view: 'direct-front', travelScreen: 'down' },
    { index: 3, id: 'southwest', view: 'front-left-three-quarter', travelScreen: 'down-left' },
    { index: 4, id: 'west', view: 'strict-left-profile', travelScreen: 'left' },
    { index: 5, id: 'northwest', view: 'rear-left-three-quarter', travelScreen: 'up-left' },
    { index: 6, id: 'north', view: 'direct-back', travelScreen: 'up' },
    { index: 7, id: 'northeast', view: 'rear-right-three-quarter', travelScreen: 'up-right' }
];

const phases = [
    {
        index: 0,
        id: 'left-contact',
        supportLeg: 'left-entering',
        strikeFoot: 'left',
        airborneFoot: null,
        forwardArm: 'right',
        rearArm: 'left',
        pelvisLevel: 'neutral',
        silhouette: 'left heel forward; right toe trailing'
    },
    {
        index: 1,
        id: 'left-down',
        supportLeg: 'left',
        strikeFoot: null,
        airborneFoot: 'right-heel',
        forwardArm: 'right',
        rearArm: 'left',
        pelvisLevel: 'low',
        silhouette: 'left knee compressed; right heel peeling upward'
    },
    {
        index: 2,
        id: 'left-pass',
        supportLeg: 'left',
        strikeFoot: null,
        airborneFoot: 'right',
        forwardArm: 'neutral',
        rearArm: 'neutral',
        pelvisLevel: 'neutral',
        silhouette: 'right knee and boot pass beside left support ankle'
    },
    {
        index: 3,
        id: 'left-up',
        supportLeg: 'left',
        strikeFoot: null,
        airborneFoot: 'right',
        forwardArm: 'left',
        rearArm: 'right',
        pelvisLevel: 'high',
        silhouette: 'left support tall; right knee advancing'
    },
    {
        index: 4,
        id: 'right-contact',
        supportLeg: 'right-entering',
        strikeFoot: 'right',
        airborneFoot: null,
        forwardArm: 'left',
        rearArm: 'right',
        pelvisLevel: 'neutral',
        silhouette: 'right heel forward; left toe trailing'
    },
    {
        index: 5,
        id: 'right-down',
        supportLeg: 'right',
        strikeFoot: null,
        airborneFoot: 'left-heel',
        forwardArm: 'left',
        rearArm: 'right',
        pelvisLevel: 'low',
        silhouette: 'right knee compressed; left heel peeling upward'
    },
    {
        index: 6,
        id: 'right-pass',
        supportLeg: 'right',
        strikeFoot: null,
        airborneFoot: 'left',
        forwardArm: 'neutral',
        rearArm: 'neutral',
        pelvisLevel: 'neutral',
        silhouette: 'left knee and boot pass beside right support ankle'
    },
    {
        index: 7,
        id: 'right-up',
        supportLeg: 'right',
        strikeFoot: null,
        airborneFoot: 'left',
        forwardArm: 'right',
        rearArm: 'left',
        pelvisLevel: 'high',
        silhouette: 'right support tall; left knee advancing'
    }
];

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

const frames = directions.flatMap((direction) =>
    phases.map((phase) => ({
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
        requiredSilhouette: phase.silhouette,
        anatomicalMarkers: legMarkers,
        invariants: {
            helmetTopY: 'locked-to-class-anchor',
            pelvisX: 128,
            groundBaselineY: 240,
            scale: 'locked',
            costume: 'Scout.front-idle-master'
        }
    }))
);

const spec = {
    version: 4,
    character: 'SCOUT',
    purpose: 'explicit anatomical truth table for every walk-atlas cell',
    identityMaster: 'identity/Scout.front-idle-master.png',
    grid: { columns: 8, rows: 8, cellWidth: 256, cellHeight: 256 },
    directionOrder: directions.map(({ id }) => id),
    phaseOrder: phases.map(({ id }) => id),
    legMarkers,
    frames
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Wrote ${outputPath} (${frames.length} frames)`);
