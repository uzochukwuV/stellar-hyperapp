import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import { fetchFeedback } from "./Soroban";

export const FetchFeedback = () => {
  const [fbData, _setFbData] = useState();
  const [fbId, _setFbId] = useState("");
  const pubKey = useContext(pubKeyData);

  const handleFetchFeedback = async () => {
    await fetchFeedback(pubKey, fbId).then((values) => _setFbData(values));
  };

  return (
    <div className="flex flex-wrap flex-col font-semibold bg-orange-300 rounded-lg my-4 items-center border p-4">
      <div className="flex-wrap bg-orange-400 w-full p-2 rounded-md sm:text-2xl font-bold text-center flex justify-between gap-3 items-center">
        Check Feedback
        <input
          type="text"
          className="sm:w-full p-2 rounded-md"
          placeholder="Enter Feedback ID"
          onChange={(e) => _setFbId(e.target.value)}
        />
        <button
          className="text-lg hover:bg-violet-500 bg-orange-700 rounded-md p-1 font-bold text-white"
          onClick={handleFetchFeedback}
        >
          Fetch
        </button>
      </div>
      <div>
        <div className="text-2xl">Feedback</div>
        <div className="text-2xl bg-cyan-300 p-4 border-4 border-black">
          {fbData}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useContext } from "react";
import { pubKeyData } from "../App";
import { sendFeedback } from "./Soroban";

export const SendFeedback = () => {
  const [fbData, _setFbData] = useState("");
  const [fbId, _setFbId] = useState();
  const pubKey = useContext(pubKeyData);

  const handleCreateFeedback = async () => {
    await sendFeedback(pubKey, fbData).then((values) => _setFbId(values));
  };

  return (
    <div className="flex flex-col font-semibold bg-green-300 rounded-lg my-4 items-center border p-4 w-full">
      <div className="flex-wrap bg-emerald-400 w-full p-2 rounded-md sm:text-2xl font-bold text-center flex justify-between gap-3 items-center">
        Create Feedback
        <input
          type="text"
          className="sm:w-full p-2 rounded-md"
          placeholder="Enter your Feedback"
          onChange={(e) => _setFbData(e.target.value)}
        />
        <button
          className="text-lg hover:bg-violet-500 bg-orange-700 rounded-md p-1 font-bold text-white"
          onClick={handleCreateFeedback}
        >
          Create
        </button>
      </div>
      <div>
        <div className="text-2xl">Feedback Id</div>
        <div className="text-2xl bg-cyan-300 p-4 border-4 border-black">
          {fbId}
        </div>
      </div>
    </div>
  );
};
