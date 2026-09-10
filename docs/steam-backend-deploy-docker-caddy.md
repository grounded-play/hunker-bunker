# Steam Backend Deployment — Docker Compose & Caddy (`steam.tuesdaycinema.club`)

This runbook documents how to deploy and operate the Hunker Bunker trusted Steam backend server using **Docker Compose** behind a **Caddy** reverse proxy on a self-hosted device routing `https://steam.tuesdaycinema.club`.

## Target Architecture

```text
Installed Steam Build (Electron)
   │
   │ HTTPS requests (bearer session token / auth tickets)
   ▼
https://steam.tuesdaycinema.club (Port 443)
   │
   ▼
Caddy Reverse Proxy Container (`caddy:2-alpine`)
   │
   ▼ (internal Docker network: hb-network)
Node.js Express Backend Container (`hunker-bunker-backend`:3001)
   │
   ▼
SQLite Database / Docker Volume (`hunker-bunker-data:/app/server/data/db_storage.sqlite`)
```

## Prerequisites

1. A device running Docker & Docker Compose (`docker compose` or `docker-compose`).
2. Domain DNS for `steam.tuesdaycinema.club` pointed to the public IP of the host device.
3. Router / Firewall forwarding ports 80 (HTTP) and 443 (HTTPS/UDP) to the host device.
4. Steamworks Publisher Web API Key for App ID `4957040`.

## Configuration Files

The repository includes:
- `Dockerfile`: Builds the production Node.js 22 runtime container.
- `docker-compose.yml`: Defines the `backend` and `caddy` services.
- `Caddyfile`: Maps `steam.tuesdaycinema.club` to `backend:3001` with automatic Let's Encrypt / ZeroSSL TLS certificates.

## Location & Version-Controlled Setup

The deployment configuration is version-controlled in `deploy/docker-caddy/` and deployed on host in `~/server` (`/home/caveman/server/`):
- `deploy/docker-caddy/compose.yaml`: Version-controlled Docker Compose service configuration.
- `deploy/docker-caddy/Caddyfile`: Reverse proxy configuration for `steam.tuesdaycinema.club`.
- `deploy/docker-caddy/backend.env.example`: Sanitized environment template.
- `deploy/docker-caddy/configure-secrets.sh`: Helper script to configure Web API secrets and session tokens into protected `backend.env`.
- `~/server/backend.env`: Active production secrets and environment flags (ignored in git).

## Environment Configuration

The existing `~/server/backend.env` contains the following configuration
shape. Never copy real credential values into this repository:

```bash
NODE_ENV=production
PORT=3001
HB_STEAM_APPID=4957040

HB_STEAM_PUBLISHER_KEY=<set only in ~/server/backend.env>
HB_SESSION_SECRET=<set only in ~/server/backend.env>
HB_ALLOWED_ORIGINS=https://steam.tuesdaycinema.club,https://tuesdaycinema.club,https://www.tuesdaycinema.club

# Real Steamworks leaderboard name-to-ID mappings
HB_STEAM_LEADERBOARD_IDS=<five configured leaderboard mappings>

HB_DB_STORAGE_PATH=/app/server/data/db_storage.sqlite
HB_STEAM_DROP_COOLDOWN_SECONDS=60
HB_STEAM_MICROTXN_ENABLED=0
HB_STEAM_STORE_ENABLED=0
```

> Security note (2026-07-28): an older revision of this document contained
> literal credential values. They have been removed from the tracked file,
> but removal does not erase Git history. The operator reports that the Steam
> Publisher Web API key and `HB_SESSION_SECRET` have now been secured/rotated
> in the external deployment. No replacement values were copied into the
> repository. Live confirmation that the old key and sessions are rejected,
> plus a successful new ticket exchange, remains part of release acceptance.

## Verified Local Deployment

Read-only inspection confirmed:

- Compose project `server` is running from `/home/caveman/server/compose.yaml` (mirrored in `deploy/docker-caddy/compose.yaml`).
- The backend container is healthy and uses `restart: unless-stopped`.
- Caddy is running with ports 80 and 443 exposed.
- Backend port 3001 is bound only to `127.0.0.1`.
- Caddy proxies `steam.tuesdaycinema.club` to the backend over the Compose network.
- `http://127.0.0.1:3001/health` returns HTTP 200.
- `https://steam.tuesdaycinema.club/health` returns HTTP 200 through Caddy.
- Health reports Steam App ID `4957040`, Steam auth configured, explicit
  session signing, and durable initialized SQLite storage.
- `HB_STEAM_PUBLISHER_KEY`, `HB_SESSION_SECRET`, `HB_ALLOWED_ORIGINS`,
  `HB_DB_STORAGE_PATH`, and all five leaderboard mappings are set.
- An unapproved Origin does not receive an `Access-Control-Allow-Origin` response header.
- Store and MicroTxn flags are present but remain disabled.
- The strict backend audit passes with 0 failures and 5/5 configured leaderboards.
- The production image does not include `scripts/`, so
  `npm run steam:audit-backend:strict` cannot execute inside the container.
  Run it from a repository checkout against the deployment environment.

This proves the backend is configured, running, publicly reachable, and
durable. It does **not** by itself prove that a Steam-installed game can
successfully authenticate, submit a live leaderboard score, synchronize
Cloud saves, or receive a real Inventory grant. Those require an installed
Steam acceptance pass.

## Session log drop box

The in-game debug console (`~`) can push a session capture to this backend so
PC and Steam Deck logs from the same play session land in one directory
instead of in a browser's Downloads folder or behind a native save dialog on
the Deck.

| Route | Purpose |
| --- | --- |
| `POST /logs/session` | Upload a capture. Body is the raw serialized log; `x-hb-log-name` and `x-hb-log-device` headers label it. |
| `GET /logs/session` | List stored captures, newest first. |
| `GET /logs/session/:name` | Read one back for review. |

Configured by two variables:

- `HB_SESSION_LOG_DIR` — where captures are written. Keep it under
  `/app/server/data` so it sits on the persistent volume and survives a
  `--build` redeploy. Defaults to `server/session-logs` beside the code, which
  would **not** persist in a container.
- `HB_LOG_UPLOAD_TOKEN` — optional shared secret. Unset means any client that
  can reach the host may upload, which is fine for a private box. Set it on a
  publicly reachable backend; the game sends it as `x-hb-log-token`.

Uploads are rate limited (30/minute) and capped at 32 MB each. Caddy already
reverse-proxies every path to the backend, so no proxy change is needed.

Verify after deploying:

```bash
curl https://steam.tuesdaycinema.club/logs/session
```

A JSON body with `"ok":true` means the route is live. A `404` means the
container is still running an older build.

## Deployment Commands

### 1. Build and Start Containers
```bash
cd ~/server
docker compose up -d --build
```

### 2. Verify Status
Check running containers:
```bash
docker compose ps
```

Check health endpoint locally:
```bash
curl http://localhost:3001/health
```

Check public HTTPS endpoint:
```bash
curl https://steam.tuesdaycinema.club/health
```

Expected health JSON response:
```json
{
  "ok": true,
  "service": "hunker-bunker-relay",
  "storage": {
    "storageBackend": "sqlite",
    "durable": true
  },
  "steam": {
    "appId": 4957040,
    "authConfigured": true
  }
}
```

### 3. Log Inspection
To view backend logs in real time:
```bash
docker compose logs -f backend
```

To view Caddy TLS and reverse proxy logs:
```bash
docker compose logs -f caddy
```

## Maintenance & Data Backups

Database persistence is stored in the named Docker volume
`hunker-bunker-data`, mounted at `/app/server/data` inside the backend
container. It is not a `~/server/data` bind mount.

Create a versioned, checksummed host-side archive. The tool refuses a live
filesystem copy, so stop and restart only the backend service:
```bash
cd ~/server
docker compose stop hunker-bunker-backend
cd /path/to/hunker-bunker
npm run steam:backend-volume -- backup \
  --archive "$HOME/server/backups/hunker-bunker-data-YYYYMMDD-HHMMSS.tar.gz"
cd ~/server
docker compose start hunker-bunker-backend
```

Verification, isolated restore drills, retention, and off-device policy are in
`docs/steam-backend-admin-runbook.md`. Never restore directly over the live
named volume.

To restart the backend service without tearing down network/Caddy:
```bash
cd ~/server
docker compose restart hunker-bunker-backend
```
