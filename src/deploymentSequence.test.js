import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

describe('fresh deployment transaction', () => {
    it('selects gameplay profile and class before reset can resolve a spawn tile', () => {
        const launchStart = main.indexOf('function launchStandardRun(');
        const launchEnd = main.indexOf('\nif (startBtn)', launchStart);
        const launch = main.slice(launchStart, launchEnd);
        const profileIndex = launch.indexOf("setPerformanceProfile?.('gameplay')");
        const classIndex = launch.indexOf('updatePlayerType?.(playerType');
        const resetIndex = launch.indexOf('resetRunToStartingState({');

        expect(profileIndex).toBeGreaterThan(-1);
        expect(classIndex).toBeGreaterThan(profileIndex);
        expect(resetIndex).toBeGreaterThan(classIndex);
    });

    it('marks Sector 0 pending before reset and validates it before first presentation', () => {
        const launchStart = main.indexOf('function launchStandardRun(');
        const launchEnd = main.indexOf('\nif (startBtn)', launchStart);
        const launch = main.slice(launchStart, launchEnd);
        expect(launch.indexOf('setSectorZeroOnboardingPending?.(forceSectorZero)'))
            .toBeLessThan(launch.indexOf('resetRunToStartingState({'));

        const prepareStart = main.indexOf('async function prepareGameplayForDialogue(');
        const prepareEnd = main.indexOf('\nfunction setSnailSpawnState(', prepareStart);
        const prepare = main.slice(prepareStart, prepareEnd);
        expect(prepare.indexOf('validatePreparedDeployment?.({ expectedSectorZero })'))
            .toBeLessThan(prepare.indexOf("announceDeploymentStage('PRESENT'"));
    });

    it('flushes electron storage and reloads immediately after destructive reset', () => {
        const resetStart = main.indexOf("resetSaveConfirmBtn?.addEventListener('click'");
        const resetEnd = main.indexOf('\nfunction setQuitConfirmOpen(', resetStart);
        const resetHandler = main.slice(resetStart, resetEnd);
        expect(resetHandler).toContain('window.electronAPI?.resetSaveData?.()');
        expect(resetHandler).toContain('resetAllDataFactory()');
        expect(resetHandler).toContain('window.location.reload();');
        expect(resetHandler).not.toContain('setTimeout');
    });
});
