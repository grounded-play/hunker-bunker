# Deployment Topology & Environment Ownership

**Status:** Current architecture reference / action required on legacy deploy path
**Last verified:** 2026-08-24

## Purpose

Hunker Bunker currently contains more than one plausible backend deployment path. Sprint 30 must make it impossible for a contributor to mistake a legacy/alternate configuration for the production environment.

This document records **what the repository currently indicates**, not secret values. Never place credentials in this file.

---

## Current product surfaces

### Browser build

**Role:** public browser/demo/development surface.
**Current public host referenced by README:** Netlify (`hunkerbunker.netlify.app`).
**Build source:** Vite `dist/` output.

The browser build is useful for fast UI/gameplay testing but cannot prove Steamworks/Electron/package-specific behavior.

### Desktop / Steam build

**Role:** commercial target runtime.
**Shell:** Electron.
**Steam integration:** native `steamworks.js` in Electron main process, bridged through preload.
**Packaging:** Electron Builder / Steam depot workflow.

Package acceptance must use an installed/package-equivalent build; a green Vite browser run is not equivalent evidence.

### Trusted multiplayer / Steam-adjacent backend

**Current production URL recorded by Product State and runtime docs:**

`https://steam.tuesdaycinema.club`

**Current self-hosted repo topology:**

```text
Internet
  ↓ HTTPS
Caddy :443
  ↓ reverse_proxy
backend:3001
  ↓
Node/Express/Socket.IO + Steam auth + persistence
```

Repository owners:

- `docker-compose.yml` — backend + Caddy service composition.
- `Caddyfile` — `steam.tuesdaycinema.club` → `backend:3001`.
- `Dockerfile` — backend image.
- `server/` — application/service implementation.

Current compose defaults keep Steam Store and MicroTxn disabled unless explicitly enabled by environment configuration.

---

## Legacy / conflicting deployment path: Fly.io

The repository still contains:

- `fly.toml` — Fly app configuration for `hunker-bunker-steam-backend`;
- `.github/workflows/steam-backend-deploy.yml` — manual GitHub Action that requires `FLY_API_TOKEN` and executes `flyctl deploy --remote-only`.

This conflicts with the current Product State / Docker+Caddy production description.

### Sprint 30 rule

Until the project owner explicitly decides whether Fly remains a supported failover/staging environment:

> **Do not treat `steam-backend-deploy.yml` as the canonical production deployment button.**

Do not delete it blindly either. First determine whether any active environment, DNS path, secret store, rollback procedure, or operator workflow still depends on it.

Sprint 30 disposition must be one of:

1. **Retain as supported staging/failover** — rename/document it accordingly and give it an explicit environment/domain purpose; or
2. **Archive/remove Fly deployment** — disable/remove workflow and `fly.toml` after confirming no active dependency; or
3. **Restore Fly as production** — only if current production architecture is intentionally being changed, in which case update Product State, runbooks and DNS/deployment docs together.

Leaving two unnamed "production" paths is not an acceptable steady state.

---

## Configuration ownership

### Backend secrets

Sensitive values belong in the actual host/CI secret store, never in git. Current code/workflows reference names including:

- `HB_STEAM_PUBLISHER_KEY`
- `HB_SESSION_SECRET`
- `HB_ALLOWED_ORIGINS`
- `HB_STEAM_LEADERBOARD_IDS`
- deployment credentials/tokens appropriate to the chosen host

Feature flags/configuration referenced by current backend paths include:

- `HB_STEAM_APPID`
- `HB_DB_BACKEND`
- `HB_DB_SQLITE_PATH`
- `HB_DB_STORAGE_PATH`
- `HB_STEAM_STORE_ENABLED`
- `HB_STEAM_MICROTXN_ENABLED`
- `HB_STEAM_STORE_MOCK_PURCHASES`
- `HB_STEAM_DROP_COOLDOWN_SECONDS`

This list documents names only. It does not imply all values should be GitHub Secrets; ownership depends on the chosen deployment system.

### Restoration requirement

Before release-candidate status, production operations should have a short restoration runbook answering:

1. where encrypted/managed secret values are stored;
2. which host receives them;
3. how persistent game/backend data is backed up/restored;
4. how DNS/TLS is restored;
5. how `/health` is verified after deployment;
6. how to roll back to the last accepted backend build;
7. which exact commit/image is currently live.

Do not write the secret values into the runbook.

---

## Environment evidence levels

### Local/dev

Evidence proves code behavior in a development environment only.

### Packaged local

Evidence proves Electron/package media/native boundaries, but not necessarily Steam identity or production networking.

### Steam-installed / production backend

Evidence should record:

- client commit/version;
- backend commit/image/version where available;
- Steam account/test context;
- production URL;
- package/depot branch;
- acceptance route result.

This is the required level for final multiplayer/auth/Cloud/release claims.

---

## Sprint 30 deployment tasks

1. Confirm the machine/service currently answering `steam.tuesdaycinema.club` and record its deployment owner.
2. Decide Fly disposition: staging/failover vs remove vs production.
3. Rename/disable/archive conflicting GitHub workflows accordingly.
4. Write one backend deploy/rollback runbook for the chosen production path.
5. Add one smoke command/route that proves service health and Steam-auth configuration without exposing secrets.
6. Record deployed build identity in health/ops output if it is not already available.
7. Ensure Steam client configuration points to the same canonical production service documented here.

## Acceptance

Deployment governance is accepted when a contributor can answer, without tribal knowledge:

- **Where is the browser build hosted?**
- **How is the Steam client packaged?**
- **Which backend is production?**
- **How is that backend deployed?**
- **Which deployment configs are legacy/staging?**
- **Where do secret values live?**
- **How do we verify and roll back a deploy?**

There should be exactly one current answer to each question.