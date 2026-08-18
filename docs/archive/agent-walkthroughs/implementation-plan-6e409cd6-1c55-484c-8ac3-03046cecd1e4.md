# Implementation Plan: Version-Control Server Deployment & Secure Secrets

**Conversation ID**: `6e409cd6-1c55-484c-8ac3-03046cecd1e4`

Bring the untracked server deployment setup from `~/server` (`/home/caveman/server`) into the repository under version control safely, prevent accidental secret leaks with enhanced `.gitignore` rules, resolve the strict origin audit warning, and verify end-to-end backend and game integration.

## Proposed Changes

### 1. Security & Git Configuration

#### [MODIFY] [.gitignore](file:///home/caveman/Desktop/icecave/hunker-bunker/.gitignore)
- Add explicit ignore patterns for `*.env`, `backend.env`, and `deploy/**/backend.env` while whitelisting `.env.example`, `backend.env.example`, and `*.env.example`.
- Ensure all SQLite and local secret state cannot be staged or committed under any circumstance.

---

### 2. Version-Controlled Deployment Assets

#### [NEW] [deploy/docker-caddy/compose.yaml](file:///home/caveman/Desktop/icecave/hunker-bunker/deploy/docker-caddy/compose.yaml)
- Portable Docker Compose definition linking backend container (`hunker-bunker-backend`) and Caddy reverse proxy (`caddy:2-alpine`) with healthcheck dependencies and persistent named volumes.
- Uses `context: ../..` relative path to the repo root.

#### [NEW] [deploy/docker-caddy/Caddyfile](file:///home/caveman/Desktop/icecave/hunker-bunker/deploy/docker-caddy/Caddyfile) & [deploy/docker-caddy/Caddyfile.example](file:///home/caveman/Desktop/icecave/hunker-bunker/deploy/docker-caddy/Caddyfile.example)
- Production Caddy configuration routing `steam.tuesdaycinema.club` with automatic HTTPS reverse-proxying to `hunker-bunker-backend:3001`.

#### [NEW] [deploy/docker-caddy/backend.env.example](file:///home/caveman/Desktop/icecave/hunker-bunker/deploy/docker-caddy/backend.env.example)
- Sanitized environment variable template documenting all required Steamworks and backend settings (App ID, session secret instructions, leaderboard mappings, and SQLite storage path) with zero real secrets.

#### [NEW] [deploy/docker-caddy/configure-secrets.sh](file:///home/caveman/Desktop/icecave/hunker-bunker/deploy/docker-caddy/configure-secrets.sh)
- Interactive shell utility for safely configuring `backend.env` with 600 permissions, generating session secrets, triggering backend recreation, and running health checks without printing secrets.

#### [NEW] [deploy/docker-caddy/README.md](file:///home/caveman/Desktop/icecave/hunker-bunker/deploy/docker-caddy/README.md)
- Complete self-hosted deployment runbook, covering prerequisites, setup, secrets management, HTTPS verification, and operational commands.

---

### 3. Live Server Origin Fix & Audit

#### Fix `/home/caveman/server/backend.env`
- Update `HB_ALLOWED_ORIGINS` to remove `http://` entries, retaining approved HTTPS origins (`https://steam.tuesdaycinema.club,https://tuesdaycinema.club,https://www.tuesdaycinema.club`).
- Verify with `auditSteamBackendEnv(..., { strict: true })`.

---

## Verification Plan

### Automated Tests
1. **Strict Backend Environment Audit**:
   - Run strict audit against the updated environment configuration to confirm `ok: true` with 0 failures and 5/5 leaderboards configured.
2. **Git Ignore Verification**:
   - Run `git status` and `git check-ignore` on `backend.env`, `.env`, `deploy/docker-caddy/backend.env` to confirm they are 100% ignored.
3. **Repository Test Suite**:
   - Run `npm test` and `npm run steam:audit-backend` to ensure no regressions in existing server and client tests.
4. **Backend Health & Integration**:
   - Query `http://127.0.0.1:3001/health` and verify the running backend service responds with healthy status.
