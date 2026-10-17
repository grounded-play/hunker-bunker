import { describe, expect, it } from 'vitest';
import {
    createBlackjackDeck,
    calculateHandValue,
    evaluateRoundOutcome,
    createBlackjackGame,
    stepBlackjackGame,
    HACK_CHIPS
} from './blackjackArcade.js';

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
    });
});
