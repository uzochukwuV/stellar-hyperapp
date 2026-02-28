#![no_std]
use soroban_sdk::{
    contract, contracttype, contractimpl,
    Env, String, Symbol, symbol_short, Address, Vec, IntoVal
};

// Storage keys
const CLUB_CONTRACT: Symbol = symbol_short!("CLUB_CT");
const ADMIN: Symbol = symbol_short!("ADMIN");
const MATCH_COUNT: Symbol = symbol_short!("MATCH_C");

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

// 7 FIFA-style Tactics
// 0=UltraAttack, 1=Attack, 2=Balanced, 3=Defense, 4=UltraDefense, 5=Counter, 6=Possession

// Match data structures
#[contracttype]
#[derive(Clone, Debug)]
pub struct TacticsMatch {
    pub id: u64,
    pub challenger: Address,
    pub challenger_club: u64,
    pub challenger_tactics: (u32, u32, u32),
    pub opponent: Address,
    pub opponent_club: u64,
    pub opponent_tactics: (u32, u32, u32),
    pub status: u32,  // 0=Open, 1=Completed, 2=Cancelled
    pub winner_club: u64,  // 0=draw
    pub rounds_won: (u32, u32),  // (challenger_wins, opponent_wins)
    pub created_at: u64,
}

// Storage keys enum
#[contracttype]
pub enum GameDataKey {
    RegisteredClub(u64),
    PlayerClubs(Address),
    Match(u64),
    OpenMatches,
    PlayerMatches(Address),
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

// Tactic matchup matrix: returns advantage for tactic1 vs tactic2
// +2 = strong win, -2 = strong loss, 0 = neutral (stats decide)
fn get_tactic_advantage(t1: u32, t2: u32) -> i32 {
    // Matrix[t1][t2] = advantage for t1
    // Tactics: 0=UltraAttack, 1=Attack, 2=Balanced, 3=Defense, 4=UltraDefense, 5=Counter, 6=Possession
    let matrix: [[i32; 7]; 7] = [
        // UA   ATK  BAL  DEF   UD  CTR  POS
        [  0,   0,   2,  -2,  -2,   0,   2], // UltraAttack
        [  0,   0,   2,   2,  -2,  -2,   0], // Attack
        [ -2,  -2,   0,   0,   2,   2,  -2], // Balanced
        [  2,  -2,   0,   0,   0,  -2,   2], // Defense
        [  2,   2,  -2,   0,   0,  -2,   2], // UltraDefense
        [  0,   2,  -2,   2,   2,   0,   0], // Counter
        [ -2,   0,   2,  -2,  -2,   0,   0], // Possession
    ];

    if t1 > 6 || t2 > 6 {
        return 0;
    }
    matrix[t1 as usize][t2 as usize]
}

// Get relevant stats for a tactic
fn get_tactic_stats(stats: &ClubStats, tactic: u32) -> u32 {
    match tactic {
        0 => (stats.attack + stats.speed) / 2,        // UltraAttack: ATK + SPD
        1 => (stats.attack + stats.midfield) / 2,     // Attack: ATK + MID
        2 => (stats.midfield + stats.overall) / 2,    // Balanced: MID + OVR
        3 => (stats.defense + stats.goalkeeping) / 2, // Defense: DEF + GK
        4 => (stats.defense + stats.goalkeeping) / 2, // UltraDefense: DEF + GK
        5 => (stats.speed + stats.defense) / 2,       // Counter: SPD + DEF
        6 => (stats.midfield + stats.attack) / 2,     // Possession: MID + ATK
        _ => stats.overall,
    }
}

// Calculate round winner: returns (p1_won, p2_won, is_draw)
fn calculate_round(stats1: &ClubStats, t1: u32, stats2: &ClubStats, t2: u32) -> (bool, bool, bool) {
    let tactic_advantage = get_tactic_advantage(t1, t2);
    let p1_stat = get_tactic_stats(stats1, t1) as i32;
    let p2_stat = get_tactic_stats(stats2, t2) as i32;

    // Stat modifier: difference / 10, capped at +-5
    let mut stat_modifier = (p1_stat - p2_stat) / 10;
    if stat_modifier > 5 { stat_modifier = 5; }
    if stat_modifier < -5 { stat_modifier = -5; }

    let final_score = tactic_advantage + stat_modifier;

    if final_score > 0 {
        (true, false, false)  // P1 wins
    } else if final_score < 0 {
        (false, true, false)  // P2 wins
    } else {
        (false, false, true)  // Draw
    }
}

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
        env.storage().instance().set(&MATCH_COUNT, &0u64);
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

        let club_id: u64 = env.invoke_contract(
            &club_contract,
            &Symbol::new(&env, "mint_club"),
            (owner.clone(), name, logo_url).into_val(&env),
        );

        env.storage().instance().set(&GameDataKey::RegisteredClub(club_id), &true);

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

    /// Create a match challenge with 3 tactics
    pub fn create_match(
        env: Env,
        challenger: Address,
        club_id: u64,
        t1: u32, t2: u32, t3: u32,
    ) -> u64 {
        challenger.require_auth();

        // Validate tactics (0-6)
        if t1 > 6 || t2 > 6 || t3 > 6 {
            panic!("Invalid tactic");
        }

        // Verify club ownership
        let club_info = Self::get_club_info(env.clone(), club_id);
        if club_info.owner != challenger {
            panic!("Not club owner");
        }

        // Get and increment match count
        let mut match_count: u64 = env.storage().instance().get(&MATCH_COUNT).unwrap_or(0);
        match_count += 1;

        // Create match
        let game_match = TacticsMatch {
            id: match_count,
            challenger: challenger.clone(),
            challenger_club: club_id,
            challenger_tactics: (t1, t2, t3),
            opponent: challenger.clone(), // Placeholder
            opponent_club: 0,
            opponent_tactics: (0, 0, 0),
            status: 0, // Open
            winner_club: 0,
            rounds_won: (0, 0),
            created_at: env.ledger().timestamp(),
        };

        // Store match
        env.storage().instance().set(&GameDataKey::Match(match_count), &game_match);
        env.storage().instance().set(&MATCH_COUNT, &match_count);

        // Add to open matches
        let mut open_matches: Vec<u64> = env
            .storage()
            .instance()
            .get(&GameDataKey::OpenMatches)
            .unwrap_or(Vec::new(&env));
        open_matches.push_back(match_count);
        env.storage().instance().set(&GameDataKey::OpenMatches, &open_matches);

        // Add to player's matches
        let mut player_matches: Vec<u64> = env
            .storage()
            .instance()
            .get(&GameDataKey::PlayerMatches(challenger.clone()))
            .unwrap_or(Vec::new(&env));
        player_matches.push_back(match_count);
        env.storage().instance().set(&GameDataKey::PlayerMatches(challenger.clone()), &player_matches);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("create"), challenger),
            match_count
        );

        match_count
    }

    /// Accept and resolve a match
    pub fn accept_match(
        env: Env,
        opponent: Address,
        match_id: u64,
        club_id: u64,
        t1: u32, t2: u32, t3: u32,
    ) -> TacticsMatch {
        opponent.require_auth();

        // Validate tactics
        if t1 > 6 || t2 > 6 || t3 > 6 {
            panic!("Invalid tactic");
        }

        // Get match
        let mut game_match: TacticsMatch = env
            .storage()
            .instance()
            .get(&GameDataKey::Match(match_id))
            .unwrap_or_else(|| panic!("Match not found"));

        if game_match.status != 0 {
            panic!("Match not open");
        }

        if game_match.challenger == opponent {
            panic!("Cannot play against yourself");
        }

        // Verify club ownership
        let club_info = Self::get_club_info(env.clone(), club_id);
        if club_info.owner != opponent {
            panic!("Not club owner");
        }

        // Get club stats for both players
        let stats1 = Self::query_club_stats(env.clone(), game_match.challenger_club);
        let stats2 = Self::query_club_stats(env.clone(), club_id);

        // Calculate each round
        let mut p1_wins = 0u32;
        let mut p2_wins = 0u32;

        // Round 1
        let (p1_won, p2_won, _) = calculate_round(
            &stats1, game_match.challenger_tactics.0,
            &stats2, t1
        );
        if p1_won { p1_wins += 1; }
        if p2_won { p2_wins += 1; }

        // Round 2
        let (p1_won, p2_won, _) = calculate_round(
            &stats1, game_match.challenger_tactics.1,
            &stats2, t2
        );
        if p1_won { p1_wins += 1; }
        if p2_won { p2_wins += 1; }

        // Round 3
        let (p1_won, p2_won, _) = calculate_round(
            &stats1, game_match.challenger_tactics.2,
            &stats2, t3
        );
        if p1_won { p1_wins += 1; }
        if p2_won { p2_wins += 1; }

        // Determine winner
        let winner_club = if p1_wins > p2_wins {
            game_match.challenger_club
        } else if p2_wins > p1_wins {
            club_id
        } else {
            0 // Draw
        };

        // Update match
        game_match.opponent = opponent.clone();
        game_match.opponent_club = club_id;
        game_match.opponent_tactics = (t1, t2, t3);
        game_match.status = 1; // Completed
        game_match.winner_club = winner_club;
        game_match.rounds_won = (p1_wins, p2_wins);

        // Store updated match
        env.storage().instance().set(&GameDataKey::Match(match_id), &game_match);

        // Remove from open matches
        let open_matches: Vec<u64> = env
            .storage()
            .instance()
            .get(&GameDataKey::OpenMatches)
            .unwrap_or(Vec::new(&env));
        let mut new_open: Vec<u64> = Vec::new(&env);
        for i in 0..open_matches.len() {
            let id = open_matches.get(i).unwrap();
            if id != match_id {
                new_open.push_back(id);
            }
        }
        env.storage().instance().set(&GameDataKey::OpenMatches, &new_open);

        // Add to opponent's matches
        let mut player_matches: Vec<u64> = env
            .storage()
            .instance()
            .get(&GameDataKey::PlayerMatches(opponent.clone()))
            .unwrap_or(Vec::new(&env));
        player_matches.push_back(match_id);
        env.storage().instance().set(&GameDataKey::PlayerMatches(opponent.clone()), &player_matches);

        // Update club records via inter-contract calls
        let club_contract: Address = env.storage().instance().get(&CLUB_CONTRACT).unwrap();

        if winner_club == game_match.challenger_club {
            let _: () = env.invoke_contract(&club_contract, &Symbol::new(&env, "update_record"),
                (game_match.challenger_club, MatchResult::Win).into_val(&env));
            let _: () = env.invoke_contract(&club_contract, &Symbol::new(&env, "update_record"),
                (club_id, MatchResult::Loss).into_val(&env));
        } else if winner_club == club_id {
            let _: () = env.invoke_contract(&club_contract, &Symbol::new(&env, "update_record"),
                (club_id, MatchResult::Win).into_val(&env));
            let _: () = env.invoke_contract(&club_contract, &Symbol::new(&env, "update_record"),
                (game_match.challenger_club, MatchResult::Loss).into_val(&env));
        } else {
            let _: () = env.invoke_contract(&club_contract, &Symbol::new(&env, "update_record"),
                (game_match.challenger_club, MatchResult::Draw).into_val(&env));
            let _: () = env.invoke_contract(&club_contract, &Symbol::new(&env, "update_record"),
                (club_id, MatchResult::Draw).into_val(&env));
        }

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("match"), match_id),
            winner_club
        );

        game_match
    }

    /// Get match by ID
    pub fn get_match(env: Env, match_id: u64) -> TacticsMatch {
        env.storage()
            .instance()
            .get(&GameDataKey::Match(match_id))
            .unwrap_or_else(|| panic!("Match not found"))
    }

    /// Get all open matches
    pub fn get_open_matches(env: Env) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&GameDataKey::OpenMatches)
            .unwrap_or(Vec::new(&env))
    }

    /// Get player's matches
    pub fn get_player_matches(env: Env, player: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&GameDataKey::PlayerMatches(player))
            .unwrap_or(Vec::new(&env))
    }

    /// Cancel an open match (challenger only)
    pub fn cancel_match(env: Env, challenger: Address, match_id: u64) {
        challenger.require_auth();

        let mut game_match: TacticsMatch = env
            .storage()
            .instance()
            .get(&GameDataKey::Match(match_id))
            .unwrap_or_else(|| panic!("Match not found"));

        if game_match.challenger != challenger {
            panic!("Not the challenger");
        }

        if game_match.status != 0 {
            panic!("Match not open");
        }

        game_match.status = 2; // Cancelled
        env.storage().instance().set(&GameDataKey::Match(match_id), &game_match);

        // Remove from open matches
        let open_matches: Vec<u64> = env
            .storage()
            .instance()
            .get(&GameDataKey::OpenMatches)
            .unwrap_or(Vec::new(&env));
        let mut new_open: Vec<u64> = Vec::new(&env);
        for i in 0..open_matches.len() {
            let id = open_matches.get(i).unwrap();
            if id != match_id {
                new_open.push_back(id);
            }
        }
        env.storage().instance().set(&GameDataKey::OpenMatches, &new_open);

        env.storage().instance().extend_ttl(5000, 5000);
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

    /// Get total match count
    pub fn get_match_count(env: Env) -> u64 {
        env.storage().instance().get(&MATCH_COUNT).unwrap_or(0)
    }
}

mod test;
