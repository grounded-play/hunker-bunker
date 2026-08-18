# Hunker Bunker Self-Hosted Backend (Docker Compose + Caddy)

This directory contains the production Docker Compose and Caddy reverse proxy deployment for the Hunker Bunker trusted Steam backend server (`steam.tuesdaycinema.club`).

## Architecture

- **Backend Container (`hunker-bunker-backend`)**: Node.js 22 runtime serving `/health`, `/steam/auth/session`, `/steam/leaderboards/*`, `/steam/inventory/*`, and `/steam/store/*`.
- **Caddy Reverse Proxy (`hunker-bunker-caddy`)**: Automatic TLS / HTTPS certificate management terminating traffic for `steam.tuesdaycinema.club` and proxying to port `3001`.
- **Storage Volume (`hunker-bunker-data`)**: Persistent SQLite storage mounted to `/app/server/data/db_storage.sqlite`.

## First Start & Configuration

1. Copy the environment example to `backend.env` (kept strictly untracked and never committed):
   ```bash
   cp backend.env.example backend.env
   chmod 600 backend.env
   ```
2. Run `./configure-secrets.sh` to configure the Steamworks Publisher Web API key and generate a fresh session secret:
   ```bash
   ./configure-secrets.sh
   ```
3. Start the containers:
   ```bash
   docker compose up -d --build
   ```
4. Verify health:
   ```bash
   curl http://127.0.0.1:3001/health
   curl https://steam.tuesdaycinema.club/health
   ```

## Operational Commands

- **Check logs**:
  ```bash
  docker compose logs -f hunker-bunker-backend
  ```
- **Rebuild and restart backend**:
  ```bash
  docker compose up -d --build --force-recreate hunker-bunker-backend
  ```
- **Run strict environment audit from repository root**:
  ```bash
  npm run steam:audit-backend:strict
  ```
- **Smoke test leaderboards against live backend**:
  ```bash
  npm run steam:smoke-leaderboards -- --backend-url https://steam.tuesdaycinema.club
  ```

## Security Rules

- `backend.env` contains active credentials and is explicitly ignored in `.gitignore`.
- Never print or commit `backend.env`.
- Container port `3001` is bound exclusively to `127.0.0.1` so Caddy is the only public ingress.
