const StellarSdk = require('stellar-sdk');

class TransactionBuilder {
    constructor(server) {
        this.server = server;
        this.network = 'TESTNET'; // Change to PUBLIC for mainnet
    }

    /**
     * Build a deposit transaction
     * @param {string} sourcePublicKey - Source account public key
     * @param {string} escrowPublicKey - Escrow account public key
     * @param {string} amount - Amount in XLM
     */
    async buildDepositTransaction(sourcePublicKey, escrowPublicKey, amount) {
        const account = await this.server.loadAccount(sourcePublicKey);
        const fee = await this.server.fetchBaseFee();

        return new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks[this.network]
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: escrowPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString()
        }))
        .setTimeout(30) // 30 seconds
        .build();
    }

    /**
     * Build a release funds transaction
     * @param {string} escrowPublicKey - Escrow account public key
     * @param {string} freelancerPublicKey - Freelancer's public key
     * @param {string} amount - Amount in XLM
     */
    async buildReleaseTransaction(escrowPublicKey, freelancerPublicKey, amount) {
        const account = await this.server.loadAccount(escrowPublicKey);
        const fee = await this.server.fetchBaseFee();

        return new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks[this.network]
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: freelancerPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString()
        }))
        .setTimeout(30)
        .build();
    }

    /**
     * Build a dispute resolution transaction with mediation
     * @param {string} escrowPublicKey - Escrow account public key
     * @param {string} clientAmount - Amount to return to client
     * @param {string} freelancerAmount - Amount to pay freelancer
     * @param {string} clientPublicKey - Client's public key
     * @param {string} freelancerPublicKey - Freelancer's public key
     */
    async buildDisputeResolutionTransaction(
        escrowPublicKey,
        clientAmount,
        freelancerAmount,
        clientPublicKey,
        freelancerPublicKey
    ) {
        const account = await this.server.loadAccount(escrowPublicKey);
        const fee = await this.server.fetchBaseFee();

        return new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks[this.network]
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: clientPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: clientAmount.toString()
        }))
        .addOperation(StellarSdk.Operation.payment({
            destination: freelancerPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: freelancerAmount.toString()
        }))
        .setTimeout(30)
        .build();
    }

    /**
     * Add time lock to transaction
     * @param {Transaction} transaction - Transaction to modify
     * @param {number} unlockTime - Unix timestamp when transaction becomes valid
     */
    addTimeLock(transaction, unlockTime) {
        transaction.timeBounds = {
            minTime: unlockTime.toString(),
            maxTime: '0' // 0 means no upper time bound
        };
        return transaction;
    }

    /**
     * Add required signatures condition
     * @param {Transaction} transaction - Transaction to modify
     * @param {Array} signers - Array of required signer public keys
     */
    addSignatureRequirements(transaction, signers) {
        // Add signature requirements through predefined signers
        transaction._signers = signers;
        return transaction;
    }
}

module.exports = TransactionBuilder;