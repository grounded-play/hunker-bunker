const finite = (value, digits = 2) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const scale = 10 ** digits;
    return Math.round(number * scale) / scale;
};

const compactGpuFrame = (snapshot) => snapshot ? {
    supported: Boolean(snapshot.supported),
    latestMs: finite(snapshot.latestMs),
    averageMs: finite(snapshot.averageMs),
    maxMs: finite(snapshot.maxMs),
    samples: Number(snapshot.samples) || 0,
    droppedFrames: Number(snapshot.droppedFrames) || 0
} : null;

const compactGpuMemory = (snapshot) => snapshot ? {
    estimatedBytes: Number(snapshot.estimatedBytes) || 0,
    geometryBytes: Number(snapshot.geometryBytes) || 0,
    textureBytes: Number(snapshot.textureBytes) || 0,
    renderTargetBytes: Number(snapshot.renderTargetBytes) || 0,
    uniqueGeometries: Number(snapshot.uniqueGeometries) || 0,
    uniqueMaterials: Number(snapshot.uniqueMaterials) || 0,
    uniqueTextures: Number(snapshot.uniqueTextures) || 0
} : null;

// A bounded, low-rate time series for exported QA logs. It deliberately does
// not use DebugLogger.pushLog: timeline samples should not create console DOM
// work, subscriber notifications, or large formatted strings while playing.
export function createSessionPerformanceTimeline({
    now = () => Date.now(),
    sampleIntervalMs = 30_000,
    eventMinIntervalMs = 10_000,
    deepIntervalMs = 120_000,
    maxSamples = 360
} = {}) {
    const startedAt = now();
    let lastSampleAt = -Infinity;
    let lastDeepSampleAt = -Infinity;
    let droppedSamples = 0;
    const samples = [];

    function capture({
        game = null,
        phase = null,
        reason = 'periodic',
        force = false,
        performanceObject = globalThis.performance
    } = {}) {
        const capturedAt = now();
        const isEvent = String(reason).startsWith('event:');
        const minimumGap = isEvent ? eventMinIntervalMs : sampleIntervalMs;
        if (!force && capturedAt - lastSampleAt < minimumGap) return null;

        const profile = game?.performanceProfile ?? phase ?? 'unknown';
        const intervals = game?.frameIntervalTracker?.snapshot?.()
            ?.profiles?.[profile] ?? null;
        const position = game?.player?.position;
        const chunkSize = Number(game?.chunkSize) || null;
        const rendererInfo = game?.renderer?.info;
        const heap = performanceObject?.memory;
        const deepDue = capturedAt - lastDeepSampleAt >= deepIntervalMs;
        let gpuMemory = null;
        if (deepDue && game?.gpuMemoryTracker?.snapshot) {
            gpuMemory = compactGpuMemory(game.gpuMemoryTracker.snapshot({
                scene: game.scene,
                renderer: game.renderer,
                composer: game.composer
            }));
            lastDeepSampleAt = capturedAt;
        }

        let enemies = 0;
        if (Array.isArray(game?.scatterSprites) && typeof game?.isEnemyType === 'function') {
            for (const sprite of game.scatterSprites) {
                if (sprite?.parent && !sprite.userData?.burstTriggered
                    && game.isEnemyType(sprite.userData?.type)) enemies += 1;
            }
        }

        const sample = {
            at: new Date(capturedAt).toISOString(),
            elapsedMs: Math.max(0, capturedAt - startedAt),
            reason: String(reason).slice(0, 96),
            phase,
            profile,
            place: {
                x: finite(position?.x),
                y: finite(position?.y),
                z: finite(position?.z),
                chunkX: position && chunkSize ? Math.floor(position.x / chunkSize) : null,
                chunkZ: position && chunkSize ? Math.floor(position.z / chunkSize) : null,
                biome: game?.currentBiomeKey ?? null,
                depthTier: Number.isFinite(game?.currentDepthTier) ? game.currentDepthTier : null,
                plane: game?.planeState?.stack?.at?.(-1)?.id
                    ?? (game?.isInPocket ? 'pocket' : 'surface')
            },
            frame: intervals ? {
                averageMs: finite(intervals.averageMs),
                p50Ms: finite(intervals.p50Ms),
                p95Ms: finite(intervals.p95Ms),
                p99Ms: finite(intervals.p99Ms),
                maxMs: finite(intervals.maxMs),
                observedIntervals: Number(intervals.observedIntervals) || 0
            } : null,
            gpuFrame: compactGpuFrame(game?.gpuFrameTimer?.snapshot?.()),
            memory: {
                jsHeapUsedBytes: Number(heap?.usedJSHeapSize) || null,
                jsHeapTotalBytes: Number(heap?.totalJSHeapSize) || null,
                gpu: gpuMemory
            },
            renderer: {
                drawCalls: Number(rendererInfo?.render?.calls) || 0,
                triangles: Number(rendererInfo?.render?.triangles) || 0,
                geometries: Number(rendererInfo?.memory?.geometries) || 0,
                textures: Number(rendererInfo?.memory?.textures) || 0,
                programs: rendererInfo?.programs?.length ?? null,
                pixelRatio: finite(game?.renderer?.getPixelRatio?.()),
                adaptive: Boolean(game?.adaptiveGameplayPerformanceMode),
                postprocessing: game?.gameplayPostProcessingEnabled !== false,
                shadowUpdates: Boolean(game?.renderer?.shadowMap?.autoUpdate)
            },
            activity: {
                enemies,
                scatter: game?.scatterSprites?.length ?? 0,
                projectiles: game?.activeProjectiles?.length ?? 0,
                effects: game?.transientEffects?.length ?? 0,
                activeChunks: game?.chunkMeshes?.size ?? 0,
                pendingChunkMounts: game?.pendingChunkMounts?.length ?? 0,
                remotePlayers: game?.remotePlayers?.size ?? 0
            },
            vitals: game?.playerVitals ? {
                hp: finite(game.playerVitals.hp),
                maxHp: finite(game.playerVitals.maxHp),
                o2: finite(game.playerVitals.o2),
                maxO2: finite(game.playerVitals.maxO2)
            } : null
        };

        samples.push(sample);
        if (samples.length > maxSamples) {
            const overflow = samples.length - maxSamples;
            samples.splice(0, overflow);
            droppedSamples += overflow;
        }
        lastSampleAt = capturedAt;
        return sample;
    }

    function snapshot() {
        return {
            sampleIntervalMs,
            eventMinIntervalMs,
            deepIntervalMs,
            maxSamples,
            droppedSamples,
            samples: samples.map((sample) => ({ ...sample }))
        };
    }

    return { capture, snapshot };
}
