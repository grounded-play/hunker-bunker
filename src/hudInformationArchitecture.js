const PROMPT_PRIORITY = Object.freeze({
    interaction: 0,
    urgent: 1,
    context: 2,
    guidance: 3
});

const INTERACTION_SELECTOR = '.hud-action-prompt, .black-box-hud-prompt, .hole-hud-prompt';

export function selectPromptCandidate(candidates = []) {
    return candidates
        .filter((candidate) => candidate?.visible)
        .map((candidate, index) => ({ ...candidate, index }))
        .sort((a, b) => (
            (PROMPT_PRIORITY[a.kind] ?? Number.MAX_SAFE_INTEGER)
            - (PROMPT_PRIORITY[b.kind] ?? Number.MAX_SAFE_INTEGER)
            || a.index - b.index
        ))[0] ?? null;
}

export function buildObjectiveSummary(items = []) {
    const visible = items.filter((item) => item && item.label);
    const primary = visible[0] ?? null;
    return {
        label: primary?.label ?? 'OBJECTIVE',
        progress: primary?.progress ?? 'ACTIVE',
        additionalCount: Math.max(0, visible.length - 1),
        total: visible.length
    };
}

function elementIsRequestedVisible(element) {
    return Boolean(element)
        && !element.classList.contains('hidden')
        && element.getAttribute('aria-hidden') !== 'true';
}

function promptKind(element) {
    if (element.matches(INTERACTION_SELECTOR)) return 'interaction';
    if (element.id === 'tutorial-prompt' || element.classList.contains('mission-progress-hud')) return 'urgent';
    if (element.id === 'biome-hud-prompt') return 'context';
    return 'guidance';
}

export class HudInformationArchitecture {
    constructor(documentRef = document) {
        this.document = documentRef;
        this.root = documentRef.documentElement;
        this.drawer = documentRef.getElementById('objective-drawer');
        this.drawerToggle = documentRef.getElementById('objective-drawer-toggle');
        this.tracker = documentRef.getElementById('objective-tracker');
        this.mapModal = documentRef.getElementById('tactical-map-modal');
        this.mapSidebar = documentRef.querySelector('.tactical-map-sidebar');
        this.drawerHome = this.drawer?.parentNode ?? null;
        this.drawerHomeNext = this.drawer?.nextSibling ?? null;
        this.userExpanded = false;
        this.observer = null;
        this.onToggle = () => {
            this.userExpanded = !this.userExpanded;
            this.refreshObjectives();
        };
    }

    start() {
        if (!this.drawer || !this.drawerToggle || !this.tracker) return this;
        this.drawerToggle.addEventListener('click', this.onToggle);
        this.observer = new MutationObserver(() => this.refresh());
        this.observer.observe(this.tracker, {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
            attributeFilter: ['class', 'aria-hidden']
        });
        this.observer.observe(this.root, { attributes: true, attributeFilter: ['data-hud-layout'] });
        if (this.mapModal) {
            this.observer.observe(this.mapModal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
        }
        for (const element of this.getPromptElements()) {
            this.observer.observe(element, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
        }
        this.refresh();
        return this;
    }

    stop() {
        this.drawerToggle?.removeEventListener('click', this.onToggle);
        this.observer?.disconnect();
        this.observer = null;
    }

    getPromptElements() {
        return [
            ...this.document.querySelectorAll('.hud-mission-stack > *'),
            this.document.getElementById('tutorial-prompt'),
            this.document.getElementById('loop-step-hud')
        ].filter(Boolean);
    }

    refresh() {
        this.refreshObjectives();
        this.refreshPromptLane();
    }

    isMapOpen() {
        return elementIsRequestedVisible(this.mapModal);
    }

    isDock() {
        return this.root.dataset.hudLayout === 'dock';
    }

    syncDrawerPlacement(mapOpen) {
        if (!this.drawer || !this.drawerHome) return;
        if (mapOpen && this.mapSidebar && this.drawer.parentNode !== this.mapSidebar) {
            this.mapSidebar.appendChild(this.drawer);
        } else if (!mapOpen && this.drawer.parentNode !== this.drawerHome) {
            this.drawerHome.insertBefore(this.drawer, this.drawerHomeNext);
        }
        this.drawer.classList.toggle('objective-drawer--map', mapOpen);
    }

    refreshObjectives() {
        const mapOpen = this.isDock() && this.isMapOpen();
        this.syncDrawerPlacement(mapOpen);

        const items = [...this.tracker.querySelectorAll(':scope > .objective-tracker__item')]
            .filter((item) => !item.classList.contains('hidden'))
            .map((item) => ({
                label: item.querySelector('.objective-tracker__label')?.textContent?.trim() ?? '',
                progress: item.querySelector('.objective-tracker__progress')?.textContent?.trim() ?? 'ACTIVE'
            }));
        const summary = buildObjectiveSummary(items);
        const active = summary.total > 0 && !this.tracker.classList.contains('hidden');
        const expanded = active && (mapOpen || this.userExpanded);

        this.drawer.classList.toggle('hidden', !active);
        this.drawer.dataset.expanded = String(expanded);
        this.drawerToggle.setAttribute('aria-expanded', String(expanded));
        this.drawerToggle.setAttribute('aria-label', active
            ? `${summary.label}${summary.additionalCount ? ` +${summary.additionalCount}` : ''}`
            : 'OBJECTIVE');
        const label = this.document.getElementById('objective-drawer-label');
        const progress = this.document.getElementById('objective-drawer-progress');
        const count = this.document.getElementById('objective-drawer-count');
        if (label) label.textContent = summary.label;
        if (progress) progress.textContent = summary.progress;
        if (count) {
            count.textContent = `+${summary.additionalCount}`;
            count.classList.toggle('hidden', summary.additionalCount === 0);
        }
    }

    refreshPromptLane() {
        const elements = this.getPromptElements();
        if (!this.isDock()) {
            for (const element of elements) element.removeAttribute('data-hud-suppressed');
            delete this.root.dataset.promptLane;
            delete this.root.dataset.promptLaneId;
            return;
        }
        const candidates = elements.map((element) => ({
            id: element.id,
            element,
            kind: promptKind(element),
            visible: elementIsRequestedVisible(element)
        }));
        const selected = selectPromptCandidate(candidates);

        for (const candidate of candidates) {
            if (!candidate.visible || candidate.element === selected?.element) {
                candidate.element.removeAttribute('data-hud-suppressed');
            } else {
                candidate.element.dataset.hudSuppressed = 'true';
            }
        }
        this.root.dataset.promptLane = selected?.kind ?? 'none';
        this.root.dataset.promptLaneId = selected?.id ?? '';
    }
}

if (typeof document !== 'undefined') {
    const controller = new HudInformationArchitecture(document).start();
    window.hudInformationArchitecture = controller;
}
