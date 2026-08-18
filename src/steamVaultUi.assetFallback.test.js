import { describe, expect, it } from 'vitest';
import { applyCatalogImage } from './steamVaultUi.js';

describe('Steam Vault image fallback', () => {
    it('switches a failed remote icon to its bundled local asset, keeping a fallback armed', () => {
        const image = { src: '', onerror: null, dataset: {} };
        applyCatalogImage(image, {
            img: 'https://assets.example.test/item.png',
            localImg: '/economy/item.png'
        });

        expect(image.src).toBe('https://assets.example.test/item.png');
        image.onerror();
        expect(image.src).toBe('/economy/item.png');
        expect(image.dataset.localFallback).toBe('true');
        // A third tier exists for items whose local art hasn't landed yet
        // (docs/season-zero-protocol/08-asset-audit-and-gaps.md) — onerror
        // must stay armed after the first failure to catch that case.
        expect(image.onerror).not.toBeNull();
    });

    it('falls through to a generic placeholder when local art is also missing', () => {
        const image = { src: '', onerror: null, dataset: {} };
        applyCatalogImage(image, {
            img: 'https://assets.example.test/item.png',
            localImg: '/economy/item.png'
        });

        image.onerror(); // remote -> local
        image.onerror(); // local -> placeholder
        expect(image.src).toBe('/favicon.png');
        expect(image.onerror).toBeNull();
    });
});
