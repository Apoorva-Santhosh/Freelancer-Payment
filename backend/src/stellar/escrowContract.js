const StellarSdk = require('stellar-sdk');

class EscrowContract {
    constructor(server) {
        this.server = server;
        this.network = 'TESTNET'; // Change to PUBLIC for mainnet
    }

    /**
     * Create a new escrow account with multi-signature requirements
     * @param {string} clientPublicKey - Client's public key
     * @param {string} freelancerPublicKey - Freelancer's public key
     * @returns {Object} - Escrow account details
     */
    async createEscrowAccount(clientPublicKey, freelancerPublicKey) {
        // Generate new keypair for escrow account
        const escrowKeypair = StellarSdk.Keypair.random();

        // Set up multi-signature requirements
        const multiSigOptions = {
            masterWeight: 0, // Disable master key
            lowThreshold: 2, // Require both signatures for low-threshold operations
            medThreshold: 2, // Require both signatures for medium-threshold operations
            highThreshold: 2, // Require both signatures for high-threshold operations
            signerDetails: [
                {
                    publicKey: clientPublicKey,
                    weight: 1
                },
                {
                    publicKey: freelancerPublicKey,
                    weight: 1
                }
            ]
        };

        return {
            publicKey: escrowKeypair.publicKey(),
            secretKey: escrowKeypair.secret(),
            multiSigOptions
        };
    }

    /**
     * Create a time-locked transaction
     * @param {string} escrowPublicKey - Escrow account public key
     * @param {string} destinationPublicKey - Recipient's public key
     * @param {string} amount - Amount in XLM
     * @param {number} lockTime - Unix timestamp for lock period
     */
    async createTimeLockTransaction(escrowPublicKey, destinationPublicKey, amount, lockTime) {
        const account = await this.server.loadAccount(escrowPublicKey);
        const fee = await this.server.fetchBaseFee();
        
        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks[this.network]
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: destinationPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString()
        }))
        .addTimeBounds(lockTime, 0) // 0 means no upper time bound
        .build();

        return transaction;
    }

    /**
     * Create a refund transaction
     * @param {string} escrowPublicKey - Escrow account public key
     * @param {string} clientPublicKey - Client's public key
     * @param {string} amount - Amount to refund
     */
    async createRefundTransaction(escrowPublicKey, clientPublicKey, amount) {
        const account = await this.server.loadAccount(escrowPublicKey);
        const fee = await this.server.fetchBaseFee();

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks[this.network]
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: clientPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString()
        }))
        .build();

        return transaction;
    }

    /**
     * Submit a signed transaction
     * @param {Transaction} transaction - Signed transaction
     */
    async submitTransaction(transaction) {
        try {
            const result = await this.server.submitTransaction(transaction);
            return {
                success: true,
                transactionHash: result.hash,
                ledger: result.ledger
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.extras?.result_codes || error.message
            };
        }
    }

    /**
     * Verify transaction signatures
     * @param {Transaction} transaction - Transaction to verify
     * @param {Array} requiredSigners - Array of required signer public keys
     */
    verifyTransactionSignatures(transaction, requiredSigners) {
        const signatures = transaction.signatures.map(sig => {
            const keypair = StellarSdk.Keypair.fromPublicKey(sig.hint());
            return keypair.verify(transaction.hash(), sig.signature());
        });

        return signatures.length >= requiredSigners.length;
    }
}

module.exports = EscrowContract;