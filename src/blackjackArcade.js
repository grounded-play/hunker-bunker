/**
 * BLACK-ICE 21 — Subterranean Roguelike Blackjack Minigame
 *
 * Designed for the crash site base and high-stakes subterranean gambling.
 * Features standard Blackjack rules, cybernetic hack chips, streak tiers,
 * real bank coin wagering, and an authentic CRT arcade presentation.
 */

export const SUITS = Object.freeze(['spades', 'hearts', 'clubs', 'diamonds']);
export const SUIT_GLYPHS = Object.freeze({
    spades: '♠',
    hearts: '♥',
    clubs: '♣',
    diamonds: '♦'
});
export const SUIT_COLORS = Object.freeze({
    spades: '#55d9ff',   // Cyan / Cryo
    clubs: '#39ff14',    // Green / Bio
    diamonds: '#f59e0b', // Amber / Core
    hearts: '#ef4444'    // Red / Warning
});

export const RANKS = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);

export const HACK_CHIPS = Object.freeze({
    CRYO_LOCK: 'cryo_lock',
    THERMAL_ACE: 'thermal_ace',
    EMP_SHIELD: 'emp_shield'
});

export const HACK_CHIP_SPECS = Object.freeze({
    [HACK_CHIPS.CRYO_LOCK]: Object.freeze({
        id: HACK_CHIPS.CRYO_LOCK,
        name: 'CRYO LOCK',
        desc: 'Freezes dealer logic; dealer stands immediately on current total.',
        color: '#55d9ff'
    }),
    [HACK_CHIPS.THERMAL_ACE]: Object.freeze({
        id: HACK_CHIPS.THERMAL_ACE,
        name: 'THERMAL ACE',
        desc: 'Overclock hand modulation: adjustments of ±2 applied to total.',
        color: '#f59e0b'
    }),
    [HACK_CHIPS.EMP_SHIELD]: Object.freeze({
        id: HACK_CHIPS.EMP_SHIELD,
        name: 'EMP SHIELD',
        desc: 'Bust-preventer: if bust, burns highest card and draws replacement.',
        color: '#a855f7'
    })
});

export const BET_TIERS = Object.freeze([2, 5, 10, 25, 50]);
export const BLACKJACK_STORAGE_KEY = 'hb_arcade_blackjack_stats_v1';
export const BLACKJACK_HOUSE_PROFIT_CAP = 100;
export const BLACKJACK_TIER_HANDS = 3;

function clampWhole(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback;
}

export function normalizeBlackjackStats(value = {}, day = 1) {
    const currentDay = Math.max(1, clampWhole(day, 1));
    const storedDay = Math.max(1, clampWhole(value?.houseDay, currentDay));
    return {
        bestStreak: clampWhole(value?.bestStreak),
        totalHandsWon: clampWhole(value?.totalHandsWon),
        totalCoinsWon: clampWhole(value?.totalCoinsWon),
        houseDay: currentDay,
        houseProfitPaid: storedDay === currentDay
            ? Math.min(BLACKJACK_HOUSE_PROFIT_CAP, clampWhole(value?.houseProfitPaid))
            : 0
    };
}

export function loadBlackjackStats(storage = null, day = 1) {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return normalizeBlackjackStats({}, day);
    try {
        return normalizeBlackjackStats(JSON.parse(store.getItem(BLACKJACK_STORAGE_KEY) || '{}'), day);
    } catch {
        return normalizeBlackjackStats({}, day);
    }
}

export function saveBlackjackStats(stats, storage = null, day = 1) {
    const normalized = normalizeBlackjackStats(stats, day);
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    try {
        store?.setItem(BLACKJACK_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
        // A blocked storage write must not interrupt an already-settled wager.
    }
    return normalized;
}

export function legalBlackjackBet(value, fallback = 5) {
    const requested = Number(value);
    if (BET_TIERS.includes(requested)) return requested;
    return BET_TIERS.reduce((best, tier) => (
        Math.abs(tier - requested) < Math.abs(best - requested) ? tier : best
    ), BET_TIERS.includes(fallback) ? fallback : 5);
}

/**
 * Creates a standard shuffled 52-card deck.
 */
export function createBlackjackDeck(rng = Math.random) {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = deck[i];
        deck[i] = deck[j];
        deck[j] = temp;
    }
    return deck;
}

/**
 * Calculates hand numerical score, soft status, and blackjack.
 */
export function calculateHandValue(hand = []) {
    let hardTotal = 0;
    let aceCount = 0;

    for (const card of hand) {
        if (!card) continue;
        if (card.rank === 'A') {
            aceCount += 1;
            hardTotal += 11;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            hardTotal += 10;
        } else {
            hardTotal += Number(card.rank) || 0;
        }
    }

    let softCount = aceCount;
    while (hardTotal > 21 && softCount > 0) {
        hardTotal -= 10;
        softCount -= 1;
    }

    const isSoft = softCount > 0;
    const isBust = hardTotal > 21;
    const isBlackjack = hand.length === 2 && hardTotal === 21;

    return {
        value: hardTotal,
        isSoft,
        isBust,
        isBlackjack
    };
}

export function calculatePlayerHandValue(hand = [], activeHacks = []) {
    const base = calculateHandValue(hand);
    if (!activeHacks.includes(HACK_CHIPS.THERMAL_ACE)) return base;
    if (base.value === 19 || base.value === 20) {
        return { ...base, value: 21, isBust: false, isBlackjack: false, isModified: true };
    }
    if (base.value > 21 && base.value - 2 <= 21) {
        return { ...base, value: base.value - 2, isBust: false, isBlackjack: false, isModified: true };
    }
    return base;
}

/**
 * Evaluates round outcome and computes payout.
 */
export function evaluateRoundOutcome(playerHand, dealerHand, bet = 5, activeHacks = []) {
    const playerVal = calculatePlayerHandValue(playerHand, activeHacks);
    const dealerVal = calculateHandValue(dealerHand);

    if (playerVal.isBlackjack && dealerVal.isBlackjack) {
        return { result: 'PUSH', payout: bet, message: 'DOUBLE BLACKJACK — PUSH' };
    }
    if (playerVal.isBlackjack) {
        return { result: 'PLAYER_BLACKJACK', payout: Math.floor(bet * 2.5), message: 'NATURAL BLACKJACK! PAYS 3:2' };
    }
    if (playerVal.isBust) {
        return { result: 'PLAYER_BUST', payout: 0, message: 'BUST! HAND EXCEEDED 21' };
    }
    if (dealerVal.isBlackjack) {
        return { result: 'DEALER_BLACKJACK', payout: 0, message: 'HOUSE BLACKJACK — DEALER WINS' };
    }
    if (dealerVal.isBust) {
        return { result: 'DEALER_BUST', payout: bet * 2, message: 'DEALER BUST! OPERATOR WINS' };
    }
    if (playerVal.value > dealerVal.value) {
        return { result: 'PLAYER_WIN', payout: bet * 2, message: 'OPERATOR HIGH HAND — YOU WIN' };
    }
    if (playerVal.value < dealerVal.value) {
        return { result: 'DEALER_WIN', payout: 0, message: 'HOUSE HIGH HAND — DEALER WINS' };
    }
    return { result: 'PUSH', payout: bet, message: 'STANDOFF — BET RETURNED' };
}

/**
 * Creates a new Blackjack game state.
 */
export function createBlackjackGame({ bankCoins = 50, stats = {} } = {}) {
    return {
        phase: 'BETTING', // 'BETTING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'ROUND_OVER'
        bankCoins: clampWhole(bankCoins),
        currentBet: 5,
        deck: createBlackjackDeck(),
        playerHand: [],
        dealerHand: [],
        dealerRevealed: false,
        chips: [
            { id: HACK_CHIPS.CRYO_LOCK, used: false },
            { id: HACK_CHIPS.THERMAL_ACE, used: false },
            { id: HACK_CHIPS.EMP_SHIELD, used: false }
        ],
        activeHacks: [],
        streak: 0,
        bestStreak: clampWhole(stats.bestStreak),
        totalHandsWon: clampWhole(stats.totalHandsWon),
        totalCoinsWon: clampWhole(stats.totalCoinsWon),
        roundSerial: 0,
        lastOutcome: null,
        message: 'WELCOME TO BLACK-ICE 21. PLACE YOUR WAGER.'
    };
}

/**
 * Pure step reducer for Blackjack game state transitions.
 */
export function stepBlackjackGame(state, action = {}) {
    const next = {
        ...state,
        playerHand: [...state.playerHand],
        dealerHand: [...state.dealerHand],
        deck: [...state.deck],
        chips: state.chips.map((c) => ({ ...c })),
        activeHacks: [...state.activeHacks]
    };

    if (action.action === 'CHANGE_BET') {
        if (next.phase !== 'BETTING') return next;
        const currentIdx = BET_TIERS.indexOf(next.currentBet);
        const dir = action.direction === 'down' ? -1 : 1;
        const nextIdx = Math.max(0, Math.min(BET_TIERS.length - 1, (currentIdx === -1 ? 1 : currentIdx) + dir));
        next.currentBet = BET_TIERS[nextIdx];
        next.message = `WAGER SET TO ${next.currentBet} COIN. PRESS DEAL.`;
        return next;
    }

    if (action.action === 'DEAL') {
        if (next.phase !== 'BETTING' && next.phase !== 'ROUND_OVER') return next;
        const bet = legalBlackjackBet(action.bet ?? next.currentBet, next.currentBet);
        if (next.deck.length < 15) {
            next.deck = createBlackjackDeck();
        }

        next.currentBet = bet;
        next.roundSerial = clampWhole(next.roundSerial) + 1;
        next.activeHacks = [];
        next.dealerRevealed = false;
        next.playerHand = [next.deck.pop(), next.deck.pop()];
        next.dealerHand = [next.deck.pop(), next.deck.pop()];

        const pVal = calculateHandValue(next.playerHand);
        const dVal = calculateHandValue(next.dealerHand);

        if (pVal.isBlackjack || dVal.isBlackjack) {
            next.dealerRevealed = true;
            next.phase = 'ROUND_OVER';
            next.lastOutcome = evaluateRoundOutcome(next.playerHand, next.dealerHand, next.currentBet, next.activeHacks);
            next.message = next.lastOutcome.message;
            if (next.lastOutcome.payout > next.currentBet) {
                next.streak += 1;
                next.totalHandsWon += 1;
                next.totalCoinsWon += (next.lastOutcome.payout - next.currentBet);
                next.bestStreak = Math.max(next.bestStreak, next.streak);
            }
        } else {
            next.phase = 'PLAYER_TURN';
            next.message = `HAND DEALT: ${pVal.value}. HIT [1], STAND [2], OR DOUBLE [3].`;
        }
        return next;
    }

    if (action.action === 'HIT') {
        if (next.phase !== 'PLAYER_TURN') return next;
        if (next.deck.length < 5) next.deck = createBlackjackDeck();

        const drawn = next.deck.pop();
        next.playerHand.push(drawn);
        let pVal = calculateHandValue(next.playerHand);

        // Check EMP Shield if bust
        if (pVal.isBust && next.activeHacks.includes(HACK_CHIPS.EMP_SHIELD)) {
            next.playerHand.pop();
            const safeCard = { rank: 'A', suit: drawn.suit };
            next.playerHand.push(safeCard);
            next.activeHacks = next.activeHacks.filter((h) => h !== HACK_CHIPS.EMP_SHIELD);
            next.message = 'EMP SHIELD DISCHARGED: BUST NEGATED.';
        }

        pVal = calculatePlayerHandValue(next.playerHand, next.activeHacks);

        if (pVal.isBust) {
            next.dealerRevealed = true;
            next.phase = 'ROUND_OVER';
            next.streak = 0;
            next.lastOutcome = evaluateRoundOutcome(next.playerHand, next.dealerHand, next.currentBet, next.activeHacks);
            next.message = next.lastOutcome.message;
        } else if (pVal.value === 21) {
            return stepBlackjackGame(next, { action: 'STAND' });
        } else {
            next.message = `HAND: ${pVal.value}. HIT [1] OR STAND [2].`;
        }
        return next;
    }

    if (action.action === 'DOUBLE_DOWN') {
        if (next.phase !== 'PLAYER_TURN' || next.playerHand.length !== 2) return next;
        next.currentBet *= 2;
        if (next.deck.length < 5) next.deck = createBlackjackDeck();
        const drawn = next.deck.pop();
        next.playerHand.push(drawn);
        let pVal = calculateHandValue(next.playerHand);

        if (pVal.isBust && next.activeHacks.includes(HACK_CHIPS.EMP_SHIELD)) {
            next.playerHand.pop();
            next.playerHand.push({ rank: 'A', suit: drawn.suit });
            next.activeHacks = next.activeHacks.filter((h) => h !== HACK_CHIPS.EMP_SHIELD);
        }
        pVal = calculatePlayerHandValue(next.playerHand, next.activeHacks);

        if (pVal.isBust) {
            next.dealerRevealed = true;
            next.phase = 'ROUND_OVER';
            next.streak = 0;
            next.lastOutcome = evaluateRoundOutcome(next.playerHand, next.dealerHand, next.currentBet, next.activeHacks);
            next.message = `DOUBLE BUST! ${next.lastOutcome.message}`;
            return next;
        }
        return stepBlackjackGame(next, { action: 'STAND' });
    }

    if (action.action === 'STAND') {
        if (next.phase !== 'PLAYER_TURN') return next;
        next.phase = 'DEALER_TURN';
        next.dealerRevealed = true;

        const frozen = next.activeHacks.includes(HACK_CHIPS.CRYO_LOCK);
        if (!frozen) {
            let dVal = calculateHandValue(next.dealerHand);
            while (dVal.value < 17 || (dVal.value === 17 && dVal.isSoft)) {
                if (next.deck.length < 5) next.deck = createBlackjackDeck();
                next.dealerHand.push(next.deck.pop());
                dVal = calculateHandValue(next.dealerHand);
            }
        }

        next.phase = 'ROUND_OVER';
        next.lastOutcome = evaluateRoundOutcome(next.playerHand, next.dealerHand, next.currentBet, next.activeHacks);
        next.message = next.lastOutcome.message;

        if (next.lastOutcome.payout > next.currentBet) {
            next.streak += 1;
            next.totalHandsWon += 1;
            next.totalCoinsWon += (next.lastOutcome.payout - next.currentBet);
            next.bestStreak = Math.max(next.bestStreak, next.streak);
        } else if (next.lastOutcome.payout === 0) {
            next.streak = 0;
        }
        return next;
    }

    if (action.action === 'USE_HACK') {
        if (next.phase !== 'PLAYER_TURN') return next;
        const chip = next.chips.find((c) => c.id === action.chipId);
        if (!chip || chip.used) return next;
        chip.used = true;
        next.activeHacks.push(chip.id);
        next.message = `HACK DEPLOYED: ${HACK_CHIP_SPECS[chip.id]?.name ?? chip.id}`;
        return next;
    }

    return next;
}

/**
 * Controller managing the Black-Ice 21 CRT overlay, canvas rendering, and user input.
 */
export class BlackjackArcadeController {
    constructor({ game = null, storage = null, dayProvider = null } = {}) {
        this.game = game;
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.dayProvider = dayProvider ?? (() => this.game?.dayState?.day ?? 1);
        this.stats = loadBlackjackStats(this.storage, this._getDay());
        this.state = createBlackjackGame({ bankCoins: this._getBankCoins(), stats: this.stats });
        this.overlayEl = null;
        this.canvasEl = null;
        this.ctx = null;
        this.isOpenFlag = false;
        this.rafId = null;
        this.settledRounds = new Set();
        this._boundKeyDown = this._onKeyDown.bind(this);
    }

    _getBankCoins() {
        const coins = Number(this.game?.bank?.getState?.()?.coin ?? 0);
        return Number.isFinite(coins) ? Math.max(0, Math.floor(coins)) : 0;
    }

    _getDay() {
        return Math.max(1, clampWhole(this.dayProvider?.(), 1));
    }

    _syncDailyStats() {
        this.stats = normalizeBlackjackStats(this.stats, this._getDay());
        return this.stats;
    }

    _houseProfitRemaining() {
        const stats = this._syncDailyStats();
        return Math.max(0, BLACKJACK_HOUSE_PROFIT_CAP - stats.houseProfitPaid);
    }

    _persistStats() {
        this.stats = saveBlackjackStats({
            ...this.stats,
            bestStreak: Math.max(this.stats.bestStreak, this.state.bestStreak),
            totalHandsWon: this.state.totalHandsWon,
            totalCoinsWon: this.state.totalCoinsWon
        }, this.storage, this._getDay());
    }

    _applyAction(action) {
        const previousPhase = this.state.phase;
        const previousRound = this.state.roundSerial;
        this.state = stepBlackjackGame(this.state, action);
        if (this.state.phase === 'ROUND_OVER'
            && (previousPhase !== 'ROUND_OVER' || this.state.roundSerial !== previousRound)) {
            this._handleRoundPayout();
        }
        return this.state;
    }

    isOpen() {
        return this.isOpenFlag;
    }

    open() {
        this._syncDailyStats();
        this.state.bankCoins = this._getBankCoins();
        this._ensureDom();
        if (this.overlayEl) {
            this.overlayEl.classList.remove('hidden');
        }
        this.isOpenFlag = true;
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this._boundKeyDown, true);
        }
        this._render();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('arcade-blackjack-opened'));
        }
    }

    close() {
        this.isOpenFlag = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this._boundKeyDown, true);
        }
        if (this.overlayEl) {
            this.overlayEl.classList.add('hidden');
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('arcade-blackjack-closed'));
        }
    }

    _ensureDom() {
        if (typeof document === 'undefined') return;
        let overlay = document.getElementById('arcade-blackjack-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'arcade-blackjack-overlay';
            overlay.className = 'arcade-cabinet-overlay hidden';
            overlay.innerHTML = `
                <div class="arcade-cabinet-frame" id="blackjack-cabinet-bezel">
                    <div class="arcade-cabinet-screen">
                        <canvas id="blackjack-cabinet-canvas" width="640" height="480"></canvas>
                        <div class="arcade-cabinet-crt-lines" aria-hidden="true"></div>
                    </div>
                    <div class="arcade-cabinet-controls-hint">
                        <span data-i18n="ui.arcade.blackjack_controls_wager">[↑/↓] WAGER</span>
                        <span data-i18n="ui.arcade.blackjack_controls_deal">[SPACE] DEAL/STAND</span>
                        <span data-i18n="ui.arcade.blackjack_controls_hit">[1] HIT</span>
                        <span data-i18n="ui.arcade.blackjack_controls_stand">[2] STAND</span>
                        <span data-i18n="ui.arcade.blackjack_controls_double">[3] DOUBLE</span>
                        <span data-i18n="ui.arcade.blackjack_controls_chips">[4/5/6] CRYO / THERMAL / EMP</span>
                        <span data-i18n="ui.arcade.blackjack_controls_exit">[ESC] EXIT</span>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        this.overlayEl = overlay;
        this.canvasEl = overlay.querySelector('#blackjack-cabinet-canvas');
        if (this.canvasEl) {
            this.ctx = this.canvasEl.getContext('2d');
        }
    }

    _onKeyDown(e) {
        if (!this.isOpen()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (this.state.phase === 'BETTING' || this.state.phase === 'ROUND_OVER') {
            if (e.key === 'ArrowUp') {
                this.state = stepBlackjackGame(this.state, { action: 'CHANGE_BET', direction: 'up' });
            } else if (e.key === 'ArrowDown') {
                this.state = stepBlackjackGame(this.state, { action: 'CHANGE_BET', direction: 'down' });
            } else if (e.code === 'Space' || e.code === 'Enter') {
                // Deduct bet from game bank
                const bank = this.game?.bank;
                if (bank && !bank.canAfford({ coin: this.state.currentBet })) {
                    this.state.message = 'INSUFFICIENT FUNDS IN BANK FOR THIS WAGER!';
                    this._render();
                    return;
                }
                if (this._houseProfitRemaining() <= 0) {
                    this.state.message = 'HOUSE CREDIT FLOAT EXHAUSTED UNTIL NEXT MORNING.';
                    this._render();
                    return;
                }
                if (bank) bank.spend({ coin: this.state.currentBet });
                this._applyAction({ action: 'DEAL', bet: this.state.currentBet });
                this.state.bankCoins = this._getBankCoins();
            }
        } else if (this.state.phase === 'PLAYER_TURN') {
            if (e.key === '1' || e.key === 'h' || e.key === 'H') {
                this._applyAction({ action: 'HIT' });
            } else if (e.key === '2' || e.key === 's' || e.key === 'S' || e.code === 'Space') {
                this._applyAction({ action: 'STAND' });
            } else if (e.key === '3' || e.key === 'd' || e.key === 'D') {
                const bank = this.game?.bank;
                if (bank && !bank.canAfford({ coin: this.state.currentBet })) {
                    this.state.message = 'CANNOT AFFORD DOUBLE DOWN WAGER!';
                } else {
                    if (bank) bank.spend({ coin: this.state.currentBet });
                    this._applyAction({ action: 'DOUBLE_DOWN' });
                }
            } else if (['4', '5', '6', 'k', 'K'].includes(e.key)) {
                const requestedIndex = e.key === '5' ? 1 : e.key === '6' ? 2 : null;
                const chip = requestedIndex == null
                    ? this.state.chips.find((entry) => !entry.used)
                    : this.state.chips[requestedIndex];
                if (chip && !chip.used) this._applyAction({ action: 'USE_HACK', chipId: chip.id });
            }
        }
        this._render();
    }

    _handleRoundPayout() {
        const outcome = this.state.lastOutcome;
        const roundSerial = clampWhole(this.state.roundSerial);
        if (!outcome || this.settledRounds.has(roundSerial)) return false;
        this.settledRounds.add(roundSerial);

        const grossPayout = clampWhole(outcome.payout);
        const returnedStake = Math.min(this.state.currentBet, grossPayout);
        const grossProfit = Math.max(0, grossPayout - returnedStake);
        const creditedProfit = Math.min(grossProfit, this._houseProfitRemaining());
        const creditedPayout = returnedStake + creditedProfit;
        const withheldProfit = grossProfit - creditedProfit;
        const bank = this.game?.bank;
        if (bank && creditedPayout > 0) {
            bank.deposit({ coin: creditedPayout });
            this.state.bankCoins = this._getBankCoins();
        }
        this.stats.houseProfitPaid += creditedProfit;
        if (withheldProfit > 0) {
            this.state.totalCoinsWon = Math.max(0, this.state.totalCoinsWon - withheldProfit);
            this.state.message = `${outcome.message} // HOUSE FLOAT CAPPED PAYOUT AT ${creditedPayout}.`;
        }

        if (this.state.streak > 0 && this.state.streak % BLACKJACK_TIER_HANDS === 0) {
            const tier = this.state.streak / BLACKJACK_TIER_HANDS;
            this.state.chips = this.state.chips.map((chip) => ({ ...chip, used: false }));
            globalThis.window?.dispatchEvent?.(new CustomEvent('arcade-blackjack-tier-cleared', {
                detail: { tier, streak: this.state.streak }
            }));
            this.game?.grantBlackjackTierPerk?.(tier);
        }
        this._persistStats();
        return true;
    }

    _render() {
        if (!this.ctx || !this.canvasEl) return;
        const ctx = this.ctx;
        const w = this.canvasEl.width;
        const h = this.canvasEl.height;

        // Background
        ctx.fillStyle = '#060a08';
        ctx.fillRect(0, 0, w, h);

        // Header Title
        ctx.fillStyle = '#55d9ff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BLACK-ICE 21 // SUBTERRANEAN BLACKJACK', w / 2, 34);

        // Subheader Telemetry
        ctx.fillStyle = '#f59e0b';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`BANK: ${this.state.bankCoins} COIN`, 28, 64);
        ctx.textAlign = 'right';
        ctx.fillText(`CURRENT WAGER: ${this.state.currentBet} COIN`, w - 28, 64);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`HOUSE FLOAT: ${this._houseProfitRemaining()} PROFIT`, w - 28, 82);

        // Streak & Tier Badge
        ctx.textAlign = 'center';
        const stars = '★'.repeat(this.state.streak % 3) || '☆';
        ctx.fillStyle = '#39ff14';
        ctx.fillText(`TIER: ${Math.floor(this.state.streak / 3) + 1} | STREAK: ${this.state.streak} ${stars}`, w / 2, 64);

        // Dividing Line
        ctx.strokeStyle = '#22382c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, 78);
        ctx.lineTo(w - 20, 78);
        ctx.stroke();

        // Dealer Section
        const dVal = calculateHandValue(this.state.dealerHand);
        const dealerScoreText = this.state.dealerRevealed ? `[${dVal.value}]` : '[? + HOLE CARD]';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`C.H.I.P.-0 (DEALER) — ${dealerScoreText}`, 32, 105);

        this._renderCards(ctx, this.state.dealerHand, 32, 118, !this.state.dealerRevealed);

        // Player Section
        const pVal = calculatePlayerHandValue(this.state.playerHand, this.state.activeHacks);
        const playerScoreText = this.state.playerHand.length
            ? `[${pVal.value}${pVal.isSoft ? ' SOFT' : ''}${pVal.isModified ? ' MOD' : ''}]`
            : '[--]';
        ctx.fillStyle = '#55d9ff';
        ctx.fillText(`OPERATOR (YOU) — ${playerScoreText}`, 32, 235);

        this._renderCards(ctx, this.state.playerHand, 32, 248, false);

        // Hack Chips Status Row
        ctx.fillStyle = '#a855f7';
        ctx.font = '13px monospace';
        ctx.fillText('CYBERNETIC HACK CHIPS [KEY 4]:', 32, 365);
        this.state.chips.forEach((chip, idx) => {
            const spec = HACK_CHIP_SPECS[chip.id];
            ctx.fillStyle = chip.used ? '#334155' : spec.color;
            ctx.fillRect(32 + idx * 190, 375, 175, 26);
            ctx.fillStyle = chip.used ? '#64748b' : '#000';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${spec.name} ${chip.used ? '[SPENT]' : '[READY]'}`, 32 + idx * 190 + 87, 392);
        });

        // Bottom Message Box
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(20, 415, w - 40, 50);
        ctx.strokeRect(20, 415, w - 40, 50);

        ctx.fillStyle = this.state.lastOutcome?.payout > 0 ? '#39ff14' : '#f8fafc';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.state.message, w / 2, 445);
    }

    _renderCards(ctx, hand, startX, startY, hideHoleCard = false) {
        const cardW = 60;
        const cardH = 85;
        const gap = 16;

        hand.forEach((card, idx) => {
            const x = startX + idx * (cardW + gap);
            const y = startY;

            if (idx === 1 && hideHoleCard) {
                // Hole card (face-down)
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2;
                ctx.fillRect(x, y, cardW, cardH);
                ctx.strokeRect(x, y, cardW, cardH);

                // Hatch pattern
                ctx.strokeStyle = '#334155';
                ctx.beginPath();
                ctx.moveTo(x + 5, y + 5);
                ctx.lineTo(x + cardW - 5, y + cardH - 5);
                ctx.moveTo(x + cardW - 5, y + 5);
                ctx.lineTo(x + 5, y + cardH - 5);
                ctx.stroke();
                return;
            }

            // Face-up card
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = SUIT_COLORS[card.suit] || '#fff';
            ctx.lineWidth = 2;
            ctx.fillRect(x, y, cardW, cardH);
            ctx.strokeRect(x, y, cardW, cardH);

            // Card details
            ctx.fillStyle = SUIT_COLORS[card.suit] || '#fff';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(card.rank, x + 6, y + 20);

            // Center Suit Glyph
            ctx.font = '24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(SUIT_GLYPHS[card.suit] || card.suit, x + cardW / 2, y + 52);
        });
    }
}

let sharedBlackjackController = null;

export function getBlackjackController(opts = {}) {
    if (!sharedBlackjackController) {
        sharedBlackjackController = new BlackjackArcadeController(opts);
    } else if (opts.game) {
        sharedBlackjackController.game = opts.game;
    }
    return sharedBlackjackController;
}
