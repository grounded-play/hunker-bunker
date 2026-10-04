import { test, expect } from '@playwright/test';
import http from 'node:http';
import { attachRelay } from '../../server/relay.js';
import { bootToTitleSplash } from './helpers.js';

// Real relay + real browser DOM. Authentication is the relay's explicit local
// test fallback, not Steam proof. Installed-build/hardware gates stay open.
test.describe('player chat browser → relay → peer', () => {
    let io;
    let url;
    let oldEnv;
    test.beforeAll(async () => {
        oldEnv = { NODE_ENV: process.env.NODE_ENV, HB_STEAM_PUBLISHER_KEY: process.env.HB_STEAM_PUBLISHER_KEY, HB_ALLOW_DEV_STEAM_AUTH: process.env.HB_ALLOW_DEV_STEAM_AUTH };
        process.env.NODE_ENV = 'test';
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.HB_ALLOW_DEV_STEAM_AUTH;
        const server = http.createServer();
        io = attachRelay(server);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        url = `http://127.0.0.1:${server.address().port}`;
    });
    test.afterAll(async () => {
        await new Promise((resolve) => io?.close(resolve));
        for (const [key, value] of Object.entries(oldEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });
    async function join(page, roomCode, callsign) {
        await page.goto('/tests/e2e/fixtures/player-chat.html');
        await page.waitForFunction(() => Boolean(window.chatHarness));
        await page.evaluate(({ url, roomCode, callsign }) => window.chatHarness.join(url, roomCode, callsign), { url, roomCode, callsign });
        await expect.poll(() => page.evaluate(() => window.chatHarness.chat.ready)).toBe(true);
        await page.locator('[data-player-chat-open]').click();
    }
    async function send(page, text) {
        await page.locator('#player-chat-input').fill(text);
        await page.locator('#player-chat-send').click();
        await expect(page.locator('#player-chat-input')).toHaveValue('');
    }

    test('filters delivery, escapes HTML, isolates rooms and supports report/mute/undo', async ({ page, context }) => {
        const guest = await context.newPage();
        const other = await context.newPage();
        try {
            await join(page, 'CHAT-E2E', 'Host');
            await join(guest, 'CHAT-E2E', 'Guest');
            await join(other, 'OTHER-E2E', 'Other');
            await send(page, 'Hello fuck <img src=x onerror=alert(1)>');
            const row = guest.locator('.player-chat-message').first();
            await expect(row).toContainText('Hello **** <img src=x onerror=alert(1)>');
            await expect(guest.locator('#player-chat-log img')).toHaveCount(0);
            await expect(other.locator('.player-chat-message')).toHaveCount(0);
            await row.click();
            await guest.locator('#player-chat-report-reason').selectOption('spam');
            await guest.getByRole('button', { name: 'REPORT', exact: true }).click();
            await expect(guest.locator('#player-chat-status')).toContainText('Report recorded');
            expect(io.getChatReports()).toHaveLength(1);
            expect(io.getChatReports()[0].message.text).toContain('****');
            await guest.getByRole('button', { name: 'MUTE', exact: true }).click();
            await expect(guest.locator('.player-chat-message')).toHaveCount(0);
            await send(page, 'Muted delivery');
            await expect(guest.locator('.player-chat-message')).toHaveCount(0);
            await guest.getByRole('button', { name: 'UNMUTE: Host', exact: true }).click();
            await expect(guest.locator('#player-chat-log')).toContainText('Muted delivery');
            await guest.locator('#player-chat-close').click();
            await send(page, 'Unread delivery');
            await expect(guest.locator('[data-player-chat-open]')).toHaveText('CHAT (1)');
            await guest.locator('[data-player-chat-open]').click();
            await expect(guest.locator('[data-player-chat-open]')).toHaveText('CHAT');
            await guest.screenshot({ path: 'playwright-report/screenshots/sprint49-chat-relay.png' });
        } finally { await guest.close(); await other.close(); }
    });

    // Playtest 2026-10-02: a friend with the panel closed never saw the line.
    test('a closed panel shows incoming lines on screen in the feed', async ({ page, context }) => {
        const guest = await context.newPage();
        try {
            await join(page, 'CHAT-FEED', 'Host');
            await join(guest, 'CHAT-FEED', 'Guest');
            await guest.locator('#player-chat-close').click();
            await send(page, 'Need help!');
            const line = guest.locator('#player-chat-feed .player-chat-feed-line');
            await expect(line).toBeVisible();
            await expect(line).toContainText('Host');
            await expect(line).toContainText('Need help!');
            await expect(page.locator('#player-chat-feed .player-chat-feed-line')).toHaveCount(0);
        } finally {
            await guest.close();
        }
    });

    test('IME Enter cannot send early; all locales render; room changes clear drafts', async ({ page }) => {
        await join(page, 'CHAT-IME', 'Writer');
        const composer = page.locator('#player-chat-input');
        await composer.fill('テスト');
        await composer.evaluate((node) => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true, cancelable: true })));
        await expect(page.locator('.player-chat-message')).toHaveCount(0);
        await expect(composer).toHaveValue('テスト');
        await composer.press('Enter');
        await expect(page.locator('#player-chat-log')).toContainText('テスト');
        for (const [locale, title] of [['en', 'ROOM CHAT'], ['de', 'RAUMCHAT'], ['es-419', 'CHAT DE SALA'], ['pt-BR', 'CHAT DA SALA'], ['ru', 'ЧАТ КОМНАТЫ'], ['ja', 'ルームチャット'], ['zh-CN', '房间聊天']]) {
            await page.evaluate((locale) => window.chatHarness.setLocale(locale), locale);
            await expect(page.locator('#player-chat-title')).toHaveText(title);
            await expect(page.locator('#player-chat-modal')).not.toContainText('ui.chat.');
        }
        await composer.fill('Old room draft');
        await page.evaluate((url) => window.chatHarness.join(url, 'NEW-ROOM', 'Writer'), url);
        await expect(composer).toHaveValue('');
        await expect(page.locator('.player-chat-message')).toHaveCount(0);
        await page.keyboard.press('Escape');
        await expect(page.locator('#player-chat-modal')).toBeHidden();
        await expect(page.locator('[data-player-chat-open]')).toBeFocused();
    });

    test('game Settings opens chat above its parent and controller text entry returns focus', async ({ page }) => {
        await bootToTitleSplash(page);
        // Only session authentication is replaced: the lobby's actual connect
        // method, accepted room event and singleton UI wiring run unchanged.
        await page.route(`${url}/steam/session`, (route) => route.fulfill({ json: { ok: false } }));
        await page.evaluate(async (url) => {
            const { multiplayerLobby } = await import('/src/multiplayerLobby.js');
            multiplayerLobby.serverUrl = url;
            multiplayerLobby.roomCode = 'GAME-CHAT';
            await multiplayerLobby.connect();
        }, url);
        await page.locator('#title-settings-btn').click();
        const trigger = page.locator('#settings-popup [data-player-chat-open]');
        await trigger.click();
        await expect(page.locator('#player-chat-input')).toBeEnabled();
        await page.locator('#player-chat-input').fill('Game route hello');
        await page.keyboard.press('Enter');
        await expect(page.locator('#player-chat-log')).toContainText('Game route hello');
        const pad = (action) => page.evaluate((action) => window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action } })), action);
        await page.locator('#player-chat-input').focus();
        await pad('menu_confirm');
        await expect(page.locator('#virtual-keyboard-overlay')).toBeVisible();
        expect(await page.locator('#virtual-keyboard-overlay').evaluate((node) => {
            const key = node.querySelector('button');
            const rect = key.getBoundingClientRect();
            return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        })).toBe(true);
        await pad('menu_back');
        await expect(page.locator('#virtual-keyboard-overlay')).toBeHidden();
        await expect(page.locator('#player-chat-input')).toBeFocused();
        await pad('menu_back');
        await expect(page.locator('#player-chat-modal')).toBeHidden();
        await expect(page.locator('#settings-popup')).toBeVisible();
        await expect(trigger).toBeFocused();
    });
});
