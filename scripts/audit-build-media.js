import { access, stat } from 'node:fs/promises';
import path from 'node:path';

const requiredMedia = [
    'DoorIntro.mp4',
    'door_biomech_v2.webp',
    'door_bio.png',
    'door_nuclear.png',
    'door_cryo.png',
    'door_alien.png',
    'door_rust.png',
    'Scout.full_v2.png',
    'Tank.walk_v4.png',
    'Eng.walk_v4.png',
    'Tank.full_v2.png',
    'Eng.Full_v2.png',
    'lore_portraits/survivor_00.webp',
    'lore_portraits/survivor_08.webp',
    'cutscenes/scout-intro.webm',
    'cutscenes/tank-intro.webm',
    'cutscenes/engineer-intro.webm',
    'cutscenes/cave-reveal.webm',
    'cutscenes/act3-departure.webm',
    'cutscenes/ending-carriersbargain.webm',
    'cutscenes/ending-cleanescape.webm',
    'cutscenes/ending-fullbrood.webm',
    'cutscenes/ending-mixedcrew.webm',
    'cutscenes/ending-scorchedsky.webm',
    'cutscenes/death-hazard.webm',
    'cutscenes/event-black-box-recovered.webm',
    'cutscenes/event-foundry-discovered.webm',
    'cutscenes/event-queen-encounter.webm'
];

const failures = [];
for (const relativePath of requiredMedia) {
    const source = path.resolve('public', relativePath);
    const built = path.resolve('dist', relativePath);
    try {
        await access(source);
        const builtStat = await stat(built);
        if (!builtStat.isFile() || builtStat.size === 0) {
            failures.push(`${relativePath}: built file is empty`);
        }
    } catch {
        failures.push(`${relativePath}: missing from public/ or dist/`);
    }
}

if (failures.length) {
    console.error('[build-media-audit] FAILED');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`[build-media-audit] ok (${requiredMedia.length} required door/cinematic assets)`);
}
