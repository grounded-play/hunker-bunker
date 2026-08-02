# Engineering Deep Dive: Steam Backend Authentication

## Implemented Session Flow

The session architecture is already implemented.

1. Electron obtains a Steam web API auth ticket.
2. The preload bridge posts it to `POST /steam/session`.
3. `server/steamAuth.js` verifies the ticket with Valve.
4. The backend mints a short-lived HMAC-signed token containing the verified Steam ID and app context.
5. The preload bridge retains the session in memory and sends `Authorization: Bearer <token>` for later trusted requests.
6. Middleware verifies signature, expiry, and app binding without calling Valve for every route.

Tests cover token creation, tampering, expiry, app mismatch, session route behavior, and authenticated Inventory/store requests.

## Trust Boundary

The client may report events, but the backend must recompute or validate trusted outcomes. Never accept a renderer-supplied Steam ID as identity. Never log auth tickets, bearer tokens, Publisher keys, or session secrets.

## Configuration

Production requires:

- Steam App ID;
- Publisher Web API key;
- explicit high-entropy `HB_SESSION_SECRET`;
- HTTPS-only allowed origins;
- durable database path;
- canonical leaderboard mappings;
- store/MicroTxn flags disabled unless separately approved.

Run `npm run steam:audit-backend:strict` against the deployment environment. Environment values remain external to Git.

## Credential Incident Context

Old history contained sensitive values. Current tracked docs are redacted and the user previously reported rotation/containment. Do not repeat secrets to “prove” rotation. Release evidence should show old credentials fail, new auth succeeds, and strict configuration passes without exposing either value.

## Sprint 22 Acceptance

- Launch the exact packaged build through Steam.
- Exchange one real ticket and confirm the expected Steam ID.
- Let a session expire and verify safe renewal.
- Verify tampered/expired tokens fail closed.
- Submit/read all five leaderboards.
- Verify Inventory access uses the authenticated identity.
- Confirm logs and support bundles contain no ticket/token material.
- Exercise backend restart and durable SQLite recovery.

## Failure Modes

- treating `/health` as proof Valve auth works;
- repeatedly requesting tickets instead of reusing/renewing a session;
- enabling mock purchase behavior in production;
- allowing HTTP origins in strict production configuration;
- putting credentials in docs, shell history, screenshots, or depot files;
- coupling offline narrative saves to backend availability.
