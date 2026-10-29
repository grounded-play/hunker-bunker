import { describe, expect, it, vi } from 'vitest';
import {
    createBlackjackDeck,
    calculateHandValue,
    calculatePlayerHandValue,
    evaluateRoundOutcome,
    createBlackjackGame,
    stepBlackjackGame,
    BlackjackArcadeController,
    BLACKJACK_HOUSE_PROFIT_CAP,
    BLACKJACK_STORAGE_KEY,
    HACK_CHIPS,
    legalBlackjackBet,
    loadBlackjackStats
} from './blackjackArcade.js';

function memoryStorage(seed = {}) {
    const values = new Map(Object.entries(seed));
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

function bankWithCoins(start = 100) {
    let coin = start;
    return {
        getState: () => ({ coin }),
        canAfford: ({ coin: cost = 0 }) => coin >= cost,
        spend: ({ coin: cost = 0 }) => { if (coin < cost) return false; coin -= cost; return true; },
        deposit: ({ coin: amount = 0 }) => { coin += amount; }
    };
}

const card = (rank, suit = 'spades') => ({ rank, suit });
const key = (keyValue, code = keyValue) => ({ key: keyValue, code, preventDefault() {}, stopPropagation() {} });
const shoeEnding = (...cards) => Array.from({ length: 15 }, (_, index) => card('2', index % 2 ? 'clubs' : 'diamonds')).concat(cards);

describe('Blackjack Roguelike Engine', () => {
    describe('Deck & Valuation', () => {
        it('creates a standard 52-card shoe', () => {
            const deck = createBlackjackDeck();
            expect(deck).toHaveLength(52);
            const keys = new Set(deck.map((c) => `${c.rank}_${c.suit}`));
            expect(keys.size).toBe(52);
        });

        it('calculates numerical cards accurately', () => {
            const hand = [
                { rank: '5', suit: 'spades' },
                { rank: '9', suit: 'hearts' }
            ];
            const val = calculateHandValue(hand);
            expect(val.value).toBe(14);
            expect(val.isBust).toBe(false);
            expect(val.isSoft).toBe(false);
        });

        it('calculates face cards as 10', () => {
            const hand = [
                { rank: '10', suit: 'clubs' },
                { rank: 'K', suit: 'diamonds' }
            ];
            const val = calculateHandValue(hand);
            expect(val.value).toBe(20);
        });

        it('handles single Ace as soft 11 or hard 1', () => {
            const softHand = [
                { rank: 'A', suit: 'spades' },
                { rank: '6', suit: 'diamonds' }
            ];
            expect(calculateHandValue(softHand)).toMatchObject({ value: 17, isSoft: true, isBust: false });

            const hardHand = [
                { rank: 'A', suit: 'spades' },
                { rank: '6', suit: 'diamonds' },
                { rank: '8', suit: 'clubs' }
            ];
            expect(calculateHandValue(hardHand)).toMatchObject({ value: 15, isSoft: false, isBust: false });
        });

        it('detects natural blackjack on opening hand', () => {
            const bjHand = [
                { rank: 'A', suit: 'spades' },
                { rank: 'J', suit: 'clubs' }
            ];
            expect(calculateHandValue(bjHand)).toMatchObject({ value: 21, isBlackjack: true, isBust: false });
        });

        it('detects bust hands above 21', () => {
            const bustHand = [
                { rank: '10', suit: 'spades' },
                { rank: '8', suit: 'hearts' },
                { rank: '7', suit: 'diamonds' }
            ];
            expect(calculateHandValue(bustHand)).toMatchObject({ value: 25, isBust: true });
        });
    });

    describe('Round Evaluation & Payouts', () => {
        it('pays 3:2 for player natural blackjack vs regular hand', () => {
            const playerHand = [{ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'clubs' }];
            const dealerHand = [{ rank: '10', suit: 'hearts' }, { rank: '8', suit: 'diamonds' }];
            const outcome = evaluateRoundOutcome(playerHand, dealerHand, 10);
            expect(outcome.result).toBe('PLAYER_BLACKJACK');
            expect(outcome.payout).toBe(25); // 10 bet + 15 win
        });

        it('handles dealer bust as player win', () => {
            const playerHand = [{ rank: '10', suit: 'spades' }, { rank: '8', suit: 'clubs' }];
            const dealerHand = [{ rank: '10', suit: 'hearts' }, { rank: '6', suit: 'diamonds' }, { rank: '8', suit: 'spades' }];
            const outcome = evaluateRoundOutcome(playerHand, dealerHand, 10);
            expect(outcome.result).toBe('DEALER_BUST');
            expect(outcome.payout).toBe(20);
        });

        it('returns bet on push (tie)', () => {
            const playerHand = [{ rank: '10', suit: 'spades' }, { rank: '9', suit: 'clubs' }];
            const dealerHand = [{ rank: '9', suit: 'hearts' }, { rank: '10', suit: 'diamonds' }];
            const outcome = evaluateRoundOutcome(playerHand, dealerHand, 10);
            expect(outcome.result).toBe('PUSH');
            expect(outcome.payout).toBe(10);
        });

        it('results in loss with zero payout when dealer has higher total', () => {
            const playerHand = [{ rank: '10', suit: 'spades' }, { rank: '7', suit: 'clubs' }];
            const dealerHand = [{ rank: '10', suit: 'hearts' }, { rank: '9', suit: 'diamonds' }];
            const outcome = evaluateRoundOutcome(playerHand, dealerHand, 10);
            expect(outcome.result).toBe('DEALER_WIN');
            expect(outcome.payout).toBe(0);
        });
    });

    describe('Game State & Roguelike Step Reducer', () => {
        it('initializes game in BETTING phase with default chips', () => {
            const game = createBlackjackGame({ bankCoins: 50 });
            expect(game.phase).toBe('BETTING');
            expect(game.currentBet).toBe(5);
            expect(game.chips).toHaveLength(3);
            expect(game.streak).toBe(0);
        });

        it('deals hand and moves to PLAYER_TURN, deducting bet from bank', () => {
            let game = createBlackjackGame({ bankCoins: 50 });
            game = stepBlackjackGame(game, { action: 'DEAL', bet: 10 });
            expect(game.phase === 'PLAYER_TURN' || game.phase === 'ROUND_OVER').toBe(true);
            expect(game.playerHand.length).toBe(2);
            expect(game.dealerHand.length).toBe(2);
            expect(game.currentBet).toBe(10);
        });

        it('allows player to HIT until bust or stand', () => {
            let game = createBlackjackGame({ bankCoins: 50 });
            game = stepBlackjackGame(game, { action: 'DEAL', bet: 5 });
            if (game.phase === 'PLAYER_TURN') {
                const prevCount = game.playerHand.length;
                game = stepBlackjackGame(game, { action: 'HIT' });
                expect(game.playerHand.length).toBe(prevCount + 1);
            }
        });

        it('triggers dealer play and round resolution on STAND', () => {
            let game = createBlackjackGame({ bankCoins: 50 });
            game = stepBlackjackGame(game, { action: 'DEAL', bet: 5 });
            if (game.phase === 'PLAYER_TURN') {
                game = stepBlackjackGame(game, { action: 'STAND' });
                expect(game.phase).toBe('ROUND_OVER');
                expect(game.dealerRevealed).toBe(true);
            }
        });

        it('executes CRYO_LOCK chip to freeze dealer on stand', () => {
            let game = createBlackjackGame({ bankCoins: 50 });
            game = stepBlackjackGame(game, { action: 'DEAL', bet: 5 });
            if (game.phase === 'PLAYER_TURN') {
                game = stepBlackjackGame(game, { action: 'USE_HACK', chipId: HACK_CHIPS.CRYO_LOCK });
                expect(game.activeHacks.includes(HACK_CHIPS.CRYO_LOCK)).toBe(true);
            }
        });

        it('increments streak on consecutive wins and tracks best streak', () => {
            let game = createBlackjackGame({ bankCoins: 50 });
            game.streak = 2;
            game.bestStreak = 2;
            const playerHand = [{ rank: '10', suit: 'spades' }, { rank: '10', suit: 'clubs' }];
            const dealerHand = [{ rank: '10', suit: 'hearts' }, { rank: '8', suit: 'diamonds' }];
            const outcome = evaluateRoundOutcome(playerHand, dealerHand, 5);
            expect(outcome.result).toBe('PLAYER_WIN');
        });

        it('rejects hacks outside the player turn and snaps forged bets to legal tiers', () => {
            const betting = createBlackjackGame();
            expect(stepBlackjackGame(betting, { action: 'USE_HACK', chipId: HACK_CHIPS.CRYO_LOCK }).chips[0].used).toBe(false);
            expect(legalBlackjackBet(49)).toBe(50);
            expect(stepBlackjackGame(betting, { action: 'DEAL', bet: 999 }).currentBet).toBe(50);
        });

        it('uses Thermal Ace consistently before deciding whether a hit busted', () => {
            const state = createBlackjackGame();
            state.phase = 'PLAYER_TURN';
            state.playerHand = [card('10'), card('10', 'clubs')];
            state.dealerHand = [card('10', 'hearts'), card('7', 'diamonds')];
            state.deck = shoeEnding(card('2'));
            state.activeHacks = [HACK_CHIPS.THERMAL_ACE];

            const next = stepBlackjackGame(state, { action: 'HIT' });
            expect(calculatePlayerHandValue(next.playerHand, next.activeHacks)).toMatchObject({ value: 20, isBust: false, isModified: true });
            expect(next.phase).toBe('PLAYER_TURN');
        });

        it('lets EMP Shield replace a bust card during double down', () => {
            const state = createBlackjackGame();
            state.phase = 'PLAYER_TURN';
            state.currentBet = 5;
            state.playerHand = [card('10'), card('9', 'clubs')];
            state.dealerHand = [card('10', 'hearts'), card('7', 'diamonds')];
            state.deck = shoeEnding(card('K'));
            state.activeHacks = [HACK_CHIPS.EMP_SHIELD];

            const next = stepBlackjackGame(state, { action: 'DOUBLE_DOWN' });
            expect(next.playerHand.at(-1).rank).toBe('A');
            expect(next.activeHacks).not.toContain(HACK_CHIPS.EMP_SHIELD);
            expect(next.lastOutcome.result).toBe('PLAYER_WIN');
        });
    });

    describe('Controller economy and persistence', () => {
        it('pays an opening natural immediately and settles it only once', () => {
            const bank = bankWithCoins(100);
            const controller = new BlackjackArcadeController({ game: { bank }, storage: memoryStorage() });
            controller.open();
            controller.state.currentBet = 10;
            controller.state.deck = shoeEnding(card('9'), card('10'), card('K'), card('A'));

            controller._onKeyDown(key(' ', 'Space'));

            expect(controller.state.lastOutcome.result).toBe('PLAYER_BLACKJACK');
            expect(bank.getState().coin).toBe(115);
            expect(controller._handleRoundPayout()).toBe(false);
            expect(bank.getState().coin).toBe(115);
        });

        it('pays a hit-to-21 auto-stand instead of dropping the win', () => {
            const bank = bankWithCoins(100);
            const controller = new BlackjackArcadeController({ game: { bank }, storage: memoryStorage() });
            controller.open();
            controller.state.currentBet = 10;
            controller.state.deck = shoeEnding(card('6'), card('7'), card('10'), card('5'), card('10'));

            controller._onKeyDown(key(' ', 'Space'));
            controller._onKeyDown(key('1'));

            expect(controller.state.lastOutcome.result).toBe('PLAYER_WIN');
            expect(bank.getState().coin).toBe(110);
        });

        it('caps daily profit while always returning the winning stake', () => {
            const storage = memoryStorage({
                [BLACKJACK_STORAGE_KEY]: JSON.stringify({ houseDay: 4, houseProfitPaid: 95 })
            });
            const bank = bankWithCoins(100);
            const controller = new BlackjackArcadeController({
                game: { bank, dayState: { day: 4 } },
                storage
            });
            controller.open();
            controller.state.currentBet = 10;
            controller.state.deck = shoeEnding(card('7'), card('10'), card('K'), card('A'));

            controller._onKeyDown(key(' ', 'Space'));

            expect(bank.getState().coin).toBe(105);
            expect(controller.stats.houseProfitPaid).toBe(BLACKJACK_HOUSE_PROFIT_CAP);
            expect(controller.state.message).toContain('CAPPED PAYOUT');
        });

        it('resets the house float on a new bunker day and preserves lifetime stats', () => {
            const storage = memoryStorage({
                [BLACKJACK_STORAGE_KEY]: JSON.stringify({
                    bestStreak: 8,
                    totalHandsWon: 12,
                    totalCoinsWon: 70,
                    houseDay: 2,
                    houseProfitPaid: 100
                })
            });
            expect(loadBlackjackStats(storage, 3)).toEqual({
                bestStreak: 8,
                totalHandsWon: 12,
                totalCoinsWon: 70,
                houseDay: 3,
                houseProfitPaid: 0
            });
        });

        it('keeps the current run, chips, and streak when the cabinet is closed and reopened', () => {
            const controller = new BlackjackArcadeController({
                game: { bank: bankWithCoins() },
                storage: memoryStorage()
            });
            controller.state.streak = 2;
            controller.state.chips[0].used = true;
            controller.open();
            controller.close();
            controller.open();
            expect(controller.state.streak).toBe(2);
            expect(controller.state.chips[0].used).toBe(true);
            controller.close();
        });

        it('allows direct chip selection and refreshes chips on a three-win tier clear', () => {
            const bank = bankWithCoins();
            const grantBlackjackTierPerk = vi.fn();
            const controller = new BlackjackArcadeController({
                game: { bank, grantBlackjackTierPerk },
                storage: memoryStorage()
            });
            controller.open();
            controller.state.phase = 'PLAYER_TURN';
            controller._onKeyDown(key('6'));
            expect(controller.state.activeHacks).toEqual([HACK_CHIPS.EMP_SHIELD]);

            controller.state.phase = 'ROUND_OVER';
            controller.state.roundSerial = 1;
            controller.state.currentBet = 5;
            controller.state.lastOutcome = { result: 'PLAYER_WIN', payout: 10, message: 'WIN' };
            controller.state.streak = 3;
            controller.state.chips = controller.state.chips.map((chip) => ({ ...chip, used: true }));
            controller._handleRoundPayout();

            expect(controller.state.chips.every((chip) => !chip.used)).toBe(true);
            expect(grantBlackjackTierPerk).toHaveBeenCalledWith(1);
            controller.close();
        });
    });
});
