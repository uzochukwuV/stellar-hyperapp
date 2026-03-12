# StellarP2P Deployment Guide
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/p2p_core.wasm \
  --network testnet \
  --source-account gamer)
ℹ️  Simulating install transaction…
ℹ️  Signing transaction: 5bf9edc417ee120b084f85dfac1e3fe952b5f0aab885dc9e55ba5dedf760e362
🌎 Submitting install transaction…
ℹ️  Using wasm hash d8a119b41ffd094ab02e8248ab257f1678da035f8fd511e013f43f470317e9b9
ℹ️  Simulating deploy transaction…
ℹ️  Transaction hash is 41372f9e9b8e5470f6d94eceec5059561a45ca987903b3b439530d4ae8e4bfb5
🔗 https://stellar.expert/explorer/testnet/tx/41372f9e9b8e5470f6d94eceec5059561a45ca987903b3b439530d4ae8e4bfb5
ℹ️  Signing transaction: 41372f9e9b8e5470f6d94eceec5059561a45ca987903b3b439530d4ae8e4bfb5
🌎 Submitting deploy transaction…
🔗 https://lab.stellar.org/r/testnet/contract/CDBSPYW5XTRYUYF4AAXB4K5SR4JX7ESP3PH52PXDTJEUGZXECC77WO4T
✅ Deployed!
uzo@DESKTOP-V1MEA7D:/mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/stellar-p2p$ 
## The Issue You Encountered

The error `reference-types not enabled` means the WASM wasn't properly optimized for Soroban. Standard `cargo build` doesn't apply Soroban-specific optimizations.

## ✅ Correct Deployment Steps

### 1. Build with Stellar CLI (IMPORTANT!)

Instead of `cargo build`, use:

```bash
cd contracts/stellar-p2p
stellar contract build
```

This command:
- Builds the contract with `cargo`
- Applies Soroban-specific WASM optimizations
- Removes unsupported features
- Produces a deployable WASM

### 2. Quick Deploy (All-in-One)

```bash
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

OR do it step-by-step:

### 3. Step-by-Step Deployment

#### Build
```bash
cd /mnt/e/apps/stellar-superapp/stellar-hyperapp/contracts/stellar-p2p
stellar contract build
```

#### Deploy
```bash
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/p2p_core.wasm \
  --network testnet \
  --source-account gamer)

echo "Contract ID: $CONTRACT_ID"
```

#### Initialize
```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source-account gamer \
  -- initialize \
  --admin $(stellar keys address gamer) \
  --min_collateral_percent 120 \
  --auto_complete_window 86400 \
  --dispute_window 604800
```

#### Register USDC Token (Testnet)
```bash
# Get testnet USDC address from: https://developers.stellar.org/docs/tokens/stellar-asset-contract

USDC_ADDRESS="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source-account gamer \
  -- register_token \
  --admin $(stellar keys address gamer) \
  --token $USDC_ADDRESS
```

#### Register XLM Token (Testnet)
```bash
XLM_ADDRESS="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source-account gamer \
  -- register_token \
  --admin $(stellar keys address gamer) \
  --token $XLM_ADDRESS
```

## 🎯 After Deployment

1. **Save the Contract ID** - You'll need it for the frontend
2. **Update Frontend Config** - Create `src/config/stellar.js`:

```javascript
export const STELLAR_CONFIG = {
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  contractId: 'YOUR_CONTRACT_ID_HERE', // Paste from deployment
  usdcAddress: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  xlmAddress: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
};
```

3. **Test the Contract**:

```bash
# Create a test offer
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source-account gamer \
  -- create_offer \
  --vendor $(stellar keys address gamer) \
  --category GiftCards \
  --title "Test Amazon Gift Card" \
  --description "Testing" \
  --price 5000000 \
  --payment_token $USDC_ADDRESS \
  --collateral_amount 6000000 \
  --collateral_token $USDC_ADDRESS
```

## 🔧 Troubleshooting

### If you still get WASM errors:

1. **Update Stellar CLI**:
```bash
cargo install --locked stellar-cli --features opt
```

2. **Clean and rebuild**:
```bash
cargo clean
stellar contract build
```

3. **Check Soroban SDK version** in `Cargo.toml`:
```toml
[workspace.dependencies]
soroban-sdk = "22"  # Should be 22+
```

## 📱 Frontend Integration

Once deployed, the frontend at `http://localhost:3000` will show the beautiful StellarP2P UI.

To connect it to your deployed contract:
1. Update the contract ID in the frontend
2. Implement Freighter wallet integration
3. Wire up the contract calls using `@stellar/stellar-sdk`

## 🎉 You're Ready!

Your contract is now deployed and ready for trading!
