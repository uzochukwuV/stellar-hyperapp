#![no_std]
use soroban_sdk::{
    contract, contracttype, contractimpl,
    Env, String, Symbol, symbol_short, Address, Vec
};

// ============================================================================
// CONSTANTS
// ============================================================================

const ADMIN: Symbol = symbol_short!("ADMIN");
const OFFER_CNT: Symbol = symbol_short!("OFFER_C");
const TRADE_CNT: Symbol = symbol_short!("TRADE_C");
const MIN_COLL: Symbol = symbol_short!("MIN_COLL");
const AUTO_WIN: Symbol = symbol_short!("AUTO_WIN");
const DISP_WIN: Symbol = symbol_short!("DISP_WIN");

// ============================================================================
// ENUMS
// ============================================================================

/// Product categories for marketplace
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Category {
    Airtime,
    GiftCards,
    Gaming,
    Utilities,
    Services,
    CrossChain,
}

/// Offer lifecycle states
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum OfferStatus {
    Active,      // Available for trading
    Paused,      // Vendor temporarily paused
    InTrade,     // Currently in an active trade
    Cancelled,   // Vendor cancelled (no active trades)
}

/// Trade lifecycle states
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum TradeStatus {
    Funded,           // Buyer paid, waiting for delivery
    Delivered,        // Vendor marked as delivered
    Completed,        // Buyer confirmed, funds released
    DisputedBuyer,    // Buyer initiated dispute
    DisputedVendor,   // Vendor initiated dispute
    Cancelled,        // Cancelled before delivery
}

/// Token types for collateral
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum TokenType {
    XLM,
    USDC,
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Collateral information
#[contracttype]
#[derive(Clone, Debug)]
pub struct CollateralInfo {
    pub amount: i128,              // Amount locked
    pub token_type: TokenType,      // XLM or USDC
    pub token_address: Address,     // Token contract address
    pub locked_at: u64,             // Timestamp
    pub yield_accrued: i128,        // For Blend integration (future)
}

/// Vendor offer
#[contracttype]
#[derive(Clone, Debug)]
pub struct Offer {
    pub id: u64,
    pub vendor: Address,
    pub category: Category,
    pub title: String,              // "Amazon $50 Gift Card"
    pub description: String,        // Delivery details
    pub price: i128,                // In smallest unit (stroops for XLM)
    pub payment_token: Address,     // Token contract for payments
    pub collateral: CollateralInfo,
    pub status: OfferStatus,
    pub active_trade_count: u32,    // How many active trades
    pub completed_trade_count: u32, // For reputation
    pub created_at: u64,
    pub updated_at: u64,
}

/// Trade transaction
#[contracttype]
#[derive(Clone, Debug)]
pub struct Trade {
    pub id: u64,
    pub offer_id: u64,
    pub buyer: Address,
    pub vendor: Address,
    pub amount: i128,               // Payment amount
    pub payment_token: Address,     // Token contract
    pub collateral_amount: i128,    // Locked collateral
    pub status: TradeStatus,
    pub delivery_proof: String,     // PIN/code/tx-hash/url
    pub created_at: u64,
    pub delivered_at: u64,          // 0 if not delivered
    pub completed_at: u64,          // 0 if not completed
    pub dispute_reason: String,     // Empty if no dispute
    pub auto_complete_at: u64,      // Timestamp for auto-completion
}

/// Vendor reputation stats
#[contracttype]
#[derive(Clone, Debug)]
pub struct VendorStats {
    pub vendor: Address,
    pub total_trades: u32,
    pub completed_trades: u32,
    pub disputed_trades: u32,
    pub total_volume: i128,         // Total value traded
    pub reputation_score: u32,      // 0-100 calculated score
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

/// Storage key enum following existing pattern
#[contracttype]
pub enum P2PDataKey {
    // Offers
    Offer(u64),                    // offer_id -> Offer
    VendorOffers(Address),         // vendor -> Vec<u64> offer IDs
    CategoryOffers(Category),      // category -> Vec<u64> offer IDs
    ActiveOffers,                  // Vec<u64> all active offer IDs

    // Trades
    Trade(u64),                    // trade_id -> Trade
    BuyerTrades(Address),          // buyer -> Vec<u64> trade IDs
    VendorTrades(Address),         // vendor -> Vec<u64> trade IDs
    OfferTrades(u64),              // offer_id -> Vec<u64> trade IDs

    // Reputation
    VendorStats(Address),          // vendor -> VendorStats

    // Token registry (for supported tokens)
    SupportedToken(Address),       // token_address -> bool
}

// ============================================================================
// CONTRACT
// ============================================================================

#[contract]
pub struct StellarP2PContract;

#[contractimpl]
impl StellarP2PContract {

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /// Initialize the P2P marketplace
    pub fn initialize(
        env: Env,
        admin: Address,
        min_collateral_percent: u32,    // e.g., 120 for 120%
        auto_complete_window: u64,       // e.g., 86400 for 24h
        dispute_window: u64,             // e.g., 604800 for 7 days
    ) {
        admin.require_auth();

        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&OFFER_CNT, &0u64);
        env.storage().instance().set(&TRADE_CNT, &0u64);
        env.storage().instance().set(&MIN_COLL, &min_collateral_percent);
        env.storage().instance().set(&AUTO_WIN, &auto_complete_window);
        env.storage().instance().set(&DISP_WIN, &dispute_window);

        env.storage().instance().extend_ttl(5000, 5000);
    }

    /// Register a supported payment/collateral token
    pub fn register_token(env: Env, admin: Address, token: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance()
            .get(&ADMIN).unwrap_or_else(|| panic!("Not initialized"));

        if admin != stored_admin {
            panic!("Not admin");
        }

        env.storage().instance().set(
            &P2PDataKey::SupportedToken(token.clone()),
            &true
        );

        env.storage().instance().extend_ttl(5000, 5000);
    }

    // ========================================================================
    // OFFER MANAGEMENT
    // ========================================================================

    /// Create a new vendor offer with collateral lock
    pub fn create_offer(
        env: Env,
        vendor: Address,
        category: Category,
        title: String,
        description: String,
        price: i128,
        payment_token: Address,
        collateral_amount: i128,
        collateral_token: Address,
    ) -> u64 {
        vendor.require_auth();

        // Validate collateral meets minimum requirement
        let min_percent: u32 = env.storage().instance().get(&MIN_COLL).unwrap();
        let min_collateral = (price * min_percent as i128) / 100;

        if collateral_amount < min_collateral {
            panic!("Insufficient collateral");
        }

        // Verify token is supported
        let is_supported: bool = env.storage().instance()
            .get(&P2PDataKey::SupportedToken(collateral_token.clone()))
            .unwrap_or(false);

        if !is_supported {
            panic!("Token not supported");
        }

        // Transfer collateral from vendor to contract
        Self::transfer_from(
            env.clone(),
            &collateral_token,
            &vendor,
            &env.current_contract_address(),
            &collateral_amount,
        );

        // Get and increment offer count
        let mut offer_count: u64 = env.storage().instance().get(&OFFER_CNT).unwrap_or(0);
        offer_count += 1;

        let token_type = if collateral_token == payment_token {
            TokenType::USDC
        } else {
            TokenType::XLM
        };

        // Create offer
        let offer = Offer {
            id: offer_count,
            vendor: vendor.clone(),
            category: category.clone(),
            title,
            description,
            price,
            payment_token,
            collateral: CollateralInfo {
                amount: collateral_amount,
                token_type,
                token_address: collateral_token,
                locked_at: env.ledger().timestamp(),
                yield_accrued: 0,
            },
            status: OfferStatus::Active,
            active_trade_count: 0,
            completed_trade_count: 0,
            created_at: env.ledger().timestamp(),
            updated_at: env.ledger().timestamp(),
        };

        // Store offer
        env.storage().instance().set(&P2PDataKey::Offer(offer_count), &offer);
        env.storage().instance().set(&OFFER_CNT, &offer_count);

        // Add to vendor's offers
        let mut vendor_offers: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::VendorOffers(vendor.clone()))
            .unwrap_or(Vec::new(&env));
        vendor_offers.push_back(offer_count);
        env.storage().instance().set(&P2PDataKey::VendorOffers(vendor.clone()), &vendor_offers);

        // Add to category offers
        let mut category_offers: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::CategoryOffers(category.clone()))
            .unwrap_or(Vec::new(&env));
        category_offers.push_back(offer_count);
        env.storage().instance().set(&P2PDataKey::CategoryOffers(category), &category_offers);

        // Add to active offers
        let mut active_offers: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::ActiveOffers)
            .unwrap_or(Vec::new(&env));
        active_offers.push_back(offer_count);
        env.storage().instance().set(&P2PDataKey::ActiveOffers, &active_offers);

        env.storage().instance().extend_ttl(5000, 5000);

        // Emit event
        env.events().publish(
            (symbol_short!("offer_new"), vendor),
            offer_count
        );

        offer_count
    }

    /// Cancel an offer (only if no active trades)
    pub fn cancel_offer(env: Env, vendor: Address, offer_id: u64) {
        vendor.require_auth();

        let mut offer: Offer = env.storage().instance()
            .get(&P2PDataKey::Offer(offer_id))
            .unwrap_or_else(|| panic!("Offer not found"));

        if offer.vendor != vendor {
            panic!("Not offer owner");
        }

        if offer.active_trade_count > 0 {
            panic!("Has active trades");
        }

        // Return collateral to vendor
        Self::transfer_tokens(
            env.clone(),
            &offer.collateral.token_address,
            &vendor,
            &offer.collateral.amount,
        );

        offer.status = OfferStatus::Cancelled;
        offer.updated_at = env.ledger().timestamp();

        env.storage().instance().set(&P2PDataKey::Offer(offer_id), &offer);

        // Remove from active offers
        let active_offers: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::ActiveOffers)
            .unwrap_or(Vec::new(&env));
        let mut new_active: Vec<u64> = Vec::new(&env);
        for i in 0..active_offers.len() {
            let id = active_offers.get(i).unwrap();
            if id != offer_id {
                new_active.push_back(id);
            }
        }
        env.storage().instance().set(&P2PDataKey::ActiveOffers, &new_active);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("offer_cnl"), vendor),
            offer_id
        );
    }

    // ========================================================================
    // TRADE EXECUTION
    // ========================================================================

    /// Buyer accepts offer and creates trade
    pub fn accept_offer(
        env: Env,
        buyer: Address,
        offer_id: u64,
    ) -> u64 {
        buyer.require_auth();

        let mut offer: Offer = env.storage().instance()
            .get(&P2PDataKey::Offer(offer_id))
            .unwrap_or_else(|| panic!("Offer not found"));

        if offer.status != OfferStatus::Active {
            panic!("Offer not active");
        }

        if offer.vendor == buyer {
            panic!("Cannot trade with yourself");
        }

        // Transfer payment from buyer to contract (escrow)
        Self::transfer_from(
            env.clone(),
            &offer.payment_token,
            &buyer,
            &env.current_contract_address(),
            &offer.price,
        );

        // Increment trade count
        let mut trade_count: u64 = env.storage().instance().get(&TRADE_CNT).unwrap_or(0);
        trade_count += 1;

        let auto_window: u64 = env.storage().instance().get(&AUTO_WIN).unwrap();

        // Create trade
        let trade = Trade {
            id: trade_count,
            offer_id,
            buyer: buyer.clone(),
            vendor: offer.vendor.clone(),
            amount: offer.price,
            payment_token: offer.payment_token.clone(),
            collateral_amount: offer.collateral.amount,
            status: TradeStatus::Funded,
            delivery_proof: String::from_str(&env, ""),
            created_at: env.ledger().timestamp(),
            delivered_at: 0,
            completed_at: 0,
            dispute_reason: String::from_str(&env, ""),
            auto_complete_at: env.ledger().timestamp() + auto_window,
        };

        // Store trade
        env.storage().instance().set(&P2PDataKey::Trade(trade_count), &trade);
        env.storage().instance().set(&TRADE_CNT, &trade_count);

        // Update offer
        offer.active_trade_count += 1;
        offer.updated_at = env.ledger().timestamp();
        env.storage().instance().set(&P2PDataKey::Offer(offer_id), &offer);

        // Add to buyer's trades
        let mut buyer_trades: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::BuyerTrades(buyer.clone()))
            .unwrap_or(Vec::new(&env));
        buyer_trades.push_back(trade_count);
        env.storage().instance().set(&P2PDataKey::BuyerTrades(buyer.clone()), &buyer_trades);

        // Add to vendor's trades
        let mut vendor_trades: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::VendorTrades(offer.vendor.clone()))
            .unwrap_or(Vec::new(&env));
        vendor_trades.push_back(trade_count);
        env.storage().instance().set(&P2PDataKey::VendorTrades(offer.vendor.clone()), &vendor_trades);

        // Add to offer's trades
        let mut offer_trades: Vec<u64> = env.storage().instance()
            .get(&P2PDataKey::OfferTrades(offer_id))
            .unwrap_or(Vec::new(&env));
        offer_trades.push_back(trade_count);
        env.storage().instance().set(&P2PDataKey::OfferTrades(offer_id), &offer_trades);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("trade_new"), buyer, offer.vendor),
            trade_count
        );

        trade_count
    }

    /// Vendor marks trade as delivered with proof
    pub fn mark_delivered(
        env: Env,
        vendor: Address,
        trade_id: u64,
        delivery_proof: String,
    ) {
        vendor.require_auth();

        let mut trade: Trade = env.storage().instance()
            .get(&P2PDataKey::Trade(trade_id))
            .unwrap_or_else(|| panic!("Trade not found"));

        if trade.vendor != vendor {
            panic!("Not trade vendor");
        }

        if trade.status != TradeStatus::Funded {
            panic!("Trade not in funded state");
        }

        trade.status = TradeStatus::Delivered;
        trade.delivery_proof = delivery_proof;
        trade.delivered_at = env.ledger().timestamp();

        env.storage().instance().set(&P2PDataKey::Trade(trade_id), &trade);
        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("delivered"), vendor, trade.buyer.clone()),
            trade_id
        );
    }

    /// Buyer confirms delivery - releases payment and collateral
    pub fn confirm_delivery(
        env: Env,
        buyer: Address,
        trade_id: u64,
    ) {
        buyer.require_auth();

        let mut trade: Trade = env.storage().instance()
            .get(&P2PDataKey::Trade(trade_id))
            .unwrap_or_else(|| panic!("Trade not found"));

        if trade.buyer != buyer {
            panic!("Not trade buyer");
        }

        if trade.status != TradeStatus::Delivered {
            panic!("Trade not delivered");
        }

        // Release payment to vendor
        Self::transfer_tokens(
            env.clone(),
            &trade.payment_token,
            &trade.vendor,
            &trade.amount,
        );

        // Get offer to access collateral info
        let mut offer: Offer = env.storage().instance()
            .get(&P2PDataKey::Offer(trade.offer_id))
            .unwrap_or_else(|| panic!("Offer not found"));

        // Return collateral to vendor
        Self::transfer_tokens(
            env.clone(),
            &offer.collateral.token_address,
            &trade.vendor,
            &trade.collateral_amount,
        );

        // Update trade
        trade.status = TradeStatus::Completed;
        trade.completed_at = env.ledger().timestamp();
        env.storage().instance().set(&P2PDataKey::Trade(trade_id), &trade);

        // Update offer
        offer.active_trade_count -= 1;
        offer.completed_trade_count += 1;
        offer.updated_at = env.ledger().timestamp();
        env.storage().instance().set(&P2PDataKey::Offer(trade.offer_id), &offer);

        // Update vendor stats
        Self::update_vendor_stats(env.clone(), trade.vendor.clone(), trade.amount, true);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("completed"), buyer, trade.vendor.clone()),
            trade_id
        );
    }

    /// Buyer disputes trade - claims collateral
    pub fn dispute_trade(
        env: Env,
        buyer: Address,
        trade_id: u64,
        reason: String,
    ) {
        buyer.require_auth();

        let mut trade: Trade = env.storage().instance()
            .get(&P2PDataKey::Trade(trade_id))
            .unwrap_or_else(|| panic!("Trade not found"));

        if trade.buyer != buyer {
            panic!("Not trade buyer");
        }

        // Can dispute if delivered but not satisfied, or if auto-complete window passed
        let now = env.ledger().timestamp();
        let can_dispute = (trade.status == TradeStatus::Delivered) ||
                         (trade.status == TradeStatus::Funded && now > trade.auto_complete_at);

        if !can_dispute {
            panic!("Cannot dispute at this stage");
        }

        // Get offer for collateral info
        let mut offer: Offer = env.storage().instance()
            .get(&P2PDataKey::Offer(trade.offer_id))
            .unwrap_or_else(|| panic!("Offer not found"));

        // Return payment to buyer
        Self::transfer_tokens(
            env.clone(),
            &trade.payment_token,
            &buyer,
            &trade.amount,
        );

        // Transfer collateral to buyer (penalty for vendor)
        Self::transfer_tokens(
            env.clone(),
            &offer.collateral.token_address,
            &buyer,
            &trade.collateral_amount,
        );

        // Update trade
        trade.status = TradeStatus::DisputedBuyer;
        trade.dispute_reason = reason;
        trade.completed_at = env.ledger().timestamp();
        env.storage().instance().set(&P2PDataKey::Trade(trade_id), &trade);

        // Update offer
        offer.active_trade_count -= 1;
        offer.updated_at = env.ledger().timestamp();
        env.storage().instance().set(&P2PDataKey::Offer(trade.offer_id), &offer);

        // Update vendor stats (negative)
        Self::update_vendor_stats(env.clone(), trade.vendor.clone(), trade.amount, false);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("disputed"), buyer, trade.vendor.clone()),
            trade_id
        );
    }

    // ========================================================================
    // QUERY FUNCTIONS
    // ========================================================================

    pub fn get_offer(env: Env, offer_id: u64) -> Offer {
        env.storage().instance()
            .get(&P2PDataKey::Offer(offer_id))
            .unwrap_or_else(|| panic!("Offer not found"))
    }

    pub fn get_trade(env: Env, trade_id: u64) -> Trade {
        env.storage().instance()
            .get(&P2PDataKey::Trade(trade_id))
            .unwrap_or_else(|| panic!("Trade not found"))
    }

    pub fn get_vendor_offers(env: Env, vendor: Address) -> Vec<u64> {
        env.storage().instance()
            .get(&P2PDataKey::VendorOffers(vendor))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_category_offers(env: Env, category: Category) -> Vec<u64> {
        env.storage().instance()
            .get(&P2PDataKey::CategoryOffers(category))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_active_offers(env: Env) -> Vec<u64> {
        env.storage().instance()
            .get(&P2PDataKey::ActiveOffers)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_buyer_trades(env: Env, buyer: Address) -> Vec<u64> {
        env.storage().instance()
            .get(&P2PDataKey::BuyerTrades(buyer))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vendor_trades(env: Env, vendor: Address) -> Vec<u64> {
        env.storage().instance()
            .get(&P2PDataKey::VendorTrades(vendor))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vendor_stats(env: Env, vendor: Address) -> VendorStats {
        env.storage().instance()
            .get(&P2PDataKey::VendorStats(vendor.clone()))
            .unwrap_or(VendorStats {
                vendor,
                total_trades: 0,
                completed_trades: 0,
                disputed_trades: 0,
                total_volume: 0,
                reputation_score: 100,
            })
    }

    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

    /// Transfer tokens from user to contract (user already authorized via require_auth)
    fn transfer_from(
        env: Env,
        token: &Address,
        from: &Address,
        to: &Address,
        amount: &i128,
    ) {
        use soroban_sdk::IntoVal;
        let _: () = env.invoke_contract(
            token,
            &Symbol::new(&env, "transfer"),
            (from, to, amount).into_val(&env),
        );
    }

    /// Transfer tokens from contract to address
    fn transfer_tokens(
        env: Env,
        token: &Address,
        to: &Address,
        amount: &i128,
    ) {
        use soroban_sdk::IntoVal;
        let _: () = env.invoke_contract(
            token,
            &Symbol::new(&env, "transfer"),
            (&env.current_contract_address(), to, amount).into_val(&env),
        );
    }

    /// Update vendor statistics and reputation
    fn update_vendor_stats(
        env: Env,
        vendor: Address,
        trade_amount: i128,
        success: bool,
    ) {
        let mut stats: VendorStats = env.storage().instance()
            .get(&P2PDataKey::VendorStats(vendor.clone()))
            .unwrap_or(VendorStats {
                vendor: vendor.clone(),
                total_trades: 0,
                completed_trades: 0,
                disputed_trades: 0,
                total_volume: 0,
                reputation_score: 100,
            });

        stats.total_trades += 1;
        stats.total_volume += trade_amount;

        if success {
            stats.completed_trades += 1;
        } else {
            stats.disputed_trades += 1;
        }

        // Calculate reputation: (completed / total) * 100
        if stats.total_trades > 0 {
            stats.reputation_score = (stats.completed_trades * 100) / stats.total_trades;
        }

        env.storage().instance().set(&P2PDataKey::VendorStats(vendor), &stats);
    }
}

mod test;
