// Retro canvas battle transition module for snail diplomacy encounters
// Provides Earthbound/Pokemon-style pattern dissolves (spiral, mosaic, diamond wipe).

export const TRANSITION_PATTERNS = ['spiral', 'mosaic', 'diamond'];

export function startEncounterTransition({
    canvas,
    pattern = 'random',
    durationMs = 700,
    onComplete = () => {}
} = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') {
        if (typeof onComplete === 'function') onComplete();
        return () => {};
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        if (typeof onComplete === 'function') onComplete();
        return () => {};
    }

    const selectedPattern = pattern === 'random'
        ? TRANSITION_PATTERNS[Math.floor(Math.random() * TRANSITION_PATTERNS.length)]
        : (TRANSITION_PATTERNS.includes(pattern) ? pattern : 'spiral');

    const width = canvas.width || window.innerWidth || 800;
    const height = canvas.height || window.innerHeight || 600;
    canvas.width = width;
    canvas.height = height;

    canvas.style.display = 'block';
    canvas.style.opacity = '1';

    let startTime = null;
    let animId = null;
    let cancelled = false;

    function renderFrame(timestamp) {
        if (cancelled) return;
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        ctx.clearRect(0, 0, width, height);

        if (selectedPattern === 'spiral') {
            renderSpiralPattern(ctx, width, height, progress);
        } else if (selectedPattern === 'mosaic') {
            renderMosaicPattern(ctx, width, height, progress);
        } else {
            renderDiamondPattern(ctx, width, height, progress);
        }

        if (progress < 1) {
            animId = requestAnimationFrame(renderFrame);
        } else {
            canvas.style.opacity = '0';
            setTimeout(() => {
                canvas.style.display = 'none';
                if (typeof onComplete === 'function') onComplete();
            }, 50);
        }
    }

    animId = requestAnimationFrame(renderFrame);

    return function cancel() {
        cancelled = true;
        if (animId) cancelAnimationFrame(animId);
        canvas.style.display = 'none';
    };
}

function renderSpiralPattern(ctx, width, height, progress) {
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    const currentRadius = maxRadius * progress;

    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Retro spiral rings
    const rings = 12;
    ctx.lineWidth = 4;
    for (let i = 0; i < rings; i++) {
        const ringProgress = (progress + i / rings) % 1;
        const r = maxRadius * ringProgress;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(168, 85, 247, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, progress * Math.PI * 4, progress * Math.PI * 4 + Math.PI * 1.5);
        ctx.stroke();
    }
}

function renderMosaicPattern(ctx, width, height, progress) {
    const tileSize = 20 + Math.floor((1 - progress) * 60);
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);

    ctx.fillStyle = '#060812';
    ctx.fillRect(0, 0, width, height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const distFromCenter = Math.hypot(c - cols / 2, r - rows / 2) / (cols / 2);
            const tileProgress = Math.max(0, Math.min(1, (progress - distFromCenter * 0.3) / 0.7));

            if (tileProgress > 0 && tileProgress < 1) {
                const drawSize = tileSize * (1 - tileProgress);
                ctx.fillStyle = (r + c) % 2 === 0 ? '#10b981' : '#8b5cf6';
                ctx.globalAlpha = 1 - tileProgress;
                ctx.fillRect(c * tileSize + (tileSize - drawSize) / 2, r * tileSize + (tileSize - drawSize) / 2, drawSize, drawSize);
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function renderDiamondPattern(ctx, width, height, progress) {
    const tileSize = 32;
    const cols = Math.ceil(width / tileSize) + 1;
    const rows = Math.ceil(height / tileSize) + 1;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#22c55e';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const delay = (c + r) / (cols + rows);
            const scale = Math.max(0, Math.min(1, (progress - delay * 0.5) / 0.5));
            if (scale > 0) {
                const half = (tileSize / 2) * (1 - scale);
                const x = c * tileSize + tileSize / 2;
                const y = r * tileSize + tileSize / 2;
                ctx.beginPath();
                ctx.moveTo(x, y - half);
                ctx.lineTo(x + half, y);
                ctx.lineTo(x, y + half);
                ctx.lineTo(x - half, y);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
}
