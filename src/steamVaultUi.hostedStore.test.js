import { describe, expect, it } from 'vitest';
import { hostedItemStoreUrl } from './steamVaultUi.js';

describe('Steam hosted Item Store links', () => {
    const store = { enabled: true, url: 'https://store.steampowered.com/itemstore/4957040/' };

    it('sends each key SKU to its own priced item page', () => {
        expect(hostedItemStoreUrl(store, 'key_1')).toBe('https://store.steampowered.com/itemstore/4957040/detail/4001/');
        expect(hostedItemStoreUrl(store, 'key_5')).toBe('https://store.steampowered.com/itemstore/4957040/detail/4005/');
        expect(hostedItemStoreUrl(store, 'key_15')).toBe('https://store.steampowered.com/itemstore/4957040/detail/4015/');
    });

    it('falls back to the store front, and keeps a beta query', () => {
        expect(hostedItemStoreUrl(store)).toBe(store.url);
        expect(hostedItemStoreUrl({ url: 'https://store.steampowered.com/itemstore/4957040/?beta=1' }, 'key_1'))
            .toBe('https://store.steampowered.com/itemstore/4957040/detail/4001/?beta=1');
    });

    it('has no link when the store is not configured', () => {
        expect(hostedItemStoreUrl(null, 'key_1')).toBeNull();
        expect(hostedItemStoreUrl({ enabled: true }, 'key_1')).toBeNull();
    });
});
