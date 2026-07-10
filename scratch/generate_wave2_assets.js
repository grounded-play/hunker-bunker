import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 9997;

const HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
    <title>Wave 2 Asset Generator</title>
    <style>
        body { background: #111; color: #fff; font-family: monospace; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        canvas { border: 1px solid #333; margin: 10px; background: #000; }
        #status { font-size: 20px; margin: 20px; color: #00e5ff; }
    </style>
</head>
<body>
    <div id="status">Generating Wave 2 Assets...</div>
    <div id="container"></div>

    <script>
        const assets = [
            // ── BATCH 1: CAMP PROPS ──
            { name: 'prop_camp_cookfire_lit.png', draw: drawCookfireLit },
            { name: 'prop_camp_cookfire_doused.png', draw: drawCookfireDoused },
            { name: 'prop_camp_laundry.png', draw: drawLaundry },
            { name: 'prop_camp_bedrolls.png', draw: drawBedrolls },
            { name: 'prop_camp_crates.png', draw: drawCrates },
            { name: 'prop_camp_crates_chained.png', draw: drawCratesChained },
            { name: 'prop_camp_shutter_lockdown.png', draw: drawShutterLockdown },
            { name: 'prop_camp_warning_placard.png', draw: drawWarningPlacard },
            { name: 'prop_camp_grave_fresh.png', draw: drawGraveFresh },
            { name: 'prop_camp_grave_old.png', draw: drawGraveOld },
            { name: 'prop_camp_sandbags.png', draw: drawSandbags },

            // ── BATCH 2: CAVE PROPS ──
            { name: 'prop_cave_eggs_intact.png', draw: drawEggsIntact },
            { name: 'prop_cave_eggs_hatched.png', draw: drawEggsHatched },
            { name: 'prop_cave_spores.png', draw: drawSpores },
            { name: 'prop_cave_webs.png', draw: drawWebs },
            { name: 'prop_cave_lichen.png', draw: drawLichen },
            { name: 'prop_cave_hive_wounded.png', draw: drawHiveWounded },
            { name: 'prop_cave_bones.png', draw: drawBones },

            // ── BATCH 4: ACHIEVEMENT ICONS ──
            { name: 'ach_hunkered.png', draw: (ctx) => drawAchGlyph(ctx, "⏳", "past 20 minutes") },
            { name: 'ach_victory_scout.png', draw: (ctx) => drawAchGlyph(ctx, "🏹", "scout's honor") },
            { name: 'ach_victory_tank.png', draw: (ctx) => drawAchGlyph(ctx, "🛡️", "tank commander") },
            { name: 'ach_victory_engineer.png', draw: (ctx) => drawAchGlyph(ctx, "🔧", "chief engineer") },
            { name: 'ach_ending_full_brood.png', draw: (ctx) => drawAchGlyph(ctx, "👑", "full brood") },
            { name: 'ach_ending_clean_escape.png', draw: (ctx) => drawAchGlyph(ctx, "🚀", "clean escape") },
            { name: 'ach_ending_mixed_crew.png', draw: (ctx) => drawAchGlyph(ctx, "🤝", "mixed crew") },
            { name: 'ach_ending_carriers_bargain.png', draw: (ctx) => drawAchGlyph(ctx, "💼", "carriers bargain") },
            { name: 'ach_ending_scorched_sky.png', draw: (ctx) => drawAchGlyph(ctx, "🔥", "scorched sky") },
            { name: 'ach_ending_mothership_infection.png', draw: (ctx) => drawAchGlyph(ctx, "🛸", "mothership") },
            { name: 'ach_ending_alien_exodus.png', draw: (ctx) => drawAchGlyph(ctx, "🍃", "alien exodus") },
            { name: 'ach_ending_outed_escape.png', draw: (ctx) => drawAchGlyph(ctx, "📢", "outed escape") },
            { name: 'ach_ending_failed_carrier.png', draw: (ctx) => drawAchGlyph(ctx, "⚠️", "failed carrier") },
            { name: 'ach_ending_empty_husk.png', draw: (ctx) => drawAchGlyph(ctx, "❄️", "empty husk") },
            { name: 'ach_cartographer.png', draw: (ctx) => drawAchGlyph(ctx, "🗺️", "cartographer") },
            { name: 'ach_archivist.png', draw: (ctx) => drawAchGlyph(ctx, "📚", "archivist") },
            { name: 'ach_kin.png', draw: (ctx) => drawAchGlyph(ctx, "💞", "kin max bond") },
            { name: 'ach_ghost.png', draw: (ctx) => drawAchGlyph(ctx, "👻", "ghost run") },
            { name: 'ach_hardened.png', draw: (ctx) => drawAchGlyph(ctx, "💀", "hardened survivor") },
            { name: 'ach_slay_the_queen.png', draw: (ctx) => drawAchGlyph(ctx, "⚔️", "slay the queen") }
        ];

        // helper to draw shadows
        function setupGlow(ctx, color, blur) {
            ctx.shadowColor = color;
            ctx.shadowBlur = blur;
        }

        function clearGlow(ctx) {
            ctx.shadowBlur = 0;
        }

        // BATCH 1: CAMP PROPS DRAWING
        function drawCookfireLit(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            // Stone circle
            ctx.fillStyle = '#444';
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * 120, cy + Math.sin(a) * 60, 35, 0, Math.PI * 2);
                ctx.fill();
            }
            // Logs
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(cx - 100, cy - 20, 200, 40);
            ctx.fillRect(cx - 20, cy - 100, 40, 200);

            // Glowing Fire
            setupGlow(ctx, '#ff5a2a', 60);
            const fireGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140);
            fireGrad.addColorStop(0, '#ffffff');
            fireGrad.addColorStop(0.3, '#ffb700');
            fireGrad.addColorStop(0.7, '#ff3300');
            fireGrad.addColorStop(1, 'rgba(255, 51, 0, 0)');
            ctx.fillStyle = fireGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 40, 100, 150, 0, 0, Math.PI * 2);
            ctx.fill();
            clearGlow(ctx);
        }

        function drawCookfireDoused(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            // Stone circle
            ctx.fillStyle = '#222';
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * 120, cy + Math.sin(a) * 60, 35, 0, Math.PI * 2);
                ctx.fill();
            }
            // Ash pile
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 90, 45, 0, 0, Math.PI * 2);
            ctx.fill();
            // Logs charred
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 100, cy - 20, 200, 40);
            ctx.fillRect(cx - 20, cy - 100, 40, 200);
        }

        function drawLaundry(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            // Two support poles
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(200, 800);
            ctx.lineTo(200, 300);
            ctx.moveTo(824, 800);
            ctx.lineTo(824, 300);
            ctx.stroke();

            // Rope
            ctx.strokeStyle = '#bcaaa4';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(200, 340);
            ctx.quadraticCurveTo(512, 480, 824, 340);
            ctx.stroke();

            // Hanging clothes
            const clothes = [
                { x: 300, y: 410, c: '#00e5ff' },
                { x: 440, y: 440, c: '#b4ff32' },
                { x: 580, y: 440, c: '#ff9f1c' },
                { x: 710, y: 400, c: '#94a3b8' }
            ];
            for (const item of clothes) {
                ctx.fillStyle = item.c;
                ctx.fillRect(item.x, item.y, 80, 120);
                // clothes hanger lines
                ctx.fillStyle = '#222';
                ctx.fillRect(item.x + 10, item.y - 10, 5, 10);
                ctx.fillRect(item.x + 65, item.y - 10, 5, 10);
            }
        }

        function drawBedrolls(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            // Draw three rolls stacked
            ctx.fillStyle = '#5d4037';
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 6;

            // Roll 1 (bottom left)
            ctx.beginPath();
            ctx.ellipse(cx - 120, cy + 40, 140, 70, 0.1, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            // Roll 2 (bottom right)
            ctx.beginPath();
            ctx.ellipse(cx + 120, cy + 40, 140, 70, -0.1, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            // Roll 3 (top center)
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 40, 140, 70, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        function drawCrates(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 6;

            // Bottom left crate
            ctx.fillStyle = '#5c4033';
            ctx.fillRect(cx - 240, cy, 220, 220);
            ctx.strokeRect(cx - 240, cy, 220, 220);

            // Bottom right crate
            ctx.fillStyle = '#4f372d';
            ctx.fillRect(cx + 20, cy, 220, 220);
            ctx.strokeRect(cx + 20, cy, 220, 220);

            // Top crate
            ctx.fillStyle = '#7c5844';
            ctx.fillRect(cx - 110, cy - 240, 220, 220);
            ctx.strokeRect(cx - 110, cy - 240, 220, 220);
        }

        function drawCratesChained(ctx) {
            drawCrates(ctx);
            const cx = 512, cy = 600;

            // Draw chains wrapping around
            ctx.strokeStyle = '#b0bec5';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(cx - 200, cy + 220);
            ctx.lineTo(cx + 200, cy - 200);
            ctx.moveTo(cx - 200, cy - 200);
            ctx.lineTo(cx + 200, cy + 220);
            ctx.stroke();
            clearGlow(ctx);
        }

        function drawShutterLockdown(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 512;
            // Shutter Frame
            ctx.fillStyle = '#37474f';
            ctx.strokeStyle = '#ff3300';
            ctx.lineWidth = 12;
            setupGlow(ctx, '#ff3300', 15);
            ctx.beginPath();
            ctx.rect(cx - 200, cy - 300, 400, 600);
            ctx.fill();
            ctx.stroke();

            // Metal bars horizontally
            ctx.fillStyle = '#263238';
            ctx.strokeStyle = '#37474f';
            ctx.lineWidth = 4;
            for (let y = cy - 240; y < cy + 300; y += 80) {
                ctx.fillRect(cx - 180, y, 360, 40);
                ctx.strokeRect(cx - 180, y, 360, 40);
            }

            // Yellow/Black stripes warning tape (shape/pattern redundancy for colorblindness!)
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffeb3b';
            ctx.lineWidth = 16;
            ctx.beginPath();
            ctx.moveTo(cx - 200, cy - 300);
            ctx.lineTo(cx + 200, cy + 300);
            ctx.moveTo(cx - 200, cy + 300);
            ctx.lineTo(cx + 200, cy - 300);
            ctx.stroke();
            ctx.restore();
            clearGlow(ctx);
        }

        function drawWarningPlacard(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 512;
            // Diamond Warning placard (distinct shape)
            ctx.fillStyle = '#ff9100';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 10;
            setupGlow(ctx, '#ff9100', 25);
            ctx.beginPath();
            ctx.moveTo(cx, cy - 300);
            ctx.lineTo(cx + 300, cy);
            ctx.lineTo(cx, cy + 300);
            ctx.lineTo(cx - 300, cy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            clearGlow(ctx);

            // Black inner border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 260);
            ctx.lineTo(cx + 260, cy);
            ctx.lineTo(cx, cy + 260);
            ctx.lineTo(cx - 260, cy);
            ctx.closePath();
            ctx.stroke();

            // Exclamation mark glyph
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 25, cy - 140, 50, 180);
            ctx.beginPath();
            ctx.arc(cx, cy + 120, 32, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawGraveFresh(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 700;
            // Soil mound
            ctx.fillStyle = '#4e342e';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 250, 90, 0, 0, Math.PI * 2);
            ctx.fill();

            // Wooden cross
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(cx - 15, cy - 400, 30, 380); // vertical
            ctx.fillRect(cx - 120, cy - 300, 240, 30); // horizontal
        }

        function drawGraveOld(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 700;
            // Old mound
            ctx.fillStyle = '#37474f';
            ctx.beginPath();
            ctx.ellipse(cx, cy, 240, 80, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stone headstone tilted
            ctx.save();
            ctx.translate(cx, cy - 60);
            ctx.rotate(0.15);
            ctx.fillStyle = '#455a64';
            ctx.strokeStyle = '#263238';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(-100, 120);
            ctx.lineTo(-100, -140);
            ctx.quadraticCurveTo(0, -220, 100, -140);
            ctx.lineTo(100, 120);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // R.I.P engraving
            ctx.fillStyle = '#1a2327';
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("R. I. P.", 0, -40);
            ctx.restore();
        }

        function drawSandbags(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            ctx.fillStyle = '#cfd8dc';
            ctx.strokeStyle = '#90a4ae';
            ctx.lineWidth = 5;

            // Draw sandbags stacked in rows
            // Row 1 (bottom)
            for (let x = cx - 280; x <= cx + 180; x += 100) {
                ctx.beginPath();
                ctx.roundRect(x, cy + 60, 120, 60, 15);
                ctx.fill(); ctx.stroke();
            }
            // Row 2
            ctx.fillStyle = '#b0bec5';
            for (let x = cx - 230; x <= cx + 130; x += 100) {
                ctx.beginPath();
                ctx.roundRect(x, cy, 120, 60, 15);
                ctx.fill(); ctx.stroke();
            }
            // Row 3 (top)
            ctx.fillStyle = '#90a4ae';
            for (let x = cx - 180; x <= cx + 80; x += 100) {
                ctx.beginPath();
                ctx.roundRect(x, cy - 60, 120, 60, 15);
                ctx.fill(); ctx.stroke();
            }
        }


        // BATCH 2: CAVE PROPS DRAWING
        function drawEggsIntact(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            setupGlow(ctx, '#00ff66', 30);
            
            // Intact alien egg cluster
            ctx.fillStyle = '#1b5e20';
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 6;

            const eggs = [
                { x: cx - 80, y: cy + 40, r: 90 },
                { x: cx + 80, y: cy + 40, r: 90 },
                { x: cx, y: cy - 60, r: 100 }
            ];

            for (const egg of eggs) {
                ctx.beginPath();
                ctx.ellipse(egg.x, egg.y, egg.r * 0.75, egg.r, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // glowing core lines
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(egg.x, egg.y, egg.r * 0.25, egg.r * 0.5, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = '#00ff66';
                ctx.lineWidth = 6;
            }
            clearGlow(ctx);
        }

        function drawEggsHatched(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            // Hatched / broken alien egg cluster
            ctx.fillStyle = '#0a3a10';
            ctx.strokeStyle = '#009933';
            ctx.lineWidth = 6;

            // Broken shapes (half-egg shell bases)
            const eggs = [
                { x: cx - 80, y: cy + 60, r: 90 },
                { x: cx + 80, y: cy + 60, r: 90 },
                { x: cx, y: cy - 20, r: 100 }
            ];

            for (const egg of eggs) {
                ctx.beginPath();
                ctx.ellipse(egg.x, egg.y, egg.r * 0.75, egg.r, 0, 0.4, Math.PI * 0.9);
                // Jagged top edge
                ctx.lineTo(egg.x - egg.r * 0.3, egg.y - egg.r * 0.2);
                ctx.lineTo(egg.x, egg.y + egg.r * 0.1);
                ctx.lineTo(egg.x + egg.r * 0.3, egg.y - egg.r * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        function drawSpores(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            // Stalks
            ctx.strokeStyle = '#2e7d32';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(cx - 100, 800); ctx.quadraticCurveTo(cx - 120, 600, cx - 80, 420);
            ctx.moveTo(cx + 100, 800); ctx.quadraticCurveTo(cx + 120, 600, cx + 80, 420);
            ctx.moveTo(cx, 800); ctx.lineTo(cx, 340);
            ctx.stroke();

            // Glowing spore bulbs
            setupGlow(ctx, '#ffcc00', 40);
            const drawBulb = (x, y, r, glow) => {
                const sporeGrad = ctx.createRadialGradient(x, y, 2, x, y, r);
                sporeGrad.addColorStop(0, '#ffffff');
                sporeGrad.addColorStop(0.4, glow);
                sporeGrad.addColorStop(1, 'rgba(255, 204, 0, 0)');
                ctx.fillStyle = sporeGrad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            };
            drawBulb(cx - 80, 420, 80, '#ff9900');
            drawBulb(cx + 80, 420, 80, '#ff9900');
            drawBulb(cx, 340, 110, '#ffcc00');
            clearGlow(ctx);
        }

        function drawWebs(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            ctx.strokeStyle = '#e8f5e9';
            ctx.lineWidth = 4;
            setupGlow(ctx, '#00ff66', 15);

            const cx = 512, cy = 512;
            // Concentric web lines
            for (let r = 100; r < 500; r += 100) {
                ctx.beginPath();
                for (let a = 0; a <= Math.PI * 2; a += Math.PI / 6) {
                    const wx = cx + Math.cos(a) * r;
                    const wy = cy + Math.sin(a) * r * 0.8;
                    if (a === 0) ctx.moveTo(wx, wy);
                    else ctx.lineTo(wx, wy);
                }
                ctx.closePath();
                ctx.stroke();
            }

            // Radial spokes
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(a) * 500, cy + Math.sin(a) * 400);
                ctx.stroke();
            }
            clearGlow(ctx);
        }

        function drawLichen(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            // Licensing strips glowing cyan/blue
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 16;
            setupGlow(ctx, '#00e5ff', 35);

            for (let i = 0; i < 5; i++) {
                const y = 200 + i * 160;
                ctx.beginPath();
                ctx.moveTo(100, y);
                ctx.bezierCurveTo(300, y - 80, 700, y + 80, 924, y);
                ctx.stroke();
            }
            clearGlow(ctx);
        }

        function drawHiveWounded(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 512;
            // Organic membrane mound
            ctx.fillStyle = '#311b92';
            ctx.strokeStyle = '#9c27b0';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 320, 200, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Giant glowing cracks (Wounded details!)
            ctx.strokeStyle = '#ff3300';
            ctx.lineWidth = 14;
            setupGlow(ctx, '#ff3300', 40);
            ctx.beginPath();
            ctx.moveTo(cx - 150, cy - 80);
            ctx.lineTo(cx, cy + 20);
            ctx.lineTo(cx + 120, cy - 60);
            ctx.moveTo(cx - 20, cy + 20);
            ctx.lineTo(cx - 50, cy + 120);
            ctx.stroke();
            clearGlow(ctx);

            // Leaking glowing fluid spots
            ctx.fillStyle = '#ff9900';
            setupGlow(ctx, '#ff9900', 20);
            ctx.beginPath();
            ctx.arc(cx - 10, cy + 30, 25, 0, Math.PI * 2);
            ctx.arc(cx - 50, cy + 130, 20, 0, Math.PI * 2);
            ctx.fill();
            clearGlow(ctx);
        }

        function drawBones(ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1024, 1024);

            const cx = 512, cy = 600;
            ctx.fillStyle = '#e0e0e0';
            ctx.strokeStyle = '#9e9e9e';
            ctx.lineWidth = 4;

            // Draw a heap of bone shapes
            const drawBone = (x, y, angle) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                // Center shaft
                ctx.fillRect(-60, -10, 120, 20);
                // Ends
                ctx.beginPath();
                ctx.arc(-60, -15, 18, 0, Math.PI * 2);
                ctx.arc(-60, 15, 18, 0, Math.PI * 2);
                ctx.arc(60, -15, 18, 0, Math.PI * 2);
                ctx.arc(60, 15, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };

            drawBone(cx - 80, cy + 20, 0.4);
            drawBone(cx + 80, cy + 10, -0.6);
            drawBone(cx, cy - 40, 1.2);
            // Skull
            ctx.fillStyle = '#f5f5f5';
            ctx.beginPath();
            ctx.arc(cx, cy + 30, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx - 20, cy + 30, 15, 0, Math.PI * 2);
            ctx.arc(cx + 20, cy + 30, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // BATCH 4: ACHIEVEMENT ICONS DRAWING (GLYPH DESIGNS)
        function drawAchGlyph(ctx, emoji, text) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            const cx = 256, cy = 256;
            // Draw Sci-fi Hexagon border
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 8;
            setupGlow(ctx, '#00e5ff', 12);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                const hx = cx + Math.cos(angle) * 200;
                const hy = cy + Math.sin(angle) * 200;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            clearGlow(ctx);

            // Draw center Emoji glyph in white
            ctx.fillStyle = '#ffffff';
            ctx.font = '100px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, cx, cy - 20);

            // Draw text tag
            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(text.toUpperCase(), cx, cy + 100);
        }

        // AUTO START RUN
        async function start() {
            const container = document.getElementById('container');
            const status = document.getElementById('status');

            for (const asset of assets) {
                status.textContent = 'Generating ' + asset.name + '...';
                
                const canvas = document.createElement('canvas');
                // Achievement icons are 512x512, others 1024x1024
                const isAch = asset.name.startsWith('ach_');
                canvas.width = isAch ? 512 : 1024;
                canvas.height = isAch ? 512 : 1024;
                container.appendChild(canvas);
                
                const ctx = canvas.getContext('2d');
                asset.draw(ctx);

                // Export to Base64 and POST upload to server
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
    const browser = spawn('firefox', ['--headless', `http://localhost:${PORT}`], {
        detached: true,
        stdio: 'ignore'
    });
    browser.unref();
});
