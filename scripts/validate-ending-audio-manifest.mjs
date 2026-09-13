#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'scripts/audio/ending-mix-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expected = ['mothership_infection', 'alien_exodus', 'outed_escape', 'failed_carrier', 'empty_husk'];
const errors = [];
for (const name of expected) {
    const scene = manifest.scenes?.[name];
    if (!scene) { errors.push(`missing scene ${name}`); continue; }
    const ids = new Set();
    for (const cue of scene.cues ?? []) {
        if (ids.has(cue.id)) errors.push(`${name}: duplicate cue ${cue.id}`);
        ids.add(cue.id);
        if (!['AMB', 'MECH', 'BIO', 'SYNC', 'MUS'].includes(cue.stem)) errors.push(`${name}/${cue.id}: invalid stem`);
        if (!Number.isInteger(cue.frame) || cue.frame < 1 || cue.frame > scene.frames) errors.push(`${name}/${cue.id}: frame out of range`);
        if (!Number.isInteger(cue.channel) || cue.channel < 10 || cue.channel > 59) errors.push(`${name}/${cue.id}: channel out of range`);
        if (!fs.existsSync(path.join(root, cue.path))) errors.push(`${name}/${cue.id}: missing ${cue.path}`);
    }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Ending audio manifest valid: ${expected.length} scenes, ${expected.reduce((n, key) => n + manifest.scenes[key].cues.length, 0)} cues.`);
