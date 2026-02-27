import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  rpc as StellarRpc,
} from "@stellar/stellar-sdk";

import { userSignTransaction } from "./Freighter";

/* ================= Config ================= */

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK = Networks.TESTNET;

// TODO: Replace with deployed contract address after deployment
const NFT_CONTRACT_ADDRESS = "CAGXJUI4GWABBGDQK5XWCYMLBOW77ABCBAAZWI5KXBLQ73FPCD7BDGMG";

const server = new StellarRpc.Server(RPC_URL);

const TX_PARAMS = {
  fee: BASE_FEE,
  networkPassphrase: NETWORK,
};

/* ================= Error Types (3 Required) ================= */

export class WalletNotFoundError extends Error {
  constructor(message = "Wallet not found or not connected") {
    super(message);
    this.name = "WalletNotFoundError";
    this.type = "WALLET_NOT_FOUND";
  }
}

export class TransactionRejectedError extends Error {
  constructor(message = "Transaction was rejected by user") {
    super(message);
    this.name = "TransactionRejectedError";
    this.type = "TRANSACTION_REJECTED";
  }
}

export class InsufficientBalanceError extends Error {
  constructor(message = "Insufficient balance for transaction") {
    super(message);
    this.name = "InsufficientBalanceError";
    this.type = "INSUFFICIENT_BALANCE";
  }
}

/* ================= Transaction Status ================= */

export const TxStatus = {
  IDLE: "idle",
  PREPARING: "preparing",
  SIGNING: "signing",
  SUBMITTING: "submitting",
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
};

/* ================= Helpers ================= */

const stringToScVal = (value) => nativeToScVal(value);
const numberToU64 = (value) => nativeToScVal(value, { type: "u64" });
const addressToScVal = (address) => new Address(address).toScVal();

/* ================= Core Contract Interaction ================= */

async function nftContractCall(caller, fnName, values, onStatusChange) {
  try {
    // Validate wallet connection
    if (!caller) {
      throw new WalletNotFoundError();
    }

    onStatusChange?.(TxStatus.PREPARING);

    // 1. Load account
    let sourceAccount;
    try {
      sourceAccount = await server.getAccount(caller);
    } catch (err) {
      if (err.message?.includes("not found")) {
        throw new InsufficientBalanceError("Account not funded on testnet");
      }
      throw err;
    }

    const contract = new Contract(NFT_CONTRACT_ADDRESS);

    // 2. Build transaction
    const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);

    if (Array.isArray(values)) {
      builder.addOperation(contract.call(fnName, ...values));
    } else if (values !== undefined && values !== null) {
      builder.addOperation(contract.call(fnName, values));
    } else {
      builder.addOperation(contract.call(fnName));
    }

    const tx = builder.setTimeout(30).build();

    // 3. Prepare transaction (simulate)
    const preparedTx = await server.prepareTransaction(tx);

    onStatusChange?.(TxStatus.SIGNING);

    // 4. Convert to XDR for signing
    const xdr = preparedTx.toXDR();

    // 5. Sign with wallet
    let signed;
    try {
      signed = await userSignTransaction(xdr, caller);
    } catch (err) {
      // Handle user rejection
      if (
        err.message?.includes("rejected") ||
        err.message?.includes("cancelled") ||
        err.message?.includes("denied") ||
        err.message?.includes("User declined")
      ) {
        throw new TransactionRejectedError();
      }
      throw err;
    }

    onStatusChange?.(TxStatus.SUBMITTING);

    const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, NETWORK);

    // 6. Send transaction
    const send = await server.sendTransaction(signedTx);

    if (send.status === "ERROR") {
      throw new Error("Transaction submission failed");
    }

    onStatusChange?.(TxStatus.PENDING);

    // 7. Poll for result
    for (let i = 0; i < 15; i++) {
      const res = await server.getTransaction(send.hash);

      if (res.status === "SUCCESS") {
        onStatusChange?.(TxStatus.SUCCESS);
        if (res.returnValue) {
          return {
            result: scValToNative(res.returnValue),
            hash: send.hash,
          };
        }
        return { result: null, hash: send.hash };
      }

      if (res.status === "FAILED") {
        onStatusChange?.(TxStatus.FAILED);
        throw new Error("Transaction failed on-chain");
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error("Transaction timeout - please check explorer");
  } catch (error) {
    onStatusChange?.(TxStatus.FAILED);
    throw error;
  }
}

/* ================= NFT Contract Functions ================= */

/**
 * Mint a new NFT
 */
export async function mintNft(caller, name, description, imageUrl, onStatusChange) {
  const values = [
    addressToScVal(caller),
    stringToScVal(name),
    stringToScVal(description),
    stringToScVal(imageUrl),
  ];

  const { result, hash } = await nftContractCall(
    caller,
    "mint",
    values,
    onStatusChange
  );

  console.log("Minted NFT ID:", Number(result));
  return { nftId: Number(result), hash };
}

/**
 * Get NFT by ID
 */
export async function getNft(caller, nftId, onStatusChange) {
  const value = numberToU64(nftId);

  const { result } = await nftContractCall(
    caller,
    "get_nft",
    value,
    onStatusChange
  );

  return {
    id: Number(result.id),
    name: result.name.toString(),
    description: result.description.toString(),
    imageUrl: result.image_url.toString(),
    owner: result.owner.toString(),
  };
}

/**
 * Get NFT owner
 */
export async function getNftOwner(caller, nftId, onStatusChange) {
  const value = numberToU64(nftId);

  const { result } = await nftContractCall(
    caller,
    "get_owner",
    value,
    onStatusChange
  );

  return result.toString();
}

/**
 * Get all NFTs owned by an address
 */
export async function getNftsByOwner(caller, ownerAddress, onStatusChange) {
  const value = addressToScVal(ownerAddress);

  const { result } = await nftContractCall(
    caller,
    "get_nfts_by_owner",
    value,
    onStatusChange
  );

  return result.map(Number);
}

/**
 * Transfer NFT to another address
 */
export async function transferNft(caller, toAddress, nftId, onStatusChange) {
  const values = [
    addressToScVal(caller),
    addressToScVal(toAddress),
    numberToU64(nftId),
  ];

  const { hash } = await nftContractCall(
    caller,
    "transfer",
    values,
    onStatusChange
  );

  console.log("Transferred NFT:", nftId);
  return { hash };
}

/**
 * Get total NFT count
 */
export async function getTotalNftCount(caller, onStatusChange) {
  const { result } = await nftContractCall(
    caller,
    "get_total_count",
    null,
    onStatusChange
  );

  return Number(result);
}

/* ================= Utility Functions ================= */

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  if (error instanceof WalletNotFoundError) {
    return "Please connect your wallet first";
  }
  if (error instanceof TransactionRejectedError) {
    return "Transaction was cancelled";
  }
  if (error instanceof InsufficientBalanceError) {
    return "Insufficient XLM balance. Please fund your account on testnet";
  }
  return error.message || "An unexpected error occurred";
}

/**
 * Get error type for UI styling
 */
export function getErrorType(error) {
  if (error instanceof WalletNotFoundError) return "warning";
  if (error instanceof TransactionRejectedError) return "info";
  if (error instanceof InsufficientBalanceError) return "error";
  return "error";
}

/**
 * Update contract address (call after deployment)
 */
export function setContractAddress(address) {
  // Note: In a real app, you'd use environment variables
  console.log("Contract address:", address);
}
