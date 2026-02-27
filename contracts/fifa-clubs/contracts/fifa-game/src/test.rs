#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};
use club_minter::ClubMinterContract;

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    // Register club contract
    let club_contract_id = env.register(ClubMinterContract, ());

    // Register game contract
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);

    // Initialize
    game_client.initialize(&admin, &club_contract_id);

    // Verify
    let stored_club_contract = game_client.get_club_contract();
    assert_eq!(stored_club_contract, club_contract_id);
}

#[test]
fn test_register_club_inter_contract() {
    let env = Env::default();
    env.mock_all_auths();

    // Register club contract
    let club_contract_id = env.register(ClubMinterContract, ());

    // Register game contract
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    // Initialize game with club contract
    game_client.initialize(&admin, &club_contract_id);

    // Register a club through game contract (inter-contract call)
    let club_id = game_client.register_club(
        &player,
        &String::from_str(&env, "Real Madrid"),
        &String::from_str(&env, "https://example.com/realmadrid.png")
    );

    assert_eq!(club_id, 1);

    // Verify club is registered in game
    assert!(game_client.is_club_registered(&club_id));

    // Verify we can get club info via inter-contract call
    let club_info = game_client.get_club_info(&club_id);
    assert_eq!(club_info.id, 1);
    assert_eq!(club_info.owner, player);
}

#[test]
fn test_query_club_stats_inter_contract() {
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
        &String::from_str(&env, "Barcelona"),
        &String::from_str(&env, "https://example.com/barca.png")
    );

    // Get stats via inter-contract call
    let stats = game_client.query_club_stats(&club_id);

    // Verify stats are in valid range
    assert!(stats.attack >= 50 && stats.attack <= 99);
    assert!(stats.defense >= 50 && stats.defense <= 99);
    assert!(stats.overall >= 50 && stats.overall <= 99);
}

#[test]
fn test_get_player_clubs() {
    let env = Env::default();
    env.mock_all_auths();

    let club_contract_id = env.register(ClubMinterContract, ());
    let game_contract_id = env.register(FifaGameContract, ());
    let game_client = FifaGameContractClient::new(&env, &game_contract_id);

    let admin = Address::generate(&env);
    let player = Address::generate(&env);

    game_client.initialize(&admin, &club_contract_id);

    // Register multiple clubs
    game_client.register_club(
        &player,
        &String::from_str(&env, "Club 1"),
        &String::from_str(&env, "https://example.com/1.png")
    );
    game_client.register_club(
        &player,
        &String::from_str(&env, "Club 2"),
        &String::from_str(&env, "https://example.com/2.png")
    );

    let player_clubs = game_client.get_player_clubs(&player);
    assert_eq!(player_clubs.len(), 2);
}

#[test]
fn test_simulate_match() {
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
        &String::from_str(&env, "Team A"),
        &String::from_str(&env, "https://example.com/a.png")
    );

    let club2_id = game_client.register_club(
        &player2,
        &String::from_str(&env, "Team B"),
        &String::from_str(&env, "https://example.com/b.png")
    );

    // Simulate match
    let (winner, loser) = game_client.simulate_match(&club1_id, &club2_id);

    // Either someone wins or it's a draw
    if winner == 0 && loser == 0 {
        // Draw - both should have 1 draw
        let club1 = game_client.get_club_info(&club1_id);
        let club2 = game_client.get_club_info(&club2_id);
        assert_eq!(club1.draws, 1);
        assert_eq!(club2.draws, 1);
    } else {
        // Someone won
        let winner_club = game_client.get_club_info(&winner);
        let loser_club = game_client.get_club_info(&loser);
        assert_eq!(winner_club.wins, 1);
        assert_eq!(loser_club.losses, 1);
    }
}
