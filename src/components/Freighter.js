import {
  signTransaction,
  setAllowed,
  getAddress,
  requestAccess,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org",
);

const checkConnection = async () => {
  return await setAllowed();
};

const getRequestAccess = async () => {
  return await requestAccess();
};

const retrievePublicKey = async () => {
  const { address } = await getAddress();
  return address;
};

const getBalance = async () => {
  await setAllowed();

  const { address } = await getAddress();

  const account = await server.loadAccount(address);

  const xlm = account.balances.find((b) => b.asset_type === "native");

  return xlm?.balance || "0";
};

const userSignTransaction = async (xdr, signWith) => {
  return await signTransaction(xdr, {
    networkPassphrase: StellarSdk.Networks.TESTNET,
    accountToSign: signWith,
  });
};

// helper that builds, signs and submits a simple XLM payment
const sendPayment = async (destination, amount) => {
  // ensure Freighter has permission
  await setAllowed();

  // get the public key of the current account
  const { address: source } = await getAddress();

  // load the source account from testnet
  const account = await server.loadAccount(source);

  // construct transaction
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: await server.fetchBaseFee(),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      })
    )
    .setTimeout(30)
    .build();

  // sign via Freighter
  const signed = await userSignTransaction(tx.toXDR(), source);
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    StellarSdk.Networks.TESTNET,
  );

  // submit to testnet
  const result = await server.submitTransaction(signedTx);
  return result;
};

export {
  checkConnection,
  retrievePublicKey,
  getBalance,
  userSignTransaction,
  getRequestAccess,
  sendPayment,
};
