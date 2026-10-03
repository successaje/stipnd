import { encodeAbiParameters, encodeEventTopics, type Address, type Hex, type Log } from "viem";
import { stipendHubAbi, type Credential } from "@stipnd/protocol";

export const HUB = "0x1000000000000000000000000000000000000001" as const;
export const MERCHANT = "0x2000000000000000000000000000000000000002" as const;
export const TOKEN = "0x3000000000000000000000000000000000000003" as const;
export const ACCOUNT = "0x4000000000000000000000000000000000000004" as const;

export const credential: Credential = {
  v: 1,
  chainId: 421614,
  hub: HUB,
  stipendId: "7",
  token: TOKEN,
  tokenDecimals: 6,
  tokenSymbol: "USDC",
  account: ACCOUNT,
  bundlerUrl: "https://rpc.zerodev.app/api/v3/test/chain/421614",
  approval: "approval",
  label: "test",
  issuedAt: 1_700_000_000,
};

let counter = 0;
function txHash(): Hex {
  counter += 1;
  return `0x${counter.toString(16).padStart(64, "0")}`;
}

export function paidLog(args: {
  id: bigint;
  merchant: Address;
  amount: bigint;
  resourceHash: Hex;
  memo?: string;
  remaining?: bigint;
  balance?: bigint;
}): Log {
  const topics = encodeEventTopics({
    abi: stipendHubAbi,
    eventName: "Paid",
    args: { id: args.id, merchant: args.merchant, resourceHash: args.resourceHash },
  });
  const data = encodeAbiParameters(
    [{ type: "uint128" }, { type: "string" }, { type: "uint128" }, { type: "uint128" }],
    [args.amount, args.memo ?? "", args.remaining ?? 0n, args.balance ?? 0n],
  );
  return log(topics, data);
}

export function rejectedLog(args: {
  id: bigint;
  merchant: Address;
  amount: bigint;
  resourceHash: Hex;
  reason: number;
}): Log {
  const topics = encodeEventTopics({
    abi: stipendHubAbi,
    eventName: "PaymentRejected",
    args: { id: args.id, merchant: args.merchant, resourceHash: args.resourceHash },
  });
  const data = encodeAbiParameters(
    [{ type: "uint128" }, { type: "uint8" }],
    [args.amount, args.reason],
  );
  return log(topics, data);
}

function log(rawTopics: readonly (Hex | Hex[] | null)[], data: Hex): Log {
  const topics = rawTopics.filter((t): t is Hex => typeof t === "string");
  return {
    address: HUB,
    topics: topics as [Hex, ...Hex[]],
    data,
    transactionHash: txHash(),
    logIndex: 0,
    blockNumber: 1n,
    blockHash: `0x${"1".repeat(64)}`,
    transactionIndex: 0,
    removed: false,
  };
}
