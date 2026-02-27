#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_mint_nft() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NftMinterContract, ());
    let client = NftMinterContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let name = String::from_str(&env, "My First NFT");
    let description = String::from_str(&env, "A test NFT");
    let image_url = String::from_str(&env, "https://example.com/nft.png");

    let nft_id = client.mint(&minter, &name, &description, &image_url);

    assert_eq!(nft_id, 1);

    let nft = client.get_nft(&nft_id);
    assert_eq!(nft.id, 1);
    assert_eq!(nft.owner, minter);
}

#[test]
fn test_get_nfts_by_owner() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NftMinterContract, ());
    let client = NftMinterContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);

    // Mint 3 NFTs
    client.mint(
        &minter,
        &String::from_str(&env, "NFT 1"),
        &String::from_str(&env, "Desc 1"),
        &String::from_str(&env, "https://example.com/1.png")
    );
    client.mint(
        &minter,
        &String::from_str(&env, "NFT 2"),
        &String::from_str(&env, "Desc 2"),
        &String::from_str(&env, "https://example.com/2.png")
    );
    client.mint(
        &minter,
        &String::from_str(&env, "NFT 3"),
        &String::from_str(&env, "Desc 3"),
        &String::from_str(&env, "https://example.com/3.png")
    );

    let owner_nfts = client.get_nfts_by_owner(&minter);
    assert_eq!(owner_nfts.len(), 3);
}

#[test]
fn test_transfer_nft() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NftMinterContract, ());
    let client = NftMinterContractClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);

    let nft_id = client.mint(
        &owner1,
        &String::from_str(&env, "Transferable NFT"),
        &String::from_str(&env, "Will be transferred"),
        &String::from_str(&env, "https://example.com/transfer.png")
    );

    // Transfer
    client.transfer(&owner1, &owner2, &nft_id);

    // Verify new owner
    let new_owner = client.get_owner(&nft_id);
    assert_eq!(new_owner, owner2);

    // Verify owner lists updated
    let owner1_nfts = client.get_nfts_by_owner(&owner1);
    let owner2_nfts = client.get_nfts_by_owner(&owner2);

    assert_eq!(owner1_nfts.len(), 0);
    assert_eq!(owner2_nfts.len(), 1);
}

#[test]
fn test_get_total_count() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(NftMinterContract, ());
    let client = NftMinterContractClient::new(&env, &contract_id);

    let minter = Address::generate(&env);

    assert_eq!(client.get_total_count(), 0);

    client.mint(
        &minter,
        &String::from_str(&env, "NFT 1"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "https://example.com/1.png")
    );

    assert_eq!(client.get_total_count(), 1);

    client.mint(
        &minter,
        &String::from_str(&env, "NFT 2"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "https://example.com/2.png")
    );

    assert_eq!(client.get_total_count(), 2);
}
