#![no_std]
use soroban_sdk::{
    contract, contracttype, contractimpl,
    Env, String, Symbol, symbol_short, Address, Vec
};

// Storage keys
const CLUB_COUNT: Symbol = symbol_short!("CLUB_CNT");

// Club storage key enum
#[contracttype]
pub enum ClubDataKey {
    Club(u64),
    OwnerClubs(Address),
}

// Club stats structure
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

// Match result enum
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MatchResult {
    Win,
    Loss,
    Draw,
}

// Club metadata structure
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

#[contract]
pub struct ClubMinterContract;

// Generate random stats based on timestamp
fn generate_random_stats(env: &Env, seed_offset: u64) -> ClubStats {
    let timestamp = env.ledger().timestamp();
    let seed = timestamp.wrapping_add(seed_offset);

    // Generate stats between 50-99 for balanced gameplay
    let attack = 50 + ((seed % 50) as u32);
    let defense = 50 + (((seed / 7) % 50) as u32);
    let midfield = 50 + (((seed / 13) % 50) as u32);
    let goalkeeping = 50 + (((seed / 17) % 50) as u32);
    let speed = 50 + (((seed / 23) % 50) as u32);

    let overall = (attack + defense + midfield + goalkeeping + speed) / 5;

    ClubStats {
        attack,
        defense,
        midfield,
        goalkeeping,
        speed,
        overall,
    }
}

#[contractimpl]
impl ClubMinterContract {
    /// Mint a new club with random stats
    pub fn mint_club(
        env: Env,
        owner: Address,
        name: String,
        logo_url: String,
    ) -> u64 {
        // Require signature from owner
        owner.require_auth();

        // Get and increment club count
        let mut club_count: u64 = env.storage().instance().get(&CLUB_COUNT).unwrap_or(0);
        club_count += 1;

        // Generate random stats
        let stats = generate_random_stats(&env, club_count);

        // Create club metadata
        let club = ClubMetadata {
            id: club_count,
            name,
            logo_url,
            owner: owner.clone(),
            stats,
            wins: 0,
            losses: 0,
            draws: 0,
            created_at: env.ledger().timestamp(),
        };

        // Store club by ID
        env.storage().instance().set(&ClubDataKey::Club(club_count), &club);

        // Update owner's club list
        let mut owner_clubs: Vec<u64> = env
            .storage()
            .instance()
            .get(&ClubDataKey::OwnerClubs(owner.clone()))
            .unwrap_or(Vec::new(&env));
        owner_clubs.push_back(club_count);
        env.storage().instance().set(&ClubDataKey::OwnerClubs(owner.clone()), &owner_clubs);

        // Update total count
        env.storage().instance().set(&CLUB_COUNT, &club_count);

        // Extend TTL
        env.storage().instance().extend_ttl(5000, 5000);

        // Emit event
        env.events().publish(
            (symbol_short!("mint"), owner),
            club_count
        );

        club_count
    }

    /// Get club by ID
    pub fn get_club(env: Env, club_id: u64) -> ClubMetadata {
        env.storage()
            .instance()
            .get(&ClubDataKey::Club(club_id))
            .unwrap_or_else(|| panic!("Club not found"))
    }

    /// Get club stats only
    pub fn get_club_stats(env: Env, club_id: u64) -> ClubStats {
        let club: ClubMetadata = env
            .storage()
            .instance()
            .get(&ClubDataKey::Club(club_id))
            .unwrap_or_else(|| panic!("Club not found"));
        club.stats
    }

    /// Get club owner
    pub fn get_owner(env: Env, club_id: u64) -> Address {
        let club: ClubMetadata = env
            .storage()
            .instance()
            .get(&ClubDataKey::Club(club_id))
            .unwrap_or_else(|| panic!("Club not found"));
        club.owner
    }

    /// Get all clubs owned by an address
    pub fn get_clubs_by_owner(env: Env, owner: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&ClubDataKey::OwnerClubs(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Get total club count
    pub fn get_total_count(env: Env) -> u64 {
        env.storage().instance().get(&CLUB_COUNT).unwrap_or(0)
    }

    /// Update club record after a match (called by game contract)
    pub fn update_record(env: Env, club_id: u64, result: MatchResult) {
        let mut club: ClubMetadata = env
            .storage()
            .instance()
            .get(&ClubDataKey::Club(club_id))
            .unwrap_or_else(|| panic!("Club not found"));

        match result {
            MatchResult::Win => club.wins += 1,
            MatchResult::Loss => club.losses += 1,
            MatchResult::Draw => club.draws += 1,
        }

        env.storage().instance().set(&ClubDataKey::Club(club_id), &club);
        env.storage().instance().extend_ttl(5000, 5000);
    }

    /// Transfer club to new owner
    pub fn transfer(env: Env, from: Address, to: Address, club_id: u64) {
        from.require_auth();

        let mut club: ClubMetadata = env
            .storage()
            .instance()
            .get(&ClubDataKey::Club(club_id))
            .unwrap_or_else(|| panic!("Club not found"));

        if club.owner != from {
            panic!("Not the owner");
        }

        // Update club owner
        club.owner = to.clone();
        env.storage().instance().set(&ClubDataKey::Club(club_id), &club);

        // Remove from sender's list
        let from_clubs: Vec<u64> = env
            .storage()
            .instance()
            .get(&ClubDataKey::OwnerClubs(from.clone()))
            .unwrap_or(Vec::new(&env));

        let mut new_from_clubs = Vec::new(&env);
        for i in 0..from_clubs.len() {
            let id = from_clubs.get(i).unwrap();
            if id != club_id {
                new_from_clubs.push_back(id);
            }
        }
        env.storage().instance().set(&ClubDataKey::OwnerClubs(from.clone()), &new_from_clubs);

        // Add to receiver's list
        let mut to_clubs: Vec<u64> = env
            .storage()
            .instance()
            .get(&ClubDataKey::OwnerClubs(to.clone()))
            .unwrap_or(Vec::new(&env));
        to_clubs.push_back(club_id);
        env.storage().instance().set(&ClubDataKey::OwnerClubs(to.clone()), &to_clubs);

        env.storage().instance().extend_ttl(5000, 5000);

        env.events().publish(
            (symbol_short!("transfer"), from, to),
            club_id
        );
    }
}

mod test;
