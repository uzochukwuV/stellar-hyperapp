
import './App.css';
import Header from './components/Header';
import { useState, createContext } from 'react';
import PaymentForm from './components/PaymentForm';

const pubKeyData = createContext();


function App() {
  const [pubKey, _setPubKey] = useState("");
  
  return (
    <div className="App">
      <Header pubKey={pubKey} setPubKey={_setPubKey} />
      <pubKeyData.Provider value={pubKey}>
        <div className="p-4">
          <PaymentForm />
        </div>
      </pubKeyData.Provider>
    </div>
  );
}

export default App;
export {pubKeyData};