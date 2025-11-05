const StellarSdk = require('stellar-sdk');

class AccountManager {
    constructor(server) {
        this.server = server;
        this.network = 'TESTNET'; // Change to PUBLIC for mainnet
    }

    /**
     * Create a new Stellar account
     * @returns {Object} - New account keypair
     */
    createAccount() {
        return StellarSdk.Keypair.random();
    }

    /**
     * Add multi-signature requirements to an account
     * @param {string} accountPublicKey - Account to modify
     * @param {Array} signers - Array of signer objects with public key and weight
     * @param {Object} thresholds - Account thresholds configuration
     */
    async addMultiSigRequirements(accountPublicKey, signers, thresholds) {
        const account = await this.server.loadAccount(accountPublicKey);
        const fee = await this.server.fetchBaseFee();

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks[this.network]
        });

        // Set account thresholds
        transaction.addOperation(StellarSdk.Operation.setOptions({
            masterWeight: thresholds.masterWeight,
            lowThreshold: thresholds.lowThreshold,
            medThreshold: thresholds.medThreshold,
            highThreshold: thresholds.highThreshold
        }));

        // Add signers
        signers.forEach(signer => {
            transaction.addOperation(StellarSdk.Operation.setOptions({
                signer: {
                    ed25519PublicKey: signer.publicKey,
                    weight: signer.weight
                }
            }));
        });

        return transaction.build();
    }

    /**
     * Monitor account transactions
     * @param {string} accountPublicKey - Account to monitor
     * @param {Function} callback - Callback for new transactions
     */
    async monitorAccount(accountPublicKey, callback) {
        this.server.transactions()
            .forAccount(accountPublicKey)
            .cursor('now')
            .stream({
                onmessage: transaction => callback(transaction)
            });
    }

    /**
     * Get account balance
     * @param {string} accountPublicKey - Account to check
     * @returns {Object} - Account balances
     */
    async getAccountBalance(accountPublicKey) {
        try {
            const account = await this.server.loadAccount(accountPublicKey);
            return account.balances;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if account exists
     * @param {string} accountPublicKey - Account to check
     * @returns {boolean} - Whether account exists
     */
    async accountExists(accountPublicKey) {
        try {
            await this.server.loadAccount(accountPublicKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get account transaction history
     * @param {string} accountPublicKey - Account to check
     * @param {number} limit - Number of transactions to return
     */
    async getTransactionHistory(accountPublicKey, limit = 10) {
        const transactions = await this.server.transactions()
            .forAccount(accountPublicKey)
            .limit(limit)
            .order('desc')
            .call();

        return transactions.records;
    }
}

module.exports = AccountManager;