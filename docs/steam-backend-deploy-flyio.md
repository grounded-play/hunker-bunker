# Steam Backend Deploy (Fly.io)

Date: 2026-07-13.

The trusted Steam backend (`server/index.js`: session auth, leaderboards,
inventory, store) must be reachable over HTTPS by a Steam-installed build.
This is the smallest path to a real backend instead of a local
`http://localhost:3001` dev target.
Fly.io was chosen because it's a single binary CLI, free-tier friendly for
a small Express/Socket.IO service, and needs no container registry setup.
If you'd rather use a different host (Render, a VPS, Railway), the
`Dockerfile` at the repo root is portable to any of them — only this doc
and the `fly.toml` are Fly-specific.

## What ships in the image

Only `server/` and production `dependencies` — not the game client (that
ships inside the Electron/Steam depot), not `devDependencies` (vite,
electron, electron-builder, eslint, vitest). See `Dockerfile`.

One caveat: `steamworks.js` is listed under `dependencies` in
`package.json` because the Electron main process needs it, but the backend
server never imports it. `npm ci` still installs it into this image
(harmless — Linux prebuilds exist — just slightly wasted build time). Not
worth splitting into a separate `server/package.json` for one native
module.

## One-time setup

```bash
curl -L https://fly.io/install.sh | sh   # installs the flyctl CLI
fly auth login
```

Pick a real app name (the `fly.toml` placeholder `hunker-bunker-steam-backend`
is almost certainly taken or wrong for your account) and create it:

```bash
fly apps create <your-app-name>
```

Update `app = "..."` in `fly.toml` to match.

## Persistent storage (do this before any real purchase/leaderboard traffic)

Fly machines have ephemeral local disks — `server/db_storage.json`
(inventories, leaderboards, idempotency, purchase receipts) would be wiped
on every deploy or restart without a volume:

```bash
fly volumes create hb_data --size 1 --region iad
```

`fly.toml` already mounts that volume at `/app/server/data` and sets
`HB_DB_STORAGE_PATH=/app/server/data/db_storage.json`.

This is still a single JSON file with an in-process write queue, fine for
early Playtest/Demo traffic. Move to a real database before this needs to
survive concurrent machines or serious write volume.

## Secrets

Never commit these. Set them on Fly, not in `fly.toml`:

```bash
fly secrets set \
  HB_STEAM_PUBLISHER_KEY=<steamworks web api publisher key> \
  HB_SESSION_SECRET=<long random string> \
  HB_ALLOWED_ORIGINS=<comma-separated origins your Electron build sends> \
  HB_STEAM_LEADERBOARD_IDS=<board name to id map, see steamLeaderboards.js>
```

Leave `HB_STEAM_MICROTXN_ENABLED` at `0` until Valve has actually enabled
Microtransactions for this app in Steamworks (separate partner
agreement/tax setup beyond the base Web API key) — until then, real-money
Cache Key purchases will 503 safely with `steam_microtxn_not_enabled`
instead of trying and failing against Steam's API. See
`docs/steam-lootbox-odds-disclosure.md` for the purchase flow this gates.

## Deploy

```bash
npm run steam:audit-backend:strict
fly deploy
```

Or use the `steam-backend-deploy` GitHub Actions workflow after setting:

- Secrets: `FLY_API_TOKEN`, `HB_STEAM_PUBLISHER_KEY`, `HB_SESSION_SECRET`
- Variables: `HB_ALLOWED_ORIGINS`, `HB_STEAM_LEADERBOARD_IDS`,
  `HB_STEAM_MICROTXN_ENABLED`, `HB_STEAM_STORE_ENABLED`

The workflow runs the same strict audit, builds the Docker image, then runs
`flyctl deploy --remote-only`.

Verify:

```bash
curl https://<your-app-name>.fly.dev/health
curl https://<your-app-name>.fly.dev/steam/store/catalog
```

`/health` should report `steam.authConfigured: true` and
`storage.durable: true`. If the strict audit fails, fix the env/secrets
before deploying.

## Wire the URL into packaged builds

Once you have the real `https://<your-app-name>.fly.dev` URL:

```bash
HB_STEAM_BACKEND_URL=https://<your-app-name>.fly.dev npm run steam:config
```

This writes `electron/steam-config.json`, which `electron:build` /
`electron:dist` already run automatically (`npm run steam:config` is
wired into both in `package.json`). Packaged builds read this file before
falling back to `localhost:3001` — see `electron/preload.cjs`.

## What's still not done

- No staging/production split — one Fly app, one set of secrets.
- No autoscaling/multi-region — fine for Playtest-scale traffic, revisit
  before a real launch.
- No monitoring/alerting on the backend itself.
