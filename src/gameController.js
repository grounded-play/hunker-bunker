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
// This is deliberately a SMALL first step, not the full target shape: a
// live investigation of the actual start-flow (title -> roster ->
// #start-game -> Armory gate -> #armory-btn-embark -> launchStandardRun in
// main.js) found that whole chain has no unit-test coverage (no test
// constructs a real ThreeGame -- it needs a live WebGL context) and a
// questionable e2e safety net (the shared Playwright helper never actually
// clicks through the Armory gate). Rewriting launchStandardRun/
// openArmoryGate's internals -- which aren't even exported from main.js --
// without a trustworthy net was judged too risky for one pass. This
// increment instead:
//
//   1. Gives multiplayer start a single, explicit, testable entry point
//      (startMultiplayerRun) instead of MultiplayerLobby directly mutating
//      a global and DOM-clicking through main.js's chain inline.
//   2. Passes the session explicitly into ThreeGame.setupMultiplayerNetwork
//      instead of that method only ever reading a global.
//   3. Fixes a real bug the investigation surfaced along the way:
//      window.activeMultiplayerSession was never cleared, so a solo run
//      started after a multiplayer match (same tab, no reload) could still
//      have its end-of-run report read stale multiplayer state (main.js's
//      game-over reporting reads window.activeMultiplayerSession directly
//      for roomCode, with no fallback to window.game's own state).
//
// The DOM-click mechanism itself (main.js's launchStandardRun/
// openArmoryGate not being directly callable) is intentionally NOT
// removed this pass -- absorbing those into GameController is the natural
// next increment, once they're exported from main.js and the flow has
// real coverage to change safely against.

function waitForArmoryEmbarkButton(timeoutMs = 8000) {
    return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;
        const poll = () => {
            const btn = document.getElementById('armory-btn-embark');
            if (btn) {
                resolve(btn);
                return;
            }
            if (Date.now() >= deadline) {
                resolve(null);
                return;
            }
            setTimeout(poll, 100);
        };
        poll();
    });
}

async function clickThroughToArmoryEmbark() {
    if (typeof document === 'undefined') return;
    const startBtn = document.getElementById('start-game') || document.getElementById('title-newrun-btn');
    if (!startBtn) return;
    startBtn.click();
    const embarkBtn = await waitForArmoryEmbarkButton();
    embarkBtn?.click();
}

/**
 * Starts a multiplayer run: the single explicit entry point every
 * multiplayer deploy path (real relay round-trip and the offline/local
 * fallback alike) should call, instead of setting
 * window.activeMultiplayerSession and DOM-clicking inline.
 *
 * @param {object} session - Same shape MultiplayerLobby has always built:
 *   { roomCode, mode, seed, crashPlan, isMultiplayer, isHost, socket }
 */
export async function startMultiplayerRun(session) {
    if (typeof window !== 'undefined') {
        window.activeMultiplayerSession = session;
        // Still passed explicitly (see setupMultiplayerNetwork's own
        // comment) rather than relying solely on the global read, so this
        // call site doesn't depend on ordering against the assignment
        // above -- the parameter is authoritative, the global is legacy
        // fallback support for any other caller that hasn't migrated yet.
        window.game?.setupMultiplayerNetwork?.(session);
    }
    await clickThroughToArmoryEmbark();
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
