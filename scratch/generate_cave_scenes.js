// Generates the cave-reveal and act3-departure cutscene videos into
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
