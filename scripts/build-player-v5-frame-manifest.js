import fs from 'node:fs';
import path from 'node:path';

const classes = {
    SCOUT: {
        directory: 'scout',
        filename: 'Scout',
        identity: '../sprite-v4/scout/identity/Scout.front-idle-master.png',
        body: 'adult feminine athletic Scout; light long stride; controlled arm swing'
    },
    TANK: {
        directory: 'tank',
        filename: 'Tank',
        identity: '../sprite-v4/tank/identity/Tank.front-idle-master.png',
        body: 'adult masculine heavy Tank; short wide stride; strong weight compression'
    },
    ENGINEER: {
        directory: 'engineer',
        filename: 'Engineer',
        identity: '../sprite-v4/engineer/identity/Engineer.front-idle-master.png',
        body: 'adult feminine compact Engineer; efficient stride; controlled tool arm'
    }
};

const directions = [
    { id: 'east', view: 'strict right profile', travel: 'screen-right', nearSide: 'right' },
    { id: 'southeast', view: 'front-right three-quarter', travel: 'down-right', nearSide: 'right' },
    { id: 'south', view: 'direct front', travel: 'toward viewer', nearSide: 'front' },
    { id: 'southwest', view: 'front-left three-quarter', travel: 'down-left', nearSide: 'left' },
    { id: 'west', view: 'strict left profile', travel: 'screen-left', nearSide: 'left' },
    { id: 'northwest', view: 'rear-left three-quarter', travel: 'up-left', nearSide: 'left' },
    { id: 'north', view: 'direct back', travel: 'away from viewer', nearSide: 'back' },
    { id: 'northeast', view: 'rear-right three-quarter', travel: 'up-right', nearSide: 'right' }
];

const phases = [
    {
        id: 'left-contact', support: 'left entering', strike: 'left', swing: 'right trailing',
        arms: 'right arm forward; left arm rear',
        pelvis: 'neutral', sole: 'left sole at y=240; right trailing toe at y=236',
        legs: 'left heel 34 px ahead of pelvis; right toe 25 px behind'
    },
    {
        id: 'left-down', support: 'left loaded', strike: 'none', swing: 'right heel lifting',
        arms: 'right arm forward; left arm rear',
        pelvis: '3 px low', sole: 'left sole at y=240; right heel at y=228',
        legs: 'left knee visibly compressed; right toe remains behind'
    },
    {
        id: 'left-pass', support: 'left planted', strike: 'none', swing: 'right passing airborne',
        arms: 'both arms near neutral',
        pelvis: 'neutral', sole: 'left sole at y=240; right boot bottom at y=220',
        legs: 'right knee beside left knee; right boot beside left ankle'
    },
    {
        id: 'left-up', support: 'left tall', strike: 'none', swing: 'right advancing',
        arms: 'left arm forward; right arm rear',
        pelvis: '3 px high', sole: 'left sole at y=240; right boot bottom at y=214',
        legs: 'right knee 24 px ahead; left support leg extended'
    },
    {
        id: 'right-contact', support: 'right entering', strike: 'right', swing: 'left trailing',
        arms: 'left arm forward; right arm rear',
        pelvis: 'neutral', sole: 'right sole at y=240; left trailing toe at y=236',
        legs: 'right heel 34 px ahead of pelvis; left toe 25 px behind'
    },
    {
        id: 'right-down', support: 'right loaded', strike: 'none', swing: 'left heel lifting',
        arms: 'left arm forward; right arm rear',
        pelvis: '3 px low', sole: 'right sole at y=240; left heel at y=228',
        legs: 'right knee visibly compressed; left toe remains behind'
    },
    {
        id: 'right-pass', support: 'right planted', strike: 'none', swing: 'left passing airborne',
        arms: 'both arms near neutral',
        pelvis: 'neutral', sole: 'right sole at y=240; left boot bottom at y=220',
        legs: 'left knee beside right knee; left boot beside right ankle'
    },
    {
        id: 'right-up', support: 'right tall', strike: 'none', swing: 'left advancing',
        arms: 'right arm forward; left arm rear',
        pelvis: '3 px high', sole: 'right sole at y=240; left boot bottom at y=214',
        legs: 'left knee 24 px ahead; right support leg extended'
    }
];

const markers = {
    left: 'cyan circular hip, cyan split kneepad with vertical seam, cyan ankle light',
    right: 'amber circular hip, amber solid kneepad without seam, amber ankle light'
};

for (const [classId, config] of Object.entries(classes)) {
    const frames = directions.flatMap((direction, row) => phases.map((phase, column) => {
        const frameId = `${direction.id}.${phase.id}`;
        return {
            frameNumber: (row * 8) + column + 1,
            frameId,
            atlas: { row, column, x: column * 256, y: row * 256, width: 256, height: 256 },
            output: `frames/${direction.id}/${String(column).padStart(2, '0')}-${phase.id}.png`,
            direction,
            phase,
            anchors: {
                visualCenterX: 128,
                pelvisX: 128,
                groundBaselineY: 240,
                helmetTop: 'match identity master exactly',
                scale: 'match every accepted frame in this class'
            },
            markers,
            prompt: [
                `One isolated ${config.filename} game-sprite pose, ${direction.view}, traveling ${direction.travel}.`,
                `${config.body}.`,
                `Phase ${column}: ${phase.id}. Support: ${phase.support}. Swing: ${phase.swing}.`,
                `Leg geometry: ${phase.legs}. Sole placement: ${phase.sole}.`,
                `Arms: ${phase.arms}. Pelvis: ${phase.pelvis}.`,
                `Near-side read: ${direction.nearSide}. Anatomical left markers: ${markers.left}.`,
                `Anatomical right markers: ${markers.right}.`,
                'Exactly one complete figure in a 256x256 cell; center x=128; ground baseline y=240.',
                'Identity, armor, backpack, proportions, camera elevation and lighting locked to master.',
                'Flat chroma background; no shadow, floor, text, crop, extra limbs or detached boots.'
            ].join(' ')
        };
    }));

    const manifest = {
        version: 5,
        classId,
        identityMaster: config.identity,
        grid: { columns: 8, rows: 8, cellWidth: 256, cellHeight: 256 },
        directionOrder: directions.map(({ id }) => id),
        phaseOrder: phases.map(({ id }) => id),
        productionRule: 'render and approve one frame at a time; assemble only accepted frames',
        frames
    };
    const root = path.resolve(`public/art-remaster/sprite-v5/${config.directory}`);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(
        path.join(root, `${config.filename}.walk-v5-frame-manifest.json`),
        `${JSON.stringify(manifest, null, 2)}\n`
    );
    console.log(`Wrote ${classId}: ${frames.length} individually specified frames`);
}
