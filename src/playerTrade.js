/**
 * Tactical Trade & Operative Link System
 * Supports direct resource gifting and two-way barter between squadmates & peer operatives.
 */

export const TRADEABLE_RESOURCES = Object.freeze({
    SHELLS: 'shells',
    AMMO: 'ammo',
    MEDKITS: 'medkits',
    O2: 'o2Canisters'
});

/**
 * Validates whether an inventory state has enough resources to fulfill an offer.
 */
export function canAffordTradeOffer(offer = {}, inventory = {}) {
    if (!offer || typeof offer !== 'object') return true;

    const shells = Math.max(0, Number(offer.shells) || 0);
    const ammo = Math.max(0, Number(offer.ammo) || 0);
    const medkits = Math.max(0, Number(offer.medkits) || 0);
    const o2Canisters = Math.max(0, Number(offer.o2Canisters) || 0);

    const availableShells = Number(inventory.shells) || 0;
    const availableAmmo = Number(inventory.ammo) || 0;
    const availableMedkits = Number(inventory.medkits) || 0;
    const availableO2 = Number(inventory.o2Canisters) || 0;

    return (
        availableShells >= shells &&
        availableAmmo >= ammo &&
        availableMedkits >= medkits &&
        availableO2 >= o2Canisters
    );
}

/**
 * Executes a two-way resource exchange between local inventory and peer offer.
 */
export function executeTradeExchange({ myOffer = {}, peerOffer = {}, inventory = {} } = {}) {
    if (!canAffordTradeOffer(myOffer, inventory)) {
        return { success: false, reason: 'insufficient_funds', inventory };
    }

    const updated = {
        shells: Math.max(0, (Number(inventory.shells) || 0) - (Number(myOffer.shells) || 0) + (Number(peerOffer.shells) || 0)),
        ammo: Math.max(0, (Number(inventory.ammo) || 0) - (Number(myOffer.ammo) || 0) + (Number(peerOffer.ammo) || 0)),
        medkits: Math.max(0, (Number(inventory.medkits) || 0) - (Number(myOffer.medkits) || 0) + (Number(peerOffer.medkits) || 0)),
        o2Canisters: Math.max(0, (Number(inventory.o2Canisters) || 0) - (Number(myOffer.o2Canisters) || 0) + (Number(peerOffer.o2Canisters) || 0))
    };

    return {
        success: true,
        inventory: updated,
        transferredOut: { ...myOffer },
        receivedIn: { ...peerOffer }
    };
}

export class PlayerTradeManager {
    constructor({ socket = null, onStateChanged = null } = {}) {
        this.socket = socket;
        this.onStateChanged = onStateChanged;
        this.isOpen = false;
        this.partner = null; // { id, callsign, opClass, hp, maxHp, o2 }
        this.myOffer = { shells: 0, ammo: 0, medkits: 0, o2Canisters: 0 };
        this.peerOffer = { shells: 0, ammo: 0, medkits: 0, o2Canisters: 0 };
        this.myAccepted = false;
        this.peerAccepted = false;
        this.statusMessage = 'AWAITING OFFER SELECTION';

        // Telemetry stats
        this.completedTradesCount = 0;
        this.shellsTraded = 0;
        this.ammoTraded = 0;
        this.medkitsTraded = 0;
        this.o2Traded = 0;
    }

    getTradeStats() {
        return {
            completedCount: this.completedTradesCount,
            shellsTraded: this.shellsTraded,
            ammoTraded: this.ammoTraded,
            medkitsTraded: this.medkitsTraded,
            o2Traded: this.o2Traded
        };
    }

    resetRunStats() {
        this.completedTradesCount = 0;
        this.shellsTraded = 0;
        this.ammoTraded = 0;
        this.medkitsTraded = 0;
        this.o2Traded = 0;
    }

    setSocket(socket) {
        this.socket = socket;
    }

    openTrade(partnerData = {}) {
        this.isOpen = true;
        this.partner = {
            id: partnerData.id || 'peer-operative',
            callsign: partnerData.callsign || 'SQUADMATE',
            opClass: partnerData.opClass || 'SCOUT',
            hp: partnerData.hp ?? 100,
            maxHp: partnerData.maxHp ?? 100,
            o2: partnerData.o2 ?? 100
        };
        this.myOffer = { shells: 0, ammo: 0, medkits: 0, o2Canisters: 0 };
        this.peerOffer = { shells: 0, ammo: 0, medkits: 0, o2Canisters: 0 };
        this.myAccepted = false;
        this.peerAccepted = false;
        this.statusMessage = `LINK ESTABLISHED WITH ${this.partner.callsign.toUpperCase()}`;
        this.notifyChange();

        if (this.socket && this.partner.id) {
            this.socket.emit('playerTradeOpen', { targetId: this.partner.id });
        }
    }

    closeTrade() {
        if (!this.isOpen) return;
        this.isOpen = false;
        if (this.socket && this.partner?.id) {
            this.socket.emit('playerTradeCancel', { targetId: this.partner.id });
        }
        this.partner = null;
        this.myOffer = { shells: 0, ammo: 0, medkits: 0, o2Canisters: 0 };
        this.peerOffer = { shells: 0, ammo: 0, medkits: 0, o2Canisters: 0 };
        this.myAccepted = false;
        this.peerAccepted = false;
        this.statusMessage = 'TRADE SESSION CLOSED';
        this.notifyChange();
    }

    setOfferItem(resourceKey, amount) {
        if (!this.isOpen || this.myAccepted) return;
        const validKey = Object.values(TRADEABLE_RESOURCES).includes(resourceKey) ? resourceKey : null;
        if (!validKey) return;

        this.myOffer[validKey] = Math.max(0, Math.floor(amount || 0));
        this.peerAccepted = false; // Modifying offer resets acceptance
        this.myAccepted = false;
        this.statusMessage = 'OFFER UPDATED — VERIFY TRANSFER';
        this.notifyChange();

        if (this.socket && this.partner?.id) {
            this.socket.emit('playerTradeOffer', {
                targetId: this.partner.id,
                offer: { ...this.myOffer }
            });
        }
    }

    acceptTrade(currentInventory = {}) {
        if (!this.isOpen) return false;
        if (!canAffordTradeOffer(this.myOffer, currentInventory)) {
            this.statusMessage = 'INSUFFICIENT RESOURCES FOR OFFER';
            this.notifyChange();
            return false;
        }

        this.myAccepted = true;
        this.statusMessage = this.peerAccepted ? 'EXCHANGE CONFIRMED — PROCESSING' : 'OFFER ACCEPTED — AWAITING SQUADMATE CONFIRMATION';
        this.notifyChange();

        if (this.socket && this.partner?.id) {
            this.socket.emit('playerTradeAccept', {
                targetId: this.partner.id,
                offer: { ...this.myOffer }
            });
        }

        if (this.peerAccepted) {
            return this.finalizeExchange(currentInventory);
        }
        return true;
    }

    handlePeerOffer(peerOfferData = {}) {
        if (!this.isOpen) return;
        this.peerOffer = {
            shells: Math.max(0, Number(peerOfferData.shells) || 0),
            ammo: Math.max(0, Number(peerOfferData.ammo) || 0),
            medkits: Math.max(0, Number(peerOfferData.medkits) || 0),
            o2Canisters: Math.max(0, Number(peerOfferData.o2Canisters) || 0)
        };
        this.myAccepted = false; // Reset local acceptance if peer changes offer
        this.peerAccepted = false;
        this.statusMessage = 'SQUADMATE UPDATED TRANSFER OFFER';
        this.notifyChange();
    }

    handlePeerAccepted() {
        if (!this.isOpen) return;
        this.peerAccepted = true;
        this.statusMessage = this.myAccepted ? 'EXCHANGE MUTUALLY ACCEPTED — COMMITTING' : 'SQUADMATE HAS ACCEPTED — AWAITING YOUR CONFIRMATION';
        this.notifyChange();
    }

    finalizeExchange(currentInventory = {}) {
        const result = executeTradeExchange({
            myOffer: this.myOffer,
            peerOffer: this.peerOffer,
            inventory: currentInventory
        });

        if (result.success) {
            this.completedTradesCount += 1;
            this.shellsTraded += Number(this.myOffer.shells || 0) + Number(this.peerOffer.shells || 0);
            this.ammoTraded += Number(this.myOffer.ammo || 0) + Number(this.peerOffer.ammo || 0);
            this.medkitsTraded += Number(this.myOffer.medkits || 0) + Number(this.peerOffer.medkits || 0);
            this.o2Traded += Number(this.myOffer.o2Canisters || 0) + Number(this.peerOffer.o2Canisters || 0);

            if (typeof window !== 'undefined' && window.profileManager?.recordTradeCompleted) {
                window.profileManager.recordTradeCompleted();
            }

            this.statusMessage = 'TRANSACTION COMPLETE — TELEMETRY COMMITTED';
            this.notifyChange();
            setTimeout(() => {
                this.closeTrade();
            }, 1200);
        }
        return result;
    }

    notifyChange() {
        if (typeof this.onStateChanged === 'function') {
            this.onStateChanged({
                isOpen: this.isOpen,
                partner: this.partner,
                myOffer: { ...this.myOffer },
                peerOffer: { ...this.peerOffer },
                myAccepted: this.myAccepted,
                peerAccepted: this.peerAccepted,
                statusMessage: this.statusMessage
            });
        }
    }
}

export const playerTradeManager = new PlayerTradeManager();
