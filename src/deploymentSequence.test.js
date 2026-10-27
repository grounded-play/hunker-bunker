import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const threeGame = readFileSync(new URL('./threeGame.js', import.meta.url), 'utf8');

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

    it('keeps deployment out of live gameplay until prepared doors begin opening', () => {
        const launchStart = main.indexOf('function launchStandardRun(');
        const launchEnd = main.indexOf('\nif (startBtn)', launchStart);
        const launch = main.slice(launchStart, launchEnd);
        const deploymentPhase = launch.indexOf("setAppPhase('deployment')");
        const prepare = launch.indexOf('prepareGameplayForDialogue({');
        const gameplayPhase = launch.indexOf("setAppPhase('gameplay')");

        expect(deploymentPhase).toBeGreaterThan(-1);
        expect(prepare).toBeGreaterThan(deploymentPhase);
        expect(gameplayPhase).toBeGreaterThan(prepare);
        expect(launch.slice(0, prepare)).not.toContain("setAppPhase('gameplay')");
    });

    it('plays every song card behind the one stage-door system', () => {
        const start = main.indexOf('let stageCardQueue');
        const end = main.indexOf('\n// The camp', start);
        const flow = main.slice(start, end);
        expect(flow).toContain('triggerDoorTransition(');
        expect(flow).toContain('stageDoors: true');
        // Every caller goes through showCardThenScene, never the controller's own doors.
        expect(main.match(/songInterstitial\.show\(/g)).toHaveLength(1);
        expect(flow).toContain('songInterstitial.show(spec, { ...options, stageDoors: true })');
    });

    it('recovers the black box with one cinematic, not the legacy film then the card', () => {
        expect(main).not.toMatch(/playAuthoredEventOnce\('black_box_recovered'/);
    });

    it('ends sleep at the bed without automatically opening the Foundry', () => {
        const sleepStart = main.indexOf("window.addEventListener('day-rest-open'");
        const sleepEnd = main.indexOf('\nfunction updateCampaignCycleIndicator', sleepStart);
        const sleepFlow = main.slice(sleepStart, sleepEnd);

        const closedWork = sleepFlow.indexOf('await playSleepCutscene(detail.sleepStyle');
        const wake = sleepFlow.indexOf('window.game?.finishCampRest?.()');
        const opened = sleepFlow.indexOf('() => openMorningAfterRest(detail)');
        // Video, then bed wake, both behind closed doors; morning HUD on open.
        expect(closedWork).toBeGreaterThan(-1);
        expect(wake).toBeGreaterThan(closedWork);
        expect(opened).toBeGreaterThan(wake);
        expect(sleepFlow).not.toContain('openFabricationModal()');
        expect(sleepFlow).not.toContain('fabricationBay.beginCampRest()');
    });

    it('reserves deployment progress for every post-mount stage and reaches 100 only after first render', () => {
        const stageStart = threeGame.indexOf('async prepareVisibleChunksForGameplay(');
        const stageEnd = threeGame.indexOf('\n    validatePreparedDeployment(', stageStart);
        const staging = threeGame.slice(stageStart, stageEnd);
        const prepareStart = main.indexOf('async function prepareGameplayForDialogue(');
        const prepareEnd = main.indexOf('\nfunction setSnailSpawnState(', prepareStart);
        const presentation = main.slice(prepareStart, prepareEnd);

        expect(staging.indexOf("reportProgress(0.54, 'LIGHTING'"))
            .toBeGreaterThan(staging.indexOf('while (this.pendingChunkMounts.length > 0)'));
        expect(staging.indexOf("reportProgress(0.76, 'MODELS'"))
            .toBeGreaterThan(staging.indexOf('await this.warmUpShaderPrograms'));
        expect(staging.indexOf("reportProgress(0.84, 'CORPSES'"))
            .toBeGreaterThan(staging.indexOf('await preloadPromise'));
        expect(staging.indexOf("reportProgress(0.93, 'EFFECTS'"))
            .toBeGreaterThan(staging.indexOf('await prewarmCommonCorpse3dTemplates'));
        expect(staging).not.toContain('onProgress?.(1)');
        expect(presentation.indexOf("announceDeploymentStage('READY'"))
            .toBeGreaterThan(presentation.indexOf("game.renderWithPerf('startup:first-frame')"));
        expect(presentation.indexOf("game.renderWithPerf('startup:first-frame')"))
            .toBeGreaterThan(presentation.indexOf("announceDeploymentStage('PRESENT'"));
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
