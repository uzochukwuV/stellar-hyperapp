import React, { useState, useEffect, useContext, useCallback } from "react";
import { pubKeyData } from "../App";
import { getPlayerClubs, getClubInfo } from "./FifaClubs";
import ClubCard from "./ClubCard";

const ClubGallery = ({ refreshTrigger }) => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pubKey = useContext(pubKeyData);

  const fetchClubs = useCallback(async () => {
    if (!pubKey) return;

    setLoading(true);
    setError(null);

    try {
      const clubIds = await getPlayerClubs(pubKey, pubKey, () => {});

      if (clubIds.length === 0) {
        setClubs([]);
        return;
      }

      const clubDetails = await Promise.all(
        clubIds.map(async (id) => {
          try {
            return await getClubInfo(pubKey, id, () => {});
          } catch (err) {
            console.error(`Failed to fetch club ${id}:`, err);
            return null;
          }
        })
      );

      setClubs(clubDetails.filter(Boolean));
    } catch (err) {
      console.error("Failed to fetch clubs:", err);
      setError("Failed to load your clubs");
    } finally {
      setLoading(false);
    }
  }, [pubKey]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs, refreshTrigger]);

  if (!pubKey) {
    return null;
  }

  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Your Clubs</h2>
        <button
          onClick={fetchClubs}
          disabled={loading}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-colors text-sm sm:text-base"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-3 sm:p-4 rounded-lg mb-4 text-sm sm:text-base">
          {error}
        </div>
      )}

      {loading && clubs.length === 0 ? (
        <div className="flex justify-center items-center h-32 sm:h-40">
          <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl">
          <div className="text-4xl sm:text-5xl mb-3">⚽</div>
          <p className="text-gray-500 text-base sm:text-lg">No clubs yet</p>
          <p className="text-gray-400 text-sm sm:text-base">Create your first club above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClubGallery;
