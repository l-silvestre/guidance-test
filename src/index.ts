import fs from 'fs/promises';
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from 'viem/chains';
import Irys from '@irys/sdk';
import Query from "@irys/query";

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

const query = new Query({ network: "devnet" });

(async () => {
  const pkPath = process.argv[2];
  const prompt = process.argv[3];
  if (!pkPath) {
    console.error('Missing Private File Location. Ex: npm start -- ./pkfile');
    process.exit(-1);
  }
  if (!prompt) {
    console.error('Missing Prompt. Ex: npm start -- ./pkfile "prompt example"');
    process.exit(-1);
  }

  const privateKey = await fs.readFile(pkPath, 'utf-8');

  const account = privateKeyToAccount(`0x${privateKey}`);
  
  // if no provider passed, default to public arbitrum rpc
  const walletClient = createWalletClient({
    chain: arbitrumSepolia,
    account,
    transport: http(RPC_URL),
  });
  // const wallet = { name: "viemv2", rpcUrl: RPC_URL, provider: walletClient };
	// Use the wallet object
	const webIrys = new Irys({ network: 'devnet', token: 'arbitrum', key: privateKey, config: {
    providerUrl: RPC_URL
  } });
	await webIrys.ready();

  const requestTimestamp = Date.now();
  const { id } = await webIrys.upload(prompt, {
    tags: [
      { name: 'Protocol-Name', value: 'FairAI' },
      { name: 'Protocol-Version', value: 'test' },
      { name: 'Operation-Name', value: 'Guidance Test Request'}
    ]
  });

  console.log(`Data uploaded: TxID: ${id}`);

  // subscribe to response
  let hasResponded = false;

  while (!hasResponded) {
    const [ result ] = await query.search('irys:transactions')
      /* .fromTimestamp(requestTimestamp) */
      .tags([
        { name: 'Protocol-Name', values: [ 'FairAI' ]},
        { name: 'Protocol-Version', values: [ 'test' ]},
        { name: 'Operation-Name', values: [ 'Guidance Test Response' ]},
        { name: 'Request', values: [ id ]}
      ])
      .sort('DESC')
      .limit(1);

    if (result) {
      const response = await fetch('https://arweave.net/'+result.id);
      const data = await response.text();
      console.log(`Response: ${data}`);
      hasResponded = true;
    }
  }
  return;
})();