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

// Contract addresses (update after deployment)
// const CLUB_CONTRACT_ADDRESS = "CARU6CJJIY2HZPQEOOVVFZY5QO23NAGAUHCXJDHTD6PLRCXNC5Y43FH2";
const GAME_CONTRACT_ADDRESS = "CAJ6DMM56A3EMMRE4SUFEZDUIUSR6FIIOVQTNCLC5H65QQOJC324WB4B";

const server = new StellarRpc.Server(RPC_URL);

const TX_PARAMS = {
  fee: BASE_FEE,
  networkPassphrase: NETWORK,
};

/* ================= Error Types ================= */

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

async function gameContractCall(caller, fnName, values, onStatusChange) {
  try {
    if (!caller) {
      throw new WalletNotFoundError();
    }

    onStatusChange?.(TxStatus.PREPARING);

    let sourceAccount;
    try {
      sourceAccount = await server.getAccount(caller);
    } catch (err) {
      if (err.message?.includes("not found")) {
        throw new InsufficientBalanceError("Account not funded on testnet");
      }
      throw err;
    }

    const contract = new Contract(GAME_CONTRACT_ADDRESS);

    const builder = new TransactionBuilder(sourceAccount, TX_PARAMS);

    if (Array.isArray(values)) {
      builder.addOperation(contract.call(fnName, ...values));
    } else if (values !== undefined && values !== null) {
      builder.addOperation(contract.call(fnName, values));
    } else {
      builder.addOperation(contract.call(fnName));
    }

    const tx = builder.setTimeout(30).build();
    const preparedTx = await server.prepareTransaction(tx);

    onStatusChange?.(TxStatus.SIGNING);

    const xdr = preparedTx.toXDR();

    let signed;
    try {
      signed = await userSignTransaction(xdr, caller);
    } catch (err) {
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
    const send = await server.sendTransaction(signedTx);

    if (send.status === "ERROR") {
      throw new Error("Transaction submission failed");
    }

    onStatusChange?.(TxStatus.PENDING);

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

    throw new Error("Transaction timeout");
  } catch (error) {
    onStatusChange?.(TxStatus.FAILED);
    throw error;
  }
}

/* ================= Game Contract Functions ================= */

/**
 * Register a new club (calls game contract which calls club contract)
 */
export async function registerClub(caller, name, logoUrl, onStatusChange) {
  const values = [
    addressToScVal(caller),
    stringToScVal(name),
    stringToScVal(logoUrl),
  ];

  const { result, hash } = await gameContractCall(
    caller,
    "register_club",
    values,
    onStatusChange
  );

  console.log("Registered Club ID:", Number(result));
  return { clubId: Number(result), hash };
}

/**
 * Get club info (inter-contract call through game contract)
 */
export async function getClubInfo(caller, clubId, onStatusChange) {
  const value = numberToU64(clubId);

  const { result } = await gameContractCall(
    caller,
    "get_club_info",
    value,
    onStatusChange
  );

  return {
    id: Number(result.id),
    name: result.name.toString(),
    logoUrl: result.logo_url.toString(),
    owner: result.owner.toString(),
    stats: {
      attack: Number(result.stats.attack),
      defense: Number(result.stats.defense),
      midfield: Number(result.stats.midfield),
      goalkeeping: Number(result.stats.goalkeeping),
      speed: Number(result.stats.speed),
      overall: Number(result.stats.overall),
    },
    wins: Number(result.wins),
    losses: Number(result.losses),
    draws: Number(result.draws),
  };
}

/**
 * Get club stats only
 */
export async function getClubStats(caller, clubId, onStatusChange) {
  const value = numberToU64(clubId);

  const { result } = await gameContractCall(
    caller,
    "query_club_stats",
    value,
    onStatusChange
  );

  return {
    attack: Number(result.attack),
    defense: Number(result.defense),
    midfield: Number(result.midfield),
    goalkeeping: Number(result.goalkeeping),
    speed: Number(result.speed),
    overall: Number(result.overall),
  };
}

/**
 * Get player's clubs
 */
export async function getPlayerClubs(caller, playerAddress, onStatusChange) {
  const value = addressToScVal(playerAddress);

  const { result } = await gameContractCall(
    caller,
    "get_player_clubs",
    value,
    onStatusChange
  );

  return result.map(Number);
}

/**
 * Simulate a match between two clubs
 */
export async function simulateMatch(caller, club1Id, club2Id, onStatusChange) {
  const values = [
    numberToU64(club1Id),
    numberToU64(club2Id),
  ];

  const { result, hash } = await gameContractCall(
    caller,
    "simulate_match",
    values,
    onStatusChange
  );

  const [winner, loser] = result;
  return {
    winner: Number(winner),
    loser: Number(loser),
    isDraw: Number(winner) === 0 && Number(loser) === 0,
    hash,
  };
}

/* ================= Utility Functions ================= */

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

export function getErrorType(error) {
  if (error instanceof WalletNotFoundError) return "warning";
  if (error instanceof TransactionRejectedError) return "info";
  if (error instanceof InsufficientBalanceError) return "error";
  return "error";
}

/**
 * Get stat color based on value
 */
export function getStatColor(value) {
  if (value >= 85) return "bg-green-500";
  if (value >= 70) return "bg-lime-500";
  if (value >= 60) return "bg-yellow-500";
  return "bg-orange-500";
}

/**
 * Get overall rating badge color
 */
export function getRatingColor(overall) {
  if (overall >= 85) return "text-green-600 bg-green-100";
  if (overall >= 75) return "text-blue-600 bg-blue-100";
  if (overall >= 65) return "text-yellow-600 bg-yellow-100";
  return "text-orange-600 bg-orange-100";
}
