/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACHIEVEMENT_DEFS } from '../src/achievements.js';
import { STEAM_LEADERBOARD_DEFS } from '../server/leaderboardScoring.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MARKDOWN_OUT = path.join(REPO_ROOT, 'docs', 'steam-dashboard-handoff.md');
const DEFAULT_JSON_OUT = path.join(REPO_ROOT, 'steam', 'dashboard_handoff.json');

const APP_ID = 4957040;
const CONTENT_DEPOT_ID = 4957041;
const PRODUCT_NAME = 'Hunker Bunker';
const STEAM_INPUT_MANIFEST_PATH = 'steam_input_manifest.vdf';

const SOURCE_REFS = Object.freeze([
    ['Steam Cloud', 'https://partner.steamgames.com/doc/features/cloud'],
    ['Stats and Achievements', 'https://partner.steamgames.com/doc/features/achievements'],
    ['Leaderboards Guide', 'https://partner.steamgames.com/doc/features/leaderboards/guide'],
    ['Inventory Service', 'https://partner.steamgames.com/doc/features/inventory'],
    ['Inventory Schema', 'https://partner.steamgames.com/doc/features/inventory/schema'],
    ['Item Store', 'https://partner.steamgames.com/doc/features/inventory/itemstore'],
    ['Steam Input Setup', 'https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs'],
    ['SteamPipe Uploads', 'https://partner.steamgames.com/doc/sdk/uploading']
]);

const STEAM_STATS = Object.freeze([
    {
        apiName: 'total_deaths',
        type: 'INT',
        setBy: 'Client',
        source: 'main.js -> recordAchievementEvent/recordAchievementRunEnd -> electronAPI.setStat'
    },
    {
        apiName: 'longest_run_seconds',
        type: 'INT',
        setBy: 'Client',
        source: 'main.js -> max run duration -> electronAPI.setStat'
    }
]);

const CLOUD_PATHS = Object.freeze([
    {
        platform: 'Windows',
        root: 'WinAppDataRoaming',
        path: PRODUCT_NAME,
        pattern: 'save.json',
        recursive: false
    },
    {
        platform: 'Linux + SteamOS',
        root: 'LinuxXdgDataHome',
        path: PRODUCT_NAME,
        pattern: 'save.json',
        recursive: false
    }
]);

const STEAM_INPUT_ACTIONS = Object.freeze([
    { actionSet: 'menu', actionType: 'Button', action: 'menu_up', label: 'Up' },
    { actionSet: 'menu', actionType: 'Button', action: 'menu_down', label: 'Down' },
    { actionSet: 'menu', actionType: 'Button', action: 'menu_left', label: 'Left' },
    { actionSet: 'menu', actionType: 'Button', action: 'menu_right', label: 'Right' },
    { actionSet: 'menu', actionType: 'Button', action: 'menu_confirm', label: 'Confirm' },
    { actionSet: 'menu', actionType: 'Button', action: 'menu_back', label: 'Back' },
    { actionSet: 'gameplay', actionType: 'StickPadGyro', action: 'move', label: 'Move' },
    { actionSet: 'gameplay', actionType: 'StickPadGyro', action: 'camera', label: 'Camera' },
    { actionSet: 'gameplay', actionType: 'Button', action: 'fire', label: 'Fire' },
    { actionSet: 'gameplay', actionType: 'Button', action: 'interact', label: 'Interact' },
    { actionSet: 'gameplay', actionType: 'Button', action: 'reload', label: 'Reload' },
    { actionSet: 'gameplay', actionType: 'Button', action: 'ability', label: 'Ability' },
    { actionSet: 'gameplay', actionType: 'Button', action: 'scan', label: 'Scan' },
    { actionSet: 'gameplay', actionType: 'Button', action: 'pause', label: 'Pause' }
]);

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

function relativeIfExists(relativePath) {
    return fs.existsSync(path.join(REPO_ROOT, relativePath)) ? relativePath : null;
}

function findAchievementAsset(icon, locked = false) {
    const suffix = locked ? '_locked' : '';
    const candidates = [
        `public/ach_${icon}${suffix}.png`,
        `public/ach_${icon}${suffix}.jpg`,
        `public/ach_${icon}${suffix}.jpeg`,
        locked ? 'public/ach_locked.png' : null,
        locked ? 'public/ach_locked.jpg' : null
    ].filter(Boolean);
    return candidates.find(relativeIfExists) ?? '';
}

function buildLeaderboardRows() {
    return Object.values(STEAM_LEADERBOARD_DEFS).map((def) => ({
        apiName: def.name,
        sortMethod: def.sortmethod,
        displayType: def.displaytype,
        uploadScoreMethod: def.scoreMethod,
        dashboardId: '<fill after Steamworks creation>'
    }));
}

function buildAchievementRows() {
    return ACHIEVEMENT_DEFS.map((def) => ({
        apiName: def.key,
        displayName: def.title,
        description: def.blurb,
        hidden: Boolean(def.secret),
        publishNow: !def.comingSoon,
        codeStatus: def.comingSoon ? 'hold: comingSoon in code' : 'active',
        icon: findAchievementAsset(def.icon ?? def.key),
        lockedIcon: findAchievementAsset(def.icon ?? def.key, true)
    }));
}

function buildInventorySummary(schema) {
    return {
        appid: schema.appid,
        itemCount: schema.items.length,
        sellableItems: schema.items
            .filter((item) => item.price || item.price_category)
            .map((item) => ({
                itemdefid: item.itemdefid,
                name: item.name,
                priceCategory: item.price_category ?? '',
                storeTags: item.store_tags ?? ''
            })),
        publicStoreFilters: [
            { name: 'Featured', storeTags: 'featured' },
            { name: 'Keys', storeTags: 'keys;cache_key' }
        ]
    };
}

export function buildDashboardHandoff({ generatedAt = new Date() } = {}) {
    const packageJson = readJson('package.json');
    const inventorySchema = readJson('steam/inventory_schema_hunker_bunker.json');
    const achievements = buildAchievementRows();
    const activeAchievements = achievements.filter((achievement) => achievement.publishNow);
    const heldAchievements = achievements.filter((achievement) => !achievement.publishNow);
    const leaderboards = buildLeaderboardRows();
    const leaderboardEnvTemplate = leaderboards
        .map((leaderboard) => `${leaderboard.apiName}:<${leaderboard.apiName}_id>`)
        .join(',');

    return {
        generatedAt: generatedAt.toISOString(),
        app: {
            appId: APP_ID,
            title: PRODUCT_NAME,
            packageName: packageJson.name,
            electronAppId: packageJson.build?.appId ?? '',
            productName: packageJson.build?.productName ?? PRODUCT_NAME
        },
        depots: {
            contentDepotId: CONTENT_DEPOT_ID,
            currentModel: 'single content depot',
            launchOptions: [
                { platform: 'Windows', executable: 'win-unpacked/Hunker Bunker.exe' },
                { platform: 'Linux + SteamOS', executable: 'linux-unpacked/hunker-bunker' }
            ],
            optionalFutureSplit: 'Create a second OS-specific depot in Steamworks, then update steam/app_build.vdf and .github/workflows/steam-build.yml.'
        },
        leaderboards,
        leaderboardEnvTemplate,
        achievements,
        activeAchievementCount: activeAchievements.length,
        heldAchievements,
        stats: STEAM_STATS,
        cloudPaths: CLOUD_PATHS,
        steamInput: {
            manifestSource: 'steam/steam_input_manifest.vdf',
            manifestInstallPath: STEAM_INPUT_MANIFEST_PATH,
            dashboardTemplate: 'Custom Configuration (Bundled with Game)',
            actions: STEAM_INPUT_ACTIONS
        },
        inventory: buildInventorySummary(inventorySchema),
        backendEnv: {
            HB_STEAM_APPID: String(APP_ID),
            HB_STEAM_ITEM_STORE_APPID: String(APP_ID),
            HB_STEAM_LEADERBOARD_IDS: leaderboardEnvTemplate,
            STEAM_APPID: String(APP_ID),
            STEAM_DEPOT_CONTENT: String(CONTENT_DEPOT_ID)
        },
        sourceRefs: SOURCE_REFS.map(([label, url]) => ({ label, url }))
    };
}

function md(value) {
    return String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

function table(headers, rows) {
    return [
        `| ${headers.map(md).join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.map(md).join(' | ')} |`)
    ].join('\n');
}

function renderSourceRefs(refs) {
    return refs.map((ref) => `- [${ref.label}](${ref.url})`).join('\n');
}

export function renderMarkdown(handoff) {
    const activeAchievements = handoff.achievements.filter((achievement) => achievement.publishNow);
    const heldAchievements = handoff.achievements.filter((achievement) => !achievement.publishNow);
    return `# Steam Dashboard Handoff

Generated: ${handoff.generatedAt.slice(0, 10)}.

This is the copy/paste packet for Steamworks dashboard work that cannot be
completed from the repo. Keep it in sync with code by running:

\`\`\`bash
npm run steam:dashboard-handoff
\`\`\`

## Official References

${renderSourceRefs(handoff.sourceRefs)}

## App And Depot Identity

| Field | Value |
| --- | --- |
| Steam App ID | \`${handoff.app.appId}\` |
| App title | ${handoff.app.title} |
| Electron product name | ${handoff.app.productName} |
| Current depot model | ${handoff.depots.currentModel} |
| Content depot | \`${handoff.depots.contentDepotId}\` |
| Build branch | \`beta\` |

## Launch Options

With the current single content depot, create one launch option per platform:

${table(
    ['Platform', 'Executable'],
    handoff.depots.launchOptions.map((row) => [row.platform, `\`${row.executable}\``])
)}

Future download-size improvement: ${handoff.depots.optionalFutureSplit}

## Leaderboards To Create

Create these in Steamworks, then copy the generated leaderboard IDs back into
\`HB_STEAM_LEADERBOARD_IDS\`.

${table(
    ['API Name', 'Sort Method', 'Display Type', 'Upload Method', 'Dashboard ID'],
    handoff.leaderboards.map((row) => [
        `\`${row.apiName}\``,
        row.sortMethod,
        row.displayType,
        row.uploadScoreMethod,
        row.dashboardId
    ])
)}

Backend env template after IDs exist:

\`\`\`bash
HB_STEAM_LEADERBOARD_IDS='${handoff.leaderboardEnvTemplate}'
\`\`\`

## Achievements To Publish

Publish the ${handoff.activeAchievementCount} active achievements below. Keep
\`comingSoon\` entries out of the live dashboard until their unlock paths are
active in code.

${table(
    ['API Name', 'Display Name', 'Hidden', 'Publish Now', 'Icon', 'Locked Icon', 'Description'],
    activeAchievements.map((achievement) => [
        `\`${achievement.apiName}\``,
        achievement.displayName,
        achievement.hidden ? 'Yes' : 'No',
        'Yes',
        achievement.icon ? `\`${achievement.icon}\`` : 'MISSING',
        achievement.lockedIcon ? `\`${achievement.lockedIcon}\`` : 'MISSING',
        achievement.description
    ])
)}

${heldAchievements.length > 0 ? `### Hold For Later

${table(
        ['API Name', 'Display Name', 'Reason'],
        heldAchievements.map((achievement) => [
            `\`${achievement.apiName}\``,
            achievement.displayName,
            achievement.codeStatus
        ])
    )}
` : ''}
## Stats To Publish

${table(
    ['API Name', 'Type', 'Set By', 'Code Source'],
    handoff.stats.map((stat) => [
        `\`${stat.apiName}\``,
        stat.type,
        stat.setBy,
        stat.source
    ])
)}

## Steam Cloud Auto-Cloud

Enable Steam Cloud and add these Auto-Cloud root paths. The game writes one
Electron save bridge file named \`save.json\` under Electron \`userData\`.

${table(
    ['Platform', 'Root', 'Path', 'Pattern', 'Recursive'],
    handoff.cloudPaths.map((row) => [
        row.platform,
        `\`${row.root}\``,
        `\`${row.path}\``,
        `\`${row.pattern}\``,
        row.recursive ? 'Yes' : 'No'
    ])
)}

Recommended quota for this save bridge: 5 MB and 32 files. The expected active
file count is one, but the extra headroom keeps migrations painless.

## Steam Input

| Field | Value |
| --- | --- |
| Dashboard template | ${handoff.steamInput.dashboardTemplate} |
| Manifest source in repo | \`${handoff.steamInput.manifestSource}\` |
| Manifest path in installed build | \`${handoff.steamInput.manifestInstallPath}\` |

Actions in the manifest:

${table(
    ['Action Set', 'Type', 'Action', 'Label'],
    handoff.steamInput.actions.map((action) => [
        action.actionSet,
        action.actionType,
        `\`${action.action}\``,
        action.label
    ])
)}

## Inventory Schema And Item Store

Upload \`steam/inventory_schema_hunker_bunker.json\` to Steam Inventory Service.

| Field | Value |
| --- | --- |
| Schema appid | \`${handoff.inventory.appid}\` |
| ItemDefs | ${handoff.inventory.itemCount} |
| Hosted Item Store URL | \`https://store.steampowered.com/itemstore/${handoff.app.appId}/\` |
| Hosted Item Store beta URL | \`https://store.steampowered.com/itemstore/${handoff.app.appId}/?beta=1\` |

Sellable ItemDefs:

${table(
    ['ItemDefID', 'Name', 'Price Category', 'Store Tags'],
    handoff.inventory.sellableItems.map((item) => [
        `\`${item.itemdefid}\``,
        item.name,
        `\`${item.priceCategory}\``,
        `\`${item.storeTags}\``
    ])
)}

Recommended top-level Item Store filters:

${table(
    ['Filter Name', 'store_tags'],
    handoff.inventory.publicStoreFilters.map((filter) => [
        filter.name,
        `\`${filter.storeTags}\``
    ])
)}

Do not enable live purchases until Valve MicroTxn approval, regional policy,
sandbox purchase tests, and live purchase reversal handling are accepted.

## Required Backend And CI Values

\`\`\`bash
HB_STEAM_APPID=${handoff.backendEnv.HB_STEAM_APPID}
HB_STEAM_ITEM_STORE_APPID=${handoff.backendEnv.HB_STEAM_ITEM_STORE_APPID}
HB_STEAM_LEADERBOARD_IDS='${handoff.backendEnv.HB_STEAM_LEADERBOARD_IDS}'

STEAM_APPID=${handoff.backendEnv.STEAM_APPID}
STEAM_DEPOT_CONTENT=${handoff.backendEnv.STEAM_DEPOT_CONTENT}
\`\`\`

Secrets that still must come from the dashboard/host:

- \`HB_STEAM_PUBLISHER_KEY\`
- \`HB_SESSION_SECRET\`
- \`HB_ALLOWED_ORIGINS\`
- \`HB_DB_STORAGE_PATH\` or \`HB_DB_SQLITE_PATH\`
- \`STEAM_BUILD_ACCOUNT\`
- \`STEAM_CONFIG_VDF\`

## Acceptance Checklist

- [ ] Leaderboards created and \`HB_STEAM_LEADERBOARD_IDS\` filled with real IDs.
- [ ] Achievements and stats published in Steamworks.
- [ ] Steam Cloud Auto-Cloud paths saved and published.
- [ ] Inventory schema uploaded and accepted.
- [ ] Steam Input template set to bundled config with manifest path \`${handoff.steamInput.manifestInstallPath}\`.
- [ ] Beta package includes app \`${handoff.app.appId}\` and depot \`${handoff.depots.contentDepotId}\`.
- [ ] Installed Steam beta launches both platform payloads through the configured launch options.
- [ ] Installed Steam beta reaches deployed \`/health\`, reads inventory, submits a trusted score, and syncs \`save.json\`.
`;
}

export function writeDashboardHandoff({
    markdownOut = DEFAULT_MARKDOWN_OUT,
    jsonOut = DEFAULT_JSON_OUT,
    generatedAt = new Date()
} = {}) {
    const handoff = buildDashboardHandoff({ generatedAt });
    fs.mkdirSync(path.dirname(markdownOut), { recursive: true });
    fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
    fs.writeFileSync(markdownOut, renderMarkdown(handoff), 'utf8');
    fs.writeFileSync(jsonOut, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
    return { handoff, markdownOut, jsonOut };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { markdownOut, jsonOut } = writeDashboardHandoff();
    console.log(`[steam-dashboard] wrote ${path.relative(REPO_ROOT, markdownOut)}`);
    console.log(`[steam-dashboard] wrote ${path.relative(REPO_ROOT, jsonOut)}`);
}
