import  { useState, useEffect, useContext, useCallback } from "react";
import { pubKeyData } from "../App";
import TacticSelector, { TACTICS } from "./TacticSelector";
import {
  createMatch,
  acceptMatch,
  getOpenMatches,
  getMatch,
  getPlayerClubs,
  getClubInfo,
  cancelMatch,
  TxStatus,
  getErrorMessage,
} from "./FifaClubs";

const MatchArena = ({ onMatchComplete }) => {
  const pubKey = useContext(pubKeyData);

  // State
  const [view, setView] = useState("lobby"); // lobby, create, join
  const [userClubs, setUserClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedTactics, setSelectedTactics] = useState([]);
  const [openMatches, setOpenMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(TxStatus.IDLE);
  const [error, setError] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Load user's clubs on mount
  

  const loadUserClubs = useCallback( async () => {
    try {
      const clubIds = await getPlayerClubs(pubKey, pubKey);
      const clubs = await Promise.all(
        clubIds.map(id => getClubInfo(pubKey, id))
      );
      setUserClubs(clubs);
      if (clubs.length > 0 && !selectedClub) {
        setSelectedClub(clubs[0]);
      }
    } catch (err) {
      console.error("Failed to load clubs:", err);
    }
  },[pubKey, selectedClub]);

  const loadOpenMatches =  useCallback( async() => {
    setLoadingMatches(true);
    try {
      const matchIds = await getOpenMatches(pubKey);
      const matches = await Promise.all(
        matchIds.map(async (id) => {
          const match = await getMatch(pubKey, id);
          const challengerClub = await getClubInfo(pubKey, match.challengerClub);
          return { ...match, challengerClubInfo: challengerClub };
        })
      );
      // Filter out user's own matches for joining
      setOpenMatches(matches.filter(m => m.challenger !== pubKey));
    } catch (err) {
      console.error("Failed to load matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  }, [pubKey]);

  useEffect(() => {
    if (pubKey) {
      loadUserClubs();
      loadOpenMatches();
    }
  }, [pubKey, loadOpenMatches, loadUserClubs]);

  const handleCreateMatch = async () => {
    if (!selectedClub || selectedTactics.length !== 3) return;

    setLoading(true);
    setError(null);

    try {
      const { matchId } = await createMatch(
        pubKey,
        selectedClub.id,
        selectedTactics,
        setTxStatus
      );

      setView("lobby");
      setSelectedTactics([]);
      loadOpenMatches();
      alert(`Match #${matchId} created! Waiting for opponent...`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setTxStatus(TxStatus.IDLE);
    }
  };

  const handleAcceptMatch = async () => {
    if (!selectedClub || selectedTactics.length !== 3 || !selectedMatch) return;

    setLoading(true);
    setError(null);

    try {
      const { match } = await acceptMatch(
        pubKey,
        selectedMatch.id,
        selectedClub.id,
        selectedTactics,
        setTxStatus
      );

      setMatchResult(match);
      setView("lobby");
      setSelectedTactics([]);
      setSelectedMatch(null);
      loadOpenMatches();
      onMatchComplete?.(match);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setTxStatus(TxStatus.IDLE);
    }
  };

  const handleCancelMatch = async (matchId) => {
    setLoading(true);
    try {
      await cancelMatch(pubKey, matchId, setTxStatus);
      loadOpenMatches();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setTxStatus(TxStatus.IDLE);
    }
  };

  // Status indicator
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      [TxStatus.PREPARING]: { text: "Preparing...", color: "bg-yellow-500" },
      [TxStatus.SIGNING]: { text: "Sign in wallet...", color: "bg-blue-500" },
      [TxStatus.SUBMITTING]: { text: "Submitting...", color: "bg-purple-500" },
      [TxStatus.PENDING]: { text: "Confirming...", color: "bg-orange-500" },
    };

    const config = statusConfig[status];
    if (!config) return null;

    return (
      <div className={`${config.color} text-white px-3 py-1 rounded-full text-sm animate-pulse`}>
        {config.text}
      </div>
    );
  };

  if (!pubKey) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <p className="text-gray-500">Connect your wallet to enter the Arena</p>
      </div>
    );
  }

  if (userClubs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <p className="text-gray-500">Create a club first to compete in matches!</p>
      </div>
    );
  }

  // Match Result Modal
  if (matchResult) {
    const isWinner = matchResult.winnerClub === selectedClub?.id;
    const isDraw = matchResult.winnerClub === 0;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">
            {isDraw ? "🤝" : isWinner ? "🏆" : "😢"}
          </div>
          <h2 className={`text-2xl font-bold ${
            isDraw ? "text-gray-600" : isWinner ? "text-green-600" : "text-red-600"
          }`}>
            {isDraw ? "It's a Draw!" : isWinner ? "Victory!" : "Defeat!"}
          </h2>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Your Rounds</span>
            <span className="text-2xl">
              {matchResult.roundsWon[1]} - {matchResult.roundsWon[0]}
            </span>
            <span>Opponent</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-2">Your Tactics:</p>
            <div className="flex gap-1">
              {matchResult.opponentTactics.map((t, i) => (
                <span key={i} className={`bg-gradient-to-r ${TACTICS[t].color} text-white px-2 py-1 rounded text-xs`}>
                  {TACTICS[t].icon} {TACTICS[t].shortName}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Opponent Tactics:</p>
            <div className="flex gap-1">
              {matchResult.challengerTactics.map((t, i) => (
                <span key={i} className={`bg-gradient-to-r ${TACTICS[t].color} text-white px-2 py-1 rounded text-xs`}>
                  {TACTICS[t].icon} {TACTICS[t].shortName}
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setMatchResult(null)}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700"
        >
          Back to Arena
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with tabs */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setView("lobby"); setSelectedMatch(null); }}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              view === "lobby"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🏟️ Lobby
          </button>
          <button
            onClick={() => setView("create")}
            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
              view === "create"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⚔️ Challenge
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Lobby View */}
      {view === "lobby" && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Open Matches</h3>
            <button
              onClick={loadOpenMatches}
              disabled={loadingMatches}
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              {loadingMatches ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>

          {openMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🏟️</p>
              <p>No open matches. Create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openMatches.map((match) => (
                <div
                  key={match.id}
                  className="border rounded-lg p-3 hover:border-indigo-300 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{match.challengerClubInfo?.name || `Club #${match.challengerClub}`}</p>
                      <p className="text-sm text-gray-500">
                        OVR: {match.challengerClubInfo?.stats?.overall || "?"}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedMatch(match); setView("join"); }}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Match View */}
      {view === "create" && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-bold text-lg mb-4">Create Match Challenge</h3>

          {/* Club Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Club
            </label>
            <div className="grid grid-cols-2 gap-2">
              {userClubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => setSelectedClub(club)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedClub?.id === club.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium truncate">{club.name}</p>
                  <p className="text-sm text-gray-500">OVR: {club.stats.overall}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tactics Selection */}
          <div className="mb-4">
            <TacticSelector
              selectedTactics={selectedTactics}
              onSelect={setSelectedTactics}
              maxSelections={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              onClick={() => { setView("lobby"); handleCancelMatch(selectedMatch?.id); setSelectedTactics([]); }}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMatch}
              disabled={loading || selectedTactics.length !== 3}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                selectedTactics.length === 3
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? <StatusBadge status={txStatus} /> : "Create Match"}
            </button>
          </div>
        </div>
      )}

      {/* Join Match View */}
      {view === "join" && selectedMatch && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-bold text-lg mb-4">Accept Challenge</h3>

          {/* Opponent Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-500">Challenger</p>
            <p className="font-bold text-lg">
              {selectedMatch.challengerClubInfo?.name || `Club #${selectedMatch.challengerClub}`}
            </p>
            <div className="flex gap-4 mt-2 text-sm">
              <span>ATK: {selectedMatch.challengerClubInfo?.stats?.attack}</span>
              <span>DEF: {selectedMatch.challengerClubInfo?.stats?.defense}</span>
              <span>OVR: {selectedMatch.challengerClubInfo?.stats?.overall}</span>
            </div>
          </div>

          {/* Club Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Club
            </label>
            <div className="grid grid-cols-2 gap-2">
              {userClubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => setSelectedClub(club)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedClub?.id === club.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium truncate">{club.name}</p>
                  <p className="text-sm text-gray-500">OVR: {club.stats.overall}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tactics Selection */}
          <div className="mb-4">
            <TacticSelector
              selectedTactics={selectedTactics}
              onSelect={setSelectedTactics}
              maxSelections={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              onClick={() => { setView("lobby"); setSelectedTactics([]); setSelectedMatch(null); }}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptMatch}
              disabled={loading || selectedTactics.length !== 3}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                selectedTactics.length === 3
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading ? <StatusBadge status={txStatus} /> : "⚔️ Fight!"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchArena;
