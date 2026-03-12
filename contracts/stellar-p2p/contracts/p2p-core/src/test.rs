#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env, String,
};

// Mock token contract for testing
fn create_token_contract<'a>(env: &Env, admin: &Address) -> (token::StellarAssetClient<'a>, token::TokenClient<'a>) {
    let contract_id = env.register_stellar_asset_contract_v2(admin.clone());
    let asset_client = token::StellarAssetClient::new(env, &contract_id.address());
    let token_client = token::TokenClient::new(env, &contract_id.address());
    (asset_client, token_client)
}

fn create_p2p_contract(env: &Env) -> StellarP2PContractClient {
    let contract_id = env.register(StellarP2PContract, ());
    StellarP2PContractClient::new(env, &contract_id)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client = create_p2p_contract(&env);

    client.initialize(&admin, &120, &86400, &604800);

    // Verify initialization worked (no panic)
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_cannot_initialize_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client = create_p2p_contract(&env);

    client.initialize(&admin, &120, &86400, &604800);
    client.initialize(&admin, &120, &86400, &604800); // Should panic
}

#[test]
fn test_register_token() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    // Verify token registered (no panic)
}

#[test]
fn test_create_offer() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, usdc_token) = create_token_contract(&env, &token_admin);

    // Initialize contract
    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    // Mint USDC to vendor for collateral
    usdc.mint(&vendor, &1200);

    // Create offer
    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50 Gift Card"),
        &String::from_str(&env, "Digital code delivered via email"),
        &1000, // Price: 1000 USDC
        &usdc.address,
        &1200, // Collateral: 120% of price
        &usdc.address,
    );

    assert_eq!(offer_id, 1);

    // Verify offer stored
    let offer = client.get_offer(&offer_id);
    assert_eq!(offer.vendor, vendor);
    assert_eq!(offer.price, 1000);
    assert_eq!(offer.collateral.amount, 1200);
    assert_eq!(offer.status, OfferStatus::Active);
}

#[test]
#[should_panic(expected = "Insufficient collateral")]
fn test_create_offer_insufficient_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1000);

    // Try to create offer with only 100% collateral (should fail, needs 120%)
    client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50 Gift Card"),
        &String::from_str(&env, "Digital code delivered via email"),
        &1000,
        &usdc.address,
        &1000, // Only 100% - should fail
        &usdc.address,
    );
}

#[test]
fn test_cancel_offer() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1200);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50 Gift Card"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    // Cancel offer
    client.cancel_offer(&vendor, &offer_id);

    // Verify offer status updated
    let offer = client.get_offer(&offer_id);
    assert_eq!(offer.status, OfferStatus::Cancelled);
}

#[test]
fn test_accept_offer() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1200);
    usdc.mint(&buyer, &1000);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    // Buyer accepts offer
    let trade_id = client.accept_offer(&buyer, &offer_id);

    assert_eq!(trade_id, 1);

    // Verify trade created
    let trade = client.get_trade(&trade_id);
    assert_eq!(trade.buyer, buyer);
    assert_eq!(trade.vendor, vendor);
    assert_eq!(trade.amount, 1000);
    assert_eq!(trade.status, TradeStatus::Funded);

    // Verify offer updated
    let offer = client.get_offer(&offer_id);
    assert_eq!(offer.active_trade_count, 1);
}

#[test]
#[should_panic(expected = "Cannot trade with yourself")]
fn test_cannot_self_trade() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &2200);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    // Vendor tries to accept own offer
    client.accept_offer(&vendor, &offer_id);
}

#[test]
fn test_mark_delivered() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1200);
    usdc.mint(&buyer, &1000);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    let trade_id = client.accept_offer(&buyer, &offer_id);

    // Vendor marks as delivered
    client.mark_delivered(
        &vendor,
        &trade_id,
        &String::from_str(&env, "CODE: XXXX-YYYY-ZZZZ"),
    );

    // Verify trade updated
    let trade = client.get_trade(&trade_id);
    assert_eq!(trade.status, TradeStatus::Delivered);
    assert_eq!(trade.delivery_proof, String::from_str(&env, "CODE: XXXX-YYYY-ZZZZ"));
}

#[test]
fn test_confirm_delivery() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1200);
    usdc.mint(&buyer, &1000);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    let trade_id = client.accept_offer(&buyer, &offer_id);

    client.mark_delivered(
        &vendor,
        &trade_id,
        &String::from_str(&env, "CODE: XXXX-YYYY-ZZZZ"),
    );

    // Buyer confirms delivery
    client.confirm_delivery(&buyer, &trade_id);

    // Verify trade completed
    let trade = client.get_trade(&trade_id);
    assert_eq!(trade.status, TradeStatus::Completed);

    // Verify offer updated
    let offer = client.get_offer(&offer_id);
    assert_eq!(offer.active_trade_count, 0);
    assert_eq!(offer.completed_trade_count, 1);

    // Verify vendor stats updated
    let stats = client.get_vendor_stats(&vendor);
    assert_eq!(stats.total_trades, 1);
    assert_eq!(stats.completed_trades, 1);
    assert_eq!(stats.disputed_trades, 0);
    assert_eq!(stats.reputation_score, 100);
}

#[test]
fn test_dispute_trade() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1200);
    usdc.mint(&buyer, &1000);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    let trade_id = client.accept_offer(&buyer, &offer_id);

    client.mark_delivered(
        &vendor,
        &trade_id,
        &String::from_str(&env, "CODE: INVALID"),
    );

    // Buyer disputes (code didn't work)
    client.dispute_trade(
        &buyer,
        &trade_id,
        &String::from_str(&env, "Code already used"),
    );

    // Verify trade disputed
    let trade = client.get_trade(&trade_id);
    assert_eq!(trade.status, TradeStatus::DisputedBuyer);

    // Verify vendor stats updated (negative)
    let stats = client.get_vendor_stats(&vendor);
    assert_eq!(stats.total_trades, 1);
    assert_eq!(stats.completed_trades, 0);
    assert_eq!(stats.disputed_trades, 1);
    assert_eq!(stats.reputation_score, 0);
}

#[test]
fn test_get_vendor_offers() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &3600);

    // Create multiple offers
    let offer1 = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    let offer2 = client.create_offer(
        &vendor,
        &Category::Gaming,
        &String::from_str(&env, "PUBG UC"),
        &String::from_str(&env, "Game top-up"),
        &500,
        &usdc.address,
        &600,
        &usdc.address,
    );

    // Get vendor offers
    let offers = client.get_vendor_offers(&vendor);
    assert_eq!(offers.len(), 2);
    assert_eq!(offers.get(0).unwrap(), offer1);
    assert_eq!(offers.get(1).unwrap(), offer2);
}

#[test]
fn test_get_category_offers() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &3600);

    // Create offers in different categories
    let gift_card = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    let gaming = client.create_offer(
        &vendor,
        &Category::Gaming,
        &String::from_str(&env, "PUBG UC"),
        &String::from_str(&env, "Game top-up"),
        &500,
        &usdc.address,
        &600,
        &usdc.address,
    );

    // Get gift card offers
    let gift_cards = client.get_category_offers(&Category::GiftCards);
    assert_eq!(gift_cards.len(), 1);
    assert_eq!(gift_cards.get(0).unwrap(), gift_card);

    // Get gaming offers
    let gaming_offers = client.get_category_offers(&Category::Gaming);
    assert_eq!(gaming_offers.len(), 1);
    assert_eq!(gaming_offers.get(0).unwrap(), gaming);
}

#[test]
#[should_panic(expected = "Has active trades")]
fn test_cannot_cancel_offer_with_active_trades() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vendor = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let client = create_p2p_contract(&env);
    let (usdc, _) = create_token_contract(&env, &token_admin);

    client.initialize(&admin, &120, &86400, &604800);
    client.register_token(&admin, &usdc.address);

    usdc.mint(&vendor, &1200);
    usdc.mint(&buyer, &1000);

    let offer_id = client.create_offer(
        &vendor,
        &Category::GiftCards,
        &String::from_str(&env, "Amazon $50"),
        &String::from_str(&env, "Digital code"),
        &1000,
        &usdc.address,
        &1200,
        &usdc.address,
    );

    // Create active trade
    client.accept_offer(&buyer, &offer_id);

    // Try to cancel (should fail)
    client.cancel_offer(&vendor, &offer_id);
}
