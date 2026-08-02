# Engineering Deep Dive: Steam Backend & Auth Flow

## The Core Challenge
Valve rate-limits calls to `AuthenticateUserTicket`. Currently, the game's architecture burns a fresh Steam Auth Ticket for every single backend request (e.g., submitting a leaderboard score, fetching inventory). This leads to immediate throttling and failure on live Steam servers.

## The Sprint 22 Solution: HMAC Session Tokens
We must move to a session-based architecture. 

### Step 1: Boot Verification
When the Electron shell (`electron/main.cjs`) boots the game, `steamworks.js` generates exactly *one* Auth Ticket.
It posts this ticket to the trusted backend (`steam.tuesdaycinema.club/steam/session`).

### Step 2: The Trusted Backend (`server/db.js` & Routes)
The Node.js server receives the ticket and calls Valve's `ISteamUserAuth/AuthenticateUserTicket` endpoint.
If Valve returns `OK`, the backend mints a short-lived (15-minute) JSON Web Token or HMAC-signed string using the `HB_SESSION_SECRET` environment variable.
This token contains the player's verified `steamid64`.

### Step 3: Bearer Auth
The Electron client stores this session token in memory. All subsequent requests (leaderboards, store purchases) are sent with:
`Authorization: Bearer <HMAC_TOKEN>`

The backend routes intercept this, verify the HMAC signature, and extract the `steamid64` without ever calling Valve's API again.

## Security Audit (P0 Blocker)
Historical documentation in the repo accidentally exposed the `HB_SESSION_SECRET` and the `Publisher Web API Key`.
Before the backend is deployed to production for beta testing, we must:
1. Generate a new `Publisher Web API Key` in the Steamworks Partner portal.
2. Generate a secure, 256-bit random string for the new `HB_SESSION_SECRET`.
3. Update the Fly.io/Caddy environment variables with these new secrets.
4. Run the CI depot audit to ensure `db_storage.json` and any `.env` files are strictly excluded from the final SteamPipe upload package.
