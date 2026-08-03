import { describe, expect, it } from 'vitest';
import { applyCatalogImage } from './steamVaultUi.js';

describe('Steam Vault image fallback', () => {
    it('switches a failed remote icon to its bundled local asset once', () => {
        const image = { src: '', onerror: null, dataset: {} };
        applyCatalogImage(image, {
            img: 'https://assets.example.test/item.png',
            localImg: '/economy/item.png'
        });

        expect(image.src).toBe('https://assets.example.test/item.png');
        image.onerror();
        expect(image.src).toBe('/economy/item.png');
        expect(image.dataset.localFallback).toBe('true');
        expect(image.onerror).toBeNull();
    });
});
