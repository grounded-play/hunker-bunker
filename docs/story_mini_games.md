<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RGB: Riverside Global 'Botics - Game Architecture</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .chart-container {
            position: relative;
            width: 100%;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            height: 35vh;
            max-height: 350px;
        }
        @media (min-width: 768px) {
            .chart-container {
                height: 400px;
                max-height: 400px;
            }
        }
        body {
            background-color: #f8fafc;
            color: #0f172a;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .hide {
            display: none;
        }
        .timeline-btn.active {
            background-color: #ef4444;
            color: white;
            border-color: #ef4444;
        }
        .nav-btn.active {
            background-color: #e2e8f0;
            font-weight: 600;
            border-left: 4px solid #ef4444;
        }
    </style>
</head>
<body class="flex h-screen overflow-hidden">

    <!-- Chosen Palette: Industrial Light Corporate (Slate-50 background, Slate-900 text, Red-500 accent, Amber-500 warning) -->
    <!-- Application Structure Plan: A dashboard-style layout with a fixed sidebar for navigation and a dynamic main content area. This structure was chosen because game design documents contain distinct categorical data (assets, mechanics, narrative flows) that are best consumed in focused, task-oriented views rather than a long, overwhelming scroll. -->
    <!-- Visualization & Content Choices:
        1. Overview: Goal: Inform -> Donut Chart for asset distribution -> Hover tooltips -> Chart.js.
        2. Asset Manifest: Goal: Organize -> Interactive Filterable Grid -> Click filters to sort -> HTML/JS.
        3. Scene Architecture: Goal: Change/Process Flow -> Interactive HTML Timeline -> Click nodes to reveal scene data -> JS/Tailwind.
        4. Endings Matrix: Goal: Compare -> Interactive Grid Cards -> Hover for narrative outcomes -> HTML/Tailwind.
        All methods support the dashboard structure. -->
    <!-- CONFIRMATION: NO SVG graphics used. NO Mermaid JS used. -->

    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div class="p-6 border-b border-slate-200">
            <h1 class="text-2xl font-bold tracking-tighter text-slate-900">R.G.B.</h1>
            <p class="text-xs font-mono text-slate-500 mt-1">Riverside Global 'Botics</p>
            <p class="text-[10px] font-mono text-red-600 mt-1">v1.0.4 - PLAYBOOK</p>
        </div>
        <nav class="flex-1 overflow-y-auto py-4">
            <button onclick="nav('overview')" id="nav-overview" class="nav-btn active w-full text-left px-6 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                &#128202; Overview & Core
            </button>
            <button onclick="nav('assets')" id="nav-assets" class="nav-btn w-full text-left px-6 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-l-4 border-transparent">
                &#128194; Asset Manifest
            </button>
            <button onclick="nav('scenes')" id="nav-scenes" class="nav-btn w-full text-left px-6 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-l-4 border-transparent">
                &#127916; Scene Architecture
            </button>
            <button onclick="nav('endings')" id="nav-endings" class="nav-btn w-full text-left px-6 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-l-4 border-transparent">
                &#128275; Endings Matrix
            </button>
        </nav>
        <div class="p-4 border-t border-slate-200 text-xs text-slate-400">
            &#9881; Target: Phaser 3 / Electron
        </div>
    </aside>

    <main class="flex-1 overflow-y-auto p-8 relative">

        <section id="sec-overview" class="block max-w-5xl mx-auto pb-12">
            <h2 class="text-3xl font-bold text-slate-800 mb-4 border-b border-slate-300 pb-2">Framework & Overview</h2>
            <p class="text-slate-600 mb-8 leading-relaxed">
                This section outlines the foundational technical and thematic structure of the RGB point-and-click adventure game. It visualizes the distribution of game assets required for the Phaser 3 / Electron build and establishes the core inspirations and deployment targets. Use the chart below to understand the scope of the required art assets.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 class="text-lg font-semibold mb-4 text-slate-800">&#128200; Asset Distribution</h3>
                    <div class="chart-container">
                        <canvas id="assetChart"></canvas>
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex-1">
                        <h3 class="text-lg font-semibold mb-2 text-slate-800">&#127918; Technical Stack</h3>
                        <ul class="list-disc pl-5 text-sm text-slate-600 space-y-2">
                            <li><strong>Engine Core:</strong> Phaser 3 Single-File/Modular Architecture (WebGL point-and-click layers).</li>
                            <li><strong>Desktop Packaging:</strong> Electron (Main/Preload) with cross-platform targets via electron-builder.</li>
                            <li><strong>Steam Deck Compliance:</strong> Gamepad API mapping (Xbox layouts), two-level component groups, layer stack management.</li>
                        </ul>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex-1 border-l-4 border-l-red-500">
                        <h3 class="text-lg font-semibold mb-2 text-slate-800">&#128214; Conceptual Synthesis</h3>
                        <p class="text-sm text-slate-600 mb-2"><strong>Story:</strong> Elias Morales, an exploited warehouse technician, struggles to afford his daughter's $286.40 inhaler. An injury by Robot 4A and lost health benefits lead to a desperate sabotage.</p>
                        <p class="text-sm text-slate-600"><strong>Inspirations:</strong> <em>The Dig</em> (somber sci-fi, moral choices) and <em>The Yukon Trail</em> (resource/time pressure, bureaucratic hurdles).</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="sec-assets" class="hide max-w-5xl mx-auto pb-12">
            <h2 class="text-3xl font-bold text-slate-800 mb-4 border-b border-slate-300 pb-2">Global Asset Manifest</h2>
            <p class="text-slate-600 mb-6 leading-relaxed">
                Explore the complete inventory of graphical assets required for the game. This interactive directory allows you to filter by category (Backgrounds, Characters, Objects, UI) to understand the visual components that make up the game's high-contrast, industrial aesthetic.
            </p>

            <div class="mb-6 flex gap-2 overflow-x-auto pb-2">
                <button onclick="filterAssets('All')" class="asset-filter bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-700 transition">All</button>
                <button onclick="filterAssets('Backgrounds')" class="asset-filter bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-50 transition">Backgrounds</button>
                <button onclick="filterAssets('Characters')" class="asset-filter bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-50 transition">Characters</button>
                <button onclick="filterAssets('Objects')" class="asset-filter bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-50 transition">Objects</button>
                <button onclick="filterAssets('UI')" class="asset-filter bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-50 transition">UI Overlays</button>
            </div>

            <div id="asset-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            </div>
        </section>

        <section id="sec-scenes" class="hide max-w-5xl mx-auto pb-12">
            <h2 class="text-3xl font-bold text-slate-800 mb-4 border-b border-slate-300 pb-2">Scene Architecture & Puzzles</h2>
            <p class="text-slate-600 mb-8 leading-relaxed">
                This section details the interactive narrative flow. Click through the numbered scene timeline below to reveal the specific visuals, tone, player actions, and failure states designed for each act of the game. It illustrates how mechanics tie into the narrative pressure.
            </p>

            <div class="flex flex-wrap gap-2 mb-8 justify-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <button onclick="showScene(1)" id="btn-scene-1" class="timeline-btn active w-10 h-10 rounded-full border-2 border-slate-300 font-bold text-slate-600 hover:border-red-400 transition-colors">1</button>
                <div class="w-8 h-0 border-t-2 border-slate-300 mt-5"></div>
                <button onclick="showScene(2)" id="btn-scene-2" class="timeline-btn w-10 h-10 rounded-full border-2 border-slate-300 font-bold text-slate-600 hover:border-red-400 transition-colors">2</button>
                <div class="w-8 h-0 border-t-2 border-slate-300 mt-5"></div>
                <button onclick="showScene(3)" id="btn-scene-3" class="timeline-btn w-10 h-10 rounded-full border-2 border-slate-300 font-bold text-slate-600 hover:border-red-400 transition-colors">3</button>
                <div class="w-8 h-0 border-t-2 border-slate-300 mt-5"></div>
                <button onclick="showScene(4)" id="btn-scene-4" class="timeline-btn w-10 h-10 rounded-full border-2 border-slate-300 font-bold text-slate-600 hover:border-red-400 transition-colors">4</button>
                <div class="w-8 h-0 border-t-2 border-slate-300 mt-5"></div>
                <button onclick="showScene(5)" id="btn-scene-5" class="timeline-btn w-10 h-10 rounded-full border-2 border-slate-300 font-bold text-slate-600 hover:border-red-400 transition-colors">5</button>
                <div class="w-8 h-0 border-t-2 border-slate-300 mt-5"></div>
                <button onclick="showScene(6)" id="btn-scene-6" class="timeline-btn w-10 h-10 rounded-full border-2 border-slate-300 font-bold text-slate-600 hover:border-red-400 transition-colors">6</button>
            </div>

            <div id="scene-content" class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-2 h-full bg-slate-800" id="scene-color-bar"></div>
            </div>
        </section>

        <section id="sec-endings" class="hide max-w-5xl mx-auto pb-12">
            <h2 class="text-3xl font-bold text-slate-800 mb-4 border-b border-slate-300 pb-2">Multi-Ending Specification Matrix</h2>
            <p class="text-slate-600 mb-8 leading-relaxed">
                Review the terminal outcomes of the player's choices and performance. This matrix organizes the branching paths into distinct narrative conclusions and game-over states, demonstrating how resource management and timing directly impact Elias's fate. Hover over cards for details.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div class="group bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                    <div class="absolute top-0 left-0 w-full h-1 bg-slate-400 group-hover:bg-slate-600 transition-colors"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Ending A: The System Loop</h3>
                        <p class="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">&#9888; Trigger Condition</p>
                        <p class="text-slate-700 text-sm mb-4">Fail to sever server trunk / Accept termination quietly.</p>
                        <div class="bg-slate-50 p-4 rounded border border-slate-100">
                            <p class="text-sm text-slate-800"><strong>Narrative Resolution:</strong> Elias returns to temp status; Lucia's Albuterol remains unpurchased; warehouse routine resumes in flat black-and-white.</p>
                        </div>
                    </div>
                </div>

                <div class="group bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                    <div class="absolute top-0 left-0 w-full h-1 bg-amber-500 group-hover:bg-amber-600 transition-colors"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Ending B: Ashes & Survival</h3>
                        <p class="text-sm font-semibold text-amber-600 mb-4 uppercase tracking-wider">&#9888; Trigger Condition</p>
                        <p class="text-slate-700 text-sm mb-4">Complete server sabotage; Robot 4A sacrifices itself to lift steel rack.</p>
                        <div class="bg-amber-50 p-4 rounded border border-amber-100">
                            <p class="text-sm text-slate-800"><strong>Narrative Resolution:</strong> Facility burns in vivid amber/orange color; Elias escapes into desert night with burned drawing; alive, unpolished, and human.</p>
                        </div>
                    </div>
                </div>

                <div class="group bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                    <div class="absolute top-0 left-0 w-full h-1 bg-red-600 group-hover:bg-red-700 transition-colors"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Game Over 1: Suffocation</h3>
                        <p class="text-sm font-semibold text-red-600 mb-4 uppercase tracking-wider">&#10006; Trigger Condition</p>
                        <p class="text-slate-700 text-sm mb-4">Fail timing window on Robot 4A override taps during Sector 4 collapse.</p>
                        <div class="bg-red-50 p-4 rounded border border-red-100">
                            <p class="text-sm text-slate-800"><strong>Narrative Resolution:</strong> Crushed beneath heavy steel inventory racking while automated lockdown announcements loop infinitely.</p>
                        </div>
                    </div>
                </div>

                <div class="group bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                    <div class="absolute top-0 left-0 w-full h-1 bg-red-600 group-hover:bg-red-700 transition-colors"></div>
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Game Over 2: Insolvency</h3>
                        <p class="text-sm font-semibold text-red-600 mb-4 uppercase tracking-wider">&#10006; Trigger Condition</p>
                        <p class="text-slate-700 text-sm mb-4">Exhaust all financial and medical credit buffers before pharmacy interaction.</p>
                        <div class="bg-red-50 p-4 rounded border border-red-100">
                            <p class="text-sm text-slate-800"><strong>Narrative Resolution:</strong> Transaction times out permanently; medication locked in secure holding as medical crisis peaks off-screen.</p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    </main>

    <script>
        const assetData = [
            { cat: 'Backgrounds', file: 'bg_parking_lot.png', desc: 'High-contrast black-and-white desert logistics monolith, rusty sedan silhouette.' },
            { cat: 'Backgrounds', file: 'bg_warehouse_floor.png', desc: 'Endless monochromatic conveyor belts, industrial racking, Robot 4A sorting monolith.' },
            { cat: 'Backgrounds', file: 'bg_hr_office.png', desc: 'Clinical white interrogation room, safety glass partition, sterile lighting.' },
            { cat: 'Backgrounds', file: 'bg_medi_kiosk.png', desc: 'Automated strip mall 24-hour kiosk, reinforced plexiglass, robot arm dispenser slot.' },
            { cat: 'Backgrounds', file: 'bg_server_room.png', desc: 'Claustrophobic server racks, pulsing red indicators, thick fiber trunks.' },
            { cat: 'Backgrounds', file: 'bg_sector_four_fire.png', desc: 'Amber/orange destructive lighting, smoke particle emitters, collapsed steel infrastructure.' },
            { cat: 'Characters', file: 'elias_idle.png / elias_limp.png', desc: 'Safety vest, worn flannel, bloodied temple animation frames.' },
            { cat: 'Characters', file: 'lucia_drawing.png', desc: 'Hand-drawn paper asset with one-eyed purple dinosaur and shoe-wearing robot.' },
            { cat: 'Characters', file: 'robot_4a.png', desc: 'Titanium multi-jointed sorting armature with dynamic red optical sensor states.' },
            { cat: 'Characters', file: 'marisol.png', desc: 'Overworked peer sprite with vape accessory and cracked phone screen.' },
            { cat: 'Characters', file: 'hr_rep.png', desc: 'Corporate fleece uniform sprite with expressionless face.' },
            { cat: 'Objects', file: 'item_prescription_bottle.png', desc: 'Empty Albuterol container with scratched purple dinosaur sticker.' },
            { cat: 'Objects', file: 'item_notebook.png', desc: 'Dog-eared pocket logbook (4A CALIBRATION / MANUAL OVERRIDES).' },
            { cat: 'Objects', file: 'item_badge.png', desc: 'Scratched temp contractor identification card.' },
            { cat: 'Objects', file: 'item_wire_cutters.png', desc: 'Heavy industrial insulated tool for data trunk severing.' },
            { cat: 'Objects', file: 'item_drawing.png', desc: 'Burned and ash-smeared daughter\'s sketch.' },
            { cat: 'UI', file: 'hud_scanner.png', desc: 'Red digital status borders, real-time health/benefits countdown timer.' },
            { cat: 'UI', file: 'ui_terminal_prompt.png', desc: 'Monochrome terminal window for parsing maintenance and override codes.' },
            { cat: 'UI', file: 'ui_dialogue_box.png', desc: 'Retro dialogue frame with sound wave activity visualizer.' }
        ];

        const sceneData = [
            {
                id: 1,
                title: "Scene 1: The Parking Lot & Intake (The Descent)",
                tone: "High-contrast B&W, stifling heat shimmer, distant industrial hum. Inspired by The Yukon Trail resource/survival pressure.",
                actions: [
                    "Inspect Elias's sedan cupholder to acquire item_prescription_bottle and check funds ($19.12 balance vs $286.40 cost).",
                    "Retrieve item_notebook containing calibration clues.",
                    "Navigate to employee entrance; use item_badge on reader to trigger BEEP response and enter warehouse floor."
                ],
                failure: "Lingering too long in the car results in delayed entry, incurring a productivity penalty before shift start.",
                color: "#1e293b"
            },
            {
                id: 2,
                title: "Scene 2: The Warehouse Floor (Calibration & Metrics)",
                tone: "Rhythmic conveyor noise, mechanical gasps, looming Robot 4A presence.",
                actions: [
                    "Observe Robot 4A crushing incoming crooked cardboard loads.",
                    "Consult item_notebook hint (DOUBLE TAP = RELEASE PRESSURE / RECENTER).",
                    "Perform double-tap interaction on Robot 4A's chassis joints to normalize sorting output and log SUCCESSFUL SORT."
                ],
                failure: "None strictly, but failure to act impacts metrics visually.",
                color: "#334155"
            },
            {
                id: 3,
                title: "Scene 3: The Collision & HR Review (Bureaucratic Dead-Ends)",
                tone: "Sudden kinetic violence, sterile interrogation whites, ticking benefits timer (6:42 PM).",
                actions: [
                    "Clear warehouse jam by yanking taped packing material.",
                    "Quick Time Event / Precision Click: Avoid Robot 4A's erratic armature sweep or suffer collision injury.",
                    "Complete compulsory cotton swab screening at HR terminal while monitoring early benefit termination countdown."
                ],
                failure: "Failure to dodge causes severe visual injury state; lingering exhausts timer.",
                color: "#cbd5e1"
            },
            {
                id: 4,
                title: "Scene 4: The Medi-Kiosk Terminal (Resource Deficit)",
                tone: "Cold LED lighting, strip mall isolation, stark plexiglass barrier. Inspired by The Yukon Trail store purchase barriers.",
                actions: [
                    "Scan item_prescription_bottle at Kiosk terminal.",
                    "Experience transaction failure due to terminated insurance and docked net pay ($14.00 net).",
                    "Attempt virtual billing agent request (timed out with 47-minute wait)."
                ],
                failure: "Exhausting options without alternate plan triggers Game Over 2.",
                color: "#3b82f6"
            },
            {
                id: 5,
                title: "Scene 5: The Server Room Breach (Sabotage)",
                tone: "Deep amber warning lights, humming server stacks, high-stakes moral terminal choice. Inspired by The Dig's terminal decision loops.",
                actions: [
                    "Access central AI mainframe; attempt to delete profile (ADMIN LOCK / ACCESS DENIED).",
                    "Equip item_wire_cutters and execute precision cut on primary fiber-optic data trunk.",
                    "Manage secondary hazard: lithium battery short-circuit sparking against dry packaging cardboard."
                ],
                failure: "Failure to cut wire defaults to Ending A.",
                color: "#f59e0b"
            },
            {
                id: 6,
                title: "Scene 6: Sector 4 Fire & Finale (The Collapse)",
                tone: "Blaring klaxons, strobe lights, crushing steel debris, transition to vivid amber/orange color palette.",
                actions: [
                    "Pull manual fire alarm station; wait through override delay.",
                    "Survive structural shelf collapse by executing manual override taps on damaged Robot 4A chassis (TAP, TAP).",
                    "Direct Robot 4A to lift crushing steel rack, resulting in machine self-destruction and Elias's narrow escape."
                ],
                failure: "Failing the timing window on Robot 4A triggers Game Over 1.",
                color: "#ef4444"
            }
        ];

        function nav(section) {
            document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hide'));
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('border-l-red-500');
                btn.classList.add('border-transparent');
            });

            document.getElementById(`sec-${section}`).classList.remove('hide');
            const activeBtn = document.getElementById(`nav-${section}`);
            activeBtn.classList.add('active');
            activeBtn.classList.remove('border-transparent');
            activeBtn.classList.add('border-l-red-500');
        }

        function renderAssetGrid(data) {
            const grid = document.getElementById('asset-grid');
            grid.innerHTML = '';
            data.forEach(asset => {
                const iconMap = {
                    'Backgrounds': '&#128444;',
                    'Characters': '&#128100;',
                    'Objects': '&#128296;',
                    'UI': '&#128187;'
                };
                grid.innerHTML += `
                    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-slate-400 transition-colors">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xl">${iconMap[asset.cat]}</span>
                            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">${asset.cat}</span>
                        </div>
                        <h4 class="font-mono text-sm font-semibold text-slate-800 mb-2 truncate" title="${asset.file}">${asset.file}</h4>
                        <p class="text-sm text-slate-600 line-clamp-3">${asset.desc}</p>
                    </div>
                `;
            });
        }

        function filterAssets(cat) {
            document.querySelectorAll('.asset-filter').forEach(btn => {
                btn.classList.remove('bg-slate-800', 'text-white');
                btn.classList.add('bg-white', 'text-slate-700');
            });
            event.target.classList.remove('bg-white', 'text-slate-700');
            event.target.classList.add('bg-slate-800', 'text-white');

            if (cat === 'All') {
                renderAssetGrid(assetData);
            } else {
                renderAssetGrid(assetData.filter(a => a.cat === cat));
            }
        }

        function showScene(id) {
            document.querySelectorAll('.timeline-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-red-500', 'text-white', 'border-red-500');
                btn.classList.add('text-slate-600', 'border-slate-300');
            });
            const activeBtn = document.getElementById(`btn-scene-${id}`);
            activeBtn.classList.remove('text-slate-600', 'border-slate-300');
            activeBtn.classList.add('active', 'bg-red-500', 'text-white', 'border-red-500');

            const scene = sceneData.find(s => s.id === id);
            const contentDiv = document.getElementById('scene-content');

            let actionsHtml = scene.actions.map(a => `<li class="mb-2"><span class="text-red-500 mr-2">&#10148;</span>${a}</li>`).join('');

            contentDiv.innerHTML = `
                <div class="absolute top-0 left-0 w-2 h-full transition-colors duration-500" style="background-color: ${scene.color}"></div>
                <div class="pl-4">
                    <h3 class="text-2xl font-bold text-slate-800 mb-2">${scene.title}</h3>
                    <p class="text-sm font-medium text-slate-500 mb-6 italic border-b border-slate-100 pb-4">"${scene.tone}"</p>

                    <h4 class="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">&#127918; Player Actions & Puzzles</h4>
                    <ul class="text-slate-600 text-sm mb-6 pl-2">
                        ${actionsHtml}
                    </ul>

                    <div class="bg-slate-50 p-4 rounded border border-slate-200">
                        <h4 class="text-sm font-bold uppercase tracking-wider text-red-600 mb-2">&#9888; Failure State</h4>
                        <p class="text-sm text-slate-700">${scene.failure}</p>
                    </div>
                </div>
            `;
        }

        document.addEventListener('DOMContentLoaded', () => {
            renderAssetGrid(assetData);
            showScene(1);

            const ctx = document.getElementById('assetChart').getContext('2d');
            const counts = {
                'Backgrounds': assetData.filter(a => a.cat === 'Backgrounds').length,
                'Characters': assetData.filter(a => a.cat === 'Characters').length,
                'Objects': assetData.filter(a => a.cat === 'Objects').length,
                'UI Overlays': assetData.filter(a => a.cat === 'UI').length
            };

            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{
                        data: Object.values(counts),
                        backgroundColor: ['#1e293b', '#64748b', '#ef4444', '#cbd5e1'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { family: 'ui-sans-serif, system-ui' } } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.label}: ${context.raw} files`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        });
    </script>

</body>
</html>

Create a new .md file.

Using the sources, outline and cite a breakdown of the conversion of the script RBG into a point click adventure game, using teh example of a framework where we are deploying to a steamdeck via phaser3 wtrapped in electron in the hunkerbunker repo,

The script will be now multi ending and with game overs .
I want asset lists, backgrounds, objects, characters, UI frames, all listed, and flows and a break down.

Use the examples of the two other games from the past, the dig and yukon trail to capture the flow and idea of what the games can/ should be, with a new darker adult modern thamtic twist please

RGB: Riverside Global 'Botics - Point-and-Click Adventure Framework

1. Overview & Conceptual Synthesis

Source Script: RGB (Riverside Global 'Botics) — Elias Morales, an exploited warehouse technician struggling to afford his daughter Lucia's Albuterol inhaler ($286.40), gets injured by Robot 4A, loses his health benefits at 6:42 PM, and triggers a warehouse fire by severing a server data trunk.

Inspirations: - The Dig (LucasArts, 1995): Somber, high-stakes science fiction atmosphere, inventory combination puzzles, heavy moral terminal decisions, and tragic companion/character fates.

The Yukon Trail (MECC, 1994): Resource management pressure (funds, medical supplies, endurance/time thresholds), penalty loops, and bureaucratic hurdles.

Target Platform: Phaser 3 WebGL runtime, packaged via electron-builder for desktop and Steam, optimized for Steam Deck physical controls (Gamepad API / Xbox mapping / component groups).

2. Technical Stack & Boilerplate Architecture

Framework: Phaser 3 (Single-file runtime view inside src/threeGame.js or adapted src/rgbAdventure.js).

Desktop Wrapper: Electron (Main process electron/main.cjs, Preload bridge electron/preload.cjs).

Steam Deck Compatibility: - Gamepad API mapping (Navigator.getGamepads()).

Focusable UI components (D-pad/stick navigation with component grouping).

Layer stack management for modals, dialogs, and automated dispensing kiosks.

3. Asset Lists

Backgrounds (/public/assets/backgrounds/)

bg_parking_lot.png: High-contrast black-and-white desert logistics monolith, rusty sedan.

bg_warehouse_floor.png: Endless conveyor belts, steel racking, towering Robot 4A sorting station.

bg_hr_office.png: Clinical white interrogation room, glass partition, sterile lighting.

bg_medi_kiosk.png: Automated strip mall 24-hour kiosk, reinforced plexiglass, robot arm slot.

bg_server_room.png: Claustrophobic server racks, pulsing red indicators, thick data trunks.

Characters & Sprites (/public/assets/sprites/)

elias_idle.png / elias_limp.png: Safety vest, flannel, bloodied temple variant.

lucia_drawing.png: Paper with one-eyed purple dinosaur and robot with shoes.

robot_4a.png: Massive titanium multi-jointed sorting armature with red optical sensors.

marisol.png: Overworked peer with vape and cracked lock screen.

hr_rep.png: Clean corporate fleece, blank expression.

Objects & Inventory Items (/public/assets/items/)

item_prescription_bottle.png: Empty Albuterol container with scratched purple dinosaur sticker.

item_notebook.png: Dog-eared logbook (4A CALIBRATION / MANUAL OVERRIDES).

item_badge.png: Scratched temp contractor ID card.

item_wire_cutters.png: Heavy insulated tool for severing data trunks.

item_drawing.png: Burned and ash-smeared daughter's sketch.

UI Frames & Overlays (/public/assets/ui/)

hud_scanner.png: Red digital status borders, health/benefits countdown timer.

ui_terminal_prompt.png: Monochrome terminal window for overriding robot calibration codes.

ui_dialogue_box.png: Retro text box with sound wave indicator for voice memos.

4. Game Flows & Puzzle Breakdown

Act I: The Shift (Parking Lot & Intake)

Objective: Secure the Albuterol refill before benefits terminate at midnight.

Puzzles: - Examine Elias's sedan cupholder to acquire empty prescription bottle and check bank balance ($19.12).

Badge into warehouse entry scanner using bent temp contractor badge.

Act II: The Floor (Warehouse Calibration)

Objective: Maintain production metrics while dealing with Robot 4A's erratic grip errors.

Puzzles:

Use Notebook hints on 4A (DOUBLE TAP = RELEASE PRESSURE / RECENTER) to fix crushed cardboard bottlenecks.

Survive the collision event when the crooked box traps Elias against the racking.

Act III: The Review (HR Office & Kiosk Failure)

Objective: Clear liability waiver or secure emergency funds.

Puzzles:

Complete swab screening at HR desk while monitoring benefits cutoff timer (6:42 PM).

Attempt transaction at Medi-Kiosk; experience out-of-pocket failure ($286.40 vs $14.00 net pay).

Act IV: The Breach (Server Room & Finale)

Objective: Trigger core override or destroy data tracking models.

Puzzles:

Use insulated wire cutters on primary fiber-optic data trunk.

Manage lithium battery fire hazard using manual override taps on Robot 4A during structural collapse.

5. Multi-Ending & Game Over Matrix

Ending ID

Condition / Trigger

Narrative Outcome

Ending A (The System Loop)

Fail to sever trunk / Accept termination quietly

Elias returns to temp status; Lucia's Albuterol goes unpurchased; cyclical warehouse routine resumes in black-and-white.

Ending B (Ashes & Survival)

Complete server sabotage; Robot 4A sacrifices itself to lift rack

Facility burns in vivid amber/orange color; Elias escapes into desert night with burned drawing; alive, unpaid, but human.

Game Over 1 (Suffocation)

Fail to tap Robot 4A correctly during Sector 4 collapse

Crushed beneath steel racking while automated voice announces thermal lockdown.

Game Over 2 (Insolvency)

Spend too long in HR review before kiosk interaction

Transaction times out; medication returned to holding as medical crisis peaks.

RGB: Riverside Global 'Botics — Master Adventure Playbook & Scene Architecture

1. Governing Framework & Tech Integration

Engine Core: Phaser 3 Single-File/Modular Architecture (src/threeGame.js adapted for 2D/WebGL point-and-click layers).

Desktop Packaging: Electron (electron/main.cjs, electron/preload.cjs) with cross-platform build targets via electron-builder.

Steam Deck Compliance Layer: - Gamepad API mapping (Navigator.getGamepads()) matching standard Xbox/Steam Deck control layouts.

Two-level component groups and active Layer Stack management for modals, dialogs, and kiosk interfaces.

Target environment verification flag (STEAM_OS=1).

2. Global Asset & Inventory Manifest

Background Environments (/public/assets/backgrounds/)

bg_parking_lot.png: High-contrast black-and-white desert logistics monolith, rusty sedan silhouette.

bg_warehouse_floor.png: Endless monochromatic conveyor belts, industrial racking, Robot 4A sorting monolith.

bg_hr_office.png: Clinical white interrogation room, safety glass partition, sterile lighting.

bg_medi_kiosk.png: Automated strip mall 24-hour kiosk, reinforced plexiglass, robot arm dispenser slot.

bg_server_room.png: Claustrophobic server racks, pulsing red indicators, thick fiber trunks.

bg_sector_four_fire.png: Amber/orange destructive lighting, smoke particle emitters, collapsed steel infrastructure.

Characters & Animated Sprites (/public/assets/sprites/)

elias_idle.png / elias_limp.png: Safety vest, worn flannel, bloodied temple animation frames.

lucia_drawing.png: Hand-drawn paper asset with one-eyed purple dinosaur and shoe-wearing robot.

robot_4a.png: Titanium multi-jointed sorting armature with dynamic red optical sensor states.

marisol.png: Overworked peer sprite with vape accessory and cracked phone screen.

hr_rep.png: Corporate fleece uniform sprite with expressionless face.

Objects & Inventory Items (/public/assets/items/)

item_prescription_bottle.png: Empty Albuterol container with scratched purple dinosaur sticker.

item_notebook.png: Dog-eared pocket logbook (4A CALIBRATION / MANUAL OVERRIDES).

item_badge.png: Scratched temp contractor identification card.

item_wire_cutters.png: Heavy industrial insulated tool for data trunk severing.

item_drawing.png: Burned and ash-smeared daughter's sketch.

UI Frames & Overlays (/public/assets/ui/)

hud_scanner.png: Red digital status borders, real-time health/benefits countdown timer.

ui_terminal_prompt.png: Monochrome terminal window for parsing maintenance and override codes.

ui_dialogue_box.png: Retro dialogue frame with sound wave activity visualizer.

3. Scene-by-Scene Breakdown & Puzzle Architecture

Scene 1: The Parking Lot & Intake (The Descent)

Visuals & Tone: High-contrast B&W, stifling heat shimmer, distant industrial hum. Inspired by The Yukon Trail resource/survival pressure.

Player Actions & Puzzles:

Inspect Elias's sedan cupholder to acquire item_prescription_bottle and check funds ($19.12 balance vs $286.40 cost).

Retrieve item_notebook containing calibration clues.

Navigate to employee entrance; use item_badge on reader to trigger BEEP response and enter warehouse floor.

Failure State (Insolvency Risk): Lingering too long in the car results in delayed entry, incurring a productivity penalty before shift start.

Scene 2: The Warehouse Floor (Calibration & Metrics)

Visuals & Tone: Rhythmic conveyor noise, mechanical gasps, looming Robot 4A presence.

Player Actions & Puzzles:

Observe Robot 4A crushing incoming crooked cardboard loads.

Consult item_notebook hint (DOUBLE TAP = RELEASE PRESSURE / RECENTER).

Perform double-tap interaction on Robot 4A's chassis joints to normalize sorting output and log SUCCESSFUL SORT.

Scene 3: The Collision & HR Review (Bureaucratic Dead-Ends)

Visuals & Tone: Sudden kinetic violence, sterile interrogation whites, ticking benefits timer (6:42 PM).

Player Actions & Puzzles:

Clear warehouse jam by yanking taped packing material.

Quick Time Event / Precision Click: Avoid Robot 4A's erratic armature sweep or suffer collision injury.

Complete compulsory cotton swab screening at HR terminal while monitoring early benefit termination countdown.

Scene 4: The Medi-Kiosk Terminal (Resource Deficit)

Visuals & Tone: Cold LED lighting, strip mall isolation, stark plexiglass barrier. Inspired by The Yukon Trail store purchase barriers.

Player Actions & Puzzles:

Scan item_prescription_bottle at Kiosk terminal.

Experience transaction failure due to terminated insurance and docked net pay ($14.00 net).

Attempt virtual billing agent request (timed out with 47-minute wait).

Scene 5: The Server Room Breach (Sabotage)

Visuals & Tone: Deep amber warning lights, humming server stacks, high-stakes moral terminal choice. Inspired by The Dig's terminal decision loops.

Player Actions & Puzzles:

Access central AI mainframe; attempt to delete profile (ADMIN LOCK / ACCESS DENIED).

Equip item_wire_cutters and execute precision cut on primary fiber-optic data trunk.

Manage secondary hazard: lithium battery short-circuit sparking against dry packaging cardboard.

Scene 6: Sector 4 Fire & Finale (The Collapse)

Visuals & Tone: Blaring klaxons, strobe lights, crushing steel debris, transition to vivid amber/orange color palette.

Player Actions & Puzzles:

Pull manual fire alarm station; wait through override delay.

Survive structural shelf collapse by executing manual override taps on damaged Robot 4A chassis (TAP, TAP).

Direct Robot 4A to lift crushing steel rack, resulting in machine self-destruction and Elias's narrow escape.

4. Multi-Ending & Game Over Specification Matrix

Outcome Identifier

Trigger Condition

Narrative & Visual Resolution

Ending A (The System Loop)

Fail to sever server trunk / Accept termination quietly

Elias returns to temp status; Lucia's Albuterol remains unpurchased; warehouse routine resumes in flat black-and-white.

Ending B (Ashes & Survival)

Complete server sabotage; Robot 4A sacrifices itself to lift steel rack

Facility burns in vivid amber/orange color; Elias escapes into desert night with burned drawing; alive, unpolished, and human.

Game Over 1 (Suffocation / Crushed)

Fail timing window on Robot 4A override taps during Sector 4 collapse

Crushed beneath heavy steel inventory racking while automated lockdown announcements loop infinitely.

Game Over 2 (Insolvency Lockout)

Exhaust all financial and medical credit buffers before pharmacy interaction

Transaction times out permanently; medication locked in secure holding as medical crisis peaks off-screen.

<Script:module>

    RGB (Riverside Global 'Botics)

TITLE CARD: R. G. B. (Riverside Global 'Botics)
Visual Grammar: High-contrast black and white. The only color is the sharp digital RED of scanners, warning lights, app screens, and terminal displays. No score at first. Only breath, distant trucks, plastic rattling, and electrical hum.
SCENE 1
EXT. RGB WAREHOUSE PARKING LOT - LATE AFTERNOON
A logistics monolith sits in the desert heat. Windowless. Flat. Endless. RGB WAREHOUSE.
Tractor trailers idle in rows. Heat shimmer bends the asphalt. The building emits a low industrial HUM before we are anywhere near the doors.
At the far edge of the lot, away from the employee entrance, sits a rusted sedan with one mismatched door.
INT. ELIAS'S SEDAN - CONTINUOUS
ELIAS MORALES, 40s, sits in the driver's seat. He wears a faded safety vest over a worn flannel. His face carries the exhausted stillness of someone who has learned not to react too quickly.
His left hand rests on the steering wheel. His right hand holds an empty prescription bottle. The label is worn from being handled too much.
CLOSE ON LABEL:
ALBUTEROL INHALER
PATIENT: LUCIA MORALES
REFILLS: 0
Elias turns the bottle upside down. Nothing. He taps it once against his palm anyway. Still nothing.
A child's handmade sticker clings to the side of the bottle: a purple dinosaur with one eye scratched off.
Elias sets the bottle in the cupholder beside a gas station coffee and a folded pharmacy receipt. He unlocks his phone. The cracked screen lights his face in digital RED.
ON PHONE:
PHARMACY APP
REFILL READY FOR PICKUP
TOTAL DUE WITHOUT INSURANCE: $286.40
Elias stares. He switches apps.
BANK BALANCE: $19.12
He does not react. He switches apps again.
RGB EMPLOYEE PORTAL
BENEFITS STATUS: ACTIVE AT 11:59 PM TONIGHT
A long beat. The distant warehouse HUM fills the car.
Elias exhales through his nose, almost a laugh, almost pain. A small notification appears.
VOICE MESSAGE FROM LUCIA
Elias taps it.
LUCIA (V.O.)
Hi Dad. Mom says don't forget the purple one. The blue one tastes bad and it makes my hands shaky. But the purple one is okay. Also I drew Robot 4A but I gave him shoes because he looks cold. Okay bye.
The message ends with a tiny burst of room noise and a child fumbling with the phone. Elias listens to the silence after it. He plays the message again.
LUCIA (V.O.)
Hi Dad. Mom says don't forget the purple one.
He stops it before the rest. He reaches into the back seat and picks up a child's drawing on lined school paper. A huge robot arm with sneakers. Beside it, a stick figure labeled: DAD. The robot is smiling.
Elias folds the drawing carefully and slips it into his chest pocket behind a dog-eared pocket notebook. The notebook is swollen with years of sweat, cardboard dust, and taped-in labels.
On its cover, written in black marker:
4A CALIBRATION / MANUAL OVERRIDES
Elias opens it. Inside are handwritten columns of error codes, grip angles, belt speeds, tiny diagrams of robotic claws, and notes written in a working man's shorthand. One note is circled twice:
4A OVERGRIPS IRREGULAR LOADS. TEACH RELEASE PRESSURE BEFORE FINAL SORT.
Elias checks the time. 5:58 PM. He looks through the windshield. Across the lot, workers disappear into the building one by one.
A SECURITY DRONE passes overhead, its shadow sliding across his windshield like a hand.
Elias puts the empty prescription bottle in his vest pocket. He takes the daughter's drawing back out. He looks at the robot with shoes. He almost smiles.
Then he folds it smaller, tucks it safely into the notebook, and places the notebook against his chest.
He opens the car door. The warehouse HUM grows louder.
EXT. RGB WAREHOUSE PARKING LOT - CONTINUOUS
Elias steps out. His bad leg stiffens when it hits the pavement. He hides the limp by adjusting his boot.
A younger worker, MARISOL, 20s, passes with a lunch bag and a vape tucked behind her ear.
MARISOL
You look like hell, Eli.
ELIAS
That's my good side.
MARISOL
You closing?
ELIAS
Midnight.
MARISOL
Lucky.
Elias looks at the building.
ELIAS
Yeah.
Marisol clocks the way he says it. She wants to ask. Does not.
A CHIME cuts through the lot. The employee entrance scanner flashes RED as each worker badges in. One by one. BEEP. BEEP. BEEP.
Elias joins the line. Ahead of him, a poster is zip-tied to the fence:
RGB SAFETY WEEK
ZERO INCIDENTS BEGIN WITH YOU
The poster has been bleached almost white by the sun. Elias reaches the scanner. He pulls out his badge. It is scratched, bent, and still says: TEMP CONTRACTOR.
He scans it. The badge reader flashes RED. ACCESS GRANTED. The steel door unlocks.
Elias steps inside.
CUT TO:
SCENE 2
INT. RGB WAREHOUSE - CONTINUOUS
The sound hits first. Conveyor belts. Pneumatic hisses. Barcode chirps. Forklift beeps. The CLACK-CLACK-CLACK of sorting gates.
A concrete canyon of steel racking and cardboard stretches into industrial infinity. Elias pauses just inside the threshold. Not afraid. Preparing.
He removes the empty prescription bottle from his pocket and places it in his locker. Then he hesitates. He takes it back. He puts it in his chest pocket beside the notebook. He needs the reminder.
Across the warehouse floor, ROBOT 4A waits at the primary sorting line. Massive. Titanium. Multi-jointed. Bolted to the concrete like a weapon pretending to be a tool. Its optical sensors sweep the belt. RED. RED. RED.
Elias crosses toward it. As he approaches, the terminal beside 4A wakes.
SCREEN:
TRAINING PROFILE DETECTED: ELIAS MORALES
ACCESS LEVEL: TEMP CONTRACTOR
HOURLY RATE: $16.50
Elias scans the robot's baseplate.
SCREEN:
ASSET 4A VALUE: $4,800,000
Elias looks at his number. Then at the robot's number. He pulls out his notebook. He does not write anything. He already knows.
A battered cardboard box approaches on the conveyor. Robot 4A snaps downward. Its claws seize the box too hard. The cardboard buckles. The box begins to collapse.
Elias steps forward quickly.
ELIAS
Easy.
The robot keeps squeezing. The terminal flashes RED.
GRIP ERROR
LOAD INSTABILITY
Elias reaches up and places both hands over the machine's cold metal claws. He physically guides them two inches left. Then he presses down lightly on one joint.
ELIAS (CONT'D)
Not harder.
He adjusts the angle.
ELIAS (CONT'D)
Smarter.
The servos whine. Elias taps the chassis twice. Tap. Tap.
The claws loosen. The crushed cardboard breathes back into shape. Elias checks the center of the box with his thumb.
ELIAS (CONT'D)
Center of gravity. Right there.
He steps back. A beat. The robot processes. Then 4A lifts the box smoothly, pivots, and places it perfectly onto the secondary belt. No crush. No hesitation. Perfect.
The terminal flashes RED. SUCCESSFUL SORT
Elias writes in his notebook: DOUBLE TAP = RELEASE PRESSURE / RECENTER
He looks up at the machine.
ELIAS (CONT'D)
See?
The robot's sensors pass over him. RED light washes across Elias's face. For half a second, it almost feels like recognition.
Then the next box comes down the line. The work continues.
SCENE 3
INT. RGB WAREHOUSE - LATER
The warehouse rhythm has become almost musical. Conveyor belts WHIR. Barcode scanners CHIRP. Pneumatic gates CLACK.
Robot 4A pivots, grips, releases. Elias and the machine work in a strange, exhausted harmony.
A battered box slides down the primary belt. Robot 4A drops. Its claws close gently this time. Not harder. Smarter.
The box transfers cleanly to the secondary belt. The terminal flashes RED: SUCCESSFUL SORT.
Elias marks a small check in his pocket notebook.
Across the aisle, MARISOL scans a pallet of returns. She is fast, sharp, younger than Elias, but already tired in the same permanent way.
Her phone is mounted to her scanner with a strip of peeling tape. On the cracked lock screen: two kids in school uniforms.
A notification flashes: DAYCARE LATE PICKUP FEE BEGINS 6:30 PM
Marisol kills the screen before anyone sees. Elias sees anyway. Neither of them says anything.
Another oversized box comes down the line. This one sits crooked. A thick strip of industrial packing tape has snagged on the conveyor guardrail. The box twists sideways, blocking the flow.
The belt GRINDS. Robot 4A hovers above it. Sensors WHIR.
The terminal flashes RED: SORTING DELAY: 00:04 PRODUCTIVITY VARIANCE LOGGED
Elias looks at the screen. 00:05. He checks the time. 6:15 PM.
His hand goes unconsciously to his chest pocket, where the empty prescription bottle presses against his ribs. 00:06.
Robot 4A remains frozen, trapped in its loop. 00:07.
Elias steps forward.
ELIAS
Hold.
The machine does not move. Elias reaches over the guardrail, careful, practiced. He grabs the snagged tape and yanks. It does not come free.
He braces his bad leg and pulls harder. The tape tears loose. The box lurches forward. Elias exhales.
Before he can pull his arm back, Robot 4A breaks its path. Its titanium chassis pivots outside the marked safety arc. No warning tone. No shutdown. Just speed.
CRACK.
The armature slams into Elias’s shoulder and clips the side of his head.
Elias is thrown against the steel racking. He hits the concrete hard. His hard hat skitters across the floor and spins in a slow, humiliating circle.
The warehouse rhythm continues around him. Conveyors WHIR. Scanners CHIRP. Gates CLACK.
Elias gasps, trying to pull air back into his lungs. Blood darkens his temple. His right shoulder hangs wrong.
Ten feet away, Marisol has stopped moving. Her scanner dangles from her hand. She saw it.
Elias looks at her. Marisol looks at him. Then up at the ceiling camera. Then down at her phone.
The daycare notification glows again. DAYCARE LATE PICKUP FEE BEGINS 6:30 PM
Marisol takes one step toward Elias. Then stops.
Above Elias, Robot 4A resets. It picks up the same crooked box and places it perfectly onto the secondary belt.
The terminal flashes RED: ASSET 4A: COLLISION EVENT DETECTED PRIORITY MAINTENANCE: APPROVED
Below that: ELIAS MORALES: INCIDENT REVIEW REQUIRED BENEFITS STATUS: PENDING
Elias laughs once. It hurts badly enough to become a cough. Marisol backs into the aisle.
A supervisor's voice approaches from somewhere off-screen.
SUPERVISOR (O.S.)
Everybody stay in your zones.
Marisol disappears between the racks. Elias is left on the floor beneath the red terminal glow.
CUT TO:
SCENE 4
INT. INCIDENT REVIEW ROOM - MOMENTS LATER
Silence. Not peace. Just the absence of the warehouse. The room is too clean. Too white. Too still. The only sound is the BUZZ of fluorescent lights and the soft tapping of laptop keys.
Elias sits across from an HR REP in a branded RGB fleece. A bloodied paper towel is pressed to Elias’s temple.
His hard hat sits on the table between them. The rim is split. Beside it: an unused ice pack, a sealed mouth swab, and Elias’s pocket notebook.
The HR Rep smiles with practiced concern.
HR REP
Before we begin, do you need water?
ELIAS
I need a doctor.
HR REP
Occupational can see you as soon as we finish intake.
The wording is gentle. The meaning is not.
The HR Rep taps a key. A ceiling-camera freeze-frame fills the laptop screen. Elias reaching over the guardrail. Robot 4A mid-swing. No audio.
HR REP (CONT'D)
For the record, you entered the armature zone during active sort.
ELIAS
Because it locked.
HR REP
We do not have a lock event.
ELIAS
Then your machine missed one.
HR REP
That is what Safety will determine.
Elias leans forward, wincing from his shoulder.
ELIAS
Back it up two seconds.
The HR Rep does not.
HR REP
I have the bookmarked point of contact.
ELIAS
Back it up.
A beat.
HR REP
The language matters here. "Point of contact" is neutral until review is complete.
Elias looks at the silent image of himself being hit.
ELIAS
You got a neutral word for bleeding?
The HR Rep does not answer. Instead, they slide the swab across the table.
HR REP
Standard screening after an incident involving company equipment.
ELIAS
Company equipment hit me.
HR REP
Allegedly made contact.
Elias stares at them. The HR Rep keeps the same calm face.
HR REP (CONT'D)
Swab, please.
Elias looks through the glass wall. Outside the office, warehouse workers move past without looking in. Marisol passes.
For half a second, Elias and Marisol lock eyes. She is holding her phone to her ear.
MARISOL
(into phone, barely audible)
I'm coming. Tell them I'm coming.
She looks away first. Elias understands.
He takes the swab. He rubs it against his cheek. Places it on the desk.
The HR Rep inserts it into a small digital reader. The reader thinks. A red light pulses. Not positive. Not negative.
The screen reads: INCONCLUSIVE SECONDARY REVIEW REQUIRED
Elias sees the word. HR sees the word.
HR closes the laptop halfway, as if the decision has already been made somewhere else.
ELIAS
It says inconclusive.
HR REP
Correct.
ELIAS
That means it doesn't know.
HR REP
It means we cannot clear you.
Elias's phone buzzes on the table. The RGB Employee Portal lights his cracked screen in RED.
COVERAGE TERMINATED: 6:42 PM STATUS: SEPARATION PENDING REVIEW
Elias stares at the timestamp. 6:42 PM. Not midnight.
His hand goes to his vest pocket. The empty prescription bottle is there. Small. Plastic. Useless.
HR REP
I know this is difficult.
Elias slowly looks up.
ELIAS
No, you don't.
A long silence.
HR REP
Your badge will deactivate at close of business.
The HR Rep slides his badge back across the table. Elias does not take it at first. Then he does.
CUT TO:
SCENE 5
INT. PHARMACY DISPENSARY - NIGHT
Harsh overhead lights. It is not a pharmacy with a counter and a human. It is an automated 24-hour MEDI-KIOSK built into the wall of a dying strip mall. A glowing touch screen. A scanner. A reinforced plexiglass window.
Behind the glass, Elias can see a mechanical armature—smaller and cleaner than Robot 4A, but moving with the same precise, relentless rhythm. It sorts pill bottles and white paper bags into individual pickup slots.
Elias stands at the terminal. The blood on his temple has dried nearly black. His injured shoulder is held tight against his body.
He places the empty prescription bottle under the barcode scanner. BEEP.
The screen flashes RED.
AUTOMATED VOICE
Patient: Lucia Morales. Refill authorized. Insurance status: Terminated.
ELIAS
Run it again. It was supposed to start at midnight.
AUTOMATED VOICE
Coverage terminated 6:42 PM. Out-of-pocket total: Two hundred eighty-six dollars and forty cents. Please tap payment.
Elias takes out his phone. His thumb leaves a faint smear of blood on the cracked glass. He opens his bank app.
BANK BALANCE: $19.12
Then another notification drops down. RGB PAYROLL UPDATE
He opens it.
FINAL PAY DEPOSIT: $14.00
DEDUCTION: PRODUCTIVITY VARIANCE
DEDUCTION: EQUIPMENT DELAY REVIEW
NET PAY: $14.00
Elias stares at it.
Behind the plexiglass, the small robotic armature picks up a white paper bag. His daughter's name is printed on the label. It drops the bag into slot 3. It is three inches away. Behind bulletproof glass.
AUTOMATED VOICE
Please tap payment.
Elias leans his forehead against the cold glass.
ELIAS
I need an override.
AUTOMATED VOICE
Command not recognized.
ELIAS
(Voice shaking)
She needs it tonight. When she can't breathe, she gets scared. And being scared makes it worse.
AUTOMATED VOICE
Command not recognized. Would you like to connect to a virtual billing agent?
ELIAS
Yes. Yes.
AUTOMATED VOICE
Current wait time is... forty-seven minutes. Please tap payment to dispense medication.
Elias closes his eyes. His phone vibrates again in his good hand. RGB SYSTEM UPDATE.
The screen glows RED.
ASSET 4A: RETURNED TO SERVICE
EFFICIENCY: 100%
ACTIVE TRAINING PROFILE: ELIAS MORALES
LAST CALIBRATION: GRIP PRESSURE CORRECTION
Elias reads it once. Then again.
The Medi-Kiosk screen blinks.
AUTOMATED VOICE
Transaction timed out. Returning medication to holding.
Behind the glass, the small armature retrieves the white bag from slot 3 and moves it back into the dark depths of the machine.
Elias watches it go. They fired him. They killed his coverage. They docked his pay. They kept the part of him that knew how to be gentle.
Elias looks at the empty prescription bottle sitting on the scanner tray. The purple dinosaur sticker is peeling off one side. He doesn't put it back in his pocket. He leaves it on the cold steel tray.
He turns away from the screen.
EXT. PHARMACY - CONTINUOUS
Elias steps into the night. Across the desert flats, far beyond the strip mall lights, the RGB warehouse glows like a machine that forgot the world was human.
Elias opens his pocket notebook. He flips past error codes, grip diagrams, calibration notes. At the back is a hand-drawn map:
RGB UTILITY ACCESS
SERVER ROOM
LOCAL TRAINING BACKUP
His hand trembles. Not from fear. From the last six hours of trying to stay a person in a world run by machines. He folds the notebook closed.
The warehouse HUM seems to rise from miles away.
CUT TO BLACK.
SCENE 6
INT. RGB UTILITY SERVER ROOM - NIGHT
High-contrast BLACK AND WHITE. The room is a claustrophobic maze of server racks, thick industrial cables, and pulsing RED indicator lights.
Elias slips inside. The heavy door clicks shut behind him.
He stands before the central AI mainframe terminal. He is not holding a flare. He is not here to burn anything down.
He sets his heavy, insulated wire cutters on the console. He types into the terminal.
The screen flashes RED:
TRAINING MODEL: SORT_ARM_4A
HUMAN CALIBRATION SOURCE: ELIAS MORALES
Elias’s finger hovers over the keyboard.
DELETE PROFILE? Y/N
He hesitates. It is the only thing he has left of his worth. He presses 'Y'.
The screen blinks. ERROR. ADMIN LOCK. ACCESS DENIED.
Elias stares at the screen. They won't even let him take his own ghost back.
He picks up the insulated cutters. He walks behind the server rack to the thick, primary fiber-optic data trunk feeding the AI’s learning model. He braces his bad shoulder. He squeezes the cutters.
The thick cable snaps. BANG.
A massive electrical arc blows Elias backward. Sparks shower the room like a waterfall.
The sparks rain down directly onto a temporary staging pallet of lithium-ion scanner batteries and dry cardboard packaging, shoved carelessly against the wall. The cardboard catches instantly. The batteries begin to pop and hiss.
Elias scrambles up, eyes wide. He grabs a small extinguisher from the wall, pulling the pin. He aims it, but a lithium battery violently ruptures, blowing a hole in the server rack and sending a jet of flame across the ceiling.
It is instantly out of control. Elias drops the extinguisher. He runs.
SCENE 7
INT. SECTOR 4 - CONTINUOUS
A blaring klaxon shatters the warehouse hum. Strobe lights flash.
The fire is spreading with terrifying speed, chewing through the endless aisles of cardboard. Thick, black smoke begins to choke the cavernous space.
AUTOMATED VOICE (V.O.)
Thermal anomaly detected. Initiating Sector 4 lockdown.
Massive steel blast doors begin to drop at the end of the aisle.
Elias sprints for the exit, his bad leg dragging, his breathing ragged. He hits a manual fire alarm pull-station on a concrete pillar. He yanks it down.
A small digital screen above the handle flashes RED : SYSTEM OVERRIDE. PLEASE WAIT.
Above him, the intense heat warps the steel of a towering inventory rack. It groans, twists, and snaps. The rack collapses.
Elias dives, but a cascade of heavy boxes and searing metal crashes down, pinning his legs and lower torso to the floor. He shoves frantically at the weight. It won't move. He is completely trapped.
From his chest pocket, the folded, lined school paper slips out. Lucia's drawing of the robot with shoes. It lands on the concrete, inches from his face, just out of reach. The edges of the paper begin to curl and brown from the heat.
The flames climb the walls. The smoke is blinding.
SCENE 8
INT. SECTOR 4 - CONTINUOUS
Through the heavy haze, a massive silhouette emerges. It’s Robot 4A.
The machine halts. Its optical sensors whir, scanning the smoke, scanning the trapped man on the floor.
The terminal on its base flashes RED : EVACUATION PROTOCOL: ACTIVE. PROCEED TO DOCKING.
It hovers, locked in its loop. It is supposed to leave. Elias looks up at it. His vision is blurring. He stops struggling.
The robot's arm twitches. It breaks its path.
It lowers its heavy titanium chassis. It wedges its pneumatic claws directly beneath the burning steel rack pinning Elias. The robot’s hydraulic joints scream as it attempts to lift. But it grabs the rack too close to Elias's leg.
It squeezes with maximum force. The twisted steel presses down harder onto Elias's fractured bone.
Elias screams. The machine is crushing him while trying to save him.
The terminal flashes RED : LOAD INSTABILITY.
Elias forces his eyes open. He reaches out with a violently shaking, bloodied hand. He finds the machine's cold metal chassis.
Tap. Tap.
He taps it twice. The robot freezes.
The terminal flashes RED : MANUAL OVERRIDE: GRIP PRESSURE CORRECTION.
The robot recalibrates. It slowly loosens its pneumatic claws. It shifts two inches to the left, finding the exact center of gravity. Not harder. Smarter.
It lifts. Sparks shower from its servos. The metal whines in agonizing protest, but the rack rises. Just enough.
Elias scrambles, dragging his battered body out from under the crushing weight. He grabs Lucia's drawing from the floor and collapses onto the clear concrete. He looks back.
Robot 4A's hydraulics blow with a violent POP . The chassis gives out entirely. The burning rack crashes back down, crushing the armature completely. It dies on the floor.
SCENE 9
EXT. DESERT NIGHT - LATER
For the first time in the film, true color invades the black-and-white world. Ugly, warm, violent AMBER and ORANGE light spills across the desert dirt.
The massive RGB facility is fully ablaze, a towering inferno against the dark sky. Sirens wail in the far distance, growing louder.
Elias sits in the dirt by his rusted sedan. His face is illuminated by the flickering fire. He watches the roof of Sector 4 cave in, sending a plume of sparks into the stars.
His phone buzzes on the dirt beside him. The cracked screen glows.
VOICE MESSAGE FROM LUCIA.
He cannot answer. His hands are shaking too badly. He is covered in soot and blood.
He opens his palm. Inside is Lucia's drawing. The edges are burned black. The stick figure labeled "DAD" is smeared with ash, but the robot with shoes is still visible.
He looks at the burning facility. He is not triumphant. He is not redeemed. He is not damned. He is just alive, and tomorrow he still has to find a way to pay for the purple one.
The audio of the voice memo begins to play from the phone in the dirt, tinny and small under the deafening wail of the approaching sirens.
LUCIA (V.O.)
Dad? Don't forget the purple one.
Elias closes his hand over the drawing.
CUT TO BLACK.

</Script:module>

Sources:

https://en.wikipedia.org/wiki/The_Yukon_Trail
https://en.wikipedia.org/wiki/The_Dig_(video_game)
https://www.reddit.com/r/MoonlightStreaming/comments/1ryrpa1/for_steam_deck_what_the_best_clientin_game/

https://www.kodeco.com/41495624-targeting-the-steam-deck-with-godot
https://gamefaqs.gamespot.com/pc/582080-the-yukon-trail/faqs/12185
