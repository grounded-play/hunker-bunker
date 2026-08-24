#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = path.resolve(ROOT_DIR, 'docs/reports/chroma-green-audit-report.json');

// Explicit allowlist of assets that intentionally contain green pixels (lore, bio/toxic slime, moss, radars, raw chroma sources)
export const CHROMA_GREEN_ALLOWLIST = new Set([
    'public/economy/mod_thermal_heat_exchanger_chroma.jpg',
    'public/economy/gun_scout_talon_c_chroma.jpg',
    'public/economy/mod_kinetic_impact_chroma.jpg',
    'public/economy/mod_bio_hazard_filter_chroma.jpg',
    'public/economy/charm_dark_matter_chroma.jpg',
    'public/economy/charm_void_crawler_chroma.jpg',
    'public/economy/charm_snail_shell_chroma.jpg',
    'public/economy/mod_cryo_core_chroma.jpg',
    'public/economy/mod_overdrive_actuator_chroma.jpg',
    'public/economy/charm_dark_matter.png',
    'public/economy/charm_dark_matter_large.png',
    'public/economy/mod_thermal_heat_exchanger.png',
    'public/economy/mod_thermal_heat_exchanger_large.png',
    'public/economy/mod_kinetic_impact.png',
    'public/economy/mod_kinetic_impact_large.png',
    'public/economy/mod_bio_hazard_filter.png',
    'public/economy/mod_bio_hazard_filter_large.png',
    'public/bio_spores_blue.png',
    'public/bio_spores.png',
    'public/bio_grunge_spores.png',
    'public/decal_biohazard_stencil.png',
    'public/decal_tallow_symbol.png',
    'public/decal_maintenance_shrine.png',
    'public/decal_worker_sleep_roll.png',
    'public/decal_failed_decon_kit.png',
    'public/decal_emergency_oxygen_nest.png',
    'public/decal_oil_spill_patch.png',
    'public/decal_tallow_herb_cache.png',
    'public/decal_claw_scratches.png',
    'public/decal_hazard_stripes.png',
    'public/decal_hive_growth.png',
    'public/decal_spore_growth_patch.png',
    'public/decal_wall_breach.png',
    'public/decal_bio_sample_spill.png',
    'public/decal_footprints_mud.png',
    'public/decal_meridian_stencil.png',
    'public/decal_abandoned_meal_tray.png',
    'public/decal_bullet_holes.png',
    'public/decal_barricade_last_stand.png',
    'public/decal_childlike_cave_map.png',
    'public/scatter_bio_moss.png',
    'public/scatter_slime_puddle.png',
    'public/scatter_camp_supplies.png',
    'public/scatter_hive_eggs.png',
    'public/scatter_broken_drone.png',
    'public/crash_site_broken_floor_v1.png',
    'public/prop_biomech_incubator.jpg',
    'public/prop_fabricator_workstation.jpg',
    'public/prop_tesla_coil_node.jpg',
    'public/prop_biomech_neural_synapse.jpg',
    'public/prop_biomech_flesh_locker.jpg',
    'public/prop_biomech_respirator.jpg',
    'public/prop_biomech_sphincter_trap.jpg',
    'public/prop_laser_trap_emitter.jpg',
    'public/prop_biomech_triage_cradle.jpg',
    'public/prop_vital_monitor.jpg',
    'public/prop_diagnostic_console.png',
    'public/prop_security_locker.png',
    'public/prop_medical_bed.png',
    'public/prop_cave_eggs_hatched.png',
    'public/prop_cave_bones.png',
    'public/prop_hive_resin_sac.png',
    'public/prop_biomech_pillar_right.png',
    'public/prop_hive_chitin_hatchery.jpg',
    'public/prop_torn_warning_poster.png',
    'public/prop_ammo_crate_stack.jpg',
    'public/prop_o2_filter_vat.jpg',
    'public/prop_camp_tallow_still.jpg',
    'public/prop_spore_colony.png',
    'public/prop_blood_trail.png',
    'public/prop_camp_tallow_spore_trays.jpg',
    'public/prop_camp_tallow_resin_urn.jpg',
    'public/egg_cluster.png',
    'public/cybersnail.png',
    'public/boss_sporesnail.png',
    'public/sporesnail.png',
    'public/boss_decoy_scout.png',
    'public/queen_silhouette.png',
    'public/alien_proto_spitter_walk.png',
    'public/scout_walk.png',
    'public/engineer_walk.png',
    'public/tank_walk.png',
    'public/art-remaster/enemy-v5/snails/final/boss-sporesnail-walk-v5.png',
    'public/art-remaster/enemy-v5/snails/final/sporesnail-walk-v5.png',
    'public/art-remaster/enemy-v5/snails/final/cybersnail-walk-v5.png',
    'public/art-remaster/enemy-v5/snails/final/cryosnail-walk-v5.png',
    'public/art-remaster/enemy-v5/snails/final/boss-cybersnail-walk-v5.png',
    'public/art-remaster/enemy-v5/snails/final/boss-cryosnail-walk-v5.png',
    'public/Tank.full.jpeg',
    'public/Eng.Full.jpeg',
    'public/Scout.full.jpeg',
    'public/Tank.full_v2.png',
    'public/Eng.Full_v2.png',
    'public/Scout.full_v2.png',
    'public/schematics/schematic_05.webp',
    'public/schematics/schematic_06.webp',
    'public/lore_portraits/queen_00.webp'
]);

export function decodeAndSamplePng(buffer) {
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504E47) return null;
    let offset = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks = [];
    let palette = null;

    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        if (offset + 12 + length > buffer.length) break;
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        offset += 12 + length;

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
        } else if (type === 'PLTE') {
            palette = data;
        } else if (type === 'IDAT') {
            idatChunks.push(data);
        } else if (type === 'IEND') {
            break;
        }
    }

    if (!idatChunks.length || bitDepth !== 8) return null;
    let decompressed;
    try {
        decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    } catch {
        return null;
    }

    let bpp = 0;
    if (colorType === 6) bpp = 4; // RGBA
    else if (colorType === 2) bpp = 3; // RGB
    else if (colorType === 3) bpp = 1; // Indexed
    else if (colorType === 0) bpp = 1; // Grayscale
    else if (colorType === 4) bpp = 2; // GA
    else return null;

    const stride = width * bpp;
    const expectedSize = height * (1 + stride);
    if (decompressed.length < expectedSize) return null;

    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 3000));
    let greenCount = 0;
    let sampledCount = 0;

    let prevRow = Buffer.alloc(stride);
    let currRow = Buffer.alloc(stride);
    let srcPos = 0;
    let pixelIndex = 0;

    for (let y = 0; y < height; y++) {
        const filter = decompressed[srcPos++];
        for (let x = 0; x < stride; x++) {
            const byte = decompressed[srcPos++];
            const left = x >= bpp ? currRow[x - bpp] : 0;
            const up = prevRow[x];
            const upLeft = x >= bpp ? prevRow[x - bpp] : 0;

            let val = byte;
            if (filter === 1) val = (byte + left) & 0xff;
            else if (filter === 2) val = (byte + up) & 0xff;
            else if (filter === 3) val = (byte + Math.floor((left + up) / 2)) & 0xff;
            else if (filter === 4) {
                const p = left + up - upLeft;
                const pa = Math.abs(p - left);
                const pb = Math.abs(p - up);
                const pc = Math.abs(p - upLeft);
                const pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
                val = (byte + pr) & 0xff;
            }
            currRow[x] = val;
        }

        const rowPixelStart = y * width;
        const rowPixelEnd = rowPixelStart + width;
        while (pixelIndex < rowPixelEnd) {
            const col = pixelIndex - rowPixelStart;
            const offset = col * bpp;
            let r = 0, g = 0, b = 0, a = 255;
            if (colorType === 6) {
                r = currRow[offset];
                g = currRow[offset + 1];
                b = currRow[offset + 2];
                a = currRow[offset + 3];
            } else if (colorType === 2) {
                r = currRow[offset];
                g = currRow[offset + 1];
                b = currRow[offset + 2];
            } else if (colorType === 3 && palette) {
                const idx = currRow[offset];
                r = palette[idx * 3];
                g = palette[idx * 3 + 1];
                b = palette[idx * 3 + 2];
            }

            sampledCount++;
            if (a > 25) {
                if (g > 180 && g > 1.5 * Math.max(r, b) && (r < 110 || b < 110)) {
                    greenCount++;
                }
            }

            pixelIndex += step;
        }

        const tmp = prevRow;
        prevRow = currRow;
        currRow = tmp;
    }

    const ratio = greenCount / (sampledCount || 1);
    return { width, height, ratio };
}

function walkDir(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walkDir(full));
        else files.push(full);
    }
    return files;
}

export function runChromaGreenScan() {
    // Try Python + PIL first if available; otherwise use pure Node.js PNG scanner
    const pythonScript = `
import os, json
try:
    from PIL import Image
except ImportError:
    print("[]")
    exit(0)

image_exts = {'.png', '.webp', '.jpg', '.jpeg'}
findings = []

for root, dirs, files in os.walk('public'):
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext in image_exts:
            if f.endswith('_normal.png') or f.endswith('_normal.jpg'):
                continue
            filepath = os.path.join(root, f)
            relpath = filepath.replace('\\\\', '/')
            try:
                im = Image.open(filepath).convert('RGBA')
                w, h = im.size
                pixels = im.getdata()
                total = w * h
                step = max(1, total // 3000)
                green_count = 0
                for i in range(0, total, step):
                    r, g, b, a = pixels[i]
                    if a > 25:
                        if g > 180 and g > 1.5 * max(r, b) and (r < 110 or b < 110):
                            green_count += 1
                ratio = green_count / (total / step)
                if ratio > 0.02:
                    findings.append({
                        'file': relpath,
                        'ratio': round(ratio, 4),
                        'width': w,
                        'height': h
                    })
            except Exception:
                pass

print(json.dumps(findings))
`;

    let pythonResults = null;
    try {
        const stdout = execFileSync('python3', ['-c', pythonScript], { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 15000 });
        const parsed = JSON.parse(stdout || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
            pythonResults = parsed;
        }
    } catch {
        pythonResults = null;
    }

    if (pythonResults) {
        return pythonResults;
    }

    // Pure Node.js scanner (fast, zero external dependencies)
    const findings = [];
    const publicDir = path.resolve(ROOT_DIR, 'public');
    const files = walkDir(publicDir);

    for (const file of files) {
        const rel = path.relative(ROOT_DIR, file).split(path.sep).join('/');
        if (rel.endsWith('.png') && !rel.endsWith('_normal.png')) {
            try {
                const buf = fs.readFileSync(file);
                const res = decodeAndSamplePng(buf);
                if (res && res.ratio > 0.02) {
                    findings.push({
                        file: rel,
                        ratio: Math.round(res.ratio * 10000) / 10000,
                        width: res.width,
                        height: res.height
                    });
                }
            } catch {
                // Ignore corrupt or unreadable files
            }
        }
    }

    return findings;
}

export function auditChromaGreen({ check = false, writeReport = true } = {}) {
    const findings = runChromaGreenScan();
    const unallowed = findings.filter((item) => !CHROMA_GREEN_ALLOWLIST.has(item.file));

    const report = {
        timestamp: new Date().toISOString(),
        scannedCount: findings.length,
        unallowedCount: unallowed.length,
        allowlistCount: CHROMA_GREEN_ALLOWLIST.size,
        unallowed,
        findings
    };

    if (writeReport) {
        fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
        fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    }

    if (check && unallowed.length > 0) {
        console.error(`[chroma-green] FAILED: ${unallowed.length} unexpected chroma-green assets detected:`);
        for (const item of unallowed) {
            console.error(`  - ${item.file} (${(item.ratio * 100).toFixed(1)}% green pixels, ${item.width}x${item.height})`);
        }
        return { ok: false, report };
    }

    console.log(`[chroma-green] ok (${findings.length} green assets evaluated, ${unallowed.length} unapproved)`);
    return { ok: true, report };
}

function main() {
    const check = process.argv.includes('--check');
    const { ok } = auditChromaGreen({ check });
    if (!ok) {
        process.exitCode = 1;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
