import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatedTextMatches } from './generated-text.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(repoRoot, 'public/audio/soundtrack-config.json');
const steamCsvPath = path.join(repoRoot, 'steam/store/soundtrack/track_metadata.csv');
const outputPath = path.join(repoRoot, 'steam/store/soundtrack/ost_metadata.csv');
const checkOnly = process.argv.includes('--check');

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

function parseSteamDurations(csv) {
    const durations = new Map();
    for (const line of csv.trim().split(/\r?\n/).slice(1)) {
        const match = line.match(/^1,(\d+),"((?:[^"]|"")*)",en,"(?:[^"]|"")*",(\d+:\d{2}),/);
        if (!match) throw new Error(`Cannot parse Steam soundtrack metadata row: ${line}`);
        durations.set(Number(match[1]), {
            title: match[2].replaceAll('""', '"'),
            duration: match[3]
        });
    }
    return durations;
}

export function buildSoundtrackMetadata() {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const tracks = [...(config.legacy_tracks ?? []), ...(config.tracks ?? [])];
    const durations = parseSteamDurations(fs.readFileSync(steamCsvPath, 'utf8'));
    if (tracks.length !== 43 || durations.size !== tracks.length) {
        throw new Error(`OST metadata requires 43 tracks; config=${tracks.length}, durations=${durations.size}.`);
    }

    const headers = [
        'Disc Number',
        'Track Number',
        'Original Name',
        'Original Name Language (ie., "es", "jp") (optional)',
        'International Name (optional)',
        'Duration ("m:ss")',
        'ISRC (optional)'
    ];
    const rows = tracks.map((track, index) => {
        const number = index + 1;
        const steam = durations.get(number);
        if (!steam || steam.title !== track.title) {
            throw new Error(`Track ${number} mismatch: config=${track.title}, Steam CSV=${steam?.title ?? 'missing'}.`);
        }
        return `1,${number},${csvCell(track.title)},en,${csvCell(track.title)},${steam.duration},`;
    });
    return `${headers.map(csvCell).join(',')}\n${rows.join('\n')}\n`;
}

const generated = buildSoundtrackMetadata();
if (checkOnly) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
    if (!generatedTextMatches(current, generated)) {
        throw new Error('steam/store/soundtrack/ost_metadata.csv is missing or stale. Run npm run soundtrack:metadata.');
    }
    console.log('[soundtrack-metadata] ok (43 tracks)');
} else {
    fs.writeFileSync(outputPath, generated, 'utf8');
    console.log('[soundtrack-metadata] wrote steam/store/soundtrack/ost_metadata.csv (43 tracks)');
}
