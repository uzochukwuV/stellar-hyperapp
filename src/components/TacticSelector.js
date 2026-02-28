import React from "react";

// Tactic definitions
export const TACTICS = [
  {
    id: 0,
    name: "Ultra Attack",
    shortName: "UA",
    description: "All-out offensive play",
    stats: ["ATK", "SPD"],
    beats: ["Balanced", "Possession"],
    losesTo: ["Ultra Defense", "Defense"],
    color: "from-red-500 to-orange-500",
    icon: "⚔️",
  },
  {
    id: 1,
    name: "Attack",
    shortName: "ATK",
    description: "Aggressive but controlled",
    stats: ["ATK", "MID"],
    beats: ["Defense", "Balanced"],
    losesTo: ["Counter", "Ultra Defense"],
    color: "from-orange-500 to-yellow-500",
    icon: "🎯",
  },
  {
    id: 2,
    name: "Balanced",
    shortName: "BAL",
    description: "Adaptive and flexible",
    stats: ["MID", "OVR"],
    beats: ["Counter", "Possession"],
    losesTo: ["Ultra Attack", "Attack"],
    color: "from-gray-500 to-slate-500",
    icon: "⚖️",
  },
  {
    id: 3,
    name: "Defense",
    shortName: "DEF",
    description: "Solid backline focus",
    stats: ["DEF", "GK"],
    beats: ["Ultra Attack", "Attack"],
    losesTo: ["Possession", "Counter"],
    color: "from-blue-500 to-cyan-500",
    icon: "🛡️",
  },
  {
    id: 4,
    name: "Ultra Defense",
    shortName: "UD",
    description: "Park the bus",
    stats: ["DEF", "GK"],
    beats: ["Ultra Attack", "Counter"],
    losesTo: ["Possession", "Balanced"],
    color: "from-blue-700 to-blue-500",
    icon: "🏰",
  },
  {
    id: 5,
    name: "Counter",
    shortName: "CTR",
    description: "Quick transitions",
    stats: ["SPD", "DEF"],
    beats: ["Attack", "Ultra Defense"],
    losesTo: ["Balanced", "Defense"],
    color: "from-green-500 to-emerald-500",
    icon: "⚡",
  },
  {
    id: 6,
    name: "Possession",
    shortName: "POS",
    description: "Control the ball",
    stats: ["MID", "ATK"],
    beats: ["Defense", "Ultra Defense"],
    losesTo: ["Ultra Attack", "Balanced"],
    color: "from-purple-500 to-indigo-500",
    icon: "🎭",
  },
];

const TacticCard = ({ tactic, selected, onClick, disabled, small }) => {
  const isSelected = selected;

  if (small) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded-lg border-2 transition-all ${
          isSelected
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-200 hover:border-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="text-center">
          <span className="text-xl">{tactic.icon}</span>
          <p className="text-xs font-medium mt-1">{tactic.shortName}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-xl transition-all transform ${
        isSelected
          ? "ring-4 ring-indigo-500 scale-105"
          : "hover:scale-102"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className={`bg-gradient-to-br ${tactic.color} p-3 sm:p-4 text-white`}>
        <div className="flex justify-between items-start">
          <span className="text-2xl sm:text-3xl">{tactic.icon}</span>
          {isSelected && (
            <span className="bg-white text-indigo-600 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold">
              ✓
            </span>
          )}
        </div>
        <h3 className="font-bold text-sm sm:text-lg mt-2">{tactic.name}</h3>
        <p className="text-xs sm:text-sm opacity-80 mt-1">{tactic.description}</p>

        <div className="mt-2 sm:mt-3 space-y-1">
          <div className="flex items-center text-xs">
            <span className="opacity-70 w-12 sm:w-14">Uses:</span>
            <span className="font-medium">{tactic.stats.join(" + ")}</span>
          </div>
          <div className="flex items-center text-xs">
            <span className="text-green-200 w-12 sm:w-14">Beats:</span>
            <span className="text-green-100 truncate">{tactic.beats.join(", ")}</span>
          </div>
          <div className="flex items-center text-xs">
            <span className="text-red-200 w-12 sm:w-14">Weak:</span>
            <span className="text-red-100 truncate">{tactic.losesTo.join(", ")}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

const TacticSelector = ({
  selectedTactics = [],
  onSelect,
  maxSelections = 3,
  small = false,
  disabled = false,
}) => {
  const handleSelect = (tacticId) => {
    if (disabled) return;

    if (selectedTactics.includes(tacticId)) {
      // Deselect
      onSelect(selectedTactics.filter((id) => id !== tacticId));
    } else if (selectedTactics.length < maxSelections) {
      // Select
      onSelect([...selectedTactics, tacticId]);
    }
  };

  if (small) {
    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {TACTICS.map((tactic) => (
          <TacticCard
            key={tactic.id}
            tactic={tactic}
            selected={selectedTactics.includes(tactic.id)}
            onClick={() => handleSelect(tactic.id)}
            disabled={disabled || (!selectedTactics.includes(tactic.id) && selectedTactics.length >= maxSelections)}
            small
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800 text-sm sm:text-base">
          Select {maxSelections} Tactics
        </h3>
        <span className="text-xs sm:text-sm text-gray-500">
          {selectedTactics.length}/{maxSelections} selected
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {TACTICS.map((tactic) => (
          <TacticCard
            key={tactic.id}
            tactic={tactic}
            selected={selectedTactics.includes(tactic.id)}
            onClick={() => handleSelect(tactic.id)}
            disabled={disabled || (!selectedTactics.includes(tactic.id) && selectedTactics.length >= maxSelections)}
          />
        ))}
      </div>

      {selectedTactics.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">Your tactics (in order):</p>
          <div className="flex gap-2 flex-wrap">
            {selectedTactics.map((tacticId, index) => {
              const tactic = TACTICS[tacticId];
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-r ${tactic.color} text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium`}
                >
                  R{index + 1}: {tactic.icon} {tactic.shortName}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticSelector;
