#!/usr/bin/env python3
"""Generates rich, high-fidelity vector illustrations and renders them into the
4-file compliance set for all remaining Season 0 economy itemdefs.
"""
import os
import subprocess
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROCESS_SCRIPT = os.path.join(ROOT, "scripts/process-season-assets.py")

SVG_TEMPLATES = {
    # Rig Module: 4146
    "mod_symbiotic_adrenaline_pump": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="fluidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="50%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#b91c1c"/>
        </linearGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f87171" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="12" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- Base Cartridge -->
      <rect x="262" y="162" width="500" height="700" rx="40" fill="url(#bodyGrad)" stroke="#64748b" stroke-width="12"/>
      <rect x="292" y="192" width="440" height="640" rx="30" fill="#090d16" stroke="#475569" stroke-width="6"/>
      <!-- Gold Connector Pins -->
      <g fill="#eab308">
        <rect x="362" y="862" width="30" height="80" rx="4"/>
        <rect x="422" y="862" width="30" height="80" rx="4"/>
        <rect x="482" y="862" width="30" height="80" rx="4"/>
        <rect x="542" y="862" width="30" height="80" rx="4"/>
        <rect x="602" y="862" width="30" height="80" rx="4"/>
      </g>
      <!-- Adrenaline Ampoule -->
      <rect x="432" y="260" width="160" height="380" rx="80" fill="#1e293b" stroke="#94a3b8" stroke-width="10"/>
      <rect x="442" y="290" width="140" height="330" rx="70" fill="url(#fluidGrad)" filter="url(#glow)"/>
      <circle cx="512" cy="455" r="90" fill="url(#glowGrad)"/>
      <!-- Biological Vein Details -->
      <path d="M472,320 Q512,380 462,450 T532,550" stroke="#fca5a5" stroke-width="6" fill="none" opacity="0.8"/>
      <path d="M552,340 Q502,420 562,490 T492,580" stroke="#fca5a5" stroke-width="6" fill="none" opacity="0.8"/>
      <!-- Mechanical Endcaps and Injector -->
      <rect x="412" y="240" width="200" height="40" rx="10" fill="#64748b" stroke="#cbd5e1" stroke-width="6"/>
      <rect x="412" y="620" width="200" height="40" rx="10" fill="#64748b" stroke="#cbd5e1" stroke-width="6"/>
      <polygon points="512,740 482,660 542,660" fill="#94a3b8" stroke="#cbd5e1" stroke-width="6"/>
      <!-- Digital HUD Readout -->
      <rect x="332" y="700" width="360" height="80" rx="12" fill="#0f172a" stroke="#dc2626" stroke-width="4"/>
      <text x="512" y="750" fill="#ef4444" font-family="monospace" font-size="32" font-weight="bold" text-anchor="middle">BPM: 185 ▲ OVERDRIVE</text>
    </svg>
    """,

    # Audio & HUD: 4148-4153
    "voicepack_soviet_commander": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <radialGradient id="metal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
      </defs>
      <!-- Background Shield -->
      <circle cx="512" cy="512" r="400" fill="url(#metal)" stroke="#94a3b8" stroke-width="16"/>
      <circle cx="512" cy="512" r="360" fill="#1e293b" stroke="#ef4444" stroke-width="8"/>
      <!-- Military Headset Frame -->
      <path d="M280,520 C280,320 744,320 744,520" fill="none" stroke="#64748b" stroke-width="32" stroke-linecap="round"/>
      <!-- Ear Cups -->
      <rect x="230" y="460" width="100" height="180" rx="30" fill="#334155" stroke="#94a3b8" stroke-width="10"/>
      <rect x="694" y="460" width="100" height="180" rx="30" fill="#334155" stroke="#94a3b8" stroke-width="10"/>
      <!-- Red Star Emblem -->
      <polygon points="512,380 545,470 640,470 565,525 595,615 512,560 429,615 459,525 384,470 479,470" fill="#ef4444" stroke="#fbbf24" stroke-width="8"/>
      <!-- Boom Microphone -->
      <path d="M300,580 Q340,700 460,700" fill="none" stroke="#94a3b8" stroke-width="16" stroke-linecap="round"/>
      <rect x="460" y="670" width="80" height="60" rx="15" fill="#1e293b" stroke="#ef4444" stroke-width="8"/>
      <!-- Cyrillic Sub-Commander Text -->
      <text x="512" y="800" fill="#f8fafc" font-family="sans-serif" font-size="44" font-weight="900" text-anchor="middle" letter-spacing="4">КОМАНДИР // V.01</text>
    </svg>
    """,

    "voicepack_aura": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <radialGradient id="aiCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="30%" stop-color="#38bdf8"/>
          <stop offset="70%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </radialGradient>
        <filter id="cyanGlow">
          <feGaussianBlur stdDeviation="16" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- Outer Soundwave Rings -->
      <circle cx="512" cy="512" r="420" fill="none" stroke="#0284c7" stroke-width="4" opacity="0.4"/>
      <circle cx="512" cy="512" r="360" fill="none" stroke="#38bdf8" stroke-width="8" stroke-dasharray="20 15" opacity="0.7"/>
      <circle cx="512" cy="512" r="300" fill="none" stroke="#7dd3fc" stroke-width="12" filter="url(#cyanGlow)"/>
      <!-- Central Core Orb -->
      <circle cx="512" cy="512" r="180" fill="url(#aiCore)" filter="url(#cyanGlow)"/>
      <!-- Waveform Ribbons -->
      <path d="M260,512 Q380,360 512,512 T764,512" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
      <path d="M260,512 Q380,664 512,512 T764,512" fill="none" stroke="#e0f2fe" stroke-width="8" stroke-linecap="round"/>
      <text x="512" y="800" fill="#38bdf8" font-family="monospace" font-size="48" font-weight="900" text-anchor="middle" letter-spacing="8">AI:AURA // SYNTH</text>
    </svg>
    """,

    "hudtheme_amber_crt": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <linearGradient id="amberScan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
      <!-- CRT Bezel -->
      <rect x="162" y="162" width="700" height="700" rx="80" fill="#1e293b" stroke="#d97706" stroke-width="20"/>
      <!-- Phosphor Glass Screen -->
      <rect x="212" y="212" width="600" height="600" rx="40" fill="#451a03" stroke="#f59e0b" stroke-width="8"/>
      <!-- Scanlines -->
      <g stroke="#f59e0b" stroke-width="2" opacity="0.3">
        <line x1="212" y1="280" x2="812" y2="280"/>
        <line x1="212" y1="340" x2="812" y2="340"/>
        <line x1="212" y1="400" x2="812" y2="400"/>
        <line x1="212" y1="460" x2="812" y2="460"/>
        <line x1="212" y1="520" x2="812" y2="520"/>
        <line x1="212" y1="580" x2="812" y2="580"/>
        <line x1="212" y1="640" x2="812" y2="640"/>
        <line x1="212" y1="700" x2="812" y2="700"/>
      </g>
      <!-- Oscilloscope Waveform -->
      <path d="M240,512 L340,512 L380,360 L440,660 L500,420 L540,580 L580,512 L780,512" fill="none" stroke="#fbbf24" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="260" y="300" fill="#f59e0b" font-family="monospace" font-size="36" font-weight="bold">> SYS_TERMINAL_1984</text>
      <text x="260" y="750" fill="#f59e0b" font-family="monospace" font-size="32">RAD: 0.04 mSv [NORMAL]</text>
    </svg>
    """,

    "hudtheme_emerald_radar": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <radialGradient id="emeraldBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#064e3b"/>
          <stop offset="100%" stop-color="#022c22"/>
        </radialGradient>
      </defs>
      <!-- Scope Bezel -->
      <circle cx="512" cy="512" r="420" fill="url(#emeraldBg)" stroke="#10b981" stroke-width="20"/>
      <!-- Concentric Range Rings -->
      <circle cx="512" cy="512" r="340" fill="none" stroke="#059669" stroke-width="4"/>
      <circle cx="512" cy="512" r="240" fill="none" stroke="#059669" stroke-width="6"/>
      <circle cx="512" cy="512" r="140" fill="none" stroke="#059669" stroke-width="4"/>
      <!-- Crosshairs -->
      <line x1="92" y1="512" x2="932" y2="512" stroke="#10b981" stroke-width="6"/>
      <line x1="512" y1="92" x2="512" y2="932" stroke="#10b981" stroke-width="6"/>
      <!-- Radar Sweep Cone -->
      <path d="M512,512 L750,270 A340,340 0 0,0 512,172 Z" fill="#34d399" opacity="0.35"/>
      <!-- Hostile Target Blips -->
      <circle cx="620" cy="380" r="14" fill="#ef4444" stroke="#ffffff" stroke-width="4"/>
      <circle cx="410" cy="310" r="10" fill="#34d399"/>
      <circle cx="680" cy="620" r="12" fill="#34d399"/>
      <text x="512" y="850" fill="#34d399" font-family="monospace" font-size="36" font-weight="bold" text-anchor="middle">SONAR RADAR // ACTIVE</text>
    </svg>
    """,

    "fx_emerald_void_tracer": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <linearGradient id="tracerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0"/>
          <stop offset="60%" stop-color="#10b981" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#ffffff"/>
        </linearGradient>
        <filter id="emeraldGlow">
          <feGaussianBlur stdDeviation="20" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- Outer Hexagon Cartridge -->
      <polygon points="512,100 860,300 860,724 512,924 164,724 164,300" fill="#064e3b" stroke="#10b981" stroke-width="16"/>
      <!-- Plasma Beam Tracer -->
      <path d="M200,512 L780,512" stroke="url(#tracerGrad)" stroke-width="40" stroke-linecap="round" filter="url(#emeraldGlow)"/>
      <path d="M200,512 L780,512" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/>
      <!-- Particle Sparks -->
      <circle cx="780" cy="512" r="50" fill="#6ee7b7" filter="url(#emeraldGlow)"/>
      <circle cx="780" cy="512" r="25" fill="#ffffff"/>
      <text x="512" y="820" fill="#34d399" font-family="monospace" font-size="40" font-weight="bold" text-anchor="middle">EMERALD TRACER FX</text>
    </svg>
    """,

    "fx_cryo_shockwave_muzzle": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <radialGradient id="frostBurst" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="40%" stop-color="#38bdf8"/>
          <stop offset="80%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
        <filter id="cryoGlow">
          <feGaussianBlur stdDeviation="18" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- Sub-Zero Frost Burst -->
      <circle cx="512" cy="512" r="400" fill="#082f49" stroke="#38bdf8" stroke-width="16"/>
      <!-- Radial Ice Crystals -->
      <g stroke="#e0f2fe" stroke-width="12" fill="#38bdf8" filter="url(#cryoGlow)">
        <polygon points="512,180 532,460 512,512 492,460"/>
        <polygon points="512,844 532,564 512,512 492,564"/>
        <polygon points="180,512 460,532 512,512 460,492"/>
        <polygon points="844,512 564,532 512,512 564,492"/>
        <!-- Diagonals -->
        <polygon points="278,278 476,460 512,512 460,476"/>
        <polygon points="746,746 548,564 512,512 564,548"/>
        <polygon points="746,278 564,476 512,512 548,460"/>
        <polygon points="278,746 460,548 512,512 476,564"/>
      </g>
      <circle cx="512" cy="512" r="90" fill="#ffffff" filter="url(#cryoGlow)"/>
      <text x="512" y="930" fill="#7dd3fc" font-family="monospace" font-size="36" font-weight="bold" text-anchor="middle">CRYO MUZZLE SHOCKWAVE</text>
    </svg>
    """,

    # Decals & Insignia: 4120-4125, 4127-4129
    "decal_subzero_pioneer": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Shield Patch -->
      <path d="M212,180 L812,180 L812,580 Q812,840 512,920 Q212,840 212,580 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="24"/>
      <path d="M242,210 L782,210 L782,560 Q782,800 512,870 Q242,800 242,560 Z" fill="#1e293b" stroke="#e0f2fe" stroke-width="8"/>
      <!-- Crossed Ice Axes -->
      <line x1="320" y1="320" x2="704" y2="704" stroke="#94a3b8" stroke-width="24" stroke-linecap="round"/>
      <line x1="704" y1="320" x2="320" y2="704" stroke="#94a3b8" stroke-width="24" stroke-linecap="round"/>
      <!-- Central Mountain Peak -->
      <polygon points="512,300 680,620 344,620" fill="#38bdf8" stroke="#ffffff" stroke-width="12"/>
      <polygon points="512,300 580,420 512,460 444,420" fill="#ffffff"/>
      <text x="512" y="740" fill="#f8fafc" font-family="sans-serif" font-size="44" font-weight="900" text-anchor="middle" letter-spacing="4">SUB-ZERO PIONEER</text>
    </svg>
    """,

    "decal_radiation_trefoil": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Caution Octagon -->
      <polygon points="340,112 684,112 912,340 912,684 684,912 340,912 112,684 112,340" fill="#f59e0b" stroke="#000000" stroke-width="32"/>
      <!-- Trefoil Center -->
      <circle cx="512" cy="512" r="70" fill="#000000"/>
      <!-- Blades -->
      <path d="M512,512 L430,230 A300,300 0 0,1 594,230 Z" fill="#000000"/>
      <path d="M512,512 L756,650 A300,300 0 0,1 674,790 Z" fill="#000000"/>
      <path d="M512,512 L268,650 A300,300 0 0,0 350,790 Z" fill="#000000"/>
    </svg>
    """,

    "decal_sporesnail_hunter_crest": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Shield -->
      <circle cx="512" cy="512" r="400" fill="#064e3b" stroke="#10b981" stroke-width="24"/>
      <!-- Snail Shell Spiral -->
      <path d="M512,512 M512,512 A50,50 0 0,1 562,512 A100,100 0 0,1 462,512 A150,150 0 0,1 612,512 A200,200 0 0,1 362,512 A250,250 0 0,1 712,512" fill="none" stroke="#34d399" stroke-width="32" stroke-linecap="round"/>
      <!-- Spore Nodes -->
      <circle cx="612" cy="380" r="25" fill="#a7f3d0" stroke="#064e3b" stroke-width="6"/>
      <circle cx="362" cy="440" r="20" fill="#a7f3d0" stroke="#064e3b" stroke-width="6"/>
      <circle cx="512" cy="700" r="30" fill="#a7f3d0" stroke="#064e3b" stroke-width="6"/>
      <text x="512" y="850" fill="#f0fdf4" font-family="sans-serif" font-size="44" font-weight="900" text-anchor="middle" letter-spacing="4">HIVE PURGE VETERAN</text>
    </svg>
    """,

    "decal_bunker404_lost_squad": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <polygon points="512,120 880,300 880,724 512,904 144,724 144,300" fill="#1e293b" stroke="#ef4444" stroke-width="24"/>
      <!-- Severed Drill Bit -->
      <polygon points="512,280 600,480 424,480" fill="#94a3b8" stroke="#cbd5e1" stroke-width="10"/>
      <rect x="472" y="480" width="80" height="120" fill="#64748b"/>
      <!-- Wing Memorial Flares -->
      <path d="M424,420 L240,360 L300,500 L424,480" fill="#ef4444"/>
      <path d="M600,420 L784,360 L724,500 L600,480" fill="#ef4444"/>
      <text x="512" y="700" fill="#ffffff" font-family="sans-serif" font-size="80" font-weight="900" text-anchor="middle">404</text>
      <text x="512" y="780" fill="#f87171" font-family="sans-serif" font-size="36" font-weight="bold" text-anchor="middle">LOST SQUADRON</text>
    </svg>
    """,

    "decal_cyber_skull_tactical_pin": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Chrome Skull Silhouette -->
      <circle cx="512" cy="512" r="400" fill="#0f172a" stroke="#38bdf8" stroke-width="20"/>
      <!-- Cranium -->
      <path d="M340,460 C340,300 684,300 684,460 C684,540 640,600 600,640 L600,740 L424,740 L424,640 C384,600 340,540 340,460 Z" fill="#94a3b8" stroke="#ffffff" stroke-width="12"/>
      <!-- Cyan Ocular Sensors -->
      <circle cx="430" cy="480" r="45" fill="#38bdf8" stroke="#0284c7" stroke-width="10"/>
      <circle cx="594" cy="480" r="45" fill="#38bdf8" stroke="#0284c7" stroke-width="10"/>
      <!-- Cyber HUD Reticle Over Left Eye -->
      <circle cx="430" cy="480" r="70" fill="none" stroke="#38bdf8" stroke-width="6" stroke-dasharray="15 10"/>
      <!-- Teeth Matrix -->
      <rect x="450" y="680" width="24" height="40" fill="#0f172a"/>
      <rect x="486" y="680" width="24" height="40" fill="#0f172a"/>
      <rect x="522" y="680" width="24" height="40" fill="#0f172a"/>
      <rect x="558" y="680" width="24" height="40" fill="#0f172a"/>
      <text x="512" y="860" fill="#38bdf8" font-family="monospace" font-size="40" font-weight="900" text-anchor="middle">CYBER-SKULL MK.IX</text>
    </svg>
    """,

    "decal_cryo_phoenix": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Shield -->
      <circle cx="512" cy="512" r="410" fill="#082f49" stroke="#7dd3fc" stroke-width="20"/>
      <!-- Phoenix Wings -->
      <path d="M512,680 Q320,540 180,300 Q360,340 512,500 Q664,340 844,300 Q704,540 512,680 Z" fill="#38bdf8" stroke="#e0f2fe" stroke-width="12"/>
      <!-- Head & Crest -->
      <polygon points="512,300 540,390 512,430 484,390" fill="#ffffff"/>
      <polygon points="512,240 530,300 494,300" fill="#7dd3fc"/>
      <!-- Ice Flares -->
      <polygon points="512,700 460,820 512,770 564,820" fill="#0284c7" stroke="#38bdf8" stroke-width="8"/>
      <text x="512" y="890" fill="#f0f9ff" font-family="sans-serif" font-size="44" font-weight="900" text-anchor="middle" letter-spacing="4">CRYO PHOENIX</text>
    </svg>
    """,

    "decal_void_horizon_sigil": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <defs>
        <radialGradient id="voidCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000"/>
          <stop offset="60%" stop-color="#581c87"/>
          <stop offset="90%" stop-color="#a855f7"/>
          <stop offset="100%" stop-color="#c084fc"/>
        </radialGradient>
      </defs>
      <circle cx="512" cy="512" r="410" fill="#0f172a" stroke="#a855f7" stroke-width="20"/>
      <!-- Gravitational Ring -->
      <ellipse cx="512" cy="512" rx="360" ry="140" fill="none" stroke="#c084fc" stroke-width="24" transform="rotate(-30 512 512)"/>
      <circle cx="512" cy="512" r="180" fill="url(#voidCore)"/>
      <circle cx="512" cy="512" r="120" fill="#000000" stroke="#a855f7" stroke-width="10"/>
      <text x="512" y="870" fill="#d8b4fe" font-family="monospace" font-size="40" font-weight="bold" text-anchor="middle">VOID HORIZON SIGIL</text>
    </svg>
    """,

    "decal_ancient_core_glyphs": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Ancient Stone Tablet -->
      <rect x="212" y="162" width="600" height="700" rx="30" fill="#1e293b" stroke="#64748b" stroke-width="24"/>
      <!-- Glowing Hieroglyphic Glyphs -->
      <g stroke="#38bdf8" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Row 1 -->
        <circle cx="360" cy="300" r="40"/>
        <path d="M360,260 L360,340 M320,300 L400,300"/>
        <polygon points="512,260 552,340 472,340"/>
        <path d="M640,260 Q680,300 640,340 T640,380"/>
        <!-- Row 2 -->
        <path d="M320,460 L400,460 L360,540 Z"/>
        <circle cx="512" cy="500" r="50"/>
        <circle cx="512" cy="500" r="20" fill="#38bdf8"/>
        <path d="M640,460 L700,500 L640,540"/>
        <!-- Row 3 -->
        <path d="M320,660 H400 M360,620 V700"/>
        <path d="M472,660 Q512,620 552,660 T632,660"/>
        <polygon points="680,620 720,700 640,700"/>
      </g>
      <text x="512" y="800" fill="#7dd3fc" font-family="monospace" font-size="32" text-anchor="middle">STRATUM-0 ARTIFACT</text>
    </svg>
    """,

    "decal_grand_marshal_relic_crest": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Imperial Crest Shield -->
      <path d="M212,180 L812,180 L812,580 Q812,860 512,940 Q212,860 212,580 Z" fill="#451a03" stroke="#eab308" stroke-width="28"/>
      <!-- Imperial Double-Headed Eagle -->
      <g fill="#facc15" stroke="#78350f" stroke-width="8">
        <!-- Wings -->
        <path d="M512,500 L300,320 L360,460 L240,440 L340,580 L220,580 L380,720 L512,600 Z"/>
        <path d="M512,500 L724,320 L664,460 L784,440 L684,580 L804,580 L644,720 L512,600 Z"/>
        <!-- Imperial Crown -->
        <polygon points="512,240 460,300 480,340 544,340 564,300"/>
        <!-- Scepter and Orb -->
        <circle cx="380" cy="740" r="25" fill="#fef08a"/>
        <circle cx="644" cy="740" r="25" fill="#fef08a"/>
      </g>
      <text x="512" y="880" fill="#fef08a" font-family="serif" font-size="44" font-weight="bold" text-anchor="middle" letter-spacing="4">GRAND MARSHAL</text>
    </svg>
    """,

    # Chassis Armors: 4112-4119
    "chassis_subterran_drill_engineer": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Industrial Hazard Helmet & Armor -->
      <path d="M340,320 C340,180 684,180 684,320 L724,540 L824,680 L824,900 L200,900 L200,680 L300,540 Z" fill="#eab308" stroke="#1e293b" stroke-width="20"/>
      <!-- Dark Visor & Halogen Searchlight -->
      <ellipse cx="512" cy="400" rx="140" ry="70" fill="#0f172a" stroke="#cbd5e1" stroke-width="12"/>
      <circle cx="512" cy="220" r="50" fill="#ffffff" stroke="#eab308" stroke-width="16"/>
      <!-- Hazard Stripes on Chest -->
      <g fill="#1e293b">
        <polygon points="300,720 380,720 320,840 240,840"/>
        <polygon points="440,720 520,720 460,840 380,840"/>
        <polygon points="580,720 660,720 600,840 520,840"/>
        <polygon points="720,720 800,720 740,840 660,840"/>
      </g>
      <text x="512" y="880" fill="#0f172a" font-family="monospace" font-size="36" font-weight="900" text-anchor="middle">DRILL ENGINEER CHASSIS</text>
    </svg>
    """,

    "chassis_cryo_vanguard_scout": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Arctic White/Cyan Armor -->
      <path d="M360,300 C360,180 664,180 664,300 L704,500 L804,640 L804,880 L220,880 L220,640 L320,500 Z" fill="#f8fafc" stroke="#38bdf8" stroke-width="20"/>
      <!-- Sleek Cyan Visor Slit -->
      <polygon points="380,380 644,380 614,440 410,440" fill="#0284c7" stroke="#38bdf8" stroke-width="8"/>
      <!-- Chest Core & Conduits -->
      <circle cx="512" cy="640" r="60" fill="#38bdf8" stroke="#ffffff" stroke-width="10"/>
      <path d="M512,700 L512,840 M452,640 L300,700 M572,640 L724,700" stroke="#38bdf8" stroke-width="12"/>
      <text x="512" y="850" fill="#0369a1" font-family="sans-serif" font-size="36" font-weight="900" text-anchor="middle">CRYO VANGUARD SCOUT</text>
    </svg>
    """,

    "chassis_trench_warden_heavy": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Heavy Riveted Steel Cuirass & Respirator -->
      <path d="M320,320 C320,180 704,180 704,320 L764,520 L864,660 L864,900 L160,900 L160,660 L260,520 Z" fill="#334155" stroke="#94a3b8" stroke-width="20"/>
      <!-- Respirator Canisters -->
      <circle cx="420" cy="460" r="50" fill="#1e293b" stroke="#cbd5e1" stroke-width="8"/>
      <circle cx="604" cy="460" r="50" fill="#1e293b" stroke="#cbd5e1" stroke-width="8"/>
      <!-- Blast Shield Chest Plate -->
      <rect x="340" y="600" width="344" height="220" rx="20" fill="#1e293b" stroke="#ef4444" stroke-width="10"/>
      <text x="512" y="730" fill="#f87171" font-family="sans-serif" font-size="44" font-weight="900" text-anchor="middle">WARDEN</text>
    </svg>
    """,

    "chassis_void_commando_recon": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Matte Black Carbon Recon Suit -->
      <path d="M360,300 C360,180 664,180 664,300 L704,500 L804,640 L804,880 L220,880 L220,640 L320,500 Z" fill="#0f172a" stroke="#a855f7" stroke-width="20"/>
      <!-- Multi-Lens Purple Optic Array -->
      <circle cx="440" cy="380" r="30" fill="#c084fc" stroke="#581c87" stroke-width="8"/>
      <circle cx="584" cy="380" r="30" fill="#c084fc" stroke="#581c87" stroke-width="8"/>
      <circle cx="512" cy="450" r="24" fill="#c084fc" stroke="#581c87" stroke-width="6"/>
      <!-- Chest Carbon Weave -->
      <polygon points="512,560 660,680 512,820 364,680" fill="#1e1b4b" stroke="#a855f7" stroke-width="10"/>
      <text x="512" y="710" fill="#e9d5ff" font-family="monospace" font-size="32" font-weight="bold" text-anchor="middle">VOID RECON</text>
    </svg>
    """,

    "chassis_bio_synthesizer_medic": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <path d="M340,320 C340,180 684,180 684,320 L724,540 L824,680 L824,900 L200,900 L200,680 L300,540 Z" fill="#064e3b" stroke="#10b981" stroke-width="20"/>
      <!-- Bio Vial Harness -->
      <rect x="432" y="360" width="160" height="200" rx="30" fill="#10b981" stroke="#ffffff" stroke-width="8"/>
      <path d="M300,640 Q512,740 724,640" stroke="#34d399" stroke-width="18" fill="none"/>
      <!-- Caduceus / Cross -->
      <rect x="482" y="660" width="60" height="160" fill="#ffffff"/>
      <rect x="432" y="710" width="160" height="60" fill="#ffffff"/>
      <text x="512" y="870" fill="#a7f3d0" font-family="sans-serif" font-size="36" font-weight="900" text-anchor="middle">BIO-SYNTHESIZER</text>
    </svg>
    """,

    "chassis_dreadnought_exo_juggernaut": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Massive Power Armor -->
      <path d="M280,340 C280,160 744,160 744,340 L804,540 L924,680 L924,920 L100,920 L100,680 L220,540 Z" fill="#18181b" stroke="#f97316" stroke-width="24"/>
      <!-- Magma Furnace Chest Grate -->
      <rect x="362" y="580" width="300" height="220" rx="20" fill="#451a03" stroke="#f97316" stroke-width="12"/>
      <circle cx="512" cy="690" r="70" fill="#f97316" filter="drop-shadow(0 0 20px #ea580c)"/>
      <line x1="412" y1="620" x2="412" y2="760" stroke="#18181b" stroke-width="12"/>
      <line x1="462" y1="620" x2="462" y2="760" stroke="#18181b" stroke-width="12"/>
      <line x1="512" y1="620" x2="512" y2="760" stroke="#18181b" stroke-width="12"/>
      <line x1="562" y1="620" x2="562" y2="760" stroke="#18181b" stroke-width="12"/>
      <line x1="612" y1="620" x2="612" y2="760" stroke="#18181b" stroke-width="12"/>
      <text x="512" y="870" fill="#fb923c" font-family="sans-serif" font-size="44" font-weight="900" text-anchor="middle">JUGGERNAUT</text>
    </svg>
    """,

    "chassis_cyber_spectre_infiltrator": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <path d="M360,300 C360,180 664,180 664,300 L704,500 L804,640 L804,880 L220,880 L220,640 L320,500 Z" fill="#0f172a" stroke="#06b6d4" stroke-width="20"/>
      <!-- Active Camo Hexagon Mesh -->
      <g stroke="#06b6d4" stroke-width="4" fill="none" opacity="0.6">
        <polygon points="512,380 540,400 540,430 512,450 484,430 484,400"/>
        <polygon points="450,440 478,460 478,490 450,510 422,490 422,460"/>
        <polygon points="574,440 602,460 602,490 574,510 546,490 546,460"/>
      </g>
      <text x="512" y="760" fill="#22d3ee" font-family="monospace" font-size="40" font-weight="900" text-anchor="middle">CYBER SPECTRE</text>
    </svg>
    """,

    "chassis_hive_lord_symbiote": """
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
      <!-- Living Alien Chitin Carapace -->
      <path d="M280,320 C280,140 744,140 744,320 L844,520 L904,680 L844,920 L180,920 L120,680 L180,520 Z" fill="#2e1065" stroke="#c084fc" stroke-width="24"/>
      <!-- Chitin Horns & Crown -->
      <polygon points="340,240 260,100 400,180" fill="#7e22ce" stroke="#e9d5ff" stroke-width="8"/>
      <polygon points="684,240 764,100 624,180" fill="#7e22ce" stroke="#e9d5ff" stroke-width="8"/>
      <polygon points="512,180 512,60 550,140" fill="#a855f7" stroke="#e9d5ff" stroke-width="8"/>
      <!-- Pulsing Hive Heart -->
      <circle cx="512" cy="620" r="100" fill="#a855f7" stroke="#f43f5e" stroke-width="16"/>
      <circle cx="512" cy="620" r="60" fill="#fb7185"/>
      <text x="512" y="870" fill="#fdf4ff" font-family="sans-serif" font-size="48" font-weight="900" text-anchor="middle" letter-spacing="6">HIVE-LORD SYMBIOTE</text>
    </svg>
    """
}

def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        for slug, svg_content in SVG_TEMPLATES.items():
            svg_path = os.path.join(tmpdir, f"{slug}.svg")
            png_path = os.path.join(tmpdir, f"{slug}.png")
            with open(svg_path, "w") as f:
                f.write(svg_content.strip())
            
            # Render SVG to 1254x1254 PNG with ImageMagick
            cmd = ["convert", "-background", "none", "-density", "300", "-resize", "1254x1254", svg_path, png_path]
            subprocess.run(cmd, check=True)
            
            # Process through standard pipeline
            proc_cmd = ["python3", PROCESS_SCRIPT, png_path, slug]
            subprocess.run(proc_cmd, check=True)
            print(f"[generated & processed] {slug}")

if __name__ == "__main__":
    main()
