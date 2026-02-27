import React from "react";
import { getStatColor, getRatingColor } from "./FifaClubs";

const StatBar = ({ label, value, color }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 w-8">{label}</span>
    <div className="flex-1 bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-xs font-bold w-6 text-right">{value}</span>
  </div>
);

const ClubCard = ({ club, compact = false }) => {
  if (!club) return null;

  const { id, name, logoUrl, stats, wins, losses, draws } = club;

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow p-3 flex items-center gap-3">
        <img
          src={logoUrl}
          alt={name}
          className="w-12 h-12 rounded-full object-cover bg-gray-100"
          onError={(e) => {
            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%234F46E5'/%3E%3Ctext x='50' y='60' text-anchor='middle' fill='white' font-size='30'%3E⚽%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 truncate">{name}</h4>
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="text-green-600">{wins}W</span>
            <span className="text-red-600">{losses}L</span>
            <span className="text-gray-600">{draws}D</span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded font-bold text-sm ${getRatingColor(stats.overall)}`}>
          {stats.overall}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-[1.02] transition-transform">
      {/* Club Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
        <div className="flex items-center gap-4">
          <img
            src={logoUrl}
            alt={name}
            className="w-16 h-16 rounded-full object-cover bg-white/20 border-2 border-white/50"
            onError={(e) => {
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%234F46E5'/%3E%3Ctext x='50' y='60' text-anchor='middle' fill='white' font-size='30'%3E⚽%3C/text%3E%3C/svg%3E";
            }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg truncate">{name}</h3>
            <span className="text-white/70 text-sm">Club #{id}</span>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-2 text-center">
            <div className="text-2xl font-bold text-white">{stats.overall}</div>
            <div className="text-xs text-white/70">OVR</div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 space-y-2">
        <StatBar label="ATK" value={stats.attack} color={getStatColor(stats.attack)} />
        <StatBar label="DEF" value={stats.defense} color={getStatColor(stats.defense)} />
        <StatBar label="MID" value={stats.midfield} color={getStatColor(stats.midfield)} />
        <StatBar label="GK" value={stats.goalkeeping} color={getStatColor(stats.goalkeeping)} />
        <StatBar label="SPD" value={stats.speed} color={getStatColor(stats.speed)} />
      </div>

      {/* Record Section */}
      <div className="border-t px-4 py-3 bg-gray-50">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-lg font-bold text-green-600">{wins}</div>
            <div className="text-xs text-gray-500">Wins</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">{draws}</div>
            <div className="text-xs text-gray-500">Draws</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">{losses}</div>
            <div className="text-xs text-gray-500">Losses</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubCard;
