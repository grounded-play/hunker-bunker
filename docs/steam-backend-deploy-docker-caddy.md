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
SQLite Database / Persistent Volume (`./server/data/hunker_bunker.sqlite`)
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

## Location & Existing Server Setup

The production Docker Compose deployment files and environment secrets are configured in `~/server` (`/home/caveman/server/`):
- `~/server/compose.yaml`: Docker Compose service configuration.
- `~/server/Caddyfile`: Reverse proxy configuration for `steam.tuesdaycinema.club`.
- `~/server/backend.env`: Active production secrets and environment flags.
- `~/server/configure-secrets.sh`: Helper script to configure Web API secrets and session tokens.

## Environment Configuration

The existing `~/server/backend.env` contains:

```bash
NODE_ENV=production
PORT=3001
HB_STEAM_APPID=4957040

HB_STEAM_PUBLISHER_KEY=82FA9A2F2C6D1F2FE0DABE756C2C8385
HB_SESSION_SECRET=6725a1a1beef84f9489a2ca0eae59db71efbfb1cb93e2ce47a9a85d5d6a32473eeb82881ba97aa498814b66ea5d602fa
HB_ALLOWED_ORIGINS=https://steam.tuesdaycinema.club,http://steam.tuesdaycinema.club,https://tuesdaycinema.club,https://www.tuesdaycinema.club

# Real Steamworks Leaderboard IDs
HB_STEAM_LEADERBOARD_IDS=best_run_score:20504740,daily_ops_score:20504746,fastest_extraction_ms:20504747,deepest_depth_score:20504750,survival_time_seconds:20504754

HB_DB_STORAGE_PATH=/app/server/data/db_storage.json
HB_STEAM_DROP_COOLDOWN_SECONDS=60
HB_STEAM_MICROTXN_ENABLED=0
HB_STEAM_STORE_ENABLED=0
```

## Deployment Commands

### 1. Build and Start Containers
```bash
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
  "service": "hunker-bunker-steam-backend",
  "storage": {
    "backend": "sqlite",
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

Database persistence is mounted at `./server/data/`.

To back up the SQLite database:
```bash
cp server/data/hunker_bunker.sqlite server/data/hunker_bunker.sqlite.bak-$(date +%Y%m%d%H%M%S)
```

To restart the backend service without tearing down network/Caddy:
```bash
docker compose restart backend
```
