import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 9999;

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
    <title>Asset Generator</title>
    <style>
        body {
            background: #111;
            color: #fff;
            font-family: monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
        }
        canvas {
            border: 1px solid #333;
            margin: 10px;
            background: #000;
        }
        #status {
            font-size: 20px;
            margin: 20px;
            color: #00e5ff;
        }
    </style>
</head>
<body>
    <div id="status">Generating assets...</div>
    <div id="container"></div>

    <script>
        const assets = [
            { name: 'scout_ship.png', draw: drawScoutShip },
            { name: 'tank_ship.png', draw: drawTankShip },
            { name: 'engineer_ship.png', draw: drawEngineerShip },
            { name: 'ship_wreckage.png', draw: drawShipWreckage },
            { name: 'module_o2_generator.png', draw: drawO2Generator },
            { name: 'module_hull_matrix.png', draw: drawHullMatrix },
            { name: 'module_radar_dish.png', draw: drawRadarDish },
            { name: 'module_reactor_compressor.png', draw: drawReactorCompressor }
        ];

        // helper to draw common glowing lines
        function drawGlowLine(ctx, x1, y1, x2, y2, color, blur) {
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = blur;
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
        }

        function drawScoutShip(ctx) {
            // 1. Solid Black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            // 2. Thruster flames (Green-cyan gradient)
            const flameGrad = ctx.createLinearGradient(512, 700, 512, 920);
            flameGrad.addColorStop(0, '#ffffff');
            flameGrad.addColorStop(0.2, '#00ff66');
            flameGrad.addColorStop(0.6, '#00e5ff');
            flameGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');

            ctx.save();
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 40;
            ctx.fillStyle = flameGrad;
            
            // Left flame
            ctx.beginPath();
            ctx.moveTo(430, 700);
            ctx.quadraticCurveTo(430, 850, 420, 920);
            ctx.quadraticCurveTo(450, 850, 460, 700);
            ctx.fill();

            // Right flame
            ctx.beginPath();
            ctx.moveTo(564, 700);
            ctx.quadraticCurveTo(564, 850, 554, 920);
            ctx.quadraticCurveTo(584, 850, 594, 700);
            ctx.fill();
            ctx.restore();

            // 3. Scout Main Body (Sleek Delta Wing)
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 30;

            const shipGrad = ctx.createLinearGradient(512, 200, 512, 750);
            shipGrad.addColorStop(0, '#2c3539');
            shipGrad.addColorStop(0.5, '#1a1f21');
            shipGrad.addColorStop(1, '#0d1011');

            ctx.fillStyle = shipGrad;
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 5;

            ctx.beginPath();
            ctx.moveTo(512, 180); // Nose
            ctx.lineTo(760, 730); // Right wingtip
            ctx.lineTo(600, 700); // Inner wing joint right
            ctx.lineTo(512, 750); // Tail center
            ctx.lineTo(424, 700); // Inner wing joint left
            ctx.lineTo(264, 730); // Left wingtip
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cockpit Canopy (Bright glowing green neon)
            const canopyGrad = ctx.createRadialGradient(512, 450, 5, 512, 450, 60);
            canopyGrad.addColorStop(0, '#ffffff');
            canopyGrad.addColorStop(0.4, '#33ff77');
            canopyGrad.addColorStop(1, '#009933');
            
            ctx.fillStyle = canopyGrad;
            ctx.beginPath();
            ctx.ellipse(512, 450, 40, 80, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Detail Lines & Cyber Decals
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 3;
            // Left wing detail
            ctx.beginPath();
            ctx.moveTo(420, 600);
            ctx.lineTo(320, 700);
            ctx.stroke();
            // Right wing detail
            ctx.beginPath();
            ctx.moveTo(604, 600);
            ctx.lineTo(704, 700);
            ctx.stroke();
        }

        function drawTankShip(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            // Flames (Orange-yellow gradient)
            const flameGrad = ctx.createLinearGradient(512, 720, 512, 950);
            flameGrad.addColorStop(0, '#ffffff');
            flameGrad.addColorStop(0.3, '#ff9900');
            flameGrad.addColorStop(0.7, '#ff3300');
            flameGrad.addColorStop(1, 'rgba(255, 51, 0, 0)');

            ctx.save();
            ctx.shadowColor = '#ff9900';
            ctx.shadowBlur = 50;
            ctx.fillStyle = flameGrad;

            // Center massive flame
            ctx.beginPath();
            ctx.moveTo(470, 750);
            ctx.quadraticCurveTo(512, 920, 512, 970);
            ctx.quadraticCurveTo(512, 920, 554, 750);
            ctx.fill();

            // Left secondary flame
            ctx.beginPath();
            ctx.moveTo(370, 740);
            ctx.quadraticCurveTo(360, 880, 350, 930);
            ctx.quadraticCurveTo(390, 880, 400, 740);
            ctx.fill();

            // Right secondary flame
            ctx.beginPath();
            ctx.moveTo(624, 740);
            ctx.quadraticCurveTo(634, 880, 644, 930);
            ctx.quadraticCurveTo(604, 880, 594, 740);
            ctx.fill();
            ctx.restore();

            // Heavy Tank Body (Chunky, Hexagonal)
            ctx.shadowColor = '#ffb700';
            ctx.shadowBlur = 35;
            ctx.strokeStyle = '#ffb700';
            ctx.lineWidth = 6;

            const shipGrad = ctx.createLinearGradient(512, 150, 512, 800);
            shipGrad.addColorStop(0, '#3e3e3e');
            shipGrad.addColorStop(0.5, '#222222');
            shipGrad.addColorStop(1, '#111111');
            ctx.fillStyle = shipGrad;

            ctx.beginPath();
            ctx.moveTo(512, 140); // Front nose
            ctx.lineTo(740, 300); // Right forward shoulder
            ctx.lineTo(820, 680); // Right wide armor panel
            ctx.lineTo(660, 780); // Right rear corner
            ctx.lineTo(364, 780); // Left rear corner
            ctx.lineTo(204, 680); // Left wide armor panel
            ctx.lineTo(284, 300); // Left forward shoulder
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Plating divisions / Tech grids
            ctx.strokeStyle = 'rgba(255, 183, 0, 0.4)';
            ctx.lineWidth = 3;
            // Center division
            ctx.beginPath();
            ctx.moveTo(512, 140);
            ctx.lineTo(512, 780);
            ctx.stroke();

            // Horizontal plates
            for (let y = 300; y <= 700; y += 130) {
                ctx.beginPath();
                ctx.moveTo(300, y);
                ctx.lineTo(724, y);
                ctx.stroke();
            }

            // Hazard warning decals
            ctx.fillStyle = '#ffb700';
            ctx.beginPath();
            ctx.moveTo(480, 200);
            ctx.lineTo(500, 200);
            ctx.lineTo(460, 260);
            ctx.lineTo(440, 260);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(544, 200);
            ctx.lineTo(524, 200);
            ctx.lineTo(564, 260);
            ctx.lineTo(584, 260);
            ctx.fill();

            // Glowing Amber Cockpit slot
            ctx.save();
            ctx.shadowColor = '#ffb700';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffb700';
            ctx.fillRect(432, 340, 160, 15);
            ctx.restore();
        }

        function drawEngineerShip(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            // Blue thruster flame
            const flameGrad = ctx.createLinearGradient(512, 720, 512, 940);
            flameGrad.addColorStop(0, '#ffffff');
            flameGrad.addColorStop(0.3, '#00e5ff');
            flameGrad.addColorStop(0.8, '#0055ff');
            flameGrad.addColorStop(1, 'rgba(0, 85, 255, 0)');

            ctx.save();
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 40;
            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.moveTo(460, 720);
            ctx.quadraticCurveTo(512, 880, 512, 950);
            ctx.quadraticCurveTo(512, 880, 564, 720);
            ctx.fill();
            ctx.restore();

            // Solar panel arrays (asymmetrical, left side)
            ctx.save();
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 25;
            ctx.fillStyle = '#0a1d2e';
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 4;
            // Solar wing frame
            ctx.beginPath();
            ctx.rect(140, 360, 220, 300);
            ctx.fill();
            ctx.stroke();

            // Solar grids
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
            ctx.lineWidth = 2;
            for (let x = 160; x < 360; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 360);
                ctx.lineTo(x, 660);
                ctx.stroke();
            }
            for (let y = 390; y < 660; y += 30) {
                ctx.beginPath();
                ctx.moveTo(140, y);
                ctx.lineTo(360, y);
                ctx.stroke();
            }
            ctx.restore();

            // Asymmetrical robotic manipulator claw (right side)
            ctx.save();
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(600, 550);
            ctx.lineTo(760, 510);
            ctx.lineTo(840, 620);
            ctx.stroke();

            // Glowing welding spark at claw tip
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 35;
            const sparkGrad = ctx.createRadialGradient(840, 620, 2, 840, 620, 30);
            sparkGrad.addColorStop(0, '#ffffff');
            sparkGrad.addColorStop(0.5, '#00e5ff');
            sparkGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
            ctx.fillStyle = sparkGrad;
            ctx.beginPath();
            ctx.arc(840, 620, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Main central ship fuselage
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 5;

            const shipGrad = ctx.createLinearGradient(512, 200, 512, 750);
            shipGrad.addColorStop(0, '#4f5d65');
            shipGrad.addColorStop(0.5, '#2e3a40');
            shipGrad.addColorStop(1, '#1b2326');
            ctx.fillStyle = shipGrad;

            ctx.beginPath();
            ctx.moveTo(512, 190); // Nose
            ctx.lineTo(640, 320); // Right forward hull
            ctx.lineTo(600, 720); // Right engine bay
            ctx.lineTo(424, 720); // Left engine bay
            ctx.lineTo(384, 320); // Left forward hull
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Circular rotating radar dome on top
            const domeGrad = ctx.createRadialGradient(512, 280, 5, 512, 280, 45);
            domeGrad.addColorStop(0, '#ffffff');
            domeGrad.addColorStop(0.4, '#00e5ff');
            domeGrad.addColorStop(1, '#004466');
            ctx.fillStyle = domeGrad;
            ctx.beginPath();
            ctx.arc(512, 280, 45, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        function drawShipWreckage(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            // Smoke clouds (Radial gradients)
            ctx.fillStyle = 'rgba(30, 30, 30, 0.4)';
            for (let i = 0; i < 6; i++) {
                const sx = 300 + Math.random() * 400;
                const sy = 300 + Math.random() * 400;
                const rad = 80 + Math.random() * 100;
                const smokeGrad = ctx.createRadialGradient(sx, sy, 10, sx, sy, rad);
                smokeGrad.addColorStop(0, 'rgba(50,50,50,0.6)');
                smokeGrad.addColorStop(0.5, 'rgba(25,25,25,0.3)');
                smokeGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = smokeGrad;
                ctx.beginPath();
                ctx.arc(sx, sy, rad, 0, Math.PI * 2);
                ctx.fill();
            }

            // Fire sparks (glowing red-orange circles)
            ctx.save();
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 25;
            ctx.fillStyle = '#ff6600';
            for (let i = 0; i < 15; i++) {
                const px = 250 + Math.random() * 524;
                const py = 350 + Math.random() * 400;
                const size = 3 + Math.random() * 6;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Fractured Left Wreckage segment
            ctx.save();
            ctx.shadowColor = '#555';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 5;
            ctx.fillStyle = '#1c1f21';

            ctx.beginPath();
            ctx.moveTo(250, 650);
            ctx.lineTo(420, 380);
            ctx.lineTo(480, 520); // Jagged crack line
            ctx.lineTo(440, 580);
            ctx.lineTo(470, 680);
            ctx.lineTo(310, 720);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Fractured Right Wreckage segment
            ctx.save();
            ctx.shadowColor = '#444';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#383b3d';
            ctx.lineWidth = 5;
            ctx.fillStyle = '#151718';

            ctx.beginPath();
            ctx.moveTo(560, 480); // Cracked start
            ctx.lineTo(740, 430);
            ctx.lineTo(780, 650);
            ctx.lineTo(600, 700);
            ctx.lineTo(540, 580);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Exposed glowing wiring harness & sparks (electric blue/cyan arcs)
            ctx.save();
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(450, 550);
            ctx.lineTo(470, 570);
            ctx.lineTo(460, 590);
            ctx.lineTo(490, 620);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(530, 520);
            ctx.lineTo(550, 550);
            ctx.lineTo(540, 570);
            ctx.stroke();
            ctx.restore();
        }

        function drawO2Generator(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512;
            const by = 860; // Base Y

            // 1. Steel Circular Base Plate
            ctx.save();
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 6;
            const baseGrad = ctx.createLinearGradient(cx - 200, by, cx + 200, by + 40);
            baseGrad.addColorStop(0, '#2c3539');
            baseGrad.addColorStop(0.5, '#4f5d65');
            baseGrad.addColorStop(1, '#1b2326');
            ctx.fillStyle = baseGrad;
            
            ctx.beginPath();
            ctx.ellipse(cx, by, 200, 50, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // 2. Glowing Cyan O2 tank / central cylinder
            ctx.save();
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 40;
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 5;
            
            const cylinderGrad = ctx.createLinearGradient(cx - 80, 0, cx + 80, 0);
            cylinderGrad.addColorStop(0, '#004466');
            cylinderGrad.addColorStop(0.3, '#00e5ff');
            cylinderGrad.addColorStop(0.7, '#00e5ff');
            cylinderGrad.addColorStop(1, '#004466');
            ctx.fillStyle = cylinderGrad;

            // Glass Cylinder
            ctx.beginPath();
            ctx.rect(cx - 80, 320, 160, 480);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Inner bubbles / plasma lines
            ctx.fillStyle = '#ffffff';
            ctx.save();
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            for (let i = 0; i < 12; i++) {
                const bx = cx - 60 + Math.random() * 120;
                const by_bubble = 340 + Math.random() * 440;
                const rad = 4 + Math.random() * 8;
                ctx.beginPath();
                ctx.arc(bx, by_bubble, rad, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // 3. Cylinder Metal Caps and Support struts
            ctx.fillStyle = '#2c3539';
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 4;
            
            // Top cap
            ctx.beginPath();
            ctx.ellipse(cx, 320, 90, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Bottom cap
            ctx.beginPath();
            ctx.ellipse(cx, 800, 90, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 4. Glowing Blue piping
            ctx.save();
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 8;
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 20;

            // Left loop pipe
            ctx.beginPath();
            ctx.moveTo(cx - 80, 400);
            ctx.bezierCurveTo(cx - 220, 400, cx - 220, 780, cx - 90, 780);
            ctx.stroke();

            // Right loop pipe
            ctx.beginPath();
            ctx.moveTo(cx + 80, 400);
            ctx.bezierCurveTo(cx + 220, 400, cx + 220, 780, cx + 90, 780);
            ctx.stroke();
            ctx.restore();
        }

        function drawHullMatrix(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512;
            const by = 860;

            // Heavy base pedestal
            ctx.save();
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 6;
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.moveTo(cx - 220, by);
            ctx.lineTo(cx - 160, by - 120);
            ctx.lineTo(cx + 160, by - 120);
            ctx.lineTo(cx + 220, by);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Outer Shield projector brackets (Left & Right claws)
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            // Left Bracket
            ctx.beginPath();
            ctx.moveTo(cx - 150, by - 120);
            ctx.lineTo(cx - 190, by - 380);
            ctx.lineTo(cx - 110, by - 520);
            ctx.stroke();

            // Right Bracket
            ctx.beginPath();
            ctx.moveTo(cx + 150, by - 120);
            ctx.lineTo(cx + 190, by - 380);
            ctx.lineTo(cx + 110, by - 520);
            ctx.stroke();

            // Central Glowing Forcefield Emitter Orb
            ctx.save();
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 50;
            const orbGrad = ctx.createRadialGradient(cx, 460, 10, cx, 460, 120);
            orbGrad.addColorStop(0, '#ffffff');
            orbGrad.addColorStop(0.3, '#ffcc00');
            orbGrad.addColorStop(0.7, '#ff4400');
            orbGrad.addColorStop(1, 'rgba(255, 68, 0, 0)');
            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(cx, 460, 120, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Hexagonal Matrix Hologram overlay
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 102, 0, 0.85)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 15;
            
            // Draw a few matrix grid lines
            for (let r = 30; r <= 110; r += 40) {
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                    const hx = cx + Math.cos(a) * r;
                    const hy = 460 + Math.sin(a) * r;
                    if (a === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawRadarDish(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512;
            const by = 860;

            // Pedestal & rotating mounting fork
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 8;
            ctx.fillStyle = '#1c1f21';
            ctx.beginPath();
            ctx.rect(cx - 60, by - 160, 120, 160);
            ctx.fill();
            ctx.stroke();

            // Mount Fork arms
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(cx - 50, by - 160);
            ctx.lineTo(cx - 100, by - 320);
            ctx.moveTo(cx + 50, by - 160);
            ctx.lineTo(cx + 100, by - 320);
            ctx.stroke();

            // Large Dish structure (parabolic dish, tilted slightly)
            ctx.save();
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 4;
            ctx.fillStyle = 'rgba(0, 40, 20, 0.6)';

            ctx.beginPath();
            ctx.ellipse(cx, by - 340, 260, 100, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Dish grid lines
            ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
            ctx.lineWidth = 2;
            for (let r = 50; r < 260; r += 50) {
                ctx.beginPath();
                ctx.ellipse(cx, by - 340, r, r * (100/260), -0.15, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Radiating spokes
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                ctx.beginPath();
                ctx.moveTo(cx, by - 340);
                ctx.lineTo(cx + Math.cos(a) * 260, by - 340 + Math.sin(a) * 100);
                ctx.stroke();
            }
            ctx.restore();

            // Center feed horn and glowing green emitter tip
            ctx.save();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(cx, by - 340);
            ctx.lineTo(cx - 30, by - 480);
            ctx.stroke();

            // Emitter Glow
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 35;
            const signalGrad = ctx.createRadialGradient(cx - 30, by - 480, 2, cx - 30, by - 480, 30);
            signalGrad.addColorStop(0, '#ffffff');
            signalGrad.addColorStop(0.5, '#00ff66');
            signalGrad.addColorStop(1, 'rgba(0, 255, 102, 0)');
            ctx.fillStyle = signalGrad;
            ctx.beginPath();
            ctx.arc(cx - 30, by - 480, 30, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing green signal wave arcs
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 5;
            for (let w = 60; w <= 140; w += 40) {
                ctx.beginPath();
                ctx.arc(cx - 30, by - 480, w, -Math.PI * 0.9, -Math.PI * 0.4);
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawReactorCompressor(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512;
            const cy = 480;

            // Reactor pedestal bottom
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.rect(cx - 100, 800, 200, 80);
            ctx.fill();
            ctx.stroke();

            // Heavy columns leading to reactor sphere
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 16;
            ctx.beginPath();
            ctx.moveTo(cx - 80, 800);
            ctx.lineTo(cx - 80, cy + 180);
            ctx.moveTo(cx + 80, 800);
            ctx.lineTo(cx + 80, cy + 180);
            ctx.stroke();

            // Glowing Purple magnetic coils (Concentric rings)
            ctx.save();
            ctx.shadowColor = '#cc00ff';
            ctx.shadowBlur = 45;
            ctx.strokeStyle = '#cc00ff';
            ctx.lineWidth = 8;
            
            // Draw ring 1
            ctx.beginPath();
            ctx.ellipse(cx, cy, 210, 80, 0.4, 0, Math.PI * 2);
            ctx.stroke();

            // Draw ring 2
            ctx.beginPath();
            ctx.ellipse(cx, cy, 210, 80, -0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Central containment sphere
            ctx.save();
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 50;
            const plasmaGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120);
            plasmaGrad.addColorStop(0, '#ffffff');
            plasmaGrad.addColorStop(0.3, '#00ffff');
            plasmaGrad.addColorStop(0.7, '#9900ff');
            plasmaGrad.addColorStop(1, 'rgba(153, 0, 255, 0)');
            ctx.fillStyle = plasmaGrad;
            
            ctx.beginPath();
            ctx.arc(cx, cy, 120, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Electric discharge sparks inside
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                let px = cx;
                let py = cy;
                ctx.moveTo(px, py);
                for (let j = 0; j < 5; j++) {
                    px += (Math.random() - 0.5) * 60;
                    py += (Math.random() - 0.5) * 60;
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();
            ctx.restore();
        }

        async function start() {
            const container = document.getElementById('container');
            const status = document.getElementById('status');

            for (const asset of assets) {
                status.textContent = 'Generating ' + asset.name + '...';
                
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 1024;
                container.appendChild(canvas);
                
                const ctx = canvas.getContext('2d');
                asset.draw(ctx);

                // Export to PNG/JPEG Base64 and upload to local server
                const dataUrl = canvas.toDataURL('image/png');
                
                const response = await fetch('/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: asset.name, data: dataUrl })
                });
                
                if (!response.ok) {
                    status.textContent = 'Error saving ' + asset.name;
                    status.style.color = '#ff3300';
                    return;
                }
            }

            status.textContent = 'All assets generated successfully! Shutting down...';
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
    } else if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const base64Data = payload.data.replace(/^data:image\/png;base64,/, '');
                const filePath = path.join(process.cwd(), 'public', payload.name);
                fs.writeFileSync(filePath, base64Data, 'base64');
                console.log(`Saved: ${filePath}`);
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
    console.log(`Temp server running on http://localhost:${PORT}`);
    
    // Spawn browser to render canvases headlessly
    const browser = spawn('firefox', ['--headless', `http://localhost:${PORT}`], {
        detached: true,
        stdio: 'ignore'
    });
    browser.unref();
});
