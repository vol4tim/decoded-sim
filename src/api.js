import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { API } from "../config.json";

let api;
export async function initApi() {
  const provider = new WsProvider(API.endpoint);
  api = await ApiPromise.create({
    provider,
    types: API.types,
  });
  return api;
}

export function getApi() {
  return api;
}

export function getBalance(account, cb) {
  api.query.system.account(account, ({ data: { free: currentFree } }) => {
    cb(currentFree);
  });
}

export const keyring = new Keyring({ type: "sr25519" });

// export async function faucet(address) {
//   keyring.setSS58Format(api.registry.chainSS58);
//   const account = keyring.addFromUri("//Alice");
//   const tx = api.tx.balances.transfer(address, 1000000000000000);
//   await tx.signAndSend(account);
// }
