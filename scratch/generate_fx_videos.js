import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 9996;

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
    <title>FX Video Generator</title>
    <style>
        body { background: #000; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        canvas { border: 1px solid #333; margin: 10px; background: #000; }
        #status { font-size: 20px; margin: 20px; color: #00e5ff; }
    </style>
</head>
<body>
    <div id="status">Recording WebM FX videos...</div>
    <div id="container"></div>

    <script>
        const fxList = [
            { name: 'fx_scout_sprint.webm', duration: 1000, draw: drawScoutSprint },
            { name: 'fx_tank_shockwave.webm', duration: 1200, draw: drawTankShockwave },
            { name: 'fx_engineer_turret_reprogram.webm', duration: 1500, draw: drawTurretReprogram },
            { name: 'fx_shared_levelup.webm', duration: 2000, draw: drawLevelUp },
            { name: 'fx_shared_achievement.webm', duration: 2500, draw: drawAchievementBurst }
        ];

        // 1. Scout Sprint afterimage streak
        function drawScoutSprint(ctx, time, duration) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            const pct = time / duration;
            const cx = 100 + pct * 312;
            const cy = 256;
            const alpha = 1.0 - pct;

            // Draw afterimage ghosts
            ctx.strokeStyle = '#00ffcc';
            ctx.shadowColor = '#00ffcc';
            for (let i = 0; i < 5; i++) {
                const ox = cx - i * 35;
                const oalpha = alpha * (1.0 - i * 0.18);
                if (oalpha <= 0) continue;
                ctx.save();
                ctx.globalAlpha = oalpha;
                ctx.shadowBlur = 15;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.ellipse(ox, cy, 30, 60, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 2. Tank Shockwave ring
        function drawTankShockwave(ctx, time, duration) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            const pct = time / duration;
            const cx = 256, cy = 256;
            const maxRad = 220;
            const rad = pct * maxRad;
            const alpha = 1.0 - pct;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffb700';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 10;
            
            // Expand shockwave circle
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.stroke();

            // Draw radial spike spikes
            ctx.lineWidth = 4;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * (rad - 15), cy + Math.sin(a) * (rad - 15));
                ctx.lineTo(cx + Math.cos(a) * (rad + 20), cy + Math.sin(a) * (rad + 20));
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. Engineer turret reprogram sparks
        function drawTurretReprogram(ctx, time, duration) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            const cx = 256, cy = 256;
            ctx.save();
            ctx.strokeStyle = '#00e5ff';
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;

            // Draw crackling arcs randomly
            ctx.beginPath();
            let px = cx + (Math.random() - 0.5) * 40;
            let py = cy + (Math.random() - 0.5) * 40;
            ctx.moveTo(px, py);
            for (let i = 0; i < 8; i++) {
                px += (Math.random() - 0.5) * 90;
                py += (Math.random() - 0.5) * 90;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 4. Shared Levelup flourish
        function drawLevelUp(ctx, time, duration) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            const pct = time / duration;
            const cx = 256, cy = 512 - pct * 450;
            const alpha = 1.0 - pct;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffeb3b';
            ctx.strokeStyle = '#b4ff32';
            ctx.shadowColor = '#b4ff32';
            ctx.shadowBlur = 20;

            // Rising glowing rings
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 60, 20, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(cx, cy + 40, 80, 26, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Floating star particles
            for (let i = 0; i < 8; i++) {
                const px = cx + Math.sin(i * 3 + time * 0.01) * 70;
                const py = cy + 60 + i * 20;
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 5. Shared Achievement burst
        function drawAchievementBurst(ctx, time, duration) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            const pct = time / duration;
            const cx = 256, cy = 256;
            const rad = pct * 180;
            const alpha = 1.0 - pct;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffeb3b';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 30;
            ctx.lineWidth = 4;

            // Draw expanding glowing Hexagon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                const hx = cx + Math.cos(angle) * rad;
                const hy = cy + Math.sin(angle) * rad;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();

            // Center glowing core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, 15 + (1.0 - pct) * 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        async function recordFX(fx) {
            const status = document.getElementById('status');
            status.textContent = 'Recording ' + fx.name + '...';

            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            document.body.appendChild(canvas);
            const ctx = canvas.getContext('2d');

            const stream = canvas.captureStream(30);
            
            // Collect recorded chunks
            const chunks = [];
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                
                // Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64Data = reader.result;
                    const response = await fetch('/save_webm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: fx.name, data: base64Data })
                    });
                    canvas.remove();
                    if (!response.ok) {
                        status.textContent = 'Error saving ' + fx.name;
                        status.style.color = '#ff3300';
                    } else {
                        // Next FX
                        nextFX();
                    }
                };
            };

            // Start recording
            recorder.start();

            // Run render loop
            const startTime = performance.now();
            return new Promise((resolve) => {
                function render() {
                    const elapsed = performance.now() - startTime;
                    if (elapsed >= fx.duration) {
                        recorder.stop();
                        resolve();
                        return;
                    }
                    fx.draw(ctx, elapsed, fx.duration);
                    requestAnimationFrame(render);
                }
                render();
            });
        }

        let currentIndex = 0;
        async function nextFX() {
            if (currentIndex >= fxList.length) {
                const status = document.getElementById('status');
                status.textContent = 'All WebM FX generated successfully! Shutting down...';
                await fetch('/done', { method: 'POST' });
                return;
            }
            const fx = fxList[currentIndex++];
            await recordFX(fx);
        }

        window.onload = nextFX;
    </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_CONTENT);
    } else if (req.method === 'POST' && req.url === '/save_webm') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                // WebM dataUrl looks like: data:video/webm;base64,AAAA...
                const base64Data = payload.data.replace(/^data:video\/webm;base64,/, '');
                const filePath = path.join(process.cwd(), 'public', payload.name);
                fs.writeFileSync(filePath, base64Data, 'base64');
                console.log(`Saved Video: ${filePath}`);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error');
            }
        });
    } else if (req.method === 'POST' && req.url === '/done') {
        console.log('Video generation completed.');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        res.on('finish', () => {
            process.exit(0);
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Temp video server running on http://localhost:${PORT}`);
    const browser = spawn('firefox', ['--headless', `http://localhost:${PORT}`], {
        detached: true,
        stdio: 'ignore'
    });
    browser.unref();
});
