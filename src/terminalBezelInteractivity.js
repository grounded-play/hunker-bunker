/**
 * Diegetic Terminal Bezel Interactivity & Secret Maintenance Hatch
 *
 * Provides tactile, reactive physics and audio to terminal bezels:
 * - 12-key numeric keypad with electronic chirps & secret override PIN codes.
 * - Spring-loaded coin return lever with clink feedback & spare coin drops.
 * - Wobbling analog pressure gauge dial.
 * - Diagnostic status LEDs with self-test flickers.
 * - 4 rotating corner hex screws with ratcheting sounds.
 * - Secret maintenance hatch that drops open when all 4 screws are loosened,
 *   revealing 4 toggleable DIP switches (CRT overclock, green monochrome,
 *   sub-bass audio, free-play) and an overclock fuse with salvage rewards.
 */

import { t } from './i18n.js';

export const SECRET_PIN_CODES = Object.freeze({
    '0451': { message: 'OVERRIDE: MERIDIAN COMPONENT STASH DISPENSED (+25 COIN)', reward: { coin: 25 } },
    '1984': { message: 'MINISTRY OF TRUTH ONLINE // SYSTEM SURVEILLANCE ACTIVE', reward: null },
    '8008': { message: 'DIAGNOSTIC HUMOR PROTOCOL: 100% OPERATIONAL :)', reward: null },
    '7734': { message: 'HELLO FROM SECTOR ZERO // AUDIO DRIVER SYNTH BEAT', reward: null },
    '0000': { message: 'FACTORY DEFAULT RESTORED // BEZEL CALIBRATION OK', reward: null }
});

export class TerminalBezelController {
    constructor({ container = null, audio = null, bank = null, doc = null } = {}) {
        this.container = container;
        this.doc = doc ?? (typeof document !== 'undefined' ? document : null);
        this.audio = audio ?? (typeof window !== 'undefined' ? window.AudioManager : null);
        this.bank = bank ?? (typeof window !== 'undefined' ? window.bankManager : null);
        this.keypadBuffer = '';
        this.screws = { tl: 0, tr: 0, bl: 0, br: 0 };
        this.hatchOpen = false;
        this.fuseClaimed = false;
        this.dipSwitches = {
            overclock: false,
            greenPhosphor: false,
            subBass: false,
            freePlay: false
        };
        this.coinReturnClicks = 0;
        this._initDom();
    }

    _play(cue, options = {}) {
        try {
            if (this.audio?.play) {
                this.audio.play(cue, options);
            }
        } catch {
            // Audio context may be unprimed in headless test
        }
    }

    _initDom() {
        if (!this.container) return;

        // Ensure interactive bezel controls container exists
        let bezelControls = this.container.querySelector?.('.bezel-interactive-layer');
        if (!bezelControls && this.doc?.createElement) {
            bezelControls = this.doc.createElement('div');
            bezelControls.className = 'bezel-interactive-layer';
            bezelControls.innerHTML = `
                <!-- 4 Interactive Corner Hex Screws -->
                <button type="button" class="bezel-hex-screw screw-tl" data-screw="tl" title="Hex Bolt TL" aria-label="Hex Bolt Top Left"></button>
                <button type="button" class="bezel-hex-screw screw-tr" data-screw="tr" title="Hex Bolt TR" aria-label="Hex Bolt Top Right"></button>
                <button type="button" class="bezel-hex-screw screw-bl" data-screw="bl" title="Hex Bolt BL" aria-label="Hex Bolt Bottom Left"></button>
                <button type="button" class="bezel-hex-screw screw-br" data-screw="br" title="Hex Bolt BR" aria-label="Hex Bolt Bottom Right"></button>

                <!-- Bezel Hotspot Controls Deck -->
                <div class="bezel-hotspots-bar">
                    <!-- Diagnostic LEDs -->
                    <div class="bezel-hotspot-group bezel-led-cluster" title="Click to test diagnostic LEDs">
                        <span class="bezel-led led-pwr active"></span>
                        <span class="bezel-led led-stat"></span>
                        <span class="bezel-led led-disp"></span>
                        <span class="bezel-led led-err"></span>
                    </div>

                    <!-- Auxiliary LED 7-Segment Readout -->
                    <div class="bezel-aux-display" id="bezel-aux-display" data-i18n="ui.terminal.ready" aria-live="polite">READY // _</div>

                    <!-- 12-Key Tactical Numpad -->
                    <div class="bezel-keypad-grid" role="group" aria-label="ATM Numpad">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((k) => `
                            <button type="button" class="bezel-keypad-btn" data-key="${k}">${k}</button>
                        `).join('')}
                        <button type="button" class="bezel-keypad-btn btn-clr" data-key="CLEAR">CLR</button>
                        <button type="button" class="bezel-keypad-btn btn-ent" data-key="ENTER">ENT</button>
                    </div>

                    <!-- Mechanical Coin Return Slot -->
                    <div class="bezel-coin-assembly">
                        <button type="button" class="bezel-coin-lever" id="bezel-coin-lever" title="Push coin return lever" aria-label="Coin Return Lever">
                            <span class="bezel-coin-icon">⏷ COIN RET</span>
                        </button>
                        <div class="bezel-coin-cup" id="bezel-coin-cup" title="Coin Rejection Tray"></div>
                    </div>

                    <!-- Analog Pressure / Vacuum Dial -->
                    <div class="bezel-gauge-dial" id="bezel-gauge-dial" title="Tap vacuum gauge">
                        <div class="bezel-gauge-needle" id="bezel-gauge-needle"></div>
                    </div>
                </div>

                <!-- Secret Drop-Down Maintenance Hatch (Revealed when 4 screws loosened) -->
                <div class="bezel-maintenance-hatch hidden" id="bezel-maintenance-hatch">
                    <div class="maintenance-hatch-header">
                        <span>⚠ MERIDIAN CORP · HARDWARE MAINTENANCE BAY // REV 4.2</span>
                        <span class="hatch-badge">UNLOCKED</span>
                    </div>
                    <div class="maintenance-hatch-content">
                        <!-- DIP Switches -->
                        <div class="dip-switch-bank">
                            <div class="dip-label">DIP 01 · CRT OVERCLOCK</div>
                            <button type="button" class="dip-toggle" data-dip="overclock" aria-pressed="false">OFF</button>

                            <div class="dip-label">DIP 02 · MATRIX PHOSPHOR</div>
                            <button type="button" class="dip-toggle" data-dip="greenPhosphor" aria-pressed="false">OFF</button>

                            <div class="dip-label">DIP 03 · SUB-BASS AUDIO</div>
                            <button type="button" class="dip-toggle" data-dip="subBass" aria-pressed="false">OFF</button>

                            <div class="dip-label">DIP 04 · FREE-PLAY BYPASS</div>
                            <button type="button" class="dip-toggle" data-dip="freePlay" aria-pressed="false">OFF</button>
                        </div>

                        <!-- Overclock Fuse & Audio Cassette -->
                        <div class="maintenance-secrets">
                            <button type="button" class="maintenance-fuse-btn" id="maintenance-fuse-btn" title="Inspect overclock fuse">
                                <span class="fuse-core">⚡ OVERCLOCK FUSE</span>
                                <span class="fuse-sub">[CLICK TO HARVEST +10 TECH]</span>
                            </button>
                            <div class="maintenance-cassette" id="maintenance-cassette" title="Whistleblower micro-cassette tape">
                                <span>📼 TAPE #13: "THEY LOCKED THE PODS"</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            this.container.appendChild(bezelControls);
        }

        this._bindEvents();
    }

    _bindEvents() {
        if (!this.container) return;

        // Corner Hex Screws
        this.container.querySelectorAll('.bezel-hex-screw').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const screw = btn.dataset.screw;
                this.turnScrew(screw);
            };
        });

        // Keypad buttons
        this.container.querySelectorAll('.bezel-keypad-btn').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const key = btn.dataset.key;
                this.pressKey(key);
            };
        });

        // Coin return lever
        const coinLever = this.container.querySelector('#bezel-coin-lever');
        if (coinLever) {
            coinLever.onclick = (e) => {
                e.stopPropagation();
                this.jiggleCoinReturn();
            };
        }

        // Pressure Gauge
        const gauge = this.container.querySelector('#bezel-gauge-dial');
        if (gauge) {
            gauge.onclick = (e) => {
                e.stopPropagation();
                this.tapGauge();
            };
        }

        // Diagnostic LEDs
        const ledCluster = this.container.querySelector('.bezel-led-cluster');
        if (ledCluster) {
            ledCluster.onclick = (e) => {
                e.stopPropagation();
                this.testLeds();
            };
        }

        // DIP Switches
        this.container.querySelectorAll('.dip-toggle').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const dip = btn.dataset.dip;
                this.toggleDip(dip);
            };
        });

        // Overclock Fuse
        const fuse = this.container.querySelector('#maintenance-fuse-btn');
        if (fuse) {
            fuse.onclick = (e) => {
                e.stopPropagation();
                this.claimFuse();
            };
        }

        // Whistleblower Cassette
        const cassette = this.container.querySelector('#maintenance-cassette');
        if (cassette) {
            cassette.onclick = (e) => {
                e.stopPropagation();
                this.playCassette();
            };
        }
    }

    turnScrew(corner) {
        if (!Object.prototype.hasOwnProperty.call(this.screws, corner)) return;
        this.screws[corner] = (this.screws[corner] + 1);
        const turns = this.screws[corner];

        // Ratchet audio feedback
        this._play('door_gears_spin', { volume: 0.35, playbackRate: 1.2 + turns * 0.1 });

        // Update DOM visual rotation
        const screwBtn = this.container?.querySelector(`.screw-${corner}`);
        if (screwBtn) {
            const deg = turns * 90;
            screwBtn.style.transform = `rotate(${deg}deg) ${turns >= 3 ? 'scale(1.12)' : ''}`;
            screwBtn.dataset.turns = String(turns);
            screwBtn.classList.toggle('screw-loose', turns >= 3);
        }

        this._checkHatchUnlock();
        return turns;
    }

    _checkHatchUnlock() {
        if (this.hatchOpen) return;
        const allLoose = Object.values(this.screws).every((t) => t >= 3);
        if (allLoose) {
            this.hatchOpen = true;
            this._play('door_slam_vertical', { volume: 0.6 });
            this._play('ui_boot', { volume: 0.5, playbackRate: 0.8 });

            const hatch = this.container?.querySelector('#bezel-maintenance-hatch');
            if (hatch) {
                hatch.classList.remove('hidden');
                hatch.classList.add('hatch-open-anim');
            }
            this.updateAuxDisplay('HATCH UNLOCKED // SYSTEM ACCESS GRANTED');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('terminal-hatch-unlocked'));
            }
        }
    }

    pressKey(key) {
        this._play('ui_click', {
            volume: 0.45,
            playbackRate: key === 'CLEAR' ? 0.7 : key === 'ENTER' ? 1.4 : 1.0 + (parseInt(key, 10) || 5) * 0.05
        });

        if (key === 'CLEAR') {
            this.keypadBuffer = '';
            this.updateAuxDisplay('CLEARED // _');
            return;
        }

        if (key === 'ENTER') {
            this._submitPinCode();
            return;
        }

        if (this.keypadBuffer.length < 8) {
            this.keypadBuffer += key;
            this.updateAuxDisplay(`PIN: ${'*'.repeat(this.keypadBuffer.length - 1)}${key}`);
        }
    }

    _submitPinCode() {
        const code = this.keypadBuffer;
        this.keypadBuffer = '';

        if (SECRET_PIN_CODES[code]) {
            const entry = SECRET_PIN_CODES[code];
            this._play('generator_complete', { volume: 0.6 });
            this.updateAuxDisplay(entry.message);

            if (entry.reward?.coin && this.bank) {
                const current = Number(this.bank.getState?.()?.coin ?? 0);
                this.bank.setCoin?.(current + entry.reward.coin);
                this._play('ui_click_confirm1', { volume: 0.7 });
            }
        } else {
            this._play('ui_error', { volume: 0.4, playbackRate: 0.6 });
            this.updateAuxDisplay(`CODE [${code}] DENIED // INVALID ACCESS`);
        }
    }

    updateAuxDisplay(text) {
        const display = this.container?.querySelector('#bezel-aux-display');
        if (display) {
            display.textContent = text;
            display.classList.remove('text-flash');
            void display.offsetWidth;
            display.classList.add('text-flash');
        }
    }

    jiggleCoinReturn() {
        this.coinReturnClicks += 1;
        this._play('ui_click_confirm1', { volume: 0.5 });

        const lever = this.container?.querySelector('#bezel-coin-lever');
        if (lever) {
            lever.classList.remove('lever-depressed');
            void lever.offsetWidth;
            lever.classList.add('lever-depressed');
        }

        const foundCoin = (this.coinReturnClicks % 5 === 0);
        if (foundCoin) {
            this._play('ui_click_confirm2', { volume: 0.65 });
            this.updateAuxDisplay('CLINK! +1 COIN FOUND IN TRAY');
            if (this.bank) {
                const cur = Number(this.bank.getState?.()?.coin ?? 0);
                this.bank.setCoin?.(cur + 1);
            }
        } else {
            this.updateAuxDisplay('NO COINS IN TRAY // JIGGLE AGAIN');
        }
    }

    tapGauge() {
        this._play('ui_click', { volume: 0.35, playbackRate: 1.8 });
        const needle = this.container?.querySelector('#bezel-gauge-needle');
        if (needle) {
            needle.classList.remove('needle-wobble');
            void needle.offsetWidth;
            needle.classList.add('needle-wobble');
        }
        this.updateAuxDisplay('VACUUM: 29.4 IN-HG // INTEGRITY STABLE');
    }

    testLeds() {
        this._play('ui_scan_ping', { volume: 0.3, playbackRate: 1.5 });
        const leds = this.container?.querySelectorAll('.bezel-led');
        leds?.forEach((led) => {
            led.classList.add('led-rapid-blink');
            setTimeout(() => led.classList.remove('led-rapid-blink'), 1200);
        });
        this.updateAuxDisplay('DIAGNOSTIC LED TEST: PASSED // ALL CHANNELS NOMINAL');
    }

    toggleDip(dipName) {
        if (!Object.prototype.hasOwnProperty.call(this.dipSwitches, dipName)) return;
        this.dipSwitches[dipName] = !this.dipSwitches[dipName];
        const val = this.dipSwitches[dipName];

        this._play('ui_click', { volume: 0.5, playbackRate: val ? 1.3 : 0.8 });

        const btn = this.container?.querySelector(`[data-dip="${dipName}"]`);
        if (btn) {
            btn.setAttribute('aria-pressed', String(val));
            btn.textContent = val ? t('common.on', 'ON') : t('common.off', 'OFF');
            btn.classList.toggle('dip-active', val);
        }

        if (this.container) {
            if (dipName === 'overclock') {
                this.container.classList.toggle('crt-overclock-mode', val);
            } else if (dipName === 'greenPhosphor') {
                this.container.classList.toggle('crt-green-mode', val);
            } else if (dipName === 'subBass') {
                this.container.classList.toggle('audio-subbass-mode', val);
            } else if (dipName === 'freePlay') {
                this.updateAuxDisplay('FREE PLAY: EMPLOYEE COMP ERROR 402 // NO CHEATS');
                return;
            }
        }

        this.updateAuxDisplay(`DIP ${dipName.toUpperCase()}: ${val ? 'ENGAGED' : 'DISENGAGED'}`);
        return val;
    }

    claimFuse() {
        if (this.fuseClaimed) {
            this.updateAuxDisplay('FUSE RECEPTACLE DEPLETED');
            return;
        }
        this.fuseClaimed = true;
        this._play('generator_complete', { volume: 0.6 });

        const btn = this.container?.querySelector('#maintenance-fuse-btn');
        if (btn) {
            btn.classList.add('fuse-claimed');
            btn.innerHTML = '<span>⚡ FUSE HARVESTED (+10 TECH CLAIMED)</span>';
        }

        this.updateAuxDisplay('OVERCLOCK CAPACITOR HARVESTED: +10 TECH');
        if (this.bank) {
            const curTech = Number(this.bank.getState?.()?.tech ?? 0);
            this.bank.setTech?.(curTech + 10);
        }
    }

    playCassette() {
        this._play('ui_boot', { volume: 0.55, playbackRate: 0.95 });
        this.updateAuxDisplay('TAPE PLAY: "...Mothership lied about extraction. Bunker is home now."');
    }
}
