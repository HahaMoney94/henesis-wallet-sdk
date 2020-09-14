import { SDK } from "../src";
import "dotenv/config";

async function main() {
  const sdk = new SDK({
    accessToken: process.env.ACCESS_TOKEN,
    secret: process.env.SECRET,
    url: process.env.URL,
  });

  console.log(
    await sdk.eth.gasPrice.getGasPrice()
  );
}

main().catch((e) => console.error(e));
