import React, { useState } from "react";
import {
  checkConnection,
  retrievePublicKey,
  getBalance,
  getRequestAccess,
} from "./Freighter";

const Header = ({ pubKey, setPubKey }) => {
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState("0");

  const connectWallet = async () => {
    try {
      // first check if the extension is already allowed
      let allowed = await checkConnection();

      // if not allowed, request access (shows Freighter popup)
      if (!allowed) {
        allowed = await getRequestAccess();
      }
      if (!allowed) return alert("Permission denied");

      const key = await retrievePublicKey();
      const bal = await getBalance();

      setPubKey(key);
      setBalance(Number(bal).toFixed(2));
      setConnected(true);
    } catch (e) {
      console.error(e);
    }
  };

  const disconnectWallet = () => {
    // we don't have a Freighter API to revoke from here, so just clear app state
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
              {`${pubKey.slice(0, 4)}...${pubKey.slice(-4)}`}
            </div>

            <div className="p-2 bg-gray-50 border rounded-md">
              Balance: {balance} XLM
            </div>
          </>
        )}

        <button
          onClick={connected ? disconnectWallet : connectWallet}
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
