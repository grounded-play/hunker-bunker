// Generates the cave-reveal, act3-departure, and ending cutscene videos into
// public/cutscenes/ using a temp server + headless Chrome + MediaRecorder,
// same pipeline as generate_cutscenes.js.
//
// Optional art sources (chroma-keyed on near-black, composited when present,
// procedural fallback otherwise):
//   public/cave_mouth.png        — organic cave entrance exterior
//   public/hive_interior.png     — hive wall / egg-chamber backdrop
//   public/egg_cluster.png       — glowing egg clutch
//   public/queen_silhouette.png  — the queen (tease flicker)
//   public/survivor_vessel.png   — the four-seat vessel (departure scene)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 9997;
const REPO = process.cwd();
const CHROME_CANDIDATES = [
    path.join(REPO, 'chrome/linux-149.0.7827.54/chrome-linux64/chrome'),
    'google-chrome'
];

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head><title>Cave Scene Generator</title></head>
<body style="background:#111">
<canvas id="canvas" width="1920" height="1080"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 1920, H = 1080;

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function chromaKeyImage(img) {
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i] < 15 && d.data[i+1] < 15 && d.data[i+2] < 15) d.data[i+3] = 0;
    }
    cx.putImageData(d, 0, 0);
    return c;
}

// Deterministic pseudo-random layout helper
function rand(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

function grainAndVignette(t, strength = 0.5) {
    // vignette
    const g = ctx.createRadialGradient(W/2, H/2, H*0.34, W/2, H/2, H*0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + (0.55 + strength * 0.3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // sparse grain
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 220; i += 1) {
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

function drawCoverImage(img, zoom = 1, offsetX = 0, offsetY = 0) {
    if (!img) return false;
    const scale = Math.max(W / img.width, H / img.height) * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2 + offsetX, (H - dh) / 2 + offsetY, dw, dh);
    return true;
}

async function recordVideo(name, drawFrame, durationMs, posterT = 0.5) {
    const chunks = [];
    const stream = canvas.captureStream(30);
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    let posterDataUrl = null;
    let startTime = null;

    return new Promise((resolve) => {
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name + '.webm', data: reader.result }) });
                if (posterDataUrl) {
                    await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: name + '-poster.jpg', data: posterDataUrl }) });
                }
                resolve();
            };
        };
        recorder.start();
        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const t = elapsed / durationMs;
            drawFrame(Math.min(t, 1), elapsed);
            if (t >= posterT && !posterDataUrl) posterDataUrl = canvas.toDataURL('image/jpeg', 0.92);
            if (t < 1) requestAnimationFrame(animate);
            else recorder.stop();
        }
        requestAnimationFrame(animate);
    });
}

async function start() {
    const caveMouth = chromaKeyImage(await loadImage('/cave_mouth.png'));
    const hiveInterior = chromaKeyImage(await loadImage('/hive_interior.png'));
    const eggCluster = chromaKeyImage(await loadImage('/egg_cluster.png'));
    const queenSil = chromaKeyImage(await loadImage('/queen_silhouette.png'));
    const vessel = chromaKeyImage(await loadImage('/survivor_vessel.png'));
    const endingFullBroodShip = chromaKeyImage(await loadImage('/ending_fullbrood_ship.png'));
    const endingCleanEscapeCabin = chromaKeyImage(await loadImage('/ending_cleanescape_cabin.png'));
    const endingMixedCrewCabin = chromaKeyImage(await loadImage('/ending_mixedcrew_cabin.png'));
    const endingCarriersBargainEggs = chromaKeyImage(await loadImage('/ending_carriersbargain_eggs.png'));
    const endingScorchedSkyCockpit = chromaKeyImage(await loadImage('/ending_scorchedsky_cockpit.png'));

    // ── Scene 1: cave-reveal (7.5s) ─────────────────────────────
    // approach the mouth → egg chamber → queen flicker → sting to black
    const snowR = rand(77);
    const snow = Array.from({ length: 130 }, () => ({
        x: snowR() * W, y: snowR() * H, s: 1 + snowR() * 2.5, v: 0.4 + snowR()
    }));
    const rockR = rand(31);
    const rocks = Array.from({ length: 26 }, (_, i) => ({
        a: (i / 26) * Math.PI * 2, len: 0.5 + rockR() * 0.5, w: 0.05 + rockR() * 0.1
    }));
    const eggR = rand(9);
    const eggs = Array.from({ length: 14 }, () => ({
        x: 0.18 + eggR() * 0.64, y: 0.52 + eggR() * 0.4, r: 26 + eggR() * 52, p: eggR() * Math.PI * 2
    }));

    await recordVideo('cave-reveal', (t, elapsed) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        if (t < 0.38) {
            // — exterior: slow push toward the cave mouth —
            const k = t / 0.38;
            const zoom = 1 + k * 1.7;
            ctx.save();
            ctx.translate(W/2, H/2 + 40);
            ctx.scale(zoom, zoom);
            // glacier backdrop
            const sky = ctx.createLinearGradient(0, -H/2, 0, H/2);
            sky.addColorStop(0, '#02040a');
            sky.addColorStop(0.62, '#0a1626');
            sky.addColorStop(1, '#12283a');
            ctx.fillStyle = sky;
            ctx.fillRect(-W/2, -H/2, W, H);
            if (caveMouth) {
                const mw = 900, mh = mw * caveMouth.height / caveMouth.width;
                ctx.drawImage(caveMouth, -mw/2, -mh/2 + 60, mw, mh);
            } else {
                // procedural jagged mouth: dark maw + teeth of rock
                ctx.fillStyle = '#050a08';
                ctx.beginPath();
                ctx.ellipse(0, 90, 330, 260, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(80,255,150,0.16)';
                ctx.lineWidth = 5;
                ctx.stroke();
                ctx.fillStyle = '#0d1a16';
                for (const r of rocks) {
                    ctx.save();
                    ctx.translate(Math.cos(r.a) * 330, 90 + Math.sin(r.a) * 260);
                    ctx.rotate(r.a + Math.PI / 2);
                    ctx.beginPath();
                    ctx.moveTo(-r.w * 300, 0);
                    ctx.lineTo(0, -r.len * 240);
                    ctx.lineTo(r.w * 300, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                // faint amber pulse from inside
                const pulse = 0.10 + 0.08 * Math.sin(elapsed / 260);
                const glow = ctx.createRadialGradient(0, 110, 20, 0, 110, 300);
                glow.addColorStop(0, 'rgba(255,170,60,' + pulse + ')');
                glow.addColorStop(1, 'rgba(255,170,60,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(-340, -200, 680, 560);
            }
            ctx.restore();
            // drifting snow
            ctx.fillStyle = 'rgba(210,230,255,0.65)';
            for (const f of snow) {
                f.y += f.v * 2.2; f.x -= f.v * 0.8;
                if (f.y > H) f.y = 0;
                if (f.x < 0) f.x = W;
                ctx.fillRect(f.x, f.y, f.s, f.s);
            }
        } else if (t < 0.72) {
            // — interior: egg chamber breathing —
            const k = (t - 0.38) / 0.34;
            if (hiveInterior) {
                const scale = 1.05 + k * 0.12;
                const iw = W * scale, ih = H * scale;
                ctx.drawImage(hiveInterior, (W - iw)/2, (H - ih)/2, iw, ih);
            } else {
                const wall = ctx.createLinearGradient(0, 0, 0, H);
                wall.addColorStop(0, '#040607');
                wall.addColorStop(0.5, '#0c1410');
                wall.addColorStop(1, '#131f14');
                ctx.fillStyle = wall;
                ctx.fillRect(0, 0, W, H);
                // vein streaks
                ctx.strokeStyle = 'rgba(120,255,170,0.08)';
                ctx.lineWidth = 8;
                for (let i = 0; i < 12; i += 1) {
                    ctx.beginPath();
                    ctx.moveTo((i / 12) * W, 0);
                    ctx.bezierCurveTo((i/12)*W + 120, H*0.3, (i/12)*W - 120, H*0.6, (i/12)*W + 60, H);
                    ctx.stroke();
                }
            }
            for (const egg of eggs) {
                const pulse = 0.5 + 0.5 * Math.sin(elapsed / 300 + egg.p);
                const ex = egg.x * W, ey = egg.y * H, er = egg.r * (1 + k * 0.25);
                if (eggCluster) {
                    ctx.globalAlpha = 0.75 + pulse * 0.25;
                    ctx.drawImage(eggCluster, ex - er, ey - er, er * 2, er * 2);
                    ctx.globalAlpha = 1;
                } else {
                    const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, er);
                    g.addColorStop(0, 'rgba(255,190,90,' + (0.5 + pulse * 0.4) + ')');
                    g.addColorStop(0.55, 'rgba(200,110,40,' + (0.25 + pulse * 0.2) + ')');
                    g.addColorStop(1, 'rgba(120,60,20,0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(ex, ey, er, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(20,12,6,0.85)';
                    ctx.beginPath();
                    ctx.ellipse(ex, ey, er * 0.44, er * 0.56, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (t < 0.93) {
            // — the queen: strobing silhouette —
            const k = (t - 0.72) / 0.21;
            ctx.fillStyle = '#020403';
            ctx.fillRect(0, 0, W, H);
            const strobe = Math.sin(elapsed / 90) > 0.35 || k > 0.85;
            if (strobe) {
                const back = ctx.createRadialGradient(W/2, H*0.42, 60, W/2, H*0.42, H*0.75);
                back.addColorStop(0, 'rgba(120,255,150,0.30)');
                back.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = back;
                ctx.fillRect(0, 0, W, H);
                if (queenSil) {
                    const qh = H * (0.72 + k * 0.2);
                    const qw = qh * queenSil.width / queenSil.height;
                    ctx.drawImage(queenSil, W/2 - qw/2, H - qh, qw, qh);
                } else {
                    // procedural: tall segmented crowned mass
                    ctx.fillStyle = '#010302';
                    const qh = H * (0.66 + k * 0.2);
                    ctx.beginPath();
                    ctx.ellipse(W/2, H, qh * 0.42, qh, 0, Math.PI, Math.PI * 2);
                    ctx.fill();
                    for (let i = 0; i < 7; i += 1) {
                        const a = Math.PI + (i / 6) * Math.PI;
                        ctx.beginPath();
                        ctx.moveTo(W/2 + Math.cos(a) * qh * 0.34, H - qh * 0.82);
                        ctx.lineTo(W/2 + Math.cos(a) * qh * 0.62, H - qh * 1.12);
                        ctx.lineTo(W/2 + Math.cos(a) * qh * 0.30, H - qh * 0.68);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
            // heartbeat vignette
            const beat = Math.pow(Math.max(0, Math.sin(elapsed / 210)), 6);
            ctx.fillStyle = 'rgba(140,20,30,' + beat * 0.22 + ')';
            ctx.fillRect(0, 0, W, H);
        } else {
            // — sting: black, one green flash —
            const k = (t - 0.93) / 0.07;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            if (k > 0.4 && k < 0.55) {
                ctx.fillStyle = 'rgba(150,255,120,0.5)';
                ctx.fillRect(0, 0, W, H);
            }
        }
        grainAndVignette(t, t > 0.7 ? 0.8 : 0.45);
    }, 7500, 0.55);

    // ── Scene 2: act3-departure (7s) ────────────────────────────
    // the vessel climbs off the ice world; the world shrinks to a cold light
    const starR = rand(1234);
    const dstars = Array.from({ length: 240 }, () => ({
        x: starR() * W, y: starR() * H, s: 0.8 + starR() * 2.4
    }));

    await recordVideo('act3-departure', (t, elapsed) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // stars streaking downward as we climb
        const streak = 2 + t * 26;
        ctx.fillStyle = '#dfe8ff';
        for (const s of dstars) {
            s.y += s.s * streak * 0.12;
            if (s.y > H) s.y = 0;
            ctx.fillRect(s.x, s.y, s.s, s.s + streak * 0.4);
        }

        // ice planet sinking away
        const planetY = H * (0.86 + t * 0.55);
        const planetR = H * (1.05 - t * 0.62);
        const pg = ctx.createRadialGradient(W/2, planetY, planetR * 0.2, W/2, planetY, planetR);
        pg.addColorStop(0, '#e8f6ff');
        pg.addColorStop(0.72, '#9cc8e8');
        pg.addColorStop(0.96, '#39678f');
        pg.addColorStop(1, 'rgba(20,40,70,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(W/2, planetY, planetR, 0, Math.PI * 2);
        ctx.fill();
        // atmosphere rim
        ctx.strokeStyle = 'rgba(140,220,255,' + (0.5 - t * 0.3) + ')';
        ctx.lineWidth = 14 - t * 8;
        ctx.beginPath();
        ctx.arc(W/2, planetY, planetR, 0, Math.PI * 2);
        ctx.stroke();

        // the vessel climbing with shake
        const shake = (1 - t) * 7;
        const vx = W/2 + Math.sin(elapsed / 55) * shake;
        const vy = H * (0.62 - t * 0.34) + Math.cos(elapsed / 47) * shake;
        const vs = 240 - t * 90;
        ctx.save();
        ctx.translate(vx, vy);
        // engine plume
        const plume = ctx.createLinearGradient(0, vs * 0.3, 0, vs * (1.5 + Math.sin(elapsed / 60) * 0.14));
        plume.addColorStop(0, 'rgba(255,190,80,0.95)');
        plume.addColorStop(0.5, 'rgba(255,120,40,0.5)');
        plume.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.moveTo(-vs * 0.16, vs * 0.3);
        ctx.lineTo(0, vs * 1.55);
        ctx.lineTo(vs * 0.16, vs * 0.3);
        ctx.closePath();
        ctx.fill();
        if (vessel) {
            const vw = vs, vh = vs * vessel.height / vessel.width;
            ctx.drawImage(vessel, -vw/2, -vh/2, vw, vh);
        } else {
            // procedural: wide pentagonal hull, amber outline
            ctx.fillStyle = '#0a0c10';
            ctx.strokeStyle = '#ffb144';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(0, -vs * 0.5);
            ctx.lineTo(vs * 0.42, -vs * 0.08);
            ctx.lineTo(vs * 0.3, vs * 0.34);
            ctx.lineTo(-vs * 0.3, vs * 0.34);
            ctx.lineTo(-vs * 0.42, -vs * 0.08);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // canopy: a cold green light — the queen is aboard
            ctx.fillStyle = 'rgba(140,255,160,' + (0.5 + 0.3 * Math.sin(elapsed / 180)) + ')';
            ctx.beginPath();
            ctx.arc(0, -vs * 0.18, vs * 0.09, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // end fade with a green tinge
        if (t > 0.82) {
            const k = (t - 0.82) / 0.18;
            ctx.fillStyle = 'rgba(3,12,6,' + k * 0.96 + ')';
            ctx.fillRect(0, 0, W, H);
        }
        grainAndVignette(t, 0.4);
    }, 7000, 0.45);

    // ── Scene 3: ending-fullbrood (6.5s) ─────────────────────────
    await recordVideo('ending-fullbrood', (t, elapsed) => {
        ctx.fillStyle = '#020308';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 160; i += 1) {
            const x = (i * 137.3 + elapsed * 0.035) % W;
            const y = (i * 61.7 + elapsed * 0.09) % H;
            const size = 1 + (i % 4) * 0.35;
            ctx.fillStyle = i % 5 === 0 ? 'rgba(140,255,150,0.7)' : 'rgba(220,235,255,0.6)';
            ctx.fillRect(x, y, size, size);
        }

        const zoom = 1.02 + t * 0.06;
        const driftX = Math.sin(elapsed / 900) * 14;
        const driftY = Math.cos(elapsed / 1200) * 10;
        if (!drawCoverImage(endingFullBroodShip, zoom, driftX, driftY)) {
            drawCoverImage(vessel, zoom, driftX, driftY);
        }

        const engineGlow = ctx.createRadialGradient(W * 0.56, H * 0.72, 30, W * 0.56, H * 0.72, H * 0.55);
        engineGlow.addColorStop(0, 'rgba(140,255,150,' + (0.18 + 0.08 * Math.sin(elapsed / 180)) + ')');
        engineGlow.addColorStop(0.45, 'rgba(255,180,74,' + (0.09 + 0.05 * Math.sin(elapsed / 260)) + ')');
        engineGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = engineGlow;
        ctx.fillRect(0, 0, W, H);

        const hullPulse = 0.06 + 0.04 * Math.sin(elapsed / 140);
        ctx.fillStyle = 'rgba(140,255,160,' + hullPulse + ')';
        ctx.fillRect(0, 0, W, H);
        grainAndVignette(t, 0.55);
    }, 6500, 0.58);

    // ── Scene 4: ending-cleanescape (6.5s) ───────────────────────
    await recordVideo('ending-cleanescape', (t, elapsed) => {
        ctx.fillStyle = '#07101c';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 120; i += 1) {
            const x = (i * 83.4 + elapsed * 0.025) % W;
            const y = (i * 43.1 + elapsed * 0.02) % H;
            const size = 1 + (i % 3) * 0.3;
            ctx.fillStyle = 'rgba(220,235,255,0.75)';
            ctx.fillRect(x, y, size, size);
        }

        const zoom = 1.04 + t * 0.03;
        const driftX = Math.sin(elapsed / 1200) * 12;
        const driftY = Math.cos(elapsed / 1400) * 8;
        if (!drawCoverImage(endingCleanEscapeCabin, zoom, driftX, driftY)) {
            drawCoverImage(vessel, zoom, driftX, driftY);
        }

        const viewportGlow = ctx.createRadialGradient(W * 0.77, H * 0.24, 50, W * 0.77, H * 0.24, H * 0.5);
        viewportGlow.addColorStop(0, 'rgba(110,170,255,' + (0.15 + 0.05 * Math.sin(elapsed / 260)) + ')');
        viewportGlow.addColorStop(0.5, 'rgba(255,190,110,' + (0.08 + 0.03 * Math.sin(elapsed / 420)) + ')');
        viewportGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = viewportGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(255,194,108,' + (0.05 + 0.02 * Math.sin(elapsed / 180)) + ')';
        ctx.fillRect(0, H * 0.65, W, H * 0.35);
        grainAndVignette(t, 0.46);
    }, 6500, 0.56);

    // ── Scene 5: ending-mixedcrew (7s) ──────────────────────────
    await recordVideo('ending-mixedcrew', (t, elapsed) => {
        ctx.fillStyle = '#041018';
        ctx.fillRect(0, 0, W, H);

        const leftTint = ctx.createLinearGradient(0, 0, W * 0.5, 0);
        leftTint.addColorStop(0, 'rgba(255,176,74,0.14)');
        leftTint.addColorStop(1, 'rgba(255,176,74,0)');
        ctx.fillStyle = leftTint;
        ctx.fillRect(0, 0, W * 0.5, H);

        const rightTint = ctx.createLinearGradient(W * 0.5, 0, W, 0);
        rightTint.addColorStop(0, 'rgba(0,229,255,0)');
        rightTint.addColorStop(1, 'rgba(0,229,255,0.16)');
        ctx.fillStyle = rightTint;
        ctx.fillRect(W * 0.5, 0, W * 0.5, H);

        const zoom = 1.03 + t * 0.035;
        const driftX = Math.sin(elapsed / 850) * 10;
        const driftY = Math.cos(elapsed / 980) * 7;
        if (!drawCoverImage(endingMixedCrewCabin, zoom, driftX, driftY)) {
            drawCoverImage(vessel, zoom, driftX, driftY);
        }

        const beamX = W * 0.5 + Math.sin(elapsed / 230) * 18;
        ctx.fillStyle = 'rgba(0,229,255,' + (0.12 + 0.06 * Math.sin(elapsed / 120)) + ')';
        ctx.fillRect(beamX - 18, 0, 36, H);

        ctx.fillStyle = 'rgba(0,229,255,0.05)';
        for (let i = 0; i < 12; i += 1) {
            ctx.fillRect(0, (i / 12) * H, W, 2);
        }

        grainAndVignette(t, 0.5);
    }, 7000, 0.5);

    // ── Scene 6: ending-carriersbargain (6.5s) ──────────────────
    await recordVideo('ending-carriersbargain', (t, elapsed) => {
        ctx.fillStyle = '#061012';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 80; i += 1) {
            const x = (i * 91.7 + elapsed * 0.018) % W;
            const y = (i * 67.2 + elapsed * 0.014) % H;
            ctx.fillStyle = 'rgba(225,245,255,0.04)';
            ctx.beginPath();
            ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
        }

        const zoom = 1.03 + t * 0.025;
        const driftX = Math.sin(elapsed / 1100) * 8;
        const driftY = Math.cos(elapsed / 1300) * 6;
        if (!drawCoverImage(endingCarriersBargainEggs, zoom, driftX, driftY)) {
            drawCoverImage(eggCluster, zoom, driftX, driftY);
        }

        const eggGlow = ctx.createRadialGradient(W * 0.52, H * 0.55, 40, W * 0.52, H * 0.55, H * 0.52);
        eggGlow.addColorStop(0, 'rgba(255,194,108,' + (0.18 + 0.08 * Math.sin(elapsed / 180)) + ')');
        eggGlow.addColorStop(0.45, 'rgba(140,255,160,' + (0.08 + 0.04 * Math.sin(elapsed / 260)) + ')');
        eggGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eggGlow;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(190,225,255,' + (0.05 + 0.03 * Math.sin(elapsed / 160)) + ')';
        ctx.fillRect(0, 0, W, H * 0.18);
        grainAndVignette(t, 0.58);
    }, 6500, 0.55);

    // ── Scene 7: ending-scorchedsky (7s) ────────────────────────
    await recordVideo('ending-scorchedsky', (t, elapsed) => {
        ctx.fillStyle = '#040308';
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 70; i += 1) {
            const x = (i * 153.2 + elapsed * 0.04) % W;
            const y = (i * 37.6 + elapsed * 0.1) % H;
            const s = 1 + (i % 4) * 0.5;
            ctx.fillStyle = i % 6 === 0 ? 'rgba(255,140,58,0.8)' : 'rgba(255,92,58,0.5)';
            ctx.fillRect(x, y, s, s);
        }

        const shakeX = Math.sin(elapsed / 60) * 8 * (1 - t * 0.4);
        const shakeY = Math.cos(elapsed / 47) * 6 * (1 - t * 0.4);
        const zoom = 1.02 + t * 0.02;
        if (!drawCoverImage(endingScorchedSkyCockpit, zoom, shakeX, shakeY)) {
            drawCoverImage(vessel, zoom, shakeX, shakeY);
        }

        const alarm = 0.12 + 0.14 * Math.max(0, Math.sin(elapsed / 140));
        ctx.fillStyle = 'rgba(178,34,22,' + alarm + ')';
        ctx.fillRect(0, 0, W, H);

        const burn = ctx.createRadialGradient(W * 0.76, H * 0.2, 80, W * 0.76, H * 0.2, H * 0.7);
        burn.addColorStop(0, 'rgba(255,176,74,' + (0.14 + 0.08 * Math.sin(elapsed / 180)) + ')');
        burn.addColorStop(0.5, 'rgba(178,34,22,' + (0.1 + 0.05 * Math.sin(elapsed / 260)) + ')');
        burn.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = burn;
        ctx.fillRect(0, 0, W, H);

        grainAndVignette(t, 0.72);
    }, 7000, 0.45);

    await fetch('/done', { method: 'POST' });
}

window.onload = start;
</script>
</body>
</html>`;

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_CONTENT);
    } else if (req.method === 'GET' && MIME[path.extname(req.url)]) {
        const safe = path.normalize(req.url).replace(/^([./\\])+/, '');
        fs.readFile(path.join(REPO, 'public', safe), (err, data) => {
            if (err) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(req.url)] });
            res.end(data);
        });
    } else if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const name = path.basename(payload.name);
                const header = name.endsWith('.webm') ? /^data:video\/webm;base64,/ : /^data:image\/jpeg;base64,/;
                const filePath = path.join(REPO, 'public', 'cutscenes', name);
                fs.writeFileSync(filePath, payload.data.replace(header, ''), 'base64');
                console.log(`Saved: ${filePath}`);
                res.writeHead(200); res.end('OK');
            } catch (err) {
                console.error(err);
                res.writeHead(500); res.end('Error');
            }
        });
    } else if (req.method === 'POST' && req.url === '/done') {
        console.log('Cave scene generation completed.');
        res.writeHead(200); res.end('OK');
        res.on('finish', () => process.exit(0));
    } else {
        res.writeHead(404); res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Cave scene generator on http://localhost:${PORT}`);
    const chromeBin = CHROME_CANDIDATES.find((c) => c === 'google-chrome' || fs.existsSync(c));
    const browser = spawn(chromeBin, [
        '--headless=new',
        '--no-sandbox',
        '--enable-unsafe-swiftshader',
        '--use-angle=swiftshader',
        '--autoplay-policy=no-user-gesture-required',
        '--user-data-dir=' + path.join(REPO, 'scratch', 'chrome-profile-cave'),
        `http://localhost:${PORT}`
    ], { detached: true, stdio: 'ignore' });
    browser.unref();
    // Safety valve: never hang forever if recording stalls.
    setTimeout(() => {
        console.error('Timed out waiting for scenes — exiting.');
        process.exit(1);
    }, 120000);
});
