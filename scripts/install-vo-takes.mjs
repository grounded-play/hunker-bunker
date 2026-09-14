/**
 * Install chosen VO takes into the game's voice-bank cue slots.
 *
 * Reads the segmenter's manifest, finds the takes a human has labelled with a
 * slot key, and writes them to public/audio/generated/<slot>.wav -- the exact
 * filenames src/audio.js's callout cueMap looks up.
 *
 *   node scripts/install-vo-takes.mjs --dry-run
 *   node scripts/install-vo-takes.mjs --comms
 *
 * --comms applies the radio treatment (mono, 16 kHz, band-limited, lightly
 * driven). It is OFF by default: the artist said they would engineer the comms
 * pass themselves, so the default is a faithful copy and this is only here for
 * a quick in-engine preview.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { VOICE_BANKS } from '../src/data/voiceBanks.js';

export const MANIFEST = 'art/source/audio/vo/segments/vo-takes.json';
export const SELECTIONS = 'scripts/audio/vo-take-selections.json';
export const SEGMENTS_DIR = 'art/source/audio/vo/segments';
export const INSTALL_DIR = 'public/audio/generated';

// Telephone/comms band. 16 kHz mono keeps it small and already reads as radio;
// the highpass/lowpass pair is the band a real comms link survives.
export const COMMS_FILTER = 'highpass=f=300,lowpass=f=3400,acompressor=ratio=4,volume=1.6';

/** Every slot key across both banks. */
export function allSlotKeys() {
    return Object.values(VOICE_BANKS).flatMap((bank) => bank.slots.map((slot) => slot.key));
}

/**
 * Resolve labelled takes to install actions, and report what is still missing.
 * Pure, so the selection rules are testable without touching the filesystem.
 */
export function planInstall(manifest, { slotKeys = allSlotKeys() } = {}) {
    const valid = new Set(slotKeys);
    const takes = Array.isArray(manifest?.takes) ? manifest.takes : [];
    const labelled = takes.filter((t) => t.label);

    const unknown = labelled.filter((t) => !valid.has(t.label));
    const bySlot = new Map();
    for (const take of labelled) {
        if (!valid.has(take.label)) continue;
        // Last labelled take wins, so re-labelling a better take is just an edit.
        bySlot.set(take.label, take);
    }
    const missing = slotKeys.filter((key) => !bySlot.has(key));
    return {
        install: [...bySlot.entries()].map(([slot, take]) => ({ slot, take })),
        missing,
        unknown: unknown.map((t) => ({ clip: t.clip, label: t.label }))
    };
}

/** Apply reviewed, tracked choices without mutating the generated manifest. */
export function applySelections(manifest, selections = {}) {
    const labelsByClip = new Map();
    for (const bank of Object.values(selections)) {
        for (const [label, clip] of Object.entries(bank ?? {})) labelsByClip.set(clip, label);
    }
    return {
        ...manifest,
        takes: (manifest?.takes ?? []).map((take) => ({
            ...take,
            label: labelsByClip.get(take.clip) ?? take.label
        }))
    };
}

function main(argv) {
    const dryRun = argv.includes('--dry-run');
    const comms = argv.includes('--comms');
    if (!existsSync(MANIFEST)) {
        console.error(`no manifest at ${MANIFEST} -- run scripts/segment-vo-takes.mjs first`);
        return 1;
    }
    const generatedManifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    const selections = existsSync(SELECTIONS) ? JSON.parse(readFileSync(SELECTIONS, 'utf8')) : {};
    const manifest = applySelections(generatedManifest, selections);
    const { install, missing, unknown } = planInstall(manifest);

    for (const { clip, label } of unknown) {
        console.warn(`  ! ${clip}: label "${label}" is not a known cue slot -- skipped`);
    }

    if (install.length === 0) {
        console.log('Nothing labelled yet. Set "label" on a take to one of these cue slots:');
        for (const bank of Object.values(VOICE_BANKS)) {
            console.log(`\n  ${bank.name} (${bank.itemdefid}):`);
            for (const slot of bank.slots) console.log(`    ${slot.key.padEnd(34)} ${slot.intent}`);
        }
        console.log(`\nmanifest: ${MANIFEST}`);
        return 0;
    }

    for (const { slot, take } of install) {
        const src = path.join(SEGMENTS_DIR, take.source.replace(/\.wav$/, ''), take.clip);
        const dest = path.join(INSTALL_DIR, `${slot}.wav`);
        if (!existsSync(src)) {
            console.error(`  ! missing clip ${src} -- re-run the segmenter`);
            continue;
        }
        console.log(`  ${slot} <- ${take.clip}${comms ? ' (comms)' : ''}${dryRun ? '  [dry-run]' : ''}`);
        if (dryRun) continue;
        if (comms) {
            execFileSync('ffmpeg', ['-y', '-i', src, '-ac', '1', '-ar', '16000',
                '-af', COMMS_FILTER, dest], { stdio: 'ignore' });
        } else {
            copyFileSync(src, dest);
        }
    }

    if (missing.length) {
        console.log(`\n${missing.length} cue slot(s) still on placeholder audio:`);
        for (const key of missing) console.log(`    ${key}`);
    }
    return 0;
}

if (process.argv[1] && process.argv[1].endsWith('install-vo-takes.mjs')) {
    process.exit(main(process.argv.slice(2)));
}
