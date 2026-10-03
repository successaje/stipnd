import { z } from "zod";
import { isAddress, isHex } from "viem";

export const STIPND_SCHEME = "stipnd";
export const CHALLENGE_HEADER = "www-authenticate";
export const PAYMENT_HEADER = "authorization";

const address = z.string().refine((v) => isAddress(v), "invalid address");
const hex32 = z.string().refine((v) => isHex(v) && v.length === 66, "invalid bytes32");

/**
 * What a merchant returns with HTTP 402. Sent as JSON body and summarized in
 * `WWW-Authenticate: Payment scheme="stipnd" ...` so generic clients can detect it.
 */
export const ChallengeSchema = z.object({
  scheme: z.literal(STIPND_SCHEME),
  version: z.literal(1),
  chainId: z.number().int().positive(),
  hub: address,
  merchant: address,
  token: address,
  /** Smallest unit of `token`, as a decimal string so JSON stays exact. */
  amount: z.string().regex(/^\d+$/),
  /** Canonical resource string the merchant hashed (see resource.ts). */
  resource: z.string().min(1),
  resourceHash: hex32,
  /** Human-readable description of what is being bought; becomes the receipt memo. */
  description: z.string().max(96).default(""),
  /** Unix seconds after which the merchant will not honor a payment for this challenge. */
  expiresAt: z.number().int().positive(),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

/** What the agent sends back: proof of the onchain `Paid` event. */
export const PaymentProofSchema = z.object({
  scheme: z.literal(STIPND_SCHEME),
  chainId: z.number().int().positive(),
  txHash: z.string().refine((v) => isHex(v) && v.length === 66, "invalid tx hash"),
  logIndex: z.number().int().nonnegative(),
  stipendId: z.string().regex(/^\d+$/),
});
export type PaymentProof = z.infer<typeof PaymentProofSchema>;

function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(input: string): string {
  const padded =
    input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** `WWW-Authenticate` value advertising a Stipnd challenge. */
export function challengeHeaderValue(c: Challenge): string {
  return `Payment scheme="${STIPND_SCHEME}", chainId="${c.chainId}", amount="${c.amount}", token="${c.token}"`;
}

/** `Authorization` value carrying the payment proof. */
export function paymentHeaderValue(proof: PaymentProof): string {
  return `Payment ${STIPND_SCHEME} ${b64url(JSON.stringify(proof))}`;
}

export function parsePaymentHeader(value: string | null | undefined): PaymentProof | null {
  if (!value) return null;
  const m = /^Payment\s+stipnd\s+([A-Za-z0-9_-]+)\s*$/i.exec(value.trim());
  if (!m || !m[1]) return null;
  try {
    return PaymentProofSchema.parse(JSON.parse(unb64url(m[1])));
  } catch {
    return null;
  }
}

export function parseChallenge(body: unknown): Challenge | null {
  const r = ChallengeSchema.safeParse(body);
  return r.success ? r.data : null;
}

export const base64url = { encode: b64url, decode: unb64url };
