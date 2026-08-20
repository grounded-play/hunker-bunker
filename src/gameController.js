// GameController -- Sprint 26, first increment toward the target
// architecture the sprint 24 review flagged as a P2 cleanup item:
//
//   Lobby -> window.activeMultiplayerSession -> DOM button.click() -> ordinary game startup
//
// becoming:
//
//   MultiplayerLobby -> GameSessionConfig -> GameController.startRun(config)
//                                                 |- SinglePlayerSession
//                                                 `- MultiplayerSession -> NetReplication
//
// This is deliberately a SMALL first step, not the full target shape.
//
// docs/multiplayer-flow-and-lobby-bugs-2026-08-20.md Phase 1: startMultiplayerRun
// used to DOM-click through #start-game -> Armory gate -> #armory-btn-embark
// itself (see git history for clickThroughToArmoryEmbark), because the
// tactical-net modal used to open BEFORE Armory in the old flow -- so
// deploying from the lobby had to trigger Armory from scratch. The new flow
// opens the lobby/Deployment Briefing screen AFTER Armory embark instead (see
// main.js's #start-game handler and src/multiplayerLobby.js's openModal),
// so by the time this runs, Armory is already done and pendingArmoryEmbarkAction
// is already the caller's own launchCallback -- no DOM click-through needed
// or wanted anymore (clicking #start-game again here would re-open Armory a
// second time). This now does exactly what its own name says: sets up the
// multiplayer session, then calls the launch callback directly.

/**
 * Starts a multiplayer run: the single explicit entry point every
 * multiplayer deploy path (real relay round-trip and the offline/local
 * fallback alike) should call, instead of setting
 * window.activeMultiplayerSession and DOM-clicking inline.
 *
 * @param {object} session - Same shape MultiplayerLobby has always built:
 *   { roomCode, mode, seed, crashPlan, isMultiplayer, isHost, socket }
 * @param {() => void} launchCallback - The same launch action Armory's own
 *   embark already captured for a solo run (main.js's
 *   `openArmoryGate(() => ...)` argument) -- multiplayer and solo end up
 *   calling the exact same launchStandardRun, the only difference being
 *   that setupMultiplayerNetwork(session) runs first here.
 */
export async function startMultiplayerRun(session, launchCallback) {
    if (typeof window !== 'undefined') {
        window.activeMultiplayerSession = session;
        // Still passed explicitly (see setupMultiplayerNetwork's own
        // comment) rather than relying solely on the global read, so this
        // call site doesn't depend on ordering against the assignment
        // above -- the parameter is authoritative, the global is legacy
        // fallback support for any other caller that hasn't migrated yet.
        window.game?.setupMultiplayerNetwork?.(session);
    }
    launchCallback?.();
}

/**
 * Clears any leftover multiplayer session state. Call this from a
 * definitely-solo run-start path (e.g. the title screen's "NEW RUN"
 * button, or Daily Ops) -- never from #start-game's own handler, since
 * that's the button multiplayer's own deploy flow clicks too.
 *
 * Two distinct things were leaking without this, found live-tracing the
 * start flow: (1) window.activeMultiplayerSession itself was never
 * cleared, so main.js's end-of-run report (which reads
 * window.activeMultiplayerSession?.roomCode directly, no fallback) could
 * misreport a later solo run. (2) window.game.isMultiplayer was only ever
 * set to true, never reset -- so every isMultiplayer-gated code path, not
 * just reporting, would keep treating a later solo run as multiplayer,
 * and any still-registered socket listeners would keep mutating that
 * (now solo) instance's state in response to stale multiplayer events.
 * ThreeGame.teardownMultiplayerNetwork() (the same method destroy() now
 * uses) fixes (2); this function is the solo-start-path caller of it.
 */
export function clearMultiplayerSession() {
    if (typeof window !== 'undefined') {
        window.activeMultiplayerSession = null;
        window.game?.teardownMultiplayerNetwork?.();
    }
}
