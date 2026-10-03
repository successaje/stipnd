import {
  createPublicClient,
  encodeFunctionData,
  http,
  isAddressEqual,
  type Address,
  type PublicClient,
} from "viem";
import {
  decodeCredential,
  getChainInfo,
  parseChallenge,
  paymentHeaderValue,
  RejectReason,
  stipendHubAbi,
  type Challenge,
  type Credential,
  type PaymentProof,
  type Receipt,
} from "@stipnd/protocol";
import {
  StipndChallengeError,
  StipndError,
  StipndHaltedError,
  StipndRejectedError,
} from "./errors";
import { createKernelSubmitter } from "./kernel";
import { findPaymentReceipt } from "./receipts";
import type { Submitter } from "./submitter";

export interface StipndClientOptions {
  /** `stipnd_v1_…` string issued by the owner app, or an already-decoded credential. */
  credential: string | Credential;
  /** Override how payments are executed. Defaults to a ZeroDev session-key submitter. */
  submitter?: Submitter;
  /** Read client for previews and status. Defaults to the chain's public RPC. */
  publicClient?: PublicClient;
  /** `fetch` implementation. Defaults to the global. */
  fetch?: typeof globalThis.fetch;
  /** Stop paying after this many rejections in a row. 0 disables. Default 3. */
  haltAfterRejections?: number;
  /** Called for every settled attempt, paid or rejected. */
  onReceipt?: (receipt: Receipt) => void;
  /** Optional logger. */
  log?: (message: string) => void;
}

export interface PaymentResult {
  receipt: Receipt;
  proof: PaymentProof;
}

export interface StipendStatus {
  balance: bigint;
  remainingThisPeriod: bigint;
  periodEndsAt: number;
  frozen: boolean;
  ok: boolean;
  reason: RejectReason;
}

export interface StipndClient {
  readonly credential: Credential;
  readonly stipendId: bigint;
  /** Address of the owner's smart account (the stipend owner). Resolved after `ready()`. */
  account(): Promise<Address>;
  ready(): Promise<void>;
  /** Pay a merchant challenge from the stipend. Throws `StipndRejectedError` if the hub refuses. */
  pay(challenge: Challenge): Promise<PaymentResult>;
  /** `fetch` that transparently pays Stipnd `402` challenges and retries with proof. */
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  /** What the hub would do with a hypothetical payment right now. */
  preview(challenge?: Challenge): Promise<StipendStatus>;
  /** Clear the halt counter after fixing the cause of repeated rejections. */
  reset(): void;
  readonly consecutiveRejections: number;
}

export function createStipndClient(options: StipndClientOptions): StipndClient {
  const credential =
    typeof options.credential === "string"
      ? decodeCredential(options.credential)
      : options.credential;
  const info = getChainInfo(credential.chainId);
  const hub = credential.hub as Address;
  const stipendId = BigInt(credential.stipendId);
  const haltAfter = options.haltAfterRejections ?? 3;
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const log = options.log ?? (() => {});

  let publicClient: PublicClient | undefined = options.publicClient;
  let submitter: Submitter | undefined = options.submitter;
  let readyPromise: Promise<void> | undefined;
  let consecutive = 0;

  function reads(): PublicClient {
    if (!publicClient) {
      publicClient = createPublicClient({ chain: info.chain, transport: http(credential.rpcUrl) });
    }
    return publicClient;
  }

  async function ready(): Promise<void> {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (!submitter) {
          const k = await createKernelSubmitter(credential, { publicClient: reads() });
          submitter = k;
          publicClient = k.publicClient;
        }
      })();
    }
    return readyPromise;
  }

  function assertPayable(challenge: Challenge) {
    if (challenge.chainId !== credential.chainId) {
      throw new StipndChallengeError(
        `Merchant wants chain ${challenge.chainId}; this credential is for chain ${credential.chainId}.`,
      );
    }
    if (!isAddressEqual(challenge.hub as Address, hub)) {
      throw new StipndChallengeError("Merchant uses a different StipendHub than this credential.");
    }
    if (!isAddressEqual(challenge.token as Address, credential.token as Address)) {
      throw new StipndChallengeError("Merchant wants a token this stipend does not hold.");
    }
    if (challenge.expiresAt * 1000 < Date.now()) {
      throw new StipndChallengeError("Merchant challenge expired before payment.");
    }
  }

  async function pay(challenge: Challenge): Promise<PaymentResult> {
    assertPayable(challenge);
    if (haltAfter > 0 && consecutive >= haltAfter) throw new StipndHaltedError(consecutive);
    await ready();
    const s = submitter!;
    const amount = BigInt(challenge.amount);

    log(`paying ${challenge.amount} to ${challenge.merchant} for ${challenge.resource}`);
    const data = encodeFunctionData({
      abi: stipendHubAbi,
      functionName: "pay",
      args: [
        stipendId,
        challenge.merchant as Address,
        amount,
        challenge.resourceHash as `0x${string}`,
        challenge.description.slice(0, 96),
      ],
    });

    const result = await s.submit({ to: hub, data });
    if (!result.success) {
      throw new StipndError(
        "USEROP_FAILED",
        "The payment transaction reverted. The session key may be rate limited or revoked.",
      );
    }
    const receipt = findPaymentReceipt(result.logs, hub, stipendId);
    if (!receipt) {
      throw new StipndError(
        "NO_RECEIPT",
        `Transaction ${result.txHash} produced no stipend receipt.`,
      );
    }
    options.onReceipt?.(receipt);

    if (receipt.status === "rejected") {
      consecutive += 1;
      throw new StipndRejectedError(receipt.reason ?? RejectReason.None, receipt);
    }
    consecutive = 0;
    return {
      receipt,
      proof: {
        scheme: "stipnd",
        chainId: credential.chainId,
        txHash: receipt.txHash,
        logIndex: receipt.logIndex,
        stipendId: credential.stipendId,
      },
    };
  }

  async function payingFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const first = await fetchImpl(input, init);
    if (first.status !== 402) return first;

    let body: unknown;
    try {
      body = await first.clone().json();
    } catch {
      return first; // not a JSON challenge; let the caller handle the 402
    }
    const challenge = parseChallenge(body);
    if (!challenge) return first; // some other payment scheme

    const { proof } = await pay(challenge);
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    headers.set("Authorization", paymentHeaderValue(proof));
    const second = await fetchImpl(input, { ...init, headers });
    if (second.status === 402) {
      throw new StipndError(
        "PROOF_REJECTED",
        "Paid onchain but the merchant did not accept the proof. Keep the receipt; contact the merchant.",
      );
    }
    return second;
  }

  async function preview(challenge?: Challenge): Promise<StipendStatus> {
    const client = reads();
    const [p, s] = await Promise.all([
      client.readContract({
        address: hub,
        abi: stipendHubAbi,
        functionName: "preview",
        args: [
          stipendId,
          (challenge?.merchant ?? "0x0000000000000000000000000000000000000000") as Address,
          challenge ? BigInt(challenge.amount) : 0n,
          (challenge?.resourceHash ?? `0x${"0".repeat(64)}`) as `0x${string}`,
        ],
      }),
      client.readContract({
        address: hub,
        abi: stipendHubAbi,
        functionName: "getStipend",
        args: [stipendId],
      }),
    ]);
    return {
      balance: p.balance,
      remainingThisPeriod: p.remainingThisPeriod,
      periodEndsAt: Number(p.periodEndsAt),
      frozen: s.frozen,
      ok: p.ok,
      reason: p.reason as RejectReason,
    };
  }

  return {
    credential,
    stipendId,
    async account() {
      await ready();
      return submitter!.account;
    },
    ready,
    pay,
    fetch: payingFetch,
    preview,
    reset() {
      consecutive = 0;
    },
    get consecutiveRejections() {
      return consecutive;
    },
  };
}
