#!/bin/bash

# StellarP2P Deployment Script
# Install Stellar CLI first: npm install -g @stellar/cli

echo "🚀 Deploying StellarP2P Contract to Testnet..."

# Build contract
echo "📦 Building contract..."
cd "$(dirname "$0")"
cargo build --target wasm32-unknown-unknown --release

# Deploy contract
echo "🌐 Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/p2p_core.wasm \
  --network testnet \
  --source-account default)

echo "✅ Contract deployed: $CONTRACT_ID"

# Initialize contract
echo "⚙️  Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network testnet \
  --source-account default \
  -- initialize \
  --admin "$(stellar keys address default)" \
  --min_collateral_percent 120 \
  --auto_complete_window 86400 \
  --dispute_window 604800

echo "✅ Contract initialized"

# TODO: Register tokens (USDC/XLM addresses on testnet)
echo "📝 Next steps:"
echo "1. Register USDC token: stellar contract invoke --id $CONTRACT_ID -- register_token --admin YOUR_ADDR --token USDC_ADDR"
echo "2. Register XLM token: stellar contract invoke --id $CONTRACT_ID -- register_token --admin YOUR_ADDR --token XLM_ADDR"
echo "3. Update frontend CONTRACT_ID in src/config/stellar.js"

echo "🎉 Deployment complete!"
echo "Contract ID: $CONTRACT_ID"
