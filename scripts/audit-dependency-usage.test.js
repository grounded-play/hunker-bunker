import { describe, expect, it } from 'vitest';
import {
    extractPackageReferences,
    findUnusedDependencies,
    packageNameFromSpecifier
} from './audit-dependency-usage.js';

describe('dependency usage audit', () => {
    it('normalizes bare, scoped, and built-in specifiers', () => {
        expect(packageNameFromSpecifier('three/addons/loaders/GLTFLoader.js')).toBe('three');
        expect(packageNameFromSpecifier('@scope/pkg/subpath')).toBe('@scope/pkg');
        expect(packageNameFromSpecifier('node:fs')).toBeNull();
        expect(packageNameFromSpecifier('./local.js')).toBeNull();
    });

    it('extracts static imports, exports, dynamic imports, and require calls', () => {
        const references = extractPackageReferences(`
            import express from 'express';
            export { thing } from '@scope/pkg/subpath';
            const steam = require('steamworks.js');
            await import("three");
        `);
        expect([...references].sort()).toEqual(['@scope/pkg', 'express', 'steamworks.js', 'three']);
    });

    it('reports only unreferenced production dependencies', () => {
        expect(findUnusedDependencies(
            { express: '1', 'socket.io-client': '1', three: '1' },
            ["import express from 'express';", "import * as THREE from 'three';"]
        )).toEqual(['socket.io-client']);
    });
});

