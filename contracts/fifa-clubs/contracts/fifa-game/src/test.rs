#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};
use club_minter::ClubMinterContract;

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    game_client.initialize(&admin, &club_contract_id);

    let stored_club_contract = game_client.get_club_contract();
    assert_eq!(stored_club_contract, club_contract_id);
}

#[test]
fn test_create_match() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    // Register a club
    let club_id = game_client.register_club(
        &player,
        &String::from_str(&env, "Test Club"),
        &String::from_str(&env, "https://example.com/logo.png")
    );

    // Create a match with 3 tactics
    let match_id = game_client.create_match(
        &player,
        &club_id,
        &0, &1, &2  // UltraAttack, Attack, Balanced
    );

    assert_eq!(match_id, 1);

    let game_match = game_client.get_match(&match_id);
    assert_eq!(game_match.status, 0);  // Open
    assert_eq!(game_match.challenger_club, club_id);
}

#[test]
fn test_accept_match() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    // Register clubs for both players
    let club1_id = game_client.register_club(
        &player1,
        &String::from_str(&env, "Club 1"),
        &String::from_str(&env, "https://example.com/1.png")
    );
    let club2_id = game_client.register_club(
        &player2,
        &String::from_str(&env, "Club 2"),
        &String::from_str(&env, "https://example.com/2.png")
    );

    // Player 1 creates match
    let match_id = game_client.create_match(
        &player1,
        &club1_id,
        &0, &0, &0  // All UltraAttack
    );

    // Player 2 accepts match
    let result = game_client.accept_match(
        &player2,
        &match_id,
        &club2_id,
        &3, &3, &3  // All Defense (beats UltraAttack)
    );

    assert_eq!(result.status, 1);  // Completed
    // Defense beats UltraAttack, so player 2 should win more rounds
}

#[test]
fn test_tactic_matchups() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    let club1_id = game_client.register_club(
        &player1,
        &String::from_str(&env, "Attacker FC"),
        &String::from_str(&env, "https://example.com/atk.png")
    );
    let club2_id = game_client.register_club(
        &player2,
        &String::from_str(&env, "Defender FC"),
        &String::from_str(&env, "https://example.com/def.png")
    );

    // Test: UltraAttack (0) beats Balanced (2)
    let match_id = game_client.create_match(&player1, &club1_id, &0, &0, &0);
    let result = game_client.accept_match(&player2, &match_id, &club2_id, &2, &2, &2);

    // UltraAttack should beat Balanced (unless stats override)
    assert_eq!(result.status, 1);
}

#[test]
fn test_get_open_matches() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    let club_id = game_client.register_club(
        &player,
        &String::from_str(&env, "Test Club"),
        &String::from_str(&env, "https://example.com/logo.png")
    );

    // Create multiple matches
    game_client.create_match(&player, &club_id, &0, &1, &2);
    game_client.create_match(&player, &club_id, &3, &4, &5);

    let open_matches = game_client.get_open_matches();
    assert_eq!(open_matches.len(), 2);
}

#[test]
fn test_cancel_match() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    let club_id = game_client.register_club(
        &player,
        &String::from_str(&env, "Test Club"),
        &String::from_str(&env, "https://example.com/logo.png")
    );

    let match_id = game_client.create_match(&player, &club_id, &0, &1, &2);

    // Cancel the match
    game_client.cancel_match(&player, &match_id);

    let game_match = game_client.get_match(&match_id);
    assert_eq!(game_match.status, 2);  // Cancelled

    // Should be removed from open matches
    let open_matches = game_client.get_open_matches();
    assert_eq!(open_matches.len(), 0);
}

#[test]
fn test_player_matches() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player1 = Address::generate(&env);
    let player2 = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    let club1_id = game_client.register_club(
        &player1,
        &String::from_str(&env, "Club 1"),
        &String::from_str(&env, "https://example.com/1.png")
    );
    let club2_id = game_client.register_club(
        &player2,
        &String::from_str(&env, "Club 2"),
        &String::from_str(&env, "https://example.com/2.png")
    );

    // Player 1 creates and Player 2 accepts
    let match_id = game_client.create_match(&player1, &club1_id, &0, &1, &2);
    game_client.accept_match(&player2, &match_id, &club2_id, &3, &4, &5);

    // Both players should have this match in their history
    let p1_matches = game_client.get_player_matches(&player1);
    let p2_matches = game_client.get_player_matches(&player2);

    assert_eq!(p1_matches.len(), 1);
    assert_eq!(p2_matches.len(), 1);
}
