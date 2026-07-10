import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 9998;

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
    <title>Cutscene Generator</title>
    <style>
        body {
            background: #111;
            color: #fff;
            font-family: monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        canvas {
            background: #000;
            border: 2px solid #333;
        }
        #status {
            font-size: 20px;
            margin: 20px;
            color: #00e5ff;
        }
    </style>
</head>
<body>
    <div id="status">Starting cutscene generation...</div>
    <canvas id="canvas" width="1920" height="1080"></canvas>

    <script>
        const status = document.getElementById('status');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Helper to load image
        function loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        }

        // Chroma-key pure black backgrounds
        function chromaKeyImage(img) {
            if (!img) return null;
            const offCanvas = document.createElement('canvas');
            offCanvas.width = img.width;
            offCanvas.height = img.height;
            const offCtx = offCanvas.getContext('2d');
            offCtx.drawImage(img, 0, 0);
            
            const imgData = offCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                if (r < 15 && g < 15 && b < 15) {
                    data[i+3] = 0; // Transparent
                }
            }
            offCtx.putImageData(imgData, 0, 0);
            return offCanvas;
        }

        // Draw starfield
        function drawStars(ctx, stars, time, speed) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1920, 1080);
            
            ctx.fillStyle = '#ffffff';
            for (let s of stars) {
                s.x -= s.size * speed;
                if (s.x < 0) s.x = 1920;
                
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Generate stars
        const stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * 1920,
                y: Math.random() * 1080,
                size: 1 + Math.random() * 3
            });
        }

        async function recordVideo(className, drawFrame, durationMs) {
            status.textContent = 'Generating ' + className + ' cutscene...';
            
            const chunks = [];
            const stream = canvas.captureStream(30); // 30 FPS
            
            // Try supported mime types
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }

            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
            
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            let posterDataUrl = null;
            let startTime = null;

            return new Promise((resolve) => {
                recorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    
                    const isHero = className === 'scout' || className === 'tank' || className === 'engineer';
                    const videoName = isHero ? (className + '-intro.webm') : (className + '.webm');
                    const posterName = isHero ? (className + '-intro-poster.jpg') : (className + '-poster.jpg');

                    // Upload WebM
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = async () => {
                        await fetch('/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: videoName,
                                data: reader.result
                            })
                        });

                        // Also save poster
                        await fetch('/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: posterName,
                                data: posterDataUrl
                            })
                        });

                        resolve();
                    };
                };

                recorder.start();

                function animate(timestamp) {
                    if (!startTime) startTime = timestamp;
                    const elapsed = timestamp - startTime;
                    const t = elapsed / durationMs; // 0 to 1

                    // Render frame
                    drawFrame(ctx, t, elapsed);

                    // Capture first frame for poster
                    if (elapsed > 100 && !posterDataUrl) {
                        posterDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                    }

                    if (t < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        recorder.stop();
                    }
                }
                requestAnimationFrame(animate);
            });
        }

        async function start() {
            // Load original ship sprites for compositing
            const scoutImgRaw = await loadImage('/scout_ship.png').catch(() => null);
            const tankImgRaw = await loadImage('/tank_ship.png').catch(() => null);
            const engineerImgRaw = await loadImage('/engineer_ship.png').catch(() => null);

            const scoutImg = chromaKeyImage(scoutImgRaw);
            const tankImg = chromaKeyImage(tankImgRaw);
            const engineerImg = chromaKeyImage(engineerImgRaw);

            // 1. SCOUT INTRO
            await recordVideo('scout', (ctx, t, elapsed) => {
                // Starfield
                drawStars(ctx, stars, elapsed, 4);

                ctx.save();
                // Add camera shake/turbulence near the end
                if (t > 0.8) {
                    const shake = (t - 0.8) * 20;
                    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
                }

                // Draw Scout Ship launching from left to right
                // Start X: -200, End X: 2200
                const shipX = -200 + t * 2400;
                const shipY = 540 + Math.sin(t * Math.PI * 2) * 50;
                const size = 300;

                // Engine flame
                ctx.save();
                ctx.shadowColor = '#00ff66';
                ctx.shadowBlur = 40;
                const flameGrad = ctx.createLinearGradient(shipX - 250, shipY, shipX - 50, shipY);
                flameGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
                flameGrad.addColorStop(0.6, '#00ff66');
                flameGrad.addColorStop(1, '#ffffff');
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(shipX - 250, shipY);
                ctx.lineTo(shipX - 100, shipY - 30);
                ctx.lineTo(shipX - 100, shipY + 30);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Draw ship
                if (scoutImg) {
                    ctx.drawImage(scoutImg, shipX - size/2, shipY - size/2, size, size);
                } else {
                    ctx.fillStyle = '#00ff66';
                    ctx.beginPath();
                    ctx.moveTo(shipX - 100, shipY - 60);
                    ctx.lineTo(shipX + 150, shipY);
                    ctx.lineTo(shipX - 100, shipY + 60);
                    ctx.closePath();
                    ctx.fill();
                }

                // Cinematic bezel/grid lines overlay
                ctx.strokeStyle = 'rgba(0, 255, 102, 0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(100, 100);
                ctx.lineTo(1820, 100);
                ctx.lineTo(1820, 980);
                ctx.lineTo(100, 980);
                ctx.closePath();
                ctx.stroke();

                ctx.font = 'bold 24px monospace';
                ctx.fillStyle = '#00ff66';
                ctx.fillText('LAUNCH SEQUENCE: SCOUT CLASS ACTIVE', 120, 140);
                ctx.fillText('SPEED: ' + Math.round(t * 1200) + ' km/s', 120, 180);
                
                ctx.restore();
            }, 5000);

            // 2. TANK INTRO
            await recordVideo('tank', (ctx, t, elapsed) => {
                // Starfield (slower speed)
                drawStars(ctx, stars, elapsed, 1.5);

                ctx.save();
                // Intense heavy shudder at the end
                if (t > 0.75) {
                    const shake = (t - 0.75) * 35;
                    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
                }

                // Draw Tank Ship moving slowly
                const shipX = -200 + t * 2200;
                const shipY = 540 + Math.sin(t * Math.PI) * 20;
                const size = 350;

                // Heavy engine flame
                ctx.save();
                ctx.shadowColor = '#ff9900';
                ctx.shadowBlur = 60;
                const flameGrad = ctx.createLinearGradient(shipX - 300, shipY, shipX - 80, shipY);
                flameGrad.addColorStop(0, 'rgba(255, 51, 0, 0)');
                flameGrad.addColorStop(0.5, '#ff9900');
                flameGrad.addColorStop(1, '#ffffff');
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(shipX - 300, shipY);
                ctx.lineTo(shipX - 120, shipY - 50);
                ctx.lineTo(shipX - 120, shipY + 50);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Draw ship (flipped horizontally so it faces right while launching right)
                if (tankImg) {
                    ctx.save();
                    ctx.translate(shipX, shipY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(tankImg, -size/2, -size/2, size, size);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#ff9900';
                    ctx.fillRect(shipX - 150, shipY - 80, 300, 160);
                }

                // Tech grid lines overlay
                ctx.strokeStyle = 'rgba(255, 183, 0, 0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(100, 100);
                ctx.lineTo(1820, 100);
                ctx.lineTo(1820, 980);
                ctx.lineTo(100, 980);
                ctx.closePath();
                ctx.stroke();

                ctx.font = 'bold 24px monospace';
                ctx.fillStyle = '#ffb700';
                ctx.fillText('LAUNCH SEQUENCE: TANK CLASS ACTIVE', 120, 140);
                ctx.fillText('THRUST CAP: 98% (STEADY)', 120, 180);
                
                ctx.restore();
            }, 5000);

            // 3. ENGINEER INTRO
            await recordVideo('engineer', (ctx, t, elapsed) => {
                // Starfield
                drawStars(ctx, stars, elapsed, 3);

                ctx.save();
                // Sensor arm shaking loose at the end
                if (t > 0.8) {
                    const shake = (t - 0.8) * 18;
                    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
                }

                // Draw Engineer Ship
                const shipX = -200 + t * 2300;
                const shipY = 540 + Math.sin(elapsed * 0.005) * 40;
                const size = 320;

                // Engine flame
                ctx.save();
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 45;
                const flameGrad = ctx.createLinearGradient(shipX - 260, shipY, shipX - 60, shipY);
                flameGrad.addColorStop(0, 'rgba(0, 85, 255, 0)');
                flameGrad.addColorStop(0.6, '#00e5ff');
                flameGrad.addColorStop(1, '#ffffff');
                ctx.fillStyle = flameGrad;
                ctx.beginPath();
                ctx.moveTo(shipX - 260, shipY);
                ctx.lineTo(shipX - 110, shipY - 35);
                ctx.lineTo(shipX - 110, shipY + 35);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Draw ship (flipped horizontally so it faces right while launching right)
                if (engineerImg) {
                    ctx.save();
                    ctx.translate(shipX, shipY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(engineerImg, -size/2, -size/2, size, size);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.arc(shipX, shipY, size/2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Robotic helper dome details
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(shipX, shipY - 140, 15, 0, Math.PI * 2);
                ctx.stroke();

                // Tech grid lines overlay
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(100, 100);
                ctx.lineTo(1820, 100);
                ctx.lineTo(1820, 980);
                ctx.lineTo(100, 980);
                ctx.closePath();
                ctx.stroke();

                ctx.font = 'bold 24px monospace';
                ctx.fillStyle = '#00e5ff';
                ctx.fillText('LAUNCH SEQUENCE: ENGINEER CLASS ACTIVE', 120, 140);
                ctx.fillText('REROUTING DIAGNOSTICS...', 120, 180);
                
                ctx.restore();
            }, 5000);

            // 4. CAVE REVEAL
            await recordVideo('cave-reveal', (ctx, t, elapsed) => {
                // Dark background
                ctx.fillStyle = '#0a0d10';
                ctx.fillRect(0, 0, 1920, 1080);

                ctx.save();
                // Screen shake expanding as cave opens
                if (t > 0.3) {
                    const shake = (t - 0.3) * 22;
                    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
                }

                // Draw central gaping abyss
                const radius = t * 300; // growing abyss
                ctx.save();
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = 80;
                
                // Deep black hole
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.ellipse(960, 540, radius, radius * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Draw glowing cyan cracks/spores
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    const rStart = radius;
                    const rEnd = radius + 200 + Math.sin(elapsed * 0.003 + i) * 50;
                    ctx.moveTo(960 + Math.cos(angle) * rStart, 540 + Math.sin(angle) * rStart * 0.6);
                    ctx.lineTo(960 + Math.cos(angle) * rEnd, 540 + Math.sin(angle) * rEnd * 0.6);
                }
                ctx.stroke();

                // Telemetry text overlay
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(100, 100);
                ctx.lineTo(1820, 100);
                ctx.lineTo(1820, 980);
                ctx.lineTo(100, 980);
                ctx.closePath();
                ctx.stroke();

                ctx.font = 'bold 24px monospace';
                ctx.fillStyle = '#00e5ff';
                ctx.fillText('CRITICAL SIGNAL: ALIEN STRUCTURE DETECTED', 120, 140);
                ctx.fillText('SECTOR DEPTH: ' + Math.round(t * 80) + 'u', 120, 180);
                ctx.restore();
            }, 4000);

            // 5. ACT 3 DEPARTURE
            await recordVideo('act3-departure', (ctx, t, elapsed) => {
                // Starfield (moving fast)
                drawStars(ctx, stars, elapsed, 8);

                ctx.save();
                // Heavy engine turbulence
                const shake = 15 + (1 - t) * 15;
                ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

                // Draw warp tunnel effect expanding from center
                ctx.save();
                ctx.strokeStyle = 'rgba(185, 255, 92, ' + (0.1 + t * 0.4) + ')';
                ctx.lineWidth = 3;
                const centerGrid = 960;
                const centerY = 540;
                for (let i = 0; i < 20; i++) {
                    const angle = (i * Math.PI) / 10;
                    const rStart = t * 100;
                    const rEnd = 1500;
                    ctx.beginPath();
                    ctx.moveTo(centerGrid + Math.cos(angle) * rStart, centerY + Math.sin(angle) * rStart);
                    ctx.lineTo(centerGrid + Math.cos(angle) * rEnd, centerY + Math.sin(angle) * rEnd);
                    ctx.stroke();
                }
                ctx.restore();

                // Draw central ship silhouette flying into the warp tunnel
                const shipScale = 1 - t * 0.85; // shrinking
                const size = 300 * shipScale;
                const shipX = 960;
                const shipY = 540;

                // Draw a stylized vessel silhouette
                ctx.fillStyle = '#000000';
                ctx.save();
                ctx.shadowColor = '#b9ff5c';
                ctx.shadowBlur = 50 * shipScale;
                ctx.beginPath();
                ctx.moveTo(shipX, shipY - size * 0.5);
                ctx.lineTo(shipX + size * 0.4, shipY + size * 0.4);
                ctx.lineTo(shipX, shipY + size * 0.2);
                ctx.lineTo(shipX - size * 0.4, shipY + size * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // HUD overlay
                ctx.strokeStyle = 'rgba(185, 255, 92, 0.2)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(100, 100);
                ctx.lineTo(1820, 100);
                ctx.lineTo(1820, 980);
                ctx.lineTo(100, 980);
                ctx.closePath();
                ctx.stroke();

                ctx.font = 'bold 24px monospace';
                ctx.fillStyle = '#b9ff5c';
                ctx.fillText('VESSEL DEPARTURE: ORBITAL ESCAPE VELOCITY', 120, 140);
                ctx.fillText('ARC PHASE: TRANSIT', 120, 180);
                
                ctx.restore();
            }, 5000);

            status.textContent = 'All cutscenes generated successfully! Shutting down...';
            await fetch('/done', { method: 'POST' });
        }

        window.onload = start;
    </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_CONTENT);
    } else if (req.method === 'GET' && (req.url === '/scout_ship.png' || req.url === '/tank_ship.png' || req.url === '/engineer_ship.png')) {
        const filePath = path.join(process.cwd(), 'public', req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data);
            }
        });
    } else if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                // Can be webm (video/webm) or jpeg (image/jpeg)
                const isWebM = payload.name.endsWith('.webm');
                const header = isWebM ? /^data:video\/webm;base64,/ : /^data:image\/jpeg;base64,/;
                const base64Data = payload.data.replace(header, '');
                
                const filePath = path.join(process.cwd(), 'public', 'cutscenes', payload.name);
                fs.writeFileSync(filePath, base64Data, 'base64');
                console.log(`Saved cutscene: ${filePath}`);
                
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error');
            }
        });
    } else if (req.method === 'POST' && req.url === '/done') {
        console.log('Cutscene generation completed.');
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
    console.log(`Temp server running on http://localhost:${PORT}`);
    
    // Spawn Chrome headlessly to record
    const profileDir = path.join(process.cwd(), 'scratch', 'chrome-profile');
    const browser = spawn('google-chrome', [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--user-data-dir=' + profileDir,
        `http://localhost:${PORT}`
    ], {
        detached: true,
        stdio: 'ignore'
    });
    browser.unref();
});
