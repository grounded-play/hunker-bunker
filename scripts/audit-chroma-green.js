#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
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

export function runChromaGreenScan() {
    const pythonScript = `
import os, json
from PIL import Image

image_exts = {'.png', '.webp', '.jpg', '.jpeg'}
findings = []

for root, dirs, files in os.walk('public'):
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext in image_exts:
            # Skip normal maps which encode geometric vectors in RGB
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

    const stdout = execFileSync('python3', ['-c', pythonScript], { cwd: ROOT_DIR, encoding: 'utf8' });
    const results = JSON.parse(stdout || '[]');
    return results;
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
