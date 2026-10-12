import './styles/campServices.css';

// CAMP SERVICES menu (owner, 2026-10-08: "too many options are showing on
// one"). The camp prompt offers at most three actions (src/campActionMenu.js);
// this menu lists the rest. A pick goes back to the game, which re-checks it
// against what the camp still offers (ThreeGame.performCampService).
export function createCampServicesUi({
    document: doc = (typeof document !== 'undefined' ? document : null),
    getGame = () => (typeof window !== 'undefined' ? window.game : null),
    target = (typeof window !== 'undefined' ? window : null)
} = {}) {
    if (!doc) return null;
    const modal = doc.getElementById('camp-services-modal');
    const title = doc.getElementById('camp-services-title');
    const list = doc.getElementById('camp-services-list');
    const closeButton = doc.getElementById('close-camp-services');
    if (!modal || !list) return null;
    let isOpen = false;
    // Hides the HUD layers that draw over modals (main.js setCampDialogOpen).
    const markOpen = (open) => target?.setCampDialogOpen?.('services', open);

    function close() {
        if (!isOpen) return;
        isOpen = false;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        list.textContent = '';
        markOpen(false);
        getGame()?.setInputEnabled?.(true);
    }

    function open(detail = {}) {
        const actions = Array.isArray(detail.actions) ? detail.actions : [];
        if (!actions.length) return;
        isOpen = true;
        if (title) title.textContent = detail.campLabel ?? '';
        list.textContent = '';
        for (const entry of actions) {
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'camp-services-option';
            button.dataset.action = entry.action;
            button.textContent = entry.label;
            button.addEventListener('click', () => {
                close();
                getGame()?.performCampService?.(entry.index);
            });
            list.append(button);
        }
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        markOpen(true);
        getGame()?.setInputEnabled?.(false);
        list.querySelector('button')?.focus?.();
    }

    closeButton?.addEventListener('click', close);
    doc.addEventListener('keydown', (event) => {
        if (isOpen && event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    });
    target?.addEventListener?.('camp-services-open', (event) => open(event?.detail ?? {}));
    return { open, close, get isOpen() { return isOpen; } };
}
