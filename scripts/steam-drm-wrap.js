#!/usr/bin/env node

/**
 * Hunker Bunker — Steam DRM Wrapper Invocation Helper
 *
 * This script automates running the Steamworks DRM wrapper on the Windows build
 * of the game.
 *
 * Usage:
 *   node scripts/steam-drm-wrap.js --tool <path/to/steamworks_drm.exe> [--key <optional_drm_key>]
 *
 * It will:
 *   1. Resolve the target App ID (default: 4957040).
 *   2. Find the compiled executable at: dist_electron/win-unpacked/Hunker Bunker.exe
 *   3. Execute steamworks_drm.exe to wrap the binary.
 *   4. Replace the original binary with the wrapped version.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to print usage instructions
function printUsage(errorMsg = '') {
    if (errorMsg) {
        console.error(`\x1b[31mError: ${errorMsg}\x1b[0m\n`);
    }
    console.log(`Hunker Bunker — Steam DRM Wrapper Helper`);
    console.log(`========================================`);
    console.log(`Usage:`);
    console.log(`  node scripts/steam-drm-wrap.js --tool <path/to/steamworks_drm.exe> [--key <drm_key>] [--appid <id>]`);
    console.log(`\nOptions:`);
    console.log(`  --tool   Path to steamworks_drm.exe from Steamworks SDK.`);
    console.log(`  --key    Optional DRM key assigned to your app in the Steamworks partner portal.`);
    console.log(`  --appid  Override Steam App ID (default parsed from configs, fallback: 4957040).`);
    console.log(`\nNotes:`);
    console.log(`  - DRM wrapping is only supported for Windows executables (.exe).`);
    console.log(`  - If running this helper on Linux/macOS, it will attempt to use Wine to run steamworks_drm.exe.`);
}

// Simple CLI arg parser
const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = process.argv[i + 1];
        if (value && !value.startsWith('--')) {
            args[key] = value;
            i++;
        } else {
            args[key] = true;
        }
    }
}

// Resolve App ID
let appId = 4957040; // Fallback
const rootPath = path.resolve(__dirname, '..');
const configPath = path.join(rootPath, 'electron', 'steam-config.json');

if (args.appid) {
    appId = Number(args.appid);
} else if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.appId) appId = Number(config.appId);
    } catch (err) {
        console.warn(`[steam-drm] Warning: failed to parse steam-config.json for App ID:`, err.message);
    }
}

// Locate target executable
const targetExePath = path.join(rootPath, 'dist_electron', 'win-unpacked', 'Hunker Bunker.exe');
if (!fs.existsSync(targetExePath)) {
    printUsage(`Target executable not found at: ${targetExePath}\nPlease run "npm run electron:build" first to package the app.`);
    process.exit(1);
}

// Resolve DRM wrapper tool path
let toolLocation = args.tool || process.env.STEAMWORKS_SDK_PATH 
    ? path.join(process.env.STEAMWORKS_SDK_PATH, 'sdk', 'tools', 'ContentPrep', 'steamworks_drm.exe') 
    : null;

// Search common locations if not provided
const commonPaths = [
    path.join(rootPath, 'steamworks_drm.exe'),
    path.join(rootPath, 'steam', 'tools', 'steamworks_drm.exe'),
    path.join(rootPath, 'tools', 'steamworks_drm.exe')
];

if (!toolLocation) {
    for (const cp of commonPaths) {
        if (fs.existsSync(cp)) {
            toolLocation = cp;
            break;
        }
    }
}

if (!toolLocation || !fs.existsSync(toolLocation)) {
    printUsage(`Could not find steamworks_drm.exe.\nPlease supply the path using --tool, or set STEAMWORKS_SDK_PATH in your environment.`);
    process.exit(1);
}

// Verify wrapping parameters
console.log(`[steam-drm] Target Executable: ${targetExePath}`);
console.log(`[steam-drm] Wrapper Tool:      ${toolLocation}`);
console.log(`[steam-drm] App ID:            ${appId}`);

const tempOutPath = targetExePath + '.wrapped';

// Construct wrapper command line
const isWindows = process.platform === 'win32';
let command = '';

const toolArgs = [
    '-inputfile', `"${targetExePath}"`,
    '-outputfile', `"${tempOutPath}"`,
    '-appid', String(appId)
];

if (args.key) {
    toolArgs.push('-key', `"${args.key}"`);
}

// On non-Windows platforms, run via Wine if available
if (!isWindows) {
    console.log(`[steam-drm] Non-Windows OS detected (${process.platform}). Attempting wrapper via Wine...`);
    command = `wine "${toolLocation}" ${toolArgs.join(' ')}`;
} else {
    command = `"${toolLocation}" ${toolArgs.join(' ')}`;
}

console.log(`[steam-drm] Executing: ${command}`);

try {
    execSync(command, { stdio: 'inherit' });
    
    // Check if output was generated
    if (!fs.existsSync(tempOutPath)) {
        console.error(`\x1b[31m[steam-drm] Error: Wrapper command completed, but target was not generated at ${tempOutPath}\x1b[0m`);
        process.exit(1);
    }

    // Replace original executable
    fs.unlinkSync(targetExePath);
    fs.renameSync(tempOutPath, targetExePath);

    console.log(`\x1b[32m[steam-drm] Success! Wrapped executable saved to ${targetExePath}\x1b[0m`);
} catch (err) {
    console.error(`\x1b[31m[steam-drm] Execution failed: ${err.message}\x1b[0m`);
    if (fs.existsSync(tempOutPath)) {
        fs.unlinkSync(tempOutPath);
    }
    process.exit(1);
}
