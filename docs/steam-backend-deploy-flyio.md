# Steam Backend Deploy (Fly.io)

Date: 2026-07-13.

The trusted Steam backend (`server/index.js`: session auth, leaderboards,
inventory, store) has never been deployed anywhere — packaged Electron
builds default to `http://localhost:3001`, which does not exist on a
player's machine. This is the smallest path to a real, reachable backend.
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

Then add to `fly.toml`:

```toml
[mounts]
  source = "hb_data"
  destination = "/app/server/data"
```

And set `HB_DB_STORAGE_PATH=/app/server/data/db_storage.json` as a secret
(see below) — `server/db.js` already reads this env var to override the
default path.

This is still a single JSON file with an in-process write queue, fine for
early Playtest/Demo traffic. Move to a real database before this needs to
survive concurrent machines or serious write volume.

## Secrets

Never commit these. Set them on Fly, not in `fly.toml`:

```bash
fly secrets set \
  HB_STEAM_PUBLISHER_KEY=<steamworks web api publisher key> \
  HB_STEAM_APPID=1247290 \
  HB_ALLOWED_ORIGINS=<comma-separated origins your Electron build sends> \
  HB_STEAM_LEADERBOARD_IDS=<board name to id map, see steamLeaderboards.js> \
  HB_STEAM_MICROTXN_ENABLED=0
```

Leave `HB_STEAM_MICROTXN_ENABLED` at `0` until Valve has actually enabled
Microtransactions for this app in Steamworks (separate partner
agreement/tax setup beyond the base Web API key) — until then, real-money
Cache Key purchases will 503 safely with `steam_microtxn_not_enabled`
instead of trying and failing against Steam's API. See
`docs/steam-lootbox-odds-disclosure.md` for the purchase flow this gates.

## Deploy

```bash
fly deploy
```

Verify:

```bash
curl https://<your-app-name>.fly.dev/health
curl https://<your-app-name>.fly.dev/steam/store/catalog
```

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
