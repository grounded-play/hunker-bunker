import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    buildDashboardHandoff,
    renderMarkdown,
    writeDashboardHandoff
} from './steam-dashboard-handoff.js';

const tempDirs = [];

function makeTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-steam-dashboard-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('steam dashboard handoff', () => {
    it('summarizes the current Steam app, depot, and dashboard objects', () => {
        const handoff = buildDashboardHandoff({ generatedAt: new Date('2026-07-16T00:00:00Z') });

        expect(handoff.app.appId).toBe(4957040);
        expect(handoff.depots.contentDepotId).toBe(4957041);
        expect(handoff.leaderboards.map((row) => row.apiName)).toEqual([
            'best_run_score',
            'daily_ops_score',
            'fastest_extraction_ms',
            'deepest_depth_score',
            'survival_time_seconds'
        ]);
        expect(handoff.stats.map((row) => row.apiName)).toEqual([
            'total_deaths',
            'longest_run_seconds'
        ]);
        expect(handoff.heldAchievements.map((row) => row.apiName)).toEqual(['slay_the_queen']);
        expect(handoff.activeAchievementCount).toBeGreaterThan(20);
        expect(handoff.inventory.appid).toBe(4957040);
        expect(handoff.inventory.publicStoreFilters.map((row) => row.name)).toEqual(['Featured', 'Keys']);
        expect(handoff.steamInput.manifestInstallPath).toBe('steam_input_manifest.vdf');
    });

    it('renders the dashboard copy/paste sections', () => {
        const handoff = buildDashboardHandoff({ generatedAt: new Date('2026-07-16T00:00:00Z') });
        const markdown = renderMarkdown(handoff);

        expect(markdown).toContain('Steam Dashboard Handoff');
        expect(markdown).toContain('HB_STEAM_LEADERBOARD_IDS=');
        expect(markdown).toContain('WinAppDataRoaming');
        expect(markdown).toContain('LinuxXdgDataHome');
        expect(markdown).toContain('steam_input_manifest.vdf');
        expect(markdown).toContain('steam/inventory_schema_hunker_bunker.json');
    });

    it('writes markdown and JSON artifacts', () => {
        const dir = makeTempDir();
        const markdownOut = path.join(dir, 'handoff.md');
        const jsonOut = path.join(dir, 'handoff.json');

        const result = writeDashboardHandoff({
            markdownOut,
            jsonOut,
            generatedAt: new Date('2026-07-16T00:00:00Z')
        });

        expect(fs.existsSync(markdownOut)).toBe(true);
        expect(fs.existsSync(jsonOut)).toBe(true);
        expect(JSON.parse(fs.readFileSync(jsonOut, 'utf8')).app.appId).toBe(4957040);
        expect(result.handoff.app.title).toBe('Hunker Bunker');
    });
});
