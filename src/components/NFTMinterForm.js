import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import {
  mintNft,
  TxStatus,
  getErrorMessage,
  getErrorType,
} from "./NftMinter";

const NFTMinterForm = ({ onMintSuccess }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [txStatus, setTxStatus] = useState(TxStatus.IDLE);
  const [error, setError] = useState(null);
  const [mintResult, setMintResult] = useState(null);

  const pubKey = useContext(pubKeyData);

  // Status display configuration
  const statusConfig = {
    [TxStatus.IDLE]: { text: "", color: "" },
    [TxStatus.PREPARING]: { text: "Preparing transaction...", color: "text-blue-600" },
    [TxStatus.SIGNING]: { text: "Please sign in your wallet...", color: "text-yellow-600" },
    [TxStatus.SUBMITTING]: { text: "Submitting to network...", color: "text-blue-600" },
    [TxStatus.PENDING]: { text: "Waiting for confirmation...", color: "text-orange-500" },
    [TxStatus.SUCCESS]: { text: "NFT minted successfully!", color: "text-green-600" },
    [TxStatus.FAILED]: { text: "Transaction failed", color: "text-red-600" },
  };

  // Error type styling
  const errorStyles = {
    warning: "bg-yellow-100 border-yellow-400 text-yellow-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
    error: "bg-red-100 border-red-400 text-red-700",
  };

  const handleMint = async () => {
    // Validate inputs
    if (!name.trim()) {
      setError({ message: "Please enter an NFT name", type: "warning" });
      return;
    }
    if (!description.trim()) {
      setError({ message: "Please enter a description", type: "warning" });
      return;
    }
    if (!imageUrl.trim()) {
      setError({ message: "Please enter an image URL", type: "warning" });
      return;
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      setError({ message: "Please enter a valid image URL", type: "warning" });
      return;
    }

    setError(null);
    setMintResult(null);

    try {
      const result = await mintNft(
        pubKey,
        name.trim(),
        description.trim(),
        imageUrl.trim(),
        setTxStatus
      );

      setMintResult(result);

      // Clear form on success
      setName("");
      setDescription("");
      setImageUrl("");

      // Notify parent component
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

  // Show connect wallet message if not connected
  if (!pubKey) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-6 text-center">
        <p className="text-yellow-700 font-semibold">
          Please connect your wallet to mint NFTs
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-indigo-800">
        Mint Your NFT
      </h2>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            NFT Name
          </label>
          <input
            type="text"
            placeholder="My Awesome NFT"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            placeholder="Describe your NFT..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            placeholder="https://example.com/my-nft.png"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Image Preview */}
        {imageUrl && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <img
              src={imageUrl}
              alt="NFT Preview"
              className="w-full h-40 object-cover rounded-lg border"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* Mint Button */}
      <button
        onClick={handleMint}
        disabled={isLoading}
        className={`w-full mt-6 py-3 px-4 rounded-lg font-bold text-white transition-all ${
          isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          "Mint NFT"
        )}
      </button>

      {/* Transaction Status */}
      {txStatus !== TxStatus.IDLE && (
        <div className={`mt-4 p-3 rounded-lg bg-white border ${statusConfig[txStatus].color}`}>
          <div className="flex items-center">
            {isLoading && (
              <svg
                className="animate-spin h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span className="font-medium">{statusConfig[txStatus].text}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={`mt-4 p-3 rounded-lg border ${errorStyles[error.type]}`}>
          <span>{error.message}</span>
        </div>
      )}

      {/* Success Result */}
      {mintResult && txStatus === TxStatus.SUCCESS && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-bold text-green-800 mb-2">NFT Minted!</h4>
          <p className="text-sm text-green-700">
            NFT ID: <span className="font-mono font-bold">{mintResult.nftId}</span>
          </p>
          <p className="text-sm text-green-700 mt-1 break-all">
            Tx Hash:{" "}
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

export default NFTMinterForm;
