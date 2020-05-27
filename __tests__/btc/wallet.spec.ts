import { BTCWallets } from "../../src/btc/wallets";
import { HttpClient } from "../../src/httpClient";
import { DefaultBTCKeyChains } from "../../src/btc/keychains";
import BN from "bn.js";
import { Transaction } from "../../src/btc/wallet";

describe("BTCMasterWallet", () => {
  jest.setTimeout(50000);
  describe("#transfer()", () => {
    it("should create master wallet", async () => {
      const wallets = new BTCWallets(
        new HttpClient({
          accessToken: "accessToken",
          secret: "secret",
          url: "http://localhost:8080/api/v2"
        }) as any,
        new DefaultBTCKeyChains()
      );
      const wallet = await wallets.getWallet('a3c2f4128427658ec4dcb668ec799c65');
      const tx: Transaction = await wallet.transfer(
        "n4QVq9cL2FjAJzJ9ZTUJ6W5toF37ux2aN2",
        new BN(100, "hex"),
        "passphrase"
      );

      console.log(tx);
    });
  });
});