export function canUseDeveloperTools({
    electronApiPresent = false,
    qaToolsEnabled = false
} = {}) {
    // Browser development has no Electron bridge and keeps the local tools.
    // A packaged Electron build must receive the explicit QA environment
    // authorization from the main process; stale saves and mapped keys are
    // never sufficient to expose retail diagnostics.
    return !electronApiPresent || Boolean(qaToolsEnabled);
}
