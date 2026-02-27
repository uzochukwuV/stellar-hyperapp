#![no_std]
use soroban_sdk::{
    contract, contracttype, contractimpl,
    Env, String, Symbol, symbol_short, Address, Vec, IntoVal
};

// Storage keys
const CLUB_CONTRACT: Symbol = symbol_short!("CLUB_CT");
const ADMIN: Symbol = symbol_short!("ADMIN");

// Re-define types locally to avoid linking issues
#[contracttype]
#[derive(Clone, Debug)]
pub struct ClubStats {
    pub attack: u32,
    pub defense: u32,
    pub midfield: u32,
    pub goalkeeping: u32,
    pub speed: u32,
    pub overall: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MatchResult {
    Win,
    Loss,
    Draw,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ClubMetadata {
    pub id: u64,
    pub name: String,
    pub logo_url: String,
    pub owner: Address,
    pub stats: ClubStats,
    pub wins: u32,
    pub losses: u32,
    pub draws: u32,
    pub created_at: u64,
}

// Registered club in game
#[contracttype]
pub enum GameDataKey {
    RegisteredClub(u64),
    PlayerClubs(Address),
}

// Club ranking for leaderboard
#[contracttype]
#[derive(Clone, Debug)]
pub struct ClubRanking {
    pub club_id: u64,
    pub name: String,
    pub wins: u32,
    pub losses: u32,
    pub draws: u32,
    pub points: u32,
}

#[contract]
pub struct FifaGameContract;

#[contractimpl]
impl FifaGameContract {
    /// Initialize the game contract with club contract address
    pub fn initialize(env: Env, admin: Address, club_contract: Address) {
        admin.require_auth();

        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&CLUB_CONTRACT, &club_contract);
        env.storage().instance().extend_ttl(5000, 5000);
    }

    /// Register a new club (mints via inter-contract call)
    pub fn register_club(
        env: Env,
        owner: Address,
        name: String,
        logo_url: String,
    ) -> u64 {
        owner.require_auth();

        let club_contract: Address = env
            .storage()
            .instance()
            .get(&CLUB_CONTRACT)
            .unwrap_or_else(|| panic!("Game not initialized"));

        // Inter-contract call using invoke_contract
        let club_id: u64 = env.invoke_contract(
            &club_contract,
            &Symbol::new(&env, "mint_club"),
            (owner.clone(), name, logo_url).into_val(&env),
        );

        // Register club in game
        env.storage().instance().set(&GameDataKey::RegisteredClub(club_id), &true);

        // Add to player's clubs
        let mut player_clubs: Vec<u64> = env
            .storage()
            .instance()
            .get(&GameDataKey::PlayerClubs(owner.clone()))
            .unwrap_or(Vec::new(&env));
        player_clubs.push_back(club_id);
        env.storage().instance().set(&GameDataKey::PlayerClubs(owner.clone()), &player_clubs);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("register"), owner),
            club_id
        );

        club_id
    }

    /// Get club info via inter-contract call
    pub fn get_club_info(env: Env, club_id: u64) -> ClubMetadata {
        let club_contract: Address = env
            .storage()
            .instance()
            .get(&CLUB_CONTRACT)
            .unwrap_or_else(|| panic!("Game not initialized"));

        env.invoke_contract(
            &club_contract,
            &Symbol::new(&env, "get_club"),
            (club_id,).into_val(&env),
        )
    }

    /// Get club stats via inter-contract call
    pub fn query_club_stats(env: Env, club_id: u64) -> ClubStats {
        let club_contract: Address = env
            .storage()
            .instance()
            .get(&CLUB_CONTRACT)
            .unwrap_or_else(|| panic!("Game not initialized"));

        env.invoke_contract(
            &club_contract,
            &Symbol::new(&env, "get_club_stats"),
            (club_id,).into_val(&env),
        )
    }

    /// Get player's registered clubs
    pub fn get_player_clubs(env: Env, player: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&GameDataKey::PlayerClubs(player))
            .unwrap_or(Vec::new(&env))
    }

    /// Check if club is registered in game
    pub fn is_club_registered(env: Env, club_id: u64) -> bool {
        env.storage()
            .instance()
            .get(&GameDataKey::RegisteredClub(club_id))
            .unwrap_or(false)
    }

    /// Get club contract address
    pub fn get_club_contract(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&CLUB_CONTRACT)
            .unwrap_or_else(|| panic!("Game not initialized"))
    }

    /// Simulate a match between two clubs
    pub fn simulate_match(env: Env, club1_id: u64, club2_id: u64) -> (u64, u64) {
        if !Self::is_club_registered(env.clone(), club1_id) {
            panic!("Club 1 not registered");
        }
        if !Self::is_club_registered(env.clone(), club2_id) {
            panic!("Club 2 not registered");
        }

        let club_contract: Address = env
            .storage()
            .instance()
            .get(&CLUB_CONTRACT)
            .unwrap();

        // Get stats via inter-contract calls
        let stats1: ClubStats = env.invoke_contract(
            &club_contract,
            &Symbol::new(&env, "get_club_stats"),
            (club1_id,).into_val(&env),
        );
        let stats2: ClubStats = env.invoke_contract(
            &club_contract,
            &Symbol::new(&env, "get_club_stats"),
            (club2_id,).into_val(&env),
        );

        // Simple match simulation
        let score1 = stats1.overall + (env.ledger().timestamp() % 10) as u32;
        let score2 = stats2.overall + ((env.ledger().timestamp() / 3) % 10) as u32;

        let (winner, loser) = if score1 > score2 + 5 {
            // Club 1 wins - update records via inter-contract calls
            let _: () = env.invoke_contract(
                &club_contract,
                &Symbol::new(&env, "update_record"),
                (club1_id, MatchResult::Win).into_val(&env),
            );
            let _: () = env.invoke_contract(
                &club_contract,
                &Symbol::new(&env, "update_record"),
                (club2_id, MatchResult::Loss).into_val(&env),
            );
            (club1_id, club2_id)
        } else if score2 > score1 + 5 {
            // Club 2 wins
            let _: () = env.invoke_contract(
                &club_contract,
                &Symbol::new(&env, "update_record"),
                (club2_id, MatchResult::Win).into_val(&env),
            );
            let _: () = env.invoke_contract(
                &club_contract,
                &Symbol::new(&env, "update_record"),
                (club1_id, MatchResult::Loss).into_val(&env),
            );
            (club2_id, club1_id)
        } else {
            // Draw
            let _: () = env.invoke_contract(
                &club_contract,
                &Symbol::new(&env, "update_record"),
                (club1_id, MatchResult::Draw).into_val(&env),
            );
            let _: () = env.invoke_contract(
                &club_contract,
                &Symbol::new(&env, "update_record"),
                (club2_id, MatchResult::Draw).into_val(&env),
            );
            (0, 0)
        };

        env.events().publish(
            (symbol_short!("match"), club1_id, club2_id),
            (winner, loser)
        );

        (winner, loser)
    }
}

mod test;
