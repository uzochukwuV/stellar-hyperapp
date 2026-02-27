import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import {
  registerClub,
  TxStatus,
  getErrorMessage,
  getErrorType,
} from "./FifaClubs";

const ClubMinterForm = ({ onMintSuccess }) => {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [txStatus, setTxStatus] = useState(TxStatus.IDLE);
  const [error, setError] = useState(null);
  const [mintResult, setMintResult] = useState(null);

  const pubKey = useContext(pubKeyData);

  const statusConfig = {
    [TxStatus.IDLE]: { text: "", color: "" },
    [TxStatus.PREPARING]: { text: "Preparing transaction...", color: "text-blue-600" },
    [TxStatus.SIGNING]: { text: "Please sign in your wallet...", color: "text-yellow-600" },
    [TxStatus.SUBMITTING]: { text: "Submitting to network...", color: "text-blue-600" },
    [TxStatus.PENDING]: { text: "Creating your club...", color: "text-orange-500" },
    [TxStatus.SUCCESS]: { text: "Club created successfully!", color: "text-green-600" },
    [TxStatus.FAILED]: { text: "Transaction failed", color: "text-red-600" },
  };

  const errorStyles = {
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
    error: "bg-red-100 border-red-400 text-red-700",
  };

  const handleMint = async () => {
    if (!name.trim()) {
      setError({ message: "Please enter a club name", type: "warning" });
      return;
    }
    if (!logoUrl.trim()) {
      setError({ message: "Please enter a logo URL", type: "warning" });
      return;
    }

    try {
      new URL(logoUrl);
    } catch {
      setError({ message: "Please enter a valid logo URL", type: "warning" });
      return;
    }

    setError(null);
    setMintResult(null);

    try {
      const result = await registerClub(
        pubKey,
        name.trim(),
        logoUrl.trim(),
        setTxStatus
      );

      setMintResult(result);
      setName("");
      setLogoUrl("");
      onMintSuccess?.(result);
    } catch (err) {
      console.error("Mint error:", err);
      setError({
        message: getErrorMessage(err),
        type: getErrorType(err),
      });
    }
  };

  const isLoading = [
    TxStatus.PREPARING,
    TxStatus.SIGNING,
    TxStatus.SUBMITTING,
    TxStatus.PENDING,
  ].includes(txStatus);

  if (!pubKey) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 sm:p-6 text-center">
        <p className="text-yellow-700 font-semibold text-sm sm:text-base">
          Connect your wallet to create a club
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-emerald-800">
        Create Your Club
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Club Name
          </label>
          <input
            type="text"
            placeholder="Manchester United"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Logo URL
          </label>
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {logoUrl && (
          <div className="flex justify-center">
            <img
              src={logoUrl}
              alt="Logo Preview"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-emerald-200"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}

        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs sm:text-sm text-emerald-700">
            Your club will receive random stats (50-99) for ATK, DEF, MID, GK, and Speed
          </p>
        </div>
      </div>

      <button
        onClick={handleMint}
        disabled={isLoading}
        className={`w-full mt-4 sm:mt-6 py-2 sm:py-3 px-4 rounded-lg font-bold text-white transition-all text-sm sm:text-base ${
          isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          "Create Club"
        )}
      </button>

      {txStatus !== TxStatus.IDLE && (
        <div className={`mt-4 p-3 rounded-lg bg-white border ${statusConfig[txStatus].color}`}>
          <div className="flex items-center text-sm">
            {isLoading && (
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span className="font-medium">{statusConfig[txStatus].text}</span>
          </div>
        </div>
      )}

      {error && (
        <div className={`mt-4 p-3 rounded-lg border text-sm ${errorStyles[error.type]}`}>
          <span>{error.message}</span>
        </div>
      )}

      {mintResult && txStatus === TxStatus.SUCCESS && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-bold text-green-800 mb-2 text-sm sm:text-base">Club Created!</h4>
          <p className="text-xs sm:text-sm text-green-700">
            Club ID: <span className="font-mono font-bold">{mintResult.clubId}</span>
          </p>
          <p className="text-xs sm:text-sm text-green-700 mt-1 break-all">
            Tx:{" "}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${mintResult.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono underline hover:text-green-900"
            >
              {mintResult.hash.slice(0, 8)}...{mintResult.hash.slice(-8)}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default ClubMinterForm;
