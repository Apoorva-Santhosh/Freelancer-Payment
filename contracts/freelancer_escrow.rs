#![allow(non_snake_case)]
#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, log, Env, Symbol, Address, symbol_short};

// Define the escrow status
#[contracttype]
#[derive(Clone)]
pub struct EscrowDetails {
    pub client: Address,
    pub freelancer: Address,
    pub amount: i128,
    pub client_approved: bool,
    pub freelancer_approved: bool,
    pub is_completed: bool,
    pub is_refunded: bool
}

// Define escrow mapping
#[contracttype]
pub enum EscrowBook {
    Agreement(Symbol)
}

// Contract storage key for escrow count
const ESCROW_COUNT: Symbol = symbol_short!("ESC_CNT");

#[contract]
pub struct FreelancerEscrow;

#[contractimpl]
impl FreelancerEscrow {
    // Create a new escrow agreement
    pub fn create_escrow(
        env: Env,
        client: Address,
        freelancer: Address,
        amount: i128,
        agreement_id: Symbol
    ) -> bool {
        // Verify the addresses
        client.require_auth();

        // Create new escrow agreement
        let escrow = EscrowDetails {
            client: client.clone(),
            freelancer: freelancer.clone(),
            amount,
            client_approved: false,
            freelancer_approved: false,
            is_completed: false,
            is_refunded: false
        };

        // Store the escrow details
        env.storage().instance().set(&EscrowBook::Agreement(agreement_id.clone()), &escrow);
        
        // Increment escrow count
        let mut count: u32 = env.storage().instance().get(&ESCROW_COUNT).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&ESCROW_COUNT, &count);

        // Set contract data lifetime
        env.storage().instance().extend_ttl(100, 100);

        log!(&env, "Escrow created with ID: {}", agreement_id);
        true
    }

    // Approve and release escrow payment
    pub fn approve_completion(
        env: Env,
        agreement_id: Symbol,
        approver: Address
    ) -> bool {
        // Verify the approver's identity
        approver.require_auth();

        // Get escrow details
        let mut escrow: EscrowDetails = env.storage().instance()
            .get(&EscrowBook::Agreement(agreement_id.clone()))
            .expect("Escrow not found");

        // Update approval based on who's approving
        if approver == escrow.client {
            escrow.client_approved = true;
        } else if approver == escrow.freelancer {
            escrow.freelancer_approved = true;
        } else {
            panic!("Unauthorized approver");
        }

        // Check if both parties have approved
        if escrow.client_approved && escrow.freelancer_approved {
            escrow.is_completed = true;
            log!(&env, "Escrow {} completed and ready for release", agreement_id);
        }

        // Update escrow status
        env.storage().instance().set(&EscrowBook::Agreement(agreement_id), &escrow);
        
        escrow.is_completed
    }

    // Initiate refund (can only be done if job not completed)
    pub fn refund_escrow(
        env: Env,
        agreement_id: Symbol,
        client: Address
    ) -> bool {
        // Verify the client's identity
        client.require_auth();

        // Get escrow details
        let mut escrow: EscrowDetails = env.storage().instance()
            .get(&EscrowBook::Agreement(agreement_id.clone()))
            .expect("Escrow not found");

        // Verify this is the client
        if client != escrow.client {
            panic!("Only the client can initiate refund");
        }

        // Verify escrow is not already completed
        if escrow.is_completed {
            panic!("Cannot refund completed escrow");
        }

        // Mark as refunded
        escrow.is_refunded = true;
        env.storage().instance().set(&EscrowBook::Agreement(agreement_id), &escrow);

        log!(&env, "Escrow {} refunded to client", agreement_id);
        true
    }

    // View escrow details
    pub fn view_escrow(
        env: Env,
        agreement_id: Symbol
    ) -> EscrowDetails {
        env.storage().instance()
            .get(&EscrowBook::Agreement(agreement_id))
            .expect("Escrow not found")
    }
}