import './App.css';
import Header from './components/Header';
import { useState, createContext } from 'react';
import PaymentForm from './components/PaymentForm';
import NFTMinterForm from './components/NFTMinterForm';
import NFTGallery from './components/NFTGallery';

const pubKeyData = createContext();

function App() {
  const [pubKey, _setPubKey] = useState("");
  const [nftRefreshTrigger, setNftRefreshTrigger] = useState(0);

  const handleMintSuccess = () => {
    // Trigger gallery refresh after successful mint
    setNftRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="App min-h-screen bg-gray-100">
      <Header pubKey={pubKey} setPubKey={_setPubKey} />
      <pubKeyData.Provider value={pubKey}>
        <div className="p-4 max-w-6xl mx-auto">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Payment Section */}
            <div>
              <PaymentForm />
            </div>

            {/* NFT Minter Section */}
            <div>
              <NFTMinterForm onMintSuccess={handleMintSuccess} />
            </div>
          </div>

          {/* NFT Gallery */}
          <NFTGallery refreshTrigger={nftRefreshTrigger} />
        </div>
      </pubKeyData.Provider>
    </div>
  );
}

export default App;
export { pubKeyData };
