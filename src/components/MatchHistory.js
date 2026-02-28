import React, { useState, useEffect, useContext } from "react";
import { pubKeyData } from "../App";
import { TACTICS } from "./TacticSelector";
import {
  getPlayerMatches,
  getMatch,
  getClubInfo,
} from "./FifaClubs";

const MatchHistory = () => {
  const pubKey = useContext(pubKeyData);

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [userClubIds, setUserClubIds] = useState([]);

 

  const loadMatchHistory = React.useCallback(async () => {
    setLoading(true);
    try {
      const matchIds = await getPlayerMatches(pubKey, pubKey);

      const matchDetails = await Promise.all(
        matchIds.map(async (id) => {
          const match = await getMatch(pubKey, id);
          const challengerClub = await getClubInfo(pubKey, match.challengerClub);
          let opponentClub = null;
          if (match.opponentClub > 0) {
            opponentClub = await getClubInfo(pubKey, match.opponentClub);
          }
          return {
            ...match,
            challengerClubInfo: challengerClub,
            opponentClubInfo: opponentClub,
          };
        })
      );

      // Sort by most recent first
      matchDetails.sort((a, b) => b.createdAt - a.createdAt);
      setMatches(matchDetails);

      // Track user's club IDs for determining win/loss
      const clubIds = new Set();
      matchDetails.forEach((m) => {
        if (m.challenger === pubKey) clubIds.add(m.challengerClub);
        if (m.opponent === pubKey) clubIds.add(m.opponentClub);
      });
      setUserClubIds([...clubIds]);
    } catch (err) {
      console.error("Failed to load match history:", err);
    } finally {
      setLoading(false);
    }
  }, [pubKey]);


   useEffect(() => {
    if (pubKey) {
      console.log("Loading match history for:", userClubIds);
      loadMatchHistory();
    }
  }, [pubKey, userClubIds, loadMatchHistory]);

  const getMatchOutcome = (match) => {
    if (match.status !== 1) return "pending";
    if (match.winnerClub === 0) return "draw";

    const isChallenger = match.challenger === pubKey;
    const userClub = isChallenger ? match.challengerClub : match.opponentClub;

    return match.winnerClub === userClub ? "win" : "loss";
  };

  const getStats = () => {
    const completed = matches.filter((m) => m.status === 1);
    const wins = completed.filter((m) => getMatchOutcome(m) === "win").length;
    const losses = completed.filter((m) => getMatchOutcome(m) === "loss").length;
    const draws = completed.filter((m) => getMatchOutcome(m) === "draw").length;
    return { wins, losses, draws, total: completed.length };
  };

  const stats = getStats();

  if (!pubKey) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <p className="text-gray-500">Connect your wallet to view match history</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Match History</h3>
        <button
          onClick={loadMatchHistory}
          disabled={loading}
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500">Played</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
          <p className="text-xs text-gray-500">Wins</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
          <p className="text-xs text-gray-500">Losses</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-2 text-center">
          <p className="text-2xl font-bold text-gray-600">{stats.draws}</p>
          <p className="text-xs text-gray-500">Draws</p>
        </div>
      </div>

      {/* Match List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">📜</p>
          <p>No matches played yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((match) => {
            const outcome = getMatchOutcome(match);
            const isExpanded = expandedMatch === match.id;
            const isChallenger = match.challenger === pubKey;

            return (
              <div
                key={match.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  outcome === "win"
                    ? "border-green-200 bg-green-50"
                    : outcome === "loss"
                    ? "border-red-200 bg-red-50"
                    : outcome === "draw"
                    ? "border-gray-200 bg-gray-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <button
                  onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {outcome === "win" && "🏆"}
                        {outcome === "loss" && "😢"}
                        {outcome === "draw" && "🤝"}
                        {outcome === "pending" && "⏳"}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {isChallenger
                            ? `vs ${match.opponentClubInfo?.name || "Waiting..."}`
                            : `vs ${match.challengerClubInfo?.name}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Match #{match.id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {match.status === 1 && (
                        <p className="font-bold">
                          {match.roundsWon[isChallenger ? 0 : 1]} - {match.roundsWon[isChallenger ? 1 : 0]}
                        </p>
                      )}
                      <span className="text-gray-400 text-sm">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && match.status === 1 && (
                  <div className="px-3 pb-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Your Tactics</p>
                        <div className="flex flex-wrap gap-1">
                          {(isChallenger ? match.challengerTactics : match.opponentTactics).map((t, i) => (
                            <span
                              key={i}
                              className={`bg-gradient-to-r ${TACTICS[t].color} text-white px-2 py-0.5 rounded text-xs`}
                            >
                              R{i + 1}: {TACTICS[t].icon}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Opponent Tactics</p>
                        <div className="flex flex-wrap gap-1">
                          {(isChallenger ? match.opponentTactics : match.challengerTactics).map((t, i) => (
                            <span
                              key={i}
                              className={`bg-gradient-to-r ${TACTICS[t].color} text-white px-2 py-0.5 rounded text-xs`}
                            >
                              R{i + 1}: {TACTICS[t].icon}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Round breakdown */}
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500">Round Results</p>
                      {[0, 1, 2].map((round) => {
                        const yourTactic = isChallenger
                          ? match.challengerTactics[round]
                          : match.opponentTactics[round];
                        const oppTactic = isChallenger
                          ? match.opponentTactics[round]
                          : match.challengerTactics[round];
                        const yourT = TACTICS[yourTactic];
                        const oppT = TACTICS[oppTactic];
                        const advantage = yourT.beats.includes(oppT.name)
                          ? "win"
                          : yourT.losesTo.includes(oppT.name)
                          ? "loss"
                          : "draw";

                        return (
                          <div
                            key={round}
                            className="flex items-center justify-between text-xs bg-white rounded p-2"
                          >
                            <span className="font-medium">R{round + 1}</span>
                            <span>{yourT.icon} {yourT.shortName}</span>
                            <span
                              className={`px-2 py-0.5 rounded ${
                                advantage === "win"
                                  ? "bg-green-100 text-green-700"
                                  : advantage === "loss"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {advantage === "win" ? ">" : advantage === "loss" ? "<" : "="}
                            </span>
                            <span>{oppT.icon} {oppT.shortName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
