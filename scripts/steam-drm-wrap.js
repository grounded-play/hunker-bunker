#!/usr/bin/env node
/**
 * scripts/steam-drm-wrap.js
 * Automated wrapper and runbook runner for Valve Steamworks DRM tool.
 * Per docs/steam-launch-readiness-master-plan.md Phase 11.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function getDrmWrapPaths(root = rootDir) {
    return {
        winUnpackedExe: path.join(root, 'dist_electron', 'win-unpacked', 'Hunker Bunker.exe'),
        drmToolPath: process.env.STEAM_DRM_TOOL_PATH || path.join(root, 'steam', 'sdk', 'tools', 'ContentBuilder', 'builder', 'drmwrap.exe')
    };
}

export function printDrmWrapProcedure({ winUnpackedExe, drmToolPath }) {
    console.log(`
========================================================================
             HUNKER BUNKER — STEAM DRM WRAPPER PROCEDURE               
========================================================================

Target Executable: ${winUnpackedExe}
DRM Tool Path:     ${drmToolPath}

Instructions for Steamworks DRM Wrapping:
------------------------------------------------------------------------
1. Download the Steamworks SDK (tools/ContentBuilder/builder/drmwrap.exe).
2. Ensure packaged build exists at dist_electron/win-unpacked/Hunker Bunker.exe.
3. Run Valve's drmwrap tool (or use Steamworks Partner Site DRM wrapper):

   Command syntax:
   drmwrap.exe -appid 4957040 -input "dist_electron/win-unpacked/Hunker Bunker.exe" -output "dist_electron/win-unpacked/Hunker Bunker.exe" -tool 0

4. Verify the executable launches cleanly through Steam client.
========================================================================
`);
}

export function runSteamDrmWrap(options = {}) {
    const root = options.rootDir || rootDir;
    const paths = getDrmWrapPaths(root);
    const winExe = options.winExe || paths.winUnpackedExe;
    const drmTool = options.drmTool || paths.drmToolPath;
    const appId = options.appId || process.env.HB_STEAM_APPID || '4957040';

    printDrmWrapProcedure({ winUnpackedExe: winExe, drmToolPath: drmTool });

    if (!fs.existsSync(winExe)) {
        console.warn(`[steam:drm] Executable not found at "${winExe}". Run 'npm run electron:build' first.`);
        return { success: false, status: 'exe_missing', winExe, drmTool };
    }

    if (!fs.existsSync(drmTool)) {
        console.info(`[steam:drm] DRM tool not present at "${drmTool}". Follow manual procedure above when packaging Steam depot.`);
        return { success: false, status: 'tool_missing', winExe, drmTool };
    }

    console.log(`[steam:drm] Executing DRM wrapper for App ID ${appId}...`);
    const result = spawnSync(drmTool, ['-appid', appId, '-input', winExe, '-output', winExe, '-tool', '0'], {
        stdio: 'inherit'
    });

    if (result.error || result.status !== 0) {
        console.error(`[steam:drm] DRM wrapping failed with status ${result.status}:`, result.error);
        return { success: false, status: 'failed', exitCode: result.status, error: result.error };
    }

    console.log(`[steam:drm] DRM wrapping completed successfully for ${winExe}.`);
    return { success: true, status: 'completed', winExe };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    runSteamDrmWrap();
}
