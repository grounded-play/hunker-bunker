import { t } from './i18n.js';

export const QUICK_COMMAND_DEFS = Object.freeze([
    {
        id: 'help',
        key: '1',
        icon: '🆘',
        fallbackLabel: 'HELP!',
        locKey: 'ui.ping.help',
        angleDeg: -90,
        offsetX: 0,
        offsetY: -95
    },
    {
        id: 'wait',
        key: '2',
        icon: '✋',
        fallbackLabel: 'WAIT',
        locKey: 'ui.ping.wait',
        angleDeg: -18,
        offsetX: 90,
        offsetY: -29
    },
    {
        id: 'follow',
        key: '3',
        icon: '🏃',
        fallbackLabel: 'FOLLOW',
        locKey: 'ui.ping.follow',
        angleDeg: 54,
        offsetX: 56,
        offsetY: 77
    },
    {
        id: 'regroup',
        key: '4',
        icon: '🎯',
        fallbackLabel: 'REGROUP',
        locKey: 'ui.ping.regroup',
        angleDeg: 126,
        offsetX: -56,
        offsetY: 77
    },
    {
        id: 'thanks',
        key: '5',
        icon: '👍',
        fallbackLabel: 'THANKS',
        locKey: 'ui.ping.thanks',
        angleDeg: 198,
        offsetX: -90,
        offsetY: -29
    }
]);

export function findClosestQuickCommand(vectorX, vectorY, deadzone = 0.3) {
    const mag = Math.hypot(vectorX, vectorY);
    if (mag < deadzone) return null;

    let targetAngle = (Math.atan2(vectorY, vectorX) * 180) / Math.PI;

    let bestCommand = null;
    let minDiff = Infinity;

    for (const cmd of QUICK_COMMAND_DEFS) {
        let diff = Math.abs(targetAngle - cmd.angleDeg) % 360;
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
            minDiff = diff;
            bestCommand = cmd;
        }
    }

    return bestCommand;
}

export function createQuickCommandRadialUi({
    document: doc = (typeof document !== 'undefined' ? document : null),
    getGame = () => (typeof window !== 'undefined' ? window.game : null)
} = {}) {
    if (!doc) return null;

    let container = doc.getElementById('quick-command-radial');
    let centerEl = null;
    let reticleEl = null;
    let sliceButtons = [];
    let isOpen = false;
    let highlightedCommandId = null;

    function buildDom() {
        const pingText = (t && t('ui.ping.reticle')) || 'PING';
        const ariaLabel = (t && t('ui.ping.aria_radial')) || 'Tactical Quick Commands';

        if (!container) {
            container = doc.createElement('div');
            container.id = 'quick-command-radial';
            container.className = 'quick-command-radial-container';
            container.setAttribute('role', 'dialog');
            container.setAttribute('aria-label', ariaLabel);
            doc.body.appendChild(container);
        }

        container.innerHTML = '';

        centerEl = doc.createElement('div');
        centerEl.className = 'quick-command-radial-center';
        centerEl.style.left = '50%';
        centerEl.style.top = '50%';

        reticleEl = doc.createElement('div');
        reticleEl.className = 'quick-command-radial-reticle';
        reticleEl.textContent = pingText;
        centerEl.appendChild(reticleEl);

        sliceButtons = [];

        for (const cmd of QUICK_COMMAND_DEFS) {
            const btn = doc.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-command-slice';
            btn.setAttribute('data-command', cmd.id);
            btn.style.left = `calc(50% + ${cmd.offsetX}px)`;
            btn.style.top = `calc(50% + ${cmd.offsetY}px)`;

            const iconSpan = doc.createElement('span');
            iconSpan.className = 'quick-command-slice-icon';
            iconSpan.textContent = cmd.icon;

            const labelSpan = doc.createElement('span');
            labelSpan.className = 'quick-command-slice-label';
            const localized = t ? t(cmd.locKey) : cmd.fallbackLabel;
            labelSpan.textContent = (localized && localized !== cmd.locKey) ? localized : cmd.fallbackLabel;

            const keyBadge = doc.createElement('span');
            keyBadge.className = 'quick-command-slice-key';
            keyBadge.textContent = cmd.key;

            btn.appendChild(iconSpan);
            btn.appendChild(labelSpan);
            btn.appendChild(keyBadge);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerCommand(cmd.id);
            });

            btn.addEventListener('pointerenter', () => {
                setHighlighted(cmd.id);
            });

            centerEl.appendChild(btn);
            sliceButtons.push({ cmd, btn, labelSpan });
        }

        container.appendChild(centerEl);
    }

    function refreshLabels() {
        const pingText = (t && t('ui.ping.reticle')) || 'PING';
        if (container) {
            container.setAttribute('aria-label', (t && t('ui.ping.aria_radial')) || 'Tactical Quick Commands');
        }
        if (reticleEl && !highlightedCommandId) {
            reticleEl.textContent = pingText;
        }
        for (const item of sliceButtons) {
            const localized = t ? t(item.cmd.locKey) : item.cmd.fallbackLabel;
            item.labelSpan.textContent = (localized && localized !== item.cmd.locKey) ? localized : item.cmd.fallbackLabel;
        }
    }

    function setHighlighted(commandId) {
        highlightedCommandId = commandId || null;
        for (const item of sliceButtons) {
            if (item.cmd.id === commandId) {
                item.btn.classList.add('is-highlighted');
            } else {
                item.btn.classList.remove('is-highlighted');
            }
        }
        if (reticleEl) {
            const pingText = (t && t('ui.ping.reticle')) || 'PING';
            if (highlightedCommandId) {
                reticleEl.classList.add('has-selection');
                const selected = QUICK_COMMAND_DEFS.find((c) => c.id === highlightedCommandId);
                const locLabel = (t && selected?.locKey && t(selected.locKey)) || selected?.fallbackLabel || (selected?.id ? selected.id.toUpperCase() : pingText);
                reticleEl.textContent = locLabel;
            } else {
                reticleEl.classList.remove('has-selection');
                reticleEl.textContent = pingText;
            }
        }
    }

    function open(screenX = null, screenY = null) {
        if (isOpen) return;
        buildDom();
        refreshLabels();
        isOpen = true;
        setHighlighted(null);

        if (Number.isFinite(screenX) && Number.isFinite(screenY) && centerEl) {
            centerEl.style.left = `${screenX}px`;
            centerEl.style.top = `${screenY}px`;
        } else if (centerEl) {
            centerEl.style.left = '50%';
            centerEl.style.top = '50%';
        }

        container.classList.add('is-active');

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quick-command-radial-opened'));
        }
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        setHighlighted(null);
        if (container) {
            container.classList.remove('is-active');
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quick-command-radial-closed'));
        }
    }

    function triggerCommand(commandId) {
        if (!commandId) return false;
        const game = getGame();
        const success = game?.triggerQuickCommand?.(commandId);
        close();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quick-command-triggered', {
                detail: { commandId, success: Boolean(success) }
            }));
        }
        return Boolean(success);
    }

    function handlePointerMove(e) {
        if (!isOpen || !centerEl) return;
        const rect = centerEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const match = findClosestQuickCommand(dx, dy, 25);
        setHighlighted(match ? match.id : null);
    }

    function handleKeyDown(e) {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            close();
            return;
        }

        const num = Number(e.key);
        if (num >= 1 && num <= QUICK_COMMAND_DEFS.length) {
            e.preventDefault();
            e.stopPropagation();
            const cmd = QUICK_COMMAND_DEFS[num - 1];
            if (cmd) {
                triggerCommand(cmd.id);
            }
        }
    }

    function handleDirectionInput(stickX, stickY) {
        if (!isOpen) return null;
        const match = findClosestQuickCommand(stickX, stickY, 0.35);
        setHighlighted(match ? match.id : null);
        return match?.id ?? null;
    }

    function confirmSelection() {
        if (!isOpen) return false;
        if (highlightedCommandId) {
            return triggerCommand(highlightedCommandId);
        }
        close();
        return false;
    }

    function onOpenEvent(e) {
        const { x, y } = e?.detail ?? {};
        open(x, y);
    }

    function onCloseEvent() {
        close();
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('open-quick-command-radial', onOpenEvent);
        window.addEventListener('close-quick-command-radial', onCloseEvent);
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('pointermove', handlePointerMove, true);
    }

    buildDom();

    return {
        open,
        close,
        isOpen: () => isOpen,
        getHighlighted: () => highlightedCommandId,
        setHighlighted,
        handleDirectionInput,
        confirmSelection,
        triggerCommand,
        refreshLabels,
        destroy() {
            close();
            if (typeof window !== 'undefined') {
                window.removeEventListener('open-quick-command-radial', onOpenEvent);
                window.removeEventListener('close-quick-command-radial', onCloseEvent);
                window.removeEventListener('keydown', handleKeyDown, true);
                window.removeEventListener('pointermove', handlePointerMove, true);
            }
            if (container) {
                if (typeof container.remove === 'function') {
                    container.remove();
                } else if (container.parentNode && typeof container.parentNode.removeChild === 'function') {
                    container.parentNode.removeChild(container);
                }
            }
            container = null;
        }
    };
}
