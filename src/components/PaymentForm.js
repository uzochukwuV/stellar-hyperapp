import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import { sendPayment } from "./Freighter";

const PaymentForm = () => {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null);

  const pubKey = useContext(pubKeyData);

  const handleSend = async () => {
    if (!destination || !amount) {
      setStatus("Please enter destination and amount");
      return;
    }

    try {
      setStatus("Sending transaction...");
      const result = await sendPayment(destination, amount);
      setStatus(
        `Success! Transaction hash: ${result.hash}. 🎉 Transaction submitted to testnet.`,
      );
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  if (!pubKey) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>Please connect your Freighter wallet before sending payments.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col font-semibold bg-blue-100 rounded-lg my-4 items-center border p-6 w-full max-w-md mx-auto">
      <div className="w-full mb-4 text-xl font-bold text-center">
        Send XLM Payment
      </div>
      <input
        type="text"
        placeholder="Destination address"
        className="w-full p-2 mb-2 border rounded"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      <input
        type="number"
        step="0.0000001"
        placeholder="Amount (XLM)"
        className="w-full p-2 mb-2 border rounded"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-2 rounded"
        onClick={handleSend}
      >
        Send
      </button>
      {status && (
        <div className="mt-4 p-2 bg-gray-200 rounded text-sm break-words">
          {status}
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
