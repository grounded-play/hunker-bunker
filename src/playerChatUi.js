import { playerChat } from './playerChat.js';
import { CHAT_MAX_CODEPOINTS } from './chatFilter.js';
import { getLocale, onLocaleChange, t } from './i18n.js';
import './playerChat.css';

// Literal key registry keeps localization coverage/orphan audits meaningful.
const CHAT_KEYS = Object.freeze({
    'title': 'ui.chat.title',
    'open': 'ui.chat.open',
    'close': 'ui.chat.close',
    'scope': 'ui.chat.scope',
    'history': 'ui.chat.history',
    'empty': 'ui.chat.empty',
    'compose': 'ui.chat.compose',
    'placeholder': 'ui.chat.placeholder',
    'send': 'ui.chat.send',
    'sending': 'ui.chat.sending',
    'disconnected': 'ui.chat.disconnected',
    'connected': 'ui.chat.connected',
    'rateLimited': 'ui.chat.rateLimited',
    'filterError': 'ui.chat.filterError',
    'sendError': 'ui.chat.sendError',
    'notifications': 'ui.chat.notifications',
    'privacy': 'ui.chat.privacy',
    'selectMessage': 'ui.chat.selectMessage',
    'mute': 'ui.chat.mute',
    'unmute': 'ui.chat.unmute',
    'block': 'ui.chat.block',
    'unblock': 'ui.chat.unblock',
    'report': 'ui.chat.report',
    'reportReason': 'ui.chat.reportReason',
    'reported': 'ui.chat.reported',
    'player': 'ui.chat.player',
    'quick.help': 'ui.chat.quick.help',
    'quick.wait': 'ui.chat.quick.wait',
    'quick.regroup': 'ui.chat.quick.regroup',
    'quick.follow': 'ui.chat.quick.follow',
    'quick.thanks': 'ui.chat.quick.thanks',
    'reasons.harassment': 'ui.chat.reasons.harassment',
    'reasons.hate': 'ui.chat.reasons.hate',
    'reasons.spam': 'ui.chat.reasons.spam',
    'reasons.sexual': 'ui.chat.reasons.sexual',
    'reasons.threat': 'ui.chat.reasons.threat',
    'reasons.other': 'ui.chat.reasons.other',
});
const tr = (key, vars) => t(CHAT_KEYS[key], vars);
const NOTIFICATIONS_KEY = 'hb_chat_badges';
const FEED_LINE_MS = 8000;
const FEED_MAX_LINES = 3;
const QUICK_MESSAGES = ['help', 'wait', 'regroup', 'follow', 'thanks'];
const REPORT_REASONS = ['harassment', 'hate', 'spam', 'sexual', 'threat', 'other'];

function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
}

export function initPlayerChatUI({ chat = playerChat, onBoundaryChange = () => {} } = {}) {
    if (document.getElementById('player-chat-modal')) return null;
    let invoker = null;
    let selectedId = null;
    let reportSent = false;
    let lastRoom = chat.roomCode;
    let notifications = true;
    try { notifications = localStorage.getItem(NOTIFICATIONS_KEY) !== 'off'; } catch { /* optional preference */ }
    const translated = [];
    const label = (tag, key, className = '') => {
        const node = element(tag, className);
        translated.push([node, key]);
        return node;
    };
    const button = (key, handler, className = '') => {
        const node = label('button', key, className);
        node.type = 'button';
        node.addEventListener('click', handler);
        return node;
    };
    const modal = element('div', 'modal hidden');
    modal.id = 'player-chat-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-labelledby', 'player-chat-title');
    const panel = element('section', 'modal-content player-chat-panel');
    const header = element('header', 'player-chat-header');
    const title = label('h2', 'title');
    title.id = 'player-chat-title';
    const closeButton = button('close', close, 'player-chat-close');
    closeButton.dataset.menuBack = '';
    closeButton.id = 'player-chat-close';
    header.append(title, closeButton);
    const scope = label('p', 'scope', 'player-chat-help');
    const status = element('p', 'player-chat-status');
    status.id = 'player-chat-status';
    status.setAttribute('role', 'status');
    const log = element('div', 'player-chat-log');
    log.id = 'player-chat-log';
    log.tabIndex = 0;
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-relevant', 'additions');
    const actions = element('div', 'player-chat-actions');
    const selectedLabel = element('span');
    const mute = button('mute', () => act('mute'));
    const block = button('block', () => act('block'));
    const reason = element('select');
    reason.id = 'player-chat-report-reason';
    for (const key of REPORT_REASONS) {
        const option = label('option', `reasons.${key}`);
        option.value = key;
        reason.append(option);
    }
    const report = button('report', () => act('report'));
    actions.append(selectedLabel, mute, block, reason, report);
    const hiddenSenders = element('div', 'player-chat-hidden-senders');
    const quick = element('div', 'player-chat-quick');
    const quickButtons = QUICK_MESSAGES.map((key) => button(`quick.${key}`, () => {
        composer.value = tr(`quick.${key}`);
        composer.focus();
    }));
    quick.append(...quickButtons);
    const composerLabel = label('label', 'compose');
    composerLabel.htmlFor = 'player-chat-input';
    const composer = element('textarea');
    composer.id = 'player-chat-input';
    composer.rows = 2;
    // Native maxlength counts UTF-16 units. The shared filter additionally
    // enforces the advertised 400-code-point / 1600-byte wire limit.
    composer.maxLength = CHAT_MAX_CODEPOINTS * 2;
    composer.setAttribute('aria-describedby', 'player-chat-status');
    const send = button('send', submit);
    send.id = 'player-chat-send';
    const form = element('div', 'player-chat-compose');
    form.append(composer, send);
    const footer = element('footer', 'player-chat-footer');
    const notificationLabel = label('span', 'notifications');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.checked = notifications;
    const preference = element('label');
    preference.append(checkbox, notificationLabel);
    checkbox.addEventListener('change', () => {
        notifications = checkbox.checked;
        try { localStorage.setItem(NOTIFICATIONS_KEY, notifications ? 'on' : 'off'); } catch { /* optional preference */ }
        renderBadges();
    });
    footer.append(preference, label('p', 'privacy', 'player-chat-help'));
    panel.append(header, scope, status, log, actions, hiddenSenders, quick, composerLabel, form, footer);
    modal.append(panel);
    document.body.append(modal);
    const openButtons = [...document.querySelectorAll('[data-player-chat-open]')];
    for (const entry of openButtons) entry.addEventListener('click', open);

    // Incoming lines while the panel is closed -- in a run, in the lobby, in
    // menus. Before this they only raised a badge on a CHAT button the other
    // player had to notice (playtest 2026-10-02: "they never saw it"). Not a
    // focus root and never interactive, so it cannot capture controller input.
    const feed = element('div', 'player-chat-feed');
    feed.id = 'player-chat-feed';
    feed.setAttribute('role', 'log');
    feed.setAttribute('aria-live', 'polite');
    feed.setAttribute('aria-label', tr('history'));
    document.body.append(feed);
    const feedTimers = new Set();
    function showFeedLine(message) {
        if (chat.visible || !notifications) return;
        const line = element('div', 'player-chat-feed-line');
        line.append(element('span', 'player-chat-feed-name', message.senderName), element('span', 'player-chat-feed-text', message.text));
        feed.append(line);
        while (feed.children.length > FEED_MAX_LINES) feed.children[0].remove();
        const timer = setTimeout(() => {
            feedTimers.delete(timer);
            line.classList.add('is-leaving');
            const removal = setTimeout(() => { feedTimers.delete(removal); line.remove(); }, 400);
            feedTimers.add(removal);
        }, FEED_LINE_MS);
        feedTimers.add(timer);
    }
    const unsubscribeFeed = chat.onMessage(showFeedLine);

    function open(event) {
        invoker = event?.currentTarget ?? document.activeElement;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        chat.setVisible(true);
        feed.replaceChildren();
        window.game?.clearGameplayInputState?.();
        onBoundaryChange();
        (composer.disabled ? closeButton : composer).focus();
        composer.dataset.menuTextEditing = 'true';
        log.scrollTop = log.scrollHeight;
    }

    function close() {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        chat.setVisible(false);
        window.game?.clearGameplayInputState?.();
        onBoundaryChange();
        if (invoker?.isConnected) invoker.focus();
    }

    async function submit() {
        const text = composer.value;
        const result = await chat.send(text);
        if (result.ok && composer.value === text) composer.value = '';
    }

    async function act(action) {
        const message = chat.messages.find((entry) => entry.id === selectedId);
        if (!message || message.senderId === chat.selfId) return;
        const result = await chat.moderate(action, message.senderId, message.id, reason.value);
        reportSent = action === 'report' && result.ok;
        render();
    }

    // Capture before menu/game key handlers: IME Enter must never submit, and
    // WASD/Space in the composer must remain text. Tab still uses the shared
    // focus trap; native/in-engine keyboards remain their own topmost surface.
    const keyboard = (event) => {
        if (!chat.visible) return;
        if (['virtual-keyboard-overlay', 'select-picker-overlay'].some((id) => {
            const overlay = document.getElementById(id);
            return overlay && !overlay.classList.contains('hidden');
        })) return;
        if (event.isComposing || event.keyCode === 229) {
            if (event.target === composer) event.stopImmediatePropagation();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            close();
        } else if (event.target === composer && event.key !== 'Tab') {
            event.stopImmediatePropagation();
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit();
            }
        }
    };
    window.addEventListener('keydown', keyboard, true);

    function renderBadges() {
        for (const entry of openButtons) {
            entry.textContent = tr('open') + (notifications && chat.unread ? ` (${chat.unread})` : '');
            entry.setAttribute('aria-label', entry.textContent);
        }
    }

    function renderMessages() {
        const focused = document.activeElement?.dataset.chatMessage;
        const oldScroll = log.scrollTop;
        const atBottom = log.scrollHeight - oldScroll - log.clientHeight < 40;
        // Keep nodes for unchanged messages: arriving text must not steal
        // controller focus or re-announce an entire transcript to a reader.
        const previous = new Map([...log.children].map((node) => [node.dataset.chatMessage, node]));
        const liveIds = new Set(chat.messages.map((message) => message.id));
        for (const node of [...log.children]) if (!liveIds.has(node.dataset.chatMessage)) node.remove();
        for (const message of chat.messages) {
            let row = previous.get(message.id);
            if (!row) {
                row = element('button', 'player-chat-message');
                row.type = 'button';
                row.dataset.chatMessage = message.id;
                row.addEventListener('click', () => { selectedId = message.id; reportSent = false; render(); });
                row.append(element('span', 'player-chat-message-meta'), element('span', 'player-chat-message-text'));
                log.append(row);
            }
            row.children[0].textContent = `${message.senderName} · ${new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' }).format(message.sentAt)}`;
            row.children[1].textContent = message.text;
            row.setAttribute('aria-pressed', String(selectedId === message.id));
        }
        if (!chat.messages.length && !log.children.length) log.append(element('p', '', tr('empty')));
        if (focused && !liveIds.has(focused) && chat.visible) log.focus();
        log.scrollTop = atBottom ? log.scrollHeight : oldScroll;
    }

    function render() {
        if (chat.roomCode !== lastRoom) {
            composer.value = '';
            selectedId = null;
            reportSent = false;
            lastRoom = chat.roomCode;
        }
        for (const [node, key] of translated) node.textContent = tr(key);
        composer.placeholder = tr('placeholder');
        log.setAttribute('aria-label', tr('history'));
        reason.setAttribute('aria-label', tr('reportReason'));
        composer.disabled = !chat.ready;
        composer.readOnly = chat.sending;
        send.disabled = !chat.ready || chat.sending;
        for (const entry of quickButtons) entry.disabled = !chat.ready || chat.sending;
        const filterError = ['filter_unavailable', 'unsupported-script', 'unsupported-control', 'invalid-unicode'].includes(chat.error);
        status.textContent = !chat.ready ? tr('disconnected') : chat.sending ? tr('sending')
            : chat.error === 'rate_limited' ? tr('rateLimited')
                : filterError ? tr('filterError') : chat.error ? tr('sendError')
                    : reportSent ? tr('reported') : tr('connected', { room: chat.roomCode });
        renderMessages();
        const selected = chat.messages.find((entry) => entry.id === selectedId);
        selectedLabel.textContent = selected?.senderName ?? tr('selectMessage');
        for (const node of [mute, block, report, reason]) node.disabled = !chat.ready || !selected || selected.senderId === chat.selfId;
        // Stable controls let muted/blocked players be restored even after
        // their messages have been removed from the visible history.
        const activeRestore = document.activeElement?.dataset.chatRestore;
        hiddenSenders.replaceChildren();
        for (const [action, ids] of [['unmute', chat.muted], ['unblock', chat.blocked]]) {
            for (const senderId of ids) {
                const restore = element('button', '', `${tr(action)}: ${chat.names.get(senderId) ?? tr('player')}`);
                restore.type = 'button';
                restore.disabled = !chat.ready;
                restore.dataset.chatRestore = `${action}:${senderId}`;
                restore.addEventListener('click', () => { void chat.moderate(action, senderId); });
                hiddenSenders.append(restore);
                if (restore.dataset.chatRestore === activeRestore) restore.focus();
            }
        }
        if (activeRestore && ![...hiddenSenders.children].some((node) => node.dataset.chatRestore === activeRestore)) closeButton.focus();
        renderBadges();
    }

    const unsubscribe = chat.subscribe(render);
    const unsubscribeLocale = onLocaleChange(render);
    return { open, close, dispose() {
        unsubscribe();
        unsubscribeLocale();
        unsubscribeFeed();
        for (const timer of feedTimers) clearTimeout(timer);
        feed.remove();
        window.removeEventListener('keydown', keyboard, true);
        for (const entry of openButtons) entry.removeEventListener('click', open);
        modal.remove();
    } };
}
