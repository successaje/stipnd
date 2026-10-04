import { addressToEmptyAccount, createKernelAccount, type KernelValidator } from "@zerodev/sdk";
import {
  serializePermissionAccount,
  toPermissionValidator,
  type Policy as KernelPolicy,
} from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import {
  toCallPolicy,
  toGasPolicy,
  toRateLimitPolicy,
  toTimestampPolicy,
} from "@zerodev/permissions/policies";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, PublicClient } from "viem";
import { encodeCredential, type Credential } from "@stipnd/protocol";
import { ENTRY_POINT, KERNEL_VERSION } from "../constants";
import { buildSessionPolicies, type SessionPolicyParams } from "./policies";

export interface IssueCredentialParams {
  /** Public client for the target chain. */
  client: PublicClient;
  /** The owner's root validator (passkey or ECDSA). Signs the permission enable. */
  sudoValidator: KernelValidator;
  chainId: number;
  bundlerUrl: string;
  rpcUrl?: string;
  token: Address;
  tokenDecimals: number;
  tokenSymbol: string;
  label: string;
  policy: SessionPolicyParams;
}

export interface IssuedCredential {
  /** `stipnd_v1_…` string to hand to the agent. Shown once. */
  credential: string;
  decoded: Credential;
  /** Public address of the session key; needed to revoke later. */
  sessionKeyAddress: Address;
  /** Kernel permission id, for display and revocation bookkeeping. */
  permissionId: `0x${string}`;
  /**
   * The exact policies installed, serialized. Store it next to the permission id: revocation
   * must present the same policy list, and the builder may change between issuance and revoke.
   */
  policyParams: string;
}

const BIGINT_TAG = "$bigint";

/** JSON for Kernel policy parameters, with bigints preserved. */
export function serializePolicyParams(policies: KernelPolicy[]): string {
  return JSON.stringify(
    policies.map((p) => p.policyParams),
    (_k, v) => (typeof v === "bigint" ? { [BIGINT_TAG]: v.toString() } : v),
  );
}

/** Rebuilds Kernel policies from `serializePolicyParams` output. */
export function policiesFromSerialized(serialized: string): KernelPolicy[] {
  const params = JSON.parse(serialized, (_k, v) =>
    v && typeof v === "object" && BIGINT_TAG in v ? BigInt(v[BIGINT_TAG] as string) : v,
  ) as Array<{ type: string } & Record<string, unknown>>;
  return params.map((p) => {
    switch (p.type) {
      case "call":
        return toCallPolicy(p as unknown as Parameters<typeof toCallPolicy>[0]);
      case "gas":
        return toGasPolicy(p as unknown as Parameters<typeof toGasPolicy>[0]);
      case "timestamp":
        return toTimestampPolicy(p as unknown as Parameters<typeof toTimestampPolicy>[0]);
      case "rate-limit":
        return toRateLimitPolicy(p as unknown as Parameters<typeof toRateLimitPolicy>[0]);
      default:
        throw new Error(`Unknown policy type in stored credential record: ${p.type}`);
    }
  });
}

/**
 * Generates a fresh session key, scopes it with `buildSessionPolicies`, has the owner's
 * sudo validator approve it, and packs everything into a credential string.
 *
 * The private key never leaves this function except inside the credential.
 */
export async function issueCredential(p: IssueCredentialParams): Promise<IssuedCredential> {
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  const sessionSigner = await toECDSASigner({ signer: sessionAccount });

  const policies = buildSessionPolicies(p.policy);
  const permissionPlugin = await toPermissionValidator(p.client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    signer: sessionSigner,
    policies,
  });

  const account = await createKernelAccount(p.client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    plugins: { sudo: p.sudoValidator, regular: permissionPlugin },
  });

  const approval = await serializePermissionAccount(account, sessionPrivateKey);

  const decoded: Credential = {
    v: 1,
    chainId: p.chainId,
    hub: p.policy.hub,
    stipendId: p.policy.stipendId.toString(),
    token: p.token,
    tokenDecimals: p.tokenDecimals,
    tokenSymbol: p.tokenSymbol,
    account: account.address,
    bundlerUrl: p.bundlerUrl,
    rpcUrl: p.rpcUrl,
    approval,
    label: p.label,
    issuedAt: Math.floor(Date.now() / 1000),
  };

  return {
    credential: encodeCredential(decoded),
    decoded,
    sessionKeyAddress: sessionAccount.address,
    permissionId: permissionPlugin.getIdentifier(),
    policyParams: serializePolicyParams(policies),
  };
}

/**
 * Rebuilds a permission plugin for a previously issued session key so the owner can
 * uninstall it. When the permission id recorded at issuance is supplied, Kernel targets
 * that installation directly, so revocation keeps working even if the policy builder
 * has changed since the key was issued.
 */
export async function permissionPluginForRevocation(
  client: PublicClient,
  sessionKeyAddress: Address,
  policy: SessionPolicyParams,
  permissionId?: `0x${string}`,
  serializedPolicies?: string,
) {
  const emptySigner = await toECDSASigner({ signer: addressToEmptyAccount(sessionKeyAddress) });
  const policies = serializedPolicies
    ? policiesFromSerialized(serializedPolicies)
    : buildSessionPolicies(policy);
  return toPermissionValidator(client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    signer: emptySigner,
    policies,
    ...(permissionId ? { permissionId } : {}),
  });
}
