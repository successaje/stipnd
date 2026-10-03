import { parseAbiItem, type Address } from "viem";
import { receiptsFromLogs } from "@stipnd/sdk";
import type { Receipt } from "@stipnd/protocol";
import { publicClient } from "../clients";
import { appConfig } from "../config";

const PAID_BY_MERCHANT = parseAbiItem(
  "event Paid(uint256 indexed id, address indexed merchant, uint128 amount, bytes32 indexed resourceHash, string memo, uint128 remainingThisPeriod, uint128 balance)",
);

/** Recent settled payments to one merchant across all stipends. Public data from the hub. */
export async function fetchMerchantPayments(merchant: Address, limit = 50): Promise<Receipt[]> {
  const client = publicClient();
  const logs = await client.getLogs({
    address: appConfig.hub,
    event: PAID_BY_MERCHANT,
    args: { merchant },
    fromBlock: appConfig.deployBlock > 0n ? appConfig.deployBlock : "earliest",
    toBlock: "latest",
  });
  const receipts = receiptsFromLogs(logs, appConfig.hub)
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
    .slice(0, limit);
  const blocks = [...new Set(receipts.map((r) => r.blockNumber))];
  const stamps = new Map<bigint, number>();
  for (let i = 0; i < blocks.length; i += 8) {
    const slice = blocks.slice(i, i + 8);
    const res = await Promise.all(slice.map((b) => client.getBlock({ blockNumber: b })));
    res.forEach((blk, j) => stamps.set(slice[j]!, Number(blk.timestamp)));
  }
  for (const r of receipts) r.timestamp = stamps.get(r.blockNumber);
  return receipts;
}
