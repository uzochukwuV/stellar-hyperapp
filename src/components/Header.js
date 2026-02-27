import React, { useState } from "react";
import {
  connectWallet,
  disconnectWallet,
  getBalance,
  stellar,
} from "./Freighter";

const Header = ({ pubKey, setPubKey }) => {
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState("0");

  const handleConnect = async () => {
    try {
      console.log("Connecting wallet...");
      const key = await connectWallet();
      console.log("Public Key:", key);

      const bal = await getBalance(key);
      console.log("Balance:", bal);

      setPubKey(key);
      setBalance(Number(bal).toFixed(2));
      setConnected(true);
    } catch (e) {
      console.error("Connection error:", e);
      if (e.message !== "Wallet modal closed") {
        alert("Connection failed: " + e.message);
      }
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setPubKey("");
    setBalance("0");
    setConnected(false);
  };

  return (
    <div className="bg-gray-300 h-20 flex justify-between items-center px-10">
      <div className="text-3xl font-bold">Stellar dApp</div>

      <div className="flex items-center gap-4">
        {pubKey && (
          <>
            <div className="p-2 bg-gray-50 border rounded-md">
              {stellar.formatAddress(pubKey)}
            </div>

            <div className="p-2 bg-gray-50 border rounded-md">
              Balance: {balance} XLM
            </div>
          </>
        )}

        <button
          onClick={connected ? handleDisconnect : handleConnect}
          className={`text-xl w-52 rounded-md p-4 font-bold text-white ${
            connected
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-400 hover:bg-blue-500"
          }`}
        >
          {connected ? "Disconnect" : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
};

export default Header;
