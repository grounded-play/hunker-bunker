import { describe, expect, it } from 'vitest';
import {
    assertSafeDockerVolumeName,
    buildBackupDockerArgs,
    buildRestoreDockerArgs,
    buildSqliteIntegrityDockerArgs,
    parseVolumeCliArgs,
    resolveArchivePath
} from './steam-backend-volume.js';

describe('steam backend volume tooling', () => {
    it('accepts Docker-safe volume names and rejects shell-like input', () => {
        expect(assertSafeDockerVolumeName('hunker-bunker-data')).toBe('hunker-bunker-data');
        expect(() => assertSafeDockerVolumeName('volume;rm')).toThrow(/only letters/);
        expect(() => assertSafeDockerVolumeName('')).toThrow(/only letters/);
    });

    it('requires a tar.gz archive and resolves it absolutely', () => {
        expect(resolveArchivePath('backups/test.tar.gz', '/repo')).toBe('/repo/backups/test.tar.gz');
        expect(() => resolveArchivePath('backup.zip', '/repo')).toThrow(/must end/);
    });

    it('builds shell-free read-only backup mounts', () => {
        const args = buildBackupDockerArgs('hunker-bunker-data', '/tmp/backups/test.tar.gz');
        expect(args).toContain('type=volume,src=hunker-bunker-data,dst=/data,readonly');
        expect(args).toContain('type=bind,src=/tmp/backups,dst=/backup');
        expect(args).not.toContain('sh');
    });

    it('builds restore arguments for an isolated target volume', () => {
        const args = buildRestoreDockerArgs('hb-restore-drill-1', '/tmp/test.tar.gz');
        expect(args).toContain('type=volume,src=hb-restore-drill-1,dst=/restore');
        expect(args).toContain('xzf');
    });

    it('builds a read-only SQLite integrity check for the restored volume', () => {
        const args = buildSqliteIntegrityDockerArgs('hb-restore-drill-1');
        expect(args).toContain('type=volume,src=hb-restore-drill-1,dst=/restore,readonly');
        expect(args.join(' ')).toContain('PRAGMA integrity_check');
        expect(() => buildSqliteIntegrityDockerArgs('hb-restore', '../db.sqlite')).toThrow(/simple/);
    });

    it('parses explicit command options and rejects missing values', () => {
        expect(parseVolumeCliArgs(['backup', '--archive', 'one.tar.gz'])).toEqual({
            command: 'backup',
            options: { archive: 'one.tar.gz' }
        });
        expect(() => parseVolumeCliArgs(['backup', '--archive'])).toThrow(/requires a value/);
    });
});
