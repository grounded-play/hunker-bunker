// Shared helpers for trailer footage capture specs only.

// Something opens #console-terminal-modal (current-objective/terminal
// panel) a few seconds into a fresh run on its own -- observed blocking
// canvas clicks in every real-input playthrough spec, not tied to any
// specific action of ours. Close it defensively before any canvas
// interaction rather than chasing what auto-opens it.
export async function closeConsoleModalIfOpen(page) {
    // A real click on #close-console-terminal was observed to lose a race
    // with whatever keeps reopening this modal during real-input captures
    // (retried for 9s+ against the same blocking element in practice) --
    // force the hidden class directly instead of trusting the click to win.
    await page.evaluate(() => {
        document.getElementById('console-terminal-modal')?.classList.add('hidden');
    }).catch(() => {});
}
