/**
 * Stellar Helper - Blockchain Logic with Stellar Wallets Kit
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID
} from '@creit.tech/stellar-wallets-kit';

class StellarHelper {
  constructor(network = 'testnet') {
    this.server = new StellarSdk.Horizon.Server(
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );
    this.networkPassphrase =
      network === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.network = network === 'testnet'
      ? WalletNetwork.TESTNET
      : WalletNetwork.PUBLIC;

    this.publicKey = null;

    // Initialize Stellar Wallets Kit
    this.kit = new StellarWalletsKit({
      network: this.network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }

  isFreighterInstalled() {
    return true;
  }

  async connectWallet() {
    return new Promise((resolve, reject) => {
      this.kit.openModal({
        onWalletSelected: async (option) => {
          try {
            console.log('Wallet selected:', option.id);
            this.kit.setWallet(option.id);

            const { address } = await this.kit.getAddress();

            if (!address) {
              reject(new Error('Wallet connection failed'));
              return;
            }

            this.publicKey = address;
            resolve(address);
          } catch (error) {
            console.error('Wallet connection error:', error);
            reject(new Error('Wallet connection failed: ' + error.message));
          }
        },
        onClosed: () => {
          if (!this.publicKey) {
            reject(new Error('Wallet modal closed'));
          }
        }
      });
    });
  }

  async getBalance(publicKey) {
    const account = await this.server.loadAccount(publicKey);

    const xlmBalance = account.balances.find(
      (b) => b.asset_type === 'native'
    );

    const assets = account.balances
      .filter((b) => b.asset_type !== 'native')
      .map((b) => ({
        code: b.asset_code,
        issuer: b.asset_issuer,
        balance: b.balance,
      }));

    return {
      xlm: xlmBalance && 'balance' in xlmBalance ? xlmBalance.balance : '0',
      assets,
    };
  }

  async sendPayment(params) {
    const { from, to, amount, memo } = params;
    const account = await this.server.loadAccount(from);

    const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    }).addOperation(
      StellarSdk.Operation.payment({
        destination: to,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      })
    );

    if (memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(memo));
    }

    const transaction = transactionBuilder.setTimeout(180).build();

    // Sign with Wallet Kit
    const { signedTxXdr } = await this.kit.signTransaction(transaction.toXDR(), {
      networkPassphrase: this.networkPassphrase,
    });

    const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr,
      this.networkPassphrase
    );

    const result = await this.server.submitTransaction(transactionToSubmit);

    return {
      hash: result.hash,
      success: result.successful,
    };
  }

  async signTransaction(xdr, signWith) {
    return await this.kit.signTransaction(xdr, {
      networkPassphrase: this.networkPassphrase,
      address: signWith,
    });
  }

  async getRecentTransactions(publicKey, limit = 10) {
    const payments = await this.server
      .payments()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();

    return payments.records.map((payment) => ({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      asset: payment.asset_type === 'native' ? 'XLM' : payment.asset_code,
      from: payment.from,
      to: payment.to,
      createdAt: payment.created_at,
      hash: payment.transaction_hash,
    }));
  }

  getExplorerLink(hash, type = 'tx') {
    const network = this.networkPassphrase === StellarSdk.Networks.TESTNET ? 'testnet' : 'public';
    return `https://stellar.expert/explorer/${network}/${type}/${hash}`;
  }

  formatAddress(address, startChars = 4, endChars = 4) {
    if (address.length <= startChars + endChars) {
      return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  disconnect() {
    this.publicKey = null;
    return true;
  }
}

// Create singleton instance
export const stellar = new StellarHelper('testnet');

// Legacy exports for backward compatibility
export const checkConnection = async () => {
  return true; // Wallets Kit handles permissions internally
};

export const getRequestAccess = async () => {
  return true; // Wallets Kit handles permissions internally
};

export const retrievePublicKey = async () => {
  return stellar.publicKey;
};

export const getBalance = async (publicKey) => {
  if (!publicKey && !stellar.publicKey) {
    return '0';
  }
  const balance = await stellar.getBalance(publicKey || stellar.publicKey);
  return balance.xlm;
};

export const userSignTransaction = async (xdr, signWith) => {
  return await stellar.signTransaction(xdr, signWith);
};

export const sendPayment = async (destination, amount) => {
  if (!stellar.publicKey) {
    throw new Error('Wallet not connected');
  }
  return await stellar.sendPayment({
    from: stellar.publicKey,
    to: destination,
    amount: amount.toString(),
  });
};

export const connectWallet = async () => {
  return await stellar.connectWallet();
};

export const disconnectWallet = () => {
  return stellar.disconnect();
};
