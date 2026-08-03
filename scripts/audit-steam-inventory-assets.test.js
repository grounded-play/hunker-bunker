import { describe, expect, it } from 'vitest';
import { auditSteamInventoryAssets, readPngInfo } from './audit-steam-inventory-assets.js';

describe('Steam Inventory asset audit', () => {
    it('accepts the complete checked-in Inventory artwork set', () => {
        expect(auditSteamInventoryAssets()).toMatchObject({
            ok: true,
            itemCount: 11,
            failures: []
        });
    });

    it('reads expected PNG dimensions and alpha', () => {
        expect(readPngInfo('public/economy/cache_key.png')).toMatchObject({
            width: 256,
            height: 256,
            colorType: 6
        });
    });
});
