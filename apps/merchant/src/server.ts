import "dotenv/config";
import { serve } from "@hono/node-server";
import { createPublicClient, http } from "viem";
import { getChainInfo } from "@stipnd/protocol";
import { createApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
const info = getChainInfo(config.chainId);
const client = createPublicClient({ chain: info.chain, transport: http(config.rpcUrl) });
const app = createApp({ config, client });

serve({ fetch: app.fetch, port: config.port }, (addr) => {
  console.log(`Stipnd merchant listening on http://localhost:${addr.port}`);
  console.log(`  chain     ${info.label} (${config.chainId})`);
  console.log(`  hub       ${config.hub}`);
  console.log(`  merchant  ${config.merchant}`);
  console.log(`  public    ${config.publicUrl}`);
});
