import { z } from "zod";
import { isAddress } from "viem";
import { base64url } from "./challenge";

const address = z.string().refine((v) => isAddress(v), "invalid address");

/**
 * The credential an owner hands to an agent. It carries everything the agent needs to
 * pay from one stipend and nothing else: the serialized ZeroDev permission account
 * (session key + scoped approval) and the chain context.
 *
 * It is NOT a wallet. The embedded key can only call `StipendHub.pay` for `stipendId`
 * within the policy the owner approved.
 */
export const CredentialSchema = z.object({
  v: z.literal(1),
  chainId: z.number().int().positive(),
  hub: address,
  stipendId: z.string().regex(/^\d+$/),
  token: address,
  tokenDecimals: z.number().int().min(0).max(36),
  tokenSymbol: z.string().min(1).max(12),
  /** Smart account address that owns the stipend. */
  account: address,
  /** Bundler + paymaster RPC (ZeroDev v3 URL). */
  bundlerUrl: z.string().url(),
  /** Optional separate chain RPC for reads. Defaults to the chain's public RPC. */
  rpcUrl: z.string().url().optional(),
  /** `serializePermissionAccount(account, sessionPrivateKey)` output. */
  approval: z.string().min(1),
  /** Owner-chosen label, shown in agent logs. */
  label: z.string().max(64).default(""),
  issuedAt: z.number().int().positive(),
});
export type Credential = z.infer<typeof CredentialSchema>;

export const CREDENTIAL_PREFIX = "stipnd_v1_";

export function encodeCredential(c: Credential): string {
  return CREDENTIAL_PREFIX + base64url.encode(JSON.stringify(CredentialSchema.parse(c)));
}

export function decodeCredential(s: string): Credential {
  const trimmed = s.trim();
  if (!trimmed.startsWith(CREDENTIAL_PREFIX)) {
    throw new Error("Not a Stipnd credential (missing prefix).");
  }
  const json = base64url.decode(trimmed.slice(CREDENTIAL_PREFIX.length));
  return CredentialSchema.parse(JSON.parse(json));
}

/** Masked form safe to show in UIs and logs. */
export function maskCredential(s: string): string {
  const t = s.trim();
  if (t.length <= 24) return t;
  return `${t.slice(0, 16)}…${t.slice(-6)}`;
}
