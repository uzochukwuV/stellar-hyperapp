import React, { useState, useEffect, useContext, useCallback } from "react";
import { pubKeyData } from "../App";
import { getNftsByOwner, getNft } from "./NftMinter";

const NFTGallery = ({ refreshTrigger }) => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pubKey = useContext(pubKeyData);

  const fetchNfts = useCallback(async () => {
    if (!pubKey) return;

    setLoading(true);
    setError(null);

    try {
      // Get list of NFT IDs owned by user
      const nftIds = await getNftsByOwner(pubKey, pubKey, () => {});

      if (nftIds.length === 0) {
        setNfts([]);
        return;
      }

      // Fetch details for each NFT
      const nftDetails = await Promise.all(
        nftIds.map(async (id) => {
          try {
            return await getNft(pubKey, id, () => {});
          } catch (err) {
            console.error(`Failed to fetch NFT ${id}:`, err);
            return null;
          }
        })
      );

      setNfts(nftDetails.filter(Boolean));
    } catch (err) {
      console.error("Failed to fetch NFTs:", err);
      setError("Failed to load your NFTs");
    } finally {
      setLoading(false);
    }
  }, [pubKey]);

  useEffect(() => {
    fetchNfts();
  }, [fetchNfts, refreshTrigger]);

  if (!pubKey) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Your NFTs</h2>
        <button
          onClick={fetchNfts}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading && nfts.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
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
        </div>
      ) : nfts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="mt-4 text-gray-500 text-lg">No NFTs yet</p>
          <p className="text-gray-400">Mint your first NFT above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <div
              key={nft.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-[1.02] transition-transform"
            >
              <div className="h-48 bg-gray-200 overflow-hidden">
                <img
                  src={nft.imageUrl}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='Arial' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-800 truncate">
                    {nft.name}
                  </h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded">
                    #{nft.id}
                  </span>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {nft.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTGallery;
