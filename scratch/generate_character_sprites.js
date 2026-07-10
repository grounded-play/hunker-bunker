import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 9998;

const HTML_CONTENT = '<!DOCTYPE html>\n' +
'<html>\n' +
'<head>\n' +
'    <title>Sprite Generator</title>\n' +
'    <style>\n' +
'        body { background: #111; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; padding: 20px; }\n' +
'        canvas { border: 1px solid #333; margin: 10px; background: #000; }\n' +
'        #status { font-size: 20px; margin: 20px; color: #00e5ff; }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <div id="status">Generating character sprites...</div>\n' +
'    <div id="container"></div>\n' +
'    <script>\n' +
'        const FRAME_SIZE = 128;\n' +
'        const SHEET_SIZE = FRAME_SIZE * 4;\n' +
'        const CLEAN_GLOW = "#00e5ff";\n' +
'        const LATENT_GLOW = "#66ff99";\n' +
'        const SYMPTOMATIC_GLOW = "#33cc33";\n' +
'        const ASCENDANT_GLOW = "#8CFF96";\n' +
'        const SCOUT_COLOR = "#888899";\n' +
'        const TANK_COLOR = "#556655";\n' +
'        const ENG_COLOR = "#666677";\n' +
'        const NAHL_COLOR = "#d4edda";\n' +
'        const VEY_COLOR = "#20c997";\n' +
'        const RHUN_COLOR = "#198754";\n' +
'        const assets = [\n' +
'            { name: "scout_clean_walk.png", type: "scout", state: "clean" },\n' +
'            { name: "tank_clean_walk.png", type: "tank", state: "clean" },\n' +
'            { name: "engineer_clean_walk.png", type: "engineer", state: "clean" },\n' +
'            { name: "scout_latent_walk.png", type: "scout", state: "latent" },\n' +
'            { name: "tank_latent_walk.png", type: "tank", state: "latent" },\n' +
'            { name: "engineer_latent_walk.png", type: "engineer", state: "latent" },\n' +
'            { name: "scout_symptomatic_walk.png", type: "scout", state: "symptomatic" },\n' +
'            { name: "tank_symptomatic_walk.png", type: "tank", state: "symptomatic" },\n' +
'            { name: "engineer_symptomatic_walk.png", type: "engineer", state: "symptomatic" },\n' +
'            { name: "scout_ascendant_walk.png", type: "scout", state: "ascendant" },\n' +
'            { name: "tank_ascendant_walk.png", type: "tank", state: "ascendant" },\n' +
'            { name: "engineer_ascendant_walk.png", type: "engineer", state: "ascendant" },\n' +
'            { name: "nahl_suture_walk.png", type: "nahl", state: "alien" },\n' +
'            { name: "vey_listener_walk.png", type: "vey", state: "alien" },\n' +
'            { name: "rhun_shield_walk.png", type: "rhun", state: "alien" }\n' +
'        ];\n' +
'        function drawCharacter(ctx, type, state, dir, frame, x, y) {\n' +
'            ctx.save();\n' +
'            ctx.translate(x + FRAME_SIZE/2, y + FRAME_SIZE/2);\n' +
'            const bobY = (frame === 1 || frame === 3) ? -4 : 0;\n' +
'            ctx.translate(0, bobY);\n' +
'            let baseColor, glowColor, width, height;\n' +
'            if (type === "scout") { baseColor = SCOUT_COLOR; width = 20; height = 40; }\n' +
'            else if (type === "tank") { baseColor = TANK_COLOR; width = 36; height = 44; }\n' +
'            else if (type === "engineer") { baseColor = ENG_COLOR; width = 28; height = 40; }\n' +
'            else if (type === "nahl") { baseColor = NAHL_COLOR; width = 24; height = 42; }\n' +
'            else if (type === "vey") { baseColor = VEY_COLOR; width = 20; height = 48; }\n' +
'            else if (type === "rhun") { baseColor = RHUN_COLOR; width = 40; height = 46; }\n' +
'            if (state === "clean") glowColor = CLEAN_GLOW;\n' +
'            else if (state === "latent") glowColor = LATENT_GLOW;\n' +
'            else if (state === "symptomatic") glowColor = SYMPTOMATIC_GLOW;\n' +
'            else if (state === "ascendant") glowColor = ASCENDANT_GLOW;\n' +
'            else glowColor = "#00ff00";\n' +
'            ctx.shadowColor = glowColor;\n' +
'            ctx.shadowBlur = (state === "ascendant" || state === "alien") ? 15 : 5;\n' +
'            ctx.fillStyle = baseColor;\n' +
'            if (state === "symptomatic") { ctx.fillStyle = "#445544"; }\n' +
'            else if (state === "ascendant") { ctx.fillStyle = "#223322"; }\n' +
'            ctx.fillRect(-width/2, -height/2, width, height);\n' +
'            ctx.fillStyle = "#111";\n' +
'            ctx.fillRect(-width/2 + 2, -height/2 - 12, width - 4, 14);\n' +
'            ctx.fillStyle = glowColor;\n' +
'            if (dir === 0) { ctx.fillRect(-width/4, -height/2 - 8, width/2, 4); }\n' +
'            else if (dir === 1) { ctx.fillRect(-width/2, -height/2 - 8, width/4, 4); }\n' +
'            else if (dir === 2) { ctx.fillRect(width/4, -height/2 - 8, width/4, 4); }\n' +
'            if (state === "latent") {\n' +
'                ctx.strokeStyle = glowColor;\n' +
'                ctx.lineWidth = 1;\n' +
'                ctx.beginPath();\n' +
'                ctx.moveTo(-width/2, 0);\n' +
'                ctx.lineTo(0, -height/4);\n' +
'                ctx.stroke();\n' +
'            } else if (state === "symptomatic") {\n' +
'                ctx.fillStyle = glowColor;\n' +
'                ctx.fillRect(-width/2 - 4, -height/4, 8, 12);\n' +
'            } else if (state === "ascendant" || state === "alien") {\n' +
'                ctx.fillStyle = glowColor;\n' +
'                ctx.beginPath();\n' +
'                ctx.arc(0, -height/2 - 16, 6, 0, Math.PI*2);\n' +
'                ctx.fill();\n' +
'                ctx.beginPath();\n' +
'                ctx.moveTo(-width/2 - 8, 0);\n' +
'                ctx.lineTo(-width/2, -8);\n' +
'                ctx.lineTo(-width/2, 8);\n' +
'                ctx.fill();\n' +
'                ctx.beginPath();\n' +
'                ctx.moveTo(width/2 + 8, 0);\n' +
'                ctx.lineTo(width/2, -8);\n' +
'                ctx.lineTo(width/2, 8);\n' +
'                ctx.fill();\n' +
'            }\n' +
'            ctx.fillStyle = "#333";\n' +
'            if (frame === 1) {\n' +
'                ctx.fillRect(-width/2 + 2, height/2, width/2 - 4, 10);\n' +
'                ctx.fillRect(2, height/2, width/2 - 4, 15);\n' +
'            } else if (frame === 3) {\n' +
'                ctx.fillRect(-width/2 + 2, height/2, width/2 - 4, 15);\n' +
'                ctx.fillRect(2, height/2, width/2 - 4, 10);\n' +
'            } else {\n' +
'                ctx.fillRect(-width/2 + 2, height/2, width/2 - 4, 15);\n' +
'                ctx.fillRect(2, height/2, width/2 - 4, 15);\n' +
'            }\n' +
'            ctx.restore();\n' +
'        }\n' +
'        async function start() {\n' +
'            const container = document.getElementById("container");\n' +
'            const status = document.getElementById("status");\n' +
'            for (const asset of assets) {\n' +
'                status.textContent = "Generating " + asset.name + "...";\n' +
'                const canvas = document.createElement("canvas");\n' +
'                canvas.width = SHEET_SIZE;\n' +
'                canvas.height = SHEET_SIZE;\n' +
'                container.appendChild(canvas);\n' +
'                const ctx = canvas.getContext("2d");\n' +
'                ctx.fillStyle = "#000000";\n' +
'                ctx.fillRect(0, 0, SHEET_SIZE, SHEET_SIZE);\n' +
'                for (let dir = 0; dir < 4; dir++) {\n' +
'                    for (let frame = 0; frame < 4; frame++) {\n' +
'                        const x = frame * FRAME_SIZE;\n' +
'                        const y = dir * FRAME_SIZE;\n' +
'                        drawCharacter(ctx, asset.type, asset.state, dir, frame, x, y);\n' +
'                    }\n' +
'                }\n' +
'                const dataUrl = canvas.toDataURL("image/png");\n' +
'                const response = await fetch("/save", {\n' +
'                    method: "POST",\n' +
'                    headers: { "Content-Type": "application/json" },\n' +
'                    body: JSON.stringify({ name: asset.name, data: dataUrl })\n' +
'                });\n' +
'                if (!response.ok) {\n' +
'                    status.textContent = "Error saving " + asset.name;\n' +
'                    status.style.color = "#ff3300";\n' +
'                    return;\n' +
'                }\n' +
'            }\n' +
'            status.textContent = "All character sprites generated successfully! Shutting down...";\n' +
'            await fetch("/done", { method: "POST" });\n' +
'        }\n' +
'        window.onload = start;\n' +
'    </script>\n' +
'</body>\n' +
'</html>';

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(HTML_CONTENT);
    } else if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const base64Data = payload.data.replace(/^data:image\/png;base64,/, '');
                const filePath = path.join(process.cwd(), 'public', payload.name);
                fs.writeFileSync(filePath, base64Data, 'base64');
                console.log('Saved: ' + filePath);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error');
            }
        });
    } else if (req.method === 'POST' && req.url === '/done') {
        console.log('Generation completed.');
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
    console.log('Temp server running on http://localhost:' + PORT);
    const browser = spawn('firefox', ['--headless', 'http://localhost:' + PORT], {
        detached: true,
        stdio: 'ignore'
    });
    browser.unref();
});
