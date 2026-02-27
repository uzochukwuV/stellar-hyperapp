#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_mint_club() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ClubMinterContract, ());
    let client = ClubMinterContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let name = String::from_str(&env, "Manchester United");
    let logo_url = String::from_str(&env, "https://example.com/manutd.png");

    let club_id = client.mint_club(&owner, &name, &logo_url);

    assert_eq!(club_id, 1);

    let club = client.get_club(&club_id);
    assert_eq!(club.id, 1);
    assert_eq!(club.owner, owner);
    assert_eq!(club.wins, 0);
    assert_eq!(club.losses, 0);
    assert_eq!(club.draws, 0);

    // Check stats are in valid range (50-99)
    assert!(club.stats.attack >= 50 && club.stats.attack <= 99);
    assert!(club.stats.defense >= 50 && club.stats.defense <= 99);
    assert!(club.stats.midfield >= 50 && club.stats.midfield <= 99);
    assert!(club.stats.goalkeeping >= 50 && club.stats.goalkeeping <= 99);
    assert!(club.stats.speed >= 50 && club.stats.speed <= 99);
}

#[test]
fn test_get_clubs_by_owner() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ClubMinterContract, ());
    let client = ClubMinterContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);

    // Mint 3 clubs
    client.mint_club(
        &owner,
        &String::from_str(&env, "Club 1"),
        &String::from_str(&env, "https://example.com/1.png")
    );
    client.mint_club(
        &owner,
        &String::from_str(&env, "Club 2"),
        &String::from_str(&env, "https://example.com/2.png")
    );
    client.mint_club(
        &owner,
        &String::from_str(&env, "Club 3"),
        &String::from_str(&env, "https://example.com/3.png")
    );

    let owner_clubs = client.get_clubs_by_owner(&owner);
    assert_eq!(owner_clubs.len(), 3);
}

#[test]
fn test_update_record() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ClubMinterContract, ());
    let client = ClubMinterContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let club_id = client.mint_club(
        &owner,
        &String::from_str(&env, "Test Club"),
        &String::from_str(&env, "https://example.com/test.png")
    );

    // Record some matches
    client.update_record(&club_id, &MatchResult::Win);
    client.update_record(&club_id, &MatchResult::Win);
    client.update_record(&club_id, &MatchResult::Loss);
    client.update_record(&club_id, &MatchResult::Draw);

    let club = client.get_club(&club_id);
    assert_eq!(club.wins, 2);
    assert_eq!(club.losses, 1);
    assert_eq!(club.draws, 1);
}

#[test]
fn test_get_club_stats() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ClubMinterContract, ());
    let client = ClubMinterContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let club_id = client.mint_club(
        &owner,
        &String::from_str(&env, "Stats Club"),
        &String::from_str(&env, "https://example.com/stats.png")
    );

    let stats = client.get_club_stats(&club_id);

    // Verify overall is average of other stats
    let expected_overall = (stats.attack + stats.defense + stats.midfield + stats.goalkeeping + stats.speed) / 5;
    assert_eq!(stats.overall, expected_overall);
}

#[test]
fn test_transfer_club() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ClubMinterContract, ());
    let client = ClubMinterContractClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);

    let club_id = client.mint_club(
        &owner1,
        &String::from_str(&env, "Transferable Club"),
        &String::from_str(&env, "https://example.com/transfer.png")
    );

    // Transfer
    client.transfer(&owner1, &owner2, &club_id);

    // Verify new owner
    let new_owner = client.get_owner(&club_id);
    assert_eq!(new_owner, owner2);

    // Verify owner lists updated
    let owner1_clubs = client.get_clubs_by_owner(&owner1);
    let owner2_clubs = client.get_clubs_by_owner(&owner2);

    assert_eq!(owner1_clubs.len(), 0);
    assert_eq!(owner2_clubs.len(), 1);
}
