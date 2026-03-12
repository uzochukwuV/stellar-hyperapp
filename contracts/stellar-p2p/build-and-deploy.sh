#!/bin/bash
set -e

echo "🔧 Building StellarP2P Contract..."

# Navigate to contract directory
cd "$(dirname "$0")"

# Build with Stellar CLI (this handles optimization automatically)
echo "📦 Building and optimizing WASM..."
stellar contract build

# Check if build was successful
if [ ! -f "target/wasm32-unknown-unknown/release/p2p_core.wasm" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Deploy to testnet
echo "🚀 Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/p2p_core.wasm \
  --network testnet \
  --source-account gamer)

echo "✅ Contract deployed!"
echo "📝 Contract ID: $CONTRACT_ID"

# Initialize the contract
echo "⚙️  Initializing contract..."
ADMIN_ADDRESS=$(stellar keys address gamer)

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network testnet \
  --source-account gamer \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --min_collateral_percent 120 \
  --auto_complete_window 86400 \
  --dispute_window 604800

echo "✅ Contract initialized!"
echo ""
echo "📋 Next Steps:"
echo "1. Save this Contract ID: $CONTRACT_ID"
echo "2. Register tokens (USDC/XLM) on testnet"
echo "3. Update frontend config with Contract ID"
echo ""
echo "🎉 Deployment Complete!"
