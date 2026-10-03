import { parseAbiItem, type Address } from "viem";
import { receiptsFromLogs } from "@stipnd/sdk";
import type { Receipt } from "@stipnd/protocol";
import { publicClient } from "../clients";
import { appConfig } from "../config";

const PAID = parseAbiItem(
  "event Paid(uint256 indexed id, address indexed merchant, uint128 amount, bytes32 indexed resourceHash, string memo, uint128 remainingThisPeriod, uint128 balance)",
);
const REJECTED = parseAbiItem(
  "event PaymentRejected(uint256 indexed id, address indexed merchant, uint128 amount, bytes32 indexed resourceHash, uint8 reason)",
);

const timestampCache = new Map<bigint, number>();

async function timestampsFor(blocks: bigint[]): Promise<Map<bigint, number>> {
  const client = publicClient();
  const missing = [...new Set(blocks)].filter((b) => !timestampCache.has(b));
  // Bounded concurrency; receipts pages rarely span more than a few dozen blocks.
  const chunk = 8;
  for (let i = 0; i < missing.length; i += chunk) {
    const slice = missing.slice(i, i + chunk);
    const results = await Promise.all(slice.map((b) => client.getBlock({ blockNumber: b })));
    results.forEach((blk, j) => timestampCache.set(slice[j]!, Number(blk.timestamp)));
  }
  return timestampCache;
}

/**
 * All payment attempts for a stipend, newest first, with block timestamps.
 * Reads events straight from the hub; there is no database.
 */
export async function fetchReceipts(stipendId: bigint): Promise<Receipt[]> {
  const client = publicClient();
  const fromBlock = appConfig.deployBlock > 0n ? appConfig.deployBlock : "earliest";
  const [paid, rejected] = await Promise.all([
    client.getLogs({
      address: appConfig.hub,
      event: PAID,
      args: { id: stipendId },
      fromBlock,
      toBlock: "latest",
    }),
    client.getLogs({
      address: appConfig.hub,
      event: REJECTED,
      args: { id: stipendId },
      fromBlock,
      toBlock: "latest",
    }),
  ]);
  const receipts = receiptsFromLogs([...paid, ...rejected], appConfig.hub);
  const ts = await timestampsFor(receipts.map((r) => r.blockNumber));
  for (const r of receipts) r.timestamp = ts.get(r.blockNumber);
  receipts.sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? b.logIndex - a.logIndex
      : Number(b.blockNumber - a.blockNumber),
  );
  return receipts;
}

/** Receipts across all of an owner's stipends, for the activity view. */
export async function fetchReceiptsForOwner(
  hub: Address,
  stipendIds: bigint[],
): Promise<Receipt[]> {
  if (stipendIds.length === 0) return [];
  const all = await Promise.all(stipendIds.map((id) => fetchReceipts(id)));
  return all.flat().sort((a, b) => Number(b.blockNumber - a.blockNumber));
}
