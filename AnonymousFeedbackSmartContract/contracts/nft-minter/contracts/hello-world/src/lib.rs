#![no_std]
use soroban_sdk::{
    contract, contracttype, contractimpl,
    Env, String, Symbol, symbol_short, Address, Vec
};

// Storage keys
const NFT_COUNT: Symbol = symbol_short!("NFT_CNT");

// NFT storage key enum
#[contracttype]
pub enum NftDataKey {
    Nft(u64),
    OwnerNfts(Address),
}

// NFT metadata structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct NftMetadata {
    pub id: u64,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub owner: Address,
    pub created_at: u64,
}

#[contract]
pub struct NftMinterContract;

#[contractimpl]
impl NftMinterContract {
    /// Mint a new NFT with metadata
    /// Returns: NFT ID (u64)
    pub fn mint(
        env: Env,
        minter: Address,
        name: String,
        description: String,
        image_url: String,
    ) -> u64 {
        // Require signature from minter
        minter.require_auth();

        // Get and increment NFT count
        let mut nft_count: u64 = env.storage().instance().get(&NFT_COUNT).unwrap_or(0);
        nft_count += 1;

        // Create NFT metadata
        let nft = NftMetadata {
            id: nft_count,
            name,
            description,
            image_url,
            owner: minter.clone(),
            created_at: env.ledger().timestamp(),
        };

        // Store NFT by ID
        env.storage().instance().set(&NftDataKey::Nft(nft_count), &nft);

        // Update owner's NFT list
        let mut owner_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&NftDataKey::OwnerNfts(minter.clone()))
            .unwrap_or(Vec::new(&env));
        owner_nfts.push_back(nft_count);
        env.storage().instance().set(&NftDataKey::OwnerNfts(minter.clone()), &owner_nfts);

        // Update total count
        env.storage().instance().set(&NFT_COUNT, &nft_count);

        // Extend TTL
        env.storage().instance().extend_ttl(5000, 5000);

        // Emit event for frontend tracking
        env.events().publish(
            (symbol_short!("mint"), minter),
            nft_count
        );

        nft_count
    }

    /// Get NFT by ID
    pub fn get_nft(env: Env, nft_id: u64) -> NftMetadata {
        env.storage()
            .instance()
            .get(&NftDataKey::Nft(nft_id))
            .unwrap_or_else(|| panic!("NFT not found"))
    }

    /// Get owner of NFT
    pub fn get_owner(env: Env, nft_id: u64) -> Address {
        let nft: NftMetadata = env
            .storage()
            .instance()
            .get(&NftDataKey::Nft(nft_id))
            .unwrap_or_else(|| panic!("NFT not found"));
        nft.owner
    }

    /// Get all NFTs owned by an address
    pub fn get_nfts_by_owner(env: Env, owner: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&NftDataKey::OwnerNfts(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Get total NFT count
    pub fn get_total_count(env: Env) -> u64 {
        env.storage().instance().get(&NFT_COUNT).unwrap_or(0)
    }

    /// Transfer NFT to new owner
    pub fn transfer(env: Env, from: Address, to: Address, nft_id: u64) {
        // Require auth from current owner
        from.require_auth();

        // Get NFT and verify ownership
        let mut nft: NftMetadata = env
            .storage()
            .instance()
            .get(&NftDataKey::Nft(nft_id))
            .unwrap_or_else(|| panic!("NFT not found"));

        if nft.owner != from {
            panic!("Not the owner");
        }

        // Update NFT owner
        nft.owner = to.clone();
        env.storage().instance().set(&NftDataKey::Nft(nft_id), &nft);

        // Remove from sender's list
        let from_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&NftDataKey::OwnerNfts(from.clone()))
            .unwrap_or(Vec::new(&env));

        let mut new_from_nfts = Vec::new(&env);
        for i in 0..from_nfts.len() {
            let id = from_nfts.get(i).unwrap();
            if id != nft_id {
                new_from_nfts.push_back(id);
            }
        }
        env.storage().instance().set(&NftDataKey::OwnerNfts(from.clone()), &new_from_nfts);

        // Add to receiver's list
        let mut to_nfts: Vec<u64> = env
            .storage()
            .instance()
            .get(&NftDataKey::OwnerNfts(to.clone()))
            .unwrap_or(Vec::new(&env));
        to_nfts.push_back(nft_id);
        env.storage().instance().set(&NftDataKey::OwnerNfts(to.clone()), &to_nfts);

        // Extend TTL
        env.storage().instance().extend_ttl(5000, 5000);

        // Emit transfer event
        env.events().publish(
            (symbol_short!("transfer"), from, to),
            nft_id
        );
    }
}

mod test;
