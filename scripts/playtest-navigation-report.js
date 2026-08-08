import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function detailFromMessage(message) {
    const start = String(message).indexOf('{');
    if (start < 0) return null;
    try { return JSON.parse(String(message).slice(start)); } catch { return null; }
}

export function analyzePlaytestLog(document, source = 'log') {
    const entries = Array.isArray(document?.entries) ? document.entries : [];
    const durationMs = entries.reduce((max, entry) => Math.max(max, Number(entry.elapsedMs) || 0), 0);
    const radarScans = entries.filter((entry) => String(entry.message).includes('Action: RADAR SCAN')).length;
    const dashes = entries.filter((entry) => String(entry.message).includes('Action: DASH')).length;
    const chunks = entries
        .filter((entry) => String(entry.message).startsWith('Chunk generated'))
        .map((entry) => detailFromMessage(entry.message))
        .filter(Boolean);
    const landforms = {};
    let voidTiles = 0;
    let totalTiles = 0;
    for (const chunk of chunks) {
        const key = chunk.landform ?? 'unknown';
        landforms[key] = (landforms[key] ?? 0) + 1;
        const tiles = chunk.tiles ?? {};
        voidTiles += Number(tiles.void) || 0;
        totalTiles += Object.values(tiles).reduce((sum, value) => sum + (Number(value) || 0), 0);
    }
    const minutes = durationMs / 60000;
    return {
        source,
        durationMinutes: Number(minutes.toFixed(2)),
        radarScans,
        radarScansPerMinute: Number((minutes > 0 ? radarScans / minutes : 0).toFixed(2)),
        dashes,
        radarToDashRatio: dashes > 0 ? Number((radarScans / dashes).toFixed(2)) : null,
        chunks: chunks.length,
        landforms,
        mazeFraction: Number((chunks.length > 0 ? (landforms.maze ?? 0) / chunks.length : 0).toFixed(3)),
        voidTileFraction: Number((totalTiles > 0 ? voidTiles / totalTiles : 0).toFixed(3))
    };
}

export function analyzePlaytestFiles(files) {
    return files.map((file) => analyzePlaytestLog(
        JSON.parse(fs.readFileSync(file, 'utf8')),
        path.basename(file)
    ));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const files = process.argv.slice(2);
    if (files.length === 0) {
        console.error('Usage: node scripts/playtest-navigation-report.js <Log*.log> [...]');
        process.exitCode = 1;
    } else {
        console.table(analyzePlaytestFiles(files));
    }
}
