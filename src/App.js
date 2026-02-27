import './App.css';
import Header from './components/Header';
import { useState, createContext } from 'react';
import PaymentForm from './components/PaymentForm';
import NFTMinterForm from './components/NFTMinterForm';
import NFTGallery from './components/NFTGallery';
import ClubMinterForm from './components/ClubMinterForm';
import ClubGallery from './components/ClubGallery';

const pubKeyData = createContext();

function App() {
  const [pubKey, _setPubKey] = useState("");
  const [nftRefreshTrigger, setNftRefreshTrigger] = useState(0);
  const [clubRefreshTrigger, setClubRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("fifa");

  const handleNftMintSuccess = () => {
    setNftRefreshTrigger(prev => prev + 1);
  };

  const handleClubMintSuccess = () => {
    setClubRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: "fifa", label: "FIFA Clubs", icon: "⚽" },
    { id: "nft", label: "NFT Minter", icon: "🎨" },
    { id: "payment", label: "Payments", icon: "💸" },
  ];

  return (
    <div className="App min-h-screen bg-gray-100">
      <Header pubKey={pubKey} setPubKey={_setPubKey} />
      <pubKeyData.Provider value={pubKey}>
        <div className="p-2 sm:p-4 max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-white rounded-xl p-1 sm:p-2 shadow overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="mr-1 sm:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* FIFA Clubs Tab */}
          {activeTab === "fifa" && (
            <div>
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">FIFA Club Manager</h1>
                <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Create clubs with random stats and compete!</p>
              </div>

              <div className="max-w-md mx-auto">
                <ClubMinterForm onMintSuccess={handleClubMintSuccess} />
              </div>

              <ClubGallery refreshTrigger={clubRefreshTrigger} />
            </div>
          )}

          {/* NFT Minter Tab */}
          {activeTab === "nft" && (
            <div>
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">NFT Minter</h1>
                <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Create and collect NFTs on Stellar</p>
              </div>

              <div className="max-w-md mx-auto">
                <NFTMinterForm onMintSuccess={handleNftMintSuccess} />
              </div>

              <NFTGallery refreshTrigger={nftRefreshTrigger} />
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payment" && (
            <div>
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Send Payment</h1>
                <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Transfer XLM on Stellar testnet</p>
              </div>

              <div className="max-w-md mx-auto">
                <PaymentForm />
              </div>
            </div>
          )}
        </div>
      </pubKeyData.Provider>
    </div>
  );
}

export default App;
export { pubKeyData };
