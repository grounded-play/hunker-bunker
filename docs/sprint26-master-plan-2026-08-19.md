# Sprint 26 — Master Plan

Date: 2026-08-19 (branch cut 2026-08-20T04:40Z, right after PR #37 merged)
Branch: `dev/sprint-26`, cut clean from `mothership` at the PR #37 merge
commit (`2be2190`).

## Where we are

PR #37 (`dev/sprit-25` → `mothership`, 53 commits) is merged. That branch
closed the biggest structural gap in the whole multiplayer effort — the
deploy flow was completely broken at the start of it, so no networked
gameplay code ever ran for anyone — and landed real server-authoritative
PvP damage, Steam-authenticated socket handshakes, host-authoritative co-op
enemy sync, co-op downed/revive, and (in the final pass, driven by a real
two-player playtest log) a real remote-player chassis, a reconnect
PvP-mode fix, and a from-scratch ready-up/synchronized-start flow.

None of that final pass has been *live-verified* by a human yet beyond the
automated test suite and the earlier two-real-browser-instance testing
documented in `docs/sprint24-multiplayer-runtime-2026-08-19.md`. That's
this sprint's first job, before piling on more feature work.

This doc has four parts: **QA** (validate what just shipped), **carried-
forward backlog** (plans from earlier docs still not realized), **new work
menu** (organized by priority, per the sprint 24 review's own P0/P1/P2
framing), and a **suggested sequencing** for this specific sprint.

---

## Part 1 — QA: validate what PR #37 shipped

Everything below is either untested live, or tested only via the automated
suite / a single prior manual pass. None of it should be treated as "done"
until someone actually plays it.

### 1.1 Remote-player chassis rendering
- [ ] Two real clients (ideally two different classes, e.g. TANK + SCOUT),
      confirm each sees the other as their real class sprite, not a flat
      square, in both co-op and PvP mode.
- [ ] Confirm the PvP red tint still reads clearly as "hostile" even with a
      real sprite underneath (was previously the only visual signal on a
      flat square).
- [ ] Confirm walk-cycle animation actually plays for the remote player
      while they move, and holds an idle frame while they're stationary —
      this is new behavior (`setRemoteSpriteFrame`, driven by `vx`/`vz`/
      `animState`), not just re-verifying old code.
- [ ] Confirm two remote players of the *same* class don't visually
      interfere with each other (this was the specific bug the per-instance
      texture clone fixes — worth deliberately checking with 2 SCOUTs, if a
      3-4 player room is testable).

### 1.2 Reconnect PvP-mode fix
- [ ] Live PvP match, force one client to actually reconnect mid-match
      (kill the tab's network briefly, or background/foreground an
      Electron window long enough to trigger Socket.IO's reconnection
      logic) — confirm `weaponHit` still lands for that player afterward,
      both as attacker and as victim.
- [ ] Confirm a *fresh* room (no prior `matchDeploy`) still correctly
      defaults to coop — i.e. the fix didn't accidentally leak `'pvp'` into
      unrelated rooms (this is server-test-covered, but worth eyeballing
      once live).

### 1.3 Ready-up / host-start flow
- [ ] Two clients, confirm: clicking deploy before readying does nothing
      but toggle your own ready state; the host can't actually launch until
      everyone's ready; the button correctly shows "WAITING FOR HOST" vs
      "WAITING FOR SQUAD (X/Y READY)" depending on who's looking; the
      countdown UI ("STARTING IN 3...") actually counts down and both
      clients land in gameplay at the same moment.
- [ ] Un-ready mid-countdown (either player) — confirm the launch cancels
      for both clients, not just the one who backed out.
- [ ] Disconnect one player mid-countdown — confirm the remaining player(s)
      see the countdown cancel rather than the match silently launching
      without the departed player.
- [ ] Solo/offline fallback path (no relay reachable) — confirm deploy is
      still a single click with no ready-up gate, exactly as before this
      sprint's changes (this is a deliberate scope boundary, not an
      oversight — worth confirming it wasn't accidentally broken).
- [ ] No automated E2E/Playwright coverage exists for this flow yet — only
      server-level Vitest regression tests (`server/relayReadyUp.test.js`)
      plus manual verification. Consider adding a Playwright spec once the
      flow is confirmed stable, so this doesn't silently regress again the
      way the original ready-up gap did.

### 1.4 Perf long-task attribution
- [ ] During any real gameplay session with observable stutter, export the
      debug console log and confirm `lastPhase` actually appears on
      `Long task` warnings (e.g. `chunk-mount:2,1` or `gear-poof:bio_spores`)
      — this is pure new instrumentation and hasn't been checked against a
      real stutter yet.
- [ ] If a multi-second freeze recurs, use that `lastPhase` tag to actually
      test the GC-pressure hypothesis from
      `docs/sprint24-multiplayer-runtime-2026-08-19.md`'s perf section
      rather than re-investigating from scratch.

### 1.5 Production `/steam/session` fix
- [ ] Blocked on GitHub Actions secrets (`HB_STEAM_PUBLISHER_KEY`,
      `HB_SESSION_SECRET`, `HB_ALLOWED_ORIGINS`, `HB_STEAM_LEADERBOARD_IDS`,
      `FLY_API_TOKEN`) — none configured in this repo. This is a
      credentials/account-access task for whoever holds the Fly.io and
      Steamworks partner access, not engineering work. Once set:
- [ ] Re-run `steam-backend-deploy.yml` (`workflow_dispatch` against
      whatever branch should own production — see the open question in
      Part 2) and confirm it clears the audit gate and actually reaches
      `flyctl deploy`.
- [ ] Confirm `POST /steam/session` returns `502` (or succeeds) instead of
      the previously-observed `405` in production.
- [ ] With real Steam publisher credentials in place, retest the
      `getAuthTicketForWebApi` round-trip from a real (non-sandboxed)
      desktop — the sprint 24 doc's ticket-validation timeout was never
      conclusively attributed to sandbox-vs-app-config.

---

## Part 2 — Carried-forward backlog (not yet realized)

Pulled from `docs/sprint24-steam-multiplayer-economy-review-and-plan-2026-08-19.md`'s
"must achieve" board and `docs/sprint24-multiplayer-runtime-2026-08-19.md`'s
"Known gaps" — restated against *current* state now that PR #37 landed.

### Milestone A (Steam Multiplayer Foundation) — closer, not closed
The review's single Milestone A success criterion was: *"Two real Steam
accounts can join through a Steam lobby and complete a synchronized combat
encounter together."* PR #37 closes the "synchronized combat encounter"
half (deploy works, damage is server-authoritative, ready-up is
synchronized). Still open:
- **Real Steam Lobbies** — still a plain room-code system (`SECTOR-7`
  hardcoded default), not the Steamworks Lobby API. 🔴 per the review board.
- **Steam Friends invites / Join Game** — 🔴, not built.
- **Rich Presence** — 🔴, not built.
- **Real two-Steam-account ticket verification** — code path exists and was
  exercised against one real Steam session this sprint, but the actual
  `AuthenticateUserTicket` round-trip has never completed (sandbox network
  restriction, unconfirmed if that's the only cause).

### Host-authoritative co-op sync — routing works, assignment doesn't
`docs/sprint24-multiplayer-runtime-2026-08-19.md`'s known gap #4: the
report→host-resolves→broadcast *mechanism* is directly verified correct,
but host *assignment* is "first socket to join an empty room," with no
resilience against reconnection — confirmed happening even during initial
connect under load, not just mid-match disconnects. `steamId64` is tracked
per-connection now (this sprint's earlier work) and is the obvious fix
candidate (durable identity across reconnects instead of ephemeral
socket.id), but every dev-mode connection currently shares one placeholder
`steamId64`, so this needs either real distinct Steam accounts to test or a
synthetic-but-distinct dev identity scheme.

### Server authority is uneven across systems
- PvP damage: server-authoritative, verified live (this branch).
- Reconnect PvP-mode: now correctly restored (this branch).
- Co-op `enemyDamage`: still client-reported gossip with only basic
  type/range clamping — "not full server validation," by design deferral
  in the original pass since the review's economy-safety concern is
  specifically about PvP, not PvE.
- No server-side trajectory/line-of-sight raycasting against wall geometry,
  even within the new PvP validation — a claim that passes range+rate-limit
  but was actually blocked by a wall client-side is still honored.
- No full match-completion/extraction sync — each client's crash-site/spawn
  state is independently computed, not server-assigned (not observed to
  cause divergence in 2-client testing, but untested at higher player
  counts).

### Architecture
The review's P2 item: `Lobby → window.activeMultiplayerSession → DOM
button.click() → ordinary game startup` should become `MultiplayerLobby →
GameSessionConfig → GameController.startRun(config) → SinglePlayerSession |
MultiplayerSession → NetReplication`. Explicitly deferred every pass so
far in favor of making the existing path *work* first — now that it does,
this is worth reconsidering, since every new multiplayer feature this
sprint will keep fighting the same global-bridge coupling.

### Perf
Diffuse 60-200ms stutter is traced to synchronous, main-thread-only,
unbatched chunk-mesh mounting (WFC/room/encounter planning +
`InstancedMesh` construction), capped to 1/frame but with no worker
offload anywhere in the codebase. Moving this to a Web Worker is a real
architecture change (Three.js geometry/material construction needs the
main thread's GL context; only the WFC/layout *planning* half could
realistically move off-thread) — not attempted, scoped as its own
investigation if picked up. The single observed 6-second freeze has no
confirmed cause (GC-pressure is the leading hypothesis, now instrumented
to actually test it next time).

### Milestones B-E (per the original review, in order, not started)
- **B — Real Co-op PvE**: full run together (spawn → explore → fight →
  loot → objectives → boss → revive → extraction → rewards) as a legitimate
  "Online Co-op" Steam claim. PR #37 built the plumbing (downed/revive,
  host-authoritative enemy sync) but not the full end-to-end loop.
- **C — Real PvP**: kill tracking, win state, rematch, disconnect
  protection, PvP leaderboards. Damage is now authoritative; the rest of
  the mode's shape isn't built.
- **D — Steam Economy**: real Inventory Service, drops, Vault, cosmetics,
  purchases, Trading, Community Market. Explicitly deferred by the review
  until A-C land — still true, not started.
- **E — Steam-native polish**: Rich Presence, friends/Join Game, Cloud
  acceptance, achievements/leaderboards live-tested, Input/Deck, voice,
  Timeline, Workshop.

---

## Part 3 — New work menu, by priority

Same P0/P1/P2 framing the sprint 24 review used, re-derived against what's
actually still open after PR #37.

### P0
1. **QA Part 1 above, for real** — none of PR #37's fixes have been
   played by a human yet. Everything else here is lower-value until this
   happens, since it could surface a fix that doesn't actually work under
   real network conditions.
2. **Production secrets** — mostly a human/credentials task (Part 1.5), but
   worth someone explicitly owning it this sprint rather than letting it
   sit; the code fix has been ready and regression-tested since PR #37.
3. **Host-reassignment durability** — the one item in the "must achieve"
   board's Online Co-op / PvP rows still flagged 🟠 specifically because of
   this, not because damage/sync don't work. Tie host identity to
   `steamId64` (or a stable dev-mode-distinct fallback) instead of
   first-socket-to-join.

### P1
4. **Extend server authority to co-op `enemyDamage`** — currently the one
   remaining gossip-broadcast damage path; the PvP pattern (victim
   self-reports, server validates against tracked state) is a known-good
   template to reuse.
5. **Match-completion / extraction sync** — currently independently
   computed per client; needed before Milestone B's "legitimate Online
   Co-op claim" bar is met.
6. **Real Steam Lobbies + Friends invite + Join Game** — the remaining
   pieces of Milestone A's own success criterion ("join through a Steam
   lobby," not a room code).
7. **GameController/MultiplayerSession refactor** — was P2 in the original
   review specifically because making the existing path work came first;
   worth revisiting now that it does, before more features accumulate on
   top of the `window.*`/DOM-click bridge.

### P2
8. **Chunk-streaming perf** — worker-offload investigation for the diffuse
   stutter; the 6s-freeze GC-pressure hypothesis (now instrumented) should
   be checked first, since it may turn out to be a different, cheaper fix.
9. **Rich Presence** — Milestone E, no dependencies blocking it once
   Steam Lobbies exist.
10. **Steam Economy (Milestone D)** — explicitly last; don't start until
    A-C are real per the review's own sequencing argument (stacking
    marketplace/ranked/seasons on an unproven multiplayer foundation was
    the original problem this whole effort was course-correcting).

---

## Part 4 — Suggested sequencing for this sprint

1. QA pass (Part 1) — budget this first, not as an afterthought. If
   anything fails, fix it before starting new feature work; that's cheaper
   than discovering it three features later.
2. Host-reassignment durability fix (P0.3) — small, self-contained, closes
   the last confirmed reliability gap in an already-shipped system.
3. Co-op `enemyDamage` server authority (P1.4) — same pattern as PvP
   damage, low risk to copy.
4. Decide, with the user, whether Steam Lobbies/Friends/Join Game (P1.6) or
   the GameController refactor (P1.7) goes next — they're both real lifts
   and the right order depends on whether more multiplayer surface area is
   coming soon (refactor first) or whether landing Milestone A's literal
   success criterion is more urgent (Lobbies first).
5. Perf investigation (P2.8) as a dedicated pass once the above is stable,
   using the new `lastPhase` instrumentation to confirm or rule out the
   GC-pressure hypothesis before attempting any architecture change.

Production secrets (P0.2) run in parallel on whatever timeline the
credential-holder is available — it doesn't block anything else in this
list except the actual live-production verification in Part 1.5.
