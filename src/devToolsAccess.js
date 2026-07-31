export function canUseDeveloperTools({
    electronApiPresent = false,
    qaToolsEnabled = false
} = {}) {
    // Deliberately enabled in the current packaged QA build. Keep the
    // arguments in the API so retail authorization can be restored without
    // changing callers once Deck validation is complete.
    void electronApiPresent;
    void qaToolsEnabled;
    return true;
}
